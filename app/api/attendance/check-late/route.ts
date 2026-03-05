import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/roleAuth';
import { prisma } from '@/lib/prisma';
import { queryBiometric } from '@/lib/mssql';
import { AttendanceEmailService } from '@/lib/attendanceEmailService';

interface LateCheckDeptResult {
  managerId: string;
  managerName: string;
  departmentId: string;
  departmentName: string;
  shiftStartTime: string;
  lateThresholdMins: number;
  cutoffTime: string;
  notYetPastCutoff: boolean;
  totalMembers: number;
  presentCount: number;
  presentEmployees: { id: string; name: string; checkInTime: string; checkOutTime?: string }[];
  lateEmployees: { id: string; name: string; email: string }[];
  alreadyNotified: boolean;
  message: string;
}

async function processDepartment(
  manager: { id: string; email: string; name: string; shiftStartTime: string | null; lateThresholdMins: number | null; managedDepartments: { id: string; name: string } | null },
  now: Date,
  todayStart: Date,
  todayEnd: Date,
  force = false
): Promise<LateCheckDeptResult | null> {
  if (!manager.managedDepartments) return null;

  const dept = manager.managedDepartments;
  const shiftStartTime = manager.shiftStartTime || '09:00';
  const lateThresholdMins = manager.lateThresholdMins || 15;

  const [hours, minutes] = shiftStartTime.split(':').map(Number);
  const cutoffTime = new Date(now);
  cutoffTime.setHours(hours, minutes + lateThresholdMins, 0, 0);

  const notYetPastCutoff = !force && now < cutoffTime;

  const base = {
    managerId: manager.id,
    managerName: manager.name,
    departmentId: dept.id,
    departmentName: dept.name,
    shiftStartTime,
    lateThresholdMins,
    cutoffTime: cutoffTime.toISOString(),
    notYetPastCutoff,
    alreadyNotified: false,
    message: '',
  };

  // Get active team members in this department
  const teamMembers = await prisma.employmentInfo.findMany({
    where: { departmentId: dept.id, status: 'ACTIVE' },
    select: { userId: true },
  });
  const teamMemberIds = teamMembers.map(tm => tm.userId);

  if (teamMemberIds.length === 0) {
    return { ...base, totalMembers: 0, presentCount: 0, presentEmployees: [], lateEmployees: [], message: 'No team members found' };
  }

  // Get all member details in one Prisma query so we have names for everyone
  const allMembers = await prisma.user.findMany({
    where: { id: { in: teamMemberIds } },
    select: { id: true, name: true, email: true },
  });
  const memberMap = new Map(allMembers.map(m => [m.id, m]));

  // Build IN list placeholders for MSSQL
  const idParams: Record<string, string> = {};
  const idPlaceholders = teamMemberIds.map((id, i) => { idParams[`uid${i}`] = id; return `@uid${i}`; }).join(', ');

  // Query biometric: first IN and last OUT per user today
  let biometricData: Map<string, { checkInTime?: string; checkOutTime?: string }> = new Map();
  try {
    const bioResult = await queryBiometric(
      `SELECT UserID,
         MIN(CASE WHEN IOType = 0 THEN IDateTime END) AS firstIn,
         MAX(CASE WHEN IOType = 1 THEN IDateTime END) AS lastOut
       FROM Mx_ACSEventTrn
       WHERE CAST(IDateTime AS DATE) = CAST(GETDATE() AS DATE)
         AND UserID IN (${idPlaceholders})
       GROUP BY UserID`,
      idParams
    );
    for (const row of bioResult.recordset) {
      const fmt = (d: any) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : undefined;
      biometricData.set(row.UserID, { checkInTime: fmt(row.firstIn), checkOutTime: fmt(row.lastOut) });
    }
  } catch (err) {
    console.error('check-late: biometric query failed, falling back to session check', err);
    const sessionsToday = await prisma.session.findMany({
      where: { userId: { in: teamMemberIds }, startedAt: { gte: todayStart, lte: todayEnd } },
      select: { userId: true, startedAt: true },
    });
    for (const s of sessionsToday) {
      if (!s.userId) continue;
      biometricData.set(s.userId, {
        checkInTime: new Date(s.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      });
    }
  }

  // Who has scanned IN today?
  const scannedInIds = new Set(
    [...biometricData.entries()].filter(([, v]) => v.checkInTime !== undefined).map(([k]) => k)
  );

  // Build present employees list (sorted by check-in time)
  const presentEmployees = teamMemberIds
    .filter(id => scannedInIds.has(id))
    .map(id => {
      const m = memberMap.get(id);
      const bio = biometricData.get(id)!;
      return { id, name: m?.name || id, checkInTime: bio.checkInTime!, checkOutTime: bio.checkOutTime };
    })
    .sort((a, b) => a.checkInTime.localeCompare(b.checkInTime));

  // Late = not scanned IN, only classified after cutoff
  const lateUserIds = notYetPastCutoff ? [] : teamMemberIds.filter(id => !scannedInIds.has(id));
  const lateEmployees = lateUserIds.map(id => {
    const m = memberMap.get(id);
    return { id, name: m?.name || id, email: m?.email || '' };
  });

  // Dedup: send notification + email only once per day per manager
  let alreadyNotified = false;
  if (lateEmployees.length > 0) {
    const existing = await prisma.notification.findFirst({
      where: { userId: manager.id, type: 'LATE_ARRIVAL', createdAt: { gte: todayStart } },
    });
    if (existing) {
      alreadyNotified = true;
    } else {
      await prisma.notification.create({
        data: {
          userId: manager.id,
          type: 'LATE_ARRIVAL',
          title: `${lateEmployees.length} Employee(s) Late — ${dept.name}`,
          message: `${lateEmployees.length} team member(s) in ${dept.name} have not clocked in: ${lateEmployees.map(e => e.name).join(', ')}`,
          data: { lateEmployees, cutoffTime: cutoffTime.toISOString(), department: dept.name },
        },
      });
      const emailService = new AttendanceEmailService();
      await emailService.sendLateArrivalNotification(manager.email, manager.name, lateEmployees, shiftStartTime, cutoffTime);
    }
  }

  return {
    ...base,
    totalMembers: teamMemberIds.length,
    presentCount: scannedInIds.size,
    presentEmployees,
    lateEmployees,
    alreadyNotified,
    message: notYetPastCutoff
      ? `${scannedInIds.size}/${teamMemberIds.length} arrived so far`
      : lateEmployees.length === 0 ? 'All present' : `${lateEmployees.length} late`,
  };
}

// POST /api/attendance/check-late
// ADMIN/HR → checks every manager's department; MANAGER → checks own department only
// ?force=true → skip the cutoff time guard (for testing)
export async function POST(request: Request) {
  const { user, error } = await requireRoles(request, ['MANAGER', 'ADMIN', 'HR']);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    // Determine which managers to process
    // ADMIN and HR see all departments; MANAGER sees only their own
    const managerWhere = (user.role === 'ADMIN' || user.role === 'HR')
      ? { role: { in: ['MANAGER' as const, 'ADMIN' as const] }, shiftStartTime: { not: null as any }, managedDepartments: { isNot: null } }
      : { id: user.id };

    const managers = await prisma.user.findMany({
      where: managerWhere,
      select: {
        id: true, email: true, name: true,
        shiftStartTime: true, lateThresholdMins: true,
        managedDepartments: { select: { id: true, name: true } },
      },
    });

    const results: LateCheckDeptResult[] = [];
    for (const mgr of managers) {
      const result = await processDepartment(mgr, now, todayStart, todayEnd, force);
      if (result) results.push(result);
    }

    return NextResponse.json({ departments: results, forced: force });
  } catch (error) {
    console.error('Failed to check late arrivals:', error);
    return NextResponse.json({ error: 'Failed to check late arrivals' }, { status: 500 });
  }
}
