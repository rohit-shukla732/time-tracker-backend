'use client';

import { useState, useEffect, useRef } from 'react';
import { AdminTicketLayout } from '@/components/tickets/AdminTicketLayout';
import { PageHeader, GlassCard, statusDotClass, priorityDotClass } from '@/components/tickets/shared';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Ticket,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  Download,
  Flame,
  TriangleAlert,
  ShieldCheck,
  Inbox,
  Activity,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { makeAuthenticatedRequest, setupAutoRefresh } from '@/lib/adminAuth';

interface Stats {
  total: number;
  open: number;
  inProgress: number;
  pending: number;
  resolved: number;
  closed: number;
  urgent: number;
  high: number;
  medium: number;
  low: number;
}

const DEFAULT_STATS: Stats = {
  total: 0, open: 0, inProgress: 0, pending: 0,
  resolved: 0, closed: 0, urgent: 0, high: 0, medium: 0, low: 0,
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const previousTotal = useRef(0);

  useEffect(() => {
    fetchStats();
    const cleanupTokenRefresh = setupAutoRefresh();
    const interval = setInterval(() => fetchStats(true), 30_000);
    return () => { cleanupTokenRefresh(); clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStats = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        if (!isBackground) { toast.error('Please log in'); router.push('/helpdesk/admin/login'); }
        return;
      }

      const response = await makeAuthenticatedRequest('/api/tickets/stats');
      if (response.status === 401) {
        if (!isBackground) {
          ['accessToken','refreshToken','user'].forEach(k => localStorage.removeItem(k));
          router.push('/helpdesk/admin/login');
        }
        return;
      }
      if (!response.ok) throw new Error();

      const data = await response.json();
      const next: Stats = {
        total:      data.total      || 0,
        open:       data.open       || 0,
        inProgress: data.inProgress || 0,
        pending:    data.pending    || 0,
        resolved:   data.resolved   || 0,
        closed:     data.closed     || 0,
        urgent:     data.byPriority?.urgent || 0,
        high:       data.byPriority?.high   || 0,
        medium:     data.byPriority?.medium || 0,
        low:        data.byPriority?.low    || 0,
      };

      if (isBackground && previousTotal.current > 0 && next.total > previousTotal.current) {
        const diff = next.total - previousTotal.current;
        toast.success(`${diff} new ticket${diff > 1 ? 's' : ''} created!`, { description: 'Dashboard refreshed', duration: 5000 });
      }

      setStats(next);
      setLastUpdated(new Date());
      previousTotal.current = next.total;
    } catch {
      if (!isBackground) toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const downloadTicketsCSV = async () => {
    try {
      setDownloading(true);
      toast.info('Preparing export…');
      const response = await makeAuthenticatedRequest('/api/tickets/export');
      if (!response.ok) throw new Error();
      const tickets = await response.json() as any[];

      const headers = [
        'Ticket Number','Title','Description','Status','Priority','Category','Subcategory',
        'Created By','Creator Name','Creator Email','Assigned To','Assignee Name','Assignee Email',
        'Created At','Updated At','Resolved At',
      ];
      const rows = [headers.join(',')];
      tickets.forEach(t => {
        rows.push([
          t.ticketNumber,
          `"${(t.title ?? '').replace(/"/g,'""')}"`,
          `"${(t.description ?? '').replace(/"/g,'""')}"`,
          t.status, t.priority, t.category?.name || '', t.subcategory?.name || '',
          t.createdBy,
          `"${t.creator?.name || ''}"`, t.creator?.email || '',
          t.assignedTo || '', `"${t.assignee?.name || ''}"`, t.assignee?.email || '',
          new Date(t.createdAt).toISOString(),
          new Date(t.updatedAt).toISOString(),
          t.resolvedAt ? new Date(t.resolvedAt).toISOString() : '',
        ].join(','));
      });

      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success(`Exported ${tickets.length} tickets`);
    } catch {
      toast.error('Failed to export tickets');
    } finally {
      setDownloading(false);
    }
  };

  const pct = (n: number) => stats.total > 0 ? Math.round((n / stats.total) * 100) : 0;
  const active = stats.open + stats.inProgress + stats.pending;
  const resolutionRate = pct(stats.resolved + stats.closed);

  if (loading) {
    return (
      <AdminTicketLayout>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-10" aria-busy="true" aria-label="Loading dashboard">
          <div className="space-y-3">
            <Skeleton className="h-10 w-72 rounded-2xl" />
            <Skeleton className="h-5 w-96 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[220px] rounded-[32px]" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-[340px] rounded-[32px]" />
            ))}
          </div>
        </div>
      </AdminTicketLayout>
    );
  }

  return (
    <AdminTicketLayout>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-10">

        {/* Header Area */}
        <PageHeader
          title="IT Support Hub"
          subtitle="Monitor and manage your support queue."
          meta={lastUpdated ? (
            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 font-light">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          ) : undefined}
          actions={
            <>
              <button
                onClick={() => fetchStats()}
                disabled={refreshing}
                aria-label="Refresh stats"
                className="flex items-center justify-center p-3 rounded-full bg-white/60 dark:bg-zinc-900/50 border border-black/[0.04] dark:border-white/[0.04] backdrop-blur-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={downloadTicketsCSV}
                disabled={downloading || stats.total === 0}
                className="flex items-center justify-center h-12 px-5 rounded-full bg-white/60 dark:bg-zinc-900/50 border border-black/[0.04] dark:border-white/[0.04] backdrop-blur-xl text-[14px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading ? 'Exporting…' : 'Export CSV'}
              </button>
              <button
                onClick={() => router.push('/helpdesk/admin/tickets')}
                className="flex items-center justify-center h-12 px-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[14px] font-medium transition-transform hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                <Ticket className="h-4 w-4 mr-2" />
                All Tickets
              </button>
            </>
          }
        />

        {/* Hero Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard
            role="button"
            tabIndex={0}
            aria-label="View all tickets"
            onClick={() => router.push('/helpdesk/admin/tickets')}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push('/helpdesk/admin/tickets'); } }}
            className="group cursor-pointer flex flex-col p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Total Tickets</h2>
                <p className="text-[14px] text-zinc-500 font-light">All-time tracked</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center">
                <Ticket className="h-5 w-5" strokeWidth={2} />
              </div>
            </div>
            <div className="text-[56px] font-semibold tracking-[-0.04em] text-zinc-900 dark:text-white leading-none">
              {stats.total}
            </div>
          </GlassCard>

          <GlassCard className="flex flex-col p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Resolution Rate</h2>
                <p className="text-[14px] text-zinc-500 font-light">Closure efficiency</p>
              </div>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${resolutionRate >= 70 ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                <Activity className="h-5 w-5" strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-[56px] font-semibold tracking-[-0.04em] leading-none ${resolutionRate >= 70 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {resolutionRate}%
              </span>
            </div>
            <div className="mt-4 h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
               <div className={`h-full rounded-full transition-all duration-500 ${resolutionRate >= 70 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${resolutionRate}%` }} />
            </div>
          </GlassCard>

          <GlassCard
            role="button"
            tabIndex={0}
            aria-label="View active tickets"
            onClick={() => router.push('/helpdesk/admin/tickets')}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push('/helpdesk/admin/tickets'); } }}
            className="group cursor-pointer flex flex-col p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Active Queue</h2>
                <p className="text-[14px] text-zinc-500 font-light">Pending & Progress</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center">
                <Clock className="h-5 w-5" strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-[56px] font-semibold tracking-[-0.04em] text-blue-600 dark:text-blue-400 leading-none">
                {active}
              </span>
              <span className="text-[16px] text-zinc-500 font-medium pb-2">tickets</span>
            </div>
            {(stats.urgent > 0 || stats.high > 0) && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-[13px] font-medium transition-transform group-hover:scale-105 origin-left">
                <Flame className="h-4 w-4" strokeWidth={2.5} />
                {stats.urgent + stats.high} require urgent attention
              </div>
            )}
          </GlassCard>
        </div>

        {/* Detailed Breakdown Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Visual Status List */}
          <GlassCard className="flex flex-col p-8">
            <div className="mb-8">
              <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Queue by Status</h2>
            </div>
            <div className="space-y-5">
              {[
                { key: 'OPEN', label: 'Open', count: stats.open, bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', icon: Inbox },
                { key: 'IN_PROGRESS', label: 'In Progress', count: stats.inProgress, bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', icon: Clock },
                { key: 'PENDING', label: 'Pending', count: stats.pending, bg: 'bg-yellow-50 dark:bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', icon: AlertCircle },
                { key: 'RESOLVED', label: 'Resolved', count: stats.resolved, bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 }
              ].map((s) => (
                <div
                  key={s.key}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${s.label.toLowerCase()} tickets`}
                  className="group relative flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  onClick={() => router.push(`/helpdesk/admin/tickets?status=${s.key}`)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/helpdesk/admin/tickets?status=${s.key}`); } }}
                >
                  <div className={`p-2.5 rounded-full ${s.bg}`}>
                    <s.icon className={`h-5 w-5 ${s.text}`} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">{s.label}</span>
                      <span className="text-[15px] font-semibold text-zinc-900 dark:text-white">{s.count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className={`h-full ${statusDotClass(s.key)} rounded-full transition-all duration-500`} style={{ width: `${pct(s.count)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Priority Breakdown */}
          <GlassCard className="flex flex-col p-8">
            <div className="mb-8">
              <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Queue by Priority</h2>
            </div>
            <div className="space-y-5">
              {[
                { key: 'URGENT', label: 'Urgent', count: stats.urgent, bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', icon: Flame },
                { key: 'HIGH', label: 'High', count: stats.high, bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', icon: TriangleAlert },
                { key: 'MEDIUM', label: 'Medium', count: stats.medium, bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: Activity },
                { key: 'LOW', label: 'Low', count: stats.low, bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-500 dark:text-zinc-400', icon: ShieldCheck }
              ].map((p) => (
                <div
                  key={p.key}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${p.label.toLowerCase()} priority tickets`}
                  className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  onClick={() => router.push(`/helpdesk/admin/tickets?priority=${p.key}`)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/helpdesk/admin/tickets?priority=${p.key}`); } }}
                >
                  <div className={`p-2.5 rounded-full ${p.bg}`}>
                    <p.icon className={`h-5 w-5 ${p.text}`} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">{p.label}</span>
                      <span className="text-[15px] font-semibold text-zinc-900 dark:text-white">{p.count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className={`h-full ${priorityDotClass(p.key)} rounded-full transition-all duration-500`} style={{ width: `${pct(p.count)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

      </div>
    </AdminTicketLayout>
  );
}
            