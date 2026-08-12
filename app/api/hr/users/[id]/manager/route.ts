import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

const MANAGER_ROLES = ["ADMIN", "SENIOR_MANAGER", "MANAGER", "HR"];

// PATCH /api/hr/users/[id]/manager - Assign or remove an employee's manager (HR/ADMIN)
// Body: { managerId: string | null }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id } = await params;

  try {
    const employee = await prisma.user.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const body = await req.json();
    const managerId = body.managerId ? String(body.managerId) : null;

    if (managerId === employee.id) {
      return NextResponse.json({ error: "An employee cannot be their own manager" }, { status: 400 });
    }

    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { id: true, role: true, managerId: true },
      });
      if (!manager) {
        return NextResponse.json({ error: "Manager not found" }, { status: 404 });
      }
      if (!MANAGER_ROLES.includes(manager.role)) {
        return NextResponse.json(
          { error: "Only ADMIN, SENIOR_MANAGER, MANAGER or HR can be a manager" },
          { status: 400 }
        );
      }
      // Prevent simple cycles (A manages B while B manages A)
      if (manager.managerId === employee.id) {
        return NextResponse.json(
          { error: "Cannot assign: this would create a circular reporting chain" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { managerId },
      select: {
        id: true,
        name: true,
        managerId: true,
        manager: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("Error assigning manager:", error);
    return NextResponse.json({ error: "Failed to assign manager" }, { status: 500 });
  }
}
