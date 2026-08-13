import { prisma } from "./prisma";

export interface LeaveTypeInfo {
  id: string;
  name: string;
  isPaid: boolean;
  monthlyCredit: number;
  rolloverMonthly: boolean;
  rolloverYearly: boolean;
}

export interface BalanceEntry {
  typeId: string;
  name: string;
  isPaid: boolean;
  monthlyCredit: number;
  earned: number;
  used: number;
  pending: number;
  available: number;
  /** Approved days that were WITHOUT pay — never deducted from the balance. */
  withoutPay: number;
  /** Unused days carried over from previous years (yearly rollover). */
  carriedOver: number;
  /** One-time opening balance granted by HR for this year. */
  openingBalance: number;
}

/**
 * Convert a YYYY-MM-DD string to a UTC midnight Date so dates are stable
 * regardless of server/client timezones.
 */
export function dateFromInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const DAY_MS = 86_400_000;

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

export interface NormalizedLeaveDays {
  halfDayDays: Record<string, string>;
  skippedDays: string[];
  withoutPayDays: string[];
  /** YYYY-MM-DD keys of the days actually covered by the leave */
  selectedDays: string[];
  durationDays: number;
  isHalfDay: boolean;
  halfDaySession: "FIRST_HALF" | "SECOND_HALF";
  paidDays: number;
  withoutPayTotal: number;
  isWithoutPay: boolean;
}

/**
 * Normalize per-day leave selection from a raw request body.
 * Shared by the apply and manager-edit endpoints so the rules never drift:
 * - halfDayDays: { "YYYY-MM-DD": "FIRST_HALF" | "SECOND_HALF" }
 * - skippedDays: days inside the range excluded from the leave
 * - withoutPayDays: days not deducted from the paid balance
 * Throws Error with a user-facing message on invalid input.
 */
export function normalizeLeaveDays(params: {
  start: Date;
  end: Date;
  body: {
    isHalfDay?: unknown;
    halfDaySession?: unknown;
    halfDayDays?: unknown;
    skippedDays?: unknown;
    withoutPayDays?: unknown;
    isWithoutPay?: unknown;
  };
}): NormalizedLeaveDays {
  const { start, end, body } = params;

  const halfDayDays: Record<string, string> = {};
  if (body.halfDayDays && typeof body.halfDayDays === "object") {
    for (const [day, session] of Object.entries(body.halfDayDays)) {
      if (session === "FIRST_HALF" || session === "SECOND_HALF") {
        halfDayDays[String(day)] = session;
      }
    }
  }
  // Legacy single-day half-day payload support.
  if (body.isHalfDay && start.getTime() === end.getTime()) {
    halfDayDays[utcDayKey(start)] =
      body.halfDaySession === "SECOND_HALF" ? "SECOND_HALF" : "FIRST_HALF";
  }

  const skippedRaw: string[] = Array.isArray(body.skippedDays)
    ? (body.skippedDays as unknown[]).map((s) => String(s))
    : [];
  const skippedDays: string[] = [...new Set(skippedRaw)];

  // Per-day without-pay selection. Days not listed use the balance.
  // Legacy whole-request isWithoutPay=true means every selected day is unpaid.
  const withoutPayRaw: string[] = Array.isArray(body.withoutPayDays)
    ? (body.withoutPayDays as unknown[]).map((s) => String(s))
    : [];
  const withoutPayDays: string[] = [...new Set(withoutPayRaw)];

  const allDays = eachUtcDay(start, end);
  const selectedDays = allDays.filter((d) => !skippedDays.includes(utcDayKey(d)));
  if (selectedDays.length === 0) {
    throw new Error("Select at least one day");
  }
  for (const key of Object.keys(halfDayDays)) {
    if (!selectedDays.some((d) => utcDayKey(d) === key)) {
      throw new Error(`Half-day date ${key} is outside the selected days`);
    }
  }
  for (const key of withoutPayDays) {
    if (!selectedDays.some((d) => utcDayKey(d) === key)) {
      throw new Error(`Without-pay date ${key} is outside the selected days`);
    }
  }
  if (skippedDays.some((k) => !allDays.some((d) => utcDayKey(d) === k))) {
    throw new Error("Skipped day is outside the leave range");
  }

  const dayCost = (d: Date) => (halfDayDays[utcDayKey(d)] ? 0.5 : 1);
  const durationDays = selectedDays.reduce((sum, d) => sum + dayCost(d), 0);
  const isHalfDay = selectedDays.some((d) => halfDayDays[utcDayKey(d)]);
  // Legacy whole-request isWithoutPay=true with no per-day selection means the
  // entire request is unpaid.
  const explicitWithoutPay = body.isWithoutPay === true;
  const paidDays =
    explicitWithoutPay && withoutPayDays.length === 0
      ? 0
      : selectedDays.reduce(
          (sum, d) => (withoutPayDays.includes(utcDayKey(d)) ? sum : sum + dayCost(d)),
          0
        );
  const withoutPayTotal = Math.round((durationDays - paidDays) * 100) / 100;
  const isWithoutPay = withoutPayTotal === durationDays;

  return {
    halfDayDays,
    skippedDays,
    withoutPayDays,
    selectedDays: selectedDays.map(utcDayKey),
    durationDays,
    isHalfDay,
    halfDaySession: isHalfDay
      ? ((Object.values(halfDayDays)[0] || "FIRST_HALF") as "FIRST_HALF" | "SECOND_HALF")
      : "FIRST_HALF",
    paidDays,
    withoutPayTotal,
    isWithoutPay,
  };
}

