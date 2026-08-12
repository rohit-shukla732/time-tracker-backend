import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

// PATCH /api/hr/leave-types/[id] - Update a leave type (HR/ADMIN)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id } = await params;

  try {
    const existing = await prisma.leaveType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Leave type not found" }, { status: 404 });
    }

    const body = await req.json();
    const data: any = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "Leave type name is required" }, { status: 400 });
      }
      data.name = name;
    }
    if (body.description !== undefined) {
      data.description = body.description ? String(body.description).trim() : null;
    }
    if (body.monthlyCredit !== undefined) {
      const monthlyCredit = Number(body.monthlyCredit);
      if (isNaN(monthlyCredit) || monthlyCredit < 0) {
        return NextResponse.json({ error: "Monthly credit must be a positive number" }, { status: 400 });
      }
      data.monthlyCredit = monthlyCredit;
    }
    if (body.isPaid !== undefined) data.isPaid = Boolean(body.isPaid);
    if (body.active !== undefined) data.active = Boolean(body.active);
    if (body.rolloverMonthly !== undefined) data.rolloverMonthly = Boolean(body.rolloverMonthly);
    if (body.rolloverYearly !== undefined) data.rolloverYearly = Boolean(body.rolloverYearly);

    const type = await prisma.leaveType.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, type });
  } catch (error: any) {
    console.error("Error updating leave type:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "A leave type with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update leave type" }, { status: 500 });
  }
}

// DELETE /api/hr/leave-types/[id] - Delete a leave type (HR/ADMIN)
// Soft-deletes (deactivates) when requests exist to preserve history.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id } = await params;

  try {
    const existing = await prisma.leaveType.findUnique({
      where: { id },
      include: { _count: { select: { requests: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Leave type not found" }, { status: 404 });
    }

    if (existing._count.requests > 0) {
      await prisma.leaveType.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({
        success: true,
        deactivated: true,
        message: "Leave type has requests, so it was deactivated instead of deleted.",
      });
    }

    await prisma.leaveType.delete({ where: { id } });
    return NextResponse.json({ success: true, deactivated: false });
  } catch (error) {
    console.error("Error deleting leave type:", error);
    return NextResponse.json({ error: "Failed to delete leave type" }, { status: 500 });
  }
}
