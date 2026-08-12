'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HrAdminLayout } from '@/components/hr/HrAdminLayout';
import LeaveCalendar, { CalendarEvent, STATUS_LABELS, statusDotStyle } from '@/components/hr/LeaveCalendar';
import { Loader2, CalendarCheck, Hourglass, Users, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function HrAdminDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [counts, setCounts] = useState({ approved: 0, pending: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [dayDetail, setDayDetail] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/hr/admin/login');
        return;
      }

      const now = new Date();
      const response = await fetch(
        `/api/hr/leaves/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }
      );

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/hr/admin/login');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch calendar');

      const data = await response.json();
      setEvents(data.events || []);
      setCounts(data.counts || {});
    } catch (error) {
      console.error(error);
      toast.error('Failed to load team calendar');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const onLeaveToday = events.filter(
    (e) => e.startDate.slice(0, 10) <= todayStr && e.endDate.slice(0, 10) >= todayStr && e.status === 'APPROVED'
  );

  const stats = [
    {
      label: 'Approved this month',
      value: counts.approved,
      icon: CalendarCheck,
      style: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Pending approval',
      value: counts.pending,
      icon: Hourglass,
      style: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'On leave today',
      value: onLeaveToday.length,
      icon: Users,
      style: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Total leave events',
      value: counts.total,
      icon: CalendarRange,
      style: 'text-zinc-600 dark:text-zinc-400',
      bg: 'bg-zinc-500/10',
    },
  ];

  return (
    <HrAdminLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
              Team Calendar
            </h1>
            <p className="text-[19px] text-zinc-500 dark:text-zinc-400 font-light">
              Every approved and pending leave across the company.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
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

            {/* On leave today strip */}
            {onLeaveToday.length > 0 && (
              <div className="p-5 rounded-3xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10">
                <p className="text-[14px] font-semibold text-emerald-700 dark:text-emerald-400 mb-2.5">
                  On leave today ({onLeaveToday.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {onLeaveToday.map((e) => (
                    <span
                      key={e.id}
                      className="px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-emerald-500/15 text-[12px] font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      {e.userName} · {e.attendanceTypeName || e.typeName}
                      {e.isHalfDay ? ' (half day)' : ''}
                      {!e.attendanceTypeName && e.isWithoutPay ? ' · without pay' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Team calendar */}
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
              <LeaveCalendar
                events={events}
                showNames
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
                    {e.userName || 'Employee'} · {e.attendanceTypeName || e.typeName}
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
    </HrAdminLayout>
  );
}