/**
 * Inclusive calendar days between two UTC dates.
 */
export function inclusiveDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

/**
 * Number of months an employee has been credited for in a given year.
 * - Joined this year  -> months from join month through the reference month.
 * - Joined before     -> full year (capped at 12).
 * - Current year      -> credited up to the current month.
 * - Past years        -> credited up to December.
 */
export function monthsEarned(joinDate: Date, year: number): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const referenceMonth = year === currentYear ? now.getMonth() : 11;
  const joinYear = joinDate.getFullYear();
  const joinMonth = joinDate.getMonth();

  if (joinYear > year) return 0;

  let months: number;
  if (joinYear < year) {
    months = referenceMonth + 1;
  } else {
    if (joinMonth > referenceMonth) return 0;
    months = referenceMonth - joinMonth + 1;
  }
  return Math.min(months, 12);
}

/**
 * Per-year usage breakdown for one user + leave type.
 */
export interface YearlyUsage {
  used: number;
  pending: number;
  withoutPay: number;
}

/**
 * Split a request's duration into paid and without-pay portions using the
 * per-day selection. Days in withoutPayDays (or the legacy whole-request
 * isWithoutPay flag) count as without pay; half days count 0.5.
 */
export function splitPaidUnpaid(request: {
  durationDays: number;
  isWithoutPay: boolean;
  halfDayDays?: unknown;
  withoutPayDays?: unknown;
}): { paid: number; withoutPay: number } {
  const halfDayDays: Record<string, string> =
    request.halfDayDays && typeof request.halfDayDays === "object" && !Array.isArray(request.halfDayDays)
      ? (request.halfDayDays as Record<string, string>)
      : {};
  const withoutPayDays = new Set(
    Array.isArray(request.withoutPayDays) ? request.withoutPayDays.map(String) : []
  );
  if (withoutPayDays.size === 0 && request.isWithoutPay) {
    return { paid: 0, withoutPay: request.durationDays };
  }
  if (withoutPayDays.size === 0) {
    return { paid: request.durationDays, withoutPay: 0 };
  }
  let withoutPay = 0;
  for (const day of withoutPayDays) {
    withoutPay += halfDayDays[day] ? 0.5 : 1;
  }
  return {
    paid: Math.round((request.durationDays - withoutPay) * 100) / 100,
    withoutPay,
  };
}

/**
 * Pure balance computation from pre-aggregated data.
 * - Opening balance granted for a year counts in that year.
 * - If yearly rollover is enabled, unused days carry into each following year
 *   (simulated year by year from the earliest relevant year).
 * - If monthly rollover is disabled, only the current month's credit counts.
 */
export function computeBalanceFromData(
  joinDate: Date,
  type: LeaveTypeInfo,
  year: number,
  openingByYear: Map<number, number>,
  usageByYear: Map<number, YearlyUsage>,
  probation = false
): BalanceEntry {
  const joinYear = joinDate.getFullYear();
  const openingYears = [...openingByYear.keys()];
  const startYear = Math.min(joinYear, ...(openingYears.length ? openingYears : [joinYear]));

  let carried = 0;
  if (type.rolloverYearly) {
    for (let t = startYear; t < year; t++) {
      const opening = openingByYear.get(t) || 0;
      const earnedT = Math.round(monthsEarned(joinDate, t) * type.monthlyCredit * 100) / 100;
      const usedT = usageByYear.get(t)?.used || 0;
      const leftover = Math.round((carried + opening + earnedT - usedT) * 100) / 100;
      carried = leftover > 0 ? leftover : 0;
    }
  }

  const opening = openingByYear.get(year) || 0;
  const earnedMonths = probation
    ? 0
    : type.rolloverMonthly
      ? monthsEarned(joinDate, year)
      : Math.min(monthsEarned(joinDate, year), 1);
  const earned = Math.round(earnedMonths * type.monthlyCredit * 100) / 100;

  const usage = usageByYear.get(year) || { used: 0, pending: 0, withoutPay: 0 };
  const available = Math.round((carried + opening + earned - usage.used) * 100) / 100;

  return {
    typeId: type.id,
    name: type.name,
    isPaid: type.isPaid,
    monthlyCredit: type.monthlyCredit,
    earned,
    used: Math.round(usage.used * 100) / 100,
    pending: Math.round(usage.pending * 100) / 100,
    available,
    withoutPay: Math.round(usage.withoutPay * 100) / 100,
    carriedOver: Math.round(carried * 100) / 100,
    openingBalance: Math.round(opening * 100) / 100,
  };
}

