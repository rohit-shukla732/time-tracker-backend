import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { ensureWeekendRecords } from "@/lib/attendanceUtils";

// GET /api/attendance/my?year=2026&month=8 - My attendance records for a month
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()));
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Lazily create weekend records for this month (skips existing).
    const daysInMonth: Date[] = [];
    for (let d = monthStart; d <= monthEnd; d = new Date(d.getTime() + 86_400_000)) {
      daysInMonth.push(d);
    }
    await ensureWeekendRecords(daysInMonth);

    const [records, punches] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: {
          userId: authResult.user.id,
          date: { gte: monthStart, lte: monthEnd },
        },
        include: {
          type: { select: { id: true, name: true, code: true, category: true, color: true, isPaid: true } },
        },
        orderBy: { date: "asc" },
      }),
      prisma.biometricPunch.findMany({
        where: {
          userId: authResult.user.id,
          date: { gte: monthStart, lte: monthEnd },
        },
        select: { date: true, firstIn: true, lastOut: true },
      }),
    ]);

    const punchByDate = new Map(
      punches.map((p) => [p.date.toISOString().slice(0, 10), p])
    );

    const entries = records.map((r) => {
      const punch = punchByDate.get(r.date.toISOString().slice(0, 10));
      return {
        id: r.id,
        date: r.date.toISOString(),
        typeId: r.type.id,
        typeName: r.type.name,
        typeCode: r.type.code,
        category: r.type.category,
        color: r.type.color,
        isPaid: r.type.isPaid,
        isOverride: r.isOverride,
        source: r.source,
        note: r.note,
        firstIn: punch?.firstIn ? punch.firstIn.toISOString() : null,
        lastOut: punch?.lastOut ? punch.lastOut.toISOString() : null,
      };
    });

    // Summary counts
    const summary: Record<string, number> = {};
    for (const e of entries) {
      summary[e.typeCode] = (summary[e.typeCode] || 0) + 1;
    }
    const workingDays = records.filter((r) => r.type.isPaid && r.type.category === "PRESENT").length;

    return NextResponse.json({
      success: true,
      year,
      month,
      entries,
      summary,
      workingDays,
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}
