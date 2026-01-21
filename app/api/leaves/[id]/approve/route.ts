import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/roleAuth";

// POST /api/leaves/[id]/approve - Approve leave request
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireAuth(req);
    if (!authResult.user || (authResult.user.role !== "MANAGER" && authResult.user.role !== "HR" && authResult.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    if (leave.status !== "PENDING") {
      return NextResponse.json(
        { error: "Leave already processed" },
        { status: 400 }
      );
    }

    // Update leave balance
    const currentYear = new Date().getFullYear();
    let leaveBalance = await prisma.leaveBalance.findUnique({
      where: {
        userId_year: {
          userId: leave.userId,
          year: currentYear,
        },
      },
    });

    if (!leaveBalance) {
      leaveBalance = await prisma.leaveBalance.create({
        data: {
          userId: leave.userId,
          year: currentYear,
        },
      });
    }

    // Update used leave
    const updateData: any = {};
    switch (leave.type) {
      case "SICK":
        updateData.sickUsed = leaveBalance.sickUsed + leave.days;
        break;
      case "CASUAL":
        updateData.casualUsed = leaveBalance.casualUsed + leave.days;
        break;
      case "ANNUAL":
        updateData.annualUsed = leaveBalance.annualUsed + leave.days;
        break;
      case "MATERNITY":
        updateData.maternityUsed = leaveBalance.maternityUsed + leave.days;
        break;
      case "PATERNITY":
        updateData.paternityUsed = leaveBalance.paternityUsed + leave.days;
        break;
      case "COMPENSATORY":
        updateData.compensatoryUsed = leaveBalance.compensatoryUsed + leave.days;
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.leaveBalance.update({
        where: { id: leaveBalance.id },
        data: updateData,
      });
    }

    // Approve leave
    const updatedLeave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: authResult.user.id,
        approvedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, leave: updatedLeave });
  } catch (error) {
    console.error("Error approving leave:", error);
    return NextResponse.json(
      { error: "Failed to approve leave" },
      { status: 500 }
    );
  }
}
