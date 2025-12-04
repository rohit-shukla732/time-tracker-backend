import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin, unauthorizedResponse } from "../../../../lib/roleAuth";
import { logger } from "../../../../lib/logger";

const HEARTBEAT_TIMEOUT_MS = 600_000; // 10 minutes

// Get heartbeat store from global
const GLOBAL_HEARTBEAT_KEY = "__ace_ems_heartbeat_store__";
const g: any = globalThis as any;
const heartbeatStore: Map<string, { clientId: string; userId?: string; lastSeenMs: number; name?: string | null }> = 
  g[GLOBAL_HEARTBEAT_KEY] || new Map();

type EmployeeStatus = 'working' | 'idle' | 'break' | 'offline';

interface FloorEmployee {
  id: string;
  name: string | null;
  email: string;
  role: string;
  teamId: string | null;
  teamName: string | null;
  seatNumber: number | null;
  status: EmployeeStatus;
  lastActivity: string | null;
  currentApp: string | null;
  sessionId: string | null;
  onBreakSince: string | null;
  idleSince: string | null;
  workingDuration: number | null; // ms today
}

// Helper to determine if heartbeat is alive
function isAlive(lastSeenMs?: number) {
  if (!lastSeenMs) return false;
  return Date.now() - lastSeenMs <= HEARTBEAT_TIMEOUT_MS;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const authResult = await requireAdmin(request);
    if (authResult.error || !authResult.user) {
      logger.warn("GET /api/admin/floor-status - Unauthorized");
      return unauthorizedResponse(authResult.error);
    }

    // Get all employees (not ADMIN)
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['EMPLOYEE', 'HR', 'MANAGER', 'ADMIN']
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teamId: true,
        team: {
          select: {
            name: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all active sessions for today
    const activeSessions = await prisma.session.findMany({
      where: {
        startedAt: { gte: today },
        endedAt: null, // Still active
      },
      select: {
        sessionId: true,
        userId: true,
        startedAt: true,
      }
    });

    // Get latest events for each user (to determine break/idle status)
    const latestEvents = await prisma.event.findMany({
      where: {
        timestamp: { gte: today },
        type: {
          in: ['BREAK_START', 'BREAK_END', 'IDLE_START', 'IDLE_END', 'APP_FOCUS']
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 500, // Get recent events
    });

    // Get latest app usage for each active session
    const latestAppUsage = await prisma.appSwitchEvent.findMany({
      where: {
        timestamp: { gte: today }
      },
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    // Get today's work duration summaries
    const sessionSummaries = await prisma.sessionSummary.findMany({
      where: {
        session: {
          startedAt: { gte: today }
        }
      },
      select: {
        userId: true,
        workTimeMs: true,
      }
    });

    // Build heartbeat map by userId
    const heartbeatByUser = new Map<string, { alive: boolean; lastSeenMs: number }>();
    heartbeatStore.forEach((value) => {
      if (value.userId) {
        heartbeatByUser.set(value.userId, {
          alive: isAlive(value.lastSeenMs),
          lastSeenMs: value.lastSeenMs,
        });
      }
    });

    // Build session map by userId
    const sessionByUser = new Map<string, { sessionId: string; startedAt: Date }>();
    activeSessions.forEach(session => {
      if (session.userId) {
        sessionByUser.set(session.userId, {
          sessionId: session.sessionId,
          startedAt: session.startedAt,
        });
      }
    });

    // Build latest event map by userId
    const latestEventByUser = new Map<string, { type: string; timestamp: Date }>();
    latestEvents.forEach(event => {
      if (event.userId && !latestEventByUser.has(event.userId)) {
        latestEventByUser.set(event.userId, {
          type: event.type,
          timestamp: event.timestamp,
        });
      }
    });

    // Build latest app by userId
    const latestAppByUser = new Map<string, string>();
    latestAppUsage.forEach(app => {
      if (app.userId && !latestAppByUser.has(app.userId)) {
        latestAppByUser.set(app.userId, app.toApp || 'Unknown');
      }
    });

    // Build work duration by userId
    const workDurationByUser = new Map<string, number>();
    sessionSummaries.forEach(summary => {
      if (summary.userId) {
        const current = workDurationByUser.get(summary.userId) || 0;
        workDurationByUser.set(summary.userId, current + Number(summary.workTimeMs));
      }
    });

    // Assign seat numbers (based on index for now - could be stored in DB later)
    const floorEmployees: FloorEmployee[] = users.map((user, index) => {
      const heartbeat = heartbeatByUser.get(user.id);
      const session = sessionByUser.get(user.id);
      const latestEvent = latestEventByUser.get(user.id);
      const currentApp = latestAppByUser.get(user.id) || null;
      const workDuration = workDurationByUser.get(user.id) || null;

      // Determine status
      let status: EmployeeStatus = 'offline';
      let onBreakSince: string | null = null;
      let idleSince: string | null = null;

      if (heartbeat?.alive && session) {
        // Online and has active session
        if (latestEvent?.type === 'BREAK_START') {
          status = 'break';
          onBreakSince = latestEvent.timestamp.toISOString();
        } else if (latestEvent?.type === 'IDLE_START') {
          status = 'idle';
          idleSince = latestEvent.timestamp.toISOString();
        } else {
          status = 'working';
        }
      } else if (session && !heartbeat?.alive) {
        // Has session but no recent heartbeat - could be idle
        status = 'idle';
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
        teamName: user.team?.name || null,
        seatNumber: index + 1, // Assign seat based on index (can be customized)
        status,
        lastActivity: heartbeat?.lastSeenMs 
          ? new Date(heartbeat.lastSeenMs).toISOString() 
          : session?.startedAt.toISOString() || null,
        currentApp,
        sessionId: session?.sessionId || null,
        onBreakSince,
        idleSince,
        workingDuration: workDuration,
      };
    });

    // Calculate summary stats
    const statusCounts = {
      working: floorEmployees.filter(e => e.status === 'working').length,
      idle: floorEmployees.filter(e => e.status === 'idle').length,
      break: floorEmployees.filter(e => e.status === 'break').length,
      offline: floorEmployees.filter(e => e.status === 'offline').length,
      total: floorEmployees.length,
    };

    const durationMs = Date.now() - startTime;
    logger.response("GET", "/api/admin/floor-status", 200, durationMs);

    return NextResponse.json({
      success: true,
      employees: floorEmployees,
      stats: statusCounts,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const err = error as Error;
    const durationMs = Date.now() - startTime;
    logger.error("GET /api/admin/floor-status - Failed", err);
    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      { status: 500 }
    );
  }
}
