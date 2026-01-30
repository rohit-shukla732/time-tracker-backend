import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireAuth } from '../../../../lib/roleAuth';
import { logger } from '../../../../lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const auth = await requireAuth(request);
    if (auth.error || !auth.user) {
      logger.warn("POST /api/session/start - Unauthorized");
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const {sessionId, timestamp, rawEvent} = await request.json();
    logger.info("POST /api/session/start - Starting session", { userId: auth.user.id, sessionId });

  const startedAt = new Date(timestamp);

  await prisma.session.create({
    data: {
      sessionId,
      userId: auth.user.id,
      startedAt,
      rawStartEvent: JSON.stringify(rawEvent),
    },
  });

  // Clear the forceStart signal now that the session has actually started
  await (prisma as any).deviceControl.updateMany({
    where: { userId: auth.user.id, forceStart: true },
    data: { forceStart: false },
  });

    logger.info("POST /api/session/start - Session started", { sessionId, userId: auth.user.id });
    logger.response("POST", "/api/session/start", 200, Date.now() - startTime);
    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error & { code?: string };
    logger.error("POST /api/session/start - Failed", error);
    return NextResponse.json({ error: "Server error", message: error.message }, { status: 500 });
  }
}
