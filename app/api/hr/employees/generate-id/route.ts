import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow HR and ADMIN roles
    if (authResult.user.role !== 'HR' && authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get the last employee ID
    const lastEmployee = await prisma.user.findFirst({
      where: {
        id: {
          startsWith: 'ACE',
        },
      },
      orderBy: {
        id: 'desc',
      },
      select: {
        id: true,
      },
    });

    let newId: string;
    
    if (lastEmployee) {
      // Extract the number from the last employee ID (e.g., ACE136 -> 136)
      const match = lastEmployee.id.match(/ACE(\d+)/);
      if (match) {
        const lastNumber = parseInt(match[1], 10);
        const nextNumber = lastNumber + 1;
        // Format with leading zeros to maintain 3 digits
        newId = `ACE${nextNumber.toString().padStart(3, '0')}`;
      } else {
        // Fallback if pattern doesn't match
        newId = 'ACE001';
      }
    } else {
      // No employees yet, start from ACE001
      newId = 'ACE001';
    }

    return NextResponse.json({
      success: true,
      id: newId,
    });
  } catch (error) {
    console.error('Error generating employee ID:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
