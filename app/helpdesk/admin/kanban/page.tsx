'use client';

import { useState, useEffect, useMemo } from 'react';
import { AdminTicketLayout } from '@/components/tickets/AdminTicketLayout';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { makeAuthenticatedRequest, setupAutoRefresh } from '@/lib/adminAuth';
import { TicketStatus, TicketPriority } from '@/types';
import { formatDistanceToNow } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserPlus } from 'lucide-react';

const COLUMNS = [
  { id: TicketStatus.OPEN, label: 'Open' },
  { id: TicketStatus.IN_PROGRESS, label: 'In Progress' },
  { id: TicketStatus.PENDING, label: 'Pending' },
  { id: TicketStatus.RESOLVED, label: 'Resolved' },
  { id: TicketStatus.CLOSED, label: 'Closed' }
];

export default function KanbanBoardPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [draggedOverColId, setDraggedOverColId] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [itTeamMembers, setItTeamMembers] = useState<any[]>([]);

  useEffect(() => {
    fetchTickets();
    fetchItTeam();
    const cleanup = setupAutoRefresh();
    return () => cleanup();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/tickets');
      if (response.status === 401) {
        router.push('/helpdesk/admin/login');
        return;
      }
      if (!response.ok) throw new Error();
      const data = await response.json();
      setTickets(data);
    } catch (error) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchItTeam = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/users/it-team');
      if (response.ok) setItTeamMembers(await response.json());
    } catch {}
  };

  const filteredTickets = useMemo(() => {
    if (assigneeFilter === 'all') return tickets;
    if (assigneeFilter === 'unassigned') return tickets.filter(t => !t.assigneeId);
    return tickets.filter(t => t.assigneeId === assigneeFilter);
  }, [tickets, assigneeFilter]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedTicketId(id);
  };

  const handleDragEnd = () => {
    setDraggedTicketId(null);
    setDraggedOverColId(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault(); // allow drop
    if (draggedOverColId !== colId) {
      setDraggedOverColId(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleAssign = async (ticketId: string, assigneeId: string | null) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ assignedTo: assigneeId }),
      });

      if (!response.ok) throw new Error();
      const updated = await response.json();
      setTickets(prev => prev.map(t => t.id === ticketId ? updated : t));
      toast.success('Ticket assigned');
    } catch {
      toast.error('Failed to assign ticket');
    }
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDraggedOverColId(null);
    const ticketId = e.dataTransfer.getData('text/plain');
    if (!ticketId) return;

    const ticketToUpdate = tickets.find(t => t.id === ticketId);
    if (!ticketToUpdate || ticketToUpdate.status === newStatus) return;

    // Optimistically update
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ 
          status: newStatus, 
          resolvedAt: newStatus === TicketStatus.RESOLVED ? new Date() : null 
        }),
      });

      if (!response.ok) throw new Error();
      toast.success('Ticket moved');
      const updated = await response.json();
      setTickets(prev => prev.map(t => t.id === ticketId ? updated : t));
    } catch {
      toast.error('Failed to update status');
      // Revert optimism
      setTickets(prev => prev.map(t => t.id === ticketId ? ticketToUpdate : t));
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400';
      case 'HIGH': return 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400';
      case 'MEDIUM': return 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
      case 'LOW': return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
      default: return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'border-blue-500/30';
      case 'IN_PROGRESS': return 'border-purple-500/30';
      case 'PENDING': return 'border-yellow-500/30';
      case 'RESOLVED': return 'border-green-500/30';
      case 'CLOSED': return 'border-zinc-400/30';
      default: return 'border-zinc-200 dark:border-zinc-800';
    }
  };

  return (
    <AdminTicketLayout>
      <div className="max-w-full overflow-hidden p-6 font-sans flex flex-col h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Ticket Board
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Drag and drop to update status</p>
          </div>
          
          <div className="w-full sm:w-[250px]">
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border-black/[0.04] dark:border-white/[0.04] rounded-xl">
                <SelectValue placeholder="Filter by Assignee" />
              </SelectTrigger>
              <SelectContent className="rounded-xl glass-panel">
                <SelectItem value="all">All Tickets</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {itTeamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Board */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-900 dark:border-white border-t-transparent" />
          </div>
        ) : (
          <div className="flex-1 flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory">
            {COLUMNS.map(column => {
              const colTickets = filteredTickets.filter(t => t.status === column.id);
              return (
                <div 
                  key={column.id} 
                  className={`flex-shrink-0 w-[340px] flex flex-col snap-center rounded-[24px] backdrop-blur-md border border-t-[4px] border-black/[0.04] dark:border-white/[0.04] transition-all duration-300 ${getStatusColor(column.id)} ${draggedOverColId === column.id ? 'bg-zinc-100/80 dark:bg-zinc-800/80 scale-[1.02] ring-2 ring-primary/20 shadow-xl' : 'bg-white/40 dark:bg-zinc-900/30'}`}
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  <div className="px-5 py-4 flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.04]">
                    <h3 className="font-medium text-[15px] text-zinc-900 dark:text-zinc-100">{column.label}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                      {colTickets.length}
                    </span>
                  </div>
                  
                  <div className="flex-1 p-3 overflow-y-auto space-y-3">
                    {colTickets.map(ticket => (
                      <div 
                        key={ticket.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ticket.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => router.push(`/helpdesk/admin/tickets/${ticket.id}`)}
                        className={`cursor-grab active:cursor-grabbing p-4 rounded-[16px] bg-white dark:bg-zinc-800 shadow-[0_2px_8px_rgb(0,0,0,0.04)] border transition-all duration-300 ease-out ${draggedTicketId === ticket.id ? 'opacity-40 scale-95 rotate-2 ring-2 ring-primary border-primary/50 border-dashed shadow-inner bg-primary/5 dark:bg-primary/5' : 'opacity-100 border-black/[0.04] dark:border-white/[0.04] hover:border-black/[0.1] dark:hover:border-white/[0.1] hover:-translate-y-1 hover:shadow-lg hover:ring-1 hover:ring-primary/10'}`}
                      >
                        <div className="flex items-start justify-between mb-3 gap-2">
                          <span className="text-xs font-medium tracking-wider text-zinc-500 dark:text-zinc-400">
                            T-{String(ticket.ticketNumber || 0).padStart(2, '0')}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${getPriorityStyle(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </div>
                        
                        <p className="text-[14px] font-medium text-zinc-900 dark:text-white leading-snug mb-4 line-clamp-2">
                          {ticket.title}
                        </p>

                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-black/[0.03] dark:border-white/[0.03]">
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="focus:outline-none">
                                <div className="group/avatar relative">
                                  <Avatar className="h-7 w-7 ring-2 ring-white dark:ring-zinc-800 hover:ring-primary/20 transition-all cursor-pointer">
                                    <AvatarFallback className="text-[10px] font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                                      {(ticket.assignee?.name || 'Un').slice(0,2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-800 rounded-full p-0.5 opacity-0 group-hover/avatar:opacity-100 transition-opacity border border-black/5 dark:border-white/5 shadow-sm">
                                    <UserPlus className="w-2.5 h-2.5 text-zinc-500" />
                                  </div>
                                </div>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-48 rounded-xl glass-panel">
                                <DropdownMenuLabel className="text-xs font-semibold uppercase text-zinc-500">Assign To</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleAssign(ticket.id, null)} className="text-[13px] cursor-pointer">
                                  Unassigned
                                </DropdownMenuItem>
                                {itTeamMembers.map(member => (
                                  <DropdownMenuItem 
                                    key={member.id} 
                                    onClick={() => handleAssign(ticket.id, member.id)}
                                    className="text-[13px] cursor-pointer flex items-center justify-between"
                                  >
                                    {member.name}
                                    {ticket.assignee?.id === member.id && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <span className="text-[11px] text-zinc-400 font-medium">
                            {formatDistanceToNow(new Date(ticket.createdAt))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminTicketLayout>
  );
}
