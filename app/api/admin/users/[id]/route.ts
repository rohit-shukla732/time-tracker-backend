import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "../../../../../lib/roleAuth";
import { prisma } from "../../../../../lib/prisma";

// DELETE /api/admin/users/[id] - Delete a user (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(req);

  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id: userId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  // Prevent self-deletion
  if (authResult.user.id === userId) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  try {
    // Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete all related records in dependency order
    await prisma.$transaction([
      // Session children first
      prisma.taskSession.deleteMany({ where: { session: { userId } } }),
      prisma.sessionAppUsage.deleteMany({ where: { session: { userId } } }),
      prisma.sessionWebsiteUsage.deleteMany({ where: { session: { userId } } }),
      prisma.sessionSummary.deleteMany({ where: { userId } }),
      // Now sessions
      prisma.session.deleteMany({ where: { userId } }),
      // Other activity
      prisma.appSwitchEvent.deleteMany({ where: { userId } }),
      prisma.event.deleteMany({ where: { userId } }),
      prisma.websiteVisit.deleteMany({ where: { userId } }),
      prisma.lateComingRecord.deleteMany({ where: { userId } }),
      // HR records
      prisma.leaveRequest.deleteMany({ where: { userId } }),
      prisma.leaveBalance.deleteMany({ where: { userId } }),
      // Tickets & tasks
      prisma.ticketComment.deleteMany({ where: { userId } }),
      prisma.assetAssignment.deleteMany({ where: { userId } }),
      prisma.assetAssignment.deleteMany({ where: { assignedBy: userId } }),
      // Notifications & tokens
      prisma.notification.deleteMany({ where: { userId } }),
      prisma.refreshToken.deleteMany({ where: { userId } }),
      // HR profile records
      prisma.personalInfo.deleteMany({ where: { userId } }),
      prisma.contactInfo.deleteMany({ where: { userId } }),
      prisma.addressInfo.deleteMany({ where: { userId } }),
      prisma.bankDetails.deleteMany({ where: { userId } }),
      prisma.governmentID.deleteMany({ where: { userId } }),
      prisma.familyInfo.deleteMany({ where: { userId } }),
      prisma.employmentInfo.deleteMany({ where: { userId } }),
      // Finally delete the user
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
