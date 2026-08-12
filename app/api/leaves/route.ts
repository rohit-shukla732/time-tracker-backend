import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { computeTypeBalance, dateFromInput, type LeaveTypeInfo } from "@/lib/leaveUtils";
import { syncLeaveAttendance } from "@/lib/attendanceUtils";

const DAY_MS = 86_400_000;

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function eachUtcDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    days.push(new Date(t));
  }
  return days;
}

const requestInclude = {
  user: { select: { id: true, name: true, email: true, role: true } },
  leaveType: { select: { id: true, name: true, isPaid: true } },
  approver: { select: { id: true, name: true } },
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
    // Explicit choice from the apply page: undefined -> auto (current behaviour).
    const explicitWithoutPay = body.isWithoutPay === true || body.isWithoutPay === false
      ? body.isWithoutPay
      : undefined;

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

    // Per-day selection: halfDayDays maps a day to a session, skippedDays
    // removes days from the range. Supports mixed full/half day requests.
    const halfDayDays: Record<string, string> = {};
    if (body.halfDayDays && typeof body.halfDayDays === "object") {
      for (const [day, session] of Object.entries(body.halfDayDays)) {
        if (session === "FIRST_HALF" || session === "SECOND_HALF") {
          halfDayDays[String(day)] = session;
        }
      }
    }
    // Legacy single-day half-day payload support.
    if (body.isHalfDay && start.getTime() === end.getTime()) {
      halfDayDays[utcDayKey(start)] = body.halfDaySession === "SECOND_HALF" ? "SECOND_HALF" : "FIRST_HALF";
    }

    const skippedRaw: string[] = Array.isArray(body.skippedDays)
      ? (body.skippedDays as unknown[]).map((s) => String(s))
      : [];
    const skippedDays: string[] = [...new Set(skippedRaw)];

    // Per-day without-pay selection. Days not listed use the balance.
    // Legacy whole-request isWithoutPay=true means every selected day is unpaid.
    const withoutPayRaw: string[] = Array.isArray(body.withoutPayDays)
      ? (body.withoutPayDays as unknown[]).map((s) => String(s))
      : [];
    const withoutPayDays: string[] = [...new Set(withoutPayRaw)];

    const allDays = eachUtcDay(start, end);
    const selectedDays = allDays.filter((d) => !skippedDays.includes(utcDayKey(d)));
    if (selectedDays.length === 0) {
      return NextResponse.json({ error: "Select at least one day" }, { status: 400 });
    }
    for (const key of Object.keys(halfDayDays)) {
      if (!selectedDays.some((d) => utcDayKey(d) === key)) {
        return NextResponse.json(
          { error: `Half-day date ${key} is outside the selected days` },
          { status: 400 }
        );
      }
    }
    for (const key of withoutPayDays) {
      if (!selectedDays.some((d) => utcDayKey(d) === key)) {
        return NextResponse.json(
          { error: `Without-pay date ${key} is outside the selected days` },
          { status: 400 }
        );
      }
    }
    if (skippedDays.some((k) => !allDays.some((d) => utcDayKey(d) === k))) {
      return NextResponse.json({ error: "Skipped day is outside the leave range" }, { status: 400 });
    }

    const dayCost = (d: Date) => (halfDayDays[utcDayKey(d)] ? 0.5 : 1);
    const durationDays = selectedDays.reduce((sum, d) => sum + dayCost(d), 0);
    const isHalfDay = selectedDays.some((d) => halfDayDays[utcDayKey(d)]);
    const paidDays =
      explicitWithoutPay === true && withoutPayDays.length === 0
        ? 0
        : selectedDays.reduce((sum, d) => (withoutPayDays.includes(utcDayKey(d)) ? sum : sum + dayCost(d)), 0);
    const withoutPayTotal = Math.round((durationDays - paidDays) * 100) / 100;
    const isWithoutPay = withoutPayTotal === durationDays;

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
      const blocked = selectedDays.some((d) =>
        overlapping.some((o) => d >= o.startDate && d <= o.endDate)
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
        halfDaySession: isHalfDay
          ? ((Object.values(halfDayDays)[0] || "FIRST_HALF") as "FIRST_HALF" | "SECOND_HALF")
          : null,
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
