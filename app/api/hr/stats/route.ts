import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/roleAuth";

// GET /api/hr/stats - Get HR dashboard statistics
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow HR, ADMIN, and MANAGER roles
    if (authResult.user.role !== "HR" && authResult.user.role !== "ADMIN" && authResult.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const currentYear = new Date().getFullYear();

    // Total employees
    const totalEmployees = await prisma.user.count();

    // Employees with leave balance
    const employeesWithBalance = await prisma.leaveBalance.count({
      where: { year: currentYear },
    });

    // Pending leave requests
    const pendingLeaves = await prisma.leaveRequest.count({
      where: { status: "PENDING" },
    });

    // Leave requests this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const leavesThisMonth = await prisma.leaveRequest.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Approved leaves this month
    const approvedThisMonth = await prisma.leaveRequest.count({
      where: {
        status: "APPROVED",
        approvedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Leave type distribution
    const leaveTypeStats = await prisma.leaveRequest.groupBy({
      by: ["type"],
      _count: {
        id: true,
      },
      where: {
        status: "APPROVED",
        createdAt: {
          gte: new Date(currentYear, 0, 1),
        },
      },
    });

    // Most used leave type
    const leaveUsageByType = await prisma.$queryRaw`
      SELECT 
        SUM("sickUsed") as "sickUsed",
        SUM("casualUsed") as "casualUsed",
        SUM("annualUsed") as "annualUsed",
        SUM("maternityUsed") as "maternityUsed",
        SUM("paternityUsed") as "paternityUsed",
        SUM("compensatoryUsed") as "compensatoryUsed"
      FROM "LeaveBalance"
      WHERE "year" = ${currentYear}
    ` as any[];

    return NextResponse.json({
      success: true,
      stats: {
        totalEmployees,
        employeesWithBalance,
        employeesWithoutBalance: totalEmployees - employeesWithBalance,
        pendingLeaves,
        leavesThisMonth,
        approvedThisMonth,
        leaveTypeDistribution: leaveTypeStats,
        leaveUsageByType: leaveUsageByType[0] || {},
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
