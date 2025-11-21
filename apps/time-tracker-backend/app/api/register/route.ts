import { NextRequest, NextResponse } from "next/server";


export async function POST (request: NextRequest) {
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
        type: data?.type || "register",
        userAgent: data?.userAgent || "unknown",
        timestamp: data?.timestamp || new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        payload: data,
        };

    return NextResponse.json({ success: true, id: record.id }, { status: 201 });
    } catch (err) {

    return NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 }
    );
    }
}
