import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

// POST /api/hr/attendance/mark - Mark/update one employee's attendance for a day
// Body: { userId, date: "YYYY-MM-DD", typeId, note? }
// Sets isOverride = true so leave auto-sync never overwrites it.
export async function POST(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const body = await req.json();
    const { userId, date, typeId, note } = body;

    if (!userId || !date || !typeId) {
      return NextResponse.json(
        { error: "userId, date and typeId are required" },
        { status: 400 }
      );
    }

    const [y, m, d] = String(date).split("-").map(Number);
    const day = new Date(Date.UTC(y, m - 1, d));
    if (isNaN(day.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const [user, type] = await Promise.all([
      prisma.user.findUnique({ where: { id: String(userId) }, select: { id: true } }),
      prisma.attendanceType.findUnique({ where: { id: String(typeId) } }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    if (!type) {
      return NextResponse.json({ error: "Attendance type not found" }, { status: 404 });
    }

    const record = await prisma.attendanceRecord.upsert({
      where: { userId_date: { userId: user.id, date: day } },
      update: {
        typeId: type.id,
        isOverride: true,
        markedById: authResult.user.id,
        source: "MANUAL",
        note: note ? String(note).trim() : null,
      },
      create: {
        userId: user.id,
        date: day,
        typeId: type.id,
        isOverride: true,
        markedById: authResult.user.id,
        source: "MANUAL",
        note: note ? String(note).trim() : null,
      },
      include: {
        type: { select: { id: true, name: true, code: true, color: true } },
      },
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Error marking attendance:", error);
    return NextResponse.json({ error: "Failed to mark attendance" }, { status: 500 });
  }
}
