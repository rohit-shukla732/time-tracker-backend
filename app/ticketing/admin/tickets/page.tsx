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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Ticket, TicketStatus, TicketPriority, TicketCategory, Role, ITSupportSubcategory } from '@/types';
import { Search, Filter, UserPlus, Eye, Edit, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from '@/lib/utils';
import { toast } from 'sonner';
import { makeAuthenticatedRequest, setupAutoRefresh } from '@/lib/adminAuth';

export default function AdminTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [itTeamMembers, setItTeamMembers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [assigningNumbers, setAssigningNumbers] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchItTeam();

    // Setup automatic token refresh for admin
    const cleanupTokenRefresh = setupAutoRefresh();

    return () => cleanupTokenRefresh();
  }, []);

  const fetchItTeam = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await makeAuthenticatedRequest('/api/users/it-team');

      if (response.ok) {
        const data = await response.json();
        setItTeamMembers(data);
      }
    } catch (error) {
      console.error('Error fetching IT team:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/ticketing/admin/login');
        return;
      }

      const response = await makeAuthenticatedRequest('/api/tickets');

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/ticketing/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const data = await response.json();
      setTickets(data);
      setFilteredTickets(data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    const ticket = tickets.find(t => t.id === ticketId);
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/ticketing/admin/login');
        return;
      }

      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          resolvedAt: newStatus === TicketStatus.RESOLVED ? new Date() : null,
        }),
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
        throw new Error('Failed to update ticket status');
      }

      const updatedTicket = await response.json();
      
      setTickets(prevTickets => 
        prevTickets.map(t => 
          t.id === ticketId ? updatedTicket : t
        )
      );
      
      toast.success('Status updated successfully');

      // Send email notification via API
      try {
        await fetch(`/api/tickets/${ticketId}/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            type: 'status_update',
            newStatus,
          }),
        });
      } catch (error) {
        console.error('Failed to send status update email:', error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleAssignmentChange = async (ticketId: string, assigneeId: string | null) => {
    const ticket = tickets.find(t => t.id === ticketId);
    const assignee = assigneeId 
      ? itTeamMembers.find(member => member.id === assigneeId)
      : null;
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/ticketing/admin/login');
        return;
      }

      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          assignedTo: assigneeId,
        }),
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
        throw new Error('Failed to assign ticket');
      }

      const updatedTicket = await response.json();
      
      setTickets(prevTickets => 
        prevTickets.map(t => 
          t.id === ticketId ? updatedTicket : t
        )
      );
      
      toast.success('Ticket assigned successfully');

      // Send email notification via API
      try {
        await fetch(`/api/tickets/${ticketId}/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            type: 'assignment',
            assignedToId: assigneeId,
          }),
        });
      } catch (error) {
        console.error('Failed to send assignment email:', error);
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast.error('Failed to assign ticket');
    }
  };

  const confirmDelete = async () => {
    if (!ticketToDelete) return;

    try {
      const ticketId = ticketToDelete;
      setDeleteDialogOpen(false);
      setTicketToDelete(null);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/ticketing/admin/login');
        return;
      }

      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'DELETE',
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
        throw new Error('Failed to delete ticket');
      }

      setTickets(prevTickets => prevTickets.filter(t => t.id !== ticketId));
      toast.success('Ticket deleted successfully');
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error('Failed to delete ticket');
    }
  };

  const handleAssignTicketNumbers = async () => {
    try {
      setAssigningNumbers(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch('/api/tickets/assign-numbers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401 || response.status === 403) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/ticketing/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to assign ticket numbers');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(
          `Successfully reassigned ticket numbers to ${result.ticketsUpdated} ticket(s)!`
        );
        // Refresh tickets to show new numbers
        await fetchTickets();
      } else {
        toast.info(result.message || 'No tickets found to assign numbers');
      }
    } catch (error) {
      console.error('Error assigning ticket numbers:', error);
      toast.error('Failed to assign ticket numbers');
    } finally {
      setAssigningNumbers(false);
    }
  };

  const handleDeleteTicket = (ticketId: string) => {
    setTicketToDelete(ticketId);
    setDeleteDialogOpen(true);
  };

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

  const getSubcategoryLabel = (subcategory?: ITSupportSubcategory) => {
    if (!subcategory) return 'Not specified';
    const labels: Record<ITSupportSubcategory, string> = {
      [ITSupportSubcategory.HARDWARE]: 'Hardware',
      [ITSupportSubcategory.SOFTWARE]: 'Software',
      [ITSupportSubcategory.NETWORK]: 'Network',
      [ITSupportSubcategory.EMAIL]: 'Email',
      [ITSupportSubcategory.ACCESS]: 'Access & Permissions',
      [ITSupportSubcategory.PRINTER]: 'Printer & Scanner',
      [ITSupportSubcategory.PHONE]: 'Phone & Communication',
      [ITSupportSubcategory.OTHER]: 'Other',
    };
    return labels[subcategory];
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
          <h1 className="text-3xl font-bold tracking-tight">IT Support Tickets</h1>
          <p className="text-muted-foreground">
            View, assign, and manage all IT support tickets
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
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAssignTicketNumbers}
                  disabled={assigningNumbers}
                >
                  {assigningNumbers ? 'Assigning...' : 'Assign Ticket Numbers'}
                </Button>
                <Badge variant="secondary">{filteredTickets.length} tickets</Badge>
              </div>
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
                    <TableHead>User</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Issue Type</TableHead>
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
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No tickets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <TableRow 
                      key={ticket.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/ticketing/admin/tickets/${ticket.id}`)}>
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
                          <div className="max-w-md">
                            <p className="font-medium truncate">{ticket.title}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {getSubcategoryLabel(ticket.subcategory)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={ticket.status}
                            onValueChange={(value) => handleStatusChange(ticket.id, value as TicketStatus)}
                          >
                            <SelectTrigger className="w-[140px] h-8">
                              <SelectValue>
                                <Badge className={getStatusColor(ticket.status)}>
                                  {ticket.status.replace(/_/g, ' ')}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={TicketStatus.OPEN}>
                                <span className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                                  Open
                                </span>
                              </SelectItem>
                              <SelectItem value={TicketStatus.IN_PROGRESS}>
                                <span className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                  In Progress
                                </span>
                              </SelectItem>
                              <SelectItem value={TicketStatus.PENDING}>
                                <span className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                                  Pending
                                </span>
                              </SelectItem>
                              <SelectItem value={TicketStatus.RESOLVED}>
                                <span className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-green-500" />
                                  Resolved
                                </span>
                              </SelectItem>
                              <SelectItem value={TicketStatus.CLOSED}>
                                <span className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-gray-500" />
                                  Closed
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={ticket.assignedTo || 'unassigned'}
                            onValueChange={(value) => handleAssignmentChange(ticket.id, value === 'unassigned' ? null : value)}
                          >
                            <SelectTrigger className="w-[180px] h-8">
                              <SelectValue>
                                {ticket.assignee ? (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-[10px]">
                                        {getInitials(ticket.assignee.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm truncate">{ticket.assignee.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Unassigned</span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">
                                <span className="text-muted-foreground">Unassigned</span>
                              </SelectItem>
                              {itTeamMembers.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-[10px]">
                                        {getInitials(member.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span>{member.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(ticket.createdAt))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTicket(ticket.id);
                              }}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Ticket</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this ticket? This action cannot be undone.
              All comments and screenshots associated with this ticket will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setTicketToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminTicketLayout>
  );
}
