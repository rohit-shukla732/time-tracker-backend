import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { syncLeaveAttendance, removeLeaveAttendance } from "@/lib/attendanceUtils";
import { notifyLeaveApproved, notifyLeaveRejected } from "@/lib/leaveNotifications";

const requestInclude = {
  user: { select: { id: true, name: true, email: true, role: true, managerId: true } },
  leaveType: { select: { id: true, name: true, isPaid: true } },
  approver: { select: { id: true, name: true } },
} as const;

// POST /api/leaves/[id]/decision - Approve or reject a leave request
// - HR/ADMIN: can decide on any request
// - MANAGER/SENIOR_MANAGER: can decide on requests where requester.managerId === me
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id } = await params;

  try {
    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, role: true, managerId: true } },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    if (request.status !== "PENDING") {
      return NextResponse.json(
        { error: `This request has already been ${request.status.toLowerCase()}` },
        { status: 409 }
      );
    }

    // Permission check
    const isHr = authResult.user.role === "HR" || authResult.user.role === "ADMIN";
    const isAssignedManager =
      (authResult.user.role === "MANAGER" || authResult.user.role === "SENIOR_MANAGER") &&
      request.user.managerId === authResult.user.id;

    if (!isHr && !isAssignedManager) {
      return unauthorizedResponse("You are not authorized to decide on this request.");
    }

    const body = await req.json();
    const decision = body.decision === "APPROVED" ? "APPROVED" : "REJECTED";
    const comment = body.comment ? String(body.comment).trim() : null;

    if (decision === "REJECTED" && !comment) {
      return NextResponse.json({ error: "A comment is required when rejecting a leave" }, { status: 400 });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: decision,
        approvedById: authResult.user.id,
        approvedAt: new Date(),
        managerComment: comment,
      },
      include: requestInclude,
    });

    // Sync the attendance calendar: approved -> approved-type records,
    // rejected -> remove the unapproved records.
    if (decision === "APPROVED") {
      await syncLeaveAttendance(updated);
      // Email the employee + manager + HR (best-effort).
      void notifyLeaveApproved(updated);
    } else {
      await removeLeaveAttendance(id);
      // Email the employee with the rejection reason (best-effort).
      void notifyLeaveRejected(updated, comment);
    }

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error("Error deciding on leave request:", error);
    return NextResponse.json({ error: "Failed to process leave request" }, { status: 500 });
  }
}
