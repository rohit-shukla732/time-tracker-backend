import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Add user to client project
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user || authResult.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    const project = await prisma.clientProject.findUnique({
        where: { id: (await params).id }
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await request.json();
    const { userId } = body;

    const employmentInfo = await prisma.employmentInfo.findUnique({ where: { userId }});
    if (!employmentInfo) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }

    await prisma.employmentInfo.update({
      where: { userId },
      data: { clientProjectId: project.id }
    });

    return NextResponse.json({ success: true, message: "Added to project successfully" });
  } catch (error) {
    logger.error("Error adding to project:", error as Error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Remove user from client project
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user || authResult.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    await prisma.employmentInfo.update({
      where: { userId },
      data: { clientProjectId: null }
    });
    
    return NextResponse.json({ success: true, message: "Removed from project" });
  } catch (error) {
    logger.error("Error removing from project:", error as Error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

