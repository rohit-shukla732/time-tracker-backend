import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/roleAuth";

// POST /api/leaves/[id]/reject - Reject leave request
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user || (authResult.user.role !== "MANAGER" && authResult.user.role !== "HR" && authResult.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { reason } = body;

    const leave = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
    });

    if (!leave) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    if (leave.status !== "PENDING") {
      return NextResponse.json(
        { error: "Leave already processed" },
        { status: 400 }
      );
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, leave: updatedLeave });
  } catch (error) {
    console.error("Error rejecting leave:", error);
    return NextResponse.json(
      { error: "Failed to reject leave" },
      { status: 500 }
    );
  }
}
