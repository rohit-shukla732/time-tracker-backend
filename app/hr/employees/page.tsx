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
import { toast } from "sonner";
import { Settings, Users, CheckCircle, AlertCircle, UserPlus } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  team?: {
    id: string;
    name: string;
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

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.team?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employee Leave Management
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
            <Input
              placeholder="Search employees by name, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Employee Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
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
                      {employee.team?.name || (
                        <span className="text-muted-foreground text-sm">No team</span>
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
    </div>
  );
}
