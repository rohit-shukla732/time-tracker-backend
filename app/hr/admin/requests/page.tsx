'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HrAdminLayout } from '@/components/hr/HrAdminLayout';
import { STATUS_LABELS, statusDotStyle } from '@/components/hr/LeaveCalendar';
import { withoutPayPortion } from '@/lib/leaveDisplay';
import {
  Loader2,
  Check,
  X,
  Search,
  Inbox,
  ChevronLeft,
  ChevronRight,
  MessageSquareQuote,
} from 'lucide-react';
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
  user: { id: string; name: string; email: string; role: string };
  leaveType: { id: string; name: string; isPaid: boolean };
  approver: { id: string; name: string } | null;
}

const STATUS_BADGE: Record<string, string> = {
  APPROVED: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  PENDING: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  REJECTED: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
  CANCELLED: 'bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400',
};

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export default function HrRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionTarget, setActionTarget] = useState<LeaveRequest | null>(null);
  const [actionMode, setActionMode] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/hr/admin/login');
        return;
      }

      const params = new URLSearchParams({
        page: String(page),
        year: String(year),
      });
      if (status) params.set('status', status);
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`/api/hr/leaves?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/hr/admin/login');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch requests');

      const data = await response.json();
      setRequests(data.requests || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.totalCount || 0);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }, [router, page, status, search, year]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const runAction = async () => {
    if (!actionTarget) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');

      if (actionMode === 'APPROVE') {
        const response = await fetch(`/api/leaves/${actionTarget.id}/decision`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            decision: 'APPROVED',
            comment: comment.trim() || null,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          toast.error(data.error || 'Failed to process request');
          return;
        }
        toast.success('Leave approved');
      } else {
        const response = await fetch(`/api/leaves/${actionTarget.id}/decision`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            decision: 'REJECTED',
            comment: comment.trim() || null,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          toast.error(data.error || 'Failed to process request');
          return;
        }
        toast.success('Leave rejected');
      }

      setActionTarget(null);
      setComment('');
      fetchRequests();
    } catch (error) {
      toast.error('Failed to process request');
    } finally {
      setSubmitting(false);
    }
  };

  const openAction = (r: LeaveRequest, mode: 'APPROVE' | 'REJECT') => {
    setActionMode(mode);
    setComment('');
    setActionTarget(r);
  };

  return (
    <HrAdminLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
              Leave Requests
            </h1>
            <p className="text-[19px] text-zinc-500 dark:text-zinc-400 font-light">
              Review, approve and manage every leave request.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-full border border-black/5 dark:border-white/5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatus(tab.key);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 ${
                  status === tab.key
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="h-4 w-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearch(searchInput);
                  setPage(1);
                }
              }}
              placeholder="Search by name, email or code..."
              className="w-full h-11 pl-11 pr-4 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
            />
          </div>

          <select
            value={year}
            onChange={(e) => {
              setYear(parseInt(e.target.value));
              setPage(1);
            }}
            className="h-11 px-4 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
          >
            {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i).map((y) => (
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
            <Inbox className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
            <p className="text-[16px] font-medium text-zinc-500 dark:text-zinc-400">No requests found</p>
            <p className="text-[14px] text-zinc-400 dark:text-zinc-500 mt-1">Try adjusting the filters.</p>
          </div>
        ) : (
          <>
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
                          <span className="text-[12px] text-zinc-400 dark:text-zinc-500">{r.user.id}</span>
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
                        {(r.managerComment || r.approver) && (
                          <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-1">
                            {r.managerComment && `Comment: ${r.managerComment}`}
                            {r.managerComment && r.approver && ' · '}
                            {r.approver && `Decided by ${r.approver.name}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => openAction(r, 'APPROVE')}
                            disabled={submitting}
                            className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 text-[13px] font-medium hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => openAction(r, 'REJECT')}
                            disabled={submitting}
                            className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 text-[13px] font-medium hover:bg-red-500/20 dark:hover:bg-red-500/30 transition-colors disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                {totalCount} request(s) · Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-500 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-500 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action dialog */}
      <Dialog open={!!actionTarget} onOpenChange={(open) => !open && setActionTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="text-[18px] tracking-tight">
              {actionMode === 'APPROVE' && 'Approve leave request'}
              {actionMode === 'REJECT' && 'Reject leave request'}
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              {actionTarget
                ? `${actionTarget.user.name}'s ${actionTarget.leaveType.name} · ${new Date(
                    actionTarget.startDate
                  ).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → ${new Date(
                    actionTarget.endDate
                  ).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {actionMode !== 'APPROVE' && (
            <div className="relative">
              <MessageSquareQuote className="h-4 w-4 text-zinc-400 absolute top-4 left-4" />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Reason for rejecting this request..."
                className="w-full px-11 py-3 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all resize-none"
              />
            </div>
          )}

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
              onClick={runAction}
              disabled={submitting || (actionMode === 'REJECT' && !comment.trim())}
              className={`h-11 px-5 rounded-2xl ${
                actionMode === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {actionMode === 'APPROVE' && 'Approve request'}
              {actionMode === 'REJECT' && 'Reject request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HrAdminLayout>
  );
}
