import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/roleAuth";

// GET /api/hr/settings - Get leave settings
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

    // Get settings, create default if doesn't exist
    let settings = await prisma.leaveSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.leaveSettings.create({
        data: {
          monthlySickLeave: 1,
          monthlyCasualLeave: 0.83, // ~10 per year
          monthlyAnnualLeave: 1.67, // ~20 per year
          allowMonthlyRollover: false,
          allowYearlyRollover: false,
          annualSickLeave: 12,
          annualCasualLeave: 10,
          annualAnnualLeave: 20,
          annualMaternityLeave: 180,
          annualPaternityLeave: 7,
          lateComingCredits: 60,
          lateThresholdMinutes: 15,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching leave settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT /api/hr/settings - Update leave settings
export async function PUT(req: NextRequest) {
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
    const {
      monthlySickLeave,
      monthlyCasualLeave,
      monthlyAnnualLeave,
      allowMonthlyRollover,
      allowYearlyRollover,
      maxMonthlyRollover,
      maxYearlyRollover,
      annualSickLeave,
      annualCasualLeave,
      annualAnnualLeave,
      annualMaternityLeave,
      annualPaternityLeave,
      lateComingCredits,
      lateThresholdMinutes,
    } = body;

    // Get existing settings or create new
    let settings = await prisma.leaveSettings.findFirst();

    const data = {
      monthlySickLeave: monthlySickLeave !== undefined ? monthlySickLeave : settings?.monthlySickLeave || 0,
      monthlyCasualLeave: monthlyCasualLeave !== undefined ? monthlyCasualLeave : settings?.monthlyCasualLeave || 0,
      monthlyAnnualLeave: monthlyAnnualLeave !== undefined ? monthlyAnnualLeave : settings?.monthlyAnnualLeave || 0,
      allowMonthlyRollover: allowMonthlyRollover !== undefined ? allowMonthlyRollover : settings?.allowMonthlyRollover || false,
      allowYearlyRollover: allowYearlyRollover !== undefined ? allowYearlyRollover : settings?.allowYearlyRollover || false,
      maxMonthlyRollover: maxMonthlyRollover !== undefined ? maxMonthlyRollover : settings?.maxMonthlyRollover || null,
      maxYearlyRollover: maxYearlyRollover !== undefined ? maxYearlyRollover : settings?.maxYearlyRollover || null,
      annualSickLeave: annualSickLeave !== undefined ? annualSickLeave : settings?.annualSickLeave || 12,
      annualCasualLeave: annualCasualLeave !== undefined ? annualCasualLeave : settings?.annualCasualLeave || 10,
      annualAnnualLeave: annualAnnualLeave !== undefined ? annualAnnualLeave : settings?.annualAnnualLeave || 20,
      annualMaternityLeave: annualMaternityLeave !== undefined ? annualMaternityLeave : settings?.annualMaternityLeave || 180,
      annualPaternityLeave: annualPaternityLeave !== undefined ? annualPaternityLeave : settings?.annualPaternityLeave || 7,
      lateComingCredits: lateComingCredits !== undefined ? lateComingCredits : settings?.lateComingCredits || 60,
      lateThresholdMinutes: lateThresholdMinutes !== undefined ? lateThresholdMinutes : settings?.lateThresholdMinutes || 15,
    };

    if (settings) {
      settings = await prisma.leaveSettings.update({
        where: { id: settings.id },
        data,
      });
    } else {
      settings = await prisma.leaveSettings.create({
        data,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating leave settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
