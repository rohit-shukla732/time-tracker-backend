"use client";

import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { format, getDaysInMonth, startOfMonth, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toast } from "sonner";
import { Loader2, Save, Search, ArrowUpDown, Download } from "lucide-react";
import { utils, writeFile } from "xlsx";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "PRESENT":
      return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
    case "LATE":
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400";
    case "APPROVED_LEAVE":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
    case "UNAPPROVED_LEAVE":
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400";
    case "APPROVED_HALF_LEAVE":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400";
    case "UNAPPROVED_HALF_LEAVE":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400";
    case "APPROVED_LEAVE_WITHOUT_PAY":
      return "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400";
    case "UNAPPROVED_LEAVE_WITHOUT_PAY":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400";
    case "APPROVED_HALF_LEAVE_WITHOUT_PAY":
      return "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-400";
    case "UNAPPROVED_HALF_LEAVE_WITHOUT_PAY":
      return "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400";
    case "WEEKEND":
      return "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
    case "HOLIDAY":
      return "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400";
    case "DOUBLE_PAY":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300";
    case "LEFT":
      return "bg-red-600 text-white dark:bg-red-700";
    case "EMPTY":
      return "bg-transparent text-transparent";
    default:
      return "bg-transparent text-transparent";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "PRESENT":
      return "P";
    case "LATE":
      return "L";
    case "APPROVED_LEAVE":
      return "AL";
    case "UNAPPROVED_LEAVE":
      return "UL";
    case "APPROVED_HALF_LEAVE":
      return "AHL";
    case "UNAPPROVED_HALF_LEAVE":
      return "UHL";
    case "APPROVED_LEAVE_WITHOUT_PAY":
      return "ALWP";
    case "UNAPPROVED_LEAVE_WITHOUT_PAY":
      return "ULWP";
    case "APPROVED_HALF_LEAVE_WITHOUT_PAY":
      return "AHLWP";
    case "UNAPPROVED_HALF_LEAVE_WITHOUT_PAY":
      return "UHLWP";
    case "WEEKEND":
      return "W";
    case "HOLIDAY":
      return "H";
    case "DOUBLE_PAY":
      return "2X";
    case "LEFT":
      return "LFT";
    case "EMPTY":
      return "";
    default:
      return "";
  }
};

