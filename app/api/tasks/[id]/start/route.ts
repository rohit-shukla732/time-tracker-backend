import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// POST /api/tasks/[id]/start - Start working on a task
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
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
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

    // Check if user has access to this task
    if (user.role === "EMPLOYEE" && task.assignedTo !== user.id) {
      return NextResponse.json(
        { error: "You can only work on tasks assigned to you" },
        { status: 403 }
      );
    }

    // Check if task is active
    if (task.status === "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "Task is pending approval" },
        { status: 400 }
      );
    }

    if (task.status === "COMPLETED" || task.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Task is already completed or cancelled" },
        { status: 400 }
      );
    }

    // Check if there's already an active task session for this session
    const existingActiveSession = await prisma.taskSession.findFirst({
      where: {
        sessionId,
        userId: user.id,
        endedAt: null
      }
    });

    if (existingActiveSession) {
      // End the previous task session
      const endTime = new Date();
      const duration = endTime.getTime() - new Date(existingActiveSession.startedAt).getTime();
      
      await prisma.taskSession.update({
        where: { id: existingActiveSession.id },
        data: {
          endedAt: endTime,
          durationMs: BigInt(duration)
        }
      });
    }

    // Create new task session
    const taskSession = await prisma.taskSession.create({
      data: {
        taskId: params.id,
        sessionId,
        userId: user.id,
        startedAt: new Date()
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });

    // Update task status to IN_PROGRESS if not already
    if (task.status !== "IN_PROGRESS") {
      await prisma.task.update({
        where: { id: params.id },
        data: {
          status: "IN_PROGRESS",
          startedAt: task.startedAt || new Date()
        }
      });
    }

    logger.info(`Task session started: ${taskSession.id} for task ${params.id} by user ${user.id}`);

    return NextResponse.json(taskSession);
  } catch (error) {
    logger.error("Error starting task session:", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
