import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { computeLateSummary } from "@/lib/biometric";

// GET /api/hr/biometric/late?year=2026&month=8 - Monthly late policy summary (HR/ADMIN)
export async function GET(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()));
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));
    if (month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const summary = await computeLateSummary(year, month);
    return NextResponse.json({ success: true, year, month, ...summary });
  } catch (error) {
    console.error("Error fetching late summary:", error);
    return NextResponse.json({ error: "Failed to fetch late summary" }, { status: 500 });
  }
}
