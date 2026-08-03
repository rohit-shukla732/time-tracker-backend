import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user || authResult.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if project exists
    const projectCount = await prisma.clientProject.count({ where: { id } });
    if (projectCount === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Unassign members first
    await prisma.employmentInfo.updateMany({
      where: { clientProjectId: id },
      data: { clientProjectId: null }
    });

    await prisma.clientProject.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting client project:", error as Error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

