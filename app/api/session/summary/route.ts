import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth } from "../../../../lib/requireAuth";
import { logger } from "../../../../lib/logger";

/**
 * POST /api/session/summary
 * 
 * Receives real-time session summary data from the desktop app.
 * Updates the session summary in the database and stores current state.
 * 
 * Expected payload:
 * {
 *   sessionId: string,
 *   userId: string,
 *   timestamp: string (ISO date),
 *   sessionDurationMs: number,
 *   workTimeMs: number,
 *   breakTimeMs: number,
 *   idleTimeMs: number,
 *   currentState: {
 *     clockedIn: boolean,
 *     onBreak: boolean,
 *     isIdle: boolean,
 *     autoBreak: boolean
 *   },
 *   appUsage: {
 *     totalApps: number,
 *     totalTrackedTimeMs: number,
 *     topApps: Array<{ app: string, timeMs: number }>
 *   }
 * }
 */

// In-memory store for real-time session states (for floor map and dashboard)
const GLOBAL_SESSION_STATE_KEY = "__ace_ems_session_state_store__";
const g: any = globalThis as any;
if (!g[GLOBAL_SESSION_STATE_KEY]) g[GLOBAL_SESSION_STATE_KEY] = new Map<string, any>();
const sessionStateStore: Map<string, any> = g[GLOBAL_SESSION_STATE_KEY];

// Other routes can access this via globalThis[GLOBAL_SESSION_STATE_KEY]

interface AppUsageItem {
  app: string;
  timeMs: number;
}

interface WebsiteUsageItem {
  website: string;
  timeMs: number;
  browser?: string;
}

interface CurrentState {
  clockedIn: boolean;
  onBreak: boolean;
  isIdle: boolean;
  autoBreak: boolean;
}