/**
 * Compute a single user's balance for one leave type in a year.
 */
export async function computeTypeBalance(
  userId: string,
  joinDate: Date,
  type: LeaveTypeInfo,
  year: number
): Promise<BalanceEntry> {
  const startYear = Math.min(joinDate.getFullYear(), year);
  const start = new Date(Date.UTC(startYear, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const [requests, openings, user] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        userId,
        leaveTypeId: type.id,
        status: { in: ["APPROVED", "PENDING"] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { status: true, startDate: true, durationDays: true, isWithoutPay: true, halfDayDays: true, withoutPayDays: true },
    }),
    prisma.leaveOpeningBalance.findMany({
      where: { userId, leaveTypeId: type.id },
      select: { year: true, balance: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { isProbation: true } }),
  ]);

  const usageByYear = new Map<number, YearlyUsage>();
  for (const r of requests) {
    const y = r.startDate.getUTCFullYear();
    const u = usageByYear.get(y) || { used: 0, pending: 0, withoutPay: 0 };
    const { paid, withoutPay } = splitPaidUnpaid(r);
    if (r.status === "APPROVED") {
      u.withoutPay += withoutPay;
      u.used += paid;
    } else if (r.status === "PENDING") {
      u.pending += paid + withoutPay;
    }
    usageByYear.set(y, u);
  }

  const openingByYear = new Map(openings.map((o) => [o.year, o.balance]));
  return computeBalanceFromData(joinDate, type, year, openingByYear, usageByYear, user?.isProbation || false);
}

/**
 * Compute balances for many users in one pass (avoids N+1 aggregate queries).
 */
export async function computeBalancesForUsers(
  users: { id: string; createdAt: Date; isProbation: boolean }[],
  types: LeaveTypeInfo[],
  year: number
): Promise<Map<string, BalanceEntry[]>> {
  const minJoinYear = Math.min(...users.map((u) => u.createdAt.getFullYear()), year);
  const start = new Date(Date.UTC(minJoinYear, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const [requests, openings] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        leaveTypeId: { in: types.map((t) => t.id) },
        status: { in: ["APPROVED", "PENDING"] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: {
        userId: true,
        leaveTypeId: true,
        status: true,
        startDate: true,
        durationDays: true,
        isWithoutPay: true,
        halfDayDays: true,
        withoutPayDays: true,
      },
    }),
    prisma.leaveOpeningBalance.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        leaveTypeId: { in: types.map((t) => t.id) },
      },
      select: { userId: true, leaveTypeId: true, year: true, balance: true },
    }),
  ]);
  const keyOf = (userId: string, leaveTypeId: string) => `${userId}|${leaveTypeId}`;

  const openingsByKey = new Map<string, Map<number, number>>();
  for (const o of openings) {
    const key = keyOf(o.userId, o.leaveTypeId);
    let m = openingsByKey.get(key);
    if (!m) {
      m = new Map();
      openingsByKey.set(key, m);
    }
    m.set(o.year, o.balance);
  }

  const usageByKey = new Map<string, Map<number, YearlyUsage>>();
  for (const r of requests) {
    const key = keyOf(r.userId, r.leaveTypeId);
    let m = usageByKey.get(key);
    if (!m) {
      m = new Map();
      usageByKey.set(key, m);
    }
    const y = r.startDate.getUTCFullYear();
    const u = m.get(y) || { used: 0, pending: 0, withoutPay: 0 };
    const { paid, withoutPay } = splitPaidUnpaid(r);
    if (r.status === "APPROVED") {
      u.withoutPay += withoutPay;
      u.used += paid;
    } else if (r.status === "PENDING") {
      u.pending += paid + withoutPay;
    }
    m.set(y, u);
  }

  const result = new Map<string, BalanceEntry[]>();

  for (const user of users) {
    const balances: BalanceEntry[] = types.map((type) =>
      computeBalanceFromData(
        user.createdAt,
        type,
        year,
        openingsByKey.get(keyOf(user.id, type.id)) || new Map(),
        usageByKey.get(keyOf(user.id, type.id)) || new Map(),
        user.isProbation
      )
    );
    result.set(user.id, balances);
  }

  return result;
}
