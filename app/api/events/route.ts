import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAuth } from "../../../lib/requireAuth";
import { logger } from "../../../lib/logger";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const auth = requireAuth(req);
    if (!auth || "error" in auth || !auth.user) {
      logger.warn("POST /api/events - Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      userId,
      sessionId,
      type,
      timestamp,
      epochMs,
      duration,
      reason,
      networkStatus
    } = body;

    logger.info("POST /api/events - Received event", { userId, sessionId, type });

    // verify session if it doesn't exist
    const session = await prisma.session.findUnique({
      where: { sessionId },
    });

    if (!session) {
      logger.info(`Session: ${sessionId} not found`, { userId, timestamp });
      console.log(`Session: ${sessionId} not found.`);
    }

    await prisma.event.create({
      data: {
        sessionId,
        userId: userId,
        type,
        reason: reason || null,
        durationMs: duration ? BigInt(duration) : null,
        timestamp: new Date(timestamp),
        epochMs: epochMs ? BigInt(epochMs) : BigInt(Date.now()),
        payload: networkStatus || {},
      },
    });

    const durationMs = Date.now() - startTime;
    logger.response("POST", "/api/events", 200, durationMs);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    const err = error as Error & { code?: string };
    const durationMs = Date.now() - startTime;
    logger.error("POST /api/events - Failed", err, { durationMs });
    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      { status: 500 }
    );
  }
}