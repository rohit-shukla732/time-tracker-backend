'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  Loader2,
  Clock,
} from 'lucide-react';
import { HrAdminLayout } from '@/components/hr/HrAdminLayout';

interface AttendanceEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  date: string;
  typeId: string;
  typeName: string;
  typeCode: string;
  category: string;
  color: string;
  isPaid: boolean;
  isOverride: boolean;
  source: string;
  note: string | null;
}

export default function HrAttendancePage() {
  const router = useRouter();
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [lateRows, setLateRows] = useState<{ name: string; isProbation: boolean; totalLate: number; graceMinutes: number; breached: boolean; days: { date: string; lateMinutes: number }[] }[]>([]);
  const [lateLoading, setLateLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) return;
    try {
      const u = JSON.parse(user);
      if (u.role !== 'HR' && u.role !== 'ADMIN') {
        router.push('/hr/employee');
      }
    } catch (e) {
      router.push('/hr/admin/login');
    }
  }, [router]);

  const fetchData = useCallback(async (month: Date) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const calendarRes = await fetch(
        `/api/hr/attendance/calendar?year=${month.getFullYear()}&month=${month.getMonth() + 1}`,
        { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' }
      );
      const calData = await calendarRes.json();
      if (!calendarRes.ok) {
        setError(calData.error || 'Failed to load attendance');
        return;
      }
      setEntries(calData.entries || []);

      const lateRes = await fetch(
        `/api/hr/biometric/late?year=${month.getFullYear()}&month=${month.getMonth() + 1}`,
        { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' }
      );
      if (lateRes.ok) {
        const lateData = await lateRes.json();
        setLateRows(lateData.rows || []);
      } else {
        setLateRows([]);
      }
    } catch (e) {
      console.error('Failed to load attendance:', e);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
      setLateLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(viewMonth);
  }, [viewMonth, fetchData]);

  const entryByDay = useMemo(() => {
    const map = new Map<string, AttendanceEntry[]>();
    for (const e of entries) {
      const key = e.date.slice(0, 10);
      const list = map.get(key) || [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [entries]);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(viewMonth)),
        end: endOfWeek(endOfMonth(viewMonth)),
      }),
    [viewMonth]
  );

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dayEntries = (day: Date): AttendanceEntry[] => entryByDay.get(format(day, 'yyyy-MM-dd')) || [];

  const openDay = (day: Date) => {
    router.push(`/hr/admin/attendance/${format(day, 'yyyy-MM-dd')}`);
  };

  return (
    <HrAdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
              Attendance
            </h1>
            <p className="text-[15px] text-zinc-500 dark:text-zinc-400">
              Company-wide attendance calendar. Click a day to view records and apply a status.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
            {error}
          </div>
        )}

        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04]">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-zinc-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-zinc-400" />
                  <h3 className="text-[17px] font-semibold tracking-tight capitalize">
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

              <div className="grid grid-cols-7 gap-1 mb-1">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-400 py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const dayEntriesList = dayEntries(day);
                  const inMonth = isSameMonth(day, viewMonth);
                  const today = isToday(day);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const holiday = dayEntriesList.find((e) => e.category === 'HOLIDAY');
                  const nonAuto = dayEntriesList.filter(
                    (e) => e.category !== 'HOLIDAY' && e.category !== 'WEEKEND'
                  ).length;
                  return (
                    <button
                      key={key}
                      onClick={() => openDay(day)}
                      className={`relative min-h-[64px] sm:min-h-[80px] rounded-2xl border p-1.5 flex flex-col items-start gap-0.5 text-left transition-all ${
                        inMonth
                          ? 'bg-zinc-50/50 dark:bg-zinc-950/40 border-black/[0.04] dark:border-white/[0.04]'
                          : 'bg-zinc-50 dark:bg-zinc-950/50 border-transparent opacity-50'
                      } hover:border-primary/30 cursor-pointer`}
                    >
                      <span
                        className={`text-[12px] font-medium leading-none ${
                          today
                            ? 'w-6 h-6 flex items-center justify-center rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                            : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                      {isWeekend && inMonth && (
                        <span className="w-full truncate text-[10px] font-medium px-1.5 py-[3px] rounded-md bg-zinc-400/10 text-zinc-500 border border-zinc-400/20">
                          Weekend
                        </span>
                      )}
                      {holiday && (
                        <span
                          className="w-full truncate text-[10px] font-medium px-1.5 py-[3px] rounded-md border"
                          style={{
                            color: holiday.color,
                            backgroundColor: holiday.color + '14',
                            borderColor: holiday.color + '33',
                          }}
                        >
                          {holiday.typeName}
                        </span>
                      )}
                      {nonAuto > 0 && (
                        <span className="text-[10px] text-zinc-400 pl-1">
                          {nonAuto} record(s)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Late policy */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-zinc-400" />
              <h3 className="text-[17px] font-semibold tracking-tight capitalize">
                Late policy — {format(viewMonth, 'MMMM yyyy')}
              </h3>
            </div>
            <span className="text-[12px] text-zinc-400">
              {lateRows.filter((r) => r.breached).length} breach(es) this month
            </span>
          </div>

          {lateLoading ? (
            <div className="flex items-center justify-center py-10 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : lateRows.length === 0 ? (
            <p className="text-[13px] text-zinc-400 text-center py-10">
              No biometric punch data for this month yet. Punches appear here once the import runs.
            </p>
          ) : (
            <div className="space-y-2">
              {lateRows.map((r) => (
                <div
                  key={r.name}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border ${
                    r.breached
                      ? 'bg-red-50/60 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
                      : 'bg-zinc-50/60 dark:bg-zinc-800/40 border-black/[0.04] dark:border-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <p className="text-[14px] font-medium text-zinc-900 dark:text-white truncate">
                      {r.name}
                      {r.isProbation && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wide">
                          Probation
                        </span>
                      )}
                    </p>
                    {r.days.length > 0 && (
                      <p className="text-[12px] text-zinc-400 hidden sm:block truncate">
                        {r.days.map((d) => `${d.date.slice(5)} (${d.lateMinutes}m)`).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[13px] text-zinc-600 dark:text-zinc-300">
                      {r.totalLate} min / {r.graceMinutes} min grace
                    </span>
                    {r.breached ? (
                      <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 text-[11px] font-semibold uppercase tracking-wide">
                        Breached
                      </span>
                    ) : r.totalLate > 0 ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 text-[11px] font-semibold uppercase tracking-wide">
                        Within limit
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </HrAdminLayout>
  );
}
