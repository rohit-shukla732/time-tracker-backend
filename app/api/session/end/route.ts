import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth } from "../../../../lib/roleAuth";
import { logger } from "../../../../lib/logger";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const auth = await requireAuth(req);
    if (auth.error || !auth.user) {
      logger.warn("POST /api/session/end - Unauthorized");
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
    }

    const {
    sessionId,
    timestamp,
    auto,
    reason,
    rawEvent,
    sessionLength,
    totalBreakMs,
    totalIdleMs,
    totalWorkMs,
    appUsage
  } = await req.json();

  logger.info("POST /api/session/end - Ending session", { 
    userId: auth.user.id, 
    sessionId, 
    auto, 
    sessionLength,
    totalWorkMs 
  });

  const endedAt = new Date(timestamp);

  // 1. Update session record
  await prisma.session.update({
    where: { sessionId },
    data: {
      endedAt,
      autoClockOut: auto || false,
      autoReason: reason || null,
      rawEndEvent: rawEvent,
    },
  });

  // 2. Insert session summary
  await prisma.sessionSummary.create({
    data: {
      sessionId,
      userId: auth.user.id,
      sessionDurationMs: sessionLength ? BigInt(sessionLength) : BigInt(0),
      totalBreakMs: BigInt(totalBreakMs || 0),
      totalIdleMs: BigInt(totalIdleMs || 0),
      workTimeMs: totalWorkMs ? BigInt(totalWorkMs) : BigInt(0),
    },
  });

  // 3. Insert app usage (loop)
  if (appUsage?.topApps?.length) {
    const rows = appUsage.topApps.map((app: any) => ({
      sessionId,
      userId: auth.user?.id,
      appName: app.app,
      timeMs: BigInt(app.timeMs || 0),
    }));

    await prisma.sessionAppUsage.createMany({ data: rows });
  }

    logger.info("POST /api/session/end - Session ended", { sessionId, userId: auth.user.id });
    logger.response("POST", "/api/session/end", 200, Date.now() - startTime);
    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error & { code?: string };
    logger.error("POST /api/session/end - Failed", error);
    return NextResponse.json({ error: "Server error", message: error.message }, { status: 500 });
  }
}
