import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "../../../../lib/roleAuth";
import { prisma } from "../../../../lib/prisma";

// Get session state store from global (populated by /api/session/summary)
const GLOBAL_SESSION_STATE_KEY = "__ace_ems_session_state_store__";
const g: any = globalThis as any;
if (!g[GLOBAL_SESSION_STATE_KEY]) g[GLOBAL_SESSION_STATE_KEY] = new Map<string, any>();
const sessionStateStore: Map<string, any> = g[GLOBAL_SESSION_STATE_KEY];

const SESSION_STATE_TIMEOUT_MS = 120_000; // 2 minutes

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
    
    console.log('=== DATE RANGES ===');
    console.log('Current time:', now.toISOString());
    console.log('Today start:', today.toISOString());
    console.log('Week start:', thisWeekStart.toISOString());
    console.log('Month start:', thisMonthStart.toISOString());
    console.log('==================');
    
    // Last 7 days for chart
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    // Calculate real-time status counts from floor status endpoint logic
    // Build real-time session state by userId from summary data ONLY
    const realtimeStateByUser = new Map<string, any>();
    sessionStateStore.forEach((value, key) => {
      if (key.startsWith('user:')) {
        const userId = key.replace('user:', '');
        if (value.lastUpdated && Date.now() - value.lastUpdated <= SESSION_STATE_TIMEOUT_MS) {
          realtimeStateByUser.set(userId, value);
          console.log(`Realtime state for ${userId}:`, {
            clockedIn: value.currentState?.clockedIn,
            onBreak: value.currentState?.onBreak,
            isIdle: value.currentState?.isIdle,
            autoBreak: value.currentState?.autoBreak,
            lastUpdated: new Date(value.lastUpdated).toISOString(),
            age: Math.round((Date.now() - value.lastUpdated) / 1000) + 's ago'
          });
        }
      }
    });

    console.log('Realtime state users:', realtimeStateByUser.size);

    // Calculate real-time status ONLY from summary data
    let realtimeWorking = 0;
    let realtimeIdle = 0;
    let realtimeBreak = 0;

    realtimeStateByUser.forEach((value, userId) => {
      const state = value.currentState;
      
      if (state?.clockedIn) {
        if (state.onBreak || state.autoBreak) {
          realtimeBreak++;
          console.log(`User ${userId}: On break`);
        } else if (state.isIdle) {
          realtimeIdle++;
          console.log(`User ${userId}: Idle`);
        } else {
          realtimeWorking++;
          console.log(`User ${userId}: Working`);
        }
      }
    });
    
    console.log('Realtime counts:', { realtimeWorking, realtimeIdle, realtimeBreak });
    console.log('=== END DEBUG ===');

    // Get counts in parallel
    const [
      totalUsers,
      totalDepartments,
      activeSessionsToday,
      uniqueUsersToday,
      uniqueUsersThisWeek,
      uniqueUsersThisMonth,
      usersByRole,
      recentSessions,
      topApps,
      topWebsites,
      dailySessions,
      departments,
      dailyWorkSummaries,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Total departments
      prisma.department.count(),
      
      // Active sessions (started today, not ended)
      prisma.session.count({
        where: {
          startedAt: { gte: today },
          endedAt: null,
        },
      }),
      
      // Unique users today
      prisma.session.findMany({
        where: {
          startedAt: { gte: today },
        },
        distinct: ['userId'],
        select: { userId: true },
      }).then(users => {
        console.log('Unique users today:', users.length, 'Users:', users.map(u => u.userId));
        return users.length;
      }),
      
      // Unique users this week
      prisma.session.findMany({
        where: {
          startedAt: { gte: thisWeekStart },
        },
        distinct: ['userId'],
        select: { userId: true },
      }).then(users => {
        console.log('Unique users this week:', users.length);
        return users.length;
      }),
      
      // Unique users this month
      prisma.session.findMany({
        where: {
          startedAt: { gte: thisMonthStart },
        },
        distinct: ['userId'],
        select: { userId: true },
      }).then(users => {
        console.log('Unique users this month:', users.length);
        return users.length;
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

      // Top websites by usage time (this month)
      prisma.sessionWebsiteUsage.groupBy({
        by: ['website', 'browser'],
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
      
      // Departments with member counts
      prisma.department.findMany({
        include: {
          _count: {
            select: { employmentInfo: true }
          }
        },
        orderBy: { name: 'asc' }
      }),
      
      // Daily work summaries for last 7 days
      Promise.all(last7Days.map(async (day) => {
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        const summaries = await prisma.sessionSummary.aggregate({
          where: {
            createdAt: { gte: day, lt: nextDay },
          },
          _sum: {
            workTimeMs: true,
            totalBreakMs: true,
            totalIdleMs: true,
          },
        });
        return {
          day: day.toLocaleDateString('en-US', { weekday: 'short' }),
          work: Number((Number(summaries._sum.workTimeMs || 0) / (1000 * 60 * 60)).toFixed(1)),
          break: Number((Number(summaries._sum.totalBreakMs || 0) / (1000 * 60 * 60)).toFixed(1)),
          idle: Number((Number(summaries._sum.totalIdleMs || 0) / (1000 * 60 * 60)).toFixed(1)),
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

    // Format top websites
    const topWebsitesFormatted = topWebsites.map((site: any) => ({
      name: site.website,
      browser: site.browser,
      timeMs: Number(site._sum.timeMs || 0),
      hours: Number((Number(site._sum.timeMs || 0) / (1000 * 60 * 60)).toFixed(1)),
    }));
    
    // Format department composition
    const chartColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
    const departmentComposition = departments.map((dept: any, index: number) => ({
      name: dept.name,
      memberCount: dept._count.employmentInfo,
      fill: chartColors[index % chartColors.length],
    }));

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          byRole: roleDistribution,
        },
        departments: {
          total: totalDepartments,
          composition: departmentComposition,
        },
        activeUsers: {
          today: uniqueUsersToday,
          thisWeek: uniqueUsersThisWeek,
          thisMonth: uniqueUsersThisMonth,
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
          topApps: topAppsFormatted,
          topWebsites: topWebsitesFormatted,
          roleDistribution: Object.entries(roleDistribution).map(([role, count]) => ({
            name: role,
            value: count,
          })),
          departmentComposition,
          dailyWorkData: dailyWorkSummaries,
        },
        dailyActiveUsers: dailyWorkSummaries.map((d, i) => ({
          date: last7Days[i].toISOString().split('T')[0],
          day: d.day,
          activeUsers: dailySessions[i].sessions,
          totalWork: d.work,
          totalBreak: d.break,
          totalIdle: d.idle,
        })),
        recentActivity: await Promise.all(
          recentSessions.slice(0, 10).map(async (s: any, index: number) => {
            const sessionDate = new Date(s.startedAt);
            sessionDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(sessionDate);
            nextDay.setDate(nextDay.getDate() + 1);
            
            const summary = await prisma.sessionSummary.findFirst({
              where: {
                userId: s.userId,
                createdAt: { gte: sessionDate, lt: nextDay },
              },
            });
            
            const sessionsCount = await prisma.session.count({
              where: {
                userId: s.userId,
                startedAt: { gte: sessionDate, lt: nextDay },
              },
            });
            
            return {
              id: `${s.userId}-${sessionDate.toISOString().split('T')[0]}-${index}`,
              userId: s.userId,
              userName: s.user?.name,
              userEmail: s.user?.email,
              date: sessionDate.toISOString(),
              workTimeMs: Number(summary?.workTimeMs || 0),
              breakTimeMs: Number(summary?.totalBreakMs || 0),
              idleTimeMs: Number(summary?.totalIdleMs || 0),
              sessionsCount,
            };
          })
        ),
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
