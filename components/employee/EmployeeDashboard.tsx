"use client";

import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import { authFetch } from "@/lib/authFetch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Coffee, Activity, Moon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  toLocaleDateStringTz,
  toLocaleStringTz,
  TimezoneType,
} from "@/lib/timezoneUtils";

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
  sessionId: string;
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

const WORKDAY_MS = 8 * 60 * 60 * 1000; // 8-hour workday target

interface StatsData {
  status?: "Active" | "Idle" | "Break" | "Offline";
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
  const [activeChart, setActiveChart] = useState<"week" | "month">("week");
  const [timezone, setTimezone] = useState<TimezoneType>("IST");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  useEffect(() => {
    // Load timezone from localStorage
    const tz = (localStorage.getItem("timezone") as TimezoneType) || "IST";
    setTimezone(tz);
  }, []);

  async function fetchStats() {
    try {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const user = JSON.parse(storedUser);
      const data = (await authFetch(
        `/api/users/${user.id}/stats`,
        {},
        "/employee/login",
      )) as { stats?: StatsData } & StatsData;

      setStats(data.stats || data);
    } catch (err) {
      if (err instanceof Error && err.name !== "AuthError") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  // Today's data from the last entry in dailyWorkData (today)
  const todayRaw =
    stats?.charts?.dailyWorkData?.[stats.charts.dailyWorkData.length - 1];
  const todayWorkMs = todayRaw?.workTimeMs || 0;
  const todayBreakMs = todayRaw?.breakTimeMs || 0;
  const todayIdleMs = todayRaw?.idleTimeMs || 0;
  const workdayProgress = Math.min(
    100,
    Math.round((todayWorkMs / WORKDAY_MS) * 100),
  );
  const remainingMs = Math.max(0, WORKDAY_MS - todayWorkMs);

  // Charts data
  const dailyWorkChartData =
    stats?.charts?.dailyWorkData?.map((d: DailyWorkData) => ({
      day: d.day,
      work: Number((d.workTimeMs / (1000 * 60 * 60)).toFixed(1)),
      break: Number((d.breakTimeMs / (1000 * 60 * 60)).toFixed(1)),
      idle: Number((d.idleTimeMs / (1000 * 60 * 60)).toFixed(1)),
    })) || [];

  const topAppsData =
    stats?.topApps?.slice(0, 5).map((app: TopApp, index: number) => ({
      name: app.name,
      timeMs: app.timeMs || 0,
      time: formatTime(app.timeMs || 0),
      fill: `var(--chart-${(index % 5) + 1})`,
    })) || [];

  const topWebsitesData =
    stats?.topWebsites?.slice(0, 5).map((site: TopWebsite, index: number) => ({
      name:
        site.name.length > 30 ? site.name.substring(0, 30) + "..." : site.name,
      fullName: site.name,
      timeMs: site.timeMs || 0,
      time: formatTime(site.timeMs || 0),
      browser: site.browser,
      fill: `var(--chart-${(index % 5) + 1})`,
    })) || [];

  // Group sessions by day for daily summary
  const sessionsByDay = useMemo(() => {
    if (!stats?.recentSessions) return {};

    return stats.recentSessions.reduce(
      (acc, session) => {
        const dateKey = toLocaleDateStringTz(
          new Date(session.startedAt),
          timezone,
        );

        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(session);
        return acc;
      },
      {} as Record<string, Session[]>,
    );
  }, [stats?.recentSessions, timezone]);

  // Calculate aggregated data for selected day
  const dayAggregatedData = useMemo(() => {
    if (!selectedDay || !sessionsByDay[selectedDay]) {
      return null;
    }

    const daySessions = sessionsByDay[selectedDay];

    // Aggregate time data
    let totalWork = 0;
    let totalBreak = 0;
    let totalIdle = 0;

    // Aggregate app usage
    const appMap = new Map<string, number>();
    const websiteMap = new Map<string, { timeMs: number; browser?: string }>();

    daySessions.forEach((session) => {
      totalWork += session.summary?.workTimeMs || 0;
      totalBreak += session.summary?.totalBreakMs || 0;
      totalIdle += session.summary?.totalIdleMs || 0;

      // Aggregate apps
      session.appUsage?.forEach((app: AppUsage) => {
        const current = appMap.get(app.appName) || 0;
        appMap.set(app.appName, current + (app.timeMs || 0));
      });

      // Aggregate websites
      session.websiteUsage?.forEach((site: WebsiteUsage) => {
        const current = websiteMap.get(site.website);
        if (current) {
          current.timeMs += site.timeMs || 0;
        } else {
          websiteMap.set(site.website, {
            timeMs: site.timeMs || 0,
            browser: site.browser,
          });
        }
      });
    });

    // Convert to arrays and sort
    const apps = Array.from(appMap.entries())
      .map(([name, timeMs]) => ({ name, timeMs, type: "app" as const }))
      .sort((a, b) => b.timeMs - a.timeMs);

    const websites = Array.from(websiteMap.entries())
      .map(([name, data]) => ({
        name,
        timeMs: data.timeMs,
        browser: data.browser,
        type: "website" as const,
      }))
      .sort((a, b) => b.timeMs - a.timeMs);

    // Combine apps and websites for unified timeline
    const activities = [...apps, ...websites].sort(
      (a, b) => b.timeMs - a.timeMs,
    );

    return {
      totalWork,
      totalBreak,
      totalIdle,
      apps,
      websites,
      activities,
    };
  }, [selectedDay, sessionsByDay]);

  const statusConfig = {
    Active: { color: "bg-green-600", label: "Working", icon: Activity },
    Idle: { color: "bg-yellow-500", label: "Idle", icon: Moon },
    Break: { color: "bg-sky-500", label: "On Break", icon: Coffee },
    Offline: { color: "bg-gray-400", label: "Offline", icon: Clock },
  };

  const StatusIcon =
    statusConfig[stats?.status as keyof typeof statusConfig]?.icon || Clock;
  const statusColor =
    statusConfig[stats?.status as keyof typeof statusConfig]?.color ||
    "bg-gray-400";
  const statusLabel =
    statusConfig[stats?.status as keyof typeof statusConfig]?.label ||
    "Unknown";

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
        <p className="text-muted-foreground mt-1">
          Track your work activity and productivity
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          {/* Stats Cards — Today */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <StatusIcon className="w-4 h-4" />
                  Current Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  className={`${statusColor} text-white text-lg py-2 px-4`}
                >
                  {statusLabel}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Today&apos;s Work
                </CardTitle>
                <Activity className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatTime(todayWorkMs)}
                </div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Today&apos;s Break
                </CardTitle>
                <Coffee className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {formatTime(todayBreakMs)}
                </div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Today&apos;s Idle
                </CardTitle>
                <Moon className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  {formatTime(todayIdleMs)}
                </div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>
          </div>

          {/* Workday Progress */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Workday Progress
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Based on an 8-hour workday
                  </CardDescription>
                </div>
                <span className="text-2xl font-bold">{workdayProgress}%</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={workdayProgress} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">
                  {formatTime(todayWorkMs)} done
                </span>
                <span>
                  {remainingMs > 0
                    ? `${formatTime(remainingMs)} remaining`
                    : "Target reached!"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Day-wise view with aggregated data */}
          {selectedDay && dayAggregatedData ? (
            <div className="space-y-4">
              {/* Selected Day Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{selectedDay}</h3>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-sm text-primary hover:underline"
                >
                  Back to Daily Summary
                </button>
              </div>

              {/* Compact Time Distribution Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Work Time
                    </CardTitle>
                    <Activity className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatTime(dayAggregatedData.totalWork)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Break Time
                    </CardTitle>
                    <Coffee className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatTime(dayAggregatedData.totalBreak)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Idle Time
                    </CardTitle>
                    <Moon className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {formatTime(dayAggregatedData.totalIdle)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs for different views */}
              <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
                  <TabsTrigger value="apps">Applications</TabsTrigger>
                </TabsList>

                {/* Unified Activity Timeline */}
                <TabsContent value="timeline" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Activity Timeline</CardTitle>
                      <CardDescription>
                        Combined applications and websites activity
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {dayAggregatedData.activities
                          .slice(0, 15)
                          .map((activity, index) => {
                            const isWebsite = activity.type === "website";
                            return (
                              <div
                                key={index}
                                className="flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Badge
                                    variant={
                                      isWebsite ? "secondary" : "default"
                                    }
                                    className="shrink-0"
                                  >
                                    {isWebsite
                                      ? activity.browser || "Web"
                                      : "App"}
                                  </Badge>
                                  <span
                                    className="text-sm truncate"
                                    title={activity.name}
                                  >
                                    {activity.name}
                                  </span>
                                </div>
                                <span className="text-sm font-medium ml-2 shrink-0">
                                  {formatTime(activity.timeMs)}
                                </span>
                              </div>
                            );
                          })}
                        {dayAggregatedData.activities.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No activity data for this day
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Applications Tab */}
                <TabsContent value="apps" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Applications Used</CardTitle>
                      <CardDescription>
                        All applications used on this day
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {dayAggregatedData.apps.map((app, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm truncate" title={app.name}>
                              {app.name}
                            </span>
                            <span className="text-sm font-medium ml-2 shrink-0">
                              {formatTime(app.timeMs)}
                            </span>
                          </div>
                        ))}
                        {dayAggregatedData.apps.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No application data for this day
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
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
                  {[
                    { key: "week", label: "7 Days" },
                    { key: "month", label: "30 Days" },
                  ].map((period) => {
                    const isActive = activeChart === period.key;
                    const periodData =
                      activeChart === "week"
                        ? dailyWorkChartData.slice(-7)
                        : dailyWorkChartData.slice(-30);
                    const totalHours = periodData.reduce(
                      (
                        acc: number,
                        curr: { work?: number; break?: number; idle?: number },
                      ) =>
                        acc +
                        (curr.work || 0) +
                        (curr.break || 0) +
                        (curr.idle || 0),
                      0,
                    );

                    return (
                      <button
                        key={period.key}
                        data-active={isActive}
                        className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 text-left even:border-l sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                        onClick={() =>
                          setActiveChart(period.key as "week" | "month")
                        }
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
                  className="aspect-auto h-50 w-full"
                >
                  <LineChart
                    accessibilityLayer
                    data={
                      activeChart === "week"
                        ? dailyWorkChartData.slice(-7)
                        : dailyWorkChartData.slice(-30)
                    }
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
        </div>
        <div>
          {/* Daily Summary Table */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Daily Summary</CardTitle>
                <CardDescription>
                  Click on a day to view aggregated activity
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Work Time</TableHead>
                    <TableHead>Break Time</TableHead>
                    <TableHead>Idle Time</TableHead>
                    <TableHead>Total Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(sessionsByDay)
                    .sort(
                      (a, b) =>
                        new Date(b[1][0].startedAt).getTime() -
                        new Date(a[1][0].startedAt).getTime(),
                    )
                    .map(([dateKey, daySessions]) => {
                      const totalWork = daySessions.reduce(
                        (acc, s) => acc + (s.summary?.workTimeMs || 0),
                        0,
                      );
                      const totalBreak = daySessions.reduce(
                        (acc, s) => acc + (s.summary?.totalBreakMs || 0),
                        0,
                      );
                      const totalIdle = daySessions.reduce(
                        (acc, s) => acc + (s.summary?.totalIdleMs || 0),
                        0,
                      );
                      const totalTime = totalWork + totalBreak + totalIdle;
                      const isSelected = selectedDay === dateKey;

                      const earliest = daySessions.reduce(
                        (min, s) =>
                          new Date(s.startedAt) < new Date(min.startedAt)
                            ? s
                            : min,
                        daySessions[0],
                      );
                      const hasActive = daySessions.some((s) => s.isActive);
                      const latest = daySessions.reduce((max, s) => {
                        const t = s.endedAt
                          ? new Date(s.endedAt)
                          : new Date(s.startedAt);
                        const mT = max.endedAt
                          ? new Date(max.endedAt)
                          : new Date(max.startedAt);
                        return t > mT ? s : max;
                      }, daySessions[0]);

                      const startTimeStr = new Date(
                        earliest.startedAt,
                      ).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      });
                      const endTimeStr = hasActive
                        ? "Active"
                        : latest.endedAt
                          ? new Date(latest.endedAt).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              },
                            )
                          : "—";

                      return (
                        <TableRow
                          key={dateKey}
                          className={`cursor-pointer hover:bg-muted/50 ${isSelected ? "bg-muted" : ""}`}
                          onClick={() => setSelectedDay(dateKey)}
                        >
                          <TableCell className="font-medium">
                            {dateKey}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {startTimeStr}
                          </TableCell>
                          <TableCell>
                            {hasActive ? (
                              <Badge className="bg-green-500 text-white">
                                Active
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">
                                {endTimeStr}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-green-600">
                            {formatTime(totalWork)}
                          </TableCell>
                          <TableCell className="text-blue-600">
                            {formatTime(totalBreak)}
                          </TableCell>
                          <TableCell className="text-yellow-600">
                            {formatTime(totalIdle)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatTime(totalTime)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {Object.keys(sessionsByDay).length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        No sessions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
