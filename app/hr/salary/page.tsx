"use client"; 
import { useState, useEffect, useMemo } from "react";
import { useRouter } from 'next/navigation';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Edit2, Loader2, Plus, Save, Search, ArrowUpDown, Download } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { utils, writeFile } from "xlsx";

export default function SalaryPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  
  // Custom Overrides & Edits
  const [salaryData, setSalaryData] = useState<Record<string, number>>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  
  const [ctcData, setCtcData] = useState<Record<string, number>>({}); // UserID -> CTC
  const [pendingCtc, setPendingCtc] = useState<Record<string, number>>({});

  // Dialog State (Add component)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newComponentName, setNewComponentName] = useState("");
  const [newComponentType, setNewComponentType] = useState("EARNING");
  const [newDefaultType, setNewDefaultType] = useState("PERCENT");
  const [newDefaultValue, setNewDefaultValue] = useState("");

  // Dialog State (Edit component)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editComponentId, setEditComponentId] = useState("");
  const [editComponentName, setEditComponentName] = useState("");
  const [editComponentType, setEditComponentType] = useState("EARNING");
  const [editDefaultType, setEditDefaultType] = useState("PERCENT");
  const [editDefaultValue, setEditDefaultValue] = useState("");

  const currentDate = new Date();
  const [targetMonth, setTargetMonth] = useState((currentDate.getMonth() + 1).toString());
  const [targetYear, setTargetYear] = useState(currentDate.getFullYear().toString());
  const [attendanceData, setAttendanceData] = useState<any[]>([]); // To hold consolidated data

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

  const fetchData = async () => {
    if (allowed === false) return;
    setIsLoading(true);
    setPendingChanges({});
    setPendingCtc({});
    
    try {
      const headers = { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` };
      
      const [empRes, compRes, attRes] = await Promise.all([
        fetch("/api/hr/salary", { headers }),
        fetch("/api/hr/salary/components", { headers }),
        fetch(`/api/hr/attendance/consolidated?month=${targetMonth}&year=${targetYear}`, { headers })
      ]);

      const empJson = await empRes.json();
      const compJson = await compRes.json();
      const attJson = await attRes.json();

      if (attRes.ok && attJson.success) {
        setAttendanceData(attJson.data);
      } else {
        setAttendanceData([]);
      }

      const rawMap: Record<string, number> = {};
      const ctcMap: Record<string, number> = {};
      
      empJson.data.forEach((emp: any) => {
        ctcMap[emp.id] = emp.employmentInfo?.ctc || 0;
        
        emp.employeeSalaries?.forEach((slry: any) => {
          rawMap[`${emp.id}_${slry.componentId}`] = slry.amount;
        });
      });

      setCtcData(ctcMap);
      setSalaryData(rawMap);
      setEmployees(empJson.data);
      setComponents(compJson.data);
      
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) fetchData();
  }, [allowed, targetMonth, targetYear]);

  useEffect(() => {
    // access check: compare local user against env allowed list or id
    const stored = localStorage.getItem('user');
    const allowedId = process.env.NEXT_PUBLIC_SALARY_USER_ID;
    const allowedEmailsCsv = process.env.NEXT_PUBLIC_SALARY_ALLOWED_EMAILS || '';
    const allowedEmails = allowedEmailsCsv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

    if (!stored) {
      setAllowed(false);
      router.replace('/hr');
      return;
    }

    try {
      const user = JSON.parse(stored);
      const email = (user.email || '').toLowerCase();
      if (allowedId && user.id === allowedId) {
        setAllowed(true);
        return;
      }
      if (allowedEmails.length > 0 && allowedEmails.includes(email)) {
        setAllowed(true);
        return;
      }
    } catch (e) {
      // parse error
    }

    setAllowed(false);
    router.replace('/hr');
  }, [router]);

  const getCalculatedAmount = (userId: string, comp: any, overrides: any) => {
    const key = `${userId}_${comp.id}`;
    
    // If the user manually edited this cell
    if (overrides[key] !== undefined) return overrides[key];
    
    // We expect the default calculation if there is NO explicit DB entry
    // However, if an explicit DB entry exists (salaryData[key]), we should prioritize it
    // Wait, if it exists in DB, it is their set value
    if (salaryData[key] !== undefined) return salaryData[key];

    // Fallback string calculation
    const currentCtc = pendingCtc[userId] !== undefined ? pendingCtc[userId] : (ctcData[userId] || 0);
    const monthlyCtc = currentCtc / 12;

    if (comp.defaultType === "PERCENT") {
      return (monthlyCtc * (comp.defaultValue / 100));
    }
    
    return comp.defaultValue || 0;
  };

  const handleAmountChange = (userId: string, componentId: string, value: string) => {
    const amount = value === "" ? undefined : parseFloat(value) || 0;
    const key = `${userId}_${componentId}`;
    
    setPendingChanges({
      ...pendingChanges,
      [key]: amount,
    });
  };

  const handleCtcChange = (userId: string, value: string) => {
    const amount = parseFloat(value) || 0;
    setPendingCtc({ ...pendingCtc, [userId]: amount });
  };

  const handleSave = async () => {
    const updates = Object.keys(pendingChanges).map(key => {
      const [userId, componentId] = key.split("_");
      return { userId, componentId, amount: pendingChanges[key] || 0 };
    });

    const ctcUpdates = Object.keys(pendingCtc).map(userId => {
      return { userId, ctc: pendingCtc[userId] };
    });

    if (updates.length === 0 && ctcUpdates.length === 0) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/hr/salary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        },
        body: JSON.stringify({ updates, ctcUpdates })
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save data");

      toast.success("Salary structures saved successfully");
      
      // Update local state
      const newData = { ...salaryData };
      updates.forEach((u: any) => newData[`${u.userId}_${u.componentId}`] = u.amount);
      setSalaryData(newData);
      
      const newCtc = { ...ctcData };
      ctcUpdates.forEach((c: any) => newCtc[c.userId] = c.ctc);
      setCtcData(newCtc);

      setPendingChanges({});
      setPendingCtc({});
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComponentName.trim()) {
      toast.error("Component name is required");
      return;
    }

    try {
      const res = await fetch("/api/hr/salary/components", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        },
        body: JSON.stringify({
          name: newComponentName,
          type: newComponentType,
          defaultType: newDefaultType,
          defaultValue: parseFloat(newDefaultValue) || 0
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create component");

      toast.success("Salary component added!");
      setComponents([...components, json.data]);
      setIsDialogOpen(false);
      setNewComponentName("");
      setNewDefaultValue("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEditComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editComponentName.trim() || !editComponentId) {
      toast.error("Component name is required");
      return;
    }

    try {
      const res = await fetch(`/api/hr/salary/components/${editComponentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        },
        body: JSON.stringify({
          name: editComponentName,
          type: editComponentType,
          defaultType: editDefaultType,
          defaultValue: parseFloat(editDefaultValue) || 0
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update component");

      toast.success("Salary component updated!");
      setComponents(components.map(c => c.id === editComponentId ? json.data : c));
      setIsEditDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openEditDialog = (comp: any) => {
    setEditComponentId(comp.id);
    setEditComponentName(comp.name);
    setEditComponentType(comp.type);
    setEditDefaultType(comp.defaultType || "PERCENT");
    setEditDefaultValue((comp.defaultValue || 0).toString());
    setIsEditDialogOpen(true);
  };

  // Derived filter logic (memoized to avoid expensive recalcs on every render)
  const attendanceMap = useMemo(() => {
    const m: Record<string, any> = {};
    attendanceData.forEach(a => { if (a && a.userId) m[a.userId] = a; });
    return m;
  }, [attendanceData]);

  const uniqueDepartments = useMemo(() => {
    return Array.from(
      new Set(employees.map((e) => e.employmentInfo?.department?.name).filter(Boolean))
    ).sort() as string[];
  }, [employees]);

  const earnings = useMemo(() => components.filter(c => c.type === "EARNING"), [components]);
  const deductions = useMemo(() => components.filter(c => c.type === "DEDUCTION"), [components]);

  const filteredEmployees = useMemo(() => {
    const arr = employees.filter((emp) => {
      const name = (emp.name || "").toString().toLowerCase();
      const id = (emp.id || "").toString().toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch = name.includes(q) || id.includes(q);
      const dept = emp.employmentInfo?.department?.name;
      const matchesDept = departmentFilter === "ALL" || dept === departmentFilter;
      return matchesSearch && matchesDept;
    });

    arr.sort((a, b) => {
      let aVal: string | number = a.name || "";
      let bVal: string | number = b.name || "";
      if (sortConfig.key === "id") {
        aVal = a.id || "";
        bVal = b.id || "";
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return arr;
  }, [employees, searchQuery, departmentFilter, sortConfig]);

  // Precompute totals per user to avoid recalculating components for every render
  const totalsMap = useMemo(() => {
    const map: Record<string, any> = {};
    employees.forEach(emp => {
      const userId = emp.id;
      let totalEarnings = 0;
      let totalDeductions = 0;
      components.forEach(comp => {
        const amount = getCalculatedAmount(userId, comp, pendingChanges) || 0;
        if (comp.type === 'EARNING') totalEarnings += Number(amount);
        else if (comp.type === 'DEDUCTION') totalDeductions += Number(amount);
      });

      const currentCtc = pendingCtc[userId] !== undefined ? pendingCtc[userId] : (ctcData[userId] || 0);
      const netSalary = totalEarnings - totalDeductions;

      const att = attendanceMap[userId];
      const totalDays = att ? att.totalDaysInMonth : new Date(parseInt(targetYear), parseInt(targetMonth), 0).getDate();
      const payableDays = att ? att.payableDays : totalDays;
      const unpaidDays = totalDays - payableDays;
      const lwpDrop = totalDays > 0 ? (netSalary / totalDays) * unpaidDays : 0;
      const actualInHand = netSalary - lwpDrop;

      map[userId] = { currentCtc, totalEarnings, totalDeductions, netSalary, payableDays, totalDays, lwpDrop, actualInHand };
    });
    return map;
  }, [employees, components, salaryData, pendingChanges, pendingCtc, ctcData, attendanceMap, targetMonth, targetYear]);

  const calculateTotals = (userId: string) => {
    let totalEarnings = 0;
    let totalDeductions = 0;

    components.forEach((comp) => {
      const amount = getCalculatedAmount(userId, comp, pendingChanges);

      if (comp.type === "EARNING") {
        totalEarnings += Number(amount);
      } else if (comp.type === "DEDUCTION") {
        totalDeductions += Number(amount);
      }
    });

    const currentCtc = pendingCtc[userId] !== undefined ? pendingCtc[userId] : (ctcData[userId] || 0);
    const netSalary = totalEarnings - totalDeductions;
    return { currentCtc, totalEarnings, totalDeductions, netSalary };
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
          <h1 className="text-2xl font-bold tracking-tight">Salary & CTC Structure</h1>
          <p className="text-sm text-muted-foreground">
            Manage Yearly CTC to dynamically auto-calculate component rows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* SEARCH & FILTERS */}            <Select value={targetMonth} onValueChange={setTargetMonth}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map(m => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
              </SelectContent>
            </Select>

            <Select value={targetYear} onValueChange={setTargetYear}>
              <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
              </SelectContent>
            </Select>
          <div className="relative w-full sm:w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employee..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select 
            value={departmentFilter} 
            onValueChange={setDepartmentFilter}
          >
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {uniqueDepartments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" /> Add Component
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>New Salary Component</DialogTitle>
                <DialogDescription>
                  Define percentage defaults globally based on Monthly CTC.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddComponent} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Component Name</Label>
                  <Input 
                    value={newComponentName} 
                    onChange={e => setNewComponentName(e.target.value)} 
                    placeholder="e.g. Basic, HRA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Component Type</Label>
                  <Select value={newComponentType} onValueChange={setNewComponentType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EARNING">Earnings (+)</SelectItem>
                      <SelectItem value="DEDUCTION">Deduction (-)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3">
                  <div className="space-y-2 grow">
                    <Label>Calculation Mode</Label>
                    <Select value={newDefaultType} onValueChange={setNewDefaultType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENT">Percentage of Monthly CTC</SelectItem>
                        <SelectItem value="FIXED">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 w-1/3">
                    <Label>Default Val</Label>
                    <Input 
                      type="number" step="0.01" min="0"
                      value={newDefaultValue} 
                      onChange={e => setNewDefaultValue(e.target.value)} 
                      placeholder={newDefaultType === "PERCENT" ? "e.g. 50" : "5000"}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit">Add Database Column</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Button 
            disabled={(Object.keys(pendingChanges).length === 0 && Object.keys(pendingCtc).length === 0) || isSaving} 
            onClick={handleSave}
            className="w-full sm:w-auto xl:ml-4"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes ({Object.keys(pendingChanges).length + Object.keys(pendingCtc).length})
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const exportRows: any[] = filteredEmployees.map(emp => {
                const totals = totalsMap[emp.id] || calculateTotals(emp.id);
                const row: any = {
                  "Employee ID": emp.id,
                  Name: emp.name,
                  Department: emp.employmentInfo?.department?.name || "",
                  CTC: totals.currentCtc,
                  "Total Earnings": totals.totalEarnings,
                  "Total Deductions": totals.totalDeductions,
                  "Net Salary": totals.netSalary,
                };

                components.forEach(comp => {
                  row[comp.name] = getCalculatedAmount(emp.id, comp, pendingChanges);
                });

                return row;
              });

              const ws = utils.json_to_sheet(exportRows);
              const wb = utils.book_new();
              utils.book_append_sheet(wb, ws, "Salary_Structure");
              writeFile(wb, `Salary_Structure_${months[parseInt(targetMonth)-1].label || months[parseInt(targetMonth)-1]}_${targetYear}.xlsx`);
            }}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      
  {renderPagination()}
      <Table containerClassName="max-h-[calc(100vh-280px)] w-full border rounded-md" className="text-[13px] border-collapse min-w-max">
        <TableHeader className="sticky top-0 bg-white dark:bg-gray-950 z-20 shadow-sm border-b">
              {/* Top grouping row */}
              <TableRow>
                <TableHead colSpan={2} className="sticky left-0 bg-white dark:bg-zinc-950 z-[30] border-r w-[280px] sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                  <div className="pl-4">Employee Details</div>
                </TableHead>
                <TableHead colSpan={2} className="text-center font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-r border-b tracking-widest min-w-[200px] sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                  OVERALL PAY (Base Reference)
                </TableHead>
                {earnings.length > 0 && (
                  <TableHead 
                    colSpan={earnings.length} 
                    className="text-center font-bold text-green-600 dark:text-green-500 bg-green-500/10 border-r border-b tracking-widest sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                    EARNINGS
                  </TableHead>
                )}
                {deductions.length > 0 && (
                  <TableHead 
                    colSpan={deductions.length} 
                    className="text-center font-bold text-red-600 dark:text-red-500 bg-red-500/10 border-r border-b tracking-widest sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                    DEDUCTIONS
                  </TableHead>
                )}
                  <TableHead colSpan={5} className="text-center font-bold bg-blue-500/10 border-b tracking-widest sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                </TableHead>
              </TableRow>

              {/* Sub headers row (Columns) */}
              <TableRow>
                <TableHead 
                  className="sticky left-0 bg-white dark:bg-zinc-950 z-[30] border-r w-[120px] cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)]"
                  onClick={() => setSortConfig({ key: "id", direction: sortConfig.key === "id" && sortConfig.direction === "asc" ? "desc" : "asc" })}
                >
                  <div className="pl-2 flex items-center gap-1">Emp Code <ArrowUpDown className="h-3 w-3 text-muted-foreground ml-1" /></div>
                </TableHead>
                <TableHead 
                  className="sticky left-[120px] bg-white dark:bg-zinc-950 z-[30] border-r w-[160px] cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)]"
                  onClick={() => setSortConfig({ key: "name", direction: sortConfig.key === "name" && sortConfig.direction === "asc" ? "desc" : "asc" })}
                >
                  <div className="pl-2 flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3 text-muted-foreground ml-1" /></div>
                </TableHead>
                <TableHead className="text-center min-w-[130px] border-r bg-zinc-100/50 dark:bg-zinc-800/50 pt-3 sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                  <div className="font-semibold text-indigo-700">Yearly CTC</div>
                  <div className="text-[10px] opacity-70">(Input manually)</div>
                </TableHead>
                <TableHead className="text-center min-w-[110px] border-r bg-zinc-100/50 dark:bg-zinc-800/50 pt-3 sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                  <div className="font-semibold">Monthly CTC</div>
                  <div className="text-[10px] opacity-70">(= Yearly / 12)</div>
                </TableHead>

                {earnings.map((comp) => (
                  <TableHead key={comp.id} className="text-center min-w-[110px] border-r bg-white dark:bg-zinc-950 pt-3 group relative sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                    <div className="font-semibold flex items-center justify-center gap-1">
                      {comp.name}
                      <button onClick={() => openEditDialog(comp)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit2 className="w-3 h-3 text-muted-foreground hover:text-primary" />
                      </button>
                    </div>
                    <div className="text-[10px] opacity-70">
                      {comp.defaultType === "PERCENT" ? `${comp.defaultValue}% (of MCTC)` : `₹${comp.defaultValue} (Fixed)`}
                    </div>
                  </TableHead>
                ))}
                {deductions.map((comp) => (
                  <TableHead key={comp.id} className="text-center min-w-[110px] border-r bg-white dark:bg-zinc-950 pt-3 group relative sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                    <div className="font-semibold flex items-center justify-center gap-1">
                      {comp.name}
                      <button onClick={() => openEditDialog(comp)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit2 className="w-3 h-3 text-muted-foreground hover:text-primary" />
                      </button>
                    </div>
                    <div className="text-[10px] opacity-70">
                      {comp.defaultType === "PERCENT" ? `${comp.defaultValue}% (of MCTC)` : `₹${comp.defaultValue} (Fixed)`}
                    </div>
                  </TableHead>
                ))}
                
                <TableHead className="text-center min-w-[110px] border-r bg-zinc-100/80 dark:bg-zinc-800/80 font-semibold sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                  M. Earn
                </TableHead>
                <TableHead className="text-center min-w-[110px] border-r bg-zinc-100/80 dark:bg-zinc-800/80 font-semibold sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                  M. Deduct
                </TableHead>                  <TableHead className="text-center min-w-[100px] border-r bg-orange-50/50 dark:bg-orange-900/20 font-semibold sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                    Payable Days
                  </TableHead>
                  <TableHead className="text-center min-w-[100px] border-r bg-red-50/50 dark:bg-red-900/20 font-semibold sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                    LWP Drop
                  </TableHead>                <TableHead className="text-center min-w-[130px] border-r bg-blue-50/50 dark:bg-blue-900/20 font-bold text-primary sticky top-0 bg-white dark:bg-gray-950 z-[20] shadow-sm border-b">
                  Net IN_HAND
                </TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={(earnings.length + deductions.length + 7) || 9} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <p>Loading smart salary grids...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={(earnings.length + deductions.length + 7) || 9} className="h-48 text-center text-muted-foreground">
                    No employees found matching filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((emp) => {
                  const totals = totalsMap[emp.id] || calculateTotals(emp.id);
                  const isCtcPending = pendingCtc[emp.id] !== undefined;
                  const att = attendanceMap[emp.id];
                  const totalDays = totals.totalDays || (att ? att.totalDaysInMonth : new Date(parseInt(targetYear), parseInt(targetMonth), 0).getDate());
                  const payableDays = totals.payableDays || (att ? att.payableDays : totalDays);
                  const lwpDrop = totals.lwpDrop || (totalDays > 0 ? (totals.netSalary / totalDays) * (totalDays - payableDays) : 0);
                  const actualInHand = totals.actualInHand || (totals.netSalary - lwpDrop);
                  return (
                    <TableRow key={emp.id} className="hover:bg-transparent group">
                      <TableCell className="sticky left-0 bg-white dark:bg-zinc-950 border-r border-b p-0 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)] z-[10] w-[120px]">
                        <div className="truncate font-medium text-xs px-4 py-3 h-full flex flex-col justify-center text-muted-foreground">
                          {emp.id || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="sticky left-[120px] bg-white dark:bg-zinc-950 border-r border-b p-0 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)] z-[10] w-[160px]">
                        <div className="truncate font-medium px-4 py-3 h-full flex flex-col justify-center text-foreground">
                          <div>{emp.name}</div>
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {emp.employmentInfo?.department?.name || 'No Dept'}
                          </div>
                        </div>
                      </TableCell>
                      
                      {/* Yearly CTC Input */}
                      <TableCell className="p-1 border-r border-b bg-indigo-50/10 focus-within:ring-1 focus-within:ring-indigo-500 relative">
                         <div className="flex items-center h-full">
                           <span className="text-muted-foreground text-xs pl-2">₹</span>
                           <input
                             type="number"
                             min="0" step="0.01"
                             className={`w-full h-full text-right py-2 pr-2 text-sm bg-transparent outline-none transition-all font-semibold
                              ${isCtcPending ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50' : 'text-zinc-800'}`}
                             value={totals.currentCtc === 0 && !isCtcPending ? '' : totals.currentCtc}
                             placeholder="0"
                             onChange={(e) => handleCtcChange(emp.id, e.target.value)}
                           />
                         </div>
                      </TableCell>

                      {/* Display Computed Monthly CTC */}
                      <TableCell className="text-center font-bold border-r border-b bg-zinc-50/50">
                        ₹{(totals.currentCtc / 12).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </TableCell>

                      {/* Earnings */}
                      {earnings.map((comp) => {
                        const key = `${emp.id}_${comp.id}`;
                        const isPending = pendingChanges[key] !== undefined;
                        const val = getCalculatedAmount(emp.id, comp, pendingChanges);
                        const isAutoCalculated = pendingChanges[key] === undefined && salaryData[key] === undefined;

                        return (
                          <TableCell key={comp.id} className="p-1 border-r border-b relative focus-within:ring-1 focus-within:ring-primary focus-within:z-[10] group-hover:bg-zinc-50/30">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className={`w-full h-full text-center py-2 px-1 text-sm bg-transparent outline-none transition-all 
                               ${isPending ? 'font-semibold text-green-600 dark:text-green-400 bg-green-50/30' : ''}
                               ${isAutoCalculated && val > 0 ? 'text-green-700/60 font-medium italic' : ''}`}
                              value={val === 0 && !isPending ? '' : Number(val).toFixed(2)}
                              placeholder={isAutoCalculated ? Number(val || 0).toFixed(0) : "-"}
                              onChange={(e) => handleAmountChange(emp.id, comp.id, e.target.value)}
                            />
                          </TableCell>
                        );
                      })}

                      {/* Deductions */}
                      {deductions.map((comp) => {
                        const key = `${emp.id}_${comp.id}`;
                        const isPending = pendingChanges[key] !== undefined;
                        const val = getCalculatedAmount(emp.id, comp, pendingChanges);
                        const isAutoCalculated = pendingChanges[key] === undefined && salaryData[key] === undefined;

                        return (
                          <TableCell key={comp.id} className="p-1 border-r border-b relative focus-within:ring-1 focus-within:ring-primary focus-within:z-[10] group-hover:bg-zinc-50/30">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className={`w-full h-full text-center py-2 px-1 text-sm bg-transparent outline-none transition-all 
                                ${isPending ? 'font-semibold text-red-600 dark:text-red-400 bg-red-50/30' : ''}
                                ${isAutoCalculated && val > 0 ? 'text-red-700/60 font-medium italic' : ''}`}
                              value={val === 0 && !isPending ? '' : Number(val).toFixed(2)}
                              placeholder={isAutoCalculated ? Number(val || 0).toFixed(0) : "-"}
                              onChange={(e) => handleAmountChange(emp.id, comp.id, e.target.value)}
                            />
                          </TableCell>
                        );
                      })}
                      
                      <TableCell className="text-center font-medium bg-zinc-50/80 dark:bg-zinc-900/50 border-r border-b">
                        <span className={totals.totalEarnings > 0 ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}>
                          {totals.totalEarnings.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      
                      <TableCell className="text-center font-medium bg-zinc-50/80 dark:bg-zinc-900/50 border-r border-b">
                        <span className={totals.totalDeductions > 0 ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}>
                          {totals.totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </TableCell>

                        <TableCell className="text-center font-medium bg-orange-50/10 dark:bg-orange-900/30 border-r border-b text-orange-700 dark:text-orange-400">
                          {att ? `${payableDays} / ${totalDays}` : "-"}
                        </TableCell>

                        <TableCell className="text-center font-medium bg-red-50/10 dark:bg-red-900/30 border-r border-b text-red-600 dark:text-red-400">
                          {lwpDrop > 0 ? `- ₹${lwpDrop.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "-"}
                        </TableCell>

                        <TableCell className="text-center text-sm font-bold bg-blue-50/30 dark:bg-blue-900/20 border-b text-blue-700 dark:text-blue-400">
                           ₹{actualInHand.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
      {renderPagination()}


      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Component</DialogTitle>
            <DialogDescription>Modify an existing salary component's rules.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditComponent} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Component Name</Label>
              <Input
                placeholder="e.g. Basic Salary, PF..."
                value={editComponentName}
                onChange={(e) => setEditComponentName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={editComponentType} onValueChange={setEditComponentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EARNING">Earnings (+)</SelectItem>
                  <SelectItem value="DEDUCTION">Deduction (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Type</Label>
                <Select value={editDefaultType} onValueChange={setEditDefaultType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Percentage of MCTC</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  placeholder={editDefaultType === "PERCENT" ? "%" : "Amount"}
                  value={editDefaultValue}
                  onChange={(e) => setEditDefaultValue(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Component</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}
