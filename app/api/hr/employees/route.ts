import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/roleAuth";

// GET /api/hr/employees - Get all employees with leave balances
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

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    const employees = await prisma.user.findMany({
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        leaveBalance: true,
        lateComingRecords: {
          where: {
            year: currentYear,
            month: currentMonth,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Get late coming settings
    const settings = await prisma.leaveSettings.findFirst();
    const lateComingCredits = settings?.lateComingCredits || 0;

    return NextResponse.json({ 
      success: true, 
      employees,
      lateComingCredits
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}
