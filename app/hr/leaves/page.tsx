"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Calendar,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  User,
  FileText,
} from "lucide-react";

interface LeaveRequest {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  attachment?: string;
  user: {
    id: string;
    name: string;
    email: string;
    employmentInfo?: Array<{
      department: {
        id: string;
        name: string;
      };
    }>;
  };
  approvedBy?: {
    id: string;
    name: string;
    email: string;
  };
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface LeaveBalance {
  sick: { total: number; used: number; remaining: number };
  casual: { total: number; used: number; remaining: number };
  annual: { total: number; used: number; remaining: number };
  maternity: { total: number; used: number; remaining: number };
  paternity: { total: number; used: number; remaining: number };
  compensatory: { total: number; used: number; remaining: number };
  year: number;
}

export default function LeaveManagementPage() {
  const router = useRouter();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const [newLeave, setNewLeave] = useState({
    type: "SICK",
    startDate: "",
    endDate: "",
    days: "",
    reason: "",
  });

  useEffect(() => {
    fetchLeaves();
    fetchBalance();
  }, [filterStatus, filterType]);

  const fetchLeaves = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterType !== "all") params.append("type", filterType);

      const response = await fetch(`/api/leaves?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/hr/login");
          return;
        }
        throw new Error("Failed to fetch leaves");
      }

      const data = await response.json();
      setLeaves(Array.isArray(data.leaves) ? data.leaves : []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching leaves:", error);
      setLeaves([]);
      setLoading(false);
      toast.error("Failed to fetch leave requests");
    }
  };

  const fetchBalance = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/leaves/balance", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/hr/login");
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const calculateDays = () => {
    if (newLeave.startDate && newLeave.endDate) {
      const start = new Date(newLeave.startDate);
      const end = new Date(newLeave.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setNewLeave({ ...newLeave, days: diffDays.toString() });
    }
  };

  useEffect(() => {
    calculateDays();
  }, [newLeave.startDate, newLeave.endDate]);

  const handleCreateLeave = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/leaves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...newLeave,
          days: parseFloat(newLeave.days),
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/hr/login");
          return;
        }
        const error = await response.json();
        throw new Error(error.error || "Failed to create leave request");
      }

      toast.success("Leave request created successfully");
      setIsCreateDialogOpen(false);
      setNewLeave({
        type: "SICK",
        startDate: "",
        endDate: "",
        days: "",
        reason: "",
      });
      fetchLeaves();
      fetchBalance();
    } catch (error: any) {
      console.error("Error creating leave:", error);
      toast.error(error.message || "Failed to create leave request");
    }
  };

  const handleApprove = async (leaveId: string) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/leaves/${leaveId}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/hr/login");
          return;
        }
        throw new Error("Failed to approve leave");
      }

      toast.success("Leave approved");
      fetchLeaves();
    } catch (error) {
      console.error("Error approving leave:", error);
      toast.error("Failed to approve leave");
    }
  };

  const handleReject = async () => {
    if (!selectedLeave) return;

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/leaves/${selectedLeave}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/hr/login");
          return;
        }
        throw new Error("Failed to reject leave");
      }

      toast.success("Leave rejected");
      setIsRejectDialogOpen(false);
      setSelectedLeave(null);
      setRejectionReason("");
      fetchLeaves();
    } catch (error) {
      console.error("Error rejecting leave:", error);
      toast.error("Failed to reject leave");
    }
  };

  const handleCancel = async (leaveId: string) => {
    if (!confirm("Are you sure you want to cancel this leave request?")) {
      return;
    }

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/leaves/${leaveId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/hr/login");
          return;
        }
        throw new Error("Failed to cancel leave");
      }

      toast.success("Leave cancelled");
      fetchLeaves();
      fetchBalance();
    } catch (error) {
      console.error("Error cancelling leave:", error);
      toast.error("Failed to cancel leave");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rejected</Badge>;
      case "CANCELLED":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      SICK: "bg-blue-50 text-blue-700 border-blue-300",
      CASUAL: "bg-purple-50 text-purple-700 border-purple-300",
      ANNUAL: "bg-green-50 text-green-700 border-green-300",
      MATERNITY: "bg-pink-50 text-pink-700 border-pink-300",
      PATERNITY: "bg-indigo-50 text-indigo-700 border-indigo-300",
      COMPENSATORY: "bg-orange-50 text-orange-700 border-orange-300",
      UNPAID: "bg-gray-50 text-gray-700 border-gray-300",
    };

    return (
      <Badge variant="outline" className={colors[type] || ""}>
        {type.charAt(0) + type.slice(1).toLowerCase()}
      </Badge>
    );
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      {/* Leave Balance Cards */}
      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(balance).filter(([key]) => key !== 'year').map(([type, data]: [string, any]) => (
            <Card key={type}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium capitalize">{type} Leave</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{data.remaining}</div>
                  <div className="text-xs text-muted-foreground">
                    {data.used} used / {data.total} total
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Leave Requests</CardTitle>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Request Leave
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="SICK">Sick</SelectItem>
                  <SelectItem value="CASUAL">Casual</SelectItem>
                  <SelectItem value="ANNUAL">Annual</SelectItem>
                  <SelectItem value="MATERNITY">Maternity</SelectItem>
                  <SelectItem value="PATERNITY">Paternity</SelectItem>
                  <SelectItem value="COMPENSATORY">Compensatory</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No leave requests found
                  </TableCell>
                </TableRow>
              ) : (
                leaves.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{leave.user.name}</div>
                        {leave.user.employmentInfo?.[0]?.department && (
                          <div className="text-xs text-muted-foreground">
                            {leave.user.employmentInfo[0].department.name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(leave.type)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>{leave.days} day{leave.days !== 1 ? 's' : ''}</TableCell>
                    <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                    <TableCell>{getStatusBadge(leave.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {leave.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApprove(leave.id)}
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedLeave(leave.id);
                                setIsRejectDialogOpen(true);
                              }}
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        {(leave.status === "PENDING" || leave.status === "APPROVED") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancel(leave.id)}
                            title="Cancel"
                          >
                            <XCircle className="h-4 w-4 text-gray-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Leave Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>Submit a new leave request</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="type">Leave Type</Label>
              <Select
                value={newLeave.type}
                onValueChange={(value) => setNewLeave({ ...newLeave, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SICK">Sick Leave</SelectItem>
                  <SelectItem value="CASUAL">Casual Leave</SelectItem>
                  <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                  <SelectItem value="MATERNITY">Maternity Leave</SelectItem>
                  <SelectItem value="PATERNITY">Paternity Leave</SelectItem>
                  <SelectItem value="COMPENSATORY">Compensatory Off</SelectItem>
                  <SelectItem value="UNPAID">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newLeave.startDate}
                  onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newLeave.endDate}
                  onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="days">Number of Days</Label>
              <Input
                id="days"
                type="number"
                step="0.5"
                value={newLeave.days}
                onChange={(e) => setNewLeave({ ...newLeave, days: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={newLeave.reason}
                onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                placeholder="Provide a reason for your leave"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLeave}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Leave Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>Provide a reason for rejection</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectionReason">Rejection Reason</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Why is this leave being rejected?"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
