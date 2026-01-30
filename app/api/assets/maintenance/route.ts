import { NextRequest, NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';
import { z } from 'zod';

const createMaintenanceSchema = z.object({
  assetId: z.string(),
  maintenanceType: z.enum(['PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'UPGRADE']),
  description: z.string(),
  scheduledDate: z.string(),
  cost: z.number().optional(),
  performedBy: z.string().optional(),
  notes: z.string().optional(),
});

const updateMaintenanceSchema = z.object({
  maintenanceType: z.enum(['PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'UPGRADE']).optional(),
  description: z.string().optional(),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  cost: z.number().optional(),
  performedBy: z.string().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
});

// GET - List all maintenance records
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');
    const status = searchParams.get('status');
    const maintenanceType = searchParams.get('maintenanceType');

    const where: any = {};

    if (assetId) {
      where.assetId = assetId;
    }

    if (status) {
      where.status = status;
    }

    if (maintenanceType) {
      where.maintenanceType = maintenanceType;
    }

    const maintenanceRecords = await prisma.assetMaintenance.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            category: true,
            serialNumber: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    return NextResponse.json(maintenanceRecords);
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance records' },
      { status: 500 }
    );
  }
}

// POST - Create a new maintenance record
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    // Only admins can create maintenance records
    if (authResult.user!.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createMaintenanceSchema.parse(body);

    const maintenanceRecord = await prisma.assetMaintenance.create({
      data: {
        ...validatedData,
        scheduledDate: new Date(validatedData.scheduledDate),
      },
      include: {
        asset: true,
      },
    });

    return NextResponse.json(maintenanceRecord, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance record' },
      { status: 500 }
    );
  }
}
