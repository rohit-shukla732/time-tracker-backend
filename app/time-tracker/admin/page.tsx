'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { makeAuthenticatedRequest, setupAutoRefresh } from '@/lib/adminAuth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { 
  Users, 
  Radio, 
  Clock, 
  UsersRound, 
  AlertCircle, 
  TrendingUp, 
  Calendar,
  Activity,
  Monitor,
  Timer,
  Coffee,
  ArrowUpRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Label,
  Legend,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface DailyActiveUsers {
  date: string;
  day: string;
  activeUsers: number;
  totalWork: number;
  totalBreak: number;
  totalIdle: number;
}

interface TopApp {
  name: string;
  timeMs: number;
  hours: number;
}

interface RoleDistribution {
  name: string;
  value: number;
  fill: string;
}

interface DepartmentComposition {
  name: string;
  memberCount: number;
  fill: string;
}

interface DailyWorkData {
  day: string;
  work: number;
  break: number;
  idle: number;
}

interface Stats {
  users: {
    total: number;
    byRole: Record<string, number>;
  };
  departments: {
    total: number;
  };
  activeUsers: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  realtime: {
    working: number;
    idle: number;
    break: number;
    total: number;
  };
  workTime: {
    totalWorkTimeMs: number;
    totalBreakTimeMs: number;
    avgWorkTimeMs: number;
  };
  dailyActiveUsers: DailyActiveUsers[];
  charts: {
    dailyActiveUsers: DailyActiveUsers[];
    topApps: TopApp[];
    roleDistribution: RoleDistribution[];
    departmentComposition?: DepartmentComposition[];
  };
  recentActivity: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    date: string;
    workTimeMs: number;
    breakTimeMs: number;
    idleTimeMs: number;
    sessionsCount: number;
  }>;
}

