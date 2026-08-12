import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

// GET /api/hr/leave-types - All leave types (HR/ADMIN, includes inactive)
export async function GET(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const types = await prisma.leaveType.findMany({
      orderBy: [{ active: "desc" }, { isPaid: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        monthlyCredit: true,
        isPaid: true,
        active: true,
        rolloverMonthly: true,
        rolloverYearly: true,
        createdAt: true,
        _count: { select: { requests: true } },
      },
    });

    return NextResponse.json({ success: true, types });
  } catch (error) {
    console.error("Error fetching leave types:", error);
    return NextResponse.json({ error: "Failed to fetch leave types" }, { status: 500 });
  }
}

// POST /api/hr/leave-types - Create a leave type (HR/ADMIN)
export async function POST(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const body = await req.json();
    const name = body.name ? String(body.name).trim() : "";
    const description = body.description ? String(body.description).trim() : null;
    const monthlyCredit = Number(body.monthlyCredit ?? 1);
    const isPaid = body.isPaid !== undefined ? Boolean(body.isPaid) : true;
    const active = body.active !== undefined ? Boolean(body.active) : true;
    const rolloverMonthly = body.rolloverMonthly !== undefined ? Boolean(body.rolloverMonthly) : true;
    const rolloverYearly = body.rolloverYearly !== undefined ? Boolean(body.rolloverYearly) : false;

    if (!name) {
      return NextResponse.json({ error: "Leave type name is required" }, { status: 400 });
    }
    if (isNaN(monthlyCredit) || monthlyCredit < 0) {
      return NextResponse.json({ error: "Monthly credit must be a positive number" }, { status: 400 });
    }

    const type = await prisma.leaveType.create({
      data: { name, description, monthlyCredit, isPaid, active, rolloverMonthly, rolloverYearly },
    });

    return NextResponse.json({ success: true, type }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating leave type:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "A leave type with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create leave type" }, { status: 500 });
  }
}
