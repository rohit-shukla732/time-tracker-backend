import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET /api/projects - Get projects
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
    const where: any = {};

    // Filter based on role
    if (user.role === "MANAGER" && user.teamId) {
      where.teamId = user.teamId;
    } else if (user.role === "EMPLOYEE" && user.teamId) {
      where.teamId = user.teamId;
    }
    // Admin sees all projects

    const projects = await prisma.project.findMany({
      where,
      include: {
        team: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        tasks: {
          select: {
            id: true,
            status: true,
            priority: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(projects);
  } catch (error) {
    logger.error("Error fetching projects:", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project (managers/admins only)
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

    if (user.role === "EMPLOYEE") {
      return NextResponse.json(
        { error: "Only managers and admins can create projects" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, teamId, startDate, endDate } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    let projectTeamId = teamId;
    if (!projectTeamId && user.role === "MANAGER" && user.teamId) {
      projectTeamId = user.teamId;
    }

    if (!projectTeamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        teamId: projectTeamId,
        createdById: user.id,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      },
      include: {
        team: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    logger.info(`Project created: ${project.id} by user ${user.id}`);

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    logger.error("Error creating project:", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
