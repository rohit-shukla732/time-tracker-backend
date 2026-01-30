"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings, Users, CheckCircle, AlertCircle, UserPlus, Eye, Mail, Phone, MapPin, Building2, Calendar, CreditCard, FileText, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  employmentInfo?: {
    departmentId: string | null;
    department: {
      id: string;
      name: string;
    } | null;
    jobType: string | null;
    status: string;
    joiningDate: string | null;
    designationId: string | null;
    designation?: {
      title: string;
    };
  };
  personalInfo?: {
    firstName: string;
    middleName: string | null;
    lastName: string;
    gender: string | null;
    dateOfBirth: string | null;
    pronoun: string | null;
  };
  contactInfo?: {
    email: string;
    alternateEmail: string | null;
    phoneNumber: string | null;
    alternatePhoneNumber: string | null;
  };
  addressInfo?: {
    residentialAddress: string | null;
    permanentAddress: string | null;
  };
  governmentID?: {
    panCardNumber: string | null;
    aadharCardNumber: string | null;
  };
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    beneficiaryName: string;
  };
  leaveBalance?: LeaveBalance;
  lateComingRecords?: LateComingRecord[];
}

interface LeaveBalance {
  id: string;
  sickLeave: number;
  casualLeave: number;
  annualLeave: number;
  maternityLeave: number;
  paternityLeave: number;
  compensatoryOff: number;
  sickUsed: number;
  casualUsed: number;
  annualUsed: number;
  maternityUsed: number;
  paternityUsed: number;
  compensatoryUsed: number;
  year: number;
}

