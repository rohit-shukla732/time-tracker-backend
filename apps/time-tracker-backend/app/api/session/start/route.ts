import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '../store';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Basic validation
    const sessionId = typeof data?.sessionId === 'string' ? data.sessionId : undefined;
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
    }

    const record = {
      id: crypto.randomUUID(),
      sessionId,
      type: data?.type ?? 'session_start',
      timestamp: data?.timestamp ?? new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      payload: data,
    };

    sessionStore.push(record);

    return NextResponse.json({ success: true, id: record.id }, { status: 201 });
  } catch (err) {
    console.error('[session/start] error:', err);
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }
}

// GET /api/session/start (debug) - returns stored sessions
export async function GET() {
  return NextResponse.json(sessionStore);
}
