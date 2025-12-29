'use client';

import { useRouter } from 'next/navigation';
import { TicketsLayout } from '@/components/tickets/TicketsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket, TicketPriority, TicketStatus, TicketCategory, Role } from '@/types';
import { Plus, Clock, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils';

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const currentUserId = 'user-1'; // Get from auth context

  // Mock data - only showing current user's tickets
  const myTickets: Ticket[] = [
    {
      id: '1',
      title: 'Cannot access payroll system',
      description: 'Getting 404 error when trying to access payroll',
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      category: TicketCategory.IT_SUPPORT,
      createdBy: 'user-1',
      assignedTo: null,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      resolvedAt: null,
      creator: { id: 'user-1', name: 'John Doe', email: 'john@example.com', role: Role.EMPLOYEE, teamId: null, createdAt: new Date(), updatedAt: new Date() },
    },
    {
      id: '4',
      title: 'Leave application pending',
      description: 'My leave application has been pending for 2 weeks',
      priority: TicketPriority.HIGH,
      status: TicketStatus.PENDING,
      category: TicketCategory.IT_SUPPORT,
      createdBy: 'user-1',
      assignedTo: 'hr-1',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      resolvedAt: null,
      creator: { id: 'user-1', name: 'John Doe', email: 'john@example.com', role: Role.EMPLOYEE, teamId: null, createdAt: new Date(), updatedAt: new Date() },
      assignee: { id: 'hr-1', name: 'HR Manager', email: 'hr@example.com', role: Role.HR, teamId: null, createdAt: new Date(), updatedAt: new Date() },
    },
  ];

  const stats = {
    total: myTickets.length,
    open: myTickets.filter((t) => t.status === TicketStatus.OPEN || t.status === TicketStatus.PENDING).length,
    inProgress: myTickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
    resolved: myTickets.filter((t) => t.status === TicketStatus.RESOLVED).length,
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.URGENT:
        return 'destructive';
      case TicketPriority.HIGH:
        return 'default';
      case TicketPriority.MEDIUM:
        return 'secondary';
      case TicketPriority.LOW:
        return 'outline';
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case TicketStatus.IN_PROGRESS:
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      case TicketStatus.PENDING:
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
      case TicketStatus.RESOLVED:
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case TicketStatus.CLOSED:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <TicketsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
            <p className="text-muted-foreground">Manage your IT support tickets</p>
          </div>
          <Button size="lg" onClick={() => router.push('/ticketing/employee/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Ticket
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All your tickets</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.open}</div>
              <p className="text-xs text-muted-foreground">Waiting for response</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
              <p className="text-xs text-muted-foreground">Being worked on</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resolved}</div>
              <p className="text-xs text-muted-foreground">Completed tickets</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Recent Tickets</CardTitle>
                <CardDescription>Track the status of your support requests</CardDescription>
              </div>
              <Button variant="outline" onClick={() => router.push('/ticketing/employee/my-tickets')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {myTickets.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No tickets yet</h3>
                <p className="text-muted-foreground mt-2">Create your first ticket to get started</p>
                <Button className="mt-4" onClick={() => router.push('/ticketing/employee/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Ticket
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {myTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/ticketing/employee/${ticket.id}`)}
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{ticket.title}</h3>
                        <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">
                          {ticket.priority}
                        </Badge>
                        <Badge className={getStatusColor(ticket.status)} variant="outline">
                          {ticket.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {ticket.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(ticket.createdAt))}
                        </span>
                        {ticket.assignee && (
                          <span>Assigned to {ticket.assignee.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => router.push('/ticketing/employee/new')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Ticket
              </CardTitle>
              <CardDescription>Submit a new support request</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => router.push('/ticketing/employee/my-tickets')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                View All My Tickets
              </CardTitle>
              <CardDescription>See all your submitted tickets</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </TicketsLayout>
  );
}
