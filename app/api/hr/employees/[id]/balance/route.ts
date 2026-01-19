import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/roleAuth";

// GET /api/hr/employees/[id]/balance - Get employee leave balance
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_year: {
          userId: params.id,
          year: currentYear,
        },
      },
    });

    if (!balance) {
      return NextResponse.json({ error: "Balance not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, balance });
  } catch (error) {
    console.error("Error fetching balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    );
  }
}

// PUT /api/hr/employees/[id]/balance - Update employee leave balance
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
      sickLeave,
      casualLeave,
      annualLeave,
      maternityLeave,
      paternityLeave,
      compensatoryOff,
      year,
    } = body;

    const currentYear = year || new Date().getFullYear();

    // Check if balance exists
    const existingBalance = await prisma.leaveBalance.findUnique({
      where: {
        userId_year: {
          userId: params.id,
          year: currentYear,
        },
      },
    });

    let balance;
    if (existingBalance) {
      // Update existing balance
      balance = await prisma.leaveBalance.update({
        where: { id: existingBalance.id },
        data: {
          sickLeave: sickLeave !== undefined ? sickLeave : existingBalance.sickLeave,
          casualLeave: casualLeave !== undefined ? casualLeave : existingBalance.casualLeave,
          annualLeave: annualLeave !== undefined ? annualLeave : existingBalance.annualLeave,
          maternityLeave: maternityLeave !== undefined ? maternityLeave : existingBalance.maternityLeave,
          paternityLeave: paternityLeave !== undefined ? paternityLeave : existingBalance.paternityLeave,
          compensatoryOff: compensatoryOff !== undefined ? compensatoryOff : existingBalance.compensatoryOff,
        },
      });
    } else {
      // Create new balance
      balance = await prisma.leaveBalance.create({
        data: {
          userId: params.id,
          year: currentYear,
          sickLeave: sickLeave || 12,
          casualLeave: casualLeave || 10,
          annualLeave: annualLeave || 20,
          maternityLeave: maternityLeave || 180,
          paternityLeave: paternityLeave || 7,
          compensatoryOff: compensatoryOff || 0,
        },
      });
    }

    return NextResponse.json({ success: true, balance });
  } catch (error) {
    console.error("Error updating balance:", error);
    return NextResponse.json(
      { error: "Failed to update balance" },
      { status: 500 }
    );
  }
}

// POST /api/hr/employees/[id]/balance - Initialize leave balance for employee
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { year } = body;
    const currentYear = year || new Date().getFullYear();

    // Check if already exists
    const existing = await prisma.leaveBalance.findUnique({
      where: {
        userId_year: {
          userId: params.id,
          year: currentYear,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Balance already exists for this year" },
        { status: 400 }
      );
    }

    // Create default balance
    const balance = await prisma.leaveBalance.create({
      data: {
        userId: params.id,
        year: currentYear,
      },
    });

    return NextResponse.json({ success: true, balance }, { status: 201 });
  } catch (error) {
    console.error("Error creating balance:", error);
    return NextResponse.json(
      { error: "Failed to create balance" },
      { status: 500 }
    );
  }
}
