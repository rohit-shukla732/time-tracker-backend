'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TicketsLayout } from '@/components/tickets/TicketsLayout';
import { TicketList } from '@/components/tickets/TicketList';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ticket, TicketStatus } from '@/types';
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-12">
        {/* Header - Apple Style Large Typography */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
            My Tickets
          </h1>
          <p className="text-[19px] text-zinc-500 dark:text-zinc-400 font-light">
            View and manage your submitted requests
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zinc-900 dark:border-white mb-6"></div>
            <p className="text-[15px] text-zinc-500">Loading your history...</p>
          </div>
        ) : (
          <>
            {/* Quick Stats - Glassmorphic / Voluminous Cards */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6">
              {[
                { label: 'Total Tickets', val: stats.total, icon: FileText, color: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-800/50' },
                { label: 'Active', val: stats.active, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                { label: 'Resolved', val: stats.resolved, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
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

            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                <div className="space-y-1">
                  <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-zinc-900 dark:text-zinc-100">
                    Your History
                  </h2>
                </div>
                
                <div className="relative w-full md:w-80">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-zinc-400" strokeWidth={2} />
                  </div>
                  <Input
                    placeholder="Search your tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 w-full pl-12 pr-4 bg-white/60 dark:bg-zinc-900/50 border-black/[0.04] dark:border-white/[0.04] rounded-full text-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] focus-visible:ring-2 focus-visible:ring-primary/20 transition-all placeholder:font-light backdrop-blur-xl"
                  />
                </div>
              </div>

              <div className="w-full">
                <Tabs defaultValue="all" className="w-full">
                  <div className="mb-8 overflow-x-auto pb-2 scrollbar-none">
                    <TabsList className="h-12 p-1.5 bg-zinc-100/80 dark:bg-zinc-800/80 rounded-full inline-flex w-auto min-w-full sm:min-w-0">
                      {[
                        { value: 'all', label: 'All Tickets' },
                        { value: 'open', label: 'Open' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'resolved', label: 'Resolved' },
                      ].map((tab) => (
                        <TabsTrigger 
                          key={tab.value}
                          value={tab.value}
                          className="px-6 py-2 rounded-full text-[14px] font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm text-zinc-500 whitespace-nowrap"
                        >
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  
                  <div className="min-h-[400px]">
                    <TabsContent value="all" className="mt-0 outline-none">
                      <TicketList tickets={filterTicketsByStatus(null)} />
                    </TabsContent>
                    <TabsContent value="open" className="mt-0 outline-none">
                      <TicketList tickets={filterTicketsByStatus(TicketStatus.OPEN)} emptyMessage="No open tickets found" />
                    </TabsContent>
                    <TabsContent value="in_progress" className="mt-0 outline-none">
                      <TicketList tickets={filterTicketsByStatus(TicketStatus.IN_PROGRESS)} emptyMessage="No tickets in progress" />
                    </TabsContent>
                    <TabsContent value="pending" className="mt-0 outline-none">
                      <TicketList tickets={filterTicketsByStatus(TicketStatus.PENDING)} emptyMessage="No pending tickets" />
                    </TabsContent>
                    <TabsContent value="resolved" className="mt-0 outline-none">
                      <TicketList tickets={filterTicketsByStatus(TicketStatus.RESOLVED)} emptyMessage="No resolved tickets" />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </>
        )}
      </div>
    </TicketsLayout>
  );
}
