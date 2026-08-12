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
import { ChevronLeft, ChevronRight, CalendarCheck, Loader2, Info } from 'lucide-react';
import { HrEmployeeLayout } from '@/components/hr/HrEmployeeLayout';

interface AttendanceEntry {
  id: string;
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
  firstIn: string | null;
  lastOut: string | null;
}

function punchTime(iso?: string | null): string {
  if (!iso) return '—';
  return iso.slice(11, 16);
}

export default function EmployeeAttendancePage() {
  const router = useRouter();
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [workingDays, setWorkingDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState<AttendanceEntry | null>(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/hr/employee/login');
      return;
    }
  }, [router]);

  const fetchMonth = useCallback(async (month: Date) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `/api/attendance/my?year=${month.getFullYear()}&month=${month.getMonth() + 1}`,
        { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' }
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to load attendance');
        setEntries([]);
        return;
      }
      setEntries(data.entries || []);
      setSummary(data.summary || {});
      setWorkingDays(data.workingDays || 0);
    } catch (e) {
      console.error('Failed to load attendance:', e);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonth(viewMonth);
  }, [viewMonth, fetchMonth]);

  const entryByDay = useMemo(() => {
    const map = new Map<string, AttendanceEntry>();
    for (const e of entries) {
      map.set(e.date.slice(0, 10), e);
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
  const totalDays = Object.values(summary).reduce((a, b) => a + b, 0);
  const paidLeave = Object.entries(summary)
    .filter(([code]) => code.startsWith('APPROVED'))
    .reduce((a, [, n]) => a + n, 0);

  return (
    <HrEmployeeLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
        <div className="space-y-2">
          <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
            My Attendance
          </h1>
          <p className="text-[15px] text-zinc-500 dark:text-zinc-400">
            Your attendance calendar — leave days, weekends and holidays are tracked automatically.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
            {error}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04]">
            <p className="text-[12px] font-medium uppercase tracking-wider text-zinc-400">Recorded days</p>
            <p className="text-[28px] font-semibold tracking-tight mt-1">{totalDays}</p>
          </div>
          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04]">
            <p className="text-[12px] font-medium uppercase tracking-wider text-zinc-400">Working days</p>
            <p className="text-[28px] font-semibold tracking-tight mt-1">{workingDays}</p>
          </div>
          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04]">
            <p className="text-[12px] font-medium uppercase tracking-wider text-zinc-400">Approved leave</p>
            <p className="text-[28px] font-semibold tracking-tight mt-1">{paidLeave}</p>
          </div>
          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04]">
            <p className="text-[12px] font-medium uppercase tracking-wider text-zinc-400">Pending leave</p>
            <p className="text-[28px] font-semibold tracking-tight mt-1">
              {Object.entries(summary)
                .filter(([code]) => code.startsWith('UNAPPROVED'))
                .reduce((a, [, n]) => a + n, 0)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04]">
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
                    const entry = entryByDay.get(key);
                    const inMonth = isSameMonth(day, viewMonth);
                    const today = isToday(day);
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDay(entry || null)}
                        className={`relative min-h-[64px] sm:min-h-[76px] rounded-2xl border p-1.5 flex flex-col items-start gap-0.5 text-left transition-all ${
                          inMonth
                            ? 'bg-zinc-50/50 dark:bg-zinc-950/40 border-black/[0.04] dark:border-white/[0.04]'
                            : 'bg-zinc-50 dark:bg-zinc-950/50 border-transparent opacity-50'
                        } hover:border-primary/30 cursor-pointer`}
                        style={entry ? { borderColor: entry.color + '66' } : undefined}
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
                        {entry && (
                          <span
                            className="w-full truncate text-[10px] font-medium leading-tight px-1.5 py-[3px] rounded-md border"
                            style={{
                              color: entry.color,
                              backgroundColor: entry.color + '14',
                              borderColor: entry.color + '33',
                            }}
                            title={`${entry.typeName}${entry.note ? ` — ${entry.note}` : ''}`}
                          >
                            {entry.typeName}
                          </span>
                        )}
                        {entry?.firstIn && (
                          <span
                            className="w-full truncate text-[9.5px] font-medium leading-tight text-zinc-500 dark:text-zinc-400 px-1"
                            title={
                              entry.lastOut
                                ? `First in ${punchTime(entry.firstIn)} · Last out ${punchTime(entry.lastOut)}`
                                : `First in ${punchTime(entry.firstIn)}`
                            }
                          >
                            {entry.lastOut
                              ? `${punchTime(entry.firstIn)} – ${punchTime(entry.lastOut)}`
                              : `In ${punchTime(entry.firstIn)}`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Type breakdown */}
          <div className="space-y-4">
            <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04]">
              <h3 className="text-[15px] font-semibold tracking-tight mb-4">Type breakdown</h3>
              <div className="space-y-3">
                {Object.entries(summary).length === 0 && (
                  <p className="text-[13px] text-zinc-400">No records for this month yet.</p>
                )}
                {Object.entries(summary).map(([code, count]) => {
                  const entry = entries.find((e) => e.typeCode === code);
                  return (
                    <div key={code} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry?.color || '#a1a1aa' }} />
                        <span className="text-[13px] text-zinc-600 dark:text-zinc-300">{entry?.typeName || code}</span>
                      </div>
                      <span className="text-[13px] font-semibold">{count} day(s)</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-black/[0.04] dark:border-white/[0.04]">
              <div className="flex items-start gap-2.5">
                <Info className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                <p className="text-[12.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Weekends and holidays appear automatically. Approved leave updates this calendar
                  the moment your manager decides. Corrections are made by HR.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Day detail dialog */}
        {selectedDay && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
            onClick={() => setSelectedDay(null)}
          >
            <div
              className="w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="h-10 w-10 rounded-2xl flex items-center justify-center text-[11px] font-bold uppercase"
                  style={{ color: selectedDay.color, backgroundColor: selectedDay.color + '14' }}
                >
                  {selectedDay.typeCode.slice(0, 2)}
                </span>
                <div>
                  <p className="text-[15px] font-semibold">
                    {new Date(selectedDay.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-[13px] text-zinc-500">{selectedDay.typeName}</p>
                </div>
              </div>
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Paid</span>
                  <span className="font-medium">{selectedDay.isPaid ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Source</span>
                  <span className="font-medium">{selectedDay.source}</span>
                </div>
                {(selectedDay.firstIn || selectedDay.lastOut) && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">First in</span>
                      <span className="font-medium font-mono">{punchTime(selectedDay.firstIn)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Last out</span>
                      <span className="font-medium font-mono">{punchTime(selectedDay.lastOut)}</span>
                    </div>
                  </>
                )}
                {selectedDay.note && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Note</span>
                    <span className="font-medium text-right max-w-[60%]">{selectedDay.note}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="mt-5 w-full h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-[14px] font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </HrEmployeeLayout>
  );
}
