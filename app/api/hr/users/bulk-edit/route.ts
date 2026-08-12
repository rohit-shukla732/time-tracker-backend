import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

const MANAGER_ROLES: Role[] = ["ADMIN", "SENIOR_MANAGER", "MANAGER", "HR"];
const VALID_ROLES: Role[] = ["ADMIN", "SENIOR_MANAGER", "MANAGER", "HR", "EMPLOYEE"];
const MAX_USERS = 500;

// PATCH /api/hr/users/bulk-edit - Apply the same fields to many employees (HR/ADMIN)
// Body: { userIds: string[], managerId?, shiftGroupId?, role?, isProbation? }
// managerId: null removes the manager, absent leaves it unchanged.
// shiftGroupId: null resets to the default shift, absent leaves it unchanged.
export async function PATCH(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const body = await req.json();
    const userIds = Array.isArray(body?.userIds)
      ? body.userIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : [];

    if (userIds.length === 0) {
      return NextResponse.json({ error: "Select at least one employee" }, { status: 400 });
    }
    if (userIds.length > MAX_USERS) {
      return NextResponse.json(
        { error: `Cannot edit more than ${MAX_USERS} employees at once` },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (body.managerId !== undefined) {
      if (body.managerId) {
        const manager = await prisma.user.findFirst({
          where: { id: String(body.managerId), role: { in: MANAGER_ROLES }, isArchived: false },
          select: { id: true },
        });
        if (!manager) {
          return NextResponse.json({ error: "Selected manager is invalid" }, { status: 400 });
        }
        updateData.managerId = manager.id;
      } else {
        updateData.managerId = null;
      }
    }

    if (body.shiftGroupId !== undefined) {
      if (body.shiftGroupId) {
        const group = await prisma.shiftGroup.findUnique({
          where: { id: String(body.shiftGroupId) },
          select: { id: true },
        });
        if (!group) {
          return NextResponse.json({ error: "Selected shift group is invalid" }, { status: 400 });
        }
        updateData.shiftGroupId = group.id;
      } else {
        updateData.shiftGroupId = null;
      }
    }

    if (body.role !== undefined) {
      if (!VALID_ROLES.includes(body.role as Role)) {
        return NextResponse.json({ error: "Selected role is invalid" }, { status: 400 });
      }
      updateData.role = body.role;
    }

    if (body.isProbation !== undefined) {
      updateData.isProbation = Boolean(body.isProbation);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Nothing to change — pick at least one field" },
        { status: 400 }
      );
    }

    const result = await prisma.user.updateMany({
      where: { id: { in: userIds }, isArchived: false },
      data: updateData,
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "No matching active employees found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, updated: result.count });
  } catch (error: any) {
    console.error("Error bulk editing users:", error);
    return NextResponse.json({ error: error?.message || "Failed to update employees" }, { status: 500 });
  }
}
