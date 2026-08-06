'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TicketsLayout } from '@/components/tickets/TicketsLayout';
import { Ticket, TicketPriority, TicketStatus } from '@/types';
import { Plus, Clock, AlertCircle, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils';
import { toast } from 'sonner';

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/helpdesk/employee/login');
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
        router.push('/helpdesk/employee/login');
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
    open: myTickets.filter((t) => t.status === TicketStatus.OPEN || t.status === TicketStatus.PENDING).length,
    inProgress: myTickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
    resolved: myTickets.filter((t) => t.status === TicketStatus.RESOLVED).length,
  };

  const getPriorityStyle = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.URGENT:
        return 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400';
      case TicketPriority.HIGH:
        return 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400';
      case TicketPriority.MEDIUM:
        return 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
      case TicketPriority.LOW:
        return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
      default:
        return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  const getStatusStyle = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
      case TicketStatus.IN_PROGRESS:
        return 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400';
      case TicketStatus.PENDING:
        return 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400';
      case TicketStatus.RESOLVED:
        return 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400';
      case TicketStatus.CLOSED:
        return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
      default:
        return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  const getSubcategoryLabel = (subcategory?: { name?: string } | null) =>
    subcategory?.name ?? 'Not specified';

  return (
    <TicketsLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-12">
        {/* Header - Apple Style Large Typography */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
              Support Hub
            </h1>
            <p className="text-[19px] text-zinc-500 dark:text-zinc-400 font-light">
              Track and manage your IT support requests seamlessly.
            </p>
          </div>
          <button 
            onClick={() => router.push('/helpdesk/employee/new')}
            className="flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[15px] font-medium tracking-wide shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] active:scale-[0.98] transition-all duration-200"
          >
            <Plus className="h-5 w-5" />
            New Request
          </button>
        </div>

        {/* Quick Stats - Glassmorphic / Voluminous Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { label: 'Total Tickets', val: stats.total, icon: FileText, color: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-800/50' },
            { label: 'Open', val: stats.open, icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
            { label: 'In Progress', val: stats.inProgress, icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
            { label: 'Resolved', val: stats.resolved, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col p-6 rounded-[28px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[15px] font-medium text-zinc-500 dark:text-zinc-400">
                  {stat.label}
                </span>
                <div className={`p-2.5 rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} strokeWidth={2.5} />
                </div>
              </div>
              <div className="text-[40px] font-medium tracking-[-0.04em] text-zinc-900 dark:text-white">
                {stat.val}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Tickets - Seamless List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-zinc-900 dark:text-zinc-100">
              Recent Activity
            </h2>
            <button 
              onClick={() => router.push('/helpdesk/employee/my-tickets')}
              className="text-[15px] font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View All
            </button>
          </div>

          <div className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] rounded-[32px] overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                <p className="mt-4 text-[15px] text-zinc-500">Loading your requests...</p>
              </div>
            ) : myTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                <div className="bg-zinc-100 dark:bg-zinc-800/50 p-6 rounded-[28px] mb-6 inline-flex">
                  <FileText className="h-10 w-10 text-zinc-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-zinc-900 dark:text-zinc-100 mb-2">
                  No tickets yet
                </h3>
                <p className="text-[17px] text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto font-light mb-8">
                  Looks like everything is running smoothly. Create a ticket if you need any assistance.
                </p>
                <button 
                  onClick={() => router.push('/helpdesk/employee/new')}
                  className="flex items-center gap-2 h-12 px-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[15px] font-medium transition-transform active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Ticket
                </button>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {myTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => router.push(`/helpdesk/employee/${ticket.id}`)}
                    className="p-6 sm:px-8 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold tracking-wide uppercase ${getStatusStyle(ticket.status)}`}>
                          {ticket.status.replace(/_/g, ' ')}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold tracking-wide uppercase ${getPriorityStyle(ticket.priority)}`}>
                          {ticket.priority} Priority
                        </span>
                      </div>
                      <h3 className="text-[17px] font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-primary transition-colors">
                        {ticket.title}
                      </h3>
                      <p className="text-[15px] text-zinc-500 dark:text-zinc-400 line-clamp-1 font-light">
                        {ticket.description}
                      </p>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 mt-2 sm:mt-0">
                      <div className="flex items-center gap-1.5 text-[14px] text-zinc-500">
                        <FileText className="h-4 w-4 opacity-50" />
                        <span>{getSubcategoryLabel(ticket.subcategory)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[14px] text-zinc-400">
                        <Clock className="h-4 w-4 opacity-50" />
                        <span>{formatDistanceToNow(new Date(ticket.createdAt))} ago</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Footer - Apple Info Cards style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={() => router.push('/helpdesk/employee/new')}
            className="flex items-center gap-4 p-6 rounded-[24px] bg-zinc-100/50 dark:bg-zinc-800/30 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border border-transparent hover:border-black/[0.04] dark:hover:border-white/[0.04] transition-all text-left"
          >
            <div className="p-3 bg-white dark:bg-zinc-800 rounded-full shadow-sm">
              <Plus className="h-5 w-5 text-zinc-900 dark:text-white" />
            </div>
            <div>
              <h4 className="text-[17px] font-medium text-zinc-900 dark:text-zinc-100">Create New Ticket</h4>
              <p className="text-[15px] text-zinc-500 font-light">Report a new issue or request</p>
            </div>
          </button>
          
          <button 
            onClick={() => router.push('/helpdesk/employee/my-tickets')}
            className="flex items-center gap-4 p-6 rounded-[24px] bg-zinc-100/50 dark:bg-zinc-800/30 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border border-transparent hover:border-black/[0.04] dark:hover:border-white/[0.04] transition-all text-left"
          >
            <div className="p-3 bg-white dark:bg-zinc-800 rounded-full shadow-sm">
              <FileText className="h-5 w-5 text-zinc-900 dark:text-white" />
            </div>
            <div>
              <h4 className="text-[17px] font-medium text-zinc-900 dark:text-zinc-100">View All Tickets</h4>
              <p className="text-[15px] text-zinc-500 font-light">Browse your support history</p>
            </div>
          </button>
        </div>
      </div>
    </TicketsLayout>
  );
}
