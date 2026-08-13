import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { buildLeaveCalendarEvent, ensureWeekendRecords, getLeaveAttendanceTypeNameMap } from "@/lib/attendanceUtils";

// GET /api/leaves/team-calendar?year=2026&month=8 - Combined team calendar
// - MANAGER/SENIOR_MANAGER: their reports (+ themselves)
// - HR/ADMIN: everyone
// Returns leave requests AND attendance records for the month so the manager
// sees their team's full picture on one calendar.
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const isHr = authResult.user.role === "HR" || authResult.user.role === "ADMIN";
  const isManager =
    authResult.user.role === "MANAGER" || authResult.user.role === "SENIOR_MANAGER";
  if (!isHr && !isManager) {
    return unauthorizedResponse("Access denied. Manager or HR privileges required.");
  }

  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()));
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Scope of users: managers see reports + themselves; HR/ADMIN see everyone.
    const userScope: any = { isArchived: false };
    if (!isHr) {
      userScope.OR = [{ managerId: authResult.user.id }, { id: authResult.user.id }];
    }
    const userIds = (
      await prisma.user.findMany({
        where: userScope,
        select: { id: true },
      })
    ).map((u) => u.id);

    // Lazily fill weekend records for the displayed period (only needed for
    // the HR/ADMIN all-company view, harmless for teams).
    const dates: Date[] = [];
    for (let d = monthStart; d <= monthEnd; d = new Date(d.getTime() + 86_400_000)) {
      dates.push(d);
    }
    await ensureWeekendRecords(dates);

    const [requests, records, typeNameMap] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: {
          status: { in: ["PENDING", "APPROVED", "REJECTED"] },
          startDate: { lte: monthEnd },
          endDate: { gte: monthStart },
          userId: { in: userIds },
        },
        include: {
          user: { select: { id: true, name: true, role: true } },
          leaveType: { select: { id: true, name: true, isPaid: true } },
        },
        orderBy: { startDate: "asc" },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          date: { gte: monthStart, lte: monthEnd },
          userId: { in: userIds },
          type: { category: { not: "WEEKEND" } },
        },
        include: {
          user: { select: { id: true, name: true, role: true } },
          type: { select: { id: true, name: true, category: true, color: true } },
        },
        orderBy: [{ user: { name: "asc" } }, { date: "asc" }],
      }),
      getLeaveAttendanceTypeNameMap(),
    ]);

    const events = requests.map((r) => ({
      userId: r.user.id,
      userName: r.user.name,
      userRole: r.user.role,
      ...buildLeaveCalendarEvent(r, typeNameMap),
    }));

    const attendance = records.map((r) => ({
      id: r.id,
      userId: r.user.id,
      userName: r.user.name,
      userRole: r.user.role,
      startDate: r.date.toISOString(),
      endDate: r.date.toISOString(),
      status: "ATTENDANCE",
      typeName: r.type.name,
      attendanceTypeName: r.type.name,
      color: r.type.color,
      isHalfDay: false,
      halfDaySession: null,
      durationDays: 1,
      reason: null,
    }));

    const counts = {
      approved: events.filter((e) => e.status === "APPROVED").length,
      pending: events.filter((e) => e.status === "PENDING").length,
      rejected: events.filter((e) => e.status === "REJECTED").length,
      attendance: attendance.length,
      total: events.length + attendance.length,
    };

    return NextResponse.json({ success: true, events, attendance, counts });
  } catch (error) {
    console.error("Error fetching team calendar:", error);
    return NextResponse.json({ error: "Failed to fetch team calendar" }, { status: 500 });
  }
}