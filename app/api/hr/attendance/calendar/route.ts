import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { ensureWeekendRecords } from "@/lib/attendanceUtils";

// GET /api/hr/attendance/calendar - Attendance records for HR
// Modes:
//  - ?year=2026&month=8           -> all active users for the month
//  - ?date=2026-08-10             -> all active users for a single day
//  - ?userId=X&year=2026&month=8  -> one employee for the month
export async function GET(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const userId = searchParams.get("userId") || "";
    const dateParam = searchParams.get("date") || "";
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()));
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));

    let dateRange: { start: Date; end: Date };

    if (dateParam) {
      const [y, m, d] = dateParam.split("-").map(Number);
      const day = new Date(Date.UTC(y, m - 1, d));
      dateRange = { start: day, end: new Date(day.getTime() + 86_400_000 - 1) };
    } else {
      dateRange = {
        start: new Date(Date.UTC(year, month - 1, 1)),
        end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
      };
    }

    // Lazily fill weekend records for the displayed period.
    const dates: Date[] = [];
    for (let d = dateRange.start; d <= dateRange.end; d = new Date(d.getTime() + 86_400_000)) {
      dates.push(d);
    }
    await ensureWeekendRecords(dates);

    // Archived employees still appear for the months/days they have records
    // (e.g. someone who left mid-month), so their data is never hidden.
    const where: any = {
      date: { gte: dateRange.start, lte: dateRange.end },
    };
    if (userId) where.userId = userId;

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true, isArchived: true } },
        type: { select: { id: true, name: true, code: true, category: true, color: true, isPaid: true } },
      },
      orderBy: [{ user: { name: "asc" } }, { date: "asc" }],
    });

    const entries = records.map((r) => ({
      id: r.id,
      userId: r.user.id,
      userName: r.user.name,
      userEmail: r.user.email,
      userRole: r.user.role,
      userArchived: r.user.isArchived,
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
      firstIn: null as string | null,
      lastOut: null as string | null,
    }));

    // Single-day queries also include biometric punch times per employee.
    if (dateParam) {
      const punches = await prisma.biometricPunch.findMany({
        where: { date: { gte: dateRange.start, lte: dateRange.end } },
        select: { userId: true, firstIn: true, lastOut: true },
      });
      const punchByUser = new Map(punches.map((p) => [p.userId, p]));
      for (const e of entries) {
        const punch = punchByUser.get(e.userId);
        e.firstIn = punch?.firstIn ? punch.firstIn.toISOString() : null;
        e.lastOut = punch?.lastOut ? punch.lastOut.toISOString() : null;
      }
    }

    return NextResponse.json({ success: true, entries });
  } catch (error) {
    console.error("Error fetching attendance calendar:", error);
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}
