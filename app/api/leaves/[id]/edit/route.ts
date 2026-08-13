import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import {
  computeTypeBalance,
  dateFromInput,
  normalizeLeaveDays,
  splitPaidUnpaid,
  type LeaveTypeInfo,
} from "@/lib/leaveUtils";
import { removeLeaveAttendance, syncLeaveAttendance } from "@/lib/attendanceUtils";

const requestInclude = {
  user: { select: { id: true, name: true, email: true, role: true, managerId: true } },
  leaveType: { select: { id: true, name: true, isPaid: true } },
  approver: { select: { id: true, name: true } },
  edits: {
    include: { editedBy: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

// POST /api/leaves/[id]/edit - Edit a teammate's (or your own) leave request
// - EMPLOYEE/MANAGER (owner): can edit their own PENDING requests
// - MANAGER/SENIOR_MANAGER: can edit requests of employees reporting to them (PENDING or APPROVED)
// - HR/ADMIN: can edit any request (PENDING or APPROVED)
//
// Every edit is recorded in LeaveRequestEdit with the editor, an optional note
// ("Manager edited this...") and a timestamp, so a full history is maintained.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }
  const currentUser = authResult.user;

  const { id } = await params;

  try {
    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        leaveTypeId: true,
        startDate: true,
        endDate: true,
        isHalfDay: true,
        halfDaySession: true,
        halfDayDays: true,
        skippedDays: true,
        withoutPayDays: true,
        durationDays: true,
        reason: true,
        status: true,
        isWithoutPay: true,
        user: { select: { id: true, name: true, role: true, managerId: true, createdAt: true } },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    if (request.status !== "PENDING" && request.status !== "APPROVED") {
      return NextResponse.json(
        { error: `This request cannot be edited (${request.status.toLowerCase()})` },
        { status: 409 }
      );
    }

    // Permission check
    const isHr = authResult.user.role === "HR" || authResult.user.role === "ADMIN";
    const isOwner = request.userId === authResult.user.id;
    const isAssignedManager =
      (authResult.user.role === "MANAGER" || authResult.user.role === "SENIOR_MANAGER") &&
      request.user.managerId === authResult.user.id;

    if (!isHr && !isAssignedManager && !isOwner) {
      return unauthorizedResponse("You are not authorized to edit this request.");
    }

    // Employees (non-manager owners) may only edit while the request is pending.
    if (isOwner && !isHr && !isAssignedManager && request.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending requests can be edited; you can cancel approved leaves instead" },
        { status: 409 }
      );
    }

    const body = await req.json();
    const { leaveTypeId, startDate, endDate, reason } = body;
    const note = body.note ? String(body.note).trim() : null;

    if (!startDate || !endDate || !reason?.trim()) {
      return NextResponse.json({ error: "Dates and reason are required" }, { status: 400 });
    }

    const start = dateFromInput(String(startDate));
    const end = dateFromInput(String(endDate));
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const type = await prisma.leaveType.findFirst({
      where: { id: leaveTypeId ?? request.leaveTypeId, active: true },
    });
    if (!type) {
      return NextResponse.json({ error: "Leave type not found or inactive" }, { status: 400 });
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

    // Overlap check against other PENDING/APPROVED requests for the employee.
    const overlapping = await prisma.leaveRequest.findMany({
      where: {
        userId: request.userId,
        id: { not: request.id },
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
          { error: "There is already a pending or approved leave overlapping these dates" },
          { status: 409 }
        );
      }
    }

    // Balance check for the new paid days. The balance already includes the
    // request being edited, so we add its old paid portion back to the hold.
    const year = start.getUTCFullYear();
    const balance = await computeTypeBalance(
      request.userId,
      request.user.createdAt,
      type as LeaveTypeInfo,
      year
    );
    const totalHeld = balance.available - balance.pending;
    const oldPaidDays = splitPaidUnpaid(request).paid;
    if (paidDays > oldPaidDays + Math.max(totalHeld, 0)) {
      return NextResponse.json(
        {
          error: `This employee only has ${Math.max(totalHeld, 0)} extra day(s) of ${type.name} available for paid leave — mark some days "Without pay" or reduce the days.`,
        },
        { status: 400 }
      );
    }

    const oldValues = {
      leaveTypeId: request.leaveTypeId,
      startDate: request.startDate.toISOString(),
      endDate: request.endDate.toISOString(),
      reason: request.reason,
      isHalfDay: request.isHalfDay,
      halfDaySession: request.halfDaySession,
      durationDays: request.durationDays,
      isWithoutPay: request.isWithoutPay,
    };

    const updated = await prisma.$transaction(async (tx) => {
      // Record the audit entry first so the updated request payload already
      // includes it in its edits history.
      await tx.leaveRequestEdit.create({
        data: {
          leaveRequestId: request.id,
          editedById: currentUser.id,
          editedByRole: currentUser.role,
          note,
          changes: oldValues,
        },
      });

      return tx.leaveRequest.update({
        where: { id: request.id },
        data: {
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
    });

    // Re-apply the leave on the attendance calendar with the new dates.
    await removeLeaveAttendance(request.id);
    await syncLeaveAttendance(updated);

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error("Error editing leave request:", error);
    return NextResponse.json({ error: "Failed to edit leave request" }, { status: 500 });
  }
}