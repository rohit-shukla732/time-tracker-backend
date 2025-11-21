import { NextRequest, NextResponse } from "next/server";
import { eventStore } from "./store";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Basic validation
    if (data.sessionId === undefined || typeof data.sessionId !== 'string') {
      return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 });
    }
    
    const record = {
      id: crypto.randomUUID(),
      sessionId: data.sessionId,
      type: data?.type ?? 'event',
      timestamp: data?.timestamp ?? new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      payload: data,
    };

    eventStore.push(record);

    return NextResponse.json({ success: true, id: record.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json(eventStore); // for debugging
}
