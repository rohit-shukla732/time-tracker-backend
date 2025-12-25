'use client';

import { useState, useEffect } from 'react';
import { AdminTicketLayout } from '@/components/tickets/AdminTicketLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Ticket, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  Users,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    total: 6,
    open: 2,
    inProgress: 2,
    pending: 1,
    resolved: 1,
    unassigned: 2,
    urgent: 1,
    highPriority: 2,
  });

  const quickStats = [
    {
      title: 'Unassigned',
      value: stats.unassigned,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      href: '/ticketing/admin/tickets?filter=unassigned',
    },
    {
      title: 'Urgent',
      value: stats.urgent,
      icon: Ticket,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      href: '/ticketing/admin/tickets?filter=urgent',
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      href: '/ticketing/admin/tickets?filter=in-progress',
    },
    {
      title: 'Resolved Today',
      value: stats.resolved,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      href: '/ticketing/admin/tickets?filter=resolved',
    },
  ];

  const recentActivity = [
    {
      id: '1',
      action: 'New ticket created',
      ticket: 'Login page not working on mobile',
      user: 'John Doe',
      time: '2 hours ago',
      priority: 'URGENT',
    },
    {
      id: '2',
      action: 'Ticket assigned',
      ticket: 'Payroll discrepancy for November',
      user: 'HR Manager',
      time: '3 hours ago',
      priority: 'HIGH',
    },
    {
      id: '3',
      action: 'Ticket resolved',
      ticket: 'Request for new keyboard',
      user: 'IT Support',
      time: '5 hours ago',
      priority: 'LOW',
    },
  ];

  return (
    <AdminTicketLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and monitor all support tickets
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(stat.href)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    View details
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Activity Feed */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates and actions on tickets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{activity.action}</p>
                        <Badge variant="outline" className="text-xs">
                          {activity.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {activity.ticket}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{activity.user}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{activity.time}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ticket Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Tickets</span>
                    <span className="font-bold">{stats.total}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Open</span>
                    <span className="font-semibold text-blue-600">{stats.open}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">In Progress</span>
                    <span className="font-semibold text-yellow-600">{stats.inProgress}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-semibold text-orange-600">{stats.pending}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Resolved</span>
                    <span className="font-semibold text-green-600">{stats.resolved}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Avg Response Time</span>
                    <span className="font-semibold">2.5 hrs</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-3/4"></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Resolution Rate</span>
                    <span className="font-semibold">85%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-4/5"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => router.push('/ticketing/admin/tickets?filter=unassigned')}
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Assign Tickets
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => router.push('/ticketing/admin/tickets')}
              >
                <Ticket className="mr-2 h-4 w-4" />
                View All Tickets
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => router.push('/ticketing/admin/reports')}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => router.push('/ticketing/admin/users')}
              >
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminTicketLayout>
  );
}
