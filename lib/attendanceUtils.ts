import { prisma } from "./prisma";

const DAY_MS = 86_400_000;

export interface LeaveSyncPayload {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  isHalfDay: boolean;
  isWithoutPay: boolean;
  /** Per-day half-day sessions: { "YYYY-MM-DD": "FIRST_HALF" | "SECOND_HALF" } */
  halfDayDays?: Record<string, string> | unknown;
  /** Dates inside the range excluded from the leave */
  skippedDays?: string[] | unknown;
  /** Days not deducted from the paid balance: ["YYYY-MM-DD", ...] */
  withoutPayDays?: string[] | unknown;
}

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function eachUtcDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    days.push(new Date(t));
  }
  return days;
}

/**
 * Find the configured attendance type that maps to a leave request's state.
 * Mapping is fully configurable by HR via AttendanceType fields:
 * mapsLeaveStatus (PENDING/APPROVED), mapsHalfDay (FULL/HALF), mapsWithoutPay.
 */
export async function resolveLeaveAttendanceType(payload: {
  status: string;
  isHalfDay: boolean;
  isWithoutPay: boolean;
}) {
  return prisma.attendanceType.findFirst({
    where: {
      active: true,
      mapsLeaveStatus: payload.status,
      mapsHalfDay: payload.isHalfDay ? "HALF" : "FULL",
      mapsWithoutPay: payload.isWithoutPay,
    },
    orderBy: { sortOrder: "asc" },
  });
}

/**
 * Create/update attendance records for every day of a leave request.
 * Half-day days (halfDayDays) map to the HALF attendance type; days listed in
 * skippedDays are excluded. Never touches manually overridden records.
 */
export async function syncLeaveAttendance(request: LeaveSyncPayload) {
  const halfDayDays: Record<string, string> =
    request.halfDayDays && typeof request.halfDayDays === "object" && !Array.isArray(request.halfDayDays)
      ? (request.halfDayDays as Record<string, string>)
      : {};
  const skippedDays = new Set(
    Array.isArray(request.skippedDays) ? request.skippedDays.map(String) : []
  );
  const withoutPayDays = new Set(
    Array.isArray(request.withoutPayDays) ? request.withoutPayDays.map(String) : []
  );
  // Legacy requests with no per-day selection: the whole request follows
  // isWithoutPay.
  const hasPerDayPay = withoutPayDays.size > 0;
  const isWopDay = (key: string) =>
    hasPerDayPay ? withoutPayDays.has(key) : request.isWithoutPay;

  // Resolve the four possible day states: paid/unpaid x full/half.
  const typeFor = (isHalfDay: boolean, isWithoutPay: boolean) =>
    resolveLeaveAttendanceType({
      status: request.status,
      isHalfDay,
      isWithoutPay,
    });

  const fullPaid = await typeFor(false, false);
  const fullUnpaid = await typeFor(false, true);
  const halfPaid = await typeFor(true, false);
  const halfUnpaid = await typeFor(true, true);
  const types = [fullPaid, fullUnpaid, halfPaid, halfUnpaid].filter(Boolean);
  if (types.length === 0) return;

  const days = eachUtcDay(request.startDate, request.endDate).filter(
    (d) => !skippedDays.has(utcDayKey(d))
  );

  const existing = await prisma.attendanceRecord.findMany({
    where: { userId: request.userId, date: { in: days } },
    select: { date: true, isOverride: true, leaveRequestId: true },
  });
  const existingByDate = new Map(existing.map((r) => [r.date.getTime(), r]));

  const creates: { userId: string; date: Date; typeId: string; source: string; leaveRequestId: string }[] = [];
  const updates: { date: Date; typeId: string }[] = [];

  for (const day of days) {
    const key = utcDayKey(day);
    const rec = existingByDate.get(day.getTime());
    const isHalf = halfDayDays[key] !== undefined;
    const type = isHalf
      ? isWopDay(key) ? halfUnpaid : halfPaid
      : isWopDay(key) ? fullUnpaid : fullPaid;
    if (!type) continue;
    if (!rec) {
      creates.push({
        userId: request.userId,
        date: day,
        typeId: type.id,
        source: "LEAVE_REQUEST",
        leaveRequestId: request.id,
      });
    } else if (!rec.isOverride) {
      updates.push({ date: day, typeId: type.id });
    }
  }

  if (creates.length > 0) {
    await prisma.attendanceRecord.createMany({ data: creates, skipDuplicates: true });
  }
  for (const u of updates) {
    await prisma.attendanceRecord.updateMany({
      where: { userId: request.userId, date: u.date, isOverride: false },
      data: { typeId: u.typeId, source: "LEAVE_REQUEST", leaveRequestId: request.id },
    });
  }
}

/**
 * Remove attendance records derived from a leave request (rejected/cancelled).
 * Manually overridden records are kept.
 */
export async function removeLeaveAttendance(leaveRequestId: string) {
  await prisma.attendanceRecord.deleteMany({
    where: { leaveRequestId, isOverride: false },
  });
}

/**
 * Lazy-fill weekend records for all active users on the given dates.
 * Only fills dates that fall on Saturday/Sunday and skips existing records.
 */
