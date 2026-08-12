import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// PATCH /api/hr/shift-groups/[id] - Update a shift group (HR/ADMIN)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Shift group ID is required" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const updateData: any = {};

    if (typeof body.name === "string" && body.name.trim()) {
      const name = body.name.trim();
      const existing = await prisma.shiftGroup.findFirst({
        where: { name, id: { not: id } },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ error: "A shift group with this name already exists" }, { status: 409 });
      }
      updateData.name = name;
    }

    if (typeof body.startTime === "string" && body.startTime.trim()) {
      if (!TIME_REGEX.test(body.startTime.trim())) {
        return NextResponse.json({ error: "Shift times must be in HH:MM 24-hour format" }, { status: 400 });
      }
      updateData.startTime = body.startTime.trim();
    }

    if (typeof body.endTime === "string" && body.endTime.trim()) {
      if (!TIME_REGEX.test(body.endTime.trim())) {
        return NextResponse.json({ error: "Shift times must be in HH:MM 24-hour format" }, { status: 400 });
      }
      updateData.endTime = body.endTime.trim();
    }

    if (typeof body.isDefault === "boolean" && body.isDefault) {
      await prisma.shiftGroup.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      updateData.isDefault = true;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const group = await prisma.shiftGroup.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, group });
  } catch (error: any) {
    console.error("Error updating shift group:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "A shift group with this name already exists" }, { status: 409 });
    }
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Shift group not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error?.message || "Failed to update shift group" }, { status: 500 });
  }
}

// DELETE /api/hr/shift-groups/[id] - Delete a shift group (HR/ADMIN)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Shift group ID is required" }, { status: 400 });
  }

  try {
    const group = await prisma.shiftGroup.findUnique({ where: { id } });
    if (!group) {
      return NextResponse.json({ error: "Shift group not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ where: { shiftGroupId: id }, data: { shiftGroupId: null } });
      await tx.shiftGroup.delete({ where: { id } });
      if (group.isDefault) {
        const next = await tx.shiftGroup.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
        if (next) {
          await tx.shiftGroup.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }
    });

    return NextResponse.json({ success: true, message: "Shift group deleted" });
  } catch (error: any) {
    console.error("Error deleting shift group:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete shift group" }, { status: 500 });
  }
}
