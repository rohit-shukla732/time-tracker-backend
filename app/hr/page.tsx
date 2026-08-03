"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HRDashboard() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">HR Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome to the HR Dashboard. Start managing Attendance and Salary by selecting an option.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mt-8">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Coming Soon</div>
            <p className="text-xs text-muted-foreground">
              Manage daily employee attendance and tracking
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Coming Soon</div>
            <p className="text-xs text-muted-foreground">
              Manage payroll, deductions, and salary slips
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}