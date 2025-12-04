import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/requireAuth";
import { prisma } from "../../../../lib/prisma";
import { logger } from "../../../../lib/logger";

// POST /api/device/status - Check if device can resume (called by client app)
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth || "error" in auth || !auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const userId = body?.userId || (auth.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Check device control status
    const deviceControl = await (prisma as any).deviceControl.findUnique({
      where: { userId },
    });

    // If no control record or forceStop is false, allow resume
    const canResume = !deviceControl || !deviceControl.forceStop;

    logger.debug("POST /api/device/status - Status check", { 
      userId, 
      canResume, 
      forceStop: deviceControl?.forceStop 
    });

    return NextResponse.json({
      success: true,
      canResume,
      forceStop: deviceControl?.forceStop || false,
      reason: deviceControl?.reason || null,
      stoppedAt: deviceControl?.stoppedAt || null,
    });
  } catch (error) {
    logger.error("POST /api/device/status - Failed", error as Error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET /api/device/status - Get current user's device status
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth || "error" in auth || !auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = (auth.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    const deviceControl = await (prisma as any).deviceControl.findUnique({
      where: { userId },
    });

    const canResume = !deviceControl || !deviceControl.forceStop;

    return NextResponse.json({
      success: true,
      canResume,
      forceStop: deviceControl?.forceStop || false,
      reason: deviceControl?.reason || null,
      stoppedAt: deviceControl?.stoppedAt || null,
    });
  } catch (error) {
    logger.error("GET /api/device/status - Failed", error as Error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
