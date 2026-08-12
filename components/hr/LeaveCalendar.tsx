'use client';

import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

export interface CalendarEvent {
  id: string;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  typeName: string;
  userName?: string;
  isHalfDay?: boolean;
  halfDaySession?: string | null;
  durationDays?: number;
  reason?: string;
  attendanceTypeName?: string | null;
  /** Per-day attendance type names: { "YYYY-MM-DD": name } for mixed requests */
  attendanceTypeNames?: Record<string, string> | null;
  /** Per-day half-day sessions: { "YYYY-MM-DD": "FIRST_HALF" | "SECOND_HALF" } */
  halfDayDays?: Record<string, string> | null;
  /** Days inside the range excluded from the leave */
  skippedDays?: string[] | null;
  /** Days not deducted from the paid balance: ["YYYY-MM-DD", ...] */
  withoutPayDays?: string[] | null;
  isWithoutPay?: boolean;
}

interface LeaveCalendarProps {
  events: CalendarEvent[];
  showNames?: boolean;
  onDayClick?: (date: Date, dayEvents: CalendarEvent[]) => void;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  APPROVED: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20',
  PENDING: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20',
  REJECTED: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-red-500/20',
  CANCELLED: 'bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400 border-zinc-500/20',
};

export const STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Approved',
  PENDING: 'Pending',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export function statusDotStyle(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'bg-emerald-500';
    case 'PENDING':
      return 'bg-amber-500';
    case 'REJECTED':
      return 'bg-red-500';
    case 'CANCELLED':
      return 'bg-zinc-400';
    default:
      return 'bg-zinc-400';
  }
}

export default function LeaveCalendar({
  events,
  showNames = false,
  onDayClick,
  className = '',
}: LeaveCalendarProps) {
  const [viewMonth, setViewMonth] = useState(() => new Date());

  const eventByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const start = parseISO(event.startDate);
      const end = parseISO(event.endDate);
      const skipped = new Set(event.skippedDays || []);
      const days = eachDayOfInterval({ start, end });
      for (const day of days) {
        const key = format(day, 'yyyy-MM-dd');
        if (skipped.has(key)) continue;
        // Per-day resolution so a mixed request renders correctly: half-day
        // state, pay state and attendance type name all vary by day.
        const session = event.halfDayDays?.[key];
        const isWopDay = event.withoutPayDays?.length
          ? event.withoutPayDays.includes(key)
          : !!event.isWithoutPay;
        const dayEvent: CalendarEvent = {
          ...event,
          isHalfDay: session !== undefined,
          halfDaySession: session ?? null,
          attendanceTypeName: event.attendanceTypeNames?.[key] ?? null,
          isWithoutPay: isWopDay,
        };
        const list = map.get(key) || [];
        list.push(dayEvent);
        map.set(key, list);
      }
    }
    return map;
  }, [events]);

  const days = useMemo(
    () => eachDayOfInterval({
      start: startOfWeek(startOfMonth(viewMonth)),
      end: endOfWeek(endOfMonth(viewMonth)),
    }),
    [viewMonth]
  );

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-zinc-400" />
          <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 capitalize">
            {format(viewMonth, 'MMMM yyyy')}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMonth((m) => addMonths(m, -1))}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMonth(new Date())}
            className="px-3 py-1.5 rounded-xl text-[13px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = eventByDay.get(key) || [];
          const inMonth = isSameMonth(day, viewMonth);
          const today = isToday(day);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <button
              key={key}
              onClick={() => onDayClick?.(day, dayEvents)}
              disabled={!onDayClick}
              className={`relative min-h-[72px] sm:min-h-[88px] rounded-2xl border p-1.5 flex flex-col items-start gap-0.5 text-left transition-all ${
                inMonth
                  ? 'bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04]'
                  : 'bg-zinc-50 dark:bg-zinc-950/50 border-transparent opacity-50'
              } ${
                onDayClick ? 'hover:border-primary/30 cursor-pointer' : 'cursor-default'
              } ${isWeekend && inMonth ? 'bg-zinc-50/50 dark:bg-zinc-900/50' : ''}`}
            >
              <span
                className={`text-[12px] font-medium leading-none ${
                  today
                    ? 'w-6 h-6 flex items-center justify-center rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                    : inMonth
                      ? 'text-zinc-600 dark:text-zinc-400'
                      : 'text-zinc-400 dark:text-zinc-600'
                }`}
              >
                {format(day, 'd')}
              </span>

              {dayEvents.slice(0, 2).map((event) => (
                <span
                  key={event.id}
                  title={eventTitle(event)}
                  className={`w-full truncate text-[10px] font-medium leading-tight px-1.5 py-[3px] rounded-md border ${STATUS_STYLES[event.status] || STATUS_STYLES.PENDING}`}
                >
                  {showNames
                    ? (event.userName || 'Employee')
                    : event.attendanceTypeName || event.typeName}
                  {event.isHalfDay ? ' ½' : ''}
                  {!event.attendanceTypeName && event.isWithoutPay ? ' · without pay' : ''}
                </span>
              ))}
              {dayEvents.length > 2 && (
                <span className="text-[10px] font-medium text-zinc-400 pl-1">
                  +{dayEvents.length - 2} more
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${statusDotStyle(key)}`} />
            <span className="text-[12px] text-zinc-500 dark:text-zinc-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function eventTitle(event: CalendarEvent): string {
  const who = event.userName ? `${event.userName} · ` : '';
  const label = event.attendanceTypeName || event.typeName;
  const half = event.isHalfDay ? ` (Half day${event.halfDaySession ? ` — ${event.halfDaySession === 'FIRST_HALF' ? 'First half' : 'Second half'}` : ''})` : '';
  const pay = !event.attendanceTypeName && event.isWithoutPay ? ' · WITHOUT PAY' : '';
  const reason = event.reason ? `\nReason: ${event.reason}` : '';
  return `${who}${label}${pay} · ${STATUS_LABELS[event.status] || event.status}${half} · ${event.durationDays ?? 0} day(s)${reason}`;
}
