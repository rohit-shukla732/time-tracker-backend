import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/roleAuth";

// GET /api/leaves - Get leave requests
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    let whereClause: any = {};

    // Role-based filtering
    if (authResult.user.role === "EMPLOYEE") {
      whereClause.userId = authResult.user.id;
    } else if (authResult.user.role === "MANAGER") {
      // Managers see their team's leave requests
      const team = await prisma.team.findFirst({
        where: { managerId: authResult.user.id },
      });

      if (team) {
        const teamMembers = await prisma.user.findMany({
          where: { teamId: team.id },
          select: { id: true },
        });

        whereClause.userId = {
          in: teamMembers.map((m: { id: string }) => m.id),
        };
      }
    }
    // HR and ADMIN see all leave requests

    // Apply filters
    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    const leaves = await prisma.leaveRequest.findMany({
      where: whereClause,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, leaves });
  } catch (error) {
    console.error("Error fetching leaves:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaves" },
      { status: 500 }
    );
  }
}

// POST /api/leaves - Create new leave request
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await req.json();
    const { type, startDate, endDate, days, reason, attachment } = body;

    if (!type || !startDate || !endDate || !days || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check leave balance
    const currentYear = new Date().getFullYear();
    let leaveBalance = await prisma.leaveBalance.findUnique({
      where: {
        userId_year: {
          userId: authResult.user.id,
          year: currentYear,
        },
      },
    });

    // Create leave balance if it doesn't exist
    if (!leaveBalance) {
      leaveBalance = await prisma.leaveBalance.create({
        data: {
          userId: authResult.user.id,
          year: currentYear,
        },
      });
    }

    // Validate leave balance
    const balanceCheck = validateLeaveBalance(leaveBalance, type, days);
    if (!balanceCheck.valid) {
      return NextResponse.json(
        { error: balanceCheck.message },
        { status: 400 }
      );
    }

    // Create leave request
    const leave = await prisma.leaveRequest.create({
      data: {
        userId: authResult.user.id,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days,
        reason,
        attachment,
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, leave }, { status: 201 });
  } catch (error) {
    console.error("Error creating leave request:", error);
    return NextResponse.json(
      { error: "Failed to create leave request" },
      { status: 500 }
    );
  }
}

function validateLeaveBalance(
  balance: any,
  type: string,
  requestedDays: number
): { valid: boolean; message?: string } {
  let available = 0;
  let used = 0;

  switch (type) {
    case "SICK":
      available = balance.sickLeave;
      used = balance.sickUsed;
      break;
    case "CASUAL":
      available = balance.casualLeave;
      used = balance.casualUsed;
      break;
    case "ANNUAL":
      available = balance.annualLeave;
      used = balance.annualUsed;
      break;
    case "MATERNITY":
      available = balance.maternityLeave;
      used = balance.maternityUsed;
      break;
    case "PATERNITY":
      available = balance.paternityLeave;
      used = balance.paternityUsed;
      break;
    case "COMPENSATORY":
      available = balance.compensatoryOff;
      used = balance.compensatoryUsed;
      break;
    case "UNPAID":
      return { valid: true }; // Unpaid leave has no balance limit
    default:
      return { valid: false, message: "Invalid leave type" };
  }

  const remaining = available - used;
  if (requestedDays > remaining) {
    return {
      valid: false,
      message: `Insufficient leave balance. Available: ${remaining} days`,
    };
  }

  return { valid: true };
}
