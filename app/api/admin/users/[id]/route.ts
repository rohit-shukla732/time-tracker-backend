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

    // Delete all related records in strict dependency order.
    // NOT wrapped in a single interactive transaction — too many steps causes the 5 s timeout.
    // Each deleteMany is atomic on its own; order ensures no FK violations.

    // Gather session IDs first — safer than relying on nullable userId in child tables
    const userSessions = await prisma.session.findMany({ where: { userId }, select: { sessionId: true } });
    const sessionIds = userSessions.map((s: { sessionId: string }) => s.sessionId);

    // TaskSession: delete by userId AND by sessions owned by user
    await prisma.taskSession.deleteMany({ where: { OR: [{ userId }, { sessionId: { in: sessionIds } }] } });
    // AppSwitchEvent: MUST filter by sessionId (userId is nullable — filtering by userId misses rows)
    if (sessionIds.length > 0) {
      await prisma.appSwitchEvent.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.sessionAppUsage.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.sessionWebsiteUsage.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.sessionSummary.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.event.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.websiteVisit.deleteMany({ where: { sessionId: { in: sessionIds } } });
    }
    // Now sessions are safe to delete
    await prisma.session.deleteMany({ where: { userId } });

    // Null out department manager if this user manages one
    await prisma.department.updateMany({ where: { managerId: userId }, data: { managerId: null } });

    // HR records — null approvedById on leave requests first
    await prisma.leaveRequest.updateMany({ where: { approvedById: userId }, data: { approvedById: null, approvedAt: null } });
    await prisma.leaveRequest.deleteMany({ where: { userId } });
    await prisma.leaveBalance.deleteMany({ where: { userId } });
    await prisma.lateComingRecord.deleteMany({ where: { userId } });

    // Ticket comments by this user on OTHER people's tickets (no cascade from user side)
    await prisma.ticketComment.deleteMany({ where: { userId } });
    // Null assignedTo, then delete tickets created by user (cascade deletes their comments/screenshots)
    await prisma.ticket.updateMany({ where: { assignedTo: userId }, data: { assignedTo: null } });
    await prisma.ticket.deleteMany({ where: { createdBy: userId } });

    // Tasks assigned/approved by this user — null refs first
    await prisma.task.updateMany({ where: { assignedTo: userId }, data: { assignedTo: null } });
    await prisma.task.updateMany({ where: { approvedById: userId }, data: { approvedById: null, approvedAt: null } });
    // Delete task sessions for tasks created by this user before deleting those tasks
    const userCreatedTasks = await prisma.task.findMany({ where: { createdById: userId }, select: { id: true } });
    const userTaskIds = userCreatedTasks.map((t: { id: string }) => t.id);
    if (userTaskIds.length > 0) {
      await prisma.taskSession.deleteMany({ where: { taskId: { in: userTaskIds } } });
      await prisma.task.deleteMany({ where: { id: { in: userTaskIds } } });
    }

    // Projects created by this user — delete their tasks' sessions and tasks first, then projects
    const userProjects = await prisma.project.findMany({ where: { createdById: userId }, select: { id: true } });
    const userProjectIds = userProjects.map((p: { id: string }) => p.id);
    if (userProjectIds.length > 0) {
      const projectTasks = await prisma.task.findMany({ where: { projectId: { in: userProjectIds } }, select: { id: true } });
      const projectTaskIds = projectTasks.map((t: { id: string }) => t.id);
      if (projectTaskIds.length > 0) {
        await prisma.taskSession.deleteMany({ where: { taskId: { in: projectTaskIds } } });
        await prisma.task.deleteMany({ where: { id: { in: projectTaskIds } } });
      }
      await prisma.project.deleteMany({ where: { id: { in: userProjectIds } } });
    }

    // Assets
    await prisma.assetAssignment.deleteMany({ where: { userId } });
    await prisma.assetAssignment.deleteMany({ where: { assignedBy: userId } });

    // Notifications & tokens
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.passwordResetToken.deleteMany({ where: { email: user.email } });
    // Senior manager dept assignments
    await prisma.seniorManagerDepartment.deleteMany({ where: { userId } });
    // Device control
    await prisma.deviceControl.deleteMany({ where: { userId } });

    // Basic tables to clean up when deleting a user
    await prisma.employmentInfo.deleteMany({ where: { userId } });

    // Finally delete the user
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user", detail: error?.message },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[id] - Update a user (Admin only)
export async function PATCH(
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

  try {
    const data = await req.json();
    const updateData: any = {};
    if (typeof data.isArchived === 'boolean') {
      if (authResult.user.id === userId && data.isArchived) {
         return NextResponse.json({ error: "Cannot archive yourself" }, { status: 400 });
      }
      updateData.isArchived = data.isArchived;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({ success: true, user: { id: updatedUser.id, isArchived: updatedUser.isArchived } });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
