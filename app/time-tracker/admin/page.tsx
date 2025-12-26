'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
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

interface DailySession {
  date: string;
  day: string;
  sessions: number;
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

interface TeamComposition {
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
  teams: {
    total: number;
  };
  sessions: {
    activeToday: number;
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
  charts: {
    dailySessions: DailySession[];
    topApps: TopApp[];
    roleDistribution: RoleDistribution[];
    teamComposition?: TeamComposition[];
    dailyWorkData?: DailyWorkData[];
  };
  recentSessions: Array<{
    id: string;
    sessionId: string;
    userId: string;
    userName: string;
    userEmail: string;
    startedAt: string;
    endedAt: string | null;
    isActive: boolean;
  }>;
}

// Chart configurations
const sessionChartConfig = {
  sessions: {
    label: "Sessions",
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

  const fetchStats = useCallback(async (token: string) => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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
      router.push('/admin/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'ADMIN') {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }

    fetchStats(token);

    // Refresh stats every 30 seconds
    const interval = setInterval(() => {
      const currentToken = localStorage.getItem('accessToken');
      if (currentToken) {
        fetchStats(currentToken);
      }
    }, 30000);

    return () => clearInterval(interval);
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

        {/* Main Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.users.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                Across {stats?.teams.total || 0} teams
              </p>
              <div className="absolute right-0 bottom-0 opacity-10">
                <Users className="h-24 w-24 -mr-4 -mb-4" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-green-200 dark:border-green-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Now</CardTitle>
              <Radio className="h-4 w-4 text-green-500 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.realtime?.total || stats?.sessions.activeToday || 0}</div>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <ArrowUpRight className="h-3 w-3" />
                Currently working
              </div>
              <div className="absolute right-0 bottom-0 opacity-10">
                <Activity className="h-24 w-24 -mr-4 -mb-4 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessions Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.sessions.today || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.sessions.thisWeek || 0} this week
              </p>
              <div className="absolute right-0 bottom-0 opacity-10">
                <Clock className="h-24 w-24 -mr-4 -mb-4" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.sessions.thisMonth || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total sessions
              </p>
              <div className="absolute right-0 bottom-0 opacity-10">
                <Calendar className="h-24 w-24 -mr-4 -mb-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Sessions Trend Chart - Line Chart with Labels */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Session Activity
              </CardTitle>
              <CardDescription>Daily sessions over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={sessionChartConfig} className="h-[220px] w-full">
                <LineChart
                  accessibilityLayer
                  data={stats?.charts?.dailySessions || []}
                  margin={{
                    top: 16,
                    left: 12,
                    right: 12,
                    bottom: 4,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <Line
                    dataKey="sessions"
                    type="natural"
                    stroke="var(--color-sessions)"
                    strokeWidth={2}
                    dot={{
                      fill: "var(--color-sessions)",
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  >
                    <LabelList
                      position="top"
                      offset={12}
                      className="fill-foreground"
                      fontSize={12}
                    />
                  </Line>
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Role Distribution - Donut Chart with Text */}
          <Card className="lg:col-span-3 flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="h-5 w-5" />
                Team Composition
              </CardTitle>
              <CardDescription>Users by role</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <ChartContainer
                config={roleChartConfig}
                className="mx-auto aspect-square max-h-[220px]"
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
                    innerRadius={45}
                    outerRadius={80}
                    strokeWidth={4}
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
            <CardFooter className="flex-col gap-2 text-sm">
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

        {/* Second Row - Time Trends & Team Composition */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Time Trends Chart */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Time Trends
              </CardTitle>
              <CardDescription>Work, break, and idle time over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  work: { label: "Work", color: "#10b981" },
                  break: { label: "Break", color: "#3b82f6" },
                  idle: { label: "Idle", color: "#f59e0b" },
                }}
                className="h-[220px] w-full"
              >
                <LineChart
                  accessibilityLayer
                  data={stats?.charts?.dailyWorkData || []}
                  margin={{
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
                    minTickGap={32}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    dataKey="work"
                    type="monotone"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="break"
                    type="monotone"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="idle"
                    type="monotone"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Team Composition Donut */}
          <Card className="lg:col-span-3 flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="h-5 w-5" />
                Teams Overview
              </CardTitle>
              <CardDescription>Members per team</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <ChartContainer
                config={{
                  members: { label: "Members", color: "hsl(var(--chart-1))" },
                }}
                className="mx-auto aspect-square max-h-[220px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel className="w-[150px]" />}

                  />
                  
                  <Pie
                    data={stats?.charts?.teamComposition || []}
                    dataKey="memberCount"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    strokeWidth={4}
                  >
                    {(stats?.charts?.teamComposition || []).map((entry, index) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          const totalMembers = (stats?.charts?.teamComposition || []).reduce(
                            (acc, curr) => acc + curr.memberCount,
                            0
                          );
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
                                className="fill-foreground text-2xl font-bold"
                              >
                                {totalMembers}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground"
                              >
                                Total
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
            <CardFooter className="flex-col gap-2 text-sm">
              <div className="flex flex-wrap justify-center gap-3 text-muted-foreground leading-none">
                {(stats?.charts?.teamComposition || []).map((entry) => (
                  <span key={entry.name} className="flex items-center gap-1">
                    <span 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: `var(--color-${entry.name})` }}
                    />
                    {entry.name}: {entry.memberCount}
                  </span>
                ))}
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Recent Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest work sessions across all users</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.recentSessions.map((session) => {
                  const duration = session.endedAt 
                    ? new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()
                    : Date.now() - new Date(session.startedAt).getTime();
                  
                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                            {(session.userName || session.userId || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{session.userName || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">{session.userId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatTimeAgo(session.startedAt)}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(session.startedAt).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {formatDuration(duration)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={session.isActive ? 'bg-green-100/5 text-green-700 hover:bg-green-100/15' : 'bg-muted text-muted-foreground'}
                        >
                          {session.isActive ? (
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            'Completed'
                          )}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!stats?.recentSessions || stats.recentSessions.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No recent sessions
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
