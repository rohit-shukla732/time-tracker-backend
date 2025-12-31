'use client';

import { useState, useEffect } from 'react';
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
import { toast } from 'sonner';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
    unassigned: 0,
    urgent: 0,
    high: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/ticketing/admin/login');
        return;
      }

      const response = await fetch('/api/tickets/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/ticketing/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats({
        total: data.total || 0,
        open: data.open || 0,
        inProgress: data.inProgress || 0,
        pending: data.pending || 0,
        resolved: data.resolved || 0,
        closed: data.closed || 0,
        unassigned: 0, // TODO: Add unassigned count to API
        urgent: data.byPriority?.urgent || 0,
        high: data.byPriority?.high || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const quickStats = [
    {
      title: 'Open Tickets',
      value: stats.open,
      icon: AlertCircle,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      description: 'Need attention',
      href: '/ticketing/admin/tickets',
    },
    {
      title: 'Urgent',
      value: stats.urgent,
      icon: Ticket,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      description: 'High priority',
      href: '/ticketing/admin/tickets',
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      description: 'Being worked on',
      href: '/ticketing/admin/tickets',
    },
    {
      title: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      description: 'Completed',
      href: '/ticketing/admin/tickets',
    },
  ];

  if (loading) {
    return (
      <AdminTicketLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </AdminTicketLayout>
    );
  }

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
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Quick Overview */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Ticket Overview</CardTitle>
                  <CardDescription>Current status of all tickets in the system</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push('/ticketing/admin/tickets')}>
                  <Ticket className="mr-2 h-4 w-4" />
                  View All Tickets
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Total Tickets</span>
                    <Badge variant="secondary">{stats.total}</Badge>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Open</span>
                    <Badge className="bg-blue-500/10 text-blue-600">{stats.open}</Badge>
                  </div>
                  <Progress value={(stats.open / Math.max(stats.total, 1)) * 100} className="h-2" />
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">In Progress</span>
                    <Badge className="bg-yellow-500/10 text-yellow-600">{stats.inProgress}</Badge>
                  </div>
                  <Progress value={(stats.inProgress / Math.max(stats.total, 1)) * 100} className="h-2" />
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Resolved</span>
                    <Badge className="bg-green-500/10 text-green-600">{stats.resolved}</Badge>
                  </div>
                  <Progress value={(stats.resolved / Math.max(stats.total, 1)) * 100} className="h-2" />
                </div>
              </div>
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Priority Breakdown</p>
                    <p className="text-sm text-muted-foreground">Tickets by urgency level</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-500">{stats.urgent}</p>
                      <p className="text-xs text-muted-foreground">Urgent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-500">{stats.high}</p>
                      <p className="text-xs text-muted-foreground">High</p>
                    </div>
                  </div>
                </div>
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
                    <span className="text-muted-foreground">Resolution Rate</span>
                    <span className="font-semibold">
                      {stats.total > 0 ? Math.round(((stats.resolved + stats.closed) / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  <Progress value={stats.total > 0 ? ((stats.resolved + stats.closed) / stats.total) * 100 : 0} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.resolved + stats.closed} of {stats.total} tickets resolved
                  </p>
                </div>
                <div className="h-px bg-border" />
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Active Tickets</span>
                    <span className="font-semibold">{stats.open + stats.inProgress + stats.pending}</span>
                  </div>
                  <Progress value={stats.total > 0 ? ((stats.open + stats.inProgress + stats.pending) / stats.total) * 100 : 0} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.open + stats.inProgress + stats.pending} tickets in progress
                  </p>
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
            <div className="grid gap-3 md:grid-cols-3">
              <Button 
                variant="outline" 
                className="justify-start h-auto py-4"
                onClick={() => router.push('/ticketing/admin/tickets')}
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-semibold">Open Tickets</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{stats.open} need attention</span>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminTicketLayout>
  );
}
