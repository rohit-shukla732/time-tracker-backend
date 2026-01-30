import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "../../../../lib/roleAuth";
import { prisma } from "../../../../lib/prisma";

// GET /api/admin/user-sessions - Get user-centric daily activity with timeline
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);

  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const dateParam = searchParams.get('date');
    
    // Default to today if no date provided
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get all users who had activity on this date
    const usersWithActivity = await prisma.session.findMany({
      where: {
        startedAt: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      distinct: ['userId'],
    });

    const totalCount = usersWithActivity.length;
    const totalPages = Math.ceil(totalCount / limit);
    const offset = (page - 1) * limit;

    // Paginate users
    const paginatedUsers = usersWithActivity.slice(offset, offset + limit);

    // Build user session data with timeline
    const userSessions = await Promise.all(paginatedUsers.map(async ({ userId, user }) => {
      // Get all sessions for this user on this date
      const sessions = await prisma.session.findMany({
        where: {
          userId,
          startedAt: {
            gte: targetDate,
            lt: nextDay,
          },
        },
        orderBy: {
          startedAt: 'asc',
        },
      });

      // Get session summaries
      const summaries = await prisma.sessionSummary.findMany({
        where: {
          userId,
          createdAt: {
            gte: targetDate,
            lt: nextDay,
          },
        },
      });

      // Get events
      const events = await prisma.event.findMany({
        where: {
          userId,
          timestamp: {
            gte: targetDate,
            lt: nextDay,
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      // Get app usage
      const appUsage = await prisma.sessionAppUsage.findMany({
        where: {
          session: {
            userId,
            startedAt: {
              gte: targetDate,
              lt: nextDay,
            },
          },
        },
        select: {
          appName: true,
          timeMs: true,
          createdAt: true,
        },
        orderBy: {
          timeMs: 'desc',
        },
        take: 10,
      });

      // Get website visits
      const websiteVisits = await prisma.sessionWebsiteUsage.findMany({
        where: {
          session: {
            userId,
            startedAt: {
              gte: targetDate,
              lt: nextDay,
            },
          },
        },
        select: {
          website: true,
          browser: true,
          timeMs: true,
          createdAt: true,
        },
        orderBy: {
          timeMs: 'desc',
        },
        take: 10,
      });

      // Calculate totals
      const totalWorkTimeMs = summaries.reduce((sum, s) => sum + Number(s.workTimeMs), 0);
      const totalBreakTimeMs = summaries.reduce((sum, s) => sum + Number(s.totalBreakMs), 0);
      const totalIdleMs = summaries.reduce((sum, s) => sum + Number(s.totalIdleMs), 0);
      const totalDurationMs = summaries.reduce((sum, s) => sum + Number(s.sessionDurationMs), 0);

      // Build timeline
      const timeline: any[] = [];

      // Add session starts and ends
      sessions.forEach((session) => {
        timeline.push({
          id: `session-start-${session.id}`,
          type: 'session_start',
          timestamp: session.startedAt.toISOString(),
          sessionId: session.sessionId,
          data: {
            sessionId: session.sessionId,
          },
        });

        if (session.endedAt) {
          timeline.push({
            id: `session-end-${session.id}`,
            type: 'session_end',
            timestamp: session.endedAt.toISOString(),
            sessionId: session.sessionId,
            data: {
              sessionId: session.sessionId,
              autoClockOut: session.autoClockOut,
              reason: session.autoReason,
            },
          });
        }
      });

      // Add events (breaks, idle)
      events.forEach((event) => {
        timeline.push({
          id: `event-${event.id}`,
          type: event.type.toLowerCase().replace('_', '_'),
          timestamp: event.timestamp.toISOString(),
          data: {
            reason: event.reason,
            durationMs: event.durationMs ? Number(event.durationMs) : null,
          },
        });
      });

      // Group app usage by time period (every hour)
      const appsByHour = new Map<number, typeof appUsage>();
      appUsage.forEach((app) => {
        const hour = new Date(app.createdAt).getHours();
        if (!appsByHour.has(hour)) {
          appsByHour.set(hour, []);
        }
        appsByHour.get(hour)?.push(app);
      });

      appsByHour.forEach((apps, hour) => {
        if (apps.length > 0) {
          const timestamp = new Date(targetDate);
          timestamp.setHours(hour, 30, 0, 0); // Middle of the hour
          timeline.push({
            id: `apps-${userId}-${hour}`,
            type: 'app_usage',
            timestamp: timestamp.toISOString(),
            data: {
              apps: apps.map(a => ({ name: a.appName, timeMs: Number(a.timeMs) })),
            },
          });
        }
      });

      // Group website visits by time period
      const sitesByHour = new Map<number, typeof websiteVisits>();
      websiteVisits.forEach((site) => {
        const hour = new Date(site.createdAt).getHours();
        if (!sitesByHour.has(hour)) {
          sitesByHour.set(hour, []);
        }
        sitesByHour.get(hour)?.push(site);
      });

      sitesByHour.forEach((sites, hour) => {
        if (sites.length > 0) {
          const timestamp = new Date(targetDate);
          timestamp.setHours(hour, 45, 0, 0); // Later in the hour
          timeline.push({
            id: `websites-${userId}-${hour}`,
            type: 'website_visit',
            timestamp: timestamp.toISOString(),
            data: {
              websites: sites.map(s => ({ url: s.website, browser: s.browser, timeMs: Number(s.timeMs) })),
            },
          });
        }
      });

      // Sort timeline by timestamp
      timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return {
        userId,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || '',
        date: targetDate.toISOString().split('T')[0],
        totalSessions: sessions.length,
        totalWorkTimeMs,
        totalBreakTimeMs,
        totalIdleMs,
        totalDurationMs,
        timeline,
      };
    }));

    return NextResponse.json({
      success: true,
      userSessions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch user sessions" },
      { status: 500 }
    );
  }
}
