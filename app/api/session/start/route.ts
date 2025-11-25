import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireAuth } from '../../../../lib/roleAuth';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error || !auth.user) {
    return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  const {sessionId, timestamp, rawEvent} = await request.json();

  const startedAt = new Date(timestamp);

  await prisma.session.create({
    data: {
      sessionId,
      userId: auth.user.id,
      startedAt,
      rawStartEvent: JSON.stringify(rawEvent),
    },
  });

  return NextResponse.json({ success: true });
}
