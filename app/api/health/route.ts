import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Time Tracker Backend is running',
    timestamp: new Date().toISOString()
  });
}