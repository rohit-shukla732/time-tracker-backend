import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

const GLOBAL_SESSION_STATE_KEY = "__ace_ems_session_state_store__";
const g: any = globalThis as any;
if (!g[GLOBAL_SESSION_STATE_KEY]) g[GLOBAL_SESSION_STATE_KEY] = new Map<string, any>();
const sessionStateStore: Map<string, any> = g[GLOBAL_SESSION_STATE_KEY];
const SESSION_STATE_TIMEOUT_MS = 120_000; // 2 minutes

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const userId = resolved.id;

  const authResult = await requireAuth(req);
  if (authResult.error || !authResult.user) return unauthorizedResponse(authResult.error);

  // Authorization: admin/hr can view any; manager can view members; users can view own
  if (authResult.user.role === 'MANAGER') {
    if (authResult.user.teamId) {
      // manager can access users in their team
      const target = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
      if (!target || target.teamId !== authResult.user.teamId) {
        return unauthorizedResponse('Access denied');
      }
    } else if (authResult.user.id !== userId) {
      return unauthorizedResponse('Access denied');
    }
  } else if (authResult.user.role !== 'ADMIN' && authResult.user.role !== 'HR') {
    // employees can only view themselves
    if (authResult.user.id !== userId) return unauthorizedResponse('Access denied');
  }

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    // daily work/break/idle for last 7 days
    const dailyWorkData = await Promise.all(last7Days.map(async (day) => {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const agg = await prisma.sessionSummary.aggregate({
        where: { createdAt: { gte: day, lt: nextDay }, userId },
        _sum: { workTimeMs: true, totalBreakMs: true, totalIdleMs: true },
      });
      return {
        date: day.toISOString().split('T')[0],
        day: day.toLocaleDateString('en-US', { weekday: 'short' }),
        workTimeMs: Number(agg._sum.workTimeMs || 0),
        breakTimeMs: Number(agg._sum.totalBreakMs || 0),
        idleTimeMs: Number(agg._sum.totalIdleMs || 0),
      };
    }));

    // daily sessions count
    const dailySessions = await Promise.all(last7Days.map(async (day) => {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const count = await prisma.session.count({
        where: { startedAt: { gte: day, lt: nextDay }, userId },
      });
      return { date: day.toISOString().split('T')[0], day: day.toLocaleDateString('en-US', { weekday: 'short' }), sessions: count };
    }));

    // aggregates for month
    const summaryAgg = await prisma.sessionSummary.aggregate({
      where: { createdAt: { gte: thisMonthStart }, userId },
      _sum: { workTimeMs: true, totalBreakMs: true, totalIdleMs: true },
      _avg: { workTimeMs: true },
      _max: { createdAt: true },
    });

    // top apps this month
    const topAppsGroup = await prisma.sessionAppUsage.groupBy({
      by: ['appName'],
      where: { userId, createdAt: { gte: thisMonthStart } },
      _sum: { timeMs: true },
      orderBy: { _sum: { timeMs: 'desc' } },
      take: 8,
    });

    const topApps = topAppsGroup.map((a: any) => ({ name: a.appName, timeMs: Number(a._sum.timeMs || 0), hours: Number((Number(a._sum.timeMs || 0) / (1000*60*60)).toFixed(1)) }));

    const recentSessions = await prisma.session.findMany({ 
      where: { userId }, 
      orderBy: { startedAt: 'desc' }, 
      take: 10,
      include: {
        summary: true,
        appUsage: {
          orderBy: { timeMs: 'desc' },
          take: 10,
        },
      },
    });

    // realtime status
    let status = 'Offline';
    const key = `user:${userId}`;
    const state = sessionStateStore.get(key);
    if (state && state.lastUpdated && Date.now() - state.lastUpdated <= SESSION_STATE_TIMEOUT_MS) {
      const cs = state.currentState;
      if (cs?.clockedIn) {
        if (cs.onBreak || cs.autoBreak) status = 'Break';
        else if (cs.isIdle) status = 'Idle';
        else status = 'Active';
      } else status = 'Offline';
    }

    return NextResponse.json({
      success: true,
      stats: {
        userId,
        status,
        recentSessions: recentSessions.map((s) => ({ 
          id: s.id, 
          startedAt: s.startedAt, 
          endedAt: s.endedAt, 
          isActive: !s.endedAt,
          summary: s.summary ? {
            workTimeMs: Number(s.summary.workTimeMs || 0),
            totalBreakMs: Number(s.summary.totalBreakMs || 0),
            totalIdleMs: Number(s.summary.totalIdleMs || 0),
          } : null,
          appUsage: s.appUsage.map((app: any) => ({
            appName: app.appName,
            timeMs: Number(app.timeMs || 0),
            hours: Number((Number(app.timeMs || 0) / (1000 * 60 * 60)).toFixed(2)),
          })),
        })),
        charts: { dailyWorkData, dailySessions },
        topApps,
        aggregates: {
          totalWorkMs: Number(summaryAgg._sum.workTimeMs || 0),
          totalBreakMs: Number(summaryAgg._sum.totalBreakMs || 0),
          totalIdleMs: Number(summaryAgg._sum.totalIdleMs || 0),
          avgWorkMs: Number(summaryAgg._avg.workTimeMs || 0),
          lastActive: summaryAgg._max.createdAt ? new Date(summaryAgg._max.createdAt).toISOString() : null,
        }
      }
    });
  } catch (error) {
    console.error('[user stats] GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
