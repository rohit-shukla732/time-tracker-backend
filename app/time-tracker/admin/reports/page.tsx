'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { 
  AlertCircle, 
  FileBarChart, 
  Clock, 
  Coffee, 
  Moon,
  Users,
  Calendar,
  Trophy,
  AppWindow
} from 'lucide-react';

interface DailyData {
  date: string;
  sessionCount: number;
  uniqueUserCount: number;
  totalWorkTimeMs: number;
  totalBreakTimeMs: number;
  totalIdleTimeMs: number;
  avgWorkTimeMs: number;
}

interface TopUser {
  userId: string;
  name: string;
  email: string;
  workTimeMs: number;
  sessionCount: number;
}

interface Report {
  type: string;
  dateRange: {
    from: string;
    to: string;
  };
  summary?: {
    totalSessions: number;
    totalWorkTimeMs: number;
    totalBreakTimeMs: number;
    totalIdleTimeMs: number;
  };
  dailyData?: DailyData[];
  topUsers?: TopUser[];
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  sessionCount?: number;
  totals?: {
    totalWorkTimeMs: number;
    totalBreakTimeMs: number;
    totalIdleTimeMs: number;
    totalSessionDurationMs: number;
  };
  topApps?: Array<{ appName: string; timeMs: number }>;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState('daily');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userId, setUserId] = useState('');

  const fetchReport = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/time-tracker/admin/login');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
      });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (userId) params.set('userId', userId);

      const response = await fetch(`/api/admin/reports?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        router.push('/time-tracker/admin/login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setReport(data.report);
      } else {
        setError(data.error || 'Failed to fetch report');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [router, reportType, dateFrom, dateTo, userId]);

  useEffect(() => {
    // Check for userId in URL params
    const urlUserId = searchParams.get('userId');
    if (urlUserId) {
      setUserId(urlUserId);
      setReportType('user');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReport();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">
          Generate and view detailed work time reports
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Report Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleGenerateReport} className="flex gap-4 flex-wrap items-end">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select
                value={reportType}
                onValueChange={(value) => {
                  setReportType(value);
                  if (value !== 'user') setUserId('');
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Summary</SelectItem>
                  <SelectItem value="weekly">Weekly Summary</SelectItem>
                  <SelectItem value="monthly">Monthly Summary</SelectItem>
                  <SelectItem value="user">User Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reportType === 'user' && (
              <div className="space-y-2">
                <Label>User ID</Label>
                <Input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g., ACE012"
                  className="w-[150px]"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Button type="submit">
              <FileBarChart className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </form>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Report Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {report.type === 'user' ? `User Report: ${report.user?.name || userId}` : 'Time Tracking Report'}
                  </CardTitle>
                  <CardDescription>
                    {formatDate(report.dateRange.from)} - {formatDate(report.dateRange.to)}
                  </CardDescription>
                </div>
                {report.type === 'user' && report.user && (
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{report.user.email}</p>
                    <p>Role: {report.user.role}</p>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.summary?.totalSessions || report.sessionCount || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Work Time</CardTitle>
                <Clock className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatDuration(report.summary?.totalWorkTimeMs || report.totals?.totalWorkTimeMs || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Break Time</CardTitle>
                <Coffee className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatDuration(report.summary?.totalBreakTimeMs || report.totals?.totalBreakTimeMs || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Idle Time</CardTitle>
                <Moon className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatDuration(report.summary?.totalIdleTimeMs || report.totals?.totalIdleTimeMs || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Data Table */}
            {report.dailyData && report.dailyData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Daily Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Sessions</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Work Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.dailyData.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell className="font-medium">{formatDate(day.date)}</TableCell>
                          <TableCell>{day.sessionCount}</TableCell>
                          <TableCell>{day.uniqueUserCount}</TableCell>
                          <TableCell className="text-green-600">{formatDuration(day.totalWorkTimeMs)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Top Users */}
            {report.topUsers && report.topUsers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Top Users by Work Time
                  </CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {report.topUsers.map((user, index) => (
                      <div key={user.userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground w-8">#{index + 1}</span>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.userId} • {user.sessionCount} sessions</p>
                          </div>
                        </div>
                        <span className="font-medium text-green-600">{formatDuration(user.workTimeMs)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Apps (for user reports) */}
            {report.topApps && report.topApps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AppWindow className="h-5 w-5" />
                    Top Applications
                  </CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {report.topApps.map((app, index) => (
                      <div key={app.appName} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground w-8">#{index + 1}</span>
                          <p className="font-medium">{app.appName}</p>
                        </div>
                        <span className="font-medium text-blue-600">{formatDuration(app.timeMs)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminReports() {
  return (
    <AdminLayout loginPath="/time-tracker/admin/login" basePath="/time-tracker/admin">
      <Suspense fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      }>
        <ReportsContent />
      </Suspense>
    </AdminLayout>
  );
}
