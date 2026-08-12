import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

// GET /api/leaves/approvals - Pending leave requests I need to review
// - MANAGER/SENIOR_MANAGER: requests from employees where requester.managerId === me
// - HR/ADMIN: requests from anyone without a manager (managers, HR, admins report to HR)
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const isHr = authResult.user.role === "HR" || authResult.user.role === "ADMIN";
  const isManager =
    authResult.user.role === "MANAGER" || authResult.user.role === "SENIOR_MANAGER";

  if (!isHr && !isManager) {
    return unauthorizedResponse("Access denied. Manager or HR privileges required.");
  }

  try {
    const requests = await prisma.leaveRequest.findMany({
      where: {
        status: "PENDING",
        user: isHr
          ? { isArchived: false }
          : { isArchived: false, managerId: authResult.user.id },
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, managerId: true } },
        leaveType: { select: { id: true, name: true, isPaid: true } },
      },
      orderBy: { startDate: "asc" },
    });

    const pendingCount = requests.length;

    return NextResponse.json({ success: true, requests, pendingCount });
  } catch (error) {
    console.error("Error fetching leave approvals:", error);
    return NextResponse.json({ error: "Failed to fetch leave approvals" }, { status: 500 });
  }
}
