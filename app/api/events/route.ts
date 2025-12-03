import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAuth } from "../../../lib/requireAuth";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth || "error" in auth || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  console.log(body);
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

  return NextResponse.json({ success: true });
}