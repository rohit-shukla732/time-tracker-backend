'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HrEmployeeLayout } from '@/components/hr/HrEmployeeLayout';
import LeaveCalendar, { CalendarEvent, STATUS_LABELS, statusDotStyle } from '@/components/hr/LeaveCalendar';
import { Plus, Loader2, CalendarCheck, Hourglass, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface BalanceEntry {
  typeId: string;
  name: string;
  isPaid: boolean;
  monthlyCredit: number;
  earned: number;
  used: number;
  pending: number;
  available: number;
  withoutPay: number;
}

export default function HrEmployeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [isProbation, setIsProbation] = useState(false);
  const [totals, setTotals] = useState({ totalEarned: 0, totalUsed: 0, totalPending: 0, totalAvailable: 0 });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayDetail, setDayDetail] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/hr/employee/login');
        return;
      }

      const now = new Date();
      const [balanceRes, calendarRes] = await Promise.all([
        fetch('/api/leaves/balance', {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
        fetch(`/api/leaves/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
      ]);

      if (balanceRes.status === 401 || calendarRes.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/hr/employee/login');
        return;
      }

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setBalances(data.balances || []);
        setIsProbation(data.isProbation || false);
        setTotals(data.totals || {});
      }
      if (calendarRes.ok) {
        const data = await calendarRes.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
    fetchData();
  }, [fetchData]);

  const stats = [
    {
      label: 'Available',
      value: totals.totalAvailable,
      icon: CheckCircle2,
      style: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Approved this year',
      value: totals.totalUsed,
      icon: CalendarCheck,
      style: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Pending approval',
      value: totals.totalPending,
      icon: Hourglass,
      style: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Accrued this year',
      value: totals.totalEarned,
      icon: CalendarCheck,
      style: 'text-zinc-600 dark:text-zinc-400',
      bg: 'bg-zinc-500/10',
    },
  ];

  return (
    <HrEmployeeLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
              {user ? `Hello, ${user.name.split(' ')[0]}` : 'Leave Management'}
            </h1>
            <p className="text-[19px] text-zinc-500 dark:text-zinc-400 font-light">
              Plan your time off and track every request.
            </p>
          </div>
          <button
            onClick={() => router.push('/hr/employee/apply')}
            className="flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[15px] font-medium tracking-wide shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] active:scale-[0.98] transition-all duration-200"
          >
            <Plus className="h-5 w-5" />
            Apply for Leave
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className={`h-10 w-10 rounded-2xl ${s.bg} flex items-center justify-center mb-3`}>
                      <Icon className={`h-5 w-5 ${s.style}`} />
                    </div>
                    <p className="text-[30px] font-semibold tracking-tight leading-none text-zinc-900 dark:text-white">
                      {s.value}
                    </p>
                    <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1.5">{s.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Balance per type */}
            {isProbation && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[13px] font-medium text-amber-600 dark:text-amber-400">
                Probation — no leave accrual. Balances below only reflect opening balances and
                rollovers.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {balances.map((b) => (
                <div
                  key={b.typeId}
                  className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[16px] font-semibold text-zinc-900 dark:text-white">{b.name}</p>
                      <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                        {b.isPaid ? 'Paid' : 'Unpaid'} · {b.monthlyCredit} day(s)/month
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[24px] font-semibold tracking-tight text-zinc-900 dark:text-white">
                        {b.available}
                        <span className="text-[13px] text-zinc-400 font-medium"> available</span>
                      </p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(100, (b.earned === 0 ? 0 : (b.used / b.earned) * 100))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2.5 text-[12px] text-zinc-500 dark:text-zinc-400">
                    <span>{b.used} used</span>
                    <span>{b.pending} pending</span>
                    <span>{b.earned} accrued</span>
                  </div>
                  {b.withoutPay > 0 && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[12px] font-medium text-amber-600 dark:text-amber-400">
                      {b.withoutPay} day(s) approved without pay
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Calendar */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
              <LeaveCalendar
                events={events}
                onDayClick={(date, dayEvents) => setDayDetail({ date, events: dayEvents })}
              />
            </div>
          </>
        )}
      </div>

      {/* Day detail dialog */}
      <Dialog open={!!dayDetail} onOpenChange={(open) => !open && setDayDetail(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="text-[18px] tracking-tight">
              {dayDetail
                ? dayDetail.date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : ''}
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              {dayDetail?.events.length
                ? `${dayDetail.events.length} leave event(s) on this day`
                : 'No leaves on this day.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {dayDetail?.events.map((e) => (
              <div
                key={e.id}
                className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04]"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[14px] font-semibold text-zinc-900 dark:text-white">
                    {e.attendanceTypeName || e.typeName}
                    {!e.attendanceTypeName && e.isWithoutPay ? (
                      <span className="ml-2 text-[11px] font-medium text-amber-600 dark:text-amber-400">without pay</span>
                    ) : null}
                  </p>
                  <span className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-600 dark:text-zinc-300">
                    <span className={`h-2 w-2 rounded-full ${statusDotStyle(e.status)}`} />
                    {STATUS_LABELS[e.status]}
                  </span>
                </div>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                  {e.isHalfDay
                    ? `Half day (${e.halfDaySession === 'FIRST_HALF' ? 'first half' : 'second half'})`
                    : 'Full day'}
                  {' · '}
                  {e.durationDays} day(s)
                </p>
                {e.reason && <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1">{e.reason}</p>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </HrEmployeeLayout>
  );
}