// Chart configurations
const activeUsersChartConfig = {
  work: {
    label: "Work Time",
    color: "#10b981",
  },
  break: {
    label: "Break Time",
    color: "#3b82f6",
  },
  idle: {
    label: "Idle Time",
    color: "#f59e0b",
  },
  activeUsers: {
    label: "Active Users",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const roleChartConfig = {
  value: {
    label: "Users",
  },
  ADMIN: {
    label: "Admin",
    color: "var(--chart-1)",
  },
  MANAGER: {
    label: "Manager",
    color: "var(--chart-2)",
  },
  HR: {
    label: "HR",
    color: "var(--chart-3)",
  },
  EMPLOYEE: {
    label: "Employee",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (isInitialLoad = true) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token && isInitialLoad) {
        router.push('/time-tracker/admin/login');
        return;
      }

      const response = await makeAuthenticatedRequest('/api/admin/stats');

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        router.push('/time-tracker/admin/login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error || 'Failed to fetch stats');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      router.push('/time-tracker/admin/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'ADMIN') {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }

    fetchStats(true);

    // Setup automatic token refresh for admin
    const cleanupTokenRefresh = setupAutoRefresh();

    // Refresh stats every 30 seconds
    const statsInterval = setInterval(() => {
      fetchStats(false);
    }, 30000);

    return () => {
      cleanupTokenRefresh();
      clearInterval(statsInterval);
    };
  }, [router, fetchStats]);

  if (loading) {
    return (
      <AdminLayout loginPath="/time-tracker/admin/login" basePath="/time-tracker/admin">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  const totalWorkHours = Math.round((stats?.workTime.totalWorkTimeMs || 0) / (1000 * 60 * 60));
  const avgWorkHours = ((stats?.workTime.avgWorkTimeMs || 0) / (1000 * 60 * 60)).toFixed(1);

  return (
    <AdminLayout loginPath="/time-tracker/admin/login" basePath="/time-tracker/admin">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Real-time overview of your time tracking system
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </Badge>
        </div>

        {/* Main Stats Grid - All in one row */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.users.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                Across {stats?.departments.total || 0} departments
              </p>
              <div className="absolute right-0 bottom-0 opacity-10">
                <Users className="h-24 w-24 -mr-4 -mb-4" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Today</CardTitle>
              <UsersRound className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeUsers?.today || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.activeUsers?.thisWeek || 0} this week
              </p>
              <div className="absolute right-0 bottom-0 opacity-10">
                <UsersRound className="h-24 w-24 -mr-4 -mb-4" />
              </div>
            </CardContent>
          </Card>

          {/* Real-time Status Cards - Smaller */}
          <Card className="border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-green-700 dark:text-green-400">Working</CardTitle>
              <Monitor className="h-3 w-3 text-green-600" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {stats?.realtime?.working || 0}
              </div>
              <p className="text-xs text-green-600/70 dark:text-green-500/70">
                Active now
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-blue-700 dark:text-blue-400">On Break</CardTitle>
              <Coffee className="h-3 w-3 text-blue-600" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {stats?.realtime?.break || 0}
              </div>
              <p className="text-xs text-blue-600/70 dark:text-blue-500/70">
                Break time
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Idle</CardTitle>
              <Clock className="h-3 w-3 text-yellow-600" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                {stats?.realtime?.idle || 0}
              </div>
              <p className="text-xs text-yellow-600/70 dark:text-yellow-500/70">
                Inactive
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-4 lg:grid-cols-7">
          {/* Daily Active Users Bar Chart */}
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Daily Active Users
              </CardTitle>
              <CardDescription>
                Active users and time distribution over the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={activeUsersChartConfig} className="h-[300px] w-full">
                <BarChart
                  accessibilityLayer
                  data={stats?.dailyActiveUsers || []}
                  margin={{
                    top: 20,
                    left: 12,
                    right: 12,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dashed" />}
                  />
                  <Bar dataKey="totalWork" fill="var(--color-work)" radius={[4, 4, 0, 0]} stackId="time" />
                  <Bar dataKey="totalBreak" fill="var(--color-break)" radius={[0, 0, 0, 0]} stackId="time" />
                  <Bar dataKey="totalIdle" fill="var(--color-idle)" radius={[0, 0, 4, 4]} stackId="time" />
                </BarChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
              <div className="flex gap-2 font-medium leading-none">
                Time breakdown by work, break, and idle
              </div>
              <div className="flex gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-600" />
                  Work
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  Break
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-yellow-600" />
                  Idle
                </span>
              </div>
            </CardFooter>
          </Card>

          {/* Role Distribution - Donut Chart */}
          <Card className="lg:col-span-2 flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="h-5 w-5" />
                User Roles
              </CardTitle>
              <CardDescription>Distribution by role</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <ChartContainer
                config={roleChartConfig}
                className="mx-auto aspect-square max-h-[250px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={(stats?.charts?.roleDistribution || []).map(item => ({
                      ...item,
                      fill: `var(--color-${item.name})`,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    strokeWidth={5}
                  >
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-3xl font-bold"
                              >
                                {stats?.users.total || 0}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground"
                              >
                                Users
                              </tspan>
                            </text>
                          )
                        }
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm pt-4">
              <div className="flex flex-wrap justify-center gap-3 text-muted-foreground leading-none">
                {(stats?.charts?.roleDistribution || []).map((entry) => (
                  <span key={entry.name} className="flex items-center gap-1">
                    <span 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: `var(--color-${entry.name})` }}
                    />
                    {entry.name}: {entry.value}
                  </span>
                ))}
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Recent Activity Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent User Activity
            </CardTitle>
            <CardDescription>Daily activity summary for users</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Work Time</TableHead>
                  <TableHead>Break Time</TableHead>
                  <TableHead>Idle Time</TableHead>
                  <TableHead>Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.recentActivity?.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                          {(activity.userName || activity.userId || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{activity.userName || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{activity.userId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{new Date(activity.date).toLocaleDateString()}</div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-green-600">
                        {formatDuration(activity.workTimeMs)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-blue-600">
                        {formatDuration(activity.breakTimeMs)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-yellow-600">
                        {formatDuration(activity.idleTimeMs)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {activity.sessionsCount}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No recent activity
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
