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
    // Use the date from the caller (display page) when provided.
    // When not provided, fall back to the biometric SQL server's own GETDATE()
    // so we never have a Node UTC vs local-timezone mismatch.
    const dateParam = searchParams.get('date');
    const date = dateParam || null;  // null = handled in SQL below
    const employeeId = searchParams.get('employeeId');
    // Default 0 = no time filter — sync ALL of today's latest events.
    const sinceMinutes = parseInt(searchParams.get('sinceMinutes') || '0', 10);

    logger.info('POST /api/attendance/biometric-sync - Syncing', { date: date ?? 'GETDATE()', sinceMinutes, employeeId });

    // -----------------------------------------------------------------------
    // 1. Query biometric system for the latest event per user
    //    Using ROW_NUMBER() to reliably get the last scan per employee.
    //    When no date supplied, use CAST(GETDATE() AS DATE) on the SQL server
    //    so we always use the biometric server's local clock — avoids UTC offset.
    // -----------------------------------------------------------------------
    const dateFilter = date ? `CAST(IDateTime AS DATE) = @date` : `CAST(IDateTime AS DATE) = CAST(GETDATE() AS DATE)`;
    const resolvedDate = date || 'GETDATE()';

    let query = `
      WITH ranked AS (
        SELECT
          UserID,
          IDateTime,
          IOType,
          CASE WHEN IOType = 0 THEN 'IN' WHEN IOType = 1 THEN 'OUT' ELSE 'UNKNOWN' END AS Status,
          ROW_NUMBER() OVER (PARTITION BY UserID ORDER BY IDateTime DESC) AS rn
        FROM Mx_ACSEventTrn
        WHERE ${dateFilter}
    `;

    const params: Record<string, any> = {};
    if (date) params.date = date;

    if (employeeId) {
      query += `      AND UserID = @employeeId\n`;
      params.employeeId = employeeId.trim();
    }

    query += `
      )
      SELECT UserID, IDateTime, IOType, Status
      FROM ranked
      WHERE rn = 1
    `;

    if (sinceMinutes > 0) {
      query += ` AND IDateTime >= DATEADD(MINUTE, -@sinceMinutes, GETDATE())`;
      params.sinceMinutes = sinceMinutes;
    }

    const result = await queryBiometric(query, params);
    const events = result.recordset as Array<{
      UserID: string;
      IDateTime: Date;
      IOType: number;
      Status: string;
    }>;

    // Diagnostic: if 0 events, check what dates actually have data
    let diagnosticDates: string[] = [];
    if (events.length === 0) {
      try {
        const diagResult = await queryBiometric(`
          SELECT TOP 5 CAST(IDateTime AS DATE) AS d, COUNT(*) AS cnt
          FROM Mx_ACSEventTrn
          GROUP BY CAST(IDateTime AS DATE)
          ORDER BY d DESC
        `);
        diagnosticDates = diagResult.recordset.map((r: any) => `${r.d} (${r.cnt} rows)`);
      } catch { /* ignore */ }
    }

    logger.info('POST /api/attendance/biometric-sync - Biometric events fetched', {
      count: events.length,
      resolvedDate,
      sinceMinutes,
      diagnosticDates,
      sampleIds: events.slice(0, 5).map((e) => e.UserID),
    });

    if (events.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No biometric events found for this date',
        biometricFound: 0,
        processed: 0,
        skipped: 0,
        unmatchedIds: [],
        diagnosticDates,
        resolvedDate,
      });
    }

    // -----------------------------------------------------------------------
    // 2. Map biometric UserID → app User.id
    // -----------------------------------------------------------------------
    const biometricUserIds = [...new Set(events.map((e) => e.UserID))];

    const appUsers = await prisma.user.findMany({
      where: { id: { in: biometricUserIds } },
      select: { id: true },
    });
    const validUserIds = new Set(appUsers.map((u) => u.id));
    const unmatchedIds = biometricUserIds.filter((id) => !validUserIds.has(id));

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

    logger.info('POST /api/attendance/biometric-sync - Done', { processed, skipped, biometricFound: events.length, unmatchedIds });
    logger.response('POST', '/api/attendance/biometric-sync', 200, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      resolvedDate,
      biometricFound: events.length,
      processed,
      skipped,
      unmatchedIds,
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
