"use client";

import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { authFetch } from '@/lib/authFetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Clock, Coffee, Activity, Moon, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Label,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface SessionSummary {
  workTimeMs?: number;
  totalBreakMs?: number;
  totalIdleMs?: number;
}

interface AppUsage {
  appName: string;
  timeMs?: number;
}

interface WebsiteUsage {
  website: string;
  timeMs?: number;
  browser?: string;
}

interface Session {
  id: string;
  startedAt: string;
  endedAt?: string;
  isActive: boolean;
  summary?: SessionSummary;
  appUsage?: AppUsage[];
  websiteUsage?: WebsiteUsage[];
}

interface DailyWorkData {
  day: string;
  workTimeMs: number;
  breakTimeMs: number;
  idleTimeMs: number;
}

interface TopApp {
  name: string;
  timeMs?: number;
}

interface TopWebsite {
  name: string;
  timeMs?: number;
  browser?: string;
}

interface StatsData {
  status?: 'Active' | 'Idle' | 'Break' | 'Offline';
  aggregates?: {
    totalWorkMs?: number;
    avgWorkMs?: number;
    totalBreakMs?: number;
    totalIdleMs?: number;
    lastActive?: string;
  };
  charts?: {
    dailyWorkData?: DailyWorkData[];
  };
  topApps?: TopApp[];
  topWebsites?: TopWebsite[];
  recentSessions?: Session[];
}

