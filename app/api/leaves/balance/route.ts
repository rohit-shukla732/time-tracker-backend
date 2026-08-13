import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { computeTypeBalance } from "@/lib/leaveUtils";

// GET /api/leaves/balance - My leave balance breakdown (optional ?year=)
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const currentUserId = authResult.user.id;

    const [user, types] = await Promise.all([
      prisma.user.findUnique({
        where: { id: currentUserId },
        select: { createdAt: true, isProbation: true },
      }),
      prisma.leaveType.findMany({
        where: { active: true },
        orderBy: [{ isPaid: "desc" }, { name: "asc" }],
      }),
    ]);

    const balances = await Promise.all(
      types.map((type) =>
        computeTypeBalance(currentUserId, user?.createdAt || new Date(), type, year)
      )
    );

    const totalEarned = balances.reduce((s, b) => s + b.earned, 0);
    const totalUsed = balances.reduce((s, b) => s + b.used, 0);
    const totalPending = balances.reduce((s, b) => s + b.pending, 0);
    const totalAvailable = balances.reduce((s, b) => s + b.available, 0);

    return NextResponse.json({
      success: true,
      year,
      isProbation: user?.isProbation || false,
      balances,
      totals: { totalEarned, totalUsed, totalPending, totalAvailable },
    });
  } catch (error) {
    console.error("Error fetching leave balance:", error);
    return NextResponse.json({ error: "Failed to fetch leave balance" }, { status: 500 });
  }
}
