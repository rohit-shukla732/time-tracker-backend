import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.clientProject.findMany({
      include: {
        _count: {
          select: { employmentInfo: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const projectData = projects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      memberCount: p._count.employmentInfo,
      createdAt: p.createdAt
    }));

    return NextResponse.json({ success: true, projects: projectData });
  } catch (error) {
    logger.error("Error fetching client projects:", error as Error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    if (authResult.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const project = await prisma.clientProject.create({
      data: {
        name,
        description
      }
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    logger.error("Error creating client project:", error as Error);
    return NextResponse.json({ error: "Internal server error or project already exists" }, { status: 500 });
  }
}