interface LateComingRecord {
  id: string;
  year: number;
  month: number;
  creditsUsed: number;
  lateCount: number;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lateComingCredits, setLateComingCredits] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sort and Filter states
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string[]>>({
    department: [],
    designation: [],
    status: [],
    role: [],
  });

  const [balanceForm, setBalanceForm] = useState({
    sickLeave: "12",
    casualLeave: "10",
    annualLeave: "20",
    maternityLeave: "180",
    paternityLeave: "7",
    compensatoryOff: "0",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/hr/employees/${employeeToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete');
      setEmployees(prev => prev.filter(e => e.id !== employeeToDelete.id));
      toast.success(`${employeeToDelete.name} has been deleted`);
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete employee');
    } finally {
      setDeleting(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/hr/employees", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.location.href = "/hr/login";
          return;
        }
        throw new Error("Failed to fetch employees");
      }

      const data = await response.json();
      setEmployees(Array.isArray(data.employees) ? data.employees : []);
      setLateComingCredits(data.lateComingCredits || 0);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
      setEmployees([]);
      setLoading(false);
    }
  };

  const openBalanceDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    if (employee.leaveBalance) {
      setBalanceForm({
        sickLeave: employee.leaveBalance.sickLeave.toString(),
        casualLeave: employee.leaveBalance.casualLeave.toString(),
        annualLeave: employee.leaveBalance.annualLeave.toString(),
        maternityLeave: employee.leaveBalance.maternityLeave.toString(),
        paternityLeave: employee.leaveBalance.paternityLeave.toString(),
        compensatoryOff: employee.leaveBalance.compensatoryOff.toString(),
      });
    } else {
      setBalanceForm({
        sickLeave: "12",
        casualLeave: "10",
        annualLeave: "20",
        maternityLeave: "180",
        paternityLeave: "7",
        compensatoryOff: "0",
      });
    }
    setIsBalanceDialogOpen(true);
  };

  const handleSaveBalance = async () => {
    if (!selectedEmployee) return;

    try {
      const accessToken = localStorage.getItem("accessToken");
      const method = selectedEmployee.leaveBalance ? "PUT" : "POST";
      const response = await fetch(
        `/api/hr/employees/${selectedEmployee.id}/balance`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            sickLeave: parseFloat(balanceForm.sickLeave),
            casualLeave: parseFloat(balanceForm.casualLeave),
            annualLeave: parseFloat(balanceForm.annualLeave),
            maternityLeave: parseFloat(balanceForm.maternityLeave),
            paternityLeave: parseFloat(balanceForm.paternityLeave),
            compensatoryOff: parseFloat(balanceForm.compensatoryOff),
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.location.href = "/hr/login";
          return;
        }
        throw new Error("Failed to save balance");
      }

      toast.success(
        selectedEmployee.leaveBalance
          ? "Leave balance updated"
          : "Leave balance initialized"
      );
      setIsBalanceDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error("Error saving balance:", error);
      toast.error("Failed to save leave balance");
    }
  };

  const handleBulkInitialize = async (overwrite: boolean) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/hr/bulk-initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          year: new Date().getFullYear(),
          overwrite,
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.location.href = "/hr/login";
          return;
        }
        throw new Error("Failed to bulk initialize");
      }

      const data = await response.json();
      toast.success(
        `Initialized: ${data.results.created} created, ${data.results.updated} updated, ${data.results.skipped} skipped`
      );
      setIsBulkDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error("Error bulk initializing:", error);
      toast.error("Failed to bulk initialize");
    }
  };

  // Get unique values for filters
  const departments = [...new Set(employees.map(e => e.employmentInfo?.department?.name).filter(Boolean))];
  const designations = [...new Set(employees.map(e => e.employmentInfo?.designation?.title).filter(Boolean))];
  const statuses = [...new Set(employees.map(e => e.employmentInfo?.status).filter(Boolean))];
  const roles = [...new Set(employees.map(e => e.role).filter(Boolean))];

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const toggleFilter = (category: string, value: string) => {
    setFilters(prev => {
      const current = prev[category] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const clearFilters = () => {
    setFilters({
      department: [],
      designation: [],
      status: [],
      role: [],
    });
  };

  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);

  let filteredEmployees = employees.filter(
    (emp) =>
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employmentInfo?.department?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Apply filters
  if (filters.department.length > 0) {
    filteredEmployees = filteredEmployees.filter(emp =>
      filters.department.includes(emp.employmentInfo?.department?.name || '')
    );
  }
  if (filters.designation.length > 0) {
    filteredEmployees = filteredEmployees.filter(emp =>
      filters.designation.includes(emp.employmentInfo?.designation?.title || '')
    );
  }
  if (filters.status.length > 0) {
    filteredEmployees = filteredEmployees.filter(emp =>
      filters.status.includes(emp.employmentInfo?.status || '')
    );
  }
  if (filters.role.length > 0) {
    filteredEmployees = filteredEmployees.filter(emp =>
      filters.role.includes(emp.role)
    );
  }

  // Apply sorting
  if (sortColumn) {
    filteredEmployees = [...filteredEmployees].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'id':
          aValue = a.id.toLowerCase();
          bValue = b.id.toLowerCase();
          break;
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'department':
          aValue = a.employmentInfo?.department?.name?.toLowerCase() || '';
          bValue = b.employmentInfo?.department?.name?.toLowerCase() || '';
          break;
        case 'designation':
          aValue = a.employmentInfo?.designation?.title?.toLowerCase() || '';
          bValue = b.employmentInfo?.designation?.title?.toLowerCase() || '';
          break;
        case 'status':
          aValue = a.employmentInfo?.status || '';
          bValue = b.employmentInfo?.status || '';
          break;
        case 'joiningDate':
          aValue = a.employmentInfo?.joiningDate ? new Date(a.employmentInfo.joiningDate).getTime() : 0;
          bValue = b.employmentInfo?.joiningDate ? new Date(b.employmentInfo.joiningDate).getTime() : 0;
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-gray-100 text-gray-800';
      case 'ON_LEAVE': return 'bg-yellow-100 text-yellow-800';
      case 'TERMINATED': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableHead>
      <Button
        variant="ghost"
        onClick={() => handleSort(column)}
        className="h-8 flex items-center gap-1 font-semibold -ml-4 hover:bg-transparent"
      >
        {children}
        {sortColumn === column ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-50" />
        )}
      </Button>
    </TableHead>
  );

  const FilterableHeader = ({ 
    column, 
    label, 
    filterKey, 
    options 
  }: { 
    column: string; 
    label: string; 
    filterKey: string; 
    options: string[] 
  }) => (
    <TableHead>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          onClick={() => handleSort(column)}
          className="h-8 flex items-center gap-1 font-semibold hover:bg-transparent p-0"
        >
          {label}
          {sortColumn === column ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )
          ) : (
            <ArrowUpDown className="h-4 w-4 opacity-50" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Filter className={`h-3 w-3 ${filters[filterKey]?.length > 0 ? 'text-blue-600' : 'opacity-50'}`} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option}
                checked={filters[filterKey]?.includes(option)}
                onCheckedChange={() => toggleFilter(filterKey, option)}
              >
                {option}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TableHead>
  );

  return (
    <div className="p-8 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employee Management
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => router.push("/hr/employees/new")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
              <Button onClick={() => setIsBulkDialogOpen(true)} variant="outline">
                Bulk Initialize Balances
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Search employees by ID, name, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                  <Badge variant="secondary" className="ml-1">
                    {Object.values(filters).flat().length}
                  </Badge>
                </Button>
              )}
            </div>
          </div>

          {/* Tabs for different views */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="leaves">Leave Management</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader column="id">Employee ID</SortableHeader>
                    <SortableHeader column="name">Name</SortableHeader>
                    <SortableHeader column="email">Email</SortableHeader>
                    <FilterableHeader
                      column="department"
                      label="Department"
                      filterKey="department"
                      options={departments as string[]}
                    />
                    <FilterableHeader
                      column="designation"
                      label="Designation"
                      filterKey="designation"
                      options={designations as string[]}
                    />
                    <FilterableHeader
                      column="status"
                      label="Status"
                      filterKey="status"
                      options={statuses as string[]}
                    />
                    <SortableHeader column="joiningDate">Joining Date</SortableHeader>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <span className="font-mono text-sm">{employee.id}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            {employee.personalInfo && (
                              <div className="text-xs text-muted-foreground">
                                {employee.personalInfo.firstName} {employee.personalInfo.lastName}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{employee.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {employee.employmentInfo?.department ? (
                            <Badge variant="outline">
                              <Building2 className="h-3 w-3 mr-1" />
                              {employee.employmentInfo.department.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No department</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {employee.employmentInfo?.designation?.title || (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(employee.employmentInfo?.status || 'UNKNOWN')}>
                            {employee.employmentInfo?.status || 'UNKNOWN'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDate(employee.employmentInfo?.joiningDate || null)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/hr/employees/${employee.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                              onClick={() => { setEmployeeToDelete(employee); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Leave Management Tab */}
            <TabsContent value="leaves" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader column="name">Employee</SortableHeader>
                    <FilterableHeader
                      column="role"
                      label="Role"
                      filterKey="role"
                      options={roles as string[]}
                    />
                    <FilterableHeader
                      column="department"
                      label="Department"
                      filterKey="department"
                      options={departments as string[]}
                    />
                    <TableHead>Leave Balance Status</TableHead>
                    <TableHead>Sick / Casual / Annual</TableHead>
                    <TableHead>Late Coming (This Month)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {employee.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {employee.employmentInfo?.department?.name || (
                            <span className="text-muted-foreground text-sm">No department</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {employee.leaveBalance ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-700">
                                Configured ({employee.leaveBalance.year})
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm text-yellow-700">
                                Not configured
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {employee.leaveBalance ? (
                            <div className="text-sm space-y-1">
                              <div>
                                Sick: {employee.leaveBalance.sickLeave - employee.leaveBalance.sickUsed} / {employee.leaveBalance.sickLeave}
                              </div>
                              <div>
                                Casual: {employee.leaveBalance.casualLeave - employee.leaveBalance.casualUsed} / {employee.leaveBalance.casualLeave}
                              </div>
                              <div>
                                Annual: {employee.leaveBalance.annualLeave - employee.leaveBalance.annualUsed} / {employee.leaveBalance.annualLeave}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {employee.lateComingRecords && employee.lateComingRecords.length > 0 ? (
                            <div className="text-sm">
                              <div className="font-medium">
                                {employee.lateComingRecords[0].creditsUsed} / {lateComingCredits} mins
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {employee.lateComingRecords[0].lateCount} times late
                              </div>
                              <div className={`text-xs ${
                                employee.lateComingRecords[0].creditsUsed > lateComingCredits
                                  ? 'text-red-600 font-medium'
                                  : employee.lateComingRecords[0].creditsUsed > lateComingCredits * 0.8
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                              }`}>
                                {lateComingCredits - employee.lateComingRecords[0].creditsUsed} mins left
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              <div>0 / {lateComingCredits} mins</div>
                              <div className="text-xs">No late arrivals</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openBalanceDialog(employee)}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            {employee.leaveBalance ? "Edit" : "Initialize"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Balance Configuration Dialog */}
      <Dialog open={isBalanceDialogOpen} onOpenChange={setIsBalanceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee?.leaveBalance
                ? "Edit Leave Balance"
                : "Initialize Leave Balance"}
            </DialogTitle>
            <DialogDescription>
              Configure leave quotas for {selectedEmployee?.name} (
              {new Date().getFullYear()})
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <Label htmlFor="sickLeave">Sick Leave (days/year)</Label>
              <Input
                id="sickLeave"
                type="number"
                step="0.5"
                value={balanceForm.sickLeave}
                onChange={(e) =>
                  setBalanceForm({ ...balanceForm, sickLeave: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="casualLeave">Casual Leave (days/year)</Label>
              <Input
                id="casualLeave"
                type="number"
                step="0.5"
                value={balanceForm.casualLeave}
                onChange={(e) =>
                  setBalanceForm({ ...balanceForm, casualLeave: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="annualLeave">Annual Leave (days/year)</Label>
              <Input
                id="annualLeave"
                type="number"
                step="0.5"
                value={balanceForm.annualLeave}
                onChange={(e) =>
                  setBalanceForm({ ...balanceForm, annualLeave: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="maternityLeave">Maternity Leave (days)</Label>
              <Input
                id="maternityLeave"
                type="number"
                step="0.5"
                value={balanceForm.maternityLeave}
                onChange={(e) =>
                  setBalanceForm({
                    ...balanceForm,
                    maternityLeave: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="paternityLeave">Paternity Leave (days)</Label>
              <Input
                id="paternityLeave"
                type="number"
                step="0.5"
                value={balanceForm.paternityLeave}
                onChange={(e) =>
                  setBalanceForm({
                    ...balanceForm,
                    paternityLeave: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="compensatoryOff">Compensatory Off (days)</Label>
              <Input
                id="compensatoryOff"
                type="number"
                step="0.5"
                value={balanceForm.compensatoryOff}
                onChange={(e) =>
                  setBalanceForm({
                    ...balanceForm,
                    compensatoryOff: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBalanceDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveBalance}>Save Balance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Initialize Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Initialize Leave Balances</DialogTitle>
            <DialogDescription>
              Initialize leave balances for all employees for{" "}
              {new Date().getFullYear()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              This will create default leave balances for all employees who don&apos;t
              have one configured for this year.
            </p>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Default Quotas:</p>
              <ul className="text-sm space-y-1">
                <li>• Sick Leave: 12 days</li>
                <li>• Casual Leave: 10 days</li>
                <li>• Annual Leave: 20 days</li>
                <li>• Maternity Leave: 180 days</li>
                <li>• Paternity Leave: 7 days</li>
                <li>• Compensatory Off: 0 days</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleBulkInitialize(true)}
            >
              Initialize & Overwrite Existing
            </Button>
            <Button onClick={() => handleBulkInitialize(false)}>
              Initialize New Only
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={open => { if (!deleting) { setDeleteDialogOpen(open); if (!open) setEmployeeToDelete(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{employeeToDelete?.name}</strong>? This will permanently remove
              their account and all associated records (personal info, employment details, leave balance, etc.).
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setEmployeeToDelete(null); }} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEmployee} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
