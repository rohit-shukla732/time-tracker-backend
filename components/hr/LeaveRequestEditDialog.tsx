'use client';

import { useEffect, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LeaveEditTarget {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  halfDayDays?: Record<string, string> | null;
  withoutPayDays?: string[] | null;
  leaveType: { id: string; name: string; isPaid: boolean };
}

interface LeaveTypeOption {
  id: string;
  name: string;
  isPaid: boolean;
}

interface LeaveRequestEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The request being edited */
  request: LeaveEditTarget | null;
  /** Employee name for the dialog description */
  employeeName?: string;
  onSaved: () => void;
}

const DEFAULT_NOTE_BY_ROLE: Record<string, string> = {
  MANAGER: 'Manager edited this',
  SENIOR_MANAGER: 'Manager edited this',
  HR: 'Edited by HR',
  ADMIN: 'Edited by HR',
};

export default function LeaveRequestEditDialog({
  open,
  onOpenChange,
  request,
  employeeName,
  onSaved,
}: LeaveRequestEditDialogProps) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [form, setForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    note: 'Manager edited this',
  });
  const [halfDays, setHalfDays] = useState<Record<string, string>>({});
  const [wopDays, setWopDays] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);

  // Reset state whenever a new request is opened.
  useEffect(() => {
    if (!open || !request) return;
    setForm({
      leaveTypeId: request.leaveType.id,
      startDate: request.startDate.slice(0, 10),
      endDate: request.endDate.slice(0, 10),
      reason: request.reason,
      note: defaultNote(),
    });
    setHalfDays(request.halfDayDays || {});
    setWopDays(new Set(request.withoutPayDays || []));
    if (leaveTypes.length === 0) {
      fetchLeaveTypes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request]);

  const defaultNote = (): string => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const role = (JSON.parse(stored) as { role?: string }).role || '';
        if (DEFAULT_NOTE_BY_ROLE[role]) return DEFAULT_NOTE_BY_ROLE[role];
      }
    } catch {
      /* ignore */
    }
    return 'Edited by HR/Manager';
  };

  const fetchLeaveTypes = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/leaves/types', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setLeaveTypes(data.types || []);
      }
    } catch (error) {
      console.error('Failed to load leave types', error);
    }
  };

  const daysInRange = (): string[] => {
    if (!form.startDate || !form.endDate) return [];
    const days: string[] = [];
    const start = new Date(`${form.startDate}T00:00:00Z`).getTime();
    const end = new Date(`${form.endDate}T00:00:00Z`).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return [];
    for (let t = start; t <= end; t += 86_400_000) {
      days.push(new Date(t).toISOString().slice(0, 10));
    }
    return days;
  };

  const toggleHalfDay = (day: string, value: string) => {
    setHalfDays((prev) => {
      const next = { ...prev };
      if (!value) delete next[day];
      else next[day] = value;
      return next;
    });
  };

  const toggleWopDay = (day: string, checked: boolean) => {
    setWopDays((prev) => {
      const next = new Set(prev);
      if (checked) next.add(day);
      else next.delete(day);
      return next;
    });
  };

  const save = async () => {
    if (!request) return;
    if (!form.reason.trim() || !form.startDate || !form.endDate) {
      toast.error('Dates and reason are required');
      return;
    }
    const days = daysInRange();
    if (days.length === 0) {
      toast.error('Invalid date range');
      return;
    }
    const validHalfDays: Record<string, string> = {};
    for (const [day, session] of Object.entries(halfDays)) {
      if (days.includes(day)) validHalfDays[day] = session;
    }
    const withoutPayDays = [...wopDays].filter((day) => days.includes(day));

    setEditing(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/leaves/${request.id}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          leaveTypeId: form.leaveTypeId,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason.trim(),
          halfDayDays: validHalfDays,
          withoutPayDays,
          note: form.note.trim() || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to edit request');
        return;
      }

      toast.success('Leave request updated');
      onOpenChange(false);
      onSaved();
    } catch (error) {
      console.error(error);
      toast.error('Failed to edit request');
    } finally {
      setEditing(false);
    }
  };

  const days = daysInRange();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="sm:max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[18px] tracking-tight">Edit leave request</DialogTitle>
          <DialogDescription className="text-[14px]">
            {request
              ? `${employeeName ?? 'Employee'}'s ${request.leaveType.name} — the request keeps its current status and every change is recorded in the history.`
              : ''}
          </DialogDescription>
        </DialogHeader>

        {request && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-300 mb-1 block">
                  Leave type
                </span>
                <select
                  value={form.leaveTypeId}
                  onChange={(e) => setForm((f) => ({ ...f, leaveTypeId: e.target.value }))}
                  className="w-full h-11 px-3.5 rounded-2xl bg-zinc-100/60 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                >
                  {leaveTypes.length === 0 && (
                    <option value={request.leaveType.id}>{request.leaveType.name}</option>
                  )}
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-300 mb-1 block">
                  Note (shown in history)
                </span>
                <input
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Why are you editing this?"
                  className="w-full h-11 px-3.5 rounded-2xl bg-zinc-100/60 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-300 mb-1 block">
                  Start date
                </span>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full h-11 px-3.5 rounded-2xl bg-zinc-100/60 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                />
              </label>
              <label className="block">
                <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-300 mb-1 block">
                  End date
                </span>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full h-11 px-3.5 rounded-2xl bg-zinc-100/60 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                />
              </label>
            </div>

            {days.length > 0 && (
              <div>
                <p className="text-[13px] font-medium text-zinc-600 dark:text-zinc-300 mb-2">
                  Per-day adjustments ({days.length} day{days.length === 1 ? '' : 's'})
                </p>
                <div className="space-y-2 rounded-2xl bg-zinc-100/40 dark:bg-zinc-800/40 p-3 max-h-44 overflow-y-auto">
                  {days.map((day) => (
                    <div key={day} className="flex items-center gap-3 py-1">
                      <span className="w-28 shrink-0 text-[13px] text-zinc-700 dark:text-zinc-300">
                        {new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <select
                        value={halfDays[day] || ''}
                        onChange={(e) => toggleHalfDay(day, e.target.value)}
                        className="flex-1 h-9 px-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[13px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                      >
                        <option value="">Full day</option>
                        <option value="FIRST_HALF">First half</option>
                        <option value="SECOND_HALF">Second half</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-[13px] text-zinc-600 dark:text-zinc-300 shrink-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wopDays.has(day)}
                          onChange={(e) => toggleWopDay(day, e.target.checked)}
                          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 accent-zinc-900 dark:accent-white"
                        />
                        No pay
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label className="block">
              <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-300 mb-1 block">
                Reason
              </span>
              <textarea
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={3}
                placeholder="Reason for the leave..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-100/60 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all resize-none"
              />
            </label>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={editing}
            className="h-11 px-5 rounded-2xl"
          >
            Cancel
          </Button>
          <Button onClick={save} disabled={editing} className="h-11 px-5 rounded-2xl">
            {editing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}