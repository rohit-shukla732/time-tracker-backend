import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash";
import type { Role } from "@prisma/client";

const VALID_ROLES: Role[] = ["ADMIN", "SENIOR_MANAGER", "MANAGER", "HR", "EMPLOYEE"];

// PATCH /api/admin/users/[id] - Update a user (Admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(req);
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

    if (typeof data.name === 'string' && data.name.trim()) {
      updateData.name = data.name.trim();
    }

    if (typeof data.email === 'string' && data.email.trim()) {
      updateData.email = data.email.trim().toLowerCase();
    }

    if (data.role && VALID_ROLES.includes(data.role as Role)) {
      updateData.role = data.role;
    }

    if (typeof data.isArchived === 'boolean') {
      if (authResult.user.id === userId && data.isArchived) {
        return NextResponse.json({ error: "Cannot archive your own account" }, { status: 400 });
      }
      updateData.isArchived = data.isArchived;
    }

    if (typeof data.password === 'string' && data.password.trim()) {
      if (data.password.trim().length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
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
        isArchived: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("Error updating user:", error);
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - Delete a user and their related records (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(req);

  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id: userId } = await params;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  // Prevent self-deletion
  if (authResult.user.id === userId) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete related records in FK-safe order
    await prisma.ticketComment.deleteMany({ where: { userId } });
    await prisma.ticket.updateMany({ where: { assignedTo: userId }, data: { assignedTo: null } });
    await prisma.ticket.deleteMany({ where: { createdBy: userId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.passwordResetToken.deleteMany({ where: { email: user.email } });

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
