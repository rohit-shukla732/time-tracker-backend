import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/roleAuth";

// GET /api/leaves/[id] - Get single leave request
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
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

    if (!leave) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    // Check permissions
    if (
      authResult.user.role === "EMPLOYEE" &&
      leave.userId !== authResult.user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ success: true, leave });
  } catch (error) {
    console.error("Error fetching leave:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave" },
      { status: 500 }
    );
  }
}

// DELETE /api/leaves/[id] - Delete/Cancel leave request
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    // Only creator can delete pending requests, or HR/ADMIN can delete any
    if (
      leave.userId !== authResult.user.id &&
      authResult.user.role !== "HR" &&
      authResult.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // If approved, update leave balance
    if (leave.status === "APPROVED") {
      const currentYear = new Date().getFullYear();
      const leaveBalance = await prisma.leaveBalance.findUnique({
        where: {
          userId_year: {
            userId: leave.userId,
            year: currentYear,
          },
        },
      });

      if (leaveBalance) {
        // Restore leave balance
        const updateData: any = {};
        switch (leave.type) {
          case "SICK":
            updateData.sickUsed = Math.max(0, leaveBalance.sickUsed - leave.days);
            break;
          case "CASUAL":
            updateData.casualUsed = Math.max(0, leaveBalance.casualUsed - leave.days);
            break;
          case "ANNUAL":
            updateData.annualUsed = Math.max(0, leaveBalance.annualUsed - leave.days);
            break;
          case "MATERNITY":
            updateData.maternityUsed = Math.max(0, leaveBalance.maternityUsed - leave.days);
            break;
          case "PATERNITY":
            updateData.paternityUsed = Math.max(0, leaveBalance.paternityUsed - leave.days);
            break;
          case "COMPENSATORY":
            updateData.compensatoryUsed = Math.max(0, leaveBalance.compensatoryUsed - leave.days);
            break;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.leaveBalance.update({
            where: { id: leaveBalance.id },
            data: updateData,
          });
        }
      }
    }

    await prisma.leaveRequest.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling leave:", error);
    return NextResponse.json(
      { error: "Failed to cancel leave" },
      { status: 500 }
    );
  }
}
