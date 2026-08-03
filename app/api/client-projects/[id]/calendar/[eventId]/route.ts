import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string, eventId: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user || authResult.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, eventId } = await params;

    const projectCount = await prisma.clientProject.count({ where: { id } });
    if (projectCount === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.projectCalendarEvent.delete({
      where: { id: eventId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
