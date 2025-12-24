import { NextRequest, NextResponse } from "next/server";
import { requireManager, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

// Reuse the same global session state store as admin stats
const GLOBAL_SESSION_STATE_KEY = "__ace_ems_session_state_store__";
const g: any = globalThis as any;
if (!g[GLOBAL_SESSION_STATE_KEY]) g[GLOBAL_SESSION_STATE_KEY] = new Map<string, any>();
const sessionStateStore: Map<string, any> = g[GLOBAL_SESSION_STATE_KEY];

const SESSION_STATE_TIMEOUT_MS = 120_000; // 2 minutes

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const teamId = resolved.id;

  const authResult = await requireManager(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    // Verify team exists
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    // If manager role, ensure they are part of this team (or the assigned manager)
    if (authResult.user.role === 'MANAGER') {
      // Allow if user is the team's assigned manager, or the manager's user.teamId matches the team
      if (team.managerId !== authResult.user.id && authResult.user.teamId !== teamId) {
        return unauthorizedResponse('Access denied. Not manager of this team');
      }
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    // Get member IDs for the team
    const teamMembers = await prisma.user.findMany({ where: { teamId }, select: { id: true } });
    const memberIds = new Set(teamMembers.map((m) => m.id));

    // Calculate realtime status counts for team members
    let realtimeWorking = 0;
    let realtimeIdle = 0;
    let realtimeBreak = 0;

    sessionStateStore.forEach((value, key) => {
      if (key.startsWith('user:') && value?.lastUpdated && Date.now() - value.lastUpdated <= SESSION_STATE_TIMEOUT_MS) {
        const userId = key.split(':')[1];
        if (!memberIds.has(userId)) return;
        const state = value.currentState;
        if (state?.clockedIn) {
          if (state.onBreak || state.autoBreak) {
            realtimeBreak++;
          } else if (state.isIdle) {
            realtimeIdle++;
          } else {
            realtimeWorking++;
          }
        }
      }
    });

    // Fetch counts and charts in parallel scoped to team
    const [
      totalUsers,
      activeSessionsToday,
      totalSessionsToday,
      totalSessionsThisWeek,
      totalSessionsThisMonth,
      recentSessions,
      topApps,
      dailySessions,
    ] = await Promise.all([
      prisma.user.count({ where: { teamId } }),

      prisma.session.count({
        where: {
          startedAt: { gte: today },
          endedAt: null,
          user: { teamId },
        },
      }),

      prisma.session.count({
        where: {
          startedAt: { gte: today },
          user: { teamId },
        },
      }),

      prisma.session.count({
        where: {
          startedAt: { gte: thisWeekStart },
          user: { teamId },
        },
      }),

      prisma.session.count({
        where: {
          startedAt: { gte: thisMonthStart },
          user: { teamId },
        },
      }),

      prisma.session.findMany({
        take: 10,
        orderBy: { startedAt: 'desc' },
        where: { user: { teamId } },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),

      prisma.sessionAppUsage.groupBy({
        by: ['appName'],
        where: {
          createdAt: { gte: thisMonthStart },
          user: { teamId },
        },
        _sum: { timeMs: true },
        orderBy: { _sum: { timeMs: 'desc' } },
        take: 10,
      }),

      Promise.all(last7Days.map(async (day) => {
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        const count = await prisma.session.count({
          where: {
            startedAt: { gte: day, lt: nextDay },
            user: { teamId },
          },
        });
        return {
          date: day.toISOString().split('T')[0],
          day: day.toLocaleDateString('en-US', { weekday: 'short' }),
          sessions: count,
        };
      })),
    ]);

    // Work time aggregates for team (this month)
    const sessionSummaries = await prisma.sessionSummary.aggregate({
      where: { createdAt: { gte: thisMonthStart }, user: { teamId } },
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

    const topAppsFormatted = topApps.map((app: any) => ({
      name: app.appName,
      timeMs: Number(app._sum.timeMs || 0),
      hours: Number((Number(app._sum.timeMs || 0) / (1000 * 60 * 60)).toFixed(1)),
    }));

    // Daily work/break/idle totals for last 7 days (team scoped)
    const dailyWorkData = await Promise.all(last7Days.map(async (day) => {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const agg = await prisma.sessionSummary.aggregate({
        where: {
          session: {
            startedAt: { gte: day, lt: nextDay },
            user: { teamId },
          },
        },
        _sum: {
          workTimeMs: true,
          totalBreakMs: true,
          totalIdleMs: true,
        },
      });

      return {
        date: day.toISOString().split('T')[0],
        day: day.toLocaleDateString('en-US', { weekday: 'short' }),
        workTimeMs: Number(agg._sum.workTimeMs || 0),
        breakTimeMs: Number(agg._sum.totalBreakMs || 0),
        idleTimeMs: Number(agg._sum.totalIdleMs || 0),
      };
    }));

    // Top users by workTime (this month) for the team
    const topUsersGroup = await prisma.sessionSummary.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: thisMonthStart },
        user: { teamId },
      },
      _sum: { workTimeMs: true },
      orderBy: { _sum: { workTimeMs: 'desc' } },
      take: 8,
    });

    const topUserIds = topUsersGroup.map((t: any) => t.userId).filter(Boolean);
    const topUserRecords = topUserIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: topUserIds } },
      select: { id: true, name: true, email: true },
    }) : [];

    const topUsers = topUsersGroup.map((g: any) => ({
      userId: g.userId,
      workTimeMs: Number(g._sum.workTimeMs || 0),
      user: topUserRecords.find((u: any) => u.id === g.userId) || null,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        team: { id: team.id, name: team.name },
        users: { total: totalUsers },
        sessions: {
          activeToday: activeSessionsToday,
          today: totalSessionsToday,
          thisWeek: totalSessionsThisWeek,
          thisMonth: totalSessionsThisMonth,
        },
        realtime: {
          working: realtimeWorking,
          idle: realtimeIdle,
          break: realtimeBreak,
          total: realtimeWorking + realtimeIdle + realtimeBreak,
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
          dailyWorkData,
          topApps: topAppsFormatted,
        },
        topUsers,
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
    console.error('Error fetching team stats:', error);
    return NextResponse.json({ error: 'Failed to fetch team statistics' }, { status: 500 });
  }
}
