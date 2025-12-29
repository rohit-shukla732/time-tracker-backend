'use client';

import { useState } from 'react';
import { TicketsLayout } from '@/components/tickets/TicketsLayout';
import { TicketList } from '@/components/tickets/TicketList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ticket, TicketPriority, TicketStatus, TicketCategory, Role } from '@/types';
import { Search, FileText, Clock, CheckCircle } from 'lucide-react';

export default function MyTicketsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const currentUserId = 'user-1'; // Get from auth context

  // Mock data - replace with API call filtered by user
  const allTickets: Ticket[] = [
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

  const myTickets = allTickets.filter((t) => t.createdBy === currentUserId);

  const stats = {
    total: myTickets.length,
    active: myTickets.filter(
      (t) => t.status === TicketStatus.OPEN || t.status === TicketStatus.IN_PROGRESS
    ).length,
    resolved: myTickets.filter((t) => t.status === TicketStatus.RESOLVED).length,
  };

  const filterTicketsByStatus = (status: TicketStatus | null) => {
    let filtered = myTickets;
    if (status) {
      filtered = filtered.filter((t) => t.status === status);
    }
    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  };

  return (
    <TicketsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tickets</h1>
          <p className="text-muted-foreground">View and manage your submitted tickets</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resolved}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Tickets</CardTitle>
            <CardDescription>All tickets you have created</CardDescription>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <TicketList tickets={filterTicketsByStatus(null)} />
              </TabsContent>
              <TabsContent value="open" className="mt-4">
                <TicketList tickets={filterTicketsByStatus(TicketStatus.OPEN)} />
              </TabsContent>
              <TabsContent value="in_progress" className="mt-4">
                <TicketList tickets={filterTicketsByStatus(TicketStatus.IN_PROGRESS)} />
              </TabsContent>
              <TabsContent value="pending" className="mt-4">
                <TicketList tickets={filterTicketsByStatus(TicketStatus.PENDING)} />
              </TabsContent>
              <TabsContent value="resolved" className="mt-4">
                <TicketList tickets={filterTicketsByStatus(TicketStatus.RESOLVED)} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </TicketsLayout>
  );
}
