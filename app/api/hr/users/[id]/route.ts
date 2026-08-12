import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash";
import type { Role } from "@prisma/client";

const MANAGER_ROLES: Role[] = ["ADMIN", "SENIOR_MANAGER", "MANAGER", "HR"];
const VALID_ROLES: Role[] = ["ADMIN", "SENIOR_MANAGER", "MANAGER", "HR", "EMPLOYEE"];

// PATCH /api/hr/users/[id] - Update an employee (HR/ADMIN)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id: userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const data = await req.json();
    const updateData: any = {};

    if (typeof data.name === "string" && data.name.trim()) {
      updateData.name = data.name.trim();
    }

    if (typeof data.email === "string" && data.email.trim()) {
      updateData.email = data.email.trim().toLowerCase();
    }

    if (data.role && VALID_ROLES.includes(data.role as Role)) {
      updateData.role = data.role;
    }

    if (data.managerId !== undefined) {
      if (data.managerId) {
        const manager = await prisma.user.findFirst({
          where: { id: data.managerId, role: { in: MANAGER_ROLES }, isArchived: false },
          select: { id: true },
        });
        if (!manager) {
          return NextResponse.json({ error: "Selected manager is invalid" }, { status: 400 });
        }
        updateData.managerId = data.managerId;
      } else {
        updateData.managerId = null;
      }
    }

    if (data.shiftGroupId !== undefined) {
      if (data.shiftGroupId) {
        const group = await prisma.shiftGroup.findUnique({
          where: { id: data.shiftGroupId },
          select: { id: true },
        });
        if (!group) {
          return NextResponse.json({ error: "Selected shift group is invalid" }, { status: 400 });
        }
        updateData.shiftGroupId = data.shiftGroupId;
      } else {
        updateData.shiftGroupId = null;
      }
    }

    if (typeof data.isProbation === "boolean") {
      updateData.isProbation = data.isProbation;
    }

    if (typeof data.isArchived === "boolean") {
      if (authResult.user.id === userId && data.isArchived) {
        return NextResponse.json({ error: "Cannot archive your own account" }, { status: 400 });
      }
      updateData.isArchived = data.isArchived;
    }

    if (typeof data.password === "string" && data.password.trim()) {
      if (data.password.trim().length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      updateData.passwordHash = await hashPassword(data.password.trim());
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        managerId: true,
        isArchived: true,
        isProbation: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("Error updating user:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
