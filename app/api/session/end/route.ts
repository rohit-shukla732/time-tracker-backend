import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth } from "../../../../lib/roleAuth";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error || !auth.user) {
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

  return NextResponse.json({ success: true });
}