export default function EmployeeDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<'week' | 'month'>('week');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Helper function to format time (hours or minutes)
  const formatTime = (ms: number): string => {
    const hours = ms / (1000 * 60 * 60);
    if (hours < 1) {
      const minutes = Math.round(ms / (1000 * 60));
      return `${minutes}m`;
    }
    return `${hours.toFixed(1)}h`;
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  async function fetchStats() {
    try {
      const storedUser = localStorage.getItem('user');
      
      if (!storedUser) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const user = JSON.parse(storedUser);
      const data = await authFetch(`/api/users/${user.id}/stats`, {}, '/employee/login') as { stats?: StatsData } & StatsData;
      
      setStats(data.stats || data);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AuthError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  // Session data for pie chart - MOVED BEFORE CONDITIONAL RETURNS
  const sessionData = useMemo(() => {
    if (!selectedSession?.summary) {
      return [];
    }
    
    const workTime = selectedSession.summary.workTimeMs || 0;
    const breakTime = selectedSession.summary.totalBreakMs || 0;
    const idleTime = selectedSession.summary.totalIdleMs || 0;
    
    // Store values in minutes for better display
    return [
      { name: 'Work', value: Math.round(workTime / (1000 * 60)), valueMs: workTime, fill: '#10b981' },
      { name: 'Break', value: Math.round(breakTime / (1000 * 60)), valueMs: breakTime, fill: '#3b82f6' },
      { name: 'Idle', value: Math.round(idleTime / (1000 * 60)), valueMs: idleTime, fill: '#f59e0b' },
    ];
  }, [selectedSession]);

  const totalSessionTime = useMemo(() => {
    return sessionData.reduce((acc, curr) => acc + curr.valueMs, 0);
  }, [sessionData]);

  const sessionApps = selectedSession?.appUsage || [];

  // Prepare chart data
  const dailyWorkChartData = stats?.charts?.dailyWorkData?.map((d: DailyWorkData) => ({
    day: d.day,
    work: Number((d.workTimeMs / (1000 * 60 * 60)).toFixed(1)),
    break: Number((d.breakTimeMs / (1000 * 60 * 60)).toFixed(1)),
    idle: Number((d.idleTimeMs / (1000 * 60 * 60)).toFixed(1)),
  })) || [];

  const topAppsData = selectedSession 
    ? sessionApps.slice(0, 5).map((app: AppUsage, index: number) => ({
        name: app.appName,
        timeMs: app.timeMs || 0,
        time: formatTime(app.timeMs || 0),
        fill: `var(--chart-${(index % 5) + 1})`,
      }))
    : stats?.topApps?.slice(0, 5).map((app: TopApp, index: number) => ({
        name: app.name,
        timeMs: app.timeMs || 0,
        time: formatTime(app.timeMs || 0),
        fill: `var(--chart-${(index % 5) + 1})`,
      })) || [];

  const sessionWebsites = selectedSession?.websiteUsage || [];
  const topWebsitesData = selectedSession 
    ? sessionWebsites.slice(0, 5).map((site: WebsiteUsage, index: number) => ({
        name: site.website.length > 30 ? site.website.substring(0, 30) + '...' : site.website,
        fullName: site.website,
        timeMs: site.timeMs || 0,
        time: formatTime(site.timeMs || 0),
        browser: site.browser,
        fill: `var(--chart-${(index % 5) + 1})`,
      }))
    : stats?.topWebsites?.slice(0, 5).map((site: TopWebsite, index: number) => ({
        name: site.name.length > 30 ? site.name.substring(0, 30) + '...' : site.name,
        fullName: site.name,
        timeMs: site.timeMs || 0,
        time: formatTime(site.timeMs || 0),
        browser: site.browser,
        fill: `var(--chart-${(index % 5) + 1})`,
      })) || [];

  const statusConfig = {
    Active: { color: 'bg-green-600', label: 'Working', icon: Activity },
    Idle: { color: 'bg-yellow-500', label: 'Idle', icon: Moon },
    Break: { color: 'bg-sky-500', label: 'On Break', icon: Coffee },
    Offline: { color: 'bg-gray-400', label: 'Offline', icon: Clock },
  };

  const StatusIcon = statusConfig[stats?.status as keyof typeof statusConfig]?.icon || Clock;
  const statusColor = statusConfig[stats?.status as keyof typeof statusConfig]?.color || 'bg-gray-400';
  const statusLabel = statusConfig[stats?.status as keyof typeof statusConfig]?.label || 'Unknown';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground mt-1">Track your work activity and productivity</p>
      </div>

      

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

        {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className="w-5 h-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={`${statusColor} text-white text-lg py-2 px-4`}>
            {statusLabel}
          </Badge>
          {stats?.aggregates?.lastActive && (
            <p className="text-sm text-muted-foreground mt-2">
              Since: {new Date(stats.aggregates.lastActive).toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Work Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats?.aggregates?.totalWorkMs || 0)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Daily Work</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats?.aggregates?.avgWorkMs || 0)}</div>
            <p className="text-xs text-muted-foreground">Per day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Break Time</CardTitle>
            <Coffee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats?.aggregates?.totalBreakMs || 0)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Idle Time</CardTitle>
            <Moon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats?.aggregates?.totalIdleMs || 0)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Activity / Session Distribution */}
        {selectedSession ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session Time Distribution</CardTitle>
              <CardDescription>
                Session started: {new Date(selectedSession.startedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionData.some(d => d.value > 0) ? (
                <ChartContainer
                  config={{
                    value: { label: "Time" },
                    Work: { label: "Work", color: "#10b981" },
                    Break: { label: "Break", color: "#3b82f6" },
                    Idle: { label: "Idle", color: "#f59e0b" },
                  }}
                  className="mx-auto aspect-square max-h-[300px]"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent 
                        hideLabel 
                        formatter={(value, name, item) => {
                          return formatTime(item.payload.valueMs);
                        }}
                      />}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => value}
                    />
                    <Pie
                      data={sessionData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      strokeWidth={5}
                    >
                      {sessionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
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
                                  className="fill-foreground text-2xl font-bold"
                                >
                                  {formatTime(totalSessionTime)}
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
              ) : (
                <div className="mx-auto aspect-square max-h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  No session data available
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="col-span-1 py-4 sm:py-0">
            <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
              <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
                <CardTitle>Time Trends</CardTitle>
                <CardDescription>
                  Work, break, and idle time trends
                </CardDescription>
              </div>
              <div className="flex">
                {[{key: 'week', label: '7 Days'}, {key: 'month', label: '30 Days'}].map((period) => {
                  const isActive = activeChart === period.key;
                  const periodData = activeChart === 'week' 
                    ? dailyWorkChartData.slice(-7) 
                    : dailyWorkChartData.slice(-30);
                  const totalHours = periodData.reduce((acc: number, curr: { work?: number; break?: number; idle?: number }) => 
                    acc + (curr.work || 0) + (curr.break || 0) + (curr.idle || 0), 0
                  );
                  
                  return (
                    <button
                      key={period.key}
                      data-active={isActive}
                      className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 text-left even:border-l sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                      onClick={() => setActiveChart(period.key as 'week' | 'month')}
                    >
                      <span className="text-xs text-muted-foreground">
                        {period.label}
                      </span>
                      <span className="text-lg font-bold leading-none sm:text-3xl">
                        {totalHours.toFixed(1)}h
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:p-6">
              <ChartContainer
                config={{
                  work: { label: "Work", color: "#10b981" },
                  break: { label: "Break", color: "#3b82f6" },
                  idle: { label: "Idle", color: "#f59e0b" },
                }}
                className="aspect-auto h-80 w-full"
              >
                <LineChart
                  accessibilityLayer
                  data={activeChart === 'week' ? dailyWorkChartData.slice(-7) : dailyWorkChartData.slice(-30)}
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
        )}

        {/* Top Apps */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedSession ? 'Session Applications' : 'Top Applications'}
            </CardTitle>
            <CardDescription>
              {selectedSession ? 'Apps used in this session' : 'Most used applications (Last 7 days)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                time: { label: 'Time', color: 'hsl(var(--chart-1))' },
              }}
              className="h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topAppsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => {
                      return value.length > 10 ? value.substring(0, 10) + '...' : value;
                    }}
                  />
                  <YAxis hide />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value, name, item) => {
                        return item.payload.time;
                      }}
                    />} 
                  />
                  <Bar dataKey="timeMs" radius={[4, 4, 0, 0]}>
                    {topAppsData.map((entry: { fill: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Websites */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedSession ? 'Session Websites' : 'Top Websites'}
            </CardTitle>
            <CardDescription>
              {selectedSession ? 'Websites visited in this session' : 'Most visited websites (Last 7 days)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                time: { label: 'Time', color: 'hsl(var(--chart-2))' },
              }}
              className="h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topWebsitesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => {
                      return value.length > 15 ? value.substring(0, 15) + '...' : value;
                    }}
                  />
                  <YAxis hide />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value, name, item) => {
                        const browser = item.payload.browser;
                        return (
                          <div>
                            <div>{item.payload.time}</div>
                            {browser && <div className="text-xs text-muted-foreground">{browser}</div>}
                          </div>
                        );
                      }}
                    />} 
                  />
                  <Bar dataKey="timeMs" radius={[4, 4, 0, 0]}>
                    {topWebsitesData.map((entry: { fill: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Websites */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedSession ? 'Session Websites' : 'Top Websites'}
            </CardTitle>
            <CardDescription>
              {selectedSession ? 'Websites visited in this session' : 'Most visited websites (Last 7 days)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                time: { label: 'Time', color: 'hsl(var(--chart-2))' },
              }}
              className="h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topWebsitesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => {
                      return value.length > 15 ? value.substring(0, 15) + '...' : value;
                    }}
                  />
                  <YAxis hide />
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value, name, item) => {
                        const browser = item.payload.browser;
                        return (
                          <div>
                            <div className="font-medium">{item.payload.fullName || item.payload.name}</div>
                            <div>{item.payload.time}</div>
                            {browser && <div className="text-xs text-muted-foreground mt-1">{browser}</div>}
                          </div>
                        );
                      }}
                    />} 
                  />
                  <Bar dataKey="timeMs" radius={[4, 4, 0, 0]}>
                    {topWebsitesData.map((entry: { fill: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>Click on a session to view detailed breakdown</CardDescription>
          </div>
          {selectedSession && (
            <button
              onClick={() => setSelectedSession(null)}
              className="text-sm text-primary hover:underline"
            >
              Clear Selection
            </button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Ended</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Work</TableHead>
                <TableHead>Break</TableHead>
                <TableHead>Idle</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.recentSessions?.map((session: Session) => {
                const duration = session.endedAt 
                  ? new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()
                  : Date.now() - new Date(session.startedAt).getTime();
                const isSelected = selectedSession?.id === session.id;
                
                return (
                  <TableRow 
                    key={session.id}
                    className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-muted' : ''}`}
                    onClick={() => setSelectedSession(session)}
                  >
                    <TableCell className="text-sm">
                      {new Date(session.startedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {session.endedAt ? new Date(session.endedAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatTime(duration)}
                    </TableCell>
                    <TableCell className="text-sm text-green-600">
                      {session.summary?.workTimeMs ? formatTime(session.summary.workTimeMs) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-blue-600">
                      {session.summary?.totalBreakMs ? formatTime(session.summary.totalBreakMs) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-yellow-600">
                      {session.summary?.totalIdleMs ? formatTime(session.summary.totalIdleMs) : '-'}
                    </TableCell>
                    <TableCell>
                      {session.isActive ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">Ended</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
