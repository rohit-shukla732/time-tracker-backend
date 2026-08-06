import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';

// GET /api/tickets/categories - Active categories with their active subcategories (any authenticated user)
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const categories = await prisma.ticketCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        active: true,
        sortOrder: true,
        subcategories: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            categoryId: true,
            name: true,
            active: true,
            sortOrder: true,
          },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('Error fetching ticket categories:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ticket categories' },
      { status: error.status || 500 }
    );
  }
}
