'use client';

import { useState, useEffect } from 'react';
import { TicketsLayout } from '@/components/tickets/TicketsLayout';
import { TicketList } from '@/components/tickets/TicketList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Ticket, TicketStatus, TicketPriority, TicketCategory, Role } from '@/types';
import { Search, Plus, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MyTicketsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - replace with API call
  useEffect(() => {
    const loadMyTickets = async () => {
      setLoading(true);

      // Simulate API call with mock data
      // In real app: fetch('/api/tickets/my-tickets')
      setTimeout(() => {
        const mockTickets: Ticket[] = [
          {
            id: '1',
            title: 'Login page not working on mobile',
            description: 'Users are unable to log in from mobile devices.',
            priority: TicketPriority.URGENT,
            status: TicketStatus.OPEN,
            category: TicketCategory.TECHNICAL,
            createdBy: 'current-user',
            assignedTo: null,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            resolvedAt: null,
            creator: { 
              id: 'current-user', 
              name: 'You', 
              email: 'you@example.com', 
              role: Role.EMPLOYEE, 
              teamId: null, 
              createdAt: new Date(), 
              updatedAt: new Date() 
            },
          },
          {
            id: '4',
            title: 'Request for new keyboard',
            description: 'My current keyboard is not working properly.',
            priority: TicketPriority.LOW,
            status: TicketStatus.RESOLVED,
            category: TicketCategory.IT_SUPPORT,
            createdBy: 'current-user',
            assignedTo: 'admin-2',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            creator: { 
              id: 'current-user', 
              name: 'You', 
              email: 'you@example.com', 
              role: Role.EMPLOYEE, 
              teamId: null, 
              createdAt: new Date(), 
              updatedAt: new Date() 
            },
            assignee: { 
              id: 'admin-2', 
              name: 'IT Support', 
              email: 'it@example.com', 
              role: Role.ADMIN, 
              teamId: null, 
              createdAt: new Date(), 
              updatedAt: new Date() 
            },
          },
        ];

        setTickets(mockTickets);
        setFilteredTickets(mockTickets);
        setLoading(false);
      }, 500);
    };

    loadMyTickets();
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
          ticket.description.toLowerCase().includes(query)
      );
      setFilteredTickets(filtered);
    }
  }, [searchQuery, tickets]);

  const filterTicketsByStatus = (status: TicketStatus | 'all') => {
    if (status === 'all') return filteredTickets;
    return filteredTickets.filter((ticket) => ticket.status === status);
  };

  const activeTicketsCount = tickets.filter(
    (t) => t.status === TicketStatus.OPEN || t.status === TicketStatus.IN_PROGRESS
  ).length;

  return (
    <TicketsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <User className="h-8 w-8" />
              My Tickets
            </h1>
            <p className="text-muted-foreground">
              View and manage your submitted tickets
            </p>
          </div>
          <Button onClick={() => router.push('/ticketing/new')} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tickets.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTicketsCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tickets.filter((t) => t.status === TicketStatus.RESOLVED).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tickets List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Tickets</CardTitle>
                <CardDescription>All tickets you have submitted</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">
                  All ({filteredTickets.length})
                </TabsTrigger>
                <TabsTrigger value="open">
                  Open ({filterTicketsByStatus(TicketStatus.OPEN).length})
                </TabsTrigger>
                <TabsTrigger value="in-progress">
                  In Progress ({filterTicketsByStatus(TicketStatus.IN_PROGRESS).length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({filterTicketsByStatus(TicketStatus.PENDING).length})
                </TabsTrigger>
                <TabsTrigger value="resolved">
                  Resolved ({filterTicketsByStatus(TicketStatus.RESOLVED).length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-6">
                <TicketList 
                  tickets={filterTicketsByStatus('all')} 
                  emptyMessage="You haven't created any tickets yet"
                />
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
    </TicketsLayout>
  );
}
