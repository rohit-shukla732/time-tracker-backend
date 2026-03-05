import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAuth } from "../../../lib/requireAuth";
import { logger } from "../../../lib/logger";
import { rateLimit } from "../../../lib/rateLimit";
import { withQueue } from "../../../lib/requestQueue";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // Rate limit: 10 req/min per IP per route
  const rl = rateLimit(req);
  if (rl) return rl;

  return withQueue(async () => {
  try {
    const auth = requireAuth(req);

    // Get client IP for diagnostics
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (!auth.user) {
      const decodedUserId = auth.decoded?.userId || auth.decoded?.id || auth.decoded?.sub || null;

      // --- Expired-token fallback ---
      // If the token was merely expired (not forged/missing), decode the userId
      // and verify the user still exists in the DB. If so, accept the event —
      // this is the offline-queue scenario where legitimate data arrives with a
      // stale access token.
      if (auth.expired && decodedUserId) {
        const userExists = await prisma.user.findUnique({
          where: { id: String(decodedUserId) },
          select: { id: true },
        });

        if (userExists) {
          // Fall through to event recording below with the decoded userId
          return await recordEvent(req, String(decodedUserId), startTime, true);
        }
      }

      // Log enough context to identify the offending client
      logger.warn("POST /api/events - Unauthorized request", {
        reason: auth.error,
        ip,
        decodedUserId,
      });
      return NextResponse.json(
        { error: "Unauthorized", code: auth.expired ? "TOKEN_EXPIRED" : "AUTH_FAILED" },
        { status: 401 }
      );
    }

    const claimedUserId =
      (auth.user as any).userId ||
      (auth.user as any).id ||
      (auth.user as any).sub;

    return await recordEvent(req, String(claimedUserId), startTime, false);

  } catch (error) {
    const err = error as Error & { code?: string };
    const durationMs = Date.now() - startTime;
    logger.error("POST /api/events - Failed", err, { durationMs });
    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      { status: 500 }
    );
  }
  }); // end withQueue
}

async function recordEvent(
  req: NextRequest,
  resolvedUserId: string,
  startTime: number,
  fromExpiredToken: boolean
) {
  const body = await req.json();
  const {
    userId,
    sessionId,
    type,
    timestamp,
    epochMs,
    duration,
    reason,
    networkStatus,
  } = body;

  // Use the verified userId (from valid or expired-but-DB-confirmed token),
  // falling back to the body's userId only as a last resort.
  const effectiveUserId = resolvedUserId || userId;

  logger.info("POST /api/events - Received event", {
    userId: effectiveUserId,
    sessionId,
    type,
    ...(fromExpiredToken ? { expiredTokenFallback: true } : {}),
  });

  // Verify session exists
  const session = await prisma.session.findUnique({ where: { sessionId } });
  if (!session) {
    logger.info(`Session: ${sessionId} not found`, {
      userId: effectiveUserId,
      timestamp,
    });
    console.log(`Session: ${sessionId} not found.`);
  }

  await prisma.event.create({
    data: {
      sessionId,
      userId: effectiveUserId,
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
}