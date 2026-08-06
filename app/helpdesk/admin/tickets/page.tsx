'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminTicketLayout } from '@/components/tickets/AdminTicketLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { TicketStatus, TicketPriority, TicketCategory } from '@/types';
import {
  Search,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Hash,
  RotateCcw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from '@/lib/utils';
import { toast } from 'sonner';
import { makeAuthenticatedRequest, setupAutoRefresh } from '@/lib/adminAuth';

type SortKey = 'ticketNumber' | 'title' | 'creatorName' | 'subcategory' | 'priority' | 'status' | 'assigneeName' | 'createdAt';
type SortDir = 'asc' | 'desc';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ticket = any;

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3,
};
const STATUS_ORDER: Record<string, number> = {
  OPEN: 0, IN_PROGRESS: 1, PENDING: 2, RESOLVED: 3, CLOSED: 4,
};
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function AdminTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [itTeamMembers, setItTeamMembers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [assigningNumbers, setAssigningNumbers] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    fetchTickets();
    fetchItTeam();
    fetchCategories();
    const cleanup = setupAutoRefresh();
    return () => cleanup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const response = await fetch('/api/tickets/categories', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) setCategories(await response.json());
    } catch { /* silent */ }
  };

  const fetchItTeam = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/users/it-team');
      if (response.ok) setItTeamMembers(await response.json());
    } catch { /* silent */ }
  };

  const fetchTickets = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) { router.push('/helpdesk/admin/login'); return; }
      const response = await makeAuthenticatedRequest('/api/tickets');
      if (response.status === 401) {
        ['accessToken','refreshToken','user'].forEach(k => localStorage.removeItem(k));
        router.push('/helpdesk/admin/login'); return;
      }
      if (!response.ok) throw new Error();
      setTickets(await response.json());
    } catch { toast.error('Failed to load tickets'); }
    finally { setLoading(false); }
  }, [router]);

  const filteredTickets = useMemo(() => {
    let r = tickets;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter((t: Ticket) =>
        t.title.toLowerCase().includes(q) ||
        (t.creator?.name ?? '').toLowerCase().includes(q) ||
        String(t.ticketNumber ?? '').includes(q)
      );
    }
    if (statusFilter !== 'all') r = r.filter((t: Ticket) => t.status === statusFilter);
    if (priorityFilter !== 'all') r = r.filter((t: Ticket) => t.priority === priorityFilter);
    if (categoryFilter !== 'all') r = r.filter((t: Ticket) => (t.category?.id ?? t.category?.name) === categoryFilter);
    return r;
  }, [tickets, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a: Ticket, b: Ticket) => {
      let cmp = 0;
      switch (sortKey) {
        case 'ticketNumber': cmp = (a.ticketNumber ?? 0) - (b.ticketNumber ?? 0); break;
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'creatorName': cmp = (a.creator?.name ?? '').localeCompare(b.creator?.name ?? ''); break;
        case 'subcategory': cmp = (a.subcategory?.name ?? '').localeCompare(b.subcategory?.name ?? ''); break;
        case 'priority': cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9); break;
        case 'status': cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9); break;
        case 'assigneeName': cmp = (a.assignee?.name ?? '').localeCompare(b.assignee?.name ?? ''); break;
        case 'createdAt': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredTickets, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedTickets.length / pageSize));
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTickets.slice(start, start + pageSize);
  }, [sortedTickets, currentPage, pageSize]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, priorityFilter, categoryFilter, sortKey, sortDir, pageSize]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/60 ml-1 inline-block" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 ml-1 inline-block text-primary" />
      : <ChevronDown className="h-3.5 w-3.5 ml-1 inline-block text-primary" />;
  };

  const Th = ({ col, children, className }: { col: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={`cursor-pointer select-none whitespace-nowrap hover:text-foreground transition-colors ${sortKey === col ? 'text-foreground' : ''} ${className ?? ''}`}
      onClick={() => handleSort(col)}
    >
      {children}<SortIcon col={col} />
    </TableHead>
  );

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) { router.push('/helpdesk/admin/login'); return; }
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus, resolvedAt: newStatus === TicketStatus.RESOLVED ? new Date() : null }),
      });
      if (res.status === 401) { ['accessToken','refreshToken','user'].forEach(k => localStorage.removeItem(k)); router.push('/helpdesk/admin/login'); return; }
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setTickets((prev: Ticket[]) => prev.map(t => t.id === ticketId ? updated : t));
      toast.success('Status updated');
      fetch(`/api/tickets/${ticketId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ type: 'status_update', newStatus }),
      }).catch(() => {});
    } catch { toast.error('Failed to update status'); }
  };

  const handleAssignmentChange = async (ticketId: string, assigneeId: string | null) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) { router.push('/helpdesk/admin/login'); return; }
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ assignedTo: assigneeId }),
      });
      if (res.status === 401) { ['accessToken','refreshToken','user'].forEach(k => localStorage.removeItem(k)); router.push('/helpdesk/admin/login'); return; }
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setTickets((prev: Ticket[]) => prev.map(t => t.id === ticketId ? updated : t));
      toast.success('Ticket assigned');
      fetch(`/api/tickets/${ticketId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ type: 'assignment', assignedToId: assigneeId }),
      }).catch(() => {});
    } catch { toast.error('Failed to assign ticket'); }
  };

  const confirmDelete = async () => {
    if (!ticketToDelete) return;
    const id = ticketToDelete;
    setDeleteDialogOpen(false); setTicketToDelete(null);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) { router.push('/helpdesk/admin/login'); return; }
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.status === 401) { ['accessToken','refreshToken','user'].forEach(k => localStorage.removeItem(k)); router.push('/helpdesk/admin/login'); return; }
      if (!res.ok) throw new Error();
      setTickets((prev: Ticket[]) => prev.filter(t => t.id !== id));
      toast.success('Ticket deleted');
    } catch { toast.error('Failed to delete ticket'); }
  };

  const handleAssignNumbers = async () => {
    try {
      setAssigningNumbers(true);
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/tickets/assign-numbers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.status === 401 || res.status === 403) { ['accessToken','refreshToken','user'].forEach(k => localStorage.removeItem(k)); router.push('/helpdesk/admin/login'); return; }
      if (!res.ok) throw new Error();
      const result = await res.json();
      if (result.success) { toast.success(`Assigned numbers to ${result.ticketsUpdated} ticket(s)`); fetchTickets(); }
      else toast.info(result.message || 'No tickets to update');
    } catch { toast.error('Failed to assign ticket numbers'); }
    finally { setAssigningNumbers(false); }
  };

  const getPriorityStyle = (p: string) => ({
    URGENT: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
    HIGH:   'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
    MEDIUM: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    LOW:    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  }[p] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400');

  const getStatusStyle = (s: string) => ({
    OPEN:        'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    IN_PROGRESS: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
    PENDING:     'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400',
    RESOLVED:    'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400',
    CLOSED:      'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  }[s] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400');

  const getStatusDot = (s: string) => ({
    OPEN: 'bg-blue-500', IN_PROGRESS: 'bg-purple-500', PENDING: 'bg-yellow-500',
    RESOLVED: 'bg-green-500', CLOSED: 'bg-zinc-400',
  }[s] ?? 'bg-zinc-400');

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const getSubLabel = (s?: { name: string } | null) => s?.name ?? 'Not specified';

  const hasFilters = searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all';
  const resetFilters = () => { setSearchQuery(''); setStatusFilter('all'); setPriorityFilter('all'); setCategoryFilter('all'); };

  return (
    <AdminTicketLayout>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
              All Tickets
            </h1>
            <p className="text-[17px] text-zinc-500 dark:text-zinc-400 font-light">
              Manage, assign and resolve system support requests.
            </p>
          </div>
          {/* <button
            onClick={handleAssignNumbers}
            disabled={assigningNumbers}
            className="flex items-center justify-center h-12 px-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[14px] font-medium transition-transform hover:shadow-md active:scale-[0.98] disabled:opacity-50 shrink-0"
          >
            <Hash className="h-4 w-4 mr-2" />
            {assigningNumbers ? 'Assigning…' : 'Fix Ticket #s'}
          </button> */}
        </div>

        {/* Filters */}
        <div className="p-4 sm:p-6 rounded-[32px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
              <Input placeholder="Search tickets, users, #number…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-11 rounded-2xl border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[14px] shadow-sm" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[155px] h-11 rounded-2xl border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[14px] shadow-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="all">All Status</SelectItem>
                {Object.values(TicketStatus).map(s => (
                  <SelectItem key={s} value={s}>
                    <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${getStatusDot(s)}`} />{s.replace(/_/g,' ')}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[145px] h-11 rounded-2xl border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[14px] shadow-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value={TicketPriority.URGENT}>🔴 Urgent</SelectItem>
                <SelectItem value={TicketPriority.HIGH}>🟠 High</SelectItem>
                <SelectItem value={TicketPriority.MEDIUM}>🟡 Medium</SelectItem>
                <SelectItem value={TicketPriority.LOW}>🟢 Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[175px] h-11 rounded-2xl border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[14px] shadow-sm"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent className="rounded-2xl max-h-72 overflow-y-auto">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id} className="text-[13px] font-medium">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-11 px-4 rounded-2xl text-[14px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Reset
              </Button>
            )}
            <span className="ml-auto text-[14px] text-zinc-500 font-medium whitespace-nowrap">
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-[32px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between py-5 px-6 sm:px-8 border-b border-black/[0.04] dark:border-white/[0.04]">
            <h2 className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Ticket Register</h2>
            <div className="flex items-center gap-3 text-[14px] text-zinc-500">
              <span>Rows</span>
              <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                <SelectTrigger className="h-9 w-[80px] rounded-xl border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">{PAGE_SIZE_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 dark:border-white border-t-transparent" />
                <span className="text-[15px] text-zinc-500 font-light">Loading tickets…</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/20 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 border-b border-black/[0.04] dark:border-white/[0.04]">
                        <Th col="ticketNumber" className="pl-6 w-[80px]">#</Th>
                        <Th col="creatorName" className="w-[160px]">User</Th>
                        <Th col="title">Title</Th>
                        <Th col="subcategory" className="w-[160px]">Category</Th>
                        <Th col="priority" className="w-[110px]">Priority</Th>
                        <Th col="status" className="w-[170px]">Status</Th>
                        <Th col="assigneeName" className="w-[190px]">Assigned To</Th>
                        <Th col="createdAt" className="w-[120px]">Created</Th>
                        <TableHead className="w-[52px] pr-4" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTickets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="py-24 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2">
                                <Search className="h-5 w-5 text-zinc-400" />
                              </div>
                              <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">No tickets found</span>
                              <span className="text-[14px] text-zinc-500 font-light">Try adjusting your filters or search query</span>
                              {hasFilters && <Button variant="link" size="sm" onClick={resetFilters} className="mt-2 text-zinc-900 dark:text-white">Clear all filters</Button>}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : paginatedTickets.map((ticket: Ticket) => (
                        <TableRow key={ticket.id} className="cursor-pointer group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 border-b border-black/[0.04] dark:border-white/[0.04] transition-colors" onClick={() => router.push(`/helpdesk/admin/tickets/${ticket.id}`)}>
                          {/* # */}
                          <TableCell className="pl-6 font-mono text-xs text-muted-foreground font-medium">
                            {ticket.ticketNumber ? `#${ticket.ticketNumber}` : '—'}
                          </TableCell>
                          {/* User */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                                  {getInitials(ticket.creator?.name ?? '')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate max-w-[100px]">{ticket.creator?.name}</span>
                            </div>
                          </TableCell>
                          {/* Title */}
                          <TableCell>
                            <p className="font-medium text-sm truncate max-w-xs group-hover:text-primary transition-colors">{ticket.title}</p>
                            {ticket.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">{ticket.description}</p>
                            )}
                          </TableCell>
                          {/* Category */}
                          <TableCell>
                            <Badge variant="outline" className="font-normal text-xs">{getSubLabel(ticket.subcategory)}</Badge>
                          </TableCell>
                          {/* Priority */}
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold tracking-wide uppercase ${getPriorityStyle(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                          </TableCell>
                          {/* Status select */}
                          <TableCell onClick={e => e.stopPropagation()}>
                            <Select value={ticket.status} onValueChange={v => handleStatusChange(ticket.id, v)}>
                              <SelectTrigger className={`h-8 w-[140px] px-3 border-0 rounded-xl font-medium text-[12px] uppercase tracking-wide transition-colors ${getStatusStyle(ticket.status)} hover:opacity-80 focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10`}>
                                <div className="flex items-center gap-2">
                                  {/* <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(ticket.status)}`} /> */}
                                  <SelectValue />
                                </div>
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {Object.values(TicketStatus).map(s => (
                                  <SelectItem key={s} value={s} className="text-[13px] font-medium">
                                    <span className="flex items-center gap-2">
                                      <span className={`h-2 w-2 rounded-full ${getStatusDot(s)}`} />
                                      {s.replace(/_/g,' ')}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          {/* Assignee select */}
                          <TableCell onClick={e => e.stopPropagation()}>
                            <Select value={ticket.assignedTo ?? 'unassigned'} onValueChange={v => handleAssignmentChange(ticket.id, v === 'unassigned' ? null : v)}>
                              <SelectTrigger className="h-8 w-[170px] border border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 transition-colors px-3">
                                <SelectValue>
                                  {ticket.assignee ? (
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Avatar className="h-5 w-5 shrink-0">
                                        <AvatarFallback className="text-[9px] bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">{getInitials(ticket.assignee.name)}</AvatarFallback>
                                      </Avatar>
                                      <span className="truncate text-[13px] font-medium text-zinc-900 dark:text-zinc-100">{ticket.assignee.name}</span>
                                    </div>
                                  ) : <span className="text-[13px] text-zinc-500 font-medium">Unassigned</span>}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="unassigned"><span className="text-zinc-500 text-[13px] font-medium">Unassigned</span></SelectItem>
                                {itTeamMembers.map(m => (
                                  <SelectItem key={m.id} value={m.id} className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px] bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">{getInitials(m.name)}</AvatarFallback></Avatar>
                                      <span>{m.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          {/* Created */}
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(ticket.createdAt))}
                          </TableCell>
                          {/* Delete */}
                          <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 transition-opacity"
                              onClick={() => { setTicketToDelete(ticket.id); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-t border-black/[0.04] dark:border-white/[0.04] bg-zinc-50/50 dark:bg-zinc-900/20">
                    <span className="text-[14px] text-zinc-500">
                      Showing <strong className="font-medium text-zinc-900 dark:text-zinc-100">{Math.min((currentPage - 1) * pageSize + 1, filteredTickets.length)}–{Math.min(currentPage * pageSize, filteredTickets.length)}</strong> of <strong className="font-medium text-zinc-900 dark:text-zinc-100">{filteredTickets.length}</strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-black/[0.06] dark:border-white/[0.06]" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-black/[0.06] dark:border-white/[0.06]" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                          acc.push(p); return acc;
                        }, [])
                        .map((p, i) => p === '...'
                          ? <span key={`e-${i}`} className="px-2 text-zinc-400 text-sm">…</span>
                          : <Button key={p} variant={currentPage === p ? 'default' : 'outline'} size="icon" className={`h-8 w-8 rounded-lg text-[13px] ${currentPage === p ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'border-black/[0.06] dark:border-white/[0.06] hover:bg-black/5 dark:hover:bg-white/5'}`} onClick={() => setCurrentPage(p as number)}>{p}</Button>
                        )}
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-black/[0.06] dark:border-white/[0.06]" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-black/[0.06] dark:border-white/[0.06]" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Ticket</DialogTitle>
            <DialogDescription>
              Are you sure? This permanently deletes the ticket along with all comments and attachments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setTicketToDelete(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminTicketLayout>
  );
}
