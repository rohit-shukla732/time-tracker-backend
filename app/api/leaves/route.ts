import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { computeTypeBalance, dateFromInput, normalizeLeaveDays, type LeaveTypeInfo } from "@/lib/leaveUtils";
import { syncLeaveAttendance } from "@/lib/attendanceUtils";

const requestInclude = {
  user: { select: { id: true, name: true, email: true, role: true } },
  leaveType: { select: { id: true, name: true, isPaid: true } },
  approver: { select: { id: true, name: true } },
  edits: {
    include: { editedBy: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

// GET /api/leaves - My leave requests (optional ?year=)
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const requests = await prisma.leaveRequest.findMany({
      where: {
        userId: authResult.user.id,
        startDate: { lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)) },
        endDate: { gte: new Date(Date.UTC(year, 0, 1)) },
      },
      include: requestInclude,
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    return NextResponse.json({ error: "Failed to fetch leave requests" }, { status: 500 });
  }
}

// POST /api/leaves - Apply for leave
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const body = await req.json();
    const { leaveTypeId, startDate, endDate, reason } = body;

    if (!leaveTypeId || !startDate || !endDate || !reason?.trim()) {
      return NextResponse.json({ error: "Leave type, dates and reason are required" }, { status: 400 });
    }

    const type = await prisma.leaveType.findFirst({
      where: { id: leaveTypeId, active: true },
    });
    if (!type) {
      return NextResponse.json({ error: "Leave type not found or inactive" }, { status: 400 });
    }

    const start = dateFromInput(String(startDate));
    const end = dateFromInput(String(endDate));
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    if (start < today) {
      return NextResponse.json({ error: "Cannot apply for a date in the past" }, { status: 400 });
    }

    let normalized: ReturnType<typeof normalizeLeaveDays>;
    try {
      normalized = normalizeLeaveDays({ start, end, body });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid leave selection" }, { status: 400 });
    }
    const {
      halfDayDays,
      skippedDays,
      withoutPayDays,
      selectedDays,
      durationDays,
      isHalfDay,
      halfDaySession,
      paidDays,
      isWithoutPay,
    } = normalized;

    // Overlap check against existing PENDING/APPROVED requests, day by day,
    // so skipped days inside the range don't block the request.
    const overlapping = await prisma.leaveRequest.findMany({
      where: {
        userId: authResult.user.id,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { startDate: true, endDate: true },
    });
    if (overlapping.length > 0) {
      const blocked = selectedDays.some((key) =>
        overlapping.some((o) => {
          const day = dateFromInput(key);
          return day >= o.startDate && day <= o.endDate;
        })
      );
      if (blocked) {
        return NextResponse.json(
          { error: "You already have a pending or approved leave overlapping these dates" },
          { status: 409 }
        );
      }
    }

    // Balance check: paid days must fit within the held balance (available -
    // pending). Days beyond the limit must be marked "without pay" per day.
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
      select: { createdAt: true },
    });
    const year = start.getUTCFullYear();
    const balance = await computeTypeBalance(
      authResult.user.id,
      user?.createdAt || new Date(),
      type as LeaveTypeInfo,
      year
    );
    const totalHeld = balance.available - balance.pending;

    if (paidDays > totalHeld) {
      return NextResponse.json(
        {
          error: `You only have ${Math.max(totalHeld, 0)} day(s) of ${type.name} available for paid leave — mark some days "Without pay" or reduce the days.`,
        },
        { status: 400 }
      );
    }

    const request = await prisma.leaveRequest.create({
      data: {
        userId: authResult.user.id,
        leaveTypeId: type.id,
        startDate: start,
        endDate: end,
        isHalfDay,
        halfDaySession: isHalfDay ? halfDaySession : null,
        halfDayDays,
        skippedDays,
        withoutPayDays: withoutPayDays.length > 0 ? withoutPayDays : undefined,
        durationDays,
        reason: reason.trim(),
        isWithoutPay,
      },
      include: requestInclude,
    });

    // Reflect the pending leave on the attendance calendar (unapproved type).
    await syncLeaveAttendance(request);

    return NextResponse.json(
      { success: true, request, isWithoutPay, paidDays },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error applying for leave:", error);
    return NextResponse.json({ error: "Failed to apply for leave" }, { status: 500 });
  }
}
