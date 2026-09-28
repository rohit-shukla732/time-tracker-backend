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
      unassigned,
      recentTickets,
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
      prisma.ticket.count({ where: { assignedTo: null } }),
      // Only createdAt/resolvedAt needed for the 14-day flow series
      prisma.ticket.findMany({
        select: { createdAt: true, resolvedAt: true },
        where: {
          OR: [
            { createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
            { resolvedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
          ],
        },
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
      // Tickets without a category (e.g. onboarding/offboarding) are tracked
      // separately by type and must not appear as a "null" slice on the chart.
      if (item.categoryId === null) return acc;
      acc[categoryMap.get(item.categoryId) || item.categoryId] = item._count;
      return acc;
    }, {});

    const subcategoryStats = bySubcategory.reduce((acc: any, item: any) => {
      if (item.subcategoryId) {
        acc[subcategoryMap.get(item.subcategoryId) || item.subcategoryId] = item._count;
      }
      return acc;
    }, {});

    // Build a 14-day created/resolved daily series (oldest first)
    const DAY_MS = 24 * 60 * 60 * 1000;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const flow: Array<{ date: string; created: number; resolved: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date(startOfToday.getTime() - i * DAY_MS);
      const dayEnd = new Date(dayStart.getTime() + DAY_MS);
      flow.push({
        date: dayStart.toISOString().split('T')[0],
        created: recentTickets.filter((t: any) => t.createdAt >= dayStart && t.createdAt < dayEnd).length,
        resolved: recentTickets.filter((t: any) => t.resolvedAt && t.resolvedAt >= dayStart && t.resolvedAt < dayEnd).length,
      });
    }

    return NextResponse.json({
      total,
      open,
      inProgress,
      pending,
      resolved,
      closed,
      unassigned,
      byPriority: priorityStats,
      byCategory: categoryStats,
      bySubcategory: subcategoryStats,
      flow,
    });
  } catch (error: any) {
    console.error('Error fetching ticket stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ticket statistics' },
      { status: error.status || 500 }
    );
  }
}
