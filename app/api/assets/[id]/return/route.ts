import { NextRequest, NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';
import { z } from 'zod';

const returnAssetSchema = z.object({
  condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']),
  notes: z.string().optional(),
});

// POST - Return an assigned asset
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

    // Only admins can process returns
    if (authResult.user!.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = returnAssetSchema.parse(body);

    // Find the active assignment
    const activeAssignment = await prisma.assetAssignment.findFirst({
      where: {
        assetId: id,
        status: 'ACTIVE',
      },
    });

    if (!activeAssignment) {
      return NextResponse.json(
        { error: 'No active assignment found for this asset' },
        { status: 404 }
      );
    }

    // Update assignment and asset status
    const newStatus = validatedData.condition === 'DAMAGED' ? 'DAMAGED' : 'AVAILABLE';

    const [assignment] = await prisma.$transaction([
      prisma.assetAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          status: 'RETURNED',
          returnedDate: new Date(),
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
        },
      }),
      prisma.asset.update({
        where: { id },
        data: { status: newStatus },
      }),
    ]);

    return NextResponse.json(assignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error returning asset:', error);
    return NextResponse.json(
      { error: 'Failed to return asset' },
      { status: 500 }
    );
  }
}
