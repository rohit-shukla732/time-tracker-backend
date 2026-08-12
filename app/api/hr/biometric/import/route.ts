import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { runBiometricImport } from "@/lib/biometric";

// POST /api/hr/biometric/import - Run a biometric import now (HR/ADMIN)
// Optional body: { punches: [...] } to test with sample data, forceApply: true,
// full: true to re-fetch everything (no ?since= window)
export async function POST(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const result = await runBiometricImport({
      punches: Array.isArray(body?.punches) ? body.punches : undefined,
      forceApply: body?.forceApply,
      since: body?.full ? null : undefined,
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
