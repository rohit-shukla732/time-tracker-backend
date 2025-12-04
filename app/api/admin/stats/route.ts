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
    
    // Last 7 days for chart
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

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
      topApps,
      dailySessions,
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
      
      // Top apps by usage time (this month)
      prisma.sessionAppUsage.groupBy({
        by: ['appName'],
        where: {
          createdAt: { gte: thisMonthStart },
        },
        _sum: { timeMs: true },
        orderBy: { _sum: { timeMs: 'desc' } },
        take: 10,
      }),
      
      // Daily session counts for last 7 days
      Promise.all(last7Days.map(async (day) => {
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        const count = await prisma.session.count({
          where: {
            startedAt: { gte: day, lt: nextDay },
          },
        });
        return {
          date: day.toISOString().split('T')[0],
          day: day.toLocaleDateString('en-US', { weekday: 'short' }),
          sessions: count,
        };
      })),
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
    
    // Format top apps
    const topAppsFormatted = topApps.map((app: any) => ({
      name: app.appName,
      timeMs: Number(app._sum.timeMs || 0),
      hours: Number((Number(app._sum.timeMs || 0) / (1000 * 60 * 60)).toFixed(1)),
    }));

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
        charts: {
          dailySessions,
          topApps: topAppsFormatted,
          roleDistribution: Object.entries(roleDistribution).map(([role, count]) => ({
            name: role,
            value: count,
          })),
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
