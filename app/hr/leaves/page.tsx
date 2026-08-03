"use client"; 
import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { Loader2, Save, Search, ArrowUpDown, Settings } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function LeavesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });

  const [currentDate, setCurrentDate] = useState(new Date());

  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState<any>({});

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const fetchData = async () => {
    setIsLoading(true);
    setPendingChanges({});
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const res = await fetch(`/api/hr/leaves?month=${month}&year=${year}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch data");
      setEmployees(json.employees || []);
      setSettings(json.settings || {});
      setTempSettings(json.settings || {});
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentDate.getMonth(), currentDate.getFullYear()]);

  const handleAmountChange = (userId: string, field: string, value: string) => {
    const amount = value === "" ? "" : parseFloat(value);
    setPendingChanges((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: amount },
    }));
  };

  const handleSaveBalances = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast.info("No changes to save.");
      return;
    }
    setIsSaving(true);
    try {
      const updates = Object.entries(pendingChanges).map(
        ([userId, fields]) => ({
          userId,
          ...fields,
        }),
      );

      const res = await fetch("/api/hr/leaves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({
          updates,
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear()
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save balances");
      toast.success("Leave balances updated successfully!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch("/api/hr/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(tempSettings),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to update global leaves limit");
      toast.success("Global leave settings updated!");
      setIsSettingsOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const uniqueDepartments = Array.from(
    new Set(
      employees.map((e) => e.employmentInfo?.department?.name).filter(Boolean),
    ),
  ) as string[];

  const filteredEmployees = employees
    .filter((emp) => {
      const matchesSearch =
        emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.id?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept =
        departmentFilter === "ALL" ||
        emp.employmentInfo?.department?.name === departmentFilter;
      return matchesSearch && matchesDept;
    })
    .sort((a, b) => {
      const aVal = a[sortConfig.key] || "";
      const bVal = b[sortConfig.key] || "";
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  const getBalance = (emp: any, field: string) => {
    if (field in (pendingChanges[emp.id] || {})) {
      return pendingChanges[emp.id][field];
    }
    const hasMonthly = emp.monthlyLeaveBalances && emp.monthlyLeaveBalances.length > 0;
    if (hasMonthly) {
       return emp.monthlyLeaveBalances[0][field] || 0;
    }
    
    // Fallback logic
    if (field === "previousLeaves") {
       return emp.leaveBalance?.annualLeave ? emp.leaveBalance.annualLeave - (emp.leaveBalance?.annualUsed || 0) : 0;
    }
    if (field === "currentMonthLeaves") {
       return settings?.monthlyAnnualLeave || 0;
    }
    if (field === "compensatoryOff") {
       return emp.leaveBalance?.compensatoryOff ? emp.leaveBalance.compensatoryOff - (emp.leaveBalance?.compensatoryUsed || 0) : 0;
    }

    return 0;
  };
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const renderPagination = () => (
    <div className="flex justify-center items-center py-4">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          <PaginationItem>
            <span className="text-sm text-muted-foreground px-4">
              Page {currentPage} of {totalPages}
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className={currentPage === totalPages || totalPages === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );


  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Monthly Leave Allowances
          </h1>
          <p className="text-sm text-muted-foreground">
            View or edit per-user balances for previous carried leaves, the current month additions, and comp offs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
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
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Depts</SelectItem>
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
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={m} value={i.toString()}>{m}</SelectItem>
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
            <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Settings className="h-4 w-4 mr-2" /> Global Defaults
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Monthly Base Settings</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Monthly Leaves Added</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={tempSettings.monthlyAnnualLeave || 0}
                    onChange={(e) =>
                      setTempSettings({
                        ...tempSettings,
                        monthlyAnnualLeave: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveSettings}>Save Month Config</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            onClick={handleSaveBalances}
            disabled={isSaving || Object.keys(pendingChanges).length === 0}
            className="w-full sm:w-auto relative"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
            {Object.keys(pendingChanges).length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center animate-bounce">
                {Object.keys(pendingChanges).length}
              </span>
            )}
          </Button>
        </div>
      </div>

      
  {renderPagination()}
      <Table containerClassName="max-h-[calc(100vh-280px)] w-full border rounded-md" className="text-[13px] border-collapse min-w-max">
        <TableHeader className="sticky top-0 bg-white dark:bg-gray-950 z-20 shadow-sm border-b">
          <TableRow>
                <TableHead className="sticky left-0 bg-white dark:bg-zinc-950 z-[30] border-r w-[250px] sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                  Employee Details
                </TableHead>
                <TableHead className="text-center border-r font-bold bg-blue-500/10 text-indigo-600 dark:text-indigo-400 min-w-[120px] sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                  Total Allowed
                </TableHead>
                <TableHead className="text-center bg-zinc-100/50 dark:bg-zinc-800/50 min-w-[120px] sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                  Prev Leaves Left
                </TableHead>
                <TableHead className="text-center bg-zinc-100/50 dark:bg-zinc-800/50 min-w-[120px] sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                  Current Mo. Added
                </TableHead>
                <TableHead className="text-center bg-zinc-100/50 dark:bg-zinc-800/50 min-w-[120px] sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                  Comp. Off
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-48 text-center text-muted-foreground"
                  >
                    No employees found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((emp) => {
                  const prev = getBalance(emp, "previousLeaves");
                  const curr = getBalance(emp, "currentMonthLeaves");
                  const comp = getBalance(emp, "compensatoryOff");

                  const totalNetLeft = prev + curr + comp;

                  return (
                    <TableRow
                      key={emp.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <TableCell className="sticky left-0 bg-white dark:bg-zinc-950 border-r px-4 py-3 z-[10] w-[250px]">
                        <div className="font-medium text-foreground">
                          {emp.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {emp.employmentInfo?.department?.name || "No Dept"} /{" "}
                          {emp.id}
                        </div>
                      </TableCell>

                      <TableCell className="text-center font-bold border-r bg-blue-50/10 text-indigo-700">
                        {totalNetLeft > 0 ? totalNetLeft : 0}
                      </TableCell>

                      {["previousLeaves", "currentMonthLeaves", "compensatoryOff"].map((field) => {
                        const isPending = field in (pendingChanges[emp.id] || {});
                        const val = getBalance(emp, field);

                        return (
                          <TableCell
                            key={field}
                            className="p-1 border-r relative focus-within:ring-1 focus-within:ring-primary focus-within:z-[10] group-hover:bg-zinc-50/30"
                          >
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              className={`w-full h-full text-center py-2 px-1 text-sm bg-transparent outline-none transition-all ${isPending ? "font-semibold text-green-600 dark:text-green-400 bg-green-50/30" : ""}`}
                              value={val ?? ""}
                              onChange={(e) => handleAmountChange(emp.id, field, e.target.value)}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
      {renderPagination()}
    </div>
  );
}
