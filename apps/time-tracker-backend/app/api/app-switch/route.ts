import { NextRequest, NextResponse } from "next/server";
import { appSwitchStore } from "./store";
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // basic validation
    if (!data?.sessionId || typeof data.sessionId !== "string") {
      return NextResponse.json(
        { success: false, error: "sessionId is required" },
        { status: 400 }
      );
    }

    const record = {
      id: crypto.randomUUID(),
      sessionId: data.sessionId,
      type: data?.type || "app_switch",
      from: data?.fromApp || "unknown",
      to: data?.toApp || "unknown",
      durationMs: data?.durationMs || 0,
      timestamp: data?.timestamp || new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    };

    appSwitchStore.push(record);
    return NextResponse.json({ success: true, id: record.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json(appSwitchStore); // for debugging
}
