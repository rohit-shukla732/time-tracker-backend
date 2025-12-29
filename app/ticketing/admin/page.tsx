'use client';

import { useState } from 'react';
import { AdminTicketLayout } from '@/components/tickets/AdminTicketLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Ticket, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  Users,
  TrendingUp,
  ArrowRight,
  UserPlus,
  BarChart3,
  Filter,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from '@/lib/utils';

export default function AdminDashboard() {
  const router = useRouter();
  const stats = {
    total: 24,
    open: 8,
    inProgress: 6,
    pending: 3,
    resolved: 7,
    unassigned: 5,
    urgent: 3,
    highPriority: 7,
  };

  const quickStats = [
    {
      title: 'Unassigned',
      value: stats.unassigned,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      description: 'Need attention',
      change: '+2 from yesterday',
      href: '/ticketing/admin/tickets',
    },
    {
      title: 'Urgent',
      value: stats.urgent,
      icon: Ticket,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      description: 'High priority',
      change: '+1 from yesterday',
      href: '/ticketing/admin/tickets',
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: Clock,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      description: 'Being worked on',
      change: 'Same as yesterday',
      href: '/ticketing/admin/tickets',
    },
    {
      title: 'Resolved Today',
      value: stats.resolved,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      description: 'Completed',
      change: '+3 from yesterday',
      href: '/ticketing/admin/tickets',
    },
  ];

  const recentActivity = [
    {
      id: '1',
      action: 'created',
      ticket: 'Login page not working on mobile',
      user: { name: 'John Doe', initials: 'JD' },
      time: new Date(Date.now() - 2 * 60 * 60 * 1000),
      priority: 'URGENT',
      type: 'new',
    },
    {
      id: '2',
      action: 'assigned to HR Manager',
      ticket: 'Payroll discrepancy for November',
      user: { name: 'Admin User', initials: 'AU' },
      time: new Date(Date.now() - 3 * 60 * 60 * 1000),
      priority: 'HIGH',
      type: 'assigned',
    },
    {
      id: '3',
      action: 'resolved',
      ticket: 'Request for new keyboard',
      user: { name: 'IT Support', initials: 'IS' },
      time: new Date(Date.now() - 5 * 60 * 60 * 1000),
      priority: 'LOW',
      type: 'resolved',
    },
    {
      id: '4',
      action: 'updated',
      ticket: 'Office AC not working',
      user: { name: 'Jane Smith', initials: 'JS' },
      time: new Date(Date.now() - 7 * 60 * 60 * 1000),
      priority: 'HIGH',
      type: 'updated',
    },
    {
      id: '5',
      action: 'commented on',
      ticket: 'Leave application pending',
      user: { name: 'HR Manager', initials: 'HM' },
      time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      priority: 'MEDIUM',
      type: 'comment',
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500/10 text-red-600 border-red-200 dark:text-red-400';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-600 border-orange-200 dark:text-orange-400';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:text-yellow-400';
      case 'LOW':
        return 'bg-green-500/10 text-green-600 border-green-200 dark:text-green-400';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'new':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'assigned':
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'updated':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'comment':
        return <TrendingUp className="h-4 w-4 text-orange-500" />;
      default:
        return <Ticket className="h-4 w-4" />;
    }
  };

  return (
    <AdminTicketLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IT Support Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and monitor all IT support tickets
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
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
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {stat.change}
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates and actions on tickets</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push('/ticketing/admin/tickets')}>
                  <Filter className="mr-2 h-4 w-4" />
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="mt-1">
                      {getActionIcon(activity.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {activity.user.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{activity.user.name}</span>
                        <span className="text-sm text-muted-foreground">{activity.action}</span>
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(activity.priority)}`}>
                          {activity.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.ticket}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(activity.time)}
                      </p>
                    </div>
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
                <CardDescription>Current status breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Tickets</span>
                    <span className="font-bold text-lg">{stats.total}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span>Open</span>
                      </div>
                      <span className="font-semibold">{stats.open}</span>
                    </div>
                    <Progress value={(stats.open / stats.total) * 100} className="h-1" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        <span>In Progress</span>
                      </div>
                      <span className="font-semibold">{stats.inProgress}</span>
                    </div>
                    <Progress value={(stats.inProgress / stats.total) * 100} className="h-1" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        <span>Pending</span>
                      </div>
                      <span className="font-semibold">{stats.pending}</span>
                    </div>
                    <Progress value={(stats.pending / stats.total) * 100} className="h-1" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span>Resolved</span>
                      </div>
                      <span className="font-semibold">{stats.resolved}</span>
                    </div>
                    <Progress value={(stats.resolved / stats.total) * 100} className="h-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Avg Response Time</span>
                    <span className="font-semibold">2.5 hrs</span>
                  </div>
                  <Progress value={75} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">25% faster than last week</p>
                </div>
                <div className="h-px bg-border" />
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Resolution Rate</span>
                    <span className="font-semibold">85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">+5% from last month</p>
                </div>
                <div className="h-px bg-border" />
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Customer Satisfaction</span>
                    <span className="font-semibold">4.7/5.0</span>
                  </div>
                  <Progress value={94} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">Based on 156 ratings</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Team Workload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">AU</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">Admin User</p>
                    <p className="text-xs text-muted-foreground">4 active tickets</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">HM</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">HR Manager</p>
                    <p className="text-xs text-muted-foreground">2 active tickets</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => router.push('/ticketing/admin/users')}>
                  <Users className="mr-2 h-4 w-4" />
                  View All Users
                </Button>
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
                className="justify-start h-auto py-4"
                onClick={() => router.push('/ticketing/admin/tickets')}
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-semibold">Assign Tickets</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{stats.unassigned} unassigned</span>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-4"
                onClick={() => router.push('/ticketing/admin/tickets')}
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    <span className="font-semibold">All Tickets</span>
                  </div>
                  <span className="text-xs text-muted-foreground">View & manage all</span>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-4"
                onClick={() => router.push('/ticketing/admin/reports')}
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="font-semibold">Reports</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Analytics & insights</span>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-4"
                onClick={() => router.push('/ticketing/admin/users')}
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="font-semibold">Users</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Manage team</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminTicketLayout>
  );
}
