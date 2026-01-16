import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// POST /api/tasks/[id]/approve - Approve a task (managers/admins only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const user = authResult.user;

    if (user.role === "EMPLOYEE") {
      return NextResponse.json(
        { error: "Only managers and admins can approve tasks" },
        { status: 403 }
      );
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id }
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    if (user.role === "MANAGER" && task.teamId !== user.teamId) {
      return NextResponse.json(
        { error: "You can only approve tasks in your team" },
        { status: 403 }
      );
    }

    if (task.status !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "Task is not pending approval" },
        { status: 400 }
      );
    }

    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: {
        status: "ACTIVE",
        approvedById: user.id,
        approvedAt: new Date()
      },
      include: {
        project: true,
        assignee: {
          select: { id: true, name: true, email: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        approvedBy: {
          select: { id: true, name: true, email: true }
        },
        team: {
          select: { id: true, name: true }
        }
      }
    });

    logger.info(`Task approved: ${params.id} by user ${user.id}`);

    return NextResponse.json(updatedTask);
  } catch (error) {
    logger.error("Error approving task:", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
