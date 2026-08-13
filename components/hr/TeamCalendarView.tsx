'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LeaveCalendar, {
  type CalendarEvent,
  STATUS_LABELS,
  statusDotStyle,
} from '@/components/hr/LeaveCalendar';
import { format } from 'date-fns';
import { Loader2, Users, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TeamCalendarData {
  events: CalendarEvent[];
  attendance: CalendarEvent[];
  counts: {
    approved: number;
    pending: number;
    rejected: number;
    attendance: number;
    total: number;
  };
}

interface TeamCalendarViewProps {
  loginPath: string;
  heading: string;
  description: string;
}

export default function TeamCalendarView({
  loginPath,
  heading,
  description,
}: TeamCalendarViewProps) {
  const router = useRouter();
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [data, setData] = useState<TeamCalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayDetail, setDayDetail] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);

  const fetchCalendar = useCallback(
    async (month: Date) => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          toast.error('Please log in to continue');
          router.push(loginPath);
          return;
        }

        const params = new URLSearchParams({
          year: String(month.getFullYear()),
          month: String(month.getMonth() + 1),
        });
        const response = await fetch(`/api/leaves/team-calendar?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });

        if (response.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          router.push(loginPath);
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch team calendar');

        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load team calendar');
      } finally {
        setLoading(false);
      }
    },
    [router, loginPath]
  );

  useEffect(() => {
    setLoading(true);
    fetchCalendar(viewMonth);
  }, [fetchCalendar, viewMonth]);

  // Leave events + attendance entries merged into one calendar.
  const combinedEvents = (): CalendarEvent[] => {
    if (!data) return [];
    return [...data.events, ...data.attendance];
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
            {heading}
          </h1>
          <p className="text-[19px] text-zinc-500 dark:text-zinc-400 font-light">{description}</p>
        </div>
        {data && !loading && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 text-[12px] font-semibold">
              <span className={`h-2 w-2 rounded-full ${statusDotStyle('APPROVED')}`} />
              {data.counts.approved} approved
            </span>
            <span className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 text-[12px] font-semibold">
              <span className={`h-2 w-2 rounded-full ${statusDotStyle('PENDING')}`} />
              {data.counts.pending} pending
            </span>
            <span className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400 text-[12px] font-semibold">
              <CalendarDays className="h-3.5 w-3.5" />
              {data.counts.attendance} attendance
            </span>
          </div>
        )}
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <LeaveCalendar
          events={combinedEvents()}
          showNames
          viewMonth={viewMonth}
          onViewMonthChange={setViewMonth}
          onDayClick={(date, events) => setDayDetail({ date, events })}
        />
      )}

      {/* Day detail dialog */}
      <Dialog
        open={!!dayDetail}
        onOpenChange={(open) => !open && setDayDetail(null)}
      >
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="text-[18px] tracking-tight">
              {dayDetail ? format(dayDetail.date, 'EEEE, MMMM d, yyyy') : ''}
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              {dayDetail && dayDetail.events.length > 0
                ? `${dayDetail.events.length} entr${dayDetail.events.length === 1 ? 'y' : 'ies'} for this day`
                : 'Nothing scheduled for this day.'}
            </DialogDescription>
          </DialogHeader>
          {dayDetail && dayDetail.events.length > 0 && (
            <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04] max-h-[50vh] overflow-y-auto">
              {dayDetail.events.map((event) => (
                <div key={`${event.id}-${event.startDate}`} className="py-3 flex items-start gap-3">
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                    style={
                      event.color
                        ? { color: event.color, backgroundColor: event.color + '14' }
                        : undefined
                    }
                  >
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-semibold text-zinc-900 dark:text-white">
                        {event.userName || 'Employee'}
                      </p>
                      {event.status !== 'ATTENDANCE' && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                            event.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                              : event.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                                : 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                          }`}
                        >
                          {STATUS_LABELS[event.status] || event.status}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {event.attendanceTypeName || event.typeName}
                      {event.isHalfDay ? ' · Half day' : ''}
                      {event.isWithoutPay ? ' · Without pay' : ''}
                      {event.status !== 'ATTENDANCE' && ` · ${event.durationDays ?? 0} day(s)`}
                    </p>
                    {event.reason && (
                      <p className="text-[13px] text-zinc-600 dark:text-zinc-300 mt-1">
                        {event.reason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}