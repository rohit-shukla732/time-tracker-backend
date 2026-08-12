'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { addDays, format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  Clock,
  Layers,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { HrAdminLayout } from '@/components/hr/HrAdminLayout';
import EmployeeMultiSelect from '@/components/hr/EmployeeMultiSelect';

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
  firstIn?: string | null;
  lastOut?: string | null;
}

interface AttendanceType {
  id: string;
  name: string;
  code: string;
  color: string;
  isSystem: boolean;
  active: boolean;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

function punchTime(iso?: string | null): string {
  if (!iso) return '—';
  return iso.slice(11, 16);
}

export default function AttendanceDayPage() {
  const router = useRouter();
  const params = useParams();
  const dateParam = Array.isArray(params.date) ? params.date[0] : (params.date || '');
  const day = useMemo(() => {
    const d = parseISO(`${dateParam}T00:00:00Z`);
    return isNaN(d.getTime()) ? null : d;
  }, [dateParam]);

  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [types, setTypes] = useState<AttendanceType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applyTypeId, setApplyTypeId] = useState('');
  const [applyNote, setApplyNote] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTypeId, setBulkTypeId] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const fetchData = useCallback(async () => {
    if (!day) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const [dayRes, typesRes, usersRes] = await Promise.all([
        fetch(`/api/hr/attendance/calendar?date=${dateParam}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
        fetch('/api/hr/attendance/types?active=true', {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
        fetch('/api/hr/users?limit=500', {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
      ]);
      const dayData = await dayRes.json();
      if (!dayRes.ok) {
        setError(dayData.error || 'Failed to load attendance');
        return;
      }
      setEntries(dayData.entries || []);
      if (typesRes.ok) {
        const t = await typesRes.json();
        setTypes(t.types || []);
        if (t.types?.length) {
          setApplyTypeId((prev) => prev || t.types[0].id);
          setBulkTypeId((prev) => prev || t.types[0].id);
        }
      }
      if (usersRes.ok) {
        const u = await usersRes.json();
        setEmployees(u.users || []);
      }
    } catch (e) {
      console.error('Failed to load day attendance:', e);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [day, dateParam]);

  useEffect(() => {
    setSelected(new Set());
    setApplyNote('');
    fetchData();
  }, [fetchData]);

  const recordedIds = useMemo(() => new Set(entries.map((e) => e.userId)), [entries]);
  const unrecorded = useMemo(
    () => employees.filter((u) => !recordedIds.has(u.id)),
    [employees, recordedIds]
  );

  const applyToSelected = async () => {
    if (!day || selected.size === 0 || !applyTypeId) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/hr/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({
          date: format(day, 'yyyy-MM-dd'),
          typeId: applyTypeId,
          userIds: [...selected],
          overwrite: true,
          note: applyNote,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to update attendance');
        return;
      }
      toast.success(
        data.updated > 0
          ? `Updated ${data.updated} record(s), created ${data.created}`
          : `Created ${data.created} record(s)`
      );
      setSelected(new Set());
      setApplyNote('');
      fetchData();
    } catch (e) {
      toast.error('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulk = async () => {
    if (!day || !bulkTypeId) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/hr/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ date: format(day, 'yyyy-MM-dd'), typeId: bulkTypeId }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to fill attendance');
        return;
      }
      toast.success(`Attendance filled for ${data.created} employee(s)`);
      setBulkOpen(false);
      fetchData();
    } catch (e) {
      toast.error('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  if (!day) {
    return (
      <HrAdminLayout>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans">
          <p className="text-[15px] text-red-500">Invalid date.</p>
          <Link href="/hr/admin/attendance" className="text-[13px] text-zinc-500 hover:text-zinc-900 mt-2 inline-block">
            ← Back to attendance
          </Link>
        </div>
      </HrAdminLayout>
    );
  }

  const prevDay = format(addDays(day, -1), 'yyyy-MM-dd');
  const nextDay = format(addDays(day, 1), 'yyyy-MM-dd');

  return (
    <HrAdminLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <Link
              href="/hr/admin/attendance"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to attendance
            </Link>
            <h1 className="text-[32px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100 mt-1">
              {day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h1>
            <p className="text-[15px] text-zinc-500 dark:text-zinc-400 font-light">
              {entries.length} marked · {unrecorded.length} without a record · {selected.size} selected
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/hr/admin/attendance/${prevDay}`}
              className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[13px] font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Prev day
            </Link>
            <button
              onClick={() => setBulkOpen(true)}
              className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[13px] font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
              <Layers className="h-4 w-4" />
              Fill all
            </button>
            <Link
              href={`/hr/admin/attendance/${nextDay}`}
              className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[13px] font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Next day
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[13px] font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {/* Employees */}
            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
              <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1 block mb-2">
                Employees
              </label>
              <EmployeeMultiSelect
                employees={employees}
                records={entries.map((e) => ({
                  userId: e.userId,
                  typeName: e.typeName,
                  color: e.color,
                  isOverride: e.isOverride,
                }))}
                selected={selected}
                onChange={setSelected}
                placeholder="Search and select employees..."
              />
            </div>

            {/* Current records */}
            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-zinc-400">
                  Current records ({entries.length})
                </p>
                <span className="text-[12px] text-zinc-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  First in / last out from biometric data
                </span>
              </div>

              {entries.length === 0 ? (
                <p className="text-[13px] text-zinc-400 py-2">No records for this day yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {entries.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-black/[0.04] dark:border-white/[0.04] min-w-0"
                    >
                      <span
                        className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold uppercase"
                        style={{ color: e.color, backgroundColor: e.color + '14' }}
                      >
                        {e.typeCode.slice(0, 2)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium truncate">{e.userName}</span>
                        <span className="block text-[11px] text-zinc-500 flex items-center gap-1.5">
                          <span style={{ color: e.color }}>{e.typeName}</span>
                          {e.isOverride && (
                            <span className="text-[9.5px] font-semibold uppercase text-amber-600 dark:text-amber-400">
                              Manual
                            </span>
                          )}
                        </span>
                        <span className="block text-[11px] text-zinc-400 mt-1 flex items-center gap-2.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            In {punchTime(e.firstIn)}
                          </span>
                          <span className="flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" />
                            Out {punchTime(e.lastOut)}
                          </span>
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Apply bar */}
        {!loading && (
          <div className="sticky bottom-0 p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] shadow-lg">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <select
                value={applyTypeId}
                onChange={(e) => setApplyTypeId(e.target.value)}
                className="flex-1 h-11 px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] outline-none"
              >
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <input
                value={applyNote}
                onChange={(e) => setApplyNote(e.target.value)}
                placeholder="Note (optional)"
                className="flex-1 h-11 px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] outline-none placeholder:text-zinc-400"
              />
              <button
                onClick={applyToSelected}
                disabled={submitting || selected.size === 0 || !applyTypeId}
                className="flex items-center justify-center gap-2 h-11 px-6 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[14px] font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckSquare className="h-4 w-4" />
                )}
                Apply to {selected.size}
              </button>
            </div>
            <p className="text-[11.5px] text-zinc-400 mt-2">
              Applies the selected status to every chosen employee — existing records (including
              leave-derived ones) are replaced and marked as manual.
            </p>
          </div>
        )}

        {/* Fill all dialog */}
        {bulkOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
            onClick={() => setBulkOpen(false)}
          >
            <div
              className="w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[17px] font-semibold tracking-tight mb-1">Fill attendance for all</h3>
              <p className="text-[13px] text-zinc-500 mb-4">
                {day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · applies
                to every employee without a record
              </p>
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">Status</label>
                <select
                  value={bulkTypeId}
                  onChange={(e) => setBulkTypeId(e.target.value)}
                  className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] outline-none"
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setBulkOpen(false)}
                  disabled={submitting}
                  className="flex-1 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-[14px] font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulk}
                  disabled={submitting || !bulkTypeId}
                  className="flex-1 h-11 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[14px] font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Fill'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HrAdminLayout>
  );
}
