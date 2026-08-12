import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { buildLeaveCalendarEvent, getLeaveAttendanceTypeNameMap } from "@/lib/attendanceUtils";

// GET /api/leaves/calendar?year=2026&month=8 - My leave events for a month
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

    const requests = await prisma.leaveRequest.findMany({
      where: {
        userId: authResult.user.id,
        status: { in: ["PENDING", "APPROVED", "REJECTED"] },
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      include: {
        leaveType: { select: { id: true, name: true, isPaid: true } },
      },
      orderBy: { startDate: "asc" },
    });

    const typeNameMap = await getLeaveAttendanceTypeNameMap();
    const events = requests.map((r) => buildLeaveCalendarEvent(r, typeNameMap));

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error("Error fetching leave calendar:", error);
    return NextResponse.json({ error: "Failed to fetch leave calendar" }, { status: 500 });
  }
}
