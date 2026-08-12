/**
 * Client-side portion of a leave request's duration that is without pay,
 * using the per-day selection (falls back to the legacy whole-request flag).
 */
export function withoutPayPortion(r: {
  isWithoutPay?: boolean;
  durationDays?: number;
  halfDayDays?: Record<string, string> | null;
  withoutPayDays?: string[] | null;
}): number {
  if (r.withoutPayDays?.length) {
    return r.withoutPayDays.reduce(
      (sum, d) => sum + (r.halfDayDays?.[d] ? 0.5 : 1),
      0
    );
  }
  return r.isWithoutPay ? r.durationDays || 0 : 0;
}
