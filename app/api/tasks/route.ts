import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET /api/tasks - Get tasks (filtered by role and query params)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");
    const assignedTo = searchParams.get("assignedTo");

    const where: any = {};

    // Filter based on role
    if (user.role === "EMPLOYEE") {
      // Employees see tasks assigned to them or created by them
      where.OR = [
        { assignedTo: user.id },
        { createdById: user.id }
      ];
    } else if (user.role === "MANAGER") {
      // Managers see all tasks in their team
      if (user.teamId) {
        where.teamId = user.teamId;
      }
    }
    // Admin sees all tasks

    if (status) where.status = status;
    if (projectId) where.projectId = projectId;
    if (assignedTo) where.assignedTo = assignedTo;

    const tasks = await prisma.task.findMany({
      where,
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
        },
        taskSessions: {
          select: {
            id: true,
            startedAt: true,
            endedAt: true,
            durationMs: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Calculate total time spent on each task
    const tasksWithTime = tasks.map(task => ({
      ...task,
      totalTimeMs: task.taskSessions.reduce((sum, session) => 
        sum + (session.durationMs ? Number(session.durationMs) : 0), 0
      )
    }));

    return NextResponse.json(tasksWithTime);
  } catch (error) {
    logger.error("Error fetching tasks:", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
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
    const {
      title,
      description,
      projectId,
      assignedTo,
      priority,
      estimatedHours,
      dueDate,
      teamId
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Determine team ID
    let taskTeamId = teamId;
    if (!taskTeamId) {
      if (user.role === "MANAGER" && user.teamId) {
        taskTeamId = user.teamId;
      } else if (user.role === "EMPLOYEE" && user.teamId) {
        taskTeamId = user.teamId;
      } else {
        return NextResponse.json(
          { error: "Team ID is required" },
          { status: 400 }
        );
      }
    }

    // Determine status based on who creates it
    let status: "PENDING_APPROVAL" | "ACTIVE" = "PENDING_APPROVAL";
    let approvedById: string | null = null;
    let approvedAt: Date | null = null;

    if (user.role === "MANAGER" || user.role === "ADMIN") {
      // Managers and admins can create pre-approved tasks
      status = "ACTIVE";
      approvedById = user.id;
      approvedAt = new Date();
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId,
        teamId: taskTeamId,
        assignedTo,
        createdById: user.id,
        approvedById,
        approvedAt,
        status,
        priority: priority || "MEDIUM",
        estimatedHours,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        project: true,
        assignee: {
          select: { id: true, name: true, email: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        team: {
          select: { id: true, name: true }
        }
      }
    });

    logger.info(`Task created: ${task.id} by user ${user.id}`);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    logger.error("Error creating task:", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
