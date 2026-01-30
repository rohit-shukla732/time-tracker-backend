import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "../../../../lib/roleAuth";
import { prisma } from "../../../../lib/prisma";
import { logger } from "../../../../lib/logger";

// GET /api/admin/device-control - Get all device control statuses
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);

  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const deviceControls = await prisma.deviceControl.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      devices: deviceControls.map((dc) => ({
        id: dc.id,
        userId: dc.userId,
        userName: dc.user.name,
        userEmail: dc.user.email,
        forceStop: dc.forceStop,
        forceStart: (dc as any).forceStart,
        reason: dc.reason,
        stoppedBy: dc.stoppedBy,
        stoppedAt: dc.stoppedAt,
        startedBy: (dc as any).startedBy,
        startedAt: (dc as any).startedAt,
        updatedAt: dc.updatedAt,
      })),
    });
  } catch (error) {
    logger.error("GET /api/admin/device-control - Failed", error as Error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/admin/device-control - Force stop or resume a user's device
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);

  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { userId, action, reason } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!action || !["stop", "resume", "start"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'stop', 'resume', or 'start'" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isStop = action === "stop";
    const isStart = action === "start";

    // Upsert device control record
    const deviceControl = await (prisma as any).deviceControl.upsert({
      where: { userId },
      create: {
        userId,
        forceStop: isStop,
        forceStart: isStart,
        reason: isStop ? reason || "Stopped by admin" : null,
        stoppedBy: isStop ? authResult.user.id : null,
        stoppedAt: isStop ? new Date() : null,
        startedBy: isStart ? authResult.user.id : null,
        startedAt: isStart ? new Date() : null,
      },
      update: {
        forceStop: isStop,
        forceStart: isStart,
        reason: isStop ? reason || "Stopped by admin" : null,
        stoppedBy: isStop ? authResult.user.id : null,
        stoppedAt: isStop ? new Date() : null,
        startedBy: isStart ? authResult.user.id : null,
        startedAt: isStart ? new Date() : null,
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

    logger.info(`POST /api/admin/device-control - Device ${action}`, {
      userId,
      action,
      reason,
      by: authResult.user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Device ${isStop ? "stopped" : isStart ? "started" : "resumed"} successfully`,
      deviceControl: {
        userId: deviceControl.userId,
        userName: deviceControl.user.name,
        userEmail: deviceControl.user.email,
        forceStop: deviceControl.forceStop,
        forceStart: deviceControl.forceStart,
        reason: deviceControl.reason,
        stoppedBy: deviceControl.stoppedBy,
        stoppedAt: deviceControl.stoppedAt,
        startedBy: deviceControl.startedBy,
        startedAt: deviceControl.startedAt,
      },
    });
  } catch (error) {
    logger.error("POST /api/admin/device-control - Failed", error as Error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
