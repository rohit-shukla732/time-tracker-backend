import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/roleAuth';
import { queryBiometric } from '@/lib/mssql';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST /api/attendance/biometric-sync
 *
 * Reads today's biometric events and updates DeviceControl so that:
 *   • Employee checks IN  (IOType = 0) → forceStart = true,  forceStop = false
 *   • Employee checks OUT (IOType = 1) → forceStop  = true,  forceStart = false
 *
 * The client app detects forceStart via heartbeat and begins recording.
 * The client detects forceStop via heartbeat and stops recording.
 *
 * Only HR / ADMIN may call this endpoint (or use the public key param for
 * cron / scheduled calls).
 *
 * Query params:
 *   date        – YYYY-MM-DD  (defaults to today)
 *   employeeId  – process only this employee
 *   sinceMinutes – only consider events from the last N minutes (default: 10)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Allow HR/ADMIN or a server-side cron using the internal cron key
    const cronKey = request.headers.get('x-cron-key');
    const validCronKey = process.env.CRON_SECRET;
    const isValidCron = validCronKey && cronKey === validCronKey;

    if (!isValidCron) {
      const authResult = await requireAuth(request);
      if (authResult.error || !authResult.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (!['HR', 'ADMIN'].includes(authResult.user.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const employeeId = searchParams.get('employeeId');
    const sinceMinutes = parseInt(searchParams.get('sinceMinutes') || '10', 10);

    logger.info('POST /api/attendance/biometric-sync - Syncing', { date, sinceMinutes, employeeId });

    // -----------------------------------------------------------------------
    // 1. Query biometric system for the latest event per user
    // -----------------------------------------------------------------------
    let query = `
      SELECT
        b.UserID,
        b.IDateTime,
        b.IOType,
        CASE WHEN b.IOType = 0 THEN 'IN' WHEN b.IOType = 1 THEN 'OUT' ELSE 'UNKNOWN' END AS Status
      FROM Mx_ACSEventTrn b
      INNER JOIN (
        SELECT UserID, MAX(IDateTime) AS LatestTime
        FROM Mx_ACSEventTrn
        WHERE CAST(IDateTime AS DATE) = @date
        GROUP BY UserID
      ) latest ON b.UserID = latest.UserID AND b.IDateTime = latest.LatestTime
      WHERE CAST(b.IDateTime AS DATE) = @date
    `;

    const params: Record<string, any> = { date };

    if (employeeId) {
      query += ` AND b.UserID = @employeeId`;
      params.employeeId = employeeId.trim();
    }

    if (sinceMinutes > 0) {
      query += ` AND b.IDateTime >= DATEADD(MINUTE, -@sinceMinutes, GETDATE())`;
      params.sinceMinutes = sinceMinutes;
    }

    const result = await queryBiometric(query, params);
    const events = result.recordset as Array<{
      UserID: string;
      IDateTime: Date;
      IOType: number;
      Status: string;
    }>;

    logger.info('POST /api/attendance/biometric-sync - Biometric events fetched', { count: events.length });

    if (events.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new biometric events to process',
        processed: 0,
        skipped: 0,
        date,
      });
    }

    // -----------------------------------------------------------------------
    // 2. Map biometric UserID → app User.id  (they are the same value, e.g. "ACE001")
    //    Verify the user exists in our DB before touching DeviceControl
    // -----------------------------------------------------------------------
    const biometricUserIds = [...new Set(events.map((e) => e.UserID))];

    const appUsers = await prisma.user.findMany({
      where: { id: { in: biometricUserIds } },
      select: { id: true },
    });
    const validUserIds = new Set(appUsers.map((u) => u.id));

    // -----------------------------------------------------------------------
    // 3. Upsert DeviceControl for each matched user
    // -----------------------------------------------------------------------
    let processed = 0;
    let skipped = 0;
    const details: Array<{ userId: string; action: string; biometricTime: string }> = [];

    for (const event of events) {
      const userId = event.UserID;

      if (!validUserIds.has(userId)) {
        skipped++;
        continue;
      }

      const isIn  = event.IOType === 0;
      const isOut = event.IOType === 1;

      if (!isIn && !isOut) {
        skipped++;
        continue;
      }

      await (prisma as any).deviceControl.upsert({
        where: { userId },
        create: {
          userId,
          forceStart: isIn,
          forceStop:  isOut,
          startedAt:  isIn  ? new Date(event.IDateTime) : null,
          startedBy:  isIn  ? 'biometric' : null,
          stoppedAt:  isOut ? new Date(event.IDateTime) : null,
          stoppedBy:  isOut ? 'biometric' : null,
          reason:     isOut ? 'Biometric check-out' : null,
        },
        update: {
          forceStart: isIn,
          forceStop:  isOut,
          startedAt:  isIn  ? new Date(event.IDateTime) : undefined,
          startedBy:  isIn  ? 'biometric' : undefined,
          stoppedAt:  isOut ? new Date(event.IDateTime) : undefined,
          stoppedBy:  isOut ? 'biometric' : undefined,
          reason:     isOut ? 'Biometric check-out' : null,
        },
      });

      details.push({
        userId,
        action: isIn ? 'forceStart' : 'forceStop',
        biometricTime: event.IDateTime.toISOString(),
      });
      processed++;
    }

    logger.info('POST /api/attendance/biometric-sync - Done', { processed, skipped });
    logger.response('POST', '/api/attendance/biometric-sync', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      date,
      processed,
      skipped,
      details,
    });
  } catch (error: any) {
    logger.error('POST /api/attendance/biometric-sync - Failed', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync biometric attendance', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/attendance/biometric-sync
 * Quick status check – returns today's biometric events without touching DeviceControl.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['HR', 'ADMIN'].includes(authResult.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];

    const result = await queryBiometric(
      `SELECT UserID, IDateTime, IOType,
         CASE WHEN IOType = 0 THEN 'IN' WHEN IOType = 1 THEN 'OUT' ELSE 'UNKNOWN' END AS Status
       FROM Mx_ACSEventTrn
       WHERE CAST(IDateTime AS DATE) = @date
       ORDER BY IDateTime DESC`,
      { date }
    );

    return NextResponse.json({
      success: true,
      date,
      count: result.recordset.length,
      records: result.recordset,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
