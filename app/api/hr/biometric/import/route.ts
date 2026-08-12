import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { parseDateUtc, runBiometricImport } from "@/lib/biometric";

// POST /api/hr/biometric/import - Run a biometric import now (HR/ADMIN)
// Optional body:
//   punches: [...]          sample punches to process instead of fetching
//   forceApply: true        mark attendance even if auto-apply is off
//   full: true              re-fetch everything (no ?since= window)
//   fromDate: "YYYY-MM-DD"  fetch punches from this date (inclusive) onwards
//   reapply: true           re-evaluate attendance in the window: existing
//                           biometric-derived records are overwritten (manual
//                           overrides and leave records are kept)
export async function POST(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const body = await req.json().catch(() => ({}));

    let since: Date | null | undefined;
    if (body?.full) {
      since = null;
    } else if (typeof body?.fromDate === "string" && body.fromDate.trim()) {
      const d = parseDateUtc(body.fromDate);
      if (!d) {
        return NextResponse.json(
          { error: "fromDate must be a valid date in YYYY-MM-DD format" },
          { status: 400 }
        );
      }
      since = d;
    }

    const result = await runBiometricImport({
      punches: Array.isArray(body?.punches) ? body.punches : undefined,
      forceApply: body?.forceApply,
      since,
      reapply: body?.reapply === true,
    });
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Error running biometric import:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to run biometric import" },
      { status: 500 }
    );
  }
}
