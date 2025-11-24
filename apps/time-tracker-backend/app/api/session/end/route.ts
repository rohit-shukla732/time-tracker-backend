import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth } from "../../../../lib/requireAuth";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth || "error" in auth || !auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = auth.user as { id: string };

  const {
    sessionId,
    timestamp,
    auto,
    reason,
    rawEvent,
    sessionDuration,
    totalBreakMs,
    totalIdleMs,
    workTimeMs,
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
      userId: user.id,
      sessionDurationMs: sessionDuration ? BigInt(sessionDuration) : BigInt(0),
      totalBreakMs: BigInt(totalBreakMs || 0),
      totalIdleMs: BigInt(totalIdleMs || 0),
      workTimeMs: workTimeMs ? BigInt(workTimeMs) : BigInt(0),
    },
  });

  // 3. Insert app usage (loop)
  if (appUsage?.topApps?.length) {
    const rows = appUsage.topApps.map((app: any) => ({
      sessionId,
      userId: user.id,
      appName: app.app,
      timeMs: BigInt(app.timeMs || 0),
    }));

    await prisma.sessionAppUsage.createMany({ data: rows });
  }

  return NextResponse.json({ success: true });
}