export default function AttendancePage() {
  // pagination removed — show all employees
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });

  // Record structure: { "userId_dateString": "STATUS" }
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>(
    {},
  );
  const [attendanceRemarks, setAttendanceRemarks] = useState<Record<string, string>>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});

  const daysInMonth = useMemo(() => getDaysInMonth(currentDate), [currentDate]);
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const daysArray = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i)),
    [daysInMonth, monthStart],
  );

  const years = useMemo(
    () => Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i),
    [currentDate],
  );

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // formatDate is defined above to avoid recreating it every render

  const fetchAttendance = async () => {
    setIsLoading(true);
    setPendingChanges({});

    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      const res = await fetch(
        `/api/hr/attendance?month=${month}&year=${year}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Failed to fetch attendance");

      const rawMap: Record<string, string> = {};
      const remarkMap: Record<string, string> = {};

      json.data.forEach((emp: any) => {
        emp.attendanceRecords?.forEach((record: any) => {
          const dateKey = formatDate(new Date(record.date));
          rawMap[`${emp.id}_${dateKey}`] = record.status;
          if (record.remarks) remarkMap[`${emp.id}_${dateKey}`] = record.remarks;
        });
      });

      setAttendanceData(rawMap);
      setAttendanceRemarks(remarkMap);
      setEmployees(json.data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [currentDate.getMonth(), currentDate.getFullYear()]);

  const getLateWeightForKey = useCallback(
    (key: string) => {
      const pending = pendingChanges[key];
      const remark = pending?.remarks || attendanceRemarks[key];
      if (!remark) return 1;
      const m = remark.match(/lateWeight\s*=\s*(\d+)/i);
      if (m) return parseInt(m[1], 10) || 1;
      const n = parseInt(remark, 10);
      return isNaN(n) ? 1 : n;
    },
    [pendingChanges, attendanceRemarks],
  );

  const handleSetStatus = useCallback((userId: string, date: Date, nextStatus: string, weight?: number) => {
    // if (date > today) return; Disallow edits in the future

    const dateKey = formatDate(date);
    const key = `${userId}_${dateKey}`;

    let finalStatus = nextStatus;
    if (nextStatus === "LATE") {
      let currentLates = 0;
      daysArray.forEach((d) => {
        if (d.getTime() !== date.getTime()) {
          const k = `${userId}_${formatDate(d)}`;
          const s = pendingChanges[k]
            ? pendingChanges[k].status
            : attendanceData[k];
          if (s === "LATE") {
            currentLates += getLateWeightForKey(k);
          }
        }
      });

      // include the new weight about to be added
      const newWeight = weight && weight > 0 ? weight : 1;
      const projected = currentLates + newWeight;

      if (projected > 3) {
        finalStatus = "UNAPPROVED_HALF_LEAVE_WITHOUT_PAY";
        toast.error(
          "Late coming exceeded 3 counts. Marked as UHLWP automatically.",
        );
      }
    }

    if (nextStatus === "LEFT") {
      // mark this date and lock all future dates for this user as LEFT
      const newPending = { ...pendingChanges };
      const dateKey = formatDate(date);
      // set the selected date
      newPending[`${userId}_${dateKey}`] = { userId, date: dateKey, status: "LEFT" };
      // set all days after this date as LEFT
      daysArray.forEach((d) => {
        if (d.getTime() > date.getTime()) {
          const k = `${userId}_${formatDate(d)}`;
          newPending[k] = { userId, date: formatDate(d), status: "LEFT" };
        }
      });
      setPendingChanges(newPending);
      return;
    }

    if (attendanceData[key] === finalStatus) {
      // Reverting to original
      const newPending = { ...pendingChanges };
      delete newPending[key];
      setPendingChanges(newPending);
    } else {
      // preserve late weight remark when converting to UHLWP so counts include it
      const remarks = (nextStatus === "LATE" && weight && weight > 1) ? `lateWeight=${weight}` : undefined;
      const finalRemarks = finalStatus === "UNAPPROVED_HALF_LEAVE_WITHOUT_PAY" && !remarks
        ? `lateWeight=${weight && weight > 0 ? weight : 1}`
        : remarks;
      setPendingChanges({
        ...pendingChanges,
        [key]: { userId, date: dateKey, status: finalStatus, remarks: finalRemarks },
      });
    }
  }, [pendingChanges, attendanceData, daysArray, getLateWeightForKey]);

  const handleSetColumnStatus = useCallback((date: Date, nextStatus: string, weight?: number) => {
    // allow future edits: do not early-return for future dates

    const dateKey = formatDate(date);
    const newPending = { ...pendingChanges };

    filteredEmployees.forEach((emp) => {
      const key = `${emp.id}_${dateKey}`;

      let finalStatus = nextStatus;
      if (nextStatus === "LATE") {
        let currentLates = 0;
        daysArray.forEach((d) => {
          if (d.getTime() !== date.getTime()) {
            const k = `${emp.id}_${formatDate(d)}`;
            const s = newPending[k] ? newPending[k].status : attendanceData[k];
            if (s === "LATE") {
              currentLates += getLateWeightForKey(k);
            }
          }
        });

        const newWeight = weight && weight > 0 ? weight : 1;
        if (currentLates + newWeight >= 3) {
          finalStatus = "UNAPPROVED_HALF_LEAVE_WITHOUT_PAY";
        }
      }

      if (attendanceData[key] === finalStatus) {
        delete newPending[key];
      } else {
        if (nextStatus === "LEFT") {
          // set this date and all future dates for this emp to LEFT
          newPending[key] = { userId: emp.id, date: dateKey, status: "LEFT" };
          daysArray.forEach((d) => {
            if (d.getTime() > date.getTime()) {
              const k2 = `${emp.id}_${formatDate(d)}`;
              newPending[k2] = { userId: emp.id, date: formatDate(d), status: "LEFT" };
            }
          });
        } else {
          const remarks = (nextStatus === "LATE" && weight && weight > 1) ? `lateWeight=${weight}` : undefined;
          const finalRemarks = finalStatus === "UNAPPROVED_HALF_LEAVE_WITHOUT_PAY" && !remarks
            ? `lateWeight=${weight && weight > 0 ? weight : 1}`
            : remarks;
          newPending[key] = {
            userId: emp.id,
            date: dateKey,
            status: finalStatus,
            remarks: finalRemarks,
          };
        }
      }
    });

    setPendingChanges(newPending);
    if (nextStatus === "LATE") {
      toast.success(`Mass update complete. Exceeded lates resolved to UHLWP.`);
    } else {
      toast.success(
        `Marked all as ${getStatusLabel(nextStatus) || nextStatus}`,
      );
    }
  }, [pendingChanges, attendanceData, daysArray, getLateWeightForKey]);

  // moved to top-level to avoid recreating on each render

  const getLeftDateForEmployee = (empId: string): Date | null => {
    // This function can be expensive when called per-cell. Prefer using
    // precomputed leftDateMap via `leftDateByEmp` (see useMemo below).
    const dates: string[] = [];
    Object.entries(attendanceData).forEach(([k, v]) => {
      if (k.startsWith(`${empId}_`) && v === "LEFT") dates.push(k.split("_")[1]);
    });
    Object.entries(pendingChanges).forEach(([k, v]) => {
      if (k.startsWith(`${empId}_`) && v.status === "LEFT") dates.push(k.split("_")[1]);
    });
    if (dates.length === 0) return null;
    const earliest = dates.sort()[0];
    return new Date(earliest);
  };

  const handleSave = async () => {
    const updates = Object.values(pendingChanges);
    if (updates.length === 0) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/hr/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({ updates }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");

      toast.success("Attendance saved successfully");
      const newData = { ...attendanceData };
      updates.forEach((update: any) => {
        newData[`${update.userId}_${update.date}`] = update.status;
      });
      setAttendanceData(newData);
      setPendingChanges({});
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearColumn = (date: Date) => {
    // allow future edits: do not early-return for future dates
    const dateKey = formatDate(date);
    const newPending = { ...pendingChanges };

    filteredEmployees.forEach((emp) => {
      const key = `${emp.id}_${dateKey}`;
      // mark for deletion
      newPending[key] = { userId: emp.id, date: dateKey, status: "EMPTY" };
    });

    setPendingChanges(newPending);
    toast.success("Column cleared (pending). Save to apply changes.");
  };

  const handleClearCell = (userId: string, date: Date) => {
    const dateKey = formatDate(date);
    const key = `${userId}_${dateKey}`;
    const newPending = { ...pendingChanges };

    // If a pending EMPTY already exists, revert it (undo clear)
    if (newPending[key] && newPending[key].status === "EMPTY") {
      delete newPending[key];
      setPendingChanges(newPending);
      toast.success("Cleared pending change reverted.");
      return;
    }

    // If there's any existing mark (either persisted or pending), mark it for clear
    if (attendanceData[key] || newPending[key]) {
      newPending[key] = { userId, date: dateKey, status: "EMPTY" };
      setPendingChanges(newPending);
      toast.success("Cell cleared (pending). Save to apply changes.");
    }
  };

  // Derived filter logic (memoized)
  const uniqueDepartments = useMemo(
    () =>
      Array.from(
        new Set(
          employees.map((e) => e.employmentInfo?.department?.name).filter(Boolean),
        ),
      ).sort() as string[],
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const res = employees
      .filter((emp) => {
        const matchesSearch =
          emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (emp.id && emp.id.toLowerCase().includes(searchQuery.toLowerCase()));
        const dept = emp.employmentInfo?.department?.name;
        const matchesDept = departmentFilter === "ALL" || dept === departmentFilter;
        return matchesSearch && matchesDept;
      })
      .sort((a, b) => {
        let aVal = a.name;
        let bVal = b.name;
        if (sortConfig.key === "id") {
          aVal = a.id || "";
          bVal = b.id || "";
        }
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    return res;
  }, [employees, searchQuery, departmentFilter, sortConfig]);

  // Precompute per-employee statuses and left dates to avoid repeated scans
  const { statusByEmp, leftDateByEmp, lateCountByEmp } = useMemo(() => {
    const statusByEmp: Record<string, Record<string, string>> = {};
    const leftDateByEmp: Record<string, Date | null> = {};
    const lateCountByEmp: Record<string, number> = {};

    filteredEmployees.forEach((emp) => {
      const row: Record<string, string> = {};
      let leftDates: string[] = [];
      let lateCount = 0;
      daysArray.forEach((d) => {
        const k = formatDate(d);
        const key = `${emp.id}_${k}`;
        const stat = pendingChanges[key]?.status ?? attendanceData[key] ?? "EMPTY";
        row[key] = stat;
        if (stat === "LEFT") leftDates.push(k);
        if (stat === "LATE" || stat === "UNAPPROVED_HALF_LEAVE_WITHOUT_PAY") {
          lateCount += (pendingChanges[key]?.remarks || attendanceRemarks[key]) ? (parseInt(((pendingChanges[key]?.remarks || attendanceRemarks[key]).match(/\\d+/) || ["1"])[0], 10) || 1) : 1;
        }
      });
      statusByEmp[emp.id] = row;
      leftDateByEmp[emp.id] = leftDates.length ? new Date(leftDates.sort()[0]) : null;
      lateCountByEmp[emp.id] = lateCount;
    });

    return { statusByEmp, leftDateByEmp, lateCountByEmp };
  }, [filteredEmployees, daysArray, pendingChanges, attendanceData, attendanceRemarks]);
  // pagination removed — showing all employees


  return (
    <div className="space-y-6">
      <div className="sticky top-0 left-0 right-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm border-b border-black/5 dark:border-white/5">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 p-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Attendance Register
            </h1>
            <p className="text-sm text-muted-foreground">
              Right-click empty cells or marks to open the context menu. Future
              dates are disabled.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* SEARCH & FILTERS */}
            <div className="relative w-full sm:w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                {uniqueDepartments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* DATE SELECTORS  */}
            <Select
              value={currentDate.getMonth().toString()}
              onValueChange={(v) => {
                const d = new Date(currentDate);
                d.setMonth(parseInt(v));
                setCurrentDate(d);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m, i) => (
                  <SelectItem key={m} value={i.toString()}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentDate.getFullYear().toString()}
              onValueChange={(v) => {
                const d = new Date(currentDate);
                d.setFullYear(parseInt(v));
                setCurrentDate(d);
              }}
            >
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              disabled={Object.keys(pendingChanges).length === 0 || isSaving}
              onClick={handleSave}
              className="w-full sm:w-auto xl:ml-4"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes ({Object.keys(pendingChanges).length})
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // build export
                const exportData = filteredEmployees.map((emp) => {
                  const base: any = {
                    "Employee ID": emp.id,
                    Name: emp.name,
                    Department: emp.employmentInfo?.department?.name || "",
                  };

                  // compute late count (only count explicit LATE statuses)
                  const lateCount = daysArray.reduce((acc, d) => {
                    const k = formatDate(d);
                    const key = `${emp.id}_${k}`;
                    const stat = pendingChanges[key] ? pendingChanges[key].status : attendanceData[key];
                    if (stat === "LATE" || stat === "UNAPPROVED_HALF_LEAVE_WITHOUT_PAY") {
                      return acc + getLateWeightForKey(key);
                    }
                    return acc;
                  }, 0);

                  base["Lates"] = lateCount;

                  daysArray.forEach((d) => {
                    const k = formatDate(d);
                    const key = `${emp.id}_${k}`;
                    const stat = pendingChanges[key] ? pendingChanges[key].status : attendanceData[key];
                    base[format(d, "yyyy-MM-dd")] = stat ? getStatusLabel(stat) : "";
                  });

                  return base;
                });

                const worksheet = utils.json_to_sheet(exportData);
                const workbook = utils.book_new();
                utils.book_append_sheet(workbook, worksheet, "Attendance");
                writeFile(workbook, `Attendance_${months[currentDate.getMonth()]}_${currentDate.getFullYear()}.xlsx`);
              }}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" /> Export Excel
            </Button>

          </div>
        </div>


        {/* pagination removed */}
        <div className="w-full border rounded-md text-[12px] border-collapse">
          <div className="sticky top-[72px] left-0 right-0 z-30 bg-white dark:bg-gray-950 shadow-sm border-b">
            <div>
              <Table className="w-full border-collapse table-fixed">
                <TableHeader className="">
                  <TableRow>
                    <TableHead
                      className="sticky left-0 bg-white dark:bg-zinc-950 w-[100px] border-r shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)] cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors z-[30]"
                      onClick={() =>
                        setSortConfig({
                          key: "id",
                          direction:
                            sortConfig.key === "id" &&
                              sortConfig.direction === "asc"
                              ? "desc"
                              : "asc",
                        })
                      }
                    >
                      <div className="pl-2 flex items-center gap-1">
                        Emp Code{" "}
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground ml-1" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="sticky left-[100px] bg-white dark:bg-zinc-950 w-[140px] border-r shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)] cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors z-[30]"
                      onClick={() =>
                        setSortConfig({
                          key: "name",
                          direction:
                            sortConfig.key === "name" &&
                              sortConfig.direction === "asc"
                              ? "desc"
                              : "asc",
                        })
                      }
                    >
                      <div className="pl-2 flex items-center gap-1">
                        Name{" "}
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground ml-1" />
                      </div>
                    </TableHead>
                    <TableHead className="sticky left-[240px] bg-white dark:bg-zinc-950 w-[48px] border-r shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)] z-[30]">
                      <div className="text-center font-medium pl-1 text-[11px] text-muted-foreground">
                        Lates
                      </div>
                    </TableHead>
                    {daysArray.map((day) => {
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      const isFuture = day.getTime() > today.getTime();
                      return (
                        <TableHead
                          key={day.toISOString()}
                          className={`text-center w-7 min-w-[28px] p-0 border-r last:border-r-0 ${isWeekend
                              ? "bg-red-50/50 dark:bg-red-950/20 text-red-500"
                              : ""
                            }`}
                        >
                          <ContextMenu>
                            <ContextMenuTrigger
                              className={`w-full h-full min-h-[34px] flex flex-col items-center py-1 ${isFuture ? "opacity-60" : "cursor-context-menu hover:bg-black/5 dark:hover:bg-white/5 transition-colors"}`}
                            >
                              <div className="text-[8px] font-normal leading-tight opacity-70">
                                {format(day, "EEE")}
                              </div>
                              <div className="font-medium text-[11px]">{format(day, "d")}</div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-56 text-[13px]">
                              <ContextMenuLabel>Mass Mark Date</ContextMenuLabel>
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                onClick={() =>
                                  handleSetColumnStatus(day, "PRESENT")
                                }
                              >
                                Present (P)
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() => handleSetColumnStatus(day, "LATE")}
                              >
                                Late (L)
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() => {
                                  const v = prompt("Enter late weight (integer, e.g. 2)", "1");
                                  if (!v) return;
                                  const n = parseInt(v, 10);
                                  if (isNaN(n) || n <= 0) {
                                    toast.error("Invalid number");
                                    return;
                                  }
                                  handleSetColumnStatus(day, "LATE", n);
                                }}
                              >
                                Late (weighted...)
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  handleSetColumnStatus(day, "APPROVED_LEAVE")
                                }
                              >
                                Approved Leave (AL)
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  handleSetColumnStatus(day, "UNAPPROVED_LEAVE")
                                }
                              >
                                Unapproved Leave (UL)
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  handleSetColumnStatus(
                                    day,
                                    "APPROVED_HALF_LEAVE",
                                  )
                                }
                              >
                                Approved Half Leave (AHL)
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  handleSetColumnStatus(
                                    day,
                                    "UNAPPROVED_HALF_LEAVE",
                                  )
                                }
                              >
                                Unapproved Half Leave (UHL)
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  handleSetColumnStatus(
                                    day,
                                    "APPROVED_LEAVE_WITHOUT_PAY",
                                  )
                                }
                              >
                                App. Leave Without Pay (ALWP)
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  handleSetColumnStatus(
                                    day,
                                    "UNAPPROVED_LEAVE_WITHOUT_PAY",
                                  )
                                }
                              >
                                Unapp. Leave Without Pay (ULWP)
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  handleSetColumnStatus(
                                    day,
                                    "APPROVED_HALF_LEAVE_WITHOUT_PAY",
                                  )
                                }
                              >
                                App. Half Leave Without Pay (AHLWP)
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  handleSetColumnStatus(
                                    day,
                                    "UNAPPROVED_HALF_LEAVE_WITHOUT_PAY",
                                  )
                                }
                              >
                                Unapp. Half Leave Without Pay (UHLWP)
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => handleClearColumn(day)}>
                                Clear Column
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => handleSetColumnStatus(day, "WEEKEND")}>
                                Mark Weekend (W)
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                onClick={() =>
                                  handleSetColumnStatus(day, "HOLIDAY")
                                }
                              >
                                Holiday (H)
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() =>
                                  handleSetColumnStatus(day, "DOUBLE_PAY")
                                }
                              >
                                Double Pay (2X)
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
              </Table>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div>
              <Table className="w-full border-collapse table-fixed">
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={daysInMonth + 2}
                        className="h-48 text-center"
                      >
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          <p>Loading attendance ledger...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={daysInMonth + 2}
                        className="h-48 text-center text-muted-foreground"
                      >
                        No employees found matching filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <TableRow key={emp.id} className="hover:bg-transparent">
                        <TableCell className="sticky left-0 bg-white dark:bg-zinc-950 border-r border-b p-0 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)] z-[10] w-[100px]">
                          <div className="truncate font-medium text-xs px-2 py-1.5 h-full flex flex-col justify-center text-muted-foreground">
                            {emp.id || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="sticky left-[100px] bg-white dark:bg-zinc-950 border-r border-b p-0 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)] z-[10] w-[140px]">
                          <div className="truncate font-medium px-2 py-1.5 h-full flex flex-col justify-center text-foreground">
                            <div className="truncate">{emp.name}</div>
                            <div className="text-[10px] text-muted-foreground font-normal truncate">
                              {emp.employmentInfo?.department?.name || "No Dept"}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="sticky left-[240px] bg-white dark:bg-zinc-950 border-r border-b p-0 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)] z-[10] w-[48px]">
                          <div className="flex items-center justify-center h-full min-h-[36px] text-[11px] font-semibold text-muted-foreground w-full">
                            {(() => {
                              const currLates = lateCountByEmp[emp.id] ?? 0;
                              return <span className={currLates >= 3 ? "text-red-500 font-bold" : ""}>{currLates}/3</span>;
                            })()}
                          </div>
                        </TableCell>

                          {daysArray.map((day) => {
                            const dateKey = formatDate(day);
                            const key = `${emp.id}_${dateKey}`;

                            const isFuture = day.getTime() > today.getTime();
                            const leftDate = leftDateByEmp[emp.id];
                            const isLocked = leftDate ? day.getTime() > leftDate.getTime() : false;
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                            const currentStatus = statusByEmp[emp.id]?.[key] ?? "EMPTY";

                            const content = (
                              <div
                                className={`
                              w-[28px] h-[28px] mx-auto flex items-center justify-center font-bold text-[10px] rounded-md transition-all duration-150
                              ${getStatusColor(currentStatus)}
                              ${pendingChanges[key] ? "ring-[1px] ring-blue-500 ring-offset-1 dark:ring-offset-zinc-900 shadow-sm" : ""}
                              ${isLocked ? "opacity-95" : ""}
                            `}
                              >
                                {getStatusLabel(currentStatus)}
                              </div>
                            );

                            return (
                              <TableCell
                                key={day.toISOString()}
                                className="w-7 min-w-[28px] p-1 border-r border-b last:border-r-0 text-center transition-colors select-none group relative"
                              >
                                <ContextMenu>
                                  <ContextMenuTrigger
                                    className={`w-full h-full min-h-[34px] flex items-center justify-center ${isFuture ? "opacity-50" : ""} ${isLocked ? "pointer-events-none" : "cursor-context-menu"}`}
                                    onClick={() => {
                                      if (!isLocked) handleClearCell(emp.id, day);
                                    }}
                                  >
                                    {content}
                                  </ContextMenuTrigger>
                                  <ContextMenuContent className="w-56 text-[13px]">
                                    <ContextMenuLabel>
                                      Mark Attendance
                                    </ContextMenuLabel>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem
                                      onClick={() =>
                                        handleSetStatus(emp.id, day, "PRESENT")
                                      }
                                    >
                                      Present (P)
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      onClick={() =>
                                        handleSetStatus(emp.id, day, "LATE")
                                      }
                                    >
                                      Late (L)
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      onClick={() =>
                                        handleSetStatus(emp.id, day, "LEFT")
                                      }
                                    >
                                      Left (Left Company)
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      onClick={() => {
                                        const v = prompt("Enter late weight (integer, e.g. 2)", "1");
                                        if (!v) return;
                                        const n = parseInt(v, 10);
                                        if (isNaN(n) || n <= 0) {
                                          toast.error("Invalid number");
                                          return;
                                        }
                                        handleSetStatus(emp.id, day, "LATE", n);
                                      }}
                                    >
                                      Late (weighted...)
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      onClick={() =>
                                        handleSetStatus(emp.id, day, "APPROVED_LEAVE")
                                      }
                                    >
                                      Approved Leave (AL)
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      onClick={() =>
                                        handleSetStatus(
                                          emp.id,
                                          day,
                                          "UNAPPROVED_LEAVE",
                                        )
                                      }
                                    >
                                      Unapproved Leave (UL)
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      onClick={() =>
                                        handleSetStatus(
                                          emp.id,
                                          day,
                                          "APPROVED_HALF_LEAVE",
                                        )
                                      }
                                    >
                                      Approved Half Leave (AHL)
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      onClick={() =>
                                        handleSetStatus(
                                          emp.id,
                                          day,
                                          "UNAPPROVED_HALF_LEAVE",
                                        )
                                      }
                                    >
                                      Unapproved Half Leave (UHL)
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      onClick={() =>
                                        handleSetStatus(
                                          emp.id,
                                          day,
                                          "APPROVED_LEAVE_WITHOUT_PAY",
                                        )
                                      }
                                    >
                                      App. Leave Without Pay (ALWP)
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      onClick={() =>
                                        handleSetStatus(
                                          emp.id,
                                          day,
                                          "UNAPPROVED_LEAVE_WITHOUT_PAY",
                                        )
                                      }
                                    >
                                      Unapp. Leave Without Pay (ULWP)
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      onClick={() =>
                                        handleSetStatus(
                                          emp.id,
                                          day,
                                          "APPROVED_HALF_LEAVE_WITHOUT_PAY",
                                        )
                                      }
                                    >
                                      App. Half Leave Without Pay (AHLWP)
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      onClick={() =>
                                        handleSetStatus(
                                          emp.id,
                                          day,
                                          "UNAPPROVED_HALF_LEAVE_WITHOUT_PAY",
                                        )
                                      }
                                    >
                                      Unapp. Half Leave Without Pay (UHLWP)
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem
                                      onClick={() =>
                                        handleSetStatus(emp.id, day, "HOLIDAY")
                                      }
                                    >
                                      Holiday (H)
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                      onClick={() =>
                                        handleSetStatus(emp.id, day, "DOUBLE_PAY")
                                      }
                                    >
                                      Double Pay (2X)
                                    </ContextMenuItem>
                                  </ContextMenuContent>
                                </ContextMenu>
                              </TableCell>
                            );
                          })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
