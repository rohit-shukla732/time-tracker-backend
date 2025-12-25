'use client';

import { useState, useEffect } from 'react';
import { AdminTicketLayout } from '@/components/tickets/AdminTicketLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Ticket, TicketStatus, TicketPriority, TicketCategory, Role } from '@/types';
import { Search, Filter, UserPlus, Eye, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from '@/lib/utils';

export default function AdminTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Mock data
  useEffect(() => {
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
        creator: { id: 'user-1', name: 'John Doe', email: 'john@example.com', role: Role.EMPLOYEE, teamId: null, createdAt: new Date(), updatedAt: new Date() },
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
        creator: { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com', role: Role.EMPLOYEE, teamId: null, createdAt: new Date(), updatedAt: new Date() },
        assignee: { id: 'admin-1', name: 'Admin User', email: 'admin@example.com', role: Role.ADMIN, teamId: null, createdAt: new Date(), updatedAt: new Date() },
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
        creator: { id: 'user-3', name: 'Mike Johnson', email: 'mike@example.com', role: Role.MANAGER, teamId: null, createdAt: new Date(), updatedAt: new Date() },
      },
    ];

    setTickets(mockTickets);
    setFilteredTickets(mockTickets);
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = tickets;

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(query) ||
          ticket.creator?.name.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter((ticket) => ticket.priority === priorityFilter);
    }

    setFilteredTickets(filtered);
  }, [searchQuery, statusFilter, priorityFilter, tickets]);

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.URGENT:
        return 'bg-red-500/10 text-red-600 dark:text-red-400';
      case TicketPriority.HIGH:
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
      case TicketPriority.MEDIUM:
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      case TicketPriority.LOW:
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
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

  const getInitials = (name: string) => {
    return name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const handleAssignToMe = async (ticketId: string) => {
    // TODO: Implement assign to me
    console.log('Assign ticket', ticketId, 'to me');
  };

  return (
    <AdminTicketLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ticket Management</h1>
          <p className="text-muted-foreground">
            View, assign, and manage all support tickets
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
                <CardDescription>Search and filter tickets</CardDescription>
              </div>
              <Badge variant="secondary">{filteredTickets.length} tickets</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or creator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value={TicketStatus.OPEN}>Open</SelectItem>
                  <SelectItem value={TicketStatus.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={TicketStatus.PENDING}>Pending</SelectItem>
                  <SelectItem value={TicketStatus.RESOLVED}>Resolved</SelectItem>
                  <SelectItem value={TicketStatus.CLOSED}>Closed</SelectItem>
                </SelectContent>
              </Select>

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
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No tickets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">#{ticket.id}</TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="font-medium truncate">{ticket.title}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {ticket.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(ticket.creator?.name || '')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{ticket.creator?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ticket.assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getInitials(ticket.assignee.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{ticket.assignee.name}</span>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAssignToMe(ticket.id)}
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Assign to me
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(ticket.createdAt))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/ticketing/admin/tickets/${ticket.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminTicketLayout>
  );
}
