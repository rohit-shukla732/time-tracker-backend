import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "../../../../lib/roleAuth";
import { prisma } from "../../../../lib/prisma";

// GET /api/admin/activity - Get real-time activity feed (Admin only)
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);

  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type') || 'all'; // 'events', 'sessions', 'app-switch', 'all'

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const activities: any[] = [];

    if (type === 'all' || type === 'sessions') {
      // Get recent session starts/ends
      const recentSessions = await prisma.session.findMany({
        where: {
          OR: [
            { startedAt: { gte: last24Hours } },
            { endedAt: { gte: last24Hours } },
          ],
        },
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      recentSessions.forEach((s: any) => {
        activities.push({
          type: 'session_start',
          timestamp: s.startedAt,
          userId: s.userId,
          userName: s.user?.name,
          userEmail: s.user?.email,
          details: { sessionId: s.sessionId },
        });

        if (s.endedAt) {
          activities.push({
            type: 'session_end',
            timestamp: s.endedAt,
            userId: s.userId,
            userName: s.user?.name,
            userEmail: s.user?.email,
            details: { 
              sessionId: s.sessionId,
              autoClockOut: s.autoClockOut,
              autoReason: s.autoReason,
            },
          });
        }
      });
    }

    if (type === 'all' || type === 'events') {
      // Get recent events
      const recentEvents = await prisma.event.findMany({
        where: {
          timestamp: { gte: last24Hours },
        },
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      recentEvents.forEach((e: any) => {
        activities.push({
          type: `event_${e.type}`,
          timestamp: e.timestamp,
          userId: e.userId,
          userName: e.user?.name,
          userEmail: e.user?.email,
          details: {
            eventType: e.type,
            reason: e.reason,
            durationMs: e.durationMs ? Number(e.durationMs) : null,
          },
        });
      });
    }

    if (type === 'all' || type === 'app-switch') {
      // Get recent app switches
      const recentAppSwitches = await prisma.appSwitchEvent.findMany({
        where: {
          timestamp: { gte: last24Hours },
        },
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      recentAppSwitches.forEach((a: any) => {
        activities.push({
          type: 'app_switch',
          timestamp: a.timestamp,
          userId: a.userId,
          userName: a.user?.name,
          userEmail: a.user?.email,
          details: {
            fromApp: a.fromApp,
            toApp: a.toApp,
            durationMs: a.durationMs ? Number(a.durationMs) : null,
          },
        });
      });
    }

    // Sort by timestamp descending and limit
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const limitedActivities = activities.slice(0, limit);

    // Get currently active users
    const activeUsers = await prisma.session.findMany({
      where: {
        endedAt: null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      activeUsers: activeUsers.map((s: any) => ({
        userId: s.userId,
        userName: s.user?.name,
        userEmail: s.user?.email,
        sessionId: s.sessionId,
        startedAt: s.startedAt,
      })),
      activeCount: activeUsers.length,
      activities: limitedActivities,
    });
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
