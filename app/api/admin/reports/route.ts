import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "../../../../lib/roleAuth";
import { prisma } from "../../../../lib/prisma";

// GET /api/admin/reports - Get detailed reports (Admin only)
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);

  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('type') || 'daily'; // 'daily', 'weekly', 'monthly', 'user'
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const userId = searchParams.get('userId') || '';

    // Default date range: last 30 days
    const endDate = dateTo ? new Date(dateTo) : new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = dateFrom ? new Date(dateFrom) : new Date();
    if (!dateFrom) {
      startDate.setDate(startDate.getDate() - 30);
    }
    startDate.setHours(0, 0, 0, 0);

    if (reportType === 'user' && userId) {
      // User-specific report
      const userSessions = await prisma.session.findMany({
        where: {
          userId,
          startedAt: { gte: startDate, lte: endDate },
        },
        include: {
          summary: true,
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { startedAt: 'desc' },
      });

      const userAppUsage = await prisma.sessionAppUsage.findMany({
        where: {
          userId,
          createdAt: { gte: startDate, lte: endDate },
        },
      });

      // Aggregate app usage
      const appUsageMap = new Map<string, number>();
      userAppUsage.forEach((a: any) => {
        const current = appUsageMap.get(a.appName) || 0;
        appUsageMap.set(a.appName, current + Number(a.timeMs));
      });

      const topApps = Array.from(appUsageMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([appName, timeMs]) => ({ appName, timeMs }));

      // Calculate totals
      const totals = userSessions.reduce((acc: any, s: any) => {
        if (s.summary) {
          acc.totalWorkTimeMs += Number(s.summary.workTimeMs);
          acc.totalBreakTimeMs += Number(s.summary.totalBreakMs);
          acc.totalIdleTimeMs += Number(s.summary.totalIdleMs);
          acc.totalSessionDurationMs += Number(s.summary.sessionDurationMs);
        }
        return acc;
      }, {
        totalWorkTimeMs: 0,
        totalBreakTimeMs: 0,
        totalIdleTimeMs: 0,
        totalSessionDurationMs: 0,
      });

      return NextResponse.json({
        success: true,
        report: {
          type: 'user',
          userId,
          user: userSessions[0]?.user || null,
          dateRange: { from: startDate, to: endDate },
          sessionCount: userSessions.length,
          totals,
          topApps,
          sessions: userSessions.map((s: any) => ({
            sessionId: s.sessionId,
            startedAt: s.startedAt,
            endedAt: s.endedAt,
            summary: s.summary ? {
              workTimeMs: Number(s.summary.workTimeMs),
              breakTimeMs: Number(s.summary.totalBreakMs),
              idleTimeMs: Number(s.summary.totalIdleMs),
            } : null,
          })),
        },
      });
    }

    // Daily/Weekly/Monthly aggregated report
    const summaries = await prisma.sessionSummary.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        session: {
          select: { startedAt: true },
        },
      },
    });

    // Aggregate by date
    const dailyData = new Map<string, any>();
    summaries.forEach((s: any) => {
      const date = s.session.startedAt.toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          sessionCount: 0,
          totalWorkTimeMs: 0,
          totalBreakTimeMs: 0,
          totalIdleTimeMs: 0,
          uniqueUsers: new Set(),
        });
      }
      const day = dailyData.get(date)!;
      day.sessionCount++;
      day.totalWorkTimeMs += Number(s.workTimeMs);
      day.totalBreakTimeMs += Number(s.totalBreakMs);
      day.totalIdleTimeMs += Number(s.totalIdleMs);
      if (s.userId) day.uniqueUsers.add(s.userId);
    });

    const dailyReport = Array.from(dailyData.values())
      .map((d: any) => ({
        date: d.date,
        sessionCount: d.sessionCount,
        uniqueUserCount: d.uniqueUsers.size,
        totalWorkTimeMs: d.totalWorkTimeMs,
        totalBreakTimeMs: d.totalBreakTimeMs,
        totalIdleTimeMs: d.totalIdleTimeMs,
        avgWorkTimeMs: d.sessionCount > 0 ? d.totalWorkTimeMs / d.sessionCount : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top users by work time
    const userWorkTime = new Map<string, { userId: string; name: string; email: string; workTimeMs: number; sessionCount: number }>();
    summaries.forEach((s: any) => {
      if (!s.userId) return;
      if (!userWorkTime.has(s.userId)) {
        userWorkTime.set(s.userId, {
          userId: s.userId,
          name: s.user?.name || 'Unknown',
          email: s.user?.email || '',
          workTimeMs: 0,
          sessionCount: 0,
        });
      }
      const user = userWorkTime.get(s.userId)!;
      user.workTimeMs += Number(s.workTimeMs);
      user.sessionCount++;
    });

    const topUsers = Array.from(userWorkTime.values())
      .sort((a, b) => b.workTimeMs - a.workTimeMs)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      report: {
        type: reportType,
        dateRange: { from: startDate, to: endDate },
        summary: {
          totalSessions: summaries.length,
          totalWorkTimeMs: summaries.reduce((acc: number, s: any) => acc + Number(s.workTimeMs), 0),
          totalBreakTimeMs: summaries.reduce((acc: number, s: any) => acc + Number(s.totalBreakMs), 0),
          totalIdleTimeMs: summaries.reduce((acc: number, s: any) => acc + Number(s.totalIdleMs), 0),
        },
        dailyData: dailyReport,
        topUsers,
      },
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
