'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TicketsLayout } from '@/components/tickets/TicketsLayout';
import { TicketList } from '@/components/tickets/TicketList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ticket, TicketPriority, TicketStatus, TicketCategory, Role } from '@/types';
import { Search, FileText, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function MyTicketsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const fetchMyTickets = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/ticketing/employee/login');
        return;
      }

      const response = await fetch('/api/tickets', {
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
        router.push('/ticketing/employee/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const tickets = await response.json();
      setMyTickets(tickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

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

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your tickets...</p>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </TicketsLayout>
  );
}
