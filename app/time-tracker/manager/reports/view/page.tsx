"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  toLocaleStringTz, 
  toLocaleDateStringTz, 
  toLocaleTimeStringTz,
  getUserTimezone,
  formatInUserTimezone 
} from "@/lib/timezoneUtils";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF6B9D",
];

// Helper function to format hours into hrs/mins/secs
const formatTime = (hours: number): string => {
  if (hours === 0) return "0m";
  
  const totalMinutes = Math.floor(hours * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  
  const parts = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  
  return parts.length > 0 ? parts.join(" ") : "0m";
};

// Helper function to format minutes into hrs/mins
const formatMinutes = (minutes: number): string => {
  if (minutes === 0) return "0m";
  
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  
  const parts = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  
  return parts.length > 0 ? parts.join(" ") : "0m";
};

function ReportViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reportData, setReportData] = useState<any>(null);
  const [filters, setFilters] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timezone, setTimezone] = useState<string>('IST');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedAttendanceUserId, setSelectedAttendanceUserId] = useState<string | null>(null);
  const [attendanceComboboxOpen, setAttendanceComboboxOpen] = useState(false);
  const [selectedAppUsageUserId, setSelectedAppUsageUserId] = useState<string | null>(null);
  const [appUsageComboboxOpen, setAppUsageComboboxOpen] = useState(false);
  const [selectedWebUsageUserId, setSelectedWebUsageUserId] = useState<string | null>(null);
  const [webUsageComboboxOpen, setWebUsageComboboxOpen] = useState(false);
  const [selectedActiveIdleUserId, setSelectedActiveIdleUserId] = useState<string | null>(null);
  const [activeIdleComboboxOpen, setActiveIdleComboboxOpen] = useState(false);

  useEffect(() => {
    // Load timezone
    const storedTimezone = localStorage.getItem('timezone') || 'IST';
    setTimezone(storedTimezone);

    const data = sessionStorage.getItem("currentReport");
    const filterData = sessionStorage.getItem("currentReportFilters");

    if (data && filterData) {
      setReportData(JSON.parse(data));
      setFilters(JSON.parse(filterData));
    } else {
      toast.error("No report data found");
      router.push("/time-tracker/manager/reports");
    }
    setLoading(false);

    // Listen for timezone changes
    const handleTimezoneChange = (e: CustomEvent) => {
      setTimezone(e.detail);
      // Clear the report and redirect to regenerate
      toast.warning('Timezone changed. Returning to reports page to regenerate with new timezone...', {
        duration: 3000,
      });
      setTimeout(() => {
        sessionStorage.removeItem('currentReport');
        sessionStorage.removeItem('currentReportFilters');
        router.push('/time-tracker/manager/reports');
      }, 2000);
    };

    window.addEventListener('timezoneChanged' as any, handleTimezoneChange as any);
    return () => {
      window.removeEventListener('timezoneChanged' as any, handleTimezoneChange as any);
    };
  }, [router]);

  const downloadReport = async (format: "excel" | "pdf") => {
    try {
      toast.info(`Downloading ${format.toUpperCase()} report...`);

      const response = await fetch("/api/reports/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({
          filters,
          format,
          reportData,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report-${filters?.reportType}-${
          formatInUserTimezone(new Date(), "yyyy-MM-dd", timezone as 'IST' | 'EST')
        }.${format === "excel" ? "xlsx" : "pdf"}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`${format.toUpperCase()} report downloaded`);
      } else {
        toast.error("Failed to download report");
      }
    } catch (err) {
      console.error("Error downloading report:", err);
      toast.error("Failed to download report");
    }
  };

  const getReportTitle = () => {
    const titles: Record<string, string> = {
      "exception-alert": "Exception & Alert Report",
      "trend-comparison": "Trend & Comparison Report",
      "attendance-session": "Attendance & Session Report",
      "productivity-score": "Productivity Score Report",
      "app-website-usage": "App & Website Usage Report",
      "active-idle-time": "Active & Idle Time Report",
    };
    return titles[filters?.reportType] || "Report";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading report...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>No report data available</p>
          <Button
            onClick={() => router.push("/time-tracker/manager/reports")}
            className="mt-4"
          >
            Back to Reports
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/time-tracker/manager/reports")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{getReportTitle()}</h1>
            <div className="flex items-center gap-3 text-muted-foreground">
              <p>
                {filters?.dateFrom} to {filters?.dateTo}
              </p>
              <Badge variant="outline" className="text-xs">
                {timezone === 'IST' ? 'Indian Standard Time (IST)' : 'Eastern Standard Time (EST)'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadReport("excel")}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => downloadReport("pdf")}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary */}
      {reportData.summary && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(reportData.summary).map(([key, value]) => (
                <div key={key} className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground capitalize mb-1">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                  <p className="text-2xl font-bold">{String(value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exception Report */}
      {filters?.reportType === "exception-alert" && reportData.exceptions && (
        <Card>
          <CardHeader>
            <CardTitle>
              Exceptions Detected ({reportData.exceptions.length})
            </CardTitle>
            <CardDescription>
              Sessions with excessive idle time or low activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.exceptions.map((exc: any, idx: number) => (
                <div
                  key={idx}
                  className="border-l-4 border-red-500 pl-4 py-3 bg-red-50 dark:bg-red-950/20 rounded-r"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-lg">
                          {exc.user.name || exc.user.email}
                        </p>
                        <Badge variant="destructive">
                          {exc.alerts.length} Alert
                          {exc.alerts.length > 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {toLocaleStringTz(exc.startedAt, timezone as 'IST' | 'EST')} -{" "}
                        {toLocaleStringTz(exc.endedAt, timezone as 'IST' | 'EST')}
                      </p>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Total Time
                          </p>
                          <p className="font-semibold">
                            {exc.totalMinutes} min
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Active Time
                          </p>
                          <p className="font-semibold text-green-600">
                            {exc.activeMinutes} min
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Idle Time
                          </p>
                          <p className="font-semibold text-red-600">
                            {exc.idleMinutes} min
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {exc.alerts.map((alert: any, aidx: number) => (
                          <div
                            key={aidx}
                            className="flex items-center gap-2 text-sm bg-white dark:bg-gray-900 p-2 rounded"
                          >
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                            <span className="flex-1">{alert.message}</span>
                            <Badge
                              variant={
                                alert.severity === "high"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {alert.severity}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trend Report */}
      {filters?.reportType === "trend-comparison" && reportData.dailyData && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Daily Activity Trends</CardTitle>
              <CardDescription>
                {filters.dateFrom &&
                  filters.dateTo &&
                  `${toLocaleDateStringTz(filters.dateFrom, timezone as 'IST' | 'EST')} - ${toLocaleDateStringTz(filters.dateTo, timezone as 'IST' | 'EST')}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={
                  {
                    totalActiveHours: {
                      label: "Active Hours",
                      color: "#8884d8",
                    },
                    sessionCount: {
                      label: "Sessions",
                      color: "#82ca9d",
                    },
                    activityPercentage: {
                      label: "Activity %",
                      color: "#ffc658",
                    },
                  } satisfies ChartConfig
                }
                className="h-[300px] w-full"
              >
                <LineChart
                  accessibilityLayer
                  data={reportData.dailyData}
                  margin={{
                    left: 12,
                    right: 12,
                    top: 12,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) =>
                      formatInUserTimezone(new Date(value), "MMM d", timezone as 'IST' | 'EST')
                    }
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Line
                    dataKey="totalActiveHours"
                    type="natural"
                    stroke="var(--color-totalActiveHours)"
                    strokeWidth={2}
                    dot={{
                      fill: "var(--color-totalActiveHours)",
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />
                  <Line
                    dataKey="sessionCount"
                    type="natural"
                    stroke="var(--color-sessionCount)"
                    strokeWidth={2}
                    dot={{
                      fill: "var(--color-sessionCount)",
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />
                  <Line
                    dataKey="activityPercentage"
                    type="natural"
                    stroke="var(--color-activityPercentage)"
                    strokeWidth={2}
                    dot={{
                      fill: "var(--color-activityPercentage)",
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {reportData.trends && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Trend Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      Session Count Trend
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">
                        {reportData.trends.sessionCountTrend > 0 ? "+" : ""}
                        {reportData.trends.sessionCountTrend}
                      </p>
                      {reportData.trends.sessionCountTrend > 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      Active Hours Trend
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">
                        {reportData.trends.activeHoursTrend > 0 ? "+" : ""}
                        {formatTime(Math.abs(reportData.trends.activeHoursTrend))}
                      </p>
                      {reportData.trends.activeHoursTrend > 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      Activity % Trend
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">
                        {reportData.trends.activityTrend > 0 ? "+" : ""}
                        {reportData.trends.activityTrend}%
                      </p>
                      {reportData.trends.activityTrend > 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Per-User Trend Comparison */}
          {reportData.userTrends &&
            reportData.userTrends.length > 0 &&
            (() => {
              const selectedUser = selectedUserId
                ? reportData.userTrends.find(
                    (u: any) => u.user.id === selectedUserId
                  )
                : reportData.userTrends[0];

              return (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Individual User Trend</CardTitle>
                        <CardDescription>
                          Select an employee to view their activity trend
                        </CardDescription>
                      </div>
                      <Popover
                        open={comboboxOpen}
                        onOpenChange={setComboboxOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={comboboxOpen}
                            className="w-[300px] justify-between"
                          >
                            {selectedUserId
                              ? (() => {
                                  const user = reportData.userTrends.find(
                                    (u: any) => u.user.id === selectedUserId
                                  );
                                  return user
                                    ? `${user.user.name} (${user.user.email})`
                                    : "Select employee...";
                                })()
                              : reportData.userTrends[0]
                              ? `${reportData.userTrends[0].user.name} (${reportData.userTrends[0].user.email})`
                              : "Select employee..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput placeholder="Search employee..." />
                            <CommandList>
                              <CommandEmpty>No employee found.</CommandEmpty>
                              <CommandGroup>
                                {reportData.userTrends.map((userTrend: any) => (
                                  <CommandItem
                                    key={userTrend.user.id}
                                    value={`${userTrend.user.name} ${userTrend.user.email}`}
                                    onSelect={() => {
                                      setSelectedUserId(userTrend.user.id);
                                      setComboboxOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        (selectedUserId ||
                                          reportData.userTrends[0]?.user.id) ===
                                          userTrend.user.id
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {userTrend.user.name} (
                                    {userTrend.user.email})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedUser && (
                      <div className="space-y-6">
                        <ChartContainer
                          config={
                            {
                              activeHours: {
                                label: "Active Hours",
                                color: "#8884d8",
                              },
                              sessionCount: {
                                label: "Sessions",
                                color: "#82ca9d",
                              },
                              activityPercentage: {
                                label: "Activity %",
                                color: "#ffc658",
                              },
                            } satisfies ChartConfig
                          }
                          className="h-[300px] w-full"
                        >
                          <LineChart
                            accessibilityLayer
                            data={selectedUser.dailyData}
                            margin={{
                              left: 12,
                              right: 12,
                            }}
                          >
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="date"
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              tickFormatter={(value) =>
                                formatInUserTimezone(new Date(value), "MMM d", timezone as 'IST' | 'EST')
                              }
                            />
                            <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent />}
                            />
                            <Line
                              dataKey="activeHours"
                              type="natural"
                              stroke="var(--color-activeHours)"
                              strokeWidth={2}
                              dot={{
                                fill: "var(--color-activeHours)",
                              }}
                              activeDot={{
                                r: 6,
                              }}
                            />
                            <Line
                              dataKey="sessionCount"
                              type="natural"
                              stroke="var(--color-sessionCount)"
                              strokeWidth={2}
                              dot={{
                                fill: "var(--color-sessionCount)",
                              }}
                              activeDot={{
                                r: 6,
                              }}
                            />
                            <Line
                              dataKey="activityPercentage"
                              type="natural"
                              stroke="var(--color-activityPercentage)"
                              strokeWidth={2}
                              dot={{
                                fill: "var(--color-activityPercentage)",
                              }}
                              activeDot={{
                                r: 6,
                              }}
                            />
                          </LineChart>
                        </ChartContainer>
                        <div className="flex gap-8">
                          <Card className="flex-1">
                            <CardHeader>
                              <CardTitle>Performance Summary</CardTitle>
                              <CardDescription>
                                Selected period overview
                              </CardDescription>
                            </CardHeader>

                            <CardContent>
                              <div className="grid grid-cols-3 gap-6">
                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Sessions
                                  </p>
                                  <p className="text-3xl font-bold">
                                    {selectedUser.totalSessions}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Active Hours
                                  </p>
                                  <p className="text-3xl font-bold">
                                    {selectedUser.totalActiveHours}
                                    <span className="text-base font-medium text-muted-foreground">
                                      h
                                    </span>
                                  </p>
                                </div>

                                <div>
                                  <p className="text-sm text-muted-foreground">
                                    Avg Activity
                                  </p>
                                  <p className="text-3xl font-bold">
                                    {selectedUser.averageActivityPercentage}
                                    <span className="text-base font-medium text-muted-foreground">
                                      %
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {selectedUser.trend && (
                            <Card className="flex-1">
                              <CardHeader>
                                <CardTitle>Trend Overview</CardTitle>
                                <CardDescription>
                                  Change vs previous period
                                </CardDescription>
                              </CardHeader>

                              <CardContent>
                                <div className="grid grid-cols-3 gap-6">
                                  {/* Sessions */}
                                  <div className="flex items-center gap-3">
                                    {selectedUser.trend.sessionCountTrend >=
                                    0 ? (
                                      <TrendingUp className="w-6 h-6 text-green-500" />
                                    ) : (
                                      <TrendingDown className="w-6 h-6 text-red-500" />
                                    )}

                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Sessions
                                      </p>
                                      <p
                                        className={`text-xl font-semibold ${
                                          selectedUser.trend
                                            .sessionCountTrend >= 0
                                            ? "text-green-600"
                                            : "text-red-600"
                                        }`}
                                      >
                                        {selectedUser.trend.sessionCountTrend >
                                        0
                                          ? "+"
                                          : ""}
                                        {selectedUser.trend.sessionCountTrend}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Active Hours */}
                                  <div className="flex items-center gap-3">
                                    {selectedUser.trend.activeHoursTrend >=
                                    0 ? (
                                      <TrendingUp className="w-6 h-6 text-green-500" />
                                    ) : (
                                      <TrendingDown className="w-6 h-6 text-red-500" />
                                    )}

                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Active Hours
                                      </p>
                                      <p
                                        className={`text-xl font-semibold ${
                                          selectedUser.trend.activeHoursTrend >=
                                          0
                                            ? "text-green-600"
                                            : "text-red-600"
                                        }`}
                                      >
                                        {selectedUser.trend.activeHoursTrend > 0
                                          ? "+"
                                          : ""}
                                        {formatTime(Math.abs(selectedUser.trend.activeHoursTrend))}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Activity */}
                                  <div className="flex items-center gap-3">
                                    {selectedUser.trend.activityTrend >= 0 ? (
                                      <TrendingUp className="w-6 h-6 text-green-500" />
                                    ) : (
                                      <TrendingDown className="w-6 h-6 text-red-500" />
                                    )}

                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        Activity
                                      </p>
                                      <p
                                        className={`text-xl font-semibold ${
                                          selectedUser.trend.activityTrend >= 0
                                            ? "text-green-600"
                                            : "text-red-600"
                                        }`}
                                      >
                                        {selectedUser.trend.activityTrend > 0
                                          ? "+"
                                          : ""}
                                        {selectedUser.trend.activityTrend}%
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
        </>
      )}

      {/* Productivity Score Report */}
      {filters?.reportType === "productivity-score" && reportData.scores && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Productivity Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.scores}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="user.name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="score" fill="#8884d8" name="Overall Score" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {reportData.scores.map((score: any, idx: number) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-1">
                        {score.user.name || score.user.email}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {score.metrics.totalSessions} sessions
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold mb-1">
                        {score.score}
                      </div>
                      <div className="text-sm text-muted-foreground">/ 100</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                      <p className="text-xs text-muted-foreground mb-1">
                        Activity Score
                      </p>
                      <p className="text-lg font-bold text-blue-600">
                        {score.breakdown.activityScore}/40
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded">
                      <p className="text-xs text-muted-foreground mb-1">
                        Productivity Score
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        {score.breakdown.productivityScore}/40
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded">
                      <p className="text-xs text-muted-foreground mb-1">
                        Consistency Score
                      </p>
                      <p className="text-lg font-bold text-purple-600">
                        {score.breakdown.consistencyScore}/20
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Active</p>
                      <p className="font-semibold">
                        {formatTime(score.metrics.totalActiveHours)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Productive</p>
                      <p className="font-semibold">
                        {formatTime(score.metrics.productiveHours)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Activity %</p>
                      <p className="font-semibold">
                        {score.metrics.activityPercentage}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* App & Website Usage Report */}
      {filters?.reportType === "app-website-usage" && (
        <>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {reportData.topApps && reportData.topApps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Applications</CardTitle>
                  <CardDescription>
                    Most used applications by your team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      totalHours: {
                        label: "Hours",
                        color: "#8884d8",
                      },
                    } satisfies ChartConfig}
                    className="h-[300px]"
                  >
                    <BarChart
                      accessibilityLayer
                      data={reportData.topApps.slice(0, 10)}
                      layout="vertical"
                      margin={{
                        left: 0,
                        right: 60,
                      }}
                    >
                      <XAxis type="number" dataKey="totalHours" hide />
                      <YAxis
                        dataKey="appName"
                        type="category"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value.length > 20 ? value.slice(0, 20) + '...' : value}
                        width={150}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Bar dataKey="totalHours" fill="var(--color-totalHours)" radius={5}>
                        <LabelList
                          dataKey="totalHours"
                          position="right"
                          offset={8}
                          className="fill-foreground"
                          fontSize={11}
                          formatter={(value: number) => formatTime(value)}
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                    {reportData.topApps.map((app: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 hover:bg-muted rounded"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm font-mono text-muted-foreground w-6">
                            {idx + 1}
                          </span>
                          <span className="text-sm truncate">
                            {app.appName}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{app.userCount} users</Badge>
                          <span className="text-sm font-semibold w-16 text-right">
                            {formatTime(app.totalHours)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {reportData.topWebsites && reportData.topWebsites.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Websites</CardTitle>
                  <CardDescription>
                    Most visited websites by your team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      totalHours: {
                        label: "Hours",
                        color: "#82ca9d",
                      },
                    } satisfies ChartConfig}
                    className="h-[300px]"
                  >
                    <BarChart
                      accessibilityLayer
                      data={reportData.topWebsites.slice(0, 10)}
                      layout="vertical"
                      margin={{
                        left: 0,
                        right: 60,
                      }}
                    >
                      <XAxis type="number" dataKey="totalHours" hide />
                      <YAxis
                        dataKey="website"
                        type="category"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value.length > 20 ? value.slice(0, 20) + '...' : value}
                        width={150}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Bar dataKey="totalHours" fill="var(--color-totalHours)" radius={5}>
                        <LabelList
                          dataKey="totalHours"
                          position="right"
                          offset={8}
                          className="fill-foreground"
                          fontSize={11}
                          formatter={(value: number) => formatTime(value)}
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                    {reportData.topWebsites.map((site: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 hover:bg-muted rounded"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm font-mono text-muted-foreground w-6">
                            {idx + 1}
                          </span>
                          <span className="text-sm truncate">
                            {site.website}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">
                            {site.userCount} users
                          </Badge>
                          <span className="text-sm font-semibold w-16 text-right">
                            {formatTime(site.totalHours)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Per-User App & Website Usage */}
          {reportData.userAppUsage && reportData.userAppUsage.length > 0 && 
           reportData.userWebsiteUsage && reportData.userWebsiteUsage.length > 0 && (() => {
            const selectedAppUser = selectedAppUsageUserId
              ? reportData.userAppUsage.find((u: any) => u.user.id === selectedAppUsageUserId)
              : reportData.userAppUsage[0];
            
            const selectedWebUser = selectedAppUsageUserId
              ? reportData.userWebsiteUsage.find((u: any) => u.user.id === selectedAppUsageUserId)
              : reportData.userWebsiteUsage[0];
            
            return (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Individual Usage Details</CardTitle>
                      <CardDescription>
                        Select an employee to view their app and website usage
                      </CardDescription>
                    </div>
                    <Popover open={appUsageComboboxOpen} onOpenChange={setAppUsageComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={appUsageComboboxOpen}
                          className="w-[300px] justify-between"
                        >
                          {selectedAppUsageUserId
                            ? (() => {
                                const user = reportData.userAppUsage.find((u: any) => u.user.id === selectedAppUsageUserId);
                                return user ? `${user.user.name} (${user.user.email})` : "Select employee...";
                              })()
                            : reportData.userAppUsage[0]
                            ? `${reportData.userAppUsage[0].user.name} (${reportData.userAppUsage[0].user.email})`
                            : "Select employee..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Search employee..." />
                          <CommandList>
                            <CommandEmpty>No employee found.</CommandEmpty>
                            <CommandGroup>
                              {reportData.userAppUsage.map((userData: any) => (
                                <CommandItem
                                  key={userData.user.id}
                                  value={`${userData.user.name} ${userData.user.email}`}
                                  onSelect={() => {
                                    setSelectedAppUsageUserId(userData.user.id);
                                    setAppUsageComboboxOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      (selectedAppUsageUserId || reportData.userAppUsage[0]?.user.id) === userData.user.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {userData.user.name} ({userData.user.email})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {selectedAppUser && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold">Application Usage</h4>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>{formatTime(selectedAppUser.totalAppHours)} total</span>
                            <span>•</span>
                            <span>{selectedAppUser.appCount} apps</span>
                          </div>
                        </div>
                        <ChartContainer
                          config={{
                            hours: {
                              label: "Hours",
                              color: "#8884d8",
                            },
                          } satisfies ChartConfig}
                          className="h-[350px]"
                        >
                          <BarChart
                            accessibilityLayer
                            data={selectedAppUser.topApps}
                            layout="vertical"
                            margin={{
                              left: 0,
                              right: 60,
                            }}
                          >
                            <XAxis type="number" dataKey="hours" hide />
                            <YAxis
                              dataKey="appName"
                              type="category"
                              tickLine={false}
                              tickMargin={10}
                              axisLine={false}
                              tickFormatter={(value) => value.length > 20 ? value.slice(0, 20) + '...' : value}
                              width={140}
                            />
                            <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent hideLabel />}
                            />
                            <Bar dataKey="hours" fill="var(--color-hours)" radius={5}>
                              <LabelList
                                dataKey="hours"
                                position="right"
                                offset={8}
                                className="fill-foreground"
                                fontSize={11}
                                formatter={(value: number) => formatTime(value)}
                              />
                            </Bar>
                          </BarChart>
                        </ChartContainer>
                      </div>
                    )}

                    {selectedWebUser && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold">Website Usage</h4>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>{formatTime(selectedWebUser.totalBrowsingHours)} total</span>
                            <span>•</span>
                            <span>{selectedWebUser.websiteCount} sites</span>
                          </div>
                        </div>
                        <ChartContainer
                          config={{
                            hours: {
                              label: "Hours",
                              color: "#82ca9d",
                            },
                          } satisfies ChartConfig}
                          className="h-[350px]"
                        >
                          <BarChart
                            accessibilityLayer
                            data={selectedWebUser.topWebsites}
                            layout="vertical"
                            margin={{
                              left: 0,
                              right: 60,
                            }}
                          >
                            <XAxis type="number" dataKey="hours" hide />
                            <YAxis
                              dataKey="website"
                              type="category"
                              tickLine={false}
                              tickMargin={10}
                              axisLine={false}
                              tickFormatter={(value) => value.length > 20 ? value.slice(0, 20) + '...' : value}
                              width={140}
                            />
                            <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent hideLabel />}
                            />
                            <Bar dataKey="hours" fill="var(--color-hours)" radius={5}>
                              <LabelList
                                dataKey="hours"
                                position="right"
                                offset={8}
                                className="fill-foreground"
                                fontSize={11}
                                formatter={(value: number) => formatTime(value)}
                              />
                            </Bar>
                          </BarChart>
                        </ChartContainer>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </>
      )}

      {/* Active/Idle Time Report */}
      {filters?.reportType === "active-idle-time" &&
        reportData.userAnalysis && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Activity Distribution</CardTitle>
                <CardDescription>Active vs Idle time across all team members</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    activeHours: {
                      label: "Active Hours",
                      color: "#82ca9d",
                    },
                    idleHours: {
                      label: "Idle Hours",
                      color: "#ff8042",
                    },
                  } satisfies ChartConfig}
                  className="h-[400px] w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={reportData.userAnalysis}
                    margin={{
                      top: 20,
                      right: 12,
                      left: 12,
                    }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="user.name"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + '...' : value}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatTime(value)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="activeHours" fill="var(--color-activeHours)" radius={[4, 4, 0, 0]}>
                      <LabelList
                        dataKey="activeHours"
                        position="top"
                        offset={8}
                        className="fill-foreground"
                        fontSize={11}
                        formatter={(value: number) => formatTime(value)}
                      />
                    </Bar>
                    <Bar dataKey="idleHours" fill="var(--color-idleHours)" radius={[4, 4, 0, 0]}>
                      <LabelList
                        dataKey="idleHours"
                        position="top"
                        offset={8}
                        className="fill-foreground"
                        fontSize={11}
                        formatter={(value: number) => formatTime(value)}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Per-User Details */}
            {reportData.userAnalysis.length > 0 && (() => {
              const selectedUser = selectedActiveIdleUserId
                ? reportData.userAnalysis.find((u: any) => u.user.id === selectedActiveIdleUserId)
                : reportData.userAnalysis[0];
              
              return (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Individual Activity Analysis</CardTitle>
                        <CardDescription>Select an employee to view detailed activity metrics</CardDescription>
                      </div>
                      <Popover open={activeIdleComboboxOpen} onOpenChange={setActiveIdleComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={activeIdleComboboxOpen}
                            className="w-[300px] justify-between"
                          >
                            {selectedActiveIdleUserId
                              ? (() => {
                                  const user = reportData.userAnalysis.find((u: any) => u.user.id === selectedActiveIdleUserId);
                                  return user ? `${user.user.name} (${user.user.email})` : "Select employee...";
                                })()
                              : reportData.userAnalysis[0]
                              ? `${reportData.userAnalysis[0].user.name} (${reportData.userAnalysis[0].user.email})`
                              : "Select employee..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput placeholder="Search employee..." />
                            <CommandList>
                              <CommandEmpty>No employee found.</CommandEmpty>
                              <CommandGroup>
                                {reportData.userAnalysis.map((userRecord: any) => (
                                  <CommandItem
                                    key={userRecord.user.id}
                                    value={`${userRecord.user.name} ${userRecord.user.email}`}
                                    onSelect={() => {
                                      setSelectedActiveIdleUserId(userRecord.user.id);
                                      setActiveIdleComboboxOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        (selectedActiveIdleUserId || reportData.userAnalysis[0]?.user.id) === userRecord.user.id
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {userRecord.user.name} ({userRecord.user.email})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedUser && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Sessions</p>
                            <p className="text-2xl font-bold">{selectedUser.totalSessions}</p>
                          </div>
                          <Badge
                            variant={
                              selectedUser.activityPercentage >= 70
                                ? "default"
                                : selectedUser.activityPercentage >= 50
                                ? "secondary"
                                : "destructive"
                            }
                            className="text-lg px-4 py-2"
                          >
                            {selectedUser.activityPercentage}% Active
                          </Badge>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded">
                            <p className="text-xs font-bold text-foreground">
                              Active Time
                            </p>
                            <p className="text-xs text-muted-foreground mb-1">
                              Total time with activity
                            </p>
                            <p className="text-lg font-bold text-green-600">
                              {formatTime(selectedUser.activeHours)}
                            </p>
                          </div>
                          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded">
                            <p className="text-xs font-bold text-foreground">
                              Idle Time
                            </p>
                            <p className="text-xs text-muted-foreground mb-1">
                              Total time inactive
                            </p>
                            <p className="text-lg font-bold text-red-600">
                              {formatTime(selectedUser.idleHours)}
                            </p>
                          </div>
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                            <p className="text-xs font-bold text-foreground">
                              Avg Active/Session
                            </p>
                            <p className="text-xs text-muted-foreground mb-1">
                              Avg active per session
                            </p>
                            <p className="text-lg font-bold text-blue-600">
                              {formatMinutes(selectedUser.averageActiveMinutesPerSession)}
                            </p>
                          </div>
                          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded">
                            <p className="text-xs font-bold text-foreground">
                              Max Idle Streak
                            </p>
                            <p className="text-xs text-muted-foreground mb-1">
                              Longest idle period
                            </p>
                            <p className="text-lg font-bold text-orange-600">
                              {formatMinutes(selectedUser.maxIdleStreakMinutes)}
                            </p>
                          </div>
                        </div>

                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                          <div
                            className="bg-green-500 h-4 rounded-full transition-all"
                            style={{ width: `${selectedUser.activityPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </>
        )}

      {/* Attendance Report */}
      {filters?.reportType === "attendance-session" &&
        reportData.attendance && reportData.attendance.length > 0 && (() => {
          const selectedUser = selectedAttendanceUserId
            ? reportData.attendance.find((u: any) => u.user.id === selectedAttendanceUserId)
            : reportData.attendance[0];
          
          return (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Attendance & Session Details</CardTitle>
                    <CardDescription>Select an employee to view their attendance records</CardDescription>
                  </div>
                  <Popover open={attendanceComboboxOpen} onOpenChange={setAttendanceComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={attendanceComboboxOpen}
                        className="w-[300px] justify-between"
                      >
                        {selectedAttendanceUserId
                          ? (() => {
                              const user = reportData.attendance.find((u: any) => u.user.id === selectedAttendanceUserId);
                              return user ? `${user.user.name} (${user.user.email})` : "Select employee...";
                            })()
                          : reportData.attendance[0]
                          ? `${reportData.attendance[0].user.name} (${reportData.attendance[0].user.email})`
                          : "Select employee..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search employee..." />
                        <CommandList>
                          <CommandEmpty>No employee found.</CommandEmpty>
                          <CommandGroup>
                            {reportData.attendance.map((userRecord: any) => (
                              <CommandItem
                                key={userRecord.user.id}
                                value={`${userRecord.user.name} ${userRecord.user.email}`}
                                onSelect={() => {
                                  setSelectedAttendanceUserId(userRecord.user.id);
                                  setAttendanceComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    (selectedAttendanceUserId || reportData.attendance[0]?.user.id) === userRecord.user.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {userRecord.user.name} ({userRecord.user.email})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent>
                {selectedUser && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardDescription>Total Active Days</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{selectedUser.totalActiveDays}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardDescription>Total Sessions</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{selectedUser.totalSessions}</div>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold mb-3">Daily Records</h4>
                      <div className="space-y-2">
                        {selectedUser.dailyRecords.map((day: any, didx: number) => (
                          <Card key={didx}>
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <Badge variant="outline" className="font-mono">{day.date}</Badge>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      {day.sessionCount} session{day.sessionCount > 1 ? "s" : ""}
                                    </span>
                                    <Badge className="ml-2">{formatMinutes(day.totalMinutes)}</Badge>
                                  </div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {toLocaleTimeStringTz(day.firstLogin, timezone as 'IST' | 'EST')} -{" "}
                                  {day.lastLogout
                                    ? toLocaleTimeStringTz(day.lastLogout, timezone as 'IST' | 'EST')
                                    : "Active"}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}
    </div>
  );
}

export default function ReportViewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReportViewContent />
    </Suspense>
  );
}
