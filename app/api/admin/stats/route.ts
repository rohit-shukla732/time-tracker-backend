import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "../../../../lib/roleAuth";
import { prisma } from "../../../../lib/prisma";

// GET /api/admin/stats - Get dashboard statistics (Admin only)
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);

  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get counts in parallel
    const [
      totalUsers,
      totalTeams,
      activeSessionsToday,
      totalSessionsToday,
      totalSessionsThisWeek,
      totalSessionsThisMonth,
      usersByRole,
      recentSessions,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Total teams
      prisma.team.count(),
      
      // Active sessions (started today, not ended)
      prisma.session.count({
        where: {
          startedAt: { gte: today },
          endedAt: null,
        },
      }),
      
      // Total sessions today
      prisma.session.count({
        where: {
          startedAt: { gte: today },
        },
      }),
      
      // Total sessions this week
      prisma.session.count({
        where: {
          startedAt: { gte: thisWeekStart },
        },
      }),
      
      // Total sessions this month
      prisma.session.count({
        where: {
          startedAt: { gte: thisMonthStart },
        },
      }),
      
      // Users by role
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      
      // Recent sessions with user info
      prisma.session.findMany({
        take: 10,
        orderBy: { startedAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

    // Get work time statistics
    const sessionSummaries = await prisma.sessionSummary.aggregate({
      where: {
        createdAt: { gte: thisMonthStart },
      },
      _sum: {
        workTimeMs: true,
        totalBreakMs: true,
        totalIdleMs: true,
        sessionDurationMs: true,
      },
      _avg: {
        workTimeMs: true,
        sessionDurationMs: true,
      },
    });

    // Format users by role
    const roleDistribution = usersByRole.reduce((acc: Record<string, number>, item: any) => {
      acc[item.role] = item._count.id;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          byRole: roleDistribution,
        },
        teams: {
          total: totalTeams,
        },
        sessions: {
          activeToday: activeSessionsToday,
          today: totalSessionsToday,
          thisWeek: totalSessionsThisWeek,
          thisMonth: totalSessionsThisMonth,
        },
        workTime: {
          totalWorkTimeMs: Number(sessionSummaries._sum.workTimeMs || 0),
          totalBreakTimeMs: Number(sessionSummaries._sum.totalBreakMs || 0),
          totalIdleTimeMs: Number(sessionSummaries._sum.totalIdleMs || 0),
          avgWorkTimeMs: Number(sessionSummaries._avg.workTimeMs || 0),
          avgSessionDurationMs: Number(sessionSummaries._avg.sessionDurationMs || 0),
        },
        recentSessions: recentSessions.map((s: any) => ({
          id: s.id,
          sessionId: s.sessionId,
          userId: s.userId,
          userName: s.user?.name,
          userEmail: s.user?.email,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          isActive: !s.endedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
