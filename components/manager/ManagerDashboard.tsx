"use client";

import { useEffect, useState, useMemo } from 'react';
import { authFetch } from '@/lib/authFetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Clock, Coffee, Zap, Moon } from 'lucide-react';
import {
  XAxis,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Label,
  LineChart,
  Line,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent,  } from '@/components/ui/chart';

interface StatsData {
  realtime?: {
    working?: number;
    idle?: number;
    break?: number;
    total?: number;
  };
  users?: {
    total?: number;
  };
  charts?: {
    dailyWorkData?: DailyWorkData[];
    dailySessions?: DailySession[];
    topApps?: unknown[];
  };
  workTime?: {
    avgWorkTimeMs?: number;
    totalWorkTimeMs?: number;
    totalBreakTimeMs?: number;
    totalIdleTimeMs?: number;
  };
  sessions?: {
    thisMonth?: number;
  };
  aggregates?: {
    avgWorkMs?: number;
    totalWorkMs?: number;
    avgBreakMs?: number;
    avgIdleMs?: number;
  };
  topUsers?: TopUser[];
}

interface DailyWorkData {
  day: string;
  workTimeMs?: number;
  breakTimeMs?: number;
  idleTimeMs?: number;
}

interface DailySession {
  day: string;
  sessions?: number;
}

interface TopUser {
  userId?: string;
  workTimeMs?: number;
  user?: {
    name?: string;
  };
}

