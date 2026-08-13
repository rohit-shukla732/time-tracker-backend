'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HrEmployeeLayout } from '@/components/hr/HrEmployeeLayout';
import { STATUS_LABELS, statusDotStyle } from '@/components/hr/LeaveCalendar';
import { withoutPayPortion } from '@/lib/leaveDisplay';
import { Loader2, CalendarX2, Undo2, History } from 'lucide-react';
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

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  halfDaySession: 'FIRST_HALF' | 'SECOND_HALF' | null;
  durationDays: number;
  isWithoutPay?: boolean;
  halfDayDays?: Record<string, string> | null;
  withoutPayDays?: string[] | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  managerComment: string | null;
  createdAt: string;
  leaveType: { id: string; name: string; isPaid: boolean };
  approver: { id: string; name: string } | null;
  edits?: LeaveEdit[];
}

interface LeaveEdit {
  id: string;
  note: string | null;
  createdAt: string;
  editedBy: { id: string; name: string; role: string };
}

const STATUS_BADGE: Record<string, string> = {
  APPROVED: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  PENDING: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  REJECTED: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
  CANCELLED: 'bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400',
};

export default function MyLeavesPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/hr/employee/login');
        return;
      }

      const response = await fetch(`/api/leaves?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/hr/employee/login');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch requests');

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [router, year]);

  useEffect(() => {
    setLoading(true);
    fetchRequests();
  }, [fetchRequests]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/leaves/${cancelTarget.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to cancel leave');
        return;
      }

      toast.success('Leave request cancelled');
      setCancelTarget(null);
      fetchRequests();
    } catch (error) {
      toast.error('Failed to cancel leave');
    } finally {
      setCancelling(false);
    }
  };

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  return (
    <HrEmployeeLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
              My Leaves
            </h1>
            <p className="text-[19px] text-zinc-500 dark:text-zinc-400 font-light">
              Every request you&apos;ve made, and its current status.
            </p>
          </div>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="h-11 px-4 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="py-24 text-center">
            <CalendarX2 className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
            <p className="text-[16px] font-medium text-zinc-500 dark:text-zinc-400">
              No leave requests for {year}
            </p>
            <p className="text-[14px] text-zinc-400 dark:text-zinc-500 mt-1">
              Apply for leave from the dashboard to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const canCancel =
                (r.status === 'PENDING' || r.status === 'APPROVED') &&
                new Date(r.startDate).setHours(0, 0, 0, 0) >= new Date().setHours(0, 0, 0, 0);
              return (
                <div
                  key={r.id}
                  className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-11 w-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <span className={`h-2.5 w-2.5 rounded-full ${statusDotStyle(r.status)}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <p className="text-[15px] font-semibold text-zinc-900 dark:text-white">
                            {r.leaveType.name}
                          </p>
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${STATUS_BADGE[r.status]}`}>
                            {STATUS_LABELS[r.status]}
                          </span>
                          {(() => {
                            const wop = withoutPayPortion(r);
                            if (wop <= 0) return null;
                            return (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                                {wop === r.durationDays ? 'Without Pay' : `Partly Without Pay (${wop} day(s))`}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {new Date(r.startDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {' → '}
                          {new Date(r.endDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {' · '}
                          {r.isHalfDay
                            ? `Half day (${r.halfDaySession === 'FIRST_HALF' ? 'first half' : 'second half'})`
                            : `${r.durationDays} day(s)`}
                        </p>
                        <p className="text-[13px] text-zinc-600 dark:text-zinc-300 mt-1.5">{r.reason}</p>
                        {(r.managerComment || r.approver) && (
                          <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-1">
                            {r.managerComment && `Comment: ${r.managerComment}`}
                            {r.managerComment && r.approver && ' · '}
                            {r.approver && `Decided by ${r.approver.name}`}
                          </p>
                        )}
                        {r.edits && r.edits.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.04] space-y-1">
                            {r.edits.slice(0, 3).map((e) => (
                              <p key={e.id} className="flex items-start gap-1.5 text-[12px] text-zinc-400 dark:text-zinc-500">
                                <History className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>
                                  <span className="font-medium text-zinc-500 dark:text-zinc-400">
                                    Edited by {e.editedBy.name}
                                  </span>{' '}
                                  ({e.editedBy.role}) on{' '}
                                  {new Date(e.createdAt).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                  {e.note ? ` — ${e.note}` : ''}
                                </span>
                              </p>
                            ))}
                            {r.edits.length > 3 && (
                              <p className="text-[12px] text-zinc-400 dark:text-zinc-500 pl-5">
                                +{r.edits.length - 3} more edit{r.edits.length - 3 === 1 ? '' : 's'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {canCancel && (
                      <button
                        onClick={() => setCancelTarget(r)}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 border border-black/[0.04] dark:border-white/[0.04] transition-colors"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel confirmation */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="text-[18px] tracking-tight">Cancel leave request?</DialogTitle>
            <DialogDescription className="text-[14px]">
              {cancelTarget
                ? `This will cancel your ${cancelTarget.leaveType.name} from ${new Date(
                    cancelTarget.startDate
                  ).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })} to ${new Date(cancelTarget.endDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelTarget(null)}
              disabled={cancelling}
              className="h-11 px-5 rounded-2xl"
            >
              Keep it
            </Button>
            <Button
              onClick={handleCancel}
              disabled={cancelling}
              className="h-11 px-5 rounded-2xl bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarX2 className="h-4 w-4" />}
              Cancel request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HrEmployeeLayout>
  );
}
