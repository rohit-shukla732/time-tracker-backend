import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

// GET /api/hr/users/[id]/opening-balances - Opening leave balances for a user (HR/ADMIN)
// Params: year (default: current)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id: userId } = await params;

  try {
    const year = parseInt(new URL(req.url).searchParams.get("year") || String(new Date().getFullYear()));

    const [user, types, rows] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      prisma.leaveType.findMany({
        where: { active: true },
        orderBy: [{ isPaid: "desc" }, { name: "asc" }],
        select: { id: true, name: true, isPaid: true },
      }),
      prisma.leaveOpeningBalance.findMany({
        where: { userId, year },
        select: { leaveTypeId: true, balance: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = new Map(rows.map((r) => [r.leaveTypeId, r.balance]));

    return NextResponse.json({
      success: true,
      year,
      balances: types.map((t) => ({
        leaveTypeId: t.id,
        name: t.name,
        isPaid: t.isPaid,
        balance: existing.get(t.id) || 0,
      })),
    });
  } catch (error) {
    console.error("Error fetching opening balances:", error);
    return NextResponse.json({ error: "Failed to fetch opening balances" }, { status: 500 });
  }
}

// PUT /api/hr/users/[id]/opening-balances - Set opening balances for a user (HR/ADMIN)
// Body: { year?, balances: [{ leaveTypeId, balance }] } (balance 0 = no opening balance)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id: userId } = await params;

  try {
    const body = await req.json();
    const year = parseInt(body.year || String(new Date().getFullYear()));
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }
    if (!Array.isArray(body.balances)) {
      return NextResponse.json({ error: "balances array is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const validTypes = await prisma.leaveType.findMany({
      where: { active: true },
      select: { id: true },
    });
    const validTypeIds = new Set(validTypes.map((t) => t.id));

    const entries: { leaveTypeId: string; balance: number }[] = [];
    for (const item of body.balances) {
      const leaveTypeId = String(item.leaveTypeId || "");
      const balance = Number(item.balance);
      if (!validTypeIds.has(leaveTypeId)) {
        return NextResponse.json({ error: "Invalid leave type" }, { status: 400 });
      }
      if (isNaN(balance) || balance < 0) {
        return NextResponse.json({ error: "Balance must be a positive number" }, { status: 400 });
      }
      entries.push({ leaveTypeId, balance: Math.round(balance * 100) / 100 });
    }

    await prisma.$transaction(
      entries.map((e) =>
        e.balance > 0
          ? prisma.leaveOpeningBalance.upsert({
              where: { userId_leaveTypeId_year: { userId, leaveTypeId: e.leaveTypeId, year } },
              update: { balance: e.balance },
              create: { userId, leaveTypeId: e.leaveTypeId, year, balance: e.balance },
            })
          : prisma.leaveOpeningBalance.deleteMany({
              where: { userId, leaveTypeId: e.leaveTypeId, year },
            })
      )
    );

    return NextResponse.json({ success: true, year, message: "Opening balances saved" });
  } catch (error) {
    console.error("Error saving opening balances:", error);
    return NextResponse.json({ error: "Failed to save opening balances" }, { status: 500 });
  }
}
