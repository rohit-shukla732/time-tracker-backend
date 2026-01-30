'use client';

import { useState, useEffect, useRef } from 'react';
import { AdminTicketLayout } from '@/components/tickets/AdminTicketLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Ticket,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  ArrowRight,
  Flame,
  TriangleAlert,
  ShieldCheck,
  Inbox,
  TrendingUp,
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
        if (!isBackground) { toast.error('Please log in'); router.push('/ticketing/admin/login'); }
        return;
      }

      const response = await makeAuthenticatedRequest('/api/tickets/stats');
      if (response.status === 401) {
        if (!isBackground) {
          ['accessToken','refreshToken','user'].forEach(k => localStorage.removeItem(k));
          router.push('/ticketing/admin/login');
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          t.status, t.priority, t.category, t.subcategory || '',
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

  const statCards = [
    { label: 'Open',        value: stats.open,       icon: Inbox,         color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   ring: 'ring-blue-500/30' },
    { label: 'In Progress', value: stats.inProgress, icon: Clock,         color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', ring: 'ring-yellow-500/30' },
    { label: 'Pending',     value: stats.pending,    icon: AlertCircle,   color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', ring: 'ring-orange-500/30' },
    { label: 'Resolved',    value: stats.resolved,   icon: CheckCircle2,  color: 'text-green-500',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  ring: 'ring-green-500/30' },
    { label: 'Closed',      value: stats.closed,     icon: XCircle,       color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/20',   ring: 'ring-gray-500/30' },
    { label: 'Total',       value: stats.total,      icon: Ticket,        color: 'text-primary',    bg: 'bg-primary/10',    border: 'border-primary/20',    ring: 'ring-primary/30' },
  ];

  const priorityBars = [
    { label: 'Urgent', value: stats.urgent, color: 'bg-red-500',    text: 'text-red-600 dark:text-red-400',    icon: Flame },
    { label: 'High',   value: stats.high,   color: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', icon: TriangleAlert },
    { label: 'Medium', value: stats.medium, color: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', icon: Activity },
    { label: 'Low',    value: stats.low,    color: 'bg-green-500',  text: 'text-green-600 dark:text-green-400',  icon: ShieldCheck },
  ];

  const statusSegments = [
    { label: 'Open',        value: stats.open,       color: 'bg-blue-500' },
    { label: 'In Progress', value: stats.inProgress, color: 'bg-yellow-500' },
    { label: 'Pending',     value: stats.pending,    color: 'bg-orange-500' },
    { label: 'Resolved',    value: stats.resolved,   color: 'bg-green-500' },
    { label: 'Closed',      value: stats.closed,     color: 'bg-gray-400' },
  ];

  if (loading) {
    return (
      <AdminTicketLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4 text-muted-foreground">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm">Loading dashboard…</p>
        </div>
      </AdminTicketLayout>
    );
  }

  return (
    <AdminTicketLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">IT Support Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Monitor and manage your support queue
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground/60 mt-1">
                Last updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => fetchStats()} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={downloadTicketsCSV} disabled={downloading || stats.total === 0}>
              <Download className="h-4 w-4 mr-1.5" />
              {downloading ? 'Exporting…' : 'Export CSV'}
            </Button>
            <Button size="sm" onClick={() => router.push('/ticketing/admin/tickets')}>
              <Ticket className="h-4 w-4 mr-1.5" />
              View All Tickets
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* Stat cards — 6 cols */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
            <Card
              key={label}
              className={`cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border ${border}`}
              onClick={() => router.push('/ticketing/admin/tickets')}
            >
              <CardContent className="pt-4 pb-4">
                <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                {stats.total > 0 && (
                  <div className={`text-[11px] font-medium mt-1 ${color}`}>{pct(value)}%</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Middle row */}
        <div className="grid gap-5 lg:grid-cols-3">

          {/* Status breakdown — stacked bar + list */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Status Breakdown</CardTitle>
                  <CardDescription>Distribution of all {stats.total} tickets</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">{stats.total} total</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Stacked bar */}
              {stats.total > 0 && (
                <div className="flex h-3 w-full rounded-full overflow-hidden gap-0.5">
                  {statusSegments.filter(s => s.value > 0).map(s => (
                    <div
                      key={s.label}
                      className={`${s.color} transition-all`}
                      style={{ width: `${pct(s.value)}%` }}
                      title={`${s.label}: ${s.value} (${pct(s.value)}%)`}
                    />
                  ))}
                </div>
              )}

              {/* Rows */}
              <div className="space-y-3">
                {statusSegments.map(s => (
                  <div key={s.label} className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${s.color}`} />
                    <span className="text-sm w-24 shrink-0">{s.label}</span>
                    <Progress value={pct(s.value)} className="h-1.5 flex-1" />
                    <span className="text-sm font-semibold w-6 text-right">{s.value}</span>
                    <span className="text-xs text-muted-foreground w-9 text-right">{pct(s.value)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Priority + performance */}
          <div className="space-y-5">
            {/* Priority */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Priority Breakdown</CardTitle>
                <CardDescription>Open tickets by urgency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {priorityBars.map(({ label, value, color, text, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${text}`} />
                    <span className="text-sm w-14 shrink-0">{label}</span>
                    <Progress value={pct(value)} className="h-1.5 flex-1" />
                    <span className={`text-sm font-bold w-5 text-right ${text}`}>{value}</span>
                  </div>
                ))}
                {(stats.urgent > 0 || stats.high > 0) && (
                  <div className="mt-1 rounded-md bg-red-500/5 border border-red-500/20 px-3 py-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                    <Flame className="h-3.5 w-3.5 shrink-0" />
                    {stats.urgent + stats.high} ticket{(stats.urgent + stats.high) !== 1 ? 's' : ''} need urgent attention
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Resolution rate</span>
                    <span className={`font-semibold ${resolutionRate >= 70 ? 'text-green-600 dark:text-green-400' : resolutionRate >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                      {resolutionRate}%
                    </span>
                  </div>
                  <Progress value={resolutionRate} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.resolved + stats.closed} of {stats.total} resolved
                  </p>
                </div>
                <div className="h-px bg-border" />
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Active tickets</span>
                    <span className="font-semibold">{active}</span>
                  </div>
                  <Progress value={pct(active)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {pct(active)}% of total still in queue
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Jump to filtered views</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/ticketing/admin/tickets')} className="gap-1.5">
                <Inbox className="h-3.5 w-3.5 text-blue-500" />
                All Open
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">{stats.open}</Badge>
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push('/ticketing/admin/tickets')} className="gap-1.5">
                <Flame className="h-3.5 w-3.5 text-red-500" />
                Urgent
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">{stats.urgent}</Badge>
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push('/ticketing/admin/tickets')} className="gap-1.5">
                <Clock className="h-3.5 w-3.5 text-yellow-500" />
                In Progress
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">{stats.inProgress}</Badge>
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push('/ticketing/admin/tickets')} className="gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                Pending
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">{stats.pending}</Badge>
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push('/ticketing/admin/tickets')} className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Resolved
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">{stats.resolved}</Badge>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </AdminTicketLayout>
  );
}
