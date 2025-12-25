'use client';

import { TicketsLayout } from '@/components/tickets/TicketsLayout';
import { TicketStatsCards, PriorityStats } from '@/components/tickets/TicketStats';
import { TicketList } from '@/components/tickets/TicketList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ticket, TicketStats, TicketStatus, TicketPriority, TicketCategory, Role } from '@/types';
import { Plus, Filter, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';

export default function TicketsDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    byPriority: {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    },
    byCategory: {},
  });

  // Mock data for demonstration - replace with API call
  useEffect(() => {
    const loadTickets = async () => {
      setLoading(true);
      
      // Simulate API call with mock data
      setTimeout(() => {
        const mockTickets: Ticket[] = [
          {
            id: '1',
            title: 'Login page not working on mobile',
            description: 'Users are unable to log in from mobile devices. The login button does not respond to touches.',
            priority: TicketPriority.URGENT,
            status: TicketStatus.OPEN,
            category: TicketCategory.TECHNICAL,
            createdBy: 'user-1',
            assignedTo: null,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            resolvedAt: null,
            creator: { id: 'user-1', name: 'John Doe', email: 'john@example.com', role: Role.EMPLOYEE, teamId: null, createdAt: new Date(), updatedAt: new Date() },
          },
          {
            id: '2',
            title: 'Need access to HR portal',
            description: 'I need access to the HR portal to update my personal information and view payslips.',
            priority: TicketPriority.MEDIUM,
            status: TicketStatus.IN_PROGRESS,
            category: TicketCategory.HR,
            createdBy: 'user-2',
            assignedTo: 'admin-1',
            createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
            updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            resolvedAt: null,
            creator: { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com', role: Role.EMPLOYEE, teamId: null, createdAt: new Date(), updatedAt: new Date() },
            assignee: { id: 'admin-1', name: 'Admin User', email: 'admin@example.com', role: Role.ADMIN, teamId: null, createdAt: new Date(), updatedAt: new Date() },
          },
          {
            id: '3',
            title: 'Air conditioning not working in Room 301',
            description: 'The AC unit in conference room 301 is not functioning. The room temperature is uncomfortably high.',
            priority: TicketPriority.HIGH,
            status: TicketStatus.OPEN,
            category: TicketCategory.FACILITIES,
            createdBy: 'user-3',
            assignedTo: null,
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
            updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            resolvedAt: null,
            creator: { id: 'user-3', name: 'Mike Johnson', email: 'mike@example.com', role: Role.MANAGER, teamId: null, createdAt: new Date(), updatedAt: new Date() },
          },
          {
            id: '4',
            title: 'Request for new keyboard',
            description: 'My current keyboard is not working properly. Several keys are stuck and it is affecting my productivity.',
            priority: TicketPriority.LOW,
            status: TicketStatus.RESOLVED,
            category: TicketCategory.IT_SUPPORT,
            createdBy: 'user-4',
            assignedTo: 'admin-2',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            creator: { id: 'user-4', name: 'Sarah Williams', email: 'sarah@example.com', role: Role.EMPLOYEE, teamId: null, createdAt: new Date(), updatedAt: new Date() },
            assignee: { id: 'admin-2', name: 'IT Support', email: 'it@example.com', role: Role.ADMIN, teamId: null, createdAt: new Date(), updatedAt: new Date() },
          },
          {
            id: '5',
            title: 'Payroll discrepancy for November',
            description: 'There appears to be an error in my November payroll. The overtime hours are not calculated correctly.',
            priority: TicketPriority.HIGH,
            status: TicketStatus.IN_PROGRESS,
            category: TicketCategory.PAYROLL,
            createdBy: 'user-5',
            assignedTo: 'admin-3',
            createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
            updatedAt: new Date(Date.now() - 30 * 60 * 1000),
            resolvedAt: null,
            creator: { id: 'user-5', name: 'Robert Brown', email: 'robert@example.com', role: Role.EMPLOYEE, teamId: null, createdAt: new Date(), updatedAt: new Date() },
            assignee: { id: 'admin-3', name: 'HR Manager', email: 'hr@example.com', role: Role.HR, teamId: null, createdAt: new Date(), updatedAt: new Date() },
          },
          {
            id: '6',
            title: 'Leave request approval pending',
            description: 'I submitted a leave request two weeks ago but have not received any response yet.',
            priority: TicketPriority.MEDIUM,
            status: TicketStatus.PENDING,
            category: TicketCategory.LEAVE,
            createdBy: 'user-6',
            assignedTo: 'admin-3',
            createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
            updatedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
            resolvedAt: null,
            creator: { id: 'user-6', name: 'Emily Davis', email: 'emily@example.com', role: Role.EMPLOYEE, teamId: null, createdAt: new Date(), updatedAt: new Date() },
            assignee: { id: 'admin-3', name: 'HR Manager', email: 'hr@example.com', role: Role.HR, teamId: null, createdAt: new Date(), updatedAt: new Date() },
          },
        ];

        setTickets(mockTickets);
        setFilteredTickets(mockTickets);

        // Calculate stats
        const calculatedStats: TicketStats = {
          total: mockTickets.length,
          open: mockTickets.filter(t => t.status === TicketStatus.OPEN).length,
          inProgress: mockTickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length,
          resolved: mockTickets.filter(t => t.status === TicketStatus.RESOLVED).length,
          byPriority: {
            low: mockTickets.filter(t => t.priority === TicketPriority.LOW).length,
            medium: mockTickets.filter(t => t.priority === TicketPriority.MEDIUM).length,
            high: mockTickets.filter(t => t.priority === TicketPriority.HIGH).length,
            urgent: mockTickets.filter(t => t.priority === TicketPriority.URGENT).length,
          },
          byCategory: mockTickets.reduce((acc, ticket) => {
            acc[ticket.category] = (acc[ticket.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        };

        setStats(calculatedStats);
        setLoading(false);
      }, 500);
    };

    loadTickets();
  }, []);

  // Filter tickets based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTickets(tickets);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = tickets.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(query) ||
          ticket.description.toLowerCase().includes(query) ||
          ticket.category.toLowerCase().includes(query)
      );
      setFilteredTickets(filtered);
    }
  }, [searchQuery, tickets]);

  const filterTicketsByStatus = (status: TicketStatus | 'all') => {
    if (status === 'all') return filteredTickets;
    return filteredTickets.filter((ticket) => ticket.status === status);
  };

  return (
    <TicketsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ticket Dashboard</h1>
            <p className="text-muted-foreground">
              Manage and track all support tickets
            </p>
          </div>
          <Button onClick={() => router.push('/ticketing/new')} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </div>

        {/* Stats Cards */}
        <TicketStatsCards stats={stats} loading={loading} />

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Tickets List - Takes 2 columns */}
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Tickets</CardTitle>
                    <CardDescription>
                      View and manage support tickets
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="open">Open</TabsTrigger>
                    <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="resolved">Resolved</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="mt-6">
                    <TicketList tickets={filterTicketsByStatus('all')} />
                  </TabsContent>
                  <TabsContent value="open" className="mt-6">
                    <TicketList 
                      tickets={filterTicketsByStatus(TicketStatus.OPEN)} 
                      emptyMessage="No open tickets"
                    />
                  </TabsContent>
                  <TabsContent value="in-progress" className="mt-6">
                    <TicketList 
                      tickets={filterTicketsByStatus(TicketStatus.IN_PROGRESS)} 
                      emptyMessage="No tickets in progress"
                    />
                  </TabsContent>
                  <TabsContent value="pending" className="mt-6">
                    <TicketList 
                      tickets={filterTicketsByStatus(TicketStatus.PENDING)} 
                      emptyMessage="No pending tickets"
                    />
                  </TabsContent>
                  <TabsContent value="resolved" className="mt-6">
                    <TicketList 
                      tickets={filterTicketsByStatus(TicketStatus.RESOLVED)} 
                      emptyMessage="No resolved tickets"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Takes 1 column */}
          <div className="space-y-4">
            <PriorityStats stats={stats} />

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats.byCategory).map(([category, count]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium">{category}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TicketsLayout>
  );
}
