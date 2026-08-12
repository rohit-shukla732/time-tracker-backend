import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { getBiometricConfig } from "@/lib/biometric";

// GET /api/hr/biometric/config - Biometric & late policy config (HR/ADMIN)
export async function GET(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }
  const cfg = await getBiometricConfig();
  return NextResponse.json({ success: true, config: cfg });
}

// PUT /api/hr/biometric/config - Update biometric & late policy config (HR/ADMIN)
export async function PUT(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const body = await req.json();
    const data: any = {};

    if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);
    if (body.sourceUrl !== undefined) {
      const url = String(body.sourceUrl || "").trim();
      if (url && !/^https?:\/\//i.test(url)) {
        return NextResponse.json({ error: "Source URL must start with http:// or https://" }, { status: 400 });
      }
      data.sourceUrl = url || null;
    }
    if (body.sourceToken !== undefined) {
      data.sourceToken = String(body.sourceToken || "").trim() || null;
    }
    if (body.sourceApiKey !== undefined) {
      data.sourceApiKey = String(body.sourceApiKey || "").trim() || null;
    }
    if (body.pollIntervalMinutes !== undefined) {
      const v = parseInt(body.pollIntervalMinutes);
      if (isNaN(v) || v < 1 || v > 1440) {
        return NextResponse.json({ error: "Poll interval must be between 1 and 1440 minutes" }, { status: 400 });
      }
      data.pollIntervalMinutes = v;
    }
    if (body.shiftStart !== undefined) {
      if (!/^\d{1,2}:\d{2}$/.test(String(body.shiftStart))) {
        return NextResponse.json({ error: "Shift start must be HH:MM" }, { status: 400 });
      }
      data.shiftStart = String(body.shiftStart);
    }
    if (body.shiftEnd !== undefined) {
      if (!/^\d{1,2}:\d{2}$/.test(String(body.shiftEnd))) {
        return NextResponse.json({ error: "Shift end must be HH:MM" }, { status: 400 });
      }
      data.shiftEnd = String(body.shiftEnd);
    }
    if (body.halfDayThresholdMin !== undefined) {
      const v = parseInt(body.halfDayThresholdMin);
      if (isNaN(v) || v < 0) {
        return NextResponse.json({ error: "Half-day threshold must be a positive number" }, { status: 400 });
      }
      data.halfDayThresholdMin = v;
    }
    if (body.lateGraceMinutes !== undefined) {
      const v = parseInt(body.lateGraceMinutes);
      if (isNaN(v) || v < 0) {
        return NextResponse.json({ error: "Late grace must be a positive number" }, { status: 400 });
      }
      data.lateGraceMinutes = v;
    }
    if (body.probationLateGraceMinutes !== undefined) {
      const v = parseInt(body.probationLateGraceMinutes);
      if (isNaN(v) || v < 0) {
        return NextResponse.json({ error: "Probation late grace must be a positive number" }, { status: 400 });
      }
      data.probationLateGraceMinutes = v;
    }
    if (body.autoApply !== undefined) data.autoApply = Boolean(body.autoApply);

    const config = await prisma.biometricConfig.update({ where: { id: 1 }, data });
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Error updating biometric config:", error);
    return NextResponse.json({ error: "Failed to update biometric config" }, { status: 500 });
  }
}
