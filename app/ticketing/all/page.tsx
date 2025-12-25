'use client';

import { useState, useEffect } from 'react';
import { TicketsLayout } from '@/components/tickets/TicketsLayout';
import { TicketList } from '@/components/tickets/TicketList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ticket, TicketStatus, TicketPriority, TicketCategory } from '@/types';
import { Search, Filter, ListFilter } from 'lucide-react';

export default function AllTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Mock data - replace with API call
  useEffect(() => {
    const loadAllTickets = async () => {
      setLoading(true);

      // Simulate API call
      setTimeout(() => {
        const mockTickets: Ticket[] = [
          {
            id: '1',
            title: 'Login page not working on mobile',
            description: 'Users are unable to log in from mobile devices.',
            priority: TicketPriority.URGENT,
            status: TicketStatus.OPEN,
            category: TicketCategory.TECHNICAL,
            createdBy: 'user-1',
            assignedTo: null,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            resolvedAt: null,
            creator: { id: 'user-1', name: 'John Doe', email: 'john@example.com', role: 'EMPLOYEE', teamId: null, createdAt: new Date(), updatedAt: new Date() },
          },
          {
            id: '2',
            title: 'Need access to HR portal',
            description: 'I need access to the HR portal.',
            priority: TicketPriority.MEDIUM,
            status: TicketStatus.IN_PROGRESS,
            category: TicketCategory.HR,
            createdBy: 'user-2',
            assignedTo: 'admin-1',
            createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            resolvedAt: null,
            creator: { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com', role: 'EMPLOYEE', teamId: null, createdAt: new Date(), updatedAt: new Date() },
            assignee: { id: 'admin-1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN', teamId: null, createdAt: new Date(), updatedAt: new Date() },
          },
          {
            id: '3',
            title: 'Air conditioning not working',
            description: 'AC unit in conference room 301 is not functioning.',
            priority: TicketPriority.HIGH,
            status: TicketStatus.OPEN,
            category: TicketCategory.FACILITIES,
            createdBy: 'user-3',
            assignedTo: null,
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            resolvedAt: null,
            creator: { id: 'user-3', name: 'Mike Johnson', email: 'mike@example.com', role: 'MANAGER', teamId: null, createdAt: new Date(), updatedAt: new Date() },
          },
          {
            id: '4',
            title: 'Request for new keyboard',
            description: 'Current keyboard is not working properly.',
            priority: TicketPriority.LOW,
            status: TicketStatus.RESOLVED,
            category: TicketCategory.IT_SUPPORT,
            createdBy: 'user-4',
            assignedTo: 'admin-2',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            creator: { id: 'user-4', name: 'Sarah Williams', email: 'sarah@example.com', role: 'EMPLOYEE', teamId: null, createdAt: new Date(), updatedAt: new Date() },
            assignee: { id: 'admin-2', name: 'IT Support', email: 'it@example.com', role: 'ADMIN', teamId: null, createdAt: new Date(), updatedAt: new Date() },
          },
        ];

        setTickets(mockTickets);
        setFilteredTickets(mockTickets);
        setLoading(false);
      }, 500);
    };

    loadAllTickets();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = tickets;

    // Search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(query) ||
          ticket.description.toLowerCase().includes(query) ||
          ticket.creator?.name.toLowerCase().includes(query)
      );
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((ticket) => ticket.priority === priorityFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((ticket) => ticket.category === categoryFilter);
    }

    setFilteredTickets(filtered);
  }, [searchQuery, priorityFilter, categoryFilter, tickets]);

  const filterTicketsByStatus = (status: TicketStatus | 'all') => {
    if (status === 'all') return filteredTickets;
    return filteredTickets.filter((ticket) => ticket.status === status);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setCategoryFilter('all');
  };

  const hasActiveFilters =
    searchQuery !== '' || priorityFilter !== 'all' || categoryFilter !== 'all';

  return (
    <TicketsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ListFilter className="h-8 w-8" />
            All Tickets
          </h1>
          <p className="text-muted-foreground">
            Browse and filter all support tickets in the system
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>Search and filter tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, description, or creator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Priority Filter */}
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value={TicketPriority.URGENT}>Urgent</SelectItem>
                  <SelectItem value={TicketPriority.HIGH}>High</SelectItem>
                  <SelectItem value={TicketPriority.MEDIUM}>Medium</SelectItem>
                  <SelectItem value={TicketPriority.LOW}>Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value={TicketCategory.TECHNICAL}>Technical</SelectItem>
                  <SelectItem value={TicketCategory.IT_SUPPORT}>IT Support</SelectItem>
                  <SelectItem value={TicketCategory.HR}>HR</SelectItem>
                  <SelectItem value={TicketCategory.FACILITIES}>Facilities</SelectItem>
                  <SelectItem value={TicketCategory.PAYROLL}>Payroll</SelectItem>
                  <SelectItem value={TicketCategory.LEAVE}>Leave</SelectItem>
                  <SelectItem value={TicketCategory.OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mt-4">
                {searchQuery && (
                  <Badge variant="secondary">
                    Search: {searchQuery}
                  </Badge>
                )}
                {priorityFilter !== 'all' && (
                  <Badge variant="secondary">
                    Priority: {priorityFilter}
                  </Badge>
                )}
                {categoryFilter !== 'all' && (
                  <Badge variant="secondary">
                    Category: {categoryFilter}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tickets List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Tickets ({filteredTickets.length})
            </CardTitle>
            <CardDescription>
              Showing {filteredTickets.length} of {tickets.length} total tickets
            </CardDescription>
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
                <TicketList tickets={filterTicketsByStatus('all')} />
              </TabsContent>
              <TabsContent value="open" className="mt-6">
                <TicketList
                  tickets={filterTicketsByStatus(TicketStatus.OPEN)}
                  emptyMessage="No open tickets found"
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
