'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Send,
  Wallet,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { HrEmployeeLayout } from '@/components/hr/HrEmployeeLayout';
import { Button } from '@/components/ui/button';

interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  monthlyCredit: number;
  isPaid: boolean;
}

interface BalanceEntry {
  typeId: string;
  name: string;
  earned: number;
  used: number;
  pending: number;
  available: number;
}

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const HALF_SESSIONS = ['FIRST_HALF', 'SECOND_HALF'] as const;
type Session = (typeof HALF_SESSIONS)[number];

export default function ApplyLeavePage() {
  const router = useRouter();
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [typeId, setTypeId] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [halfDays, setHalfDays] = useState<Record<string, Session>>({});
  const [withoutPay, setWithoutPay] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [viewMonth, setViewMonth] = useState(() => new Date());

  const todayStr = toInputDate(new Date());

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      toast.error('Please log in to continue');
      router.push('/hr/employee/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [typesRes, balanceRes] = await Promise.all([
          fetch('/api/leaves/types', {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          }),
          fetch('/api/leaves/balance', {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          }),
        ]);
        if (typesRes.status === 401 || balanceRes.status === 401) {
          localStorage.removeItem('accessToken');
          router.push('/hr/employee/login');
          return;
        }
        if (typesRes.ok) {
          const data = await typesRes.json();
          setTypes(data.types || []);
          if (data.types?.length) setTypeId((prev) => prev || data.types[0].id);
        }
        if (balanceRes.ok) {
          const data = await balanceRes.json();
          setBalances(data.balances || []);
        }
      } catch (e) {
        console.error('Failed to load leave data:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const selectedBalance = balances.find((b) => b.typeId === typeId);
  const selectedType = types.find((t) => t.id === typeId);
  const held = selectedBalance ? selectedBalance.available - selectedBalance.pending : 0;

  const selectedList = useMemo(() => [...selected].sort(), [selected]);
  const fullDays = selectedList.filter((d) => !halfDays[d]).length;
  const halfDayCount = selectedList.filter((d) => halfDays[d]).length;
  const duration = fullDays + halfDayCount * 0.5;
  const paidTotal = selectedList.reduce(
    (sum, iso) => (withoutPay.has(iso) ? sum : sum + (halfDays[iso] ? 0.5 : 1)),
    0
  );
  const withoutPayTotal = Math.round((duration - paidTotal) * 100) / 100;

  const startDate = selectedList[0] || '';
  const endDate = selectedList[selectedList.length - 1] || '';

  // Skipped days = any day inside the min..max range that isn't selected.
  const skippedDays = useMemo(() => {
    if (!startDate || !endDate) return [];
    const days: string[] = [];
    for (let t = new Date(`${startDate}T00:00:00Z`).getTime(); t <= new Date(`${endDate}T00:00:00Z`).getTime(); t += 86_400_000) {
      const key = new Date(t).toISOString().slice(0, 10);
      if (!selected.has(key)) days.push(key);
    }
    return days;
  }, [startDate, endDate, selected]);

  // Auto-balance: keep days paid (in date order) while they fit the balance,
  // flip the remaining days to without pay. Manual choices are respected as
  // long as the paid total stays within the balance.
  useEffect(() => {
    if (loading || balances.length === 0 || !typeId) return;
    if (selectedList.length === 0) {
      if (withoutPay.size > 0) setWithoutPay(new Set());
      return;
    }
    if (paidTotal <= held) return;
    const next = new Set<string>();
    let used = 0;
    for (const iso of selectedList) {
      const cost = halfDays[iso] ? 0.5 : 1;
      if (used + cost <= held) used += cost;
      else next.add(iso);
    }
    const same = next.size === withoutPay.size && [...next].every((k) => withoutPay.has(k));
    if (!same) setWithoutPay(next);
  }, [selectedList, halfDays, held, paidTotal, loading, balances.length, typeId]);

  const toggleDay = (iso: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) {
        next.delete(iso);
        setHalfDays((h) => {
          const copy = { ...h };
          delete copy[iso];
          return copy;
        });
        setWithoutPay((w) => {
          const copy = new Set(w);
          copy.delete(iso);
          return copy;
        });
      } else {
        next.add(iso);
      }
      return next;
    });
  };

  const setDaySession = (iso: string, session: Session | null) => {
    setHalfDays((h) => {
      const copy = { ...h };
      if (session) copy[iso] = session;
      else delete copy[iso];
      return copy;
    });
  };

  const setDayPay = (iso: string, unpaid: boolean) => {
    setWithoutPay((w) => {
      const copy = new Set(w);
      if (unpaid) copy.add(iso);
      else copy.delete(iso);
      return copy;
    });
  };

  const gridDays = useMemo(
    () => eachDayOfInterval({
      start: startOfWeek(startOfMonth(viewMonth)),
      end: endOfWeek(endOfMonth(viewMonth)),
    }),
    [viewMonth]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeId || selectedList.length === 0 || !reason.trim()) {
      setError(selectedList.length === 0 ? 'Please pick at least one day on the calendar.' : 'Please fill in all fields.');
      return;
    }
    if (paidTotal > held) {
      setError(
        `You only have ${Math.max(held, 0)} day(s) of ${selectedType?.name || 'this type'} available for paid leave — mark some days "Without pay" or reduce the days.`
      );
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          leaveTypeId: typeId,
          startDate,
          endDate,
          halfDayDays: halfDays,
          skippedDays,
          withoutPayDays: [...withoutPay],
          reason,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to apply for leave');
        return;
      }

      toast.success(
        withoutPayTotal > 0
          ? `Leave application submitted (${withoutPayTotal} day(s) without pay)`
          : 'Leave application submitted for approval'
      );
      router.push('/hr/employee');
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <HrEmployeeLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <Link
              href="/hr/employee"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
            <h1 className="text-[32px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100 mt-1.5">
              Apply for Leave
            </h1>
            <p className="text-[15px] text-zinc-500 dark:text-zinc-400 font-light mt-1">
              Click the days you need off — each day can be a full or half day, and paid from your balance or without pay.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[13px] font-medium mb-6">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: calendar + selected days */}
            <div className="space-y-6">
              {/* Calendar */}
              <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-zinc-400" />
                    <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
                      {format(viewMonth, 'MMMM yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewMonth((m) => addMonths(m, -1))}
                      className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMonth(new Date())}
                      className="px-3 py-1.5 rounded-xl text-[13px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMonth((m) => addMonths(m, 1))}
                      className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEKDAYS.map((d, i) => (
                    <div key={i} className="text-center text-[11px] font-semibold uppercase text-zinc-400 dark:text-zinc-500 py-0.5">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {gridDays.map((day) => {
                    const iso = toInputDate(day);
                    const inMonth = isSameMonth(day, viewMonth);
                    const past = iso < todayStr;
                    const isSelected = selected.has(iso);
                    const session = halfDays[iso];
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    return (
                      <button
                        key={iso}
                        type="button"
                        disabled={past}
                        onClick={() => toggleDay(iso)}
                        className={`relative h-10 rounded-xl text-[13px] font-medium transition-all ${
                          past
                            ? 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed'
                            : isSelected
                              ? session
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold'
                                : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold shadow-sm'
                              : inMonth
                                ? isWeekend
                                  ? 'text-zinc-400 dark:text-zinc-600 hover:bg-zinc-900/10 dark:hover:bg-white/10'
                                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-900/10 dark:hover:bg-white/10'
                                : 'text-zinc-300 dark:text-zinc-700 hover:bg-zinc-900/10 dark:hover:bg-white/10'
                        } ${iso === todayStr && !isSelected ? 'ring-1 ring-zinc-900/30 dark:ring-white/30' : ''}`}
                      >
                        {format(day, 'd')}
                        {isSelected && session && <span className="absolute top-0.5 right-1 text-[9px]">½</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-4 text-[12px] text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-md bg-zinc-900 dark:bg-white" /> Full day
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-md bg-amber-500/40" /> Half day
                  </span>
                  <span className="ml-auto">
                    Click a day to add or remove it.
                  </span>
                </div>
              </div>

              {/* Selected days */}
              <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
                    Selected days
                    <span className="ml-2 text-[13px] font-medium text-zinc-400">{selectedList.length}</span>
                  </p>
                  {selectedList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(new Set());
                        setHalfDays({});
                        setWithoutPay(new Set());
                      }}
                      className="text-[12px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {selectedList.length === 0 ? (
                  <p className="text-[13px] text-zinc-400 dark:text-zinc-500 py-2">
                    No days selected yet — pick some on the calendar.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedList.map((iso) => {
                      const d = new Date(`${iso}T00:00:00Z`);
                      const session = halfDays[iso];
                      const unpaid = withoutPay.has(iso);
                      return (
                        <div
                          key={iso}
                          className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-black/[0.04] dark:border-white/[0.04]"
                        >
                          <p className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                            {format(d, 'EEE, MMM d, yyyy')}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex rounded-xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06]">
                              {([null, ...HALF_SESSIONS] as const).map((s) => {
                                const active = s === null ? !session : session === s;
                                return (
                                  <button
                                    key={s || 'full'}
                                    type="button"
                                    onClick={() => setDaySession(iso, s)}
                                    className={`px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                                      active
                                        ? s === null
                                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                        : 'bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                    }`}
                                  >
                                    {s === null ? 'Full' : s === 'FIRST_HALF' ? '1st half' : '2nd half'}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex rounded-xl overflow-hidden border border-black/[0.06] dark:border-white/[0.06]">
                              <button
                                type="button"
                                onClick={() => setDayPay(iso, false)}
                                className={`px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                                  !unpaid
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                }`}
                              >
                                Balance
                              </button>
                              <button
                                type="button"
                                onClick={() => setDayPay(iso, true)}
                                className={`px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                                  unpaid
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                                }`}
                              >
                                No pay
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleDay(iso)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                              aria-label={`Remove ${iso}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedList.length > 0 && (
                  <>
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <span className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[12px] font-medium text-zinc-600 dark:text-zinc-300">
                        {fullDays} full day(s)
                      </span>
                      <span className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[12px] font-medium">
                        {halfDayCount} half day(s)
                      </span>
                      <span className="px-3 py-1.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[12px] font-medium">
                        {duration} day(s) total
                      </span>
                      <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[12px] font-medium">
                        {paidTotal} day(s) from balance
                      </span>
                      {withoutPayTotal > 0 && (
                        <span className="px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[12px] font-medium">
                          {withoutPayTotal} day(s) without pay
                        </span>
                      )}
                      {skippedDays.length > 0 && (
                        <span className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                          {skippedDays.length} day(s) in between skipped
                        </span>
                      )}
                    </div>
                    {!loading && balances.length > 0 && (
                      <p className="flex items-center gap-1.5 mt-3 text-[12px] text-zinc-500 dark:text-zinc-400">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        Days are paid from your balance in date order — when it runs out, the remaining days are
                        automatically marked without pay. You can switch any day manually.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right: details */}
            <div className="space-y-6">
              {/* Leave type */}
              <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] shadow-sm space-y-2">
                <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                  Leave type
                </label>
                <select
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  required
                  className="w-full h-[50px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                >
                  {types.length === 0 && <option value="">No leave types available</option>}
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.isPaid ? 'Paid' : 'Unpaid'} · {t.monthlyCredit}/month)
                    </option>
                  ))}
                </select>
                {selectedBalance && (
                  <div className="flex items-center gap-1.5 text-[12px] text-zinc-500 dark:text-zinc-400 ml-1">
                    <Wallet className="h-3.5 w-3.5" />
                    {selectedBalance.available} day(s) available · {selectedBalance.pending} pending · {selectedBalance.used} used
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] shadow-sm space-y-2">
                <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                  Reason
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  rows={4}
                  placeholder="Briefly explain why you need this leave..."
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all resize-none"
                />
              </div>

              {/* Submit */}
              <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className="text-[14px] text-zinc-500 dark:text-zinc-400">
                    Total duration:
                    <span className="ml-1.5 font-semibold text-zinc-900 dark:text-white">{duration} day(s)</span>
                  </span>
                  <span className="text-[13px] text-zinc-500 dark:text-zinc-400">
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{paidTotal}</span> from balance
                    {withoutPayTotal > 0 && (
                      <>
                        {' '}· <span className="font-medium text-amber-600 dark:text-amber-400">{withoutPayTotal}</span> without pay
                      </>
                    )}
                  </span>
                </div>
                <Button
                  type="submit"
                  disabled={submitting || loading || types.length === 0}
                  className="w-full h-12 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-[15px]"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </HrEmployeeLayout>
  );
}
