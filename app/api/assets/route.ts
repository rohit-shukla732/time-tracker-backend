import { NextRequest, NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';
import { z } from 'zod';

const createAssetSchema = z.object({
  assetType: z.enum(['USER_SIDE', 'IT_INFRASTRUCTURE']),
  category: z.enum([
    'LAPTOP', 'KEYBOARD', 'MOUSE', 'HEADSET', 'MONITOR',
    'SWITCH', 'FIREWALL', 'ACCESS_POINT', 'BIOMETRIC',
    'TELEPHONE_MATRIX', 'TELEPHONE_HANDSET', 'CCTV_CAMERA', 'NVR', 'INTERNET_LINE'
  ]),
  name: z.string().min(1),
  description: z.string().optional(),
  serialNumber: z.string().optional(),
  model: z.string().optional(),
  manufacturer: z.string().optional(),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  purchaseCost: z.number().optional(),
  currentValue: z.number().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  // Laptop peripherals
  monitorName: z.string().optional(),
  monitorCount: z.number().optional(),
  keyboardName: z.string().optional(),
  mouseName: z.string().optional(),
  headphoneName: z.string().optional(),
  // Assignment
  assignToUserId: z.string().optional(),
});

// GET - List all assets
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assetType = searchParams.get('assetType');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};

    if (assetType) {
      where.assetType = assetType;
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        assignments: {
          where: {
            status: 'ACTIVE',
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
        },
        _count: {
          select: {
            maintenanceRecords: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

// POST - Create a new asset
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    // Only admins can create assets
    if (authResult.user!.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createAssetSchema.parse(body);

    const { assignToUserId, ...assetData } = validatedData;

    // Create the asset
    const asset = await prisma.asset.create({
      data: {
        ...assetData,
        purchaseDate: assetData.purchaseDate
          ? new Date(assetData.purchaseDate)
          : null,
        warrantyExpiry: assetData.warrantyExpiry
          ? new Date(assetData.warrantyExpiry)
          : null,
      },
    });

    // If assignToUserId is provided, create an assignment
    if (assignToUserId) {
      await prisma.assetAssignment.create({
        data: {
          assetId: asset.id,
          userId: assignToUserId,
          assignedBy: authResult.user!.id,
          status: 'ACTIVE',
        },
      });

      // Update asset status to ASSIGNED
      await prisma.asset.update({
        where: { id: asset.id },
        data: { status: 'ASSIGNED' },
      });
    }

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating asset:', error);
    return NextResponse.json(
      { error: 'Failed to create asset' },
      { status: 500 }
    );
  }
}
