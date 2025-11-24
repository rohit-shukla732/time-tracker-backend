import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireAuth } from '../../../../lib/requireAuth';

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if ('error' in auth || !auth.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const {sessionId, timestamp, rawEvent} = await request.json();

  const startedAt = new Date(timestamp);

  const user = auth.user as { id: string };

  await prisma.session.create({
    data: {
      sessionId,
      userId: user.id,
      startedAt,
      rawStartEvent: JSON.stringify(rawEvent),
    },
  });

  return NextResponse.json({ success: true });
}
