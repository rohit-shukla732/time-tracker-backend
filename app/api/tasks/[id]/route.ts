import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET /api/tasks/[id] - Get a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const task = await prisma.task.findUnique({
      where: { id },
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
        department: {
          select: { id: true, name: true }
        },
        taskSessions: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { startedAt: 'desc' }
        }
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (user.role === "EMPLOYEE") {
      if (task.assignedTo !== user.id && task.createdById !== user.id) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    } else if (user.role === "MANAGER") {
      if (task.departmentId !== user.departmentId) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    // Calculate total time
    const totalTimeMs = task.taskSessions.reduce((sum, session) => 
      sum + (session.durationMs ? Number(session.durationMs) : 0), 0
    );

    return NextResponse.json({ ...task, totalTimeMs });
  } catch (error) {
    logger.error("Error fetching task:", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id] - Update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const body = await request.json();

    const task = await prisma.task.findUnique({
      where: { id }
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (user.role === "EMPLOYEE") {
      // Employees can only update status of assigned tasks
      if (task.assignedTo !== user.id) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
      // Employees can only update status
      const allowedFields = ["status"];
      const requestedFields = Object.keys(body);
      const hasUnallowedFields = requestedFields.some(
        field => !allowedFields.includes(field)
      );
      if (hasUnallowedFields) {
        return NextResponse.json(
          { error: "Employees can only update task status" },
          { status: 403 }
        );
      }
    } else if (user.role === "MANAGER") {
      if (task.departmentId && user.departmentId && task.departmentId !== user.departmentId) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    const updateData: any = {};
    
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.projectId !== undefined) updateData.projectId = body.projectId;
    if (body.assignedTo !== undefined) updateData.assignedTo = body.assignedTo;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.estimatedHours !== undefined) updateData.estimatedHours = body.estimatedHours;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === "IN_PROGRESS" && !task.startedAt) {
        updateData.startedAt = new Date();
      }
      if (body.status === "COMPLETED" && !task.completedAt) {
        updateData.completedAt = new Date();
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
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
        department: {
          select: { id: true, name: true }
        }
      }
    });

    logger.info(`Task updated: ${id} by user ${user.id}`);

    return NextResponse.json(updatedTask);
  } catch (error) {
    logger.error("Error updating task:", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const user = authResult.user;

    const task = await prisma.task.findUnique({
      where: { id }
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Only admins and managers can delete tasks
    if (user.role === "EMPLOYEE") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    if (user.role === "MANAGER" && task.departmentId && user.departmentId && task.departmentId !== user.departmentId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    await prisma.task.delete({
      where: { id }
    });

    logger.info(`Task deleted: ${id} by user ${user.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting task:", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
