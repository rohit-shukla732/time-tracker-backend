import { prisma } from "./prisma";
import { computeTypeBalance } from "./leaveUtils";

export interface BiometricPunchInput {
  employeeCode: string;
  date: string;
  firstIn?: string;
  lastOut?: string;
}

export interface BiometricConfigData {
  id: number;
  enabled: boolean;
  sourceUrl: string | null;
  sourceToken: string | null;
  sourceApiKey: string | null;
  pollIntervalMinutes: number;
  shiftStart: string;
  shiftEnd: string;
  halfDayThresholdMin: number;
  lateGraceMinutes: number;
  probationLateGraceMinutes: number;
  autoApply: boolean;
  lastRunAt: Date | null;
  lastRunStatus: string | null;
  lastRunMessage: string | null;
}

export function parseDateUtc(value: string): Date | null {
  const parts = value.trim().split("-").map(Number);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function parseTimeToMinutes(value: string | undefined): number | null {
  if (!value || !value.trim()) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

const MINUTES_PER_DAY = 24 * 60;

interface ShiftWindow {
  start: number;
  end: number;
}

/**
 * True when the shift crosses midnight (e.g. 17:30 -> 02:30). The end time
 * then belongs to the day after the shift start.
 */
function isOvernightShift(shift: ShiftWindow): boolean {
  return shift.end < shift.start;
}

/**
 * Minutes the employee was late: how much later than the shift start the
 * first punch was. The in-punch is always on the shift-start day, so this
 * works for overnight shifts too.
 */
function lateMinutesFor(shift: ShiftWindow, firstInMin: number | null): number {
  if (firstInMin === null) return 0;
  return Math.max(0, firstInMin - shift.start);
}

/**
 * Minutes the employee left before the end of the shift.
 *
 * For overnight shifts the end time (e.g. 02:30) is on the next day. An out
 * punch that is earlier in the day than the in punch (or earlier than the
 * shift start when there is no in punch) is treated as next-day minutes, so
 * both same-row punches and out-only rows are measured against the correct
 * end-of-shift.
 */
function earlyOutMinutesFor(
  shift: ShiftWindow,
  lastOutMin: number | null,
  firstInMin: number | null
): number {
  if (lastOutMin === null) return 0;
  if (!isOvernightShift(shift)) {
    return Math.max(0, shift.end - lastOutMin);
  }
  const dayOffset =
    firstInMin !== null ? (lastOutMin < firstInMin ? 1 : 0) : lastOutMin < shift.start ? 1 : 0;
  const effectiveEnd = shift.end + MINUTES_PER_DAY;
  const effectiveOut = lastOutMin + dayOffset * MINUTES_PER_DAY;
  return Math.max(0, effectiveEnd - effectiveOut);
}

/**
 * Absolute timestamp for an out punch. For overnight shifts where both
 * punches sit on the shift-start date, an out time earlier in the day than
 * the in time belongs to the next day.
 */
function lastOutTimestamp(
  date: Date,
  lastOutMin: number,
  shift: ShiftWindow,
  firstInMin: number | null
): Date {
  const dayOffset =
    isOvernightShift(shift) && firstInMin !== null && lastOutMin < firstInMin ? 1 : 0;
  return new Date(date.getTime() + (dayOffset * MINUTES_PER_DAY + lastOutMin) * 60_000);
}

export async function getBiometricConfig(): Promise<BiometricConfigData> {
  return prisma.biometricConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

/**
 * Fetch punches from the configured source. When `since` is provided the URL
 * gets `?since=YYYY-MM-DD` (inclusive) so the source can return only punches
 * newer than the last successful run. Passing null/undefined omits the param
 * (full fetch). The source returns a JSON array or { punches: [...] }.
 */
export async function fetchBiometricData(cfg: BiometricConfigData, since?: Date | null): Promise<BiometricPunchInput[]> {
  if (!cfg.sourceUrl) return [];
  const separator = cfg.sourceUrl.includes("?") ? "&" : "?";
  const url = since
    ? `${cfg.sourceUrl}${separator}since=${since.toISOString().slice(0, 10)}`
    : cfg.sourceUrl;
  const res = await fetch(url, {
    headers: {
      ...(cfg.sourceToken ? { Authorization: `Bearer ${cfg.sourceToken}` } : {}),
      ...(cfg.sourceApiKey ? { "x-api-key": cfg.sourceApiKey } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Biometric source responded with ${res.status}`);
  }
  const data = await res.json();
  const raw = Array.isArray(data) ? data : data?.punches;
  if (!Array.isArray(raw)) {
    throw new Error("Biometric source must return a JSON array or { punches: [...] }");
  }
  return raw as BiometricPunchInput[];
}

export interface ImportResult {
  status: string;
  message?: string;
  fetched: number;
  matched: number;
  unmatched: number;
  punchesStored: number;
  recordsCreated: number;
  present: number;
  halfDay: number;
  unapproved: number;
  unapprovedWithoutPay: number;
  absentUnmarked: number;
}

/**
 * Full biometric pipeline: fetch punches -> store -> mark attendance.
 * - No punch  -> UNAPPROVED_LEAVE (or ..._WITHOUT_PAY if balance insufficient)
 * - Late/early beyond the half-day threshold -> UNAPPROVED_HALFDAY_* variants
 * - Otherwise -> PRESENT
 * Weekends, declared holidays and days that already have a record are skipped.
 *
 * `since` controls the fetch window: undefined -> last successful run (so only
 * new punches are fetched), null -> full fetch (no param), a Date -> that date.
 *
 * `reapply` re-evaluates attendance for the processed window: existing
 * BIOMETRIC-derived records (that are not manual overrides) are deleted and
 * re-marked from the current punch data. Leave records and manual overrides
 * are never touched.
 */
export async function runBiometricImport(input?: { punches?: BiometricPunchInput[]; forceApply?: boolean; since?: Date | null; reapply?: boolean }): Promise<ImportResult> {
  const cfg = await getBiometricConfig();

  const result: ImportResult = {
    status: "ok",
    fetched: 0,
    matched: 0,
    unmatched: 0,
    punchesStored: 0,
    recordsCreated: 0,
    present: 0,
    halfDay: 0,
    unapproved: 0,
    unapprovedWithoutPay: 0,
    absentUnmarked: 0,
  };

  let raw: BiometricPunchInput[];
  if (input?.punches) {
    raw = input.punches;
  } else {
    if (!cfg.enabled) {
      result.status = "disabled";
      result.message = "Biometric sync is disabled in settings.";
      return result;
    }
    if (!cfg.sourceUrl) {
      result.status = "disabled";
      result.message = "No biometric source URL configured.";
      return result;
    }
    const since = input?.since ?? cfg.lastRunAt ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    raw = await fetchBiometricData(cfg, since);
  }

  result.fetched = raw.length;

  const codes = raw.map((p) => String(p.employeeCode || "").trim().toUpperCase()).filter(Boolean);
  const [users, mappings, shiftGroups] = await Promise.all([
    prisma.user.findMany({
      where: { isArchived: false },
      select: {
        id: true,
        createdAt: true,
        shiftGroupId: true,
        shiftGroup: { select: { startTime: true, endTime: true } },
      },
    }),
    prisma.biometricMapping.findMany({ where: { id: { in: codes } }, select: { id: true, userId: true } }),
    prisma.shiftGroup.findMany({ select: { id: true, startTime: true, endTime: true, isDefault: true } }),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const mappingByCode = new Map(mappings.map((m) => [m.id.toUpperCase(), m.userId]));
  const defaultGroup = shiftGroups.find((g) => g.isDefault) || null;
  const groupById = new Map(shiftGroups.map((g) => [g.id, g]));

  const globalStart = parseTimeToMinutes(cfg.shiftStart) ?? 600;
  const globalEnd = parseTimeToMinutes(cfg.shiftEnd) ?? 1140;

  const shiftFor = (userId: string): { start: number; end: number } => {
    const user = userById.get(userId);
    const group = (user?.shiftGroupId && groupById.get(user.shiftGroupId)) || defaultGroup;
    return {
      start: parseTimeToMinutes(group?.startTime) ?? globalStart,
      end: parseTimeToMinutes(group?.endTime) ?? globalEnd,
    };
  };

  interface Normalized {
    userId: string;
    date: Date;
    dateKey: string;
    firstInMin: number | null;
    lastOutMin: number | null;
  }
  const normalized: Normalized[] = [];
  const seen = new Set<string>();
  for (const p of raw) {
    const code = String(p.employeeCode || "").trim().toUpperCase();
    const date = parseDateUtc(p.date);
    if (!date) continue;
    let userId = userById.get(code)?.id || mappingByCode.get(code);
    if (!userId) {
      result.unmatched++;
      continue;
    }
    const dateKey = `${userId}|${date.toISOString().slice(0, 10)}`;
    if (seen.has(dateKey)) continue;
    seen.add(dateKey);
    normalized.push({
      userId,
      date,
      dateKey,
      firstInMin: parseTimeToMinutes(p.firstIn),
      lastOutMin: parseTimeToMinutes(p.lastOut),
    });
  }

  result.matched = normalized.length;

  if (normalized.length > 0) {
    const stored = await Promise.all(
      normalized.map((n) => {
        const shift = shiftFor(n.userId);
        const firstIn =
          n.firstInMin !== null ? new Date(n.date.getTime() + n.firstInMin * 60_000) : null;
        const lastOut =
          n.lastOutMin !== null
            ? lastOutTimestamp(n.date, n.lastOutMin, shift, n.firstInMin)
            : null;
        const late = lateMinutesFor(shift, n.firstInMin);
        const earlyOut = earlyOutMinutesFor(shift, n.lastOutMin, n.firstInMin);
        return prisma.biometricPunch.upsert({
          where: { userId_date: { userId: n.userId, date: n.date } },
          update: { firstIn, lastOut, lateMinutes: late, earlyOutMinutes: earlyOut },
          create: {
            userId: n.userId,
            date: n.date,
            firstIn,
            lastOut,
            lateMinutes: late,
            earlyOutMinutes: earlyOut,
          },
        });
      })
    );
    result.punchesStored = stored.length;
  }

  const apply = input?.forceApply !== undefined ? input.forceApply : cfg.autoApply;
  if (apply) {
    const marked = await reconcileAttendance(
      normalized,
      cfg.halfDayThresholdMin,
      shiftFor,
      result,
      userById,
      Boolean(input?.reapply)
    );
    result.recordsCreated = marked.created;
    result.present = marked.present;
    result.halfDay = marked.halfDay;
    result.unapproved = marked.unapproved;
    result.unapprovedWithoutPay = marked.unapprovedWithoutPay;
    result.absentUnmarked = marked.absentUnmarked;
  }

  await prisma.biometricConfig.update({
    where: { id: 1 },
    data: {
      lastRunAt: new Date(),
      lastRunStatus: "success",
      lastRunMessage: `${result.recordsCreated} attendance record(s) written, ${result.punchesStored} punch(es) stored.`,
    },
  });

  return result;
}

async function reconcileAttendance(
  normalized: { userId: string; date: Date; dateKey: string; firstInMin: number | null; lastOutMin: number | null }[],
  halfDayThreshold: number,
  shiftFor: (userId: string) => { start: number; end: number },
  result: ImportResult,
  usersById: Map<string, { id: string; createdAt: Date }>,
  reapply: boolean
) {
  const dates = [...new Set(normalized.map((n) => n.date.toISOString().slice(0, 10)))].sort();
  if (dates.length === 0) return { created: 0, present: 0, halfDay: 0, unapproved: 0, unapprovedWithoutPay: 0, absentUnmarked: 0 };

  const dateObjs = dates.map((d) => new Date(d + "T00:00:00.000Z"));
  const userIds = [...usersById.keys()];

  const [holidayRecords, attendanceTypes, paidLeaveTypes, existingRecords] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { date: { in: dateObjs }, type: { category: "HOLIDAY" } },
      select: { date: true },
    }),
    prisma.attendanceType.findMany({
      where: { active: true, code: { in: ["PRESENT", "UNAPPROVED_LEAVE", "UNAPPROVED_HALFDAY_LEAVE", "UNAPPROVED_LEAVE_WITHOUT_PAY", "UNAPPROVED_HALFDAY_LEAVE_WITHOUT_PAY"] } },
      select: { code: true, id: true },
    }),
    prisma.leaveType.findMany({
      where: { active: true, isPaid: true },
      select: { id: true, name: true, isPaid: true, monthlyCredit: true, rolloverMonthly: true, rolloverYearly: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { date: { in: dateObjs }, userId: { in: userIds } },
      select: { userId: true, date: true, isOverride: true, source: true },
    }),
  ]);

  // Re-apply mode: drop the biometric-derived records for exactly the
  // (user, date) pairs present in this run, then re-mark them below. Manual
  // overrides and leave/other sourced records are never removed.
  if (reapply && normalized.length > 0) {
    await prisma.attendanceRecord.deleteMany({
      where: {
        OR: normalized.map((n) => ({
          userId: n.userId,
          date: n.date,
          source: "BIOMETRIC",
          isOverride: false,
        })),
      },
    });
  }

  const typeId = Object.fromEntries(attendanceTypes.map((t) => [t.code, t.id]));
  const holidayDates = new Set(holidayRecords.map((h) => h.date.toISOString().slice(0, 10)));
  const existingKeys = new Set(
    existingRecords
      .filter((r) => !reapply || r.isOverride || r.source !== "BIOMETRIC")
      .map((r) => `${r.userId}|${r.date.toISOString().slice(0, 10)}`)
  );
  const paidType = paidLeaveTypes[0] || null;

  const punchByKey = new Map(normalized.map((n) => [n.dateKey, n as any]));
  const balanceCache = new Map<string, number>();

  const userRows = [...usersById.values()];

  const created: any[] = [];
  let present = 0;
  let halfDay = 0;
  let unapproved = 0;
  let unapprovedWithoutPay = 0;
  let absentUnmarked = 0;

  for (const date of dateObjs) {
    const dateKey = date.toISOString().slice(0, 10);
    const day = date.getUTCDay();
    if (day === 0 || day === 6) continue;
    if (holidayDates.has(dateKey)) continue;

    const year = date.getUTCFullYear();

    for (const user of userRows) {
      const key = `${user.id}|${dateKey}`;
      if (existingKeys.has(key)) continue;
      const punch = punchByKey.get(key) as any;

      if (!punch) {
        if (!paidType || !typeId["UNAPPROVED_LEAVE"]) {
          absentUnmarked++;
          continue;
        }
        let held = balanceCache.get(`${user.id}|${year}`);
        if (held === undefined) {
          const balance = await computeTypeBalance(user.id, user.createdAt, paidType, year);
          held = Math.round((balance.available - balance.pending) * 100) / 100;
          balanceCache.set(`${user.id}|${year}`, held);
        }
        const type = held >= 1 ? typeId["UNAPPROVED_LEAVE"] : typeId["UNAPPROVED_LEAVE_WITHOUT_PAY"];
        if (type) {
          created.push({ userId: user.id, date, typeId: type, source: "BIOMETRIC" });
          if (held >= 1) unapproved++;
          else unapprovedWithoutPay++;
        } else absentUnmarked++;
        continue;
      }

      const shift = shiftFor(user.id);
      const late = lateMinutesFor(shift, punch.firstInMin);
      const earlyOut = earlyOutMinutesFor(shift, punch.lastOutMin, punch.firstInMin);
      const isHalfDay = late > halfDayThreshold || earlyOut > halfDayThreshold;

      if (isHalfDay) {
        let held = balanceCache.get(`${user.id}|${year}`);
        if (held === undefined) {
          const balance = await computeTypeBalance(user.id, user.createdAt, paidType, year);
          held = Math.round((balance.available - balance.pending) * 100) / 100;
          balanceCache.set(`${user.id}|${year}`, held);
        }
        const type =
          held >= 0.5
            ? typeId["UNAPPROVED_HALFDAY_LEAVE"]
            : typeId["UNAPPROVED_HALFDAY_LEAVE_WITHOUT_PAY"];
        if (type) {
          created.push({ userId: user.id, date, typeId: type, source: "BIOMETRIC" });
          halfDay++;
        }
      } else if (typeId["PRESENT"]) {
        created.push({ userId: user.id, date, typeId: typeId["PRESENT"], source: "BIOMETRIC" });
        present++;
      }
    }
  }

  if (created.length > 0) {
    await prisma.attendanceRecord.createMany({ data: created, skipDuplicates: true });
  }

  return { created: created.length, present, halfDay, unapproved, unapprovedWithoutPay, absentUnmarked };
}

/**
 * Monthly late summary per user (late policy).
 */
export async function computeLateSummary(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const [cfg, punches, users] = await Promise.all([
    getBiometricConfig(),
    prisma.biometricPunch.findMany({
      where: { date: { gte: start, lte: end } },
      select: { userId: true, date: true, lateMinutes: true },
    }),
    prisma.user.findMany({
      where: { isArchived: false },
      select: { id: true, name: true, isProbation: true },
    }),
  ]);

  const byUser = new Map<string, { name: string; isProbation: boolean; totalLate: number; days: { date: string; lateMinutes: number }[] }>();
  for (const u of users) {
    byUser.set(u.id, { name: u.name, isProbation: u.isProbation, totalLate: 0, days: [] });
  }
  for (const p of punches) {
    const entry = byUser.get(p.userId);
    if (!entry) continue;
    entry.totalLate += p.lateMinutes;
    entry.days.push({ date: p.date.toISOString().slice(0, 10), lateMinutes: p.lateMinutes });
  }

  const rows = [...byUser.values()]
    .map((u) => {
      const grace = u.isProbation ? cfg.probationLateGraceMinutes : cfg.lateGraceMinutes;
      return { ...u, graceMinutes: grace, breached: u.totalLate > grace };
    })
    .sort((a, b) => b.totalLate - a.totalLate);

  return { rows, grace: cfg.lateGraceMinutes, probationGrace: cfg.probationLateGraceMinutes };
}
