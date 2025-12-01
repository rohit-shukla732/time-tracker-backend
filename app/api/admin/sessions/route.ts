import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "../../../../lib/roleAuth";
import { prisma } from "../../../../lib/prisma";

// GET /api/admin/sessions - Get all sessions with filters (Admin only)
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);

  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId') || '';
    const status = searchParams.get('status') || ''; // 'active', 'completed', 'all'
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (status === 'active') {
      where.endedAt = null;
    } else if (status === 'completed') {
      where.endedAt = { not: null };
    }
    
    if (dateFrom) {
      where.startedAt = { ...where.startedAt, gte: new Date(dateFrom) };
    }
    
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.startedAt = { ...where.startedAt, lte: endDate };
    }

    const [sessions, totalCount] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          summary: true,
          _count: {
            select: {
              events: true,
              appSwitch: true,
            },
          },
        },
      }),
      prisma.session.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      sessions: sessions.map((s: any) => ({
        id: s.id,
        sessionId: s.sessionId,
        userId: s.userId,
        userName: s.user?.name,
        userEmail: s.user?.email,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        isActive: !s.endedAt,
        autoClockOut: s.autoClockOut,
        autoReason: s.autoReason,
        summary: s.summary ? {
          sessionDurationMs: Number(s.summary.sessionDurationMs),
          workTimeMs: Number(s.summary.workTimeMs),
          totalBreakMs: Number(s.summary.totalBreakMs),
          totalIdleMs: Number(s.summary.totalIdleMs),
        } : null,
        eventCount: s._count.events,
        appSwitchCount: s._count.appSwitch,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
