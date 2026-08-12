import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

// GET /api/leaves/types - Active leave types available for applying
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const types = await prisma.leaveType.findMany({
      where: { active: true },
      orderBy: [{ isPaid: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        monthlyCredit: true,
        isPaid: true,
      },
    });

    return NextResponse.json({ success: true, types });
  } catch (error) {
    console.error("Error fetching leave types:", error);
    return NextResponse.json({ error: "Failed to fetch leave types" }, { status: 500 });
  }
}
