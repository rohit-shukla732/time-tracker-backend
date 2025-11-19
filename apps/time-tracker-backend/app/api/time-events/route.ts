import { NextRequest, NextResponse } from "next/server";
import { eventStore } from "./store";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    eventStore.push({
      id: crypto.randomUUID(),
      receivedAt: new Date().toISOString(),
      ...data,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json(eventStore); // for debugging
}
