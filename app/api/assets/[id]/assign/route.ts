import { NextRequest, NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';
import { z } from 'zod';

const assignAssetSchema = z.object({
  userId: z.string(),
  expectedReturnDate: z.string().optional(),
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']).optional(),
  notes: z.string().optional(),
});

// POST - Assign an asset to a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    // Only admins can assign assets
    if (authResult.user!.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = assignAssetSchema.parse(body);

    // Check if asset exists and is available
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        assignments: {
          where: {
            status: 'ACTIVE',
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    if (asset.status !== 'AVAILABLE') {
      return NextResponse.json(
        { error: 'Asset is not available for assignment' },
        { status: 400 }
      );
    }

    if (asset.assignments.length > 0) {
      return NextResponse.json(
        { error: 'Asset is already assigned' },
        { status: 400 }
      );
    }

    // Create assignment and update asset status
    const [assignment] = await prisma.$transaction([
      prisma.assetAssignment.create({
        data: {
          assetId: id,
          userId: validatedData.userId,
          assignedBy: authResult.user!.id,
          expectedReturnDate: validatedData.expectedReturnDate
            ? new Date(validatedData.expectedReturnDate)
            : null,
          condition: validatedData.condition,
          notes: validatedData.notes,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.asset.update({
        where: { id },
        data: { status: 'ASSIGNED' },
      }),
    ]);

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error assigning asset:', error);
    return NextResponse.json(
      { error: 'Failed to assign asset' },
      { status: 500 }
    );
  }
}
