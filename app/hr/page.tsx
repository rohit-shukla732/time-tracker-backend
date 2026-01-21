"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface Stats {
  totalEmployees: number;
  employeesWithBalance: number;
  employeesWithoutBalance: number;
  pendingLeaves: number;
  leavesThisMonth: number;
  approvedThisMonth: number;
  leaveUsageByType: {
    sickUsed: number;
    casualUsed: number;
    annualUsed: number;
    maternityUsed: number;
    paternityUsed: number;
    compensatoryUsed: number;
  };
}

export default function HRDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("/api/hr/stats", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/hr/login");
          return;
        }
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data.stats);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching stats:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">HR Dashboard</h1>
          <p className="text-muted-foreground">
            Manage employees, leaves, and HR operations
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEmployees || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.employeesWithBalance || 0} with leave balance configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingLeaves || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.leavesThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.approvedThisMonth || 0} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Setup Required</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.employeesWithoutBalance || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Employees need balance setup
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Usage Overview */}
      {stats?.leaveUsageByType && (
        <Card>
          <CardHeader>
            <CardTitle>Leave Usage This Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Sick Leave</p>
                <p className="text-2xl font-bold">{stats.leaveUsageByType.sickUsed || 0}</p>
                <p className="text-xs text-muted-foreground">days used</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Casual Leave</p>
                <p className="text-2xl font-bold">{stats.leaveUsageByType.casualUsed || 0}</p>
                <p className="text-xs text-muted-foreground">days used</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Annual Leave</p>
                <p className="text-2xl font-bold">{stats.leaveUsageByType.annualUsed || 0}</p>
                <p className="text-xs text-muted-foreground">days used</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Maternity</p>
                <p className="text-2xl font-bold">{stats.leaveUsageByType.maternityUsed || 0}</p>
                <p className="text-xs text-muted-foreground">days used</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Paternity</p>
                <p className="text-2xl font-bold">{stats.leaveUsageByType.paternityUsed || 0}</p>
                <p className="text-xs text-muted-foreground">days used</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Comp Off</p>
                <p className="text-2xl font-bold">{stats.leaveUsageByType.compensatoryUsed || 0}</p>
                <p className="text-xs text-muted-foreground">days used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/hr/employees">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Manage Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View and manage employee leave balances, configure quotas, and track usage
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/hr/leaves">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Leave Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Review and approve pending leave requests, view leave history
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/hr/settings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                HR Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure default leave quotas, policies, and bulk operations
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Warning for unconfigured employees */}
      {stats && stats.employeesWithoutBalance > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <AlertCircle className="h-5 w-5" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-900 mb-4">
              {stats.employeesWithoutBalance} employee(s) don&apos;t have leave balances configured for this year.
              Initialize leave balances to enable leave management.
            </p>
            <Link href="/hr/employees">
              <Button variant="default" size="sm">
                Configure Leave Balances
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
