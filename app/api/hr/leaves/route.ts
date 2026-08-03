import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/roleAuth";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user || !["HR", "ADMIN", "MANAGER"].includes(authResult.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const employees = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: {
        id: true,
        name: true,
        employmentInfo: { select: { department: { select: { name: true } } } },
        leaveBalance: true,
        monthlyLeaveBalances: {
          where: { year, month },
        }
      },
      orderBy: { name: "asc" },
    });

    const settings = await prisma.leaveSettings.findFirst();

    return NextResponse.json({ employees, settings, month, year });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user || !["HR", "ADMIN"].includes(authResult.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { updates, month, year } = body;

    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    const results = await Promise.all(
      updates.map(async (u: any) => {
        const { userId, previousLeaves, currentMonthLeaves, compensatoryOff } = u;

        return prisma.monthlyLeaveBalance.upsert({
          where: {
            userId_year_month: {
              userId,
              year: currentYear,
              month: currentMonth,
            }
          },
          update: {
            ...(previousLeaves !== undefined && { previousLeaves: parseFloat(previousLeaves) || 0 }),
            ...(currentMonthLeaves !== undefined && { currentMonthLeaves: parseFloat(currentMonthLeaves) || 0 }),
            ...(compensatoryOff !== undefined && { compensatoryOff: parseFloat(compensatoryOff) || 0 }),
          },
          create: {
            userId,
            year: currentYear,
            month: currentMonth,
            previousLeaves: parseFloat(previousLeaves) || 0,
            currentMonthLeaves: parseFloat(currentMonthLeaves) || 0,
            compensatoryOff: parseFloat(compensatoryOff) || 0,
          }
        });
      })
    );

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
