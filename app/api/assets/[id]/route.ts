import { NextRequest, NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';
import { z } from 'zod';

const updateAssetSchema = z.object({
  assetType: z.enum(['USER_SIDE', 'IT_INFRASTRUCTURE']).optional(),
  category: z.enum([
    'LAPTOP', 'KEYBOARD', 'MOUSE', 'HEADSET', 'MONITOR',
    'SWITCH', 'FIREWALL', 'ACCESS_POINT', 'BIOMETRIC',
    'TELEPHONE_MATRIX', 'TELEPHONE_HANDSET', 'CCTV_CAMERA', 'NVR', 'INTERNET_LINE'
  ]).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  serialNumber: z.string().optional(),
  model: z.string().optional(),
  manufacturer: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  purchaseCost: z.number().optional(),
  currentValue: z.number().optional(),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'RETIRED', 'DAMAGED', 'LOST']).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

// GET - Get a single asset by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        assignments: {
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
          orderBy: {
            assignedDate: 'desc',
          },
        },
        maintenanceRecords: {
          orderBy: {
            scheduledDate: 'desc',
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}

// PUT - Update an asset
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update assets
    if (authResult.user!.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateAssetSchema.parse(body);

    const updateData: any = { ...validatedData };

    if (validatedData.purchaseDate) {
      updateData.purchaseDate = new Date(validatedData.purchaseDate);
    }

    if (validatedData.warrantyExpiry) {
      updateData.warrantyExpiry = new Date(validatedData.warrantyExpiry);
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(asset);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating asset:', error);
    return NextResponse.json(
      { error: 'Failed to update asset' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an asset
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete assets
    if (authResult.user!.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.asset.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    );
  }
}
