import { NextRequest, NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';
import { z } from 'zod';

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

// GET - Get a single maintenance record
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

    const maintenanceRecord = await prisma.assetMaintenance.findUnique({
      where: { id },
      include: {
        asset: true,
      },
    });

    if (!maintenanceRecord) {
      return NextResponse.json(
        { error: 'Maintenance record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(maintenanceRecord);
  } catch (error) {
    console.error('Error fetching maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance record' },
      { status: 500 }
    );
  }
}

// PUT - Update a maintenance record
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

    // Only admins can update maintenance records
    if (authResult.user!.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateMaintenanceSchema.parse(body);

    const updateData: any = { ...validatedData };

    if (validatedData.scheduledDate) {
      updateData.scheduledDate = new Date(validatedData.scheduledDate);
    }

    if (validatedData.completedDate) {
      updateData.completedDate = new Date(validatedData.completedDate);
    }

    const maintenanceRecord = await prisma.assetMaintenance.update({
      where: { id },
      data: updateData,
      include: {
        asset: true,
      },
    });

    return NextResponse.json(maintenanceRecord);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance record' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a maintenance record
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

    // Only admins can delete maintenance records
    if (authResult.user!.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.assetMaintenance.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Maintenance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to delete maintenance record' },
      { status: 500 }
    );
  }
}
