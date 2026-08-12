import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { buildLeaveCalendarEvent, getLeaveAttendanceTypeNameMap } from "@/lib/attendanceUtils";

// GET /api/hr/leaves/calendar?year=2026&month=8 - Team leave calendar (HR/ADMIN)
export async function GET(req: NextRequest) {
  const authResult = await requireHR(req);
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
        status: { in: ["PENDING", "APPROVED", "REJECTED"] },
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
        user: { isArchived: false },
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
        leaveType: { select: { id: true, name: true, isPaid: true } },
      },
      orderBy: { startDate: "asc" },
    });

    const typeNameMap = await getLeaveAttendanceTypeNameMap();

    const events = requests.map((r) => ({
      userId: r.user.id,
      userName: r.user.name,
      userRole: r.user.role,
      ...buildLeaveCalendarEvent(r, typeNameMap),
    }));

    const counts = {
      approved: events.filter((e) => e.status === "APPROVED").length,
      pending: events.filter((e) => e.status === "PENDING").length,
      rejected: events.filter((e) => e.status === "REJECTED").length,
      total: events.length,
    };

    return NextResponse.json({ success: true, events, counts });
  } catch (error) {
    console.error("Error fetching team leave calendar:", error);
    return NextResponse.json({ error: "Failed to fetch team leave calendar" }, { status: 500 });
  }
}
