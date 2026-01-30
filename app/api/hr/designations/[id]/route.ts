import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';

// PUT - Update designation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authResult.user.role !== 'HR' && authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, code, level } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const designation = await prisma.designation.update({
      where: { id },
      data: {
        title,
        code: code || null,
        level: level ? parseInt(level) : null,
      },
    });

    return NextResponse.json(
      { message: 'Designation updated successfully', designation },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating designation:', error);
    return NextResponse.json(
      { error: 'Failed to update designation' },
      { status: 500 }
    );
  }
}

// DELETE - Delete designation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authResult.user.role !== 'HR' && authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Check if designation is in use
    const employeeCount = await prisma.employmentInfo.count({
      where: { designationId: id },
    });

    if (employeeCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete designation. ${employeeCount} employee(s) are assigned to this designation.` },
        { status: 400 }
      );
    }

    await prisma.designation.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Designation deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting designation:', error);
    return NextResponse.json(
      { error: 'Failed to delete designation' },
      { status: 500 }
    );
  }
}
