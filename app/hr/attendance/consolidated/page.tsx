"use client";
import { useEffect, useState, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, ArrowUpDown } from "lucide-react";

import { toast } from "sonner";
import { utils, writeFile } from "xlsx";

export default function ConsolidatedAttendancePage() {
  const [data, setData] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const currentDate = new Date();
  const [month, setMonth] = useState((currentDate.getMonth() + 1).toString());
  const [year, setYear] = useState(currentDate.getFullYear().toString());
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => (currentDate.getFullYear() - 2 + i).toString());

  const fetchConsolidatedData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/hr/attendance/consolidated?month=${month}&year=${year}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch data");
      setData(json.data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsolidatedData();
  }, [month, year]);

  const handleExport = () => {
    if (!data.length) {
      toast.error("No data to export");
      return;
    }

    const exportData = data.map(record => ({
      "Employee ID": record.employeeId,
      "Name": record.name,
      "Department": record.department,
      "Total Month Days": record.totalDaysInMonth,
      "Total Leave Bank": record.totalLeaveBank,
      "Used From Bank": record.payableLeaves,
      "Excess Leaves (LWP)": record.excessLeaves || 0,
      "Present": record.present,
      "App. Leave": record.approvedLeave,
      "Unapp. Leave": record.unapprovedLeave,
      "App. Half Leave": record.approvedHalfLeave,
      "Unapp. Half Leave": record.unapprovedHalfLeave,
      "App. LWP": record.approvedLeaveWithoutPay,
      "Unapp. LWP": record.unapprovedLeaveWithoutPay,
      "App. Half LWP": record.approvedHalfLeaveWithoutPay,
      "Unapp. Half LWP": record.unapprovedHalfLeaveWithoutPay,
      "Total Leaves": record.totalLeaves,
      "Holiday": record.holiday,
      "Weekend": record.weekend,
      "Payable Days": record.payableDays
    }));

    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Consolidated_Attendance");
    writeFile(workbook, `Consolidated_Attendance_${months.find(m => m.value === month)?.label}_${year}.xlsx`);
  };

  const handleLockLeaves = async () => {
    if (!confirm(`Lock leaves for ${months.find(m => m.value === month)?.label} ${year}? This will consume current-month accrual.`)) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/hr/attendance/consolidated?month=${month}&year=${year}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to lock leaves");
      toast.success(json.message || "Leaves locked");
      fetchConsolidatedData();
    } catch (err: any) {
      toast.error(err.message || "Error locking leaves");
    } finally {
      setIsLoading(false);
    }
  };



  const tableWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = tableWrapperRef.current;
    if (!wrapper) return;
    const table = wrapper.querySelector("table");
    if (!table) return;
    const thead = table.querySelector("thead");
    if (!thead) return;

    // Create cloned header for sticky fallback
    const clone = thead.cloneNode(true) as HTMLElement;
    clone.style.position = "fixed";
    clone.style.top = "72px"; // matches other sticky toolbar offset
    clone.style.left = "0px";
    clone.style.visibility = "hidden";
    clone.style.pointerEvents = "none";
    clone.style.zIndex = "9999";
    document.body.appendChild(clone);

    const origThs = Array.from(thead.querySelectorAll("th"));
    const cloneThs = Array.from(clone.querySelectorAll("th"));

    function syncWidths() {
      const rect = table!.getBoundingClientRect();
      clone.style.left = `${rect.left}px`;
      clone.style.width = `${rect.width}px`;
      origThs.forEach((th, i) => {
        const w = th.getBoundingClientRect().width;
        if (cloneThs[i] instanceof HTMLElement) cloneThs[i].style.width = `${w}px`;
      });
    }

    function onScroll() {
      const rect = table!.getBoundingClientRect();
      const topOffset = 72; // same as clone.style.top
      if (rect.top < topOffset && rect.bottom > topOffset + 10) {
        syncWidths();
        clone.style.visibility = "visible";
      } else {
        clone.style.visibility = "hidden";
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", syncWidths);
    // initial sync
    syncWidths();
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", syncWidths);
      if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
    };
  }, [data]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consolidated Attendance</h1>
          <p className="text-muted-foreground mt-1">
            Monthly attendance summary for salary calculation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExport} disabled={isLoading || data.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="secondary" onClick={handleLockLeaves} disabled={isLoading || data.length === 0}>
            Lock Leaves
          </Button>
        </div>
      </div>


      <div ref={tableWrapperRef}>
        <Table className="w-full table-fixed text-[11px] border-collapse" containerClassName="w-full border rounded-md">
        <TableHeader className="sticky top-0 bg-white dark:bg-gray-950 z-20 shadow-sm border-b text-xs">
          <TableRow>
                <TableHead 
                  className="sticky top-0 left-0 bg-white dark:bg-gray-950 z-[30] font-semibold w-[70px] cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs leading-tight"
              onClick={() => setSortConfig({ key: "employeeId", direction: sortConfig.key === "employeeId" && sortConfig.direction === "asc" ? "desc" : "asc" })}
            >
              <div className="flex items-center gap-1 whitespace-nowrap">Emp# <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground" /></div>
            </TableHead>
                <TableHead 
                  className="sticky top-0 left-[70px] bg-white dark:bg-gray-950 z-[30] font-semibold w-[140px] cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs leading-tight"
              onClick={() => setSortConfig({ key: "name", direction: sortConfig.key === "name" && sortConfig.direction === "asc" ? "desc" : "asc" })}
            >
              <div className="flex items-center gap-1 whitespace-nowrap">Name <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground" /></div>
            </TableHead>
            <TableHead className="font-semibold text-center w-[84px] border-r z-[30] top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b text-xs leading-tight">Dept</TableHead>
            <TableHead className="font-semibold text-center text-teal-600 dark:text-teal-500 w-[80px] top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b text-xs leading-tight">Total LB</TableHead>
            <TableHead className="font-semibold text-center text-emerald-700 dark:text-emerald-500 w-[72px] top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b text-xs leading-tight">Used</TableHead>
            <TableHead className="font-semibold text-center text-red-600 dark:text-red-400 w-[72px] top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b text-xs leading-tight">Excess</TableHead>
            <TableHead className="font-semibold text-center text-green-600 dark:text-green-500 w-[56px] top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b text-xs leading-tight">Pres</TableHead>
            <TableHead className="font-semibold text-center text-blue-600 dark:text-blue-500 w-[64px] top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b text-xs leading-tight">AL</TableHead>
            <TableHead className="font-semibold text-center text-indigo-600 dark:text-indigo-500 w-[64px] top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b text-xs leading-tight">UL</TableHead>
            <TableHead className="font-semibold text-center text-teal-600 dark:text-teal-500 w-[56px] top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b text-xs leading-tight">AHL</TableHead>
            <TableHead className="font-semibold text-center text-pink-600 dark:text-pink-500 w-[56px] top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b text-xs leading-tight">UHL</TableHead>
            <TableHead className="font-semibold text-center text-cyan-600 dark:text-cyan-500 w-[64px] top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b text-xs leading-tight">ALWP</TableHead>
            <TableHead className="font-semibold text-center text-gray-500 w-[64px] top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b text-xs leading-tight">ULWP</TableHead>
            <TableHead className="font-semibold text-center text-cyan-600 dark:text-cyan-500 w-[64px] top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b text-xs leading-tight">AHLWP</TableHead>
            <TableHead className="font-semibold text-center text-gray-500 w-[64px] top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b text-xs leading-tight">UHLWP</TableHead>
            <TableHead className="font-semibold text-center text-purple-600 dark:text-purple-500 w-[56px] top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b text-xs leading-tight">H</TableHead>
            <TableHead className="font-semibold text-center text-emerald-600 dark:text-emerald-500 w-[56px] top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b text-xs leading-tight">2x</TableHead>
            <TableHead className="font-semibold text-center text-zinc-500 dark:text-zinc-400 w-[56px] top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b text-xs leading-tight">W</TableHead>
            <TableHead className="font-bold text-center border-r bg-zinc-100/50 dark:bg-zinc-800/50 sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b border-t w-[84px] text-xs">Payable</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={16} className="h-48 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  Building summary...
                </div>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={16} className="h-48 text-center text-muted-foreground">
                No active employees found.
              </TableCell>
            </TableRow>
          ) : (
            [...data].sort((a, b) => {
              const aVal = a[sortConfig.key] || "";
              const bVal = b[sortConfig.key] || "";
              if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
              if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
              return 0;
            }).map((row) => (
              <TableRow key={row.userId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <TableCell className="sticky top-0 left-0 bg-white dark:bg-gray-950 z-[20] font-medium text-xs text-muted-foreground border-r px-2 py-1 w-[70px] truncate">{row.employeeId || "N/A"}</TableCell>
                    <TableCell className="sticky top-0 left-[70px] bg-white dark:bg-gray-950 z-[20] font-medium text-foreground border-r px-2 py-1 w-[140px] truncate">{row.name}</TableCell>
                <TableCell className="text-center text-xs border-r px-2 py-1 w-[84px] truncate">{row.department}</TableCell>
                <TableCell className="text-center font-medium text-teal-700 dark:text-teal-400 px-1 py-1 w-[80px]">{row.totalLeaveBank ?? 0}</TableCell>
                <TableCell className="text-center font-medium text-emerald-700 dark:text-emerald-400 px-1 py-1 w-[72px]">{row.payableLeaves ?? 0}</TableCell>
                <TableCell className="text-center font-medium text-red-600 dark:text-red-400 px-1 py-1 w-[72px]">{row.excessLeaves ?? 0}</TableCell>
                <TableCell className="text-center font-medium px-1 py-1 w-[56px]">{row.present || "-"}</TableCell>
                <TableCell className="text-center font-medium text-blue-600/80 px-1 py-1 w-[64px]">{row.approvedLeave || "-"}</TableCell>
                <TableCell className="text-center font-medium text-indigo-600/80 px-1 py-1 w-[64px]">{row.unapprovedLeave || "-"}</TableCell>
                <TableCell className="text-center font-medium text-teal-600/80 px-1 py-1 w-[56px]">{row.approvedHalfLeave || "-"}</TableCell>
                <TableCell className="text-center font-medium text-pink-600/80 px-1 py-1 w-[56px]">{row.unapprovedHalfLeave || "-"}</TableCell>
                <TableCell className="text-center font-medium text-cyan-600/80 px-1 py-1 w-[64px]">{row.approvedLeaveWithoutPay || "-"}</TableCell>
                <TableCell className="text-center font-medium text-gray-500/80 px-1 py-1 w-[64px]">{row.unapprovedLeaveWithoutPay || "-"}</TableCell>
                <TableCell className="text-center font-medium text-cyan-600/80 px-1 py-1 w-[64px]">{row.approvedHalfLeaveWithoutPay || "-"}</TableCell>
                <TableCell className="text-center font-medium text-gray-500/80 px-1 py-1 w-[64px]">{row.unapprovedHalfLeaveWithoutPay || "-"}</TableCell>
                <TableCell className="text-center font-medium text-purple-600/80 px-1 py-1 w-[56px]">{row.holiday || "-"}</TableCell>
                <TableCell className="text-center font-medium text-emerald-600/80 px-1 py-1 w-[56px]">{row.doublePay || "-"}</TableCell>
                <TableCell className="text-center font-medium text-zinc-500/80 px-1 py-1 w-[56px]">{row.weekend || "-"}</TableCell>
                <TableCell className="text-center font-bold border-l border-r bg-zinc-50/50 dark:bg-zinc-900/30 px-1 py-1 w-[84px]">
                  <div className="truncate">{row.payableDays} <span className="text-[10px] text-muted-foreground font-normal">/ {row.totalDaysInMonth}</span></div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
          </Table>
      </div>
    </div>
  );
}
