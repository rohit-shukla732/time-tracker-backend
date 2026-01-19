import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/roleAuth";

// POST /api/hr/bulk-initialize - Initialize leave balances for all employees
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow HR, ADMIN, and MANAGER roles
    if (authResult.user.role !== "HR" && authResult.user.role !== "ADMIN" && authResult.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const { year, overwrite } = body;
    const targetYear = year || new Date().getFullYear();

    // Get all users without leave balance for the year
    const users = await prisma.user.findMany({
      include: {
        leaveBalance: {
          where: {
            year: targetYear,
          },
        },
      },
    });

    const results = {
      created: 0,
      skipped: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const user of users) {
      try {
        const existingBalance = user.leaveBalance?.year === targetYear ? user.leaveBalance : undefined;

        if (existingBalance && !overwrite) {
          results.skipped++;
          continue;
        }

        if (existingBalance && overwrite) {
          // Update existing
          await prisma.leaveBalance.update({
            where: { id: existingBalance.id },
            data: {
              sickLeave: 12,
              casualLeave: 10,
              annualLeave: 20,
              maternityLeave: 180,
              paternityLeave: 7,
              compensatoryOff: 0,
              sickUsed: 0,
              casualUsed: 0,
              annualUsed: 0,
              maternityUsed: 0,
              paternityUsed: 0,
              compensatoryUsed: 0,
            },
          });
          results.updated++;
        } else {
          // Create new
          await prisma.leaveBalance.create({
            data: {
              userId: user.id,
              year: targetYear,
            },
          });
          results.created++;
        }
      } catch (error: any) {
        results.errors.push(`${user.email}: ${error.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${users.length} employees`,
      results 
    });
  } catch (error) {
    console.error("Error bulk initializing:", error);
    return NextResponse.json(
      { error: "Failed to bulk initialize" },
      { status: 500 }
    );
  }
}
