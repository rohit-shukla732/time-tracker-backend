import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAuth } from "../../../lib/requireAuth";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth || "error" in auth || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = auth.user as { id: string };

  const body = await req.json();
  const {
    sessionId,
    from,
    to,
    duration,
    timestamp,
    epochMs,
    rawEvent
  } = body;

  await prisma.appSwitchEvent.create({
    data: {
      sessionId,
      userId: user.id,
      fromApp: from || null,
      toApp: to || null,
      durationMs: duration ? BigInt(duration) : null,
      timestamp: new Date(timestamp),
      epochMs: epochMs ? BigInt(epochMs) : BigInt(Date.now()),
      payload: rawEvent || {},
    },
  });

  return NextResponse.json({ success: true });
}