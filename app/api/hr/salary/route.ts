import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/roleAuth";

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user || !["HR", "ADMIN", "MANAGER"].includes(authResult.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employees = await prisma.user.findMany({
      where: {
        // role: { in: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"] },
        employmentInfo: { status: "ACTIVE" },
      },
      select: {
        id: true,
        name: true,
        employmentInfo: {
          select: {
            ctc: true,
            department: { select: { name: true } },
          },
        },
        employeeSalaries: {
          select: {
            componentId: true,
            amount: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: employees });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user || !["HR", "ADMIN"].includes(authResult.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { updates, ctcUpdates } = await request.json(); 
    
    // Process Employee CTC Updates
    if (ctcUpdates && Array.isArray(ctcUpdates)) {
      await prisma.$transaction(
        ctcUpdates.map((update: any) =>
          prisma.employmentInfo.update({
            where: { userId: update.userId },
            data: { ctc: parseFloat(update.ctc) || 0 }
          })
        )
      );
    }

    if (updates && Array.isArray(updates)) {
      // Use a transaction to apply bulk changes safely
      await prisma.$transaction(
        updates.map((update: any) =>
          prisma.employeeSalary.upsert({
            where: {
              userId_componentId: {
                userId: update.userId,
                componentId: update.componentId,
              },
            },
            update: { amount: parseFloat(update.amount) || 0 },
            create: {
              userId: update.userId,
              componentId: update.componentId,
              amount: parseFloat(update.amount) || 0,
            },
          })
        )
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