interface SummaryPayload {
  sessionId: string;
  userId: string;
  timestamp: string;
  sessionDurationMs: number;
  workTimeMs: number;
  breakTimeMs: number;
  idleTimeMs: number;
  currentState: CurrentState;
  appUsage: {
    totalApps: number;
    totalTrackedTimeMs: number;
    topApps: AppUsageItem[];
  };
  websiteUsage?: {
    totalWebsites: number;
    topWebsites: WebsiteUsageItem[];
    totalBrowsingTime: number;
    browserBreakdown?: Array<{ browser: string; timeMs: number }>;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const auth = requireAuth(request);
    if (!auth || "error" in auth || !auth.user) {
      logger.warn("POST /api/session/summary - Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SummaryPayload = await request.json();
    
    const {
      sessionId,
      userId,
      timestamp,
      sessionDurationMs,
      workTimeMs,
      breakTimeMs,
      idleTimeMs,
      currentState,
      appUsage,
      websiteUsage,
    } = body;

    // Validate required fields
    if (!sessionId) {
      logger.warn("POST /api/session/summary - Missing sessionId");
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    logger.info("POST /api/session/summary - Received summary", { 
      sessionId, 
      userId,
      workTimeMs,
      currentState,
      hasWebsiteData: !!websiteUsage,
    });

    // Store current state in memory for real-time access (floor map, dashboard)
    sessionStateStore.set(sessionId, {
      sessionId,
      userId,
      timestamp,
      sessionDurationMs,
      workTimeMs,
      breakTimeMs,
      idleTimeMs,
      currentState,
      appUsage,
      websiteUsage,
      lastUpdated: Date.now(),
    });

    // Also store by userId for quick lookup
    if (userId) {
      sessionStateStore.set(`user:${userId}`, {
        sessionId,
        userId,
        timestamp,
        sessionDurationMs,
        workTimeMs,
        breakTimeMs,
        idleTimeMs,
        currentState,
        appUsage,
        websiteUsage,
        lastUpdated: Date.now(),
      });
    }

    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { sessionId },
    });

    if (!session) {
      logger.warn("POST /api/session/summary - Session not found", { sessionId });
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Upsert session summary in database
    await prisma.sessionSummary.upsert({
      where: { sessionId },
      update: {
        sessionDurationMs: BigInt(sessionDurationMs || 0),
        workTimeMs: BigInt(workTimeMs || 0),
        totalBreakMs: BigInt(breakTimeMs || 0),
        totalIdleMs: BigInt(idleTimeMs || 0),
      },
      create: {
        sessionId,
        userId: userId || session.userId,
        sessionDurationMs: BigInt(sessionDurationMs || 0),
        workTimeMs: BigInt(workTimeMs || 0),
        totalBreakMs: BigInt(breakTimeMs || 0),
        totalIdleMs: BigInt(idleTimeMs || 0),
      },
    });

    // Update app usage if provided
    if (appUsage?.topApps && appUsage.topApps.length > 0) {
      // Delete existing app usage for this session and re-insert
      await prisma.sessionAppUsage.deleteMany({
        where: { sessionId },
      });

      // Insert new app usage data
      await prisma.sessionAppUsage.createMany({
        data: appUsage.topApps.map((app: AppUsageItem) => ({
          sessionId,
          userId: userId || session.userId,
          appName: app.app,
          timeMs: BigInt(app.timeMs),
        })),
      });
    }

    // Update website usage if provided
    if (websiteUsage?.topWebsites && websiteUsage.topWebsites.length > 0) {
      try {
        logger.info("POST /api/session/summary - Storing website usage", {
          sessionId,
          websiteCount: websiteUsage.topWebsites.length,
        });

        // Delete existing website usage for this session and re-insert
        await prisma.sessionWebsiteUsage.deleteMany({
          where: { sessionId },
        });

        // Insert new website usage data
        await prisma.sessionWebsiteUsage.createMany({
          data: websiteUsage.topWebsites.map((site: WebsiteUsageItem) => ({
            sessionId,
            userId: userId || session.userId,
            website: site.website,
            browser: site.browser || null,
            timeMs: BigInt(site.timeMs),
          })),
        });

        logger.info("POST /api/session/summary - Website usage stored successfully");
      } catch (error) {
        logger.error("POST /api/session/summary - Failed to store website usage", error as Error);
      }
    }

    const durationMs = Date.now() - startTime;
    logger.response("POST", "/api/session/summary", 200, durationMs);

    return NextResponse.json({
      success: true,
      sessionId,
      message: "Summary updated successfully",
    });

  } catch (error) {
    const err = error as Error;
    const durationMs = Date.now() - startTime;
    logger.error("POST /api/session/summary - Failed", err, { durationMs });
    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/session/summary
 * 
 * Get real-time session state for a user or session.
 * Query params: userId or sessionId
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const auth = requireAuth(request);
    if (!auth || "error" in auth || !auth.user) {
      logger.warn("GET /api/session/summary - Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    const userId = url.searchParams.get("userId");

    if (sessionId) {
      const state = sessionStateStore.get(sessionId);
      if (state) {
        return NextResponse.json({ success: true, summary: state, source: "realtime" });
      }
      
      // Fallback to database
      const dbSummary = await prisma.sessionSummary.findUnique({
        where: { sessionId },
        include: {
          session: {
            include: {
              appUsage: true,
            },
          },
        },
      });

      if (dbSummary) {
        return NextResponse.json({
          success: true,
          summary: {
            sessionId: dbSummary.sessionId,
            userId: dbSummary.userId,
            sessionDurationMs: Number(dbSummary.sessionDurationMs),
            workTimeMs: Number(dbSummary.workTimeMs),
            breakTimeMs: Number(dbSummary.totalBreakMs),
            idleTimeMs: Number(dbSummary.totalIdleMs),
            appUsage: {
              totalApps: dbSummary.session?.appUsage?.length || 0,
              topApps: dbSummary.session?.appUsage?.map(a => ({
                app: a.appName,
                timeMs: Number(a.timeMs),
              })) || [],
            },
          },
          source: "database",
        });
      }

      return NextResponse.json({ success: false, error: "Summary not found" }, { status: 404 });
    }

    if (userId) {
      const state = sessionStateStore.get(`user:${userId}`);
      if (state) {
        return NextResponse.json({ success: true, summary: state, source: "realtime" });
      }

      // Fallback to latest session from database
      const latestSession = await prisma.session.findFirst({
        where: { userId, endedAt: null },
        orderBy: { startedAt: "desc" },
        include: {
          summary: true,
          appUsage: true,
        },
      });

      if (latestSession?.summary) {
        return NextResponse.json({
          success: true,
          summary: {
            sessionId: latestSession.sessionId,
            userId: latestSession.userId,
            sessionDurationMs: Number(latestSession.summary.sessionDurationMs),
            workTimeMs: Number(latestSession.summary.workTimeMs),
            breakTimeMs: Number(latestSession.summary.totalBreakMs),
            idleTimeMs: Number(latestSession.summary.totalIdleMs),
            appUsage: {
              totalApps: latestSession.appUsage?.length || 0,
              topApps: latestSession.appUsage?.map(a => ({
                app: a.appName,
                timeMs: Number(a.timeMs),
              })) || [],
            },
          },
          source: "database",
        });
      }

      return NextResponse.json({ success: false, error: "No active session" }, { status: 404 });
    }

    // Return all active session states
    const allStates = Array.from(sessionStateStore.entries())
      .filter(([key]) => !key.startsWith("user:"))
      .map(([, value]) => value);

    const durationMs = Date.now() - startTime;
    logger.response("GET", "/api/session/summary", 200, durationMs);

    return NextResponse.json({
      success: true,
      sessions: allStates,
      count: allStates.length,
    });

  } catch (error) {
    const err = error as Error;
    const durationMs = Date.now() - startTime;
    logger.error("GET /api/session/summary - Failed", err, { durationMs });
    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      { status: 500 }
    );
  }
}