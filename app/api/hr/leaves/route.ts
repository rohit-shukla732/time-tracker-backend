import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

// GET /api/hr/leaves - All leave requests with filters (HR/ADMIN)
// Filters: status, leaveTypeId, userId, search, year, page, limit
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

    const status = searchParams.get("status") || "";
    const leaveTypeId = searchParams.get("leaveTypeId") || "";
    const userId = searchParams.get("userId") || "";
    const search = searchParams.get("search") || "";
    const yearParam = parseInt(searchParams.get("year") || "0");

    const where: any = {
      user: { isArchived: false },
    };

    if (yearParam > 0) {
      where.startDate = { lte: new Date(Date.UTC(yearParam, 11, 31, 23, 59, 59, 999)) };
      where.endDate = { gte: new Date(Date.UTC(yearParam, 0, 1)) };
    }

    if (status && ["PENDING", "APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
      where.status = status;
    }

    if (leaveTypeId) {
      where.leaveTypeId = leaveTypeId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (search) {
      where.user = {
        isArchived: false,
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { id: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [requests, totalCount] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          leaveType: { select: { id: true, name: true, isPaid: true } },
          approver: { select: { id: true, name: true } },
          edits: {
            include: { editedBy: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: "desc" as const },
          },
        },
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      requests,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    return NextResponse.json({ error: "Failed to fetch leave requests" }, { status: 500 });
  }
}
