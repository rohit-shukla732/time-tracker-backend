import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAuth } from "../../../lib/requireAuth";
import { logger } from "../../../lib/logger";
import { rateLimit } from "../../../lib/rateLimit";
import { withQueue } from "../../../lib/requestQueue";

export async function POST(req: NextRequest) {
  // Rate limit: 10 req/min per IP per route
  const rl = rateLimit(req);
  if (rl) return rl;

  return withQueue(async () => {
  const auth = requireAuth(req);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (!auth.user) {
    const decodedUserId =
      auth.decoded?.userId || auth.decoded?.id || auth.decoded?.sub || null;

    // Expired-token fallback: accept the DB write if user still exists
    if (auth.expired && decodedUserId) {
      const userExists = await prisma.user.findUnique({
        where: { id: String(decodedUserId) },
        select: { id: true },
      });
      if (userExists) {
        return await recordAppSwitch(req, String(decodedUserId), true);
      }
    }

    logger.warn("POST /api/app-switch - Unauthorized", {
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
    (auth.user as any).userId || (auth.user as any).id || (auth.user as any).sub;
  return await recordAppSwitch(req, String(claimedUserId), false);
  }); // end withQueue
}

async function recordAppSwitch(req: NextRequest, resolvedUserId: string, fromExpiredToken: boolean) {
  const body = await req.json();
  const {
    userId,
    sessionId,
    fromApp,
    toApp,
    durationMs,
    timestamp,
    epochMs,
    rawEvent,
  } = body;

  const effectiveUserId = resolvedUserId || userId;

  logger.info("POST /api/app-switch - Received app switch event", {
    userId: effectiveUserId,
    sessionId,
    fromApp,
    toApp,
    ...(fromExpiredToken ? { expiredTokenFallback: true } : {}),
  });

  await prisma.appSwitchEvent.create({
    data: {
      sessionId,
      userId: effectiveUserId,
      fromApp: fromApp || null,
      toApp: toApp || null,
      durationMs: durationMs ? BigInt(durationMs) : null,
      timestamp: new Date(timestamp),
      epochMs: epochMs ? BigInt(epochMs) : BigInt(Date.now()),
      payload: rawEvent || {},
    },
  });

  return NextResponse.json({ success: true });
}