import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

// POST /api/hr/attendance/bulk - Apply an attendance type to employees for a date
// Body: { date: "YYYY-MM-DD", typeId, userIds?: string[], overwrite?: boolean, note?: string }
// - userIds omitted -> ALL active employees
// - overwrite=false (default) -> only CREATE records for days that have none
//   (existing records, leave-derived or overridden, are preserved) — "fill all"
// - overwrite=true -> upsert every target user: existing records are REPLACED
//   and marked as manual overrides, missing ones are created.
export async function POST(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const body = await req.json();
    const { date, typeId, userIds, overwrite, note } = body;

    if (!date || !typeId) {
      return NextResponse.json({ error: "date and typeId are required" }, { status: 400 });
    }

    const [y, m, d] = String(date).split("-").map(Number);
    const day = new Date(Date.UTC(y, m - 1, d));
    if (isNaN(day.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const type = await prisma.attendanceType.findUnique({ where: { id: String(typeId) } });
    if (!type) {
      return NextResponse.json({ error: "Attendance type not found" }, { status: 404 });
    }

    let users: { id: string }[];
    if (Array.isArray(userIds) && userIds.length > 0) {
      users = await prisma.user.findMany({
        where: { id: { in: userIds.map(String) }, isArchived: false },
        select: { id: true },
      });
    } else {
      users = await prisma.user.findMany({
        where: { isArchived: false },
        select: { id: true },
      });
    }

    if (users.length === 0) {
      return NextResponse.json({ success: true, created: 0, updated: 0, skipped: 0 });
    }

    const doOverwrite = overwrite === true;
    const cleanNote = note ? String(note).trim() : null;

    const existing = await prisma.attendanceRecord.findMany({
      where: { date: day, userId: { in: users.map((u) => u.id) } },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((r) => r.userId));

    let updated = 0;
    if (doOverwrite && existing.length > 0) {
      const result = await prisma.attendanceRecord.updateMany({
        where: { date: day, userId: { in: users.map((u) => u.id) } },
        data: {
          typeId: type.id,
          isOverride: true,
          markedById: authResult.user?.id,
          source: "MANUAL",
          note: cleanNote,
        },
      });
      updated = result.count;
    }

    const toCreate = users
      .filter((u) => !existingIds.has(u.id))
      .map((u) => ({
        userId: u.id,
        date: day,
        typeId: type.id,
        isOverride: doOverwrite,
        markedById: authResult.user?.id,
        source: "MANUAL",
        note: cleanNote,
      }));

    let created = 0;
    if (toCreate.length > 0) {
      const result = await prisma.attendanceRecord.createMany({ data: toCreate, skipDuplicates: true });
      created = result.count;
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped: users.length - created - updated,
    });
  } catch (error) {
    console.error("Error bulk marking attendance:", error);
    return NextResponse.json({ error: "Failed to mark attendance" }, { status: 500 });
  }
}
