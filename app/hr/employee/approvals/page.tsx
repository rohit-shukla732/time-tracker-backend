'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HrEmployeeLayout } from '@/components/hr/HrEmployeeLayout';
import { withoutPayPortion } from '@/lib/leaveDisplay';
import { Loader2, Check, X, Inbox, MessageSquareQuote } from 'lucide-react';
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

interface ApprovalRequest {
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
  createdAt: string;
  user: { id: string; name: string; email: string; role: string; managerId: string | null };
  leaveType: { id: string; name: string; isPaid: boolean };
}

export default function TeamApprovalsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<ApprovalRequest | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/hr/employee/login');
        return;
      }

      const response = await fetch('/api/leaves/approvals', {
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

      if (!response.ok) throw new Error('Failed to fetch approvals');

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const decide = async (id: string, decision: 'APPROVED' | 'REJECTED', comment?: string) => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/leaves/${id}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ decision, comment: comment || null }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to process request');
        return;
      }

      toast.success(decision === 'APPROVED' ? 'Leave approved' : 'Leave rejected');
      setActionTarget(null);
      setRejectComment('');
      fetchRequests();
    } catch (error) {
      toast.error('Failed to process request');
    } finally {
      setSubmitting(false);
    }
  };

  const openReject = (r: ApprovalRequest) => {
    setRejectComment('');
    setActionTarget(r);
  };

  return (
    <HrEmployeeLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
        <div className="space-y-2">
          <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
            Team Approvals
          </h1>
          <p className="text-[19px] text-zinc-500 dark:text-zinc-400 font-light">
            {requests.length} request(s) awaiting your decision.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="py-24 text-center">
            <Inbox className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
            <p className="text-[16px] font-medium text-zinc-500 dark:text-zinc-400">
              You're all caught up
            </p>
            <p className="text-[14px] text-zinc-400 dark:text-zinc-500 mt-1">
              No pending leave requests from your team.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div
                key={r.id}
                className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[14px] font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
                      {r.user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <p className="text-[15px] font-semibold text-zinc-900 dark:text-white">{r.user.name}</p>
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 text-[11px] font-semibold uppercase tracking-wide">
                          Pending
                        </span>
                        {(() => {
                          const wop = withoutPayPortion(r);
                          if (wop <= 0) return null;
                          return (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 text-[11px] font-semibold uppercase tracking-wide">
                              {wop === r.durationDays ? 'Without Pay' : `Partly Without Pay (${wop} day(s))`}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
                        {r.user.id} · {r.user.role}
                      </p>
                      <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1">
                        {r.leaveType.name} ·{' '}
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
                      <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-1">
                        Applied {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decide(r.id, 'APPROVED')}
                      disabled={submitting}
                      className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 text-[13px] font-medium hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => openReject(r)}
                      disabled={submitting}
                      className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 text-[13px] font-medium hover:bg-red-500/20 dark:hover:bg-red-500/30 transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject dialog */}
      <Dialog open={!!actionTarget} onOpenChange={(open) => !open && setActionTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="text-[18px] tracking-tight">Reject leave request</DialogTitle>
            <DialogDescription className="text-[14px]">
              {actionTarget
                ? `${actionTarget.user.name}'s ${actionTarget.leaveType.name} — a comment is required so they understand why.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <MessageSquareQuote className="h-4 w-4 text-zinc-400 absolute top-4 left-4" />
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={3}
              placeholder="Reason for rejecting this request..."
              className="w-full px-11 py-3 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionTarget(null)}
              disabled={submitting}
              className="h-11 px-5 rounded-2xl"
            >
              Go back
            </Button>
            <Button
              onClick={() => actionTarget && decide(actionTarget.id, 'REJECTED', rejectComment)}
              disabled={submitting || !rejectComment.trim()}
              className="h-11 px-5 rounded-2xl bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Reject request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HrEmployeeLayout>
  );
}