export async function ensureWeekendRecords(dates: Date[]) {
  const weekendDates = dates.filter((d) => {
    const day = d.getUTCDay();
    return day === 0 || day === 6;
  });
  if (weekendDates.length === 0) return;

  const weekendType = await prisma.attendanceType.findFirst({
    where: { category: "WEEKEND", active: true },
    select: { id: true },
  });
  if (!weekendType) return;

  const users = await prisma.user.findMany({
    where: { isArchived: false },
    select: { id: true },
  });
  if (users.length === 0) return;

  const data = weekendDates.flatMap((date) =>
    users.map((u) => ({
      userId: u.id,
      date,
      typeId: weekendType.id,
      source: "SYSTEM_WEEKEND",
    }))
  );

  await prisma.attendanceRecord.createMany({ data, skipDuplicates: true });
}

export interface AttendanceTypeInfo {
  id: string;
  name: string;
  code: string;
  color: string;
  category: string;
}

/**
 * Per-user count of attendance records grouped by type code, for a given year.
 * Returns a Map<userId, Record<typeCode, count>>.
 */
export async function computeAttendanceSummaries(
  userIds: string[],
  year: number
): Promise<Map<string, Record<string, number>>> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const [records, types] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { userId: { in: userIds }, date: { gte: start, lte: end } },
      select: { userId: true, typeId: true },
    }),
    prisma.attendanceType.findMany({
      select: { id: true, name: true, code: true, color: true, category: true },
    }),
  ]);

  const typeByCode = new Map<string, AttendanceTypeInfo>(types.map((t) => [t.code, t]));
  const typeCodeById = new Map(types.map((t) => [t.id, t.code]));

  const result = new Map<string, Record<string, number>>();
  for (const u of userIds) result.set(u, {});

  for (const r of records) {
    const code = typeCodeById.get(r.typeId);
    if (!code || !typeByCode.has(code)) continue;
    const map = result.get(r.userId);
    if (map) map[code] = (map[code] || 0) + 1;
  }

  return result;
}

/**
 * Metadata for all attendance types, ordered for display.
 */
export async function listAttendanceTypes(): Promise<AttendanceTypeInfo[]> {
  const types = await prisma.attendanceType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, code: true, color: true, category: true },
  });
  return types;
}

/**
 * Map of leave-state key -> attendance type name, for calendar display.
 * Keys: `${mapsLeaveStatus}|${mapsHalfDay}|${mapsWithoutPay}`.
 * Only types that map to a leave status are included.
 */
export async function getLeaveAttendanceTypeNameMap(): Promise<Map<string, string>> {
  const types = await prisma.attendanceType.findMany({
    where: { active: true, mapsLeaveStatus: { not: null } },
    select: { name: true, mapsLeaveStatus: true, mapsHalfDay: true, mapsWithoutPay: true },
  });
  const map = new Map<string, string>();
  for (const t of types) {
    if (!t.mapsLeaveStatus) continue;
    map.set(`${t.mapsLeaveStatus}|${t.mapsHalfDay}|${t.mapsWithoutPay}`, t.name);
  }
  return map;
}

/**
 * Build a calendar event from a leave request row, adding per-day details:
 * halfDayDays/skippedDays/withoutPayDays and a per-day attendance type name
 * map (attendanceTypeNames) so mixed paid/unpaid or full/half requests render
 * correctly day by day.
 */
export function buildLeaveCalendarEvent(
  r: {
    id: string;
    startDate: Date;
    endDate: Date;
    status: string;
    isHalfDay: boolean;
    halfDaySession: string | null;
    durationDays: number;
    reason: string | null;
    isWithoutPay: boolean;
    halfDayDays?: unknown;
    skippedDays?: unknown;
    withoutPayDays?: unknown;
    leaveType: { id: string; name: string; isPaid: boolean };
  },
  typeNameMap: Map<string, string>
) {
  const halfDayDays: Record<string, string> =
    r.halfDayDays && typeof r.halfDayDays === "object" && !Array.isArray(r.halfDayDays)
      ? (r.halfDayDays as Record<string, string>)
      : {};
  const skippedDays = new Set(
    Array.isArray(r.skippedDays) ? r.skippedDays.map(String) : []
  );
  const withoutPayDays = Array.isArray(r.withoutPayDays)
    ? (r.withoutPayDays as unknown[]).map(String)
    : [];
  const hasPerDayPay = withoutPayDays.length > 0;
  const isWopDay = (key: string) => (hasPerDayPay ? withoutPayDays.includes(key) : r.isWithoutPay);

  const attendanceTypeNames: Record<string, string> = {};
  for (let t = r.startDate.getTime(); t <= r.endDate.getTime(); t += DAY_MS) {
    const key = new Date(t).toISOString().slice(0, 10);
    if (skippedDays.has(key)) continue;
    const half = halfDayDays[key] !== undefined ? "HALF" : "FULL";
    const name = typeNameMap.get(`${r.status}|${half}|${isWopDay(key)}`);
    if (name) attendanceTypeNames[key] = name;
  }

  return {
    id: r.id,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    status: r.status,
    isHalfDay: r.isHalfDay,
    halfDaySession: r.halfDaySession,
    durationDays: r.durationDays,
    reason: r.reason,
    typeName: r.leaveType.name,
    attendanceTypeName:
      typeNameMap.get(`${r.status}|${r.isHalfDay ? "HALF" : "FULL"}|${r.isWithoutPay}`) || null,
    halfDayDays: Object.keys(halfDayDays).length ? halfDayDays : null,
    skippedDays: skippedDays.size ? [...skippedDays] : null,
    withoutPayDays: withoutPayDays.length ? withoutPayDays : null,
    attendanceTypeNames: Object.keys(attendanceTypeNames).length ? attendanceTypeNames : null,
    isWithoutPay: r.isWithoutPay,
  };
}
