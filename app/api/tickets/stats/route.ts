import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRoles } from '@/lib/roleAuth';

// GET /api/tickets/stats - Get ticket statistics (admin only)
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = authResult.user;
    await requireRoles(req, ['ADMIN']);

    const [
      total,
      open,
      inProgress,
      pending,
      resolved,
      closed,
      byPriority,
      byCategory,
      bySubcategory,
      categories,
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { status: 'PENDING' } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.ticket.count({ where: { status: 'CLOSED' } }),
      prisma.ticket.groupBy({
        by: ['priority'],
        _count: true,
      }),
      prisma.ticket.groupBy({
        by: ['categoryId'],
        _count: true,
      }),
      prisma.ticket.groupBy({
        by: ['subcategoryId'],
        _count: true,
      }),
      prisma.ticketCategory.findMany({
        include: { subcategories: true },
      }),
    ]);

    const priorityStats = byPriority.reduce((acc: any, item: any) => {
      acc[item.priority.toLowerCase()] = item._count;
      return acc;
    }, {});

    const categoryMap = new Map(categories.map((c: any) => [c.id, c.name]));
    const subcategoryMap = new Map(
      categories.flatMap((c: any) => c.subcategories.map((s: any) => [s.id, s.name]))
    );

    const categoryStats = byCategory.reduce((acc: any, item: any) => {
      acc[categoryMap.get(item.categoryId) || item.categoryId] = item._count;
      return acc;
    }, {});

    const subcategoryStats = bySubcategory.reduce((acc: any, item: any) => {
      if (item.subcategoryId) {
        acc[subcategoryMap.get(item.subcategoryId) || item.subcategoryId] = item._count;
      }
      return acc;
    }, {});

    return NextResponse.json({
      total,
      open,
      inProgress,
      pending,
      resolved,
      closed,
      byPriority: priorityStats,
      byCategory: categoryStats,
      bySubcategory: subcategoryStats,
    });
  } catch (error: any) {
    console.error('Error fetching ticket stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ticket statistics' },
      { status: error.status || 500 }
    );
  }
}
