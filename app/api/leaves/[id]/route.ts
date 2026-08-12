import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { removeLeaveAttendance } from "@/lib/attendanceUtils";
import { notifyLeaveCancelled } from "@/lib/leaveNotifications";

// PATCH /api/leaves/[id] - Cancel a leave request
// - Owner: can cancel own PENDING/APPROVED request if start date is in the future
// - HR/ADMIN: can cancel any non-terminal request
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id } = await params;

  try {
    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true, startDate: true },
    });

    if (!request) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    if (request.status !== "PENDING" && request.status !== "APPROVED") {
      return NextResponse.json(
        { error: `This request cannot be cancelled (${request.status.toLowerCase()})` },
        { status: 409 }
      );
    }

    const isHr = authResult.user.role === "HR" || authResult.user.role === "ADMIN";
    const isOwner = request.userId === authResult.user.id;

    if (!isOwner && !isHr) {
      return unauthorizedResponse("You can only cancel your own leave requests.");
    }

    if (isOwner && !isHr) {
      const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
      if (request.startDate <= today) {
        return NextResponse.json(
          { error: "This leave has already started; contact HR to cancel it" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        leaveType: { select: { id: true, name: true, isPaid: true } },
        approver: { select: { id: true, name: true } },
      },
    });

    // Remove the leave from the attendance calendar.
    await removeLeaveAttendance(id);

    // Notify the manager and HR that the leave was cancelled (best-effort).
    void notifyLeaveCancelled(updated);

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error("Error cancelling leave request:", error);
    return NextResponse.json({ error: "Failed to cancel leave request" }, { status: 500 });
  }
}
