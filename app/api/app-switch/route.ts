import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAuth } from "../../../lib/requireAuth";
import { logger } from "../../../lib/logger";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth || "error" in auth || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = auth.user as { id: string };

  const body = await req.json();
  const {
    userId,
    sessionId,
    fromApp,
    toApp,
    durationMs,
    timestamp,
    epochMs,
    rawEvent
  } = body;

  logger.info("POST /api/app-switch - Received app switch event", { userId, sessionId, fromApp, toApp });
  await prisma.appSwitchEvent.create({
    data: {
      sessionId,
      userId: userId,
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