import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

// PATCH /api/hr/attendance/types/[id] - Update a type (name, colors, active, etc.)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const existing = await prisma.attendanceType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Attendance type not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: any = {};

    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.code !== undefined) data.code = String(body.code).trim().toUpperCase();
    if (body.description !== undefined) {
      data.description = body.description ? String(body.description).trim() : null;
    }
    if (body.category !== undefined) {
      const CATEGORIES = ["PRESENT", "LEAVE", "HOLIDAY", "WEEKEND", "OTHER"];
      if (!CATEGORIES.includes(body.category)) {
        return NextResponse.json(
          { error: `category must be one of: ${CATEGORIES.join(", ")}` },
          { status: 400 }
        );
      }
      data.category = body.category;
    }
    if (body.color !== undefined) data.color = String(body.color);
    if (body.isPaid !== undefined) data.isPaid = Boolean(body.isPaid);
    if (body.isWorking !== undefined) data.isWorking = Boolean(body.isWorking);
    if (body.active !== undefined && !existing.isSystem) {
      data.active = Boolean(body.active);
    }
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const type = await prisma.attendanceType.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, type });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A type with this name or code already exists" },
        { status: 409 }
      );
    }
    console.error("Error updating attendance type:", error);
    return NextResponse.json({ error: "Failed to update attendance type" }, { status: 500 });
  }
}

// DELETE /api/hr/attendance/types/[id] - Delete a type (only if unused; system types protected)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const existing = await prisma.attendanceType.findUnique({
      where: { id },
      include: { records: { select: { id: true }, take: 1 } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Attendance type not found" }, { status: 404 });
    }
    if (existing.isSystem) {
      return NextResponse.json(
        { error: "System attendance types cannot be deleted" },
        { status: 400 }
      );
    }
    if (existing.records.length > 0) {
      return NextResponse.json(
        { error: "This type is in use and cannot be deleted. Deactivate it instead." },
        { status: 409 }
      );
    }

    await prisma.attendanceType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting attendance type:", error);
    return NextResponse.json({ error: "Failed to delete attendance type" }, { status: 500 });
  }
}
