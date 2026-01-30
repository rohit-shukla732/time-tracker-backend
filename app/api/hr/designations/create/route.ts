import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/roleAuth';

// POST - Create new designation
export async function POST(request: NextRequest) {
  const authResult = await requireRoles(request, ['HR', 'ADMIN']);
  if (authResult.error || !authResult.user) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { title, description, level } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const designation = await prisma.designation.create({
      data: {
        title,
        level: level || null,
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
