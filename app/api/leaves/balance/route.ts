import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/roleAuth";

// GET /api/leaves/balance - Get leave balance
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || authResult.user.id;

    // Only HR/ADMIN can check other users' balance
    if (
      userId !== authResult.user.id &&
      authResult.user.role !== "HR" &&
      authResult.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const currentYear = new Date().getFullYear();
    let balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_year: {
          userId,
          year: currentYear,
        },
      },
    });

    // Create if doesn't exist
    if (!balance) {
      balance = await prisma.leaveBalance.create({
        data: {
          userId,
          year: currentYear,
        },
      });
    }

    // Calculate remaining balances
    const balanceData = {
      sick: {
        total: balance.sickLeave,
        used: balance.sickUsed,
        remaining: balance.sickLeave - balance.sickUsed,
      },
      casual: {
        total: balance.casualLeave,
        used: balance.casualUsed,
        remaining: balance.casualLeave - balance.casualUsed,
      },
      annual: {
        total: balance.annualLeave,
        used: balance.annualUsed,
        remaining: balance.annualLeave - balance.annualUsed,
      },
      maternity: {
        total: balance.maternityLeave,
        used: balance.maternityUsed,
        remaining: balance.maternityLeave - balance.maternityUsed,
      },
      paternity: {
        total: balance.paternityLeave,
        used: balance.paternityUsed,
        remaining: balance.paternityLeave - balance.paternityUsed,
      },
      compensatory: {
        total: balance.compensatoryOff,
        used: balance.compensatoryUsed,
        remaining: balance.compensatoryOff - balance.compensatoryUsed,
      },
      year: balance.year,
    };

    return NextResponse.json({ success: true, balance: balanceData });
  } catch (error) {
    console.error("Error fetching leave balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave balance" },
      { status: 500 }
    );
  }
}
