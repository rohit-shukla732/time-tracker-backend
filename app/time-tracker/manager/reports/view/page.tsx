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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Check,
  ChevronsUpDown,
  Clock,
  Coffee,
  Activity,
  Moon,
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

// Helper function to format minutes into HH:MM:SS
const minsToHMS = (minutes: number): string => {
  if (!minutes && minutes !== 0) return "—";
  const totalSecs = Math.round(minutes * 60);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<string | null>(null);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [attendanceSort, setAttendanceSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
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
    if (!reportData || !filters) return;
    const toastId = toast.loading(`Preparing ${format.toUpperCase()} export…`);
    const dateTag = formatInUserTimezone(new Date(), "yyyy-MM-dd", timezone as 'IST' | 'EST');
    const filename = `report-${filters.reportType}-${dateTag}`;

    try {
      if (format === "excel") {
        // ── Excel (SheetJS) ────────────────────────────────────────────────────
        const XLSX = await import("xlsx");
        const wb = XLSX.utils.book_new();

        const rtype = filters.reportType as string;

        if (rtype === "attendance-session" && reportData.dailyAttendance) {
          // Flat sheet: one row per (date × member)
          const rows: any[] = [];
          for (const day of reportData.dailyAttendance) {
            for (const m of day.members) {
              rows.push({
                Date: day.date,
                Employee: m.user?.name ?? "",
                Email: m.user?.email ?? "",
                Status: m.present ? "Present" : "Absent",
                "Clock In": m.clockIn ? new Date(m.clockIn).toLocaleTimeString() : "—",
                "Clock Out": m.clockOut ? new Date(m.clockOut).toLocaleTimeString() : "—",
                "Work Time": m.present ? minsToHMS(m.workMinutes) : "",
                "Break Time": m.present ? minsToHMS(m.breakMinutes) : "",
                "Idle Time": m.present ? minsToHMS(m.idleMinutes) : "",
                "Activity %": m.present ? m.activePct : "",
              });
            }
          }
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Attendance");

        } else if (rtype === "exception-alert" && reportData.exceptions) {
          const rows = reportData.exceptions.map((e: any) => ({
            Employee: e.user?.name ?? "",
            Email: e.user?.email ?? "",
            "Session Start": e.startedAt ? new Date(e.startedAt).toLocaleString() : "",
            "Session End": e.endedAt ? new Date(e.endedAt).toLocaleString() : "",
            "Total (min)": e.totalMinutes,
            "Active (min)": e.activeMinutes,
            "Idle (min)": e.idleMinutes,
            "Activity %": e.activityPercentage,
            Alerts: (e.alerts as any[]).map((a: any) => a.message).join("; "),
          }));
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Exceptions");

        } else if (rtype === "trend-comparison") {
          if (reportData.dailyData) {
            const rows = reportData.dailyData.map((d: any) => ({
              Date: d.date,
              Sessions: d.sessionCount,
              "Active Hours": d.totalActiveHours,
              "Total Hours": d.totalHours,
              "Activity %": d.activityPercentage,
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Daily Trend");
          }
          if (reportData.userTrends) {
            const rows = reportData.userTrends.map((u: any) => ({
              Employee: u.user?.name ?? "",
              Email: u.user?.email ?? "",
              "Total Sessions": u.totalSessions,
              "Active Hours": u.totalActiveHours,
              "Avg Activity %": u.averageActivityPercentage,
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Per User");
          }

        } else if (rtype === "productivity-score" && reportData.scores) {
          const rows = reportData.scores.map((u: any) => ({
            Employee: u.user?.name ?? "",
            Email: u.user?.email ?? "",
            Score: u.score,
            "Activity Score": u.breakdown?.activityScore ?? "",
            "Productivity Score": u.breakdown?.productivityScore ?? "",
            "Consistency Score": u.breakdown?.consistencyScore ?? "",
            Sessions: u.metrics?.totalSessions ?? "",
            "Active Hours": u.metrics?.totalActiveHours ?? "",
            "Activity %": u.metrics?.activityPercentage ?? "",
          }));
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Productivity");

        } else if (rtype === "app-website-usage") {
          if (reportData.appUsage) {
            const rows = reportData.appUsage.map((a: any) => ({
              Employee: a.user?.name ?? "",
              App: a.appName,
              "Time (min)": Math.round((a.totalTimeMs ?? a.timeMs ?? 0) / 60000),
              Category: a.category ?? "",
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "App Usage");
          }
          if (reportData.websiteUsage) {
            const rows = reportData.websiteUsage.map((w: any) => ({
              Employee: w.user?.name ?? "",
              Website: w.domain ?? w.url ?? "",
              "Time (min)": Math.round((w.totalTimeMs ?? w.timeMs ?? 0) / 60000),
              Category: w.category ?? "",
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Website Usage");
          }

        } else if (rtype === "active-idle-time") {
          const rows = (reportData.users ?? reportData.data ?? []).map((u: any) => ({
            Employee: u.user?.name ?? u.name ?? "",
            Email: u.user?.email ?? u.email ?? "",
            "Active (min)": Math.round((u.activeMs ?? 0) / 60000),
            "Idle (min)": Math.round((u.idleMs ?? 0) / 60000),
            "Activity %": u.activityPercentage ?? u.activePct ?? "",
          }));
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Active-Idle");

        } else {
          // Generic fallback: dump summary + any array we find
          if (reportData.summary) {
            XLSX.utils.book_append_sheet(
              wb,
              XLSX.utils.json_to_sheet([reportData.summary]),
              "Summary"
            );
          }
          const firstArray = Object.values(reportData).find(Array.isArray) as any[] | undefined;
          if (firstArray) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(firstArray), "Data");
          }
        }

        // Always prepend a Summary sheet
        if (reportData.summary) {
          const summaryRows = Object.entries(reportData.summary).map(([k, v]) => ({
            Metric: k.replace(/([A-Z])/g, " $1").trim(),
            Value: typeof v === "object" ? JSON.stringify(v) : String(v),
          }));
          const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
          wb.SheetNames.unshift("Summary");
          wb.Sheets["Summary"] = summarySheet;
        }

        XLSX.writeFile(wb, `${filename}.xlsx`);
        toast.dismiss(toastId);
        toast.success("Excel report downloaded");

      } else {
        // ── PDF (jspdf + jspdf-autotable) ─────────────────────────────────────
        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");

        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const rtype = filters.reportType as string;
        const title = {
          "exception-alert": "Exception & Alert Report",
          "trend-comparison": "Trend & Comparison Report",
          "attendance-session": "Attendance & Session Report",
          "productivity-score": "Productivity Score Report",
          "app-website-usage": "App & Website Usage Report",
          "active-idle-time": "Active & Idle Time Report",
        }[rtype] ?? "Report";

        // Header
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(title, 14, 16);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(`Period: ${filters.dateFrom} → ${filters.dateTo}   |   Timezone: ${timezone}`, 14, 22);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 27);
        doc.setTextColor(0);

        let startY = 34;

        // Summary box
        if (reportData.summary) {
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text("Summary", 14, startY);
          startY += 4;
          const summaryBody = Object.entries(reportData.summary).map(([k, v]) => [
            k.replace(/([A-Z])/g, " $1").trim(),
            typeof v === "object" ? JSON.stringify(v) : String(v),
          ]);
          autoTable(doc, {
            startY,
            head: [["Metric", "Value"]],
            body: summaryBody,
            theme: "striped",
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 8 },
            margin: { left: 14, right: 14 },
            tableWidth: "auto",
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          startY = (doc as any).lastAutoTable.finalY + 8;
        }

        // Data table per report type
        if (rtype === "attendance-session" && reportData.dailyAttendance) {
          const body: (string | number)[][] = [];
          for (const day of reportData.dailyAttendance) {
            for (const m of day.members) {
              body.push([
                day.date,
                m.user?.name ?? "",
                m.present ? "Present" : "Absent",
                m.clockIn ? new Date(m.clockIn).toLocaleTimeString() : "—",
                m.clockOut ? new Date(m.clockOut).toLocaleTimeString() : "—",
                m.present ? minsToHMS(m.workMinutes) : "—",
                m.present ? minsToHMS(m.breakMinutes) : "—",
                m.present ? minsToHMS(m.idleMinutes) : "—",
                m.present ? `${m.activePct}%` : "—",
              ]);
            }
          }
          autoTable(doc, {
            startY,
            head: [["Date","Employee","Status","Clock In","Clock Out","Work Time","Break Time","Idle Time","Activity %"]],

            body,
            theme: "striped",
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 7 },
            margin: { left: 14, right: 14 },
          });

        } else if (rtype === "exception-alert" && reportData.exceptions) {
          const body = reportData.exceptions.map((e: any) => [
            e.user?.name ?? "",
            e.startedAt ? new Date(e.startedAt).toLocaleString() : "",
            e.totalMinutes,
            e.activeMinutes,
            e.idleMinutes,
            `${e.activityPercentage}%`,
            (e.alerts as any[]).map((a: any) => a.message).join("; "),
          ]);
          autoTable(doc, {
            startY,
            head: [["Employee","Session Start","Total (min)","Active (min)","Idle (min)","Activity %","Alerts"]],
            body,
            theme: "striped",
            headStyles: { fillColor: [239, 68, 68] },
            styles: { fontSize: 7 },
            margin: { left: 14, right: 14 },
          });

        } else if (rtype === "trend-comparison" && reportData.dailyData) {
          const body = reportData.dailyData.map((d: any) => [
            d.date, d.sessionCount, d.totalActiveHours, d.totalHours, `${d.activityPercentage}%`,
          ]);
          autoTable(doc, {
            startY,
            head: [["Date","Sessions","Active Hrs","Total Hrs","Activity %"]],
            body,
            theme: "striped",
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 8 },
            margin: { left: 14, right: 14 },
          });

        } else if (rtype === "productivity-score" && reportData.scores) {
          const body = reportData.scores.map((u: any) => [
            u.user?.name ?? "",
            u.score,
            u.breakdown?.activityScore ?? "",
            u.breakdown?.productivityScore ?? "",
            u.breakdown?.consistencyScore ?? "",
            u.metrics?.totalActiveHours ?? "",
            `${u.metrics?.activityPercentage ?? 0}%`,
          ]);
          autoTable(doc, {
            startY,
            head: [["Employee","Score","Activity","Productivity","Consistency","Active Hrs","Activity %"]],
            body,
            theme: "striped",
            headStyles: { fillColor: [139, 92, 246] },
            styles: { fontSize: 8 },
            margin: { left: 14, right: 14 },
          });

        } else if (rtype === "app-website-usage") {
          if (reportData.appUsage) {
            const body = reportData.appUsage.map((a: any) => [
              a.user?.name ?? "", a.appName,
              Math.round((a.totalTimeMs ?? a.timeMs ?? 0) / 60000), a.category ?? "",
            ]);
            autoTable(doc, {
              startY,
              head: [["Employee","Application","Time (min)","Category"]],
              body,
              theme: "striped",
              headStyles: { fillColor: [16, 185, 129] },
              styles: { fontSize: 8 },
              margin: { left: 14, right: 14 },
            });
          }

        } else if (rtype === "active-idle-time") {
          const rows = (reportData.users ?? reportData.data ?? []);
          const body = rows.map((u: any) => [
            u.user?.name ?? u.name ?? "",
            Math.round((u.activeMs ?? 0) / 60000),
            Math.round((u.idleMs ?? 0) / 60000),
            `${u.activityPercentage ?? u.activePct ?? 0}%`,
          ]);
          autoTable(doc, {
            startY,
            head: [["Employee","Active (min)","Idle (min)","Activity %"]],
            body,
            theme: "striped",
            headStyles: { fillColor: [245, 158, 11] },
            styles: { fontSize: 8 },
            margin: { left: 14, right: 14 },
          });
        }

        // Footer on each page
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(7);
          doc.setTextColor(150);
          doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 6);
        }

        doc.save(`${filename}.pdf`);
        toast.dismiss(toastId);
        toast.success("PDF report downloaded");
      }
    } catch (err) {
      console.error("Error exporting report:", err);
      toast.dismiss(toastId);
      toast.error("Failed to export report");
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
              {Object.entries(reportData.summary).map(([key, value]) => {
                // Format the display value
                let display: string;
                if (value !== null && typeof value === 'object') {
                  const obj = value as Record<string, any>;
                  if (obj.from && obj.to) {
                    display = `${obj.from} → ${obj.to}`;
                  } else {
                    return null; // skip unrenderable nested objects
                  }
                } else {
                  display = String(value);
                }
                return (
                  <div key={key} className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground capitalize mb-1">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                    <p className={`font-bold ${display.includes('→') ? 'text-sm' : 'text-2xl'}`}>{display}</p>
                  </div>
                );
              })}
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
        reportData.dailyAttendance && reportData.dailyAttendance.length > 0 && (() => {
          // Sort dates newest-first for the sidebar
          const sortedDays = [...reportData.dailyAttendance].sort(
            (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          const activeDate = selectedAttendanceDate || sortedDays[0]?.date;
          const selectedDay = sortedDays.find((d: any) => d.date === activeDate) || sortedDays[0];

          return (
            <div className="grid grid-cols-[220px_1fr] gap-4 items-start">
              {/* Date Sidebar */}
              <Card className="sticky top-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Dates</CardTitle>
                  <CardDescription>{sortedDays.length} day{sortedDays.length !== 1 ? 's' : ''} with activity</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y max-h-[600px] overflow-y-auto">
                    {sortedDays.map((day: any) => {
                      const isActive = day.date === activeDate;
                      const noActivity = day.presentCount === 0;
                      const attendancePct = reportData.summary?.totalMembers
                        ? Math.round((day.presentCount / reportData.summary.totalMembers) * 100)
                        : 0;
                      return (
                        <button
                          key={day.date}
                          onClick={() => setSelectedAttendanceDate(day.date)}
                          className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                            isActive ? 'bg-muted border-l-2 border-primary' : ''
                          } ${noActivity ? 'opacity-50' : ''}`}
                        >
                          <div className="font-medium text-sm">{day.date}</div>
                          <div className="flex gap-2 mt-1.5 flex-wrap">
                            {noActivity ? (
                              <Badge variant="outline" className="text-xs text-muted-foreground">No activity</Badge>
                            ) : (
                              <>
                                <Badge className="bg-green-500 text-white text-xs">{day.presentCount} present</Badge>
                                {day.absentCount > 0 && (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">{day.absentCount} absent</Badge>
                                )}
                              </>
                            )}
                          </div>
                          {/* mini attendance bar */}
                          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${attendancePct}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Day Detail */}
              {selectedDay && (
                <div className="space-y-4">
                  {/* Day summary cards */}
                  <div className="grid grid-cols-4 gap-3">
                    <Card>
                      <CardContent className="pt-4 pb-4">
                        <div className="text-xs text-muted-foreground mb-1">Present</div>
                        <div className="text-3xl font-bold text-green-600">{selectedDay.presentCount}</div>
                        <div className="text-xs text-muted-foreground">of {reportData.summary?.totalMembers} members</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-4">
                        <div className="text-xs text-muted-foreground mb-1">Absent</div>
                        <div className="text-3xl font-bold text-red-500">{selectedDay.absentCount}</div>
                        <div className="text-xs text-muted-foreground">members</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-4">
                        <div className="text-xs text-muted-foreground mb-1">Avg Work</div>
                        <div className="text-3xl font-bold text-blue-500">
                          {(() => {
                            const present = selectedDay.members.filter((m: any) => m.present);
                            if (!present.length) return '—';
                            const avg = present.reduce((s: number, m: any) => s + m.workMinutes, 0) / present.length;
                            return formatMinutes(Math.round(avg));
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground">per person</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-4">
                        <div className="text-xs text-muted-foreground mb-1">Avg Active %</div>
                        <div className="text-3xl font-bold text-purple-500">
                          {(() => {
                            const present = selectedDay.members.filter((m: any) => m.present);
                            if (!present.length) return '—';
                            const avg = present.reduce((s: number, m: any) => s + (m.activePct || 0), 0) / present.length;
                            return `${Math.round(avg)}%`;
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground">of logged time</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Member table */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <CardTitle className="text-base">{selectedDay.date}</CardTitle>
                          <CardDescription>
                            {selectedDay.presentCount} present &bull; {selectedDay.absentCount} absent
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Search */}
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search employee..."
                              value={attendanceSearch}
                              onChange={(e) => setAttendanceSearch(e.target.value)}
                              className="h-8 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                          {/* Status filter pills */}
                          <div className="flex rounded-md border overflow-hidden text-xs">
                            {(['all', 'present', 'absent'] as const).map((f) => (
                              <button
                                key={f}
                                onClick={() => setAttendanceStatusFilter(f)}
                                className={`px-3 py-1.5 capitalize transition-colors ${
                                  attendanceStatusFilter === f
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-background hover:bg-muted'
                                }`}
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {(() => {
                        const filtered = selectedDay.members.filter((m: any) => {
                          const matchesSearch = !attendanceSearch ||
                            m.user.name?.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
                            m.user.email?.toLowerCase().includes(attendanceSearch.toLowerCase());
                          const matchesStatus =
                            attendanceStatusFilter === 'all' ||
                            (attendanceStatusFilter === 'present' && m.present) ||
                            (attendanceStatusFilter === 'absent' && !m.present);
                          return matchesSearch && matchesStatus;
                        });

                        const sorted = attendanceSort ? [...filtered].sort((a: any, b: any) => {
                          const { key, dir } = attendanceSort;
                          const mul = dir === 'asc' ? 1 : -1;
                          if (key === 'name') return mul * (a.user.name || '').localeCompare(b.user.name || '');
                          if (key === 'status') return mul * (Number(b.present) - Number(a.present));
                          if (key === 'clockIn') return mul * (new Date(a.clockIn || 0).getTime() - new Date(b.clockIn || 0).getTime());
                          if (key === 'clockOut') return mul * (new Date(a.clockOut || 0).getTime() - new Date(b.clockOut || 0).getTime());
                          if (key === 'work') return mul * ((a.workMinutes || 0) - (b.workMinutes || 0));
                          if (key === 'break') return mul * ((a.breakMinutes || 0) - (b.breakMinutes || 0));
                          if (key === 'idle') return mul * ((a.idleMinutes || 0) - (b.idleMinutes || 0));
                          if (key === 'activePct') return mul * ((a.activePct || 0) - (b.activePct || 0));
                          return 0;
                        }) : filtered;

                        const toggleSort = (key: string) => {
                          setAttendanceSort(prev =>
                            prev?.key === key
                              ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                              : { key, dir: 'asc' }
                          );
                        };

                        const SortIcon = ({ col }: { col: string }) => {
                          if (attendanceSort?.key !== col) return <ArrowUpDown className="inline ml-1 h-3 w-3 opacity-40" />;
                          return attendanceSort.dir === 'asc'
                            ? <ArrowUp className="inline ml-1 h-3 w-3" />
                            : <ArrowDown className="inline ml-1 h-3 w-3" />;
                        };

                        return (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>Employee <SortIcon col="name" /></TableHead>
                            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>Status <SortIcon col="status" /></TableHead>
                            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('clockIn')}>Clock In <SortIcon col="clockIn" /></TableHead>
                            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('clockOut')}>Clock Out <SortIcon col="clockOut" /></TableHead>
                            <TableHead className="cursor-pointer select-none text-green-600" onClick={() => toggleSort('work')}>Work <SortIcon col="work" /></TableHead>
                            <TableHead className="cursor-pointer select-none text-blue-500" onClick={() => toggleSort('break')}>Break <SortIcon col="break" /></TableHead>
                            <TableHead className="cursor-pointer select-none text-yellow-600" onClick={() => toggleSort('idle')}>Idle <SortIcon col="idle" /></TableHead>
                            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('activePct')}>Active % <SortIcon col="activePct" /></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sorted.map((member: any, idx: number) => (
                            <TableRow
                              key={idx}
                              className={!member.present ? 'opacity-50' : ''}
                            >
                              <TableCell>
                                <div className="font-medium text-sm">{member.user.name}</div>
                                <div className="text-xs text-muted-foreground">{member.user.email}</div>
                              </TableCell>
                              <TableCell>
                                {member.present
                                  ? <Badge className="bg-green-500 text-white">Present</Badge>
                                  : <Badge variant="outline" className="text-red-500 border-red-300">Absent</Badge>}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {member.present ? toLocaleTimeStringTz(member.clockIn, timezone as 'IST' | 'EST') : '—'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {member.present
                                  ? member.clockOut
                                    ? toLocaleTimeStringTz(member.clockOut, timezone as 'IST' | 'EST')
                                    : <Badge className="bg-amber-500 text-white text-xs">Still In</Badge>
                                  : '—'}
                              </TableCell>
                              <TableCell className="text-green-600 font-medium">
                                {member.present ? formatMinutes(member.workMinutes) : '—'}
                              </TableCell>
                              <TableCell className="text-blue-500">
                                {member.present ? formatMinutes(member.breakMinutes) : '—'}
                              </TableCell>
                              <TableCell className="text-yellow-600">
                                {member.present ? formatMinutes(member.idleMinutes) : '—'}
                              </TableCell>
                              <TableCell>
                                {member.present ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          member.activePct >= 70 ? 'bg-green-500'
                                          : member.activePct >= 40 ? 'bg-yellow-500'
                                          : 'bg-red-500'
                                        }`}
                                        style={{ width: `${member.activePct}%` }}
                                      />
                                    </div>
                                    <span className={`text-sm font-medium ${
                                      member.activePct >= 70 ? 'text-green-600'
                                      : member.activePct >= 40 ? 'text-yellow-600'
                                      : 'text-red-500'
                                    }`}>{member.activePct}%</span>
                                  </div>
                                ) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                          {sorted.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                No employees match your search
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
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