export default function ManagerDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeChart, setActiveChart] = useState<'week' | 'month'>('week');
  const [chartType, setChartType] = useState<'sessions' | 'time'>('sessions');

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

  // Auto-rotate carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 7); // 7 total slides
    }, 4000); // Change slide every 4 seconds
    return () => clearInterval(timer);
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
      let url = '/api/admin/stats';
      
      // If manager, use team-specific stats
      if (user.role === 'MANAGER' && user.teamId) {
        url = `/api/teams/${user.teamId}/stats`;
      }

      const data = await authFetch(url, {}, '/time-tracker/manager/login') as { stats?: StatsData } & StatsData;
      console.log('Stats API response:', data);
      // API returns { success: true, stats: {...} }
      setStats(data.stats || data);
    } catch (err) {
      // authFetch already handles auth errors with toast
      if (err instanceof Error && err.name !== 'AuthError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }
  const statusData = useMemo(() => [
    { name: 'Working', value: stats?.realtime?.working || 0, fill: '#10b981' },
    { name: 'Idle', value: stats?.realtime?.idle || 0, fill: '#f59e0b' },
    { name: 'Break', value: stats?.realtime?.break || 0, fill: '#3b82f6' },
    { name: 'Offline', value: (stats?.users?.total || 0) - (stats?.realtime?.total || 0), fill: '#6b7280' },
  ], [stats?.realtime?.working, stats?.realtime?.idle, stats?.realtime?.break, stats?.users?.total, stats?.realtime?.total]);

  const statusChartConfig = {
    value: {
      label: "Members",
    },
    Working: {
      label: "Working",
      color: "#10b981",
    },
    Idle: {
      label: "Idle",
      color: "#f59e0b",
    },
    Break: {
      label: "Break",
      color: "#3b82f6",
    },
    Offline: {
      label: "Offline",
      color: "#6b7280",
    },
  };

  const totalMembers = useMemo(() => {
    return statusData.reduce((acc, curr) => acc + curr.value, 0)
  }, [statusData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  const dailyWork = stats?.charts?.dailyWorkData || [];
  const sessions = stats?.charts?.dailySessions || [];
  const topUsers = stats?.topUsers || [];

  // Map workTime to aggregates for compatibility
  const aggregates = stats?.workTime ? {
    avgWorkMs: stats.workTime.avgWorkTimeMs,
    totalWorkMs: stats.workTime.totalWorkTimeMs,
    avgBreakMs: (stats.workTime.totalBreakTimeMs || 0) / Math.max(1, stats.sessions?.thisMonth || 1),
    avgIdleMs: (stats.workTime.totalIdleTimeMs || 0) / Math.max(1, stats.sessions?.thisMonth || 1),
  } : stats?.aggregates;

  // Carousel slides data
  const slides = [
    {
      title: 'Working Now',
      value: stats?.realtime?.working || 0,
      subtitle: 'Active employees',
      icon: Zap,
      color: 'green',
      bgGradient: 'from-green-500/20 to-green-600/10',
      iconBg: 'bg-green-500/20',
      textColor: 'text-green-600',
      pulse: true,
    },
    {
      title: 'Idle',
      value: stats?.realtime?.idle || 0,
      subtitle: 'Inactive now',
      icon: Moon,
      color: 'yellow',
      bgGradient: 'from-yellow-500/20 to-yellow-600/10',
      iconBg: 'bg-yellow-500/20',
      textColor: 'text-yellow-600',
      pulse: false,
    },
    {
      title: 'On Break',
      value: stats?.realtime?.break || 0,
      subtitle: 'Taking a break',
      icon: Coffee,
      color: 'blue',
      bgGradient: 'from-blue-500/20 to-blue-600/10',
      iconBg: 'bg-blue-500/20',
      textColor: 'text-blue-600',
      pulse: false,
    },
    {
      title: 'Total Team',
      value: stats?.users?.total || 0,
      subtitle: 'Team members',
      icon: Users,
      color: 'purple',
      bgGradient: 'from-purple-500/20 to-purple-600/10',
      iconBg: 'bg-purple-500/20',
      textColor: 'text-purple-600',
      pulse: false,
    },
    {
      title: 'Avg Work/Day',
      value: formatTime(aggregates?.avgWorkMs || 0),
      subtitle: 'Team average this month',
      icon: Clock,
      color: 'blue',
      bgGradient: 'from-blue-500/20 to-blue-600/10',
      iconBg: 'bg-blue-500/20',
      textColor: 'text-blue-600',
      pulse: false,
    },
    {
      title: 'Avg Idle Time',
        value: formatTime(aggregates?.avgIdleMs || 0),
        subtitle: 'Per day',
        icon: Moon,
        color: 'amber',
        bgGradient: 'from-amber-500/20 to-amber-600/10',
        iconBg: 'bg-amber-500/20',
        textColor: 'text-amber-600',
        pulse: false,
    },
    {
      title: 'Avg Break Time',
      value: formatTime(aggregates?.avgBreakMs || 0),
      subtitle: 'Per day',
      icon: Coffee,
      color: 'blue',
      bgGradient: 'from-blue-500/20 to-blue-600/10',
      iconBg: 'bg-blue-500/20',
      textColor: 'text-blue-600',
      pulse: false,
    },
  ];

  const currentSlideData = slides[currentSlide];

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stats Carousel */}
      <Card className="relative overflow-hidden border-2">
        <div className={`absolute inset-0 bg-linear-to-br ${currentSlideData?.bgGradient} opacity-50`} />
        <CardContent className="pt-8 pb-8 relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className={`p-4 rounded-2xl ${currentSlideData?.iconBg}`}>
                  {currentSlideData?.icon && <currentSlideData.icon className={`h-8 w-8 ${currentSlideData.textColor}`} />}
                </div>
              </div>
              <h3 className={`text-lg font-semibold ${currentSlideData?.textColor} mb-2`}>
                {currentSlideData?.title}
              </h3>
              <div className="text-6xl font-bold mb-2 transition-all duration-500">
                {currentSlideData?.value}
              </div>
              <p className="text-sm text-muted-foreground">{currentSlideData?.subtitle}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground text-center justify-center">
            {/* Slide Indicators */}
          <div className="flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'w-8 bg-primary' 
                    : 'w-2 bg-primary/30 hover:bg-primary/50'
                }`}
              />
            ))}
          </div>
        </CardFooter>
      </Card>

      {/* Charts */}
      
        {/* Team Status Distribution */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Team Status Distribution</CardTitle>
            <CardDescription>Current status of all team members</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {statusData.some(d => d.value > 0) ? (
              <ChartContainer
                config={statusChartConfig}
                className="mx-auto aspect-square max-h-[250px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    {statusData.map((entry, index) => (
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
                                className="fill-foreground text-3xl font-bold"
                              >
                                {totalMembers.toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground"
                              >
                                Members
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
              <div className="mx-auto aspect-square max-h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                No status data available
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm pt-4">
            <div className="flex flex-wrap justify-center gap-4">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-muted-foreground">{item.name}:</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardFooter>
        </Card>
        

        {/* Top Contributors - Pie Chart */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Top Contributors</CardTitle>
            <CardDescription>Top team members by work time this month</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {topUsers.length ? (
              <ChartContainer
                config={{
                  value: { label: "Time" },
                  ...Object.fromEntries(
                    topUsers.slice(0, 5).map((u: TopUser, i: number) => {
                      const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
                      return [
                        (u.user?.name || u.userId || 'Unknown').split(' ')[0],
                        {
                          label: (u.user?.name || u.userId || 'Unknown').split(' ')[0],
                          color: colors[i % 5]
                        }
                      ];
                    })
                  )
                }}
                className="mx-auto aspect-square max-h-[250px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel 
                        formatter={(_value, _name, item: { payload?: { value?: number } }) => {
                              const hours = item?.payload?.value || 0;
                              return formatTime(Math.round(hours * 60 * 60 * 1000));
                            }}/>}
                  />
                  <Pie 
                    data={topUsers.slice(0, 5).map((u: TopUser, i: number) => {
                      const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
                      const hours = (u.workTimeMs || 0) / (1000 * 60 * 60);
                      return {
                        browser: (u.user?.name || u.userId || 'Unknown').split(' ')[0],
                        value: parseFloat(hours.toFixed(1)),
                        fill: colors[i % 5]
                      };
                    })}
                    dataKey="value" 
                    nameKey="browser" 
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="mx-auto aspect-square max-h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                No user data available
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm">
            <div className="flex flex-wrap justify-center gap-3">
              {topUsers.slice(0, 5).map((u: TopUser, i: number) => {
                const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % 5] }} />
                    <span className="text-muted-foreground">{(u.user?.name || u.userId || 'Unknown').split(' ')[0]}:</span>
                    <span className="font-semibold">{formatTime(u.workTimeMs || 0)}</span>
                  </div>
                );
              })}
            </div>
          </CardFooter>
        </Card>

        {/* Session Activity - Interactive */}
        <Card className="col-span-3 py-4 sm:py-0">
          <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
            <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
              <CardTitle>{chartType === 'sessions' ? 'Session Activity' : 'Time Trends'}</CardTitle>
              <CardDescription>
                {chartType === 'sessions' ? 'Daily sessions over time' : 'Work, break, and idle time trends'}
              </CardDescription>
            </div>
            <div className="flex">
              {chartType === 'sessions' ? (
                // Sessions view
                [{key: 'week', label: 'Week'}, {key: 'month', label: 'Month'}].map((period) => {
                  const isActive = activeChart === period.key;
                  const periodSessions = activeChart === 'week' 
                    ? sessions.slice(-7) 
                    : sessions.slice(-30);
                  const totalSessions = periodSessions.reduce((acc: number, curr: DailySession) => acc + (curr.sessions || 0), 0);
                  
                  return (
                    <button
                      key={period.key}
                      data-active={isActive}
                      className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6 min-w-[140px]"
                      onClick={() => setActiveChart(period.key as 'week' | 'month')}
                    >
                      <span className="text-muted-foreground text-xs">
                        {period.key === 'week' ? '7 Days' : '30 Days'}
                      </span>
                      <span className="text-lg leading-none font-bold sm:text-3xl">
                        {totalSessions.toLocaleString()}
                      </span>
                    </button>
                  );
                })
              ) : (
                // Time trends view
                [{key: 'week', label: 'Week'}, {key: 'month', label: 'Month'}].map((period) => {
                  const isActive = activeChart === period.key;
                  const periodData = activeChart === 'week' 
                    ? dailyWork.slice(-7) 
                    : dailyWork.slice(-30);
                  const totalHours = periodData.reduce((acc: number, curr: DailyWorkData) => 
                    acc + ((curr.workTimeMs || 0) / (1000 * 60 * 60)), 0
                  );
                  
                  return (
                    <button
                      key={period.key}
                      data-active={isActive}
                      className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6 min-w-[140px]"
                      onClick={() => setActiveChart(period.key as 'week' | 'month')}
                    >
                      <span className="text-muted-foreground text-xs">
                        {period.key === 'week' ? '7 Days' : '30 Days'}
                      </span>
                      <span className="text-lg leading-none font-bold sm:text-3xl">
                        {totalHours.toFixed(1)}h
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:p-6">
            <div className="flex justify-end mb-4">
              <div className="inline-flex rounded-lg border p-1">
                <Button
                  variant={chartType === 'sessions' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('sessions')}
                  className="h-7 px-3"
                >
                  Sessions
                </Button>
                <Button
                  variant={chartType === 'time' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('time')}
                  className="h-7 px-3"
                >
                  Time Trends
                </Button>
              </div>
            </div>
            {chartType === 'sessions' ? (
              sessions.length ? (
                <ChartContainer
                  config={{
                    sessions: {
                      label: "Sessions",
                      color: "#06b6d4",
                    },
                  }}
                  className="aspect-auto h-[250px] w-full"
                >
                  <LineChart
                    accessibilityLayer
                    data={activeChart === 'week' ? sessions.slice(-7) : sessions.slice(-30)}
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
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          className="w-[150px]"
                          nameKey="sessions"
                        />
                      }
                    />
                    <Line
                      dataKey="sessions"
                      type="monotone"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                  No session data available
                </div>
              )
            ) : (
              dailyWork.length ? (
                <ChartContainer
                  config={{
                    workTime: {
                      label: "Work Time",
                      color: "#10b981",
                    },
                    breakTime: {
                      label: "Break Time",
                      color: "#3b82f6",
                    },
                    idleTime: {
                      label: "Idle Time",
                      color: "#f59e0b",
                    },
                  }}
                  className="aspect-auto h-[250px] w-full"
                >
                  <LineChart
                    accessibilityLayer
                    data={(activeChart === 'week' ? dailyWork.slice(-7) : dailyWork.slice(-30)).map((d: DailyWorkData) => ({
                      ...d,
                      workTime: parseFloat(((d.workTimeMs || 0) / (1000 * 60 * 60)).toFixed(1)),
                      breakTime: parseFloat(((d.breakTimeMs || 0) / (1000 * 60 * 60)).toFixed(1)),
                      idleTime: parseFloat(((d.idleTimeMs || 0) / (1000 * 60 * 60)).toFixed(1)),
                    }))}
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
                      dataKey="workTime"
                      type="monotone"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      dataKey="breakTime"
                      type="monotone"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      dataKey="idleTime"
                      type="monotone"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                  No time data available
                </div>
              )
            )}
          </CardContent>
        </Card>

        
      </div>
    </div>
  );
}
