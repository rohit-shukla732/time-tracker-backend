import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAccessibleUsers } from "../../../lib/roleAuth";
import { prisma } from "../../../lib/prisma";

// GET /api/dashboard - Get dashboard data based on user role and team
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  
  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const timeRange = url.searchParams.get('timeRange') || '7d'; // 1d, 7d, 30d, 90d
    
    // Calculate date range
    const now = new Date();
    const daysBack = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Get users that this user can access
    const accessibleUserIds = await getAccessibleUsers(authResult.user);
    
    if (accessibleUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          stats: {
            totalUsers: 0,
            activeSessions: 0,
            totalWorkTime: '0h 0m',
            averageWorkTime: '0h 0m'
          },
          recentSessions: [],
          teamStats: [],
          userStats: []
        },
        userInfo: {
          role: authResult.user.role,
          teamId: authResult.user.teamId,
          canViewUsers: accessibleUserIds
        }
      });
    }

    // Get basic stats
    const [totalUsers, activeSessions, sessionSummaries] = await Promise.all([
      // Total accessible users
      prisma.user.count({
        where: { id: { in: accessibleUserIds } }
      }),
      
      // Active sessions (sessions without endedAt)
      prisma.session.count({
        where: {
          userId: { in: accessibleUserIds },
          endedAt: null
        }
      }),
      
      // Session summaries for time range
      prisma.sessionSummary.findMany({
        where: {
          userId: { in: accessibleUserIds },
          createdAt: { gte: startDate }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              team: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          session: {
            select: {
              sessionId: true,
              startedAt: true,
              endedAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]);

    // Calculate total work time
    const totalWorkTimeMs = sessionSummaries.reduce((total, summary) => {
      return total + Number(summary.workTimeMs);
    }, 0);

    // Calculate average work time
    const avgWorkTimeMs = sessionSummaries.length > 0 ? totalWorkTimeMs / sessionSummaries.length : 0;

    // Format time helper
    const formatTime = (ms: number) => {
      const totalMinutes = Math.floor(ms / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}m`;
    };

    // Get recent sessions for display
    const recentSessions = sessionSummaries.slice(0, 10).map(summary => ({
      id: summary.id,
      sessionId: summary.sessionId,
      user: {
        id: summary.user?.id,
        name: summary.user?.name,
        email: summary.user?.email,
        team: summary.user?.team
      },
      startedAt: summary.session?.startedAt,
      endedAt: summary.session?.endedAt,
      workTime: formatTime(Number(summary.workTimeMs)),
      totalBreakTime: formatTime(Number(summary.totalBreakMs)),
      totalIdleTime: formatTime(Number(summary.totalIdleMs)),
      createdAt: summary.createdAt
    }));

    // Calculate user stats (aggregated by user)
    const userStatsMap = new Map();
    sessionSummaries.forEach(summary => {
      const userId = summary.userId;
      if (!userId || !summary.user) return;
      
      if (!userStatsMap.has(userId)) {
        userStatsMap.set(userId, {
          user: {
            id: summary.user.id,
            name: summary.user.name,
            email: summary.user.email,
            role: summary.user.role,
            team: summary.user.team
          },
          sessions: 0,
          totalWorkTime: 0,
          totalBreakTime: 0,
          totalIdleTime: 0
        });
      }
      
      const stats = userStatsMap.get(userId);
      stats.sessions += 1;
      stats.totalWorkTime += Number(summary.workTimeMs);
      stats.totalBreakTime += Number(summary.totalBreakMs);
      stats.totalIdleTime += Number(summary.totalIdleMs);
    });

    const userStats = Array.from(userStatsMap.values()).map(stats => ({
      ...stats,
      totalWorkTime: formatTime(stats.totalWorkTime),
      totalBreakTime: formatTime(stats.totalBreakTime),
      totalIdleTime: formatTime(stats.totalIdleTime),
      avgWorkTime: formatTime(stats.sessions > 0 ? stats.totalWorkTime / stats.sessions : 0)
    })).sort((a, b) => b.sessions - a.sessions);

    // Calculate team stats if user can see multiple teams
    let teamStats: any[] = [];
    if (authResult.user.role === 'ADMIN' || authResult.user.role === 'HR') {
      const teams = await prisma.team.findMany({
        include: {
          members: {
            select: { id: true }
          },
          _count: {
            select: { members: true }
          }
        }
      });

      teamStats = teams.map(team => {
        const teamUserIds = team.members.map(m => m.id);
        const teamSessions = sessionSummaries.filter(s => s.userId && teamUserIds.includes(s.userId));
        const teamWorkTime = teamSessions.reduce((total, s) => total + Number(s.workTimeMs), 0);
        
        return {
          id: team.id,
          name: team.name,
          memberCount: team._count.members,
          sessions: teamSessions.length,
          totalWorkTime: formatTime(teamWorkTime),
          avgWorkTime: formatTime(teamSessions.length > 0 ? teamWorkTime / teamSessions.length : 0)
        };
      }).filter(stats => stats.sessions > 0);
    }

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeSessions,
          totalWorkTime: formatTime(totalWorkTimeMs),
          averageWorkTime: formatTime(avgWorkTimeMs),
          totalSessions: sessionSummaries.length
        },
        recentSessions,
        userStats,
        teamStats,
        timeRange,
        dateRange: {
          from: startDate,
          to: now
        }
      },
      userInfo: {
        id: authResult.user.id,
        role: authResult.user.role,
        teamId: authResult.user.teamId,
        canViewUserIds: accessibleUserIds
      }
    });
  } catch (error) {
    console.error('[dashboard] GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}