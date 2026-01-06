import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { fromWebsite, toWebsite, durationMs, browser, timestamp, sessionId } = body;

    logger.info('POST /api/website-visit - Received visit', { 
      sessionId, 
      fromWebsite, 
      toWebsite, 
      browser 
    });

    // Validate required fields
    if (!sessionId) {
      logger.warn('POST /api/website-visit - Missing sessionId');
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    if (!toWebsite) {
      logger.warn('POST /api/website-visit - Missing toWebsite');
      return NextResponse.json(
        { error: 'toWebsite is required' },
        { status: 400 }
      );
    }

    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { sessionId },
    });

    if (!session) {
      logger.warn('POST /api/website-visit - Session not found', { sessionId });
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Parse timestamp
    const visitTimestamp = timestamp ? new Date(timestamp) : new Date();
    const epochMs = visitTimestamp.getTime();

    // Create website visit record
    const websiteVisit = await prisma.websiteVisit.create({
      data: {
        sessionId,
        userId: session.userId,
        fromWebsite: fromWebsite || null,
        toWebsite,
        durationMs: durationMs ? BigInt(durationMs) : null,
        browser: browser || null,
        timestamp: visitTimestamp,
        epochMs: BigInt(epochMs),
        payload: body,
      },
    });

    logger.info(`Website visit recorded | SessionId: ${sessionId}, Website: ${toWebsite}, Browser: ${browser}`);

    logger.response('POST', '/api/website-visit', 200, durationMs);

    return NextResponse.json({
      success: true,
      id: websiteVisit.id,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('POST /api/website-visit - Error recording website visit', error as Error);
    logger.response('POST', '/api/website-visit', 500, durationMs);
    return NextResponse.json(
      { error: 'Failed to record website visit' },
      { status: 500 }
    );
  }
}
