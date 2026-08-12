import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { computeBalancesForUsers } from "@/lib/leaveUtils";
import { computeAttendanceSummaries, listAttendanceTypes } from "@/lib/attendanceUtils";

// GET /api/hr/leaves/balances - Leave balances + attendance summary for all employees (HR/ADMIN)
// Params: search, role, year, page, limit
export async function GET(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "25"), 1), 100);
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const where: any = { isArchived: false };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { id: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const [users, totalCount, types, attendanceTypes] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          managerId: true,
          isProbation: true,
          createdAt: true,
          manager: { select: { id: true, name: true } },
          shiftGroup: { select: { id: true, name: true, startTime: true, endTime: true } },
        },
      }),
      prisma.user.count({ where }),
      prisma.leaveType.findMany({
        where: { active: true },
        orderBy: [{ isPaid: "desc" }, { name: "asc" }],
      }),
      listAttendanceTypes(),
    ]);

    const [balances, attendanceSummaries] = await Promise.all([
      computeBalancesForUsers(users, types, year),
      computeAttendanceSummaries(
        users.map((u) => u.id),
        year
      ),
    ]);

    const rows = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      manager: user.manager,
      isProbation: user.isProbation,
      joinedAt: user.createdAt,
      shiftGroup: user.shiftGroup,
      balances: balances.get(user.id) || [],
      attendanceSummary: attendanceSummaries.get(user.id) || {},
    }));

    return NextResponse.json({
      success: true,
      year,
      rows,
      attendanceTypes,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching leave balances:", error);
    return NextResponse.json({ error: "Failed to fetch leave balances" }, { status: 500 });
  }
}
