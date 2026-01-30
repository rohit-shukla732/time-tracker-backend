import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';

// GET - List all designations
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow HR, ADMIN, and MANAGER roles
    if (authResult.user.role !== 'HR' && authResult.user.role !== 'ADMIN' && authResult.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const designations = await prisma.designation.findMany({
      include: {
        _count: {
          select: {
            employmentInfo: true,
          },
        },
      },
      orderBy: {
        title: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      designations,
    });
  } catch (error) {
    console.error('Error fetching designations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new designation
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authResult.user.role !== 'HR' && authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { title, code, level } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const designation = await prisma.designation.create({
      data: {
        title,
        code: code || null,
        level: level ? parseInt(level) : null,
      },
    });

    return NextResponse.json(
      { message: 'Designation created successfully', designation },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating designation:', error);
    return NextResponse.json(
      { error: 'Failed to create designation' },
      { status: 500 }
    );
  }
}
