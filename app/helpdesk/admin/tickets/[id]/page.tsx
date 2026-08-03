'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AdminTicketLayout } from '@/components/tickets/AdminTicketLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ticket, TicketComment, TicketStatus, TicketPriority, TicketCategory, Role, ITSupportSubcategory } from '@/types';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  MessageSquare,
  Send,
  Save,
  UserPlus,
  Image as ImageIcon,
} from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils';
import { toast } from 'sonner';
import { makeAuthenticatedRequest, setupAutoRefresh } from '@/lib/adminAuth';
import Image from 'next/image';

export default function AdminTicketDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [itTeamMembers, setItTeamMembers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);

  useEffect(() => {
    fetchTicket();
    fetchItTeam();

    // Setup automatic token refresh for admin
    const cleanupTokenRefresh = setupAutoRefresh();

    return () => cleanupTokenRefresh();
  }, [ticketId]);

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

  const fetchTicket = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/helpdesk/admin/login');
        return;
      }

      const response = await fetch(`/api/tickets/${ticketId}`, {
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
        router.push('/helpdesk/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch ticket');
      }

      const data = await response.json();
      setTicket(data);
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast.error('Failed to load ticket');
      router.push('/helpdesk/admin/tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/helpdesk/admin/login');
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
        router.push('/helpdesk/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to update ticket status');
      }

      const updatedTicket = await response.json();
      setTicket(updatedTicket);
      toast.success('Ticket status updated');
      
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

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (!ticket) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/helpdesk/admin/login');
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
          priority: newPriority,
        }),
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/helpdesk/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to update ticket priority');
      }

      const updatedTicket = await response.json();
      setTicket(updatedTicket);
      toast.success('Ticket priority updated');
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/helpdesk/admin/login');
        return;
      }

      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          content: newComment,
        }),
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/helpdesk/admin/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const comment = await response.json();
      setComments([...comments, comment]);
      const commentText = newComment;
      setNewComment('');
      toast.success('Comment added');

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
            type: 'comment',
            comment: commentText,
          }),
        });
      } catch (error) {
        console.error('Failed to send comment email:', error);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
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

  const getStatusDot = (status: string) => ({
    OPEN: 'bg-blue-500', IN_PROGRESS: 'bg-purple-500', PENDING: 'bg-yellow-500',
    RESOLVED: 'bg-green-500', CLOSED: 'bg-zinc-400',
  }[status] ?? 'bg-zinc-400');

  if (loading || !ticket) {
    return (
      <AdminTicketLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-900 dark:border-white border-t-transparent" />
          <p className="text-[15px] text-zinc-500 font-light">Loading ticket...</p>
        </div>
      </AdminTicketLayout>
    );
  }

  return (
    <AdminTicketLayout>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="h-12 w-12 rounded-full bg-white/80 dark:bg-zinc-800/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shrink-0"
          >
            <ArrowLeft className="h-5 w-5 text-zinc-300 dark:text-锌-100" />
          </Button>
          <div className="space-y-2 flex-1">
            <h1 className="text-[32px] sm:text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
              Ticket T-{String(ticket.ticketNumber).padStart(2, '0')}
            </h1>
            <p className="text-[17px] text-zinc-500 dark:text-zinc-400 font-light">
              Manage and resolve support request
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 items-start">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Ticket Info */}
            <div className="p-8 rounded-[32px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h2 className="text-[24px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug">
                    {ticket.title}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-semibold tracking-wide uppercase ${getPriorityStyle(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold tracking-wide uppercase border border-black/[0.04] dark:border-white/[0.04] ${getStatusStyle(ticket.status)}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(ticket.status)}`} />
                      {ticket.status.replace(/_/g, ' ')}
                    </span>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-medium tracking-wide border border-black/[0.06] dark:border-white/[0.06] bg-black/5 dark:bg-white/5 text-zinc-700 dark:text-zinc-300">
                      {ticket.category}
                    </span>
                  </div>
                </div>
                
                <div className="h-px w-full bg-black/[0.04] dark:bg-white/[0.04]" />

                <div className="space-y-4">
                  <h4 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">Description</h4>
                  <div className="p-5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
                    <p className="text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap font-light">
                      {ticket.description}
                    </p>
                  </div>
                </div>

                {/* Screenshots Section */}
                {ticket.screenshots && ticket.screenshots.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <h4 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-zinc-500" />
                      Attachments
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {ticket.screenshots.map((screenshot: any) => (
                        <div key={screenshot.id} className="group cursor-pointer space-y-2" onClick={() => window.open(screenshot.url, '_blank')}>
                          <div className="relative aspect-video rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-black/5 dark:bg-white/5 overflow-hidden">
                            <Image
                              src={screenshot.url}
                              alt={screenshot.filename}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                          </div>
                          <p className="text-[12px] text-zinc-500 truncate px-1">
                            {screenshot.filename}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="h-px w-full bg-black/[0.04] dark:bg-white/[0.04]" />

                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[14px]">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-zinc-900">
                      <AvatarFallback className="text-[12px] bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium">
                        {getInitials(ticket.creator?.name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-zinc-500 text-[12px]">Reported by</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{ticket.creator?.name}</span>
                    </div>
                  </div>
                  <div className="hidden sm:block w-px h-8 bg-black/[0.06] dark:bg-white/[0.06]" />
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-black/[0.04] dark:bg-white/[0.04] flex items-center justify-center">
                      <Clock className="h-4 w-4 text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-zinc-500 text-[12px]">Created</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {formatDistanceToNow(new Date(ticket.createdAt))} ago
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="p-8 rounded-[32px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-zinc-900 dark:text-zinc-100 flex flex-col space-y-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h2 className="text-[20px] font-semibold tracking-tight">Timeline & Updates</h2>
                <span className="ml-auto px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[13px] font-medium">
                  {comments.length}
                </span>
              </div>

              <div className="space-y-6">
                {comments.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-[15px] font-light italic">
                    No comments yet. Be the first to update!
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4 group">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="text-[13px] bg-black/5 dark:bg-white/10 font-medium">
                          {getInitials(comment.user?.name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-[15px] text-zinc-900 dark:text-zinc-100">
                            {comment.user?.name}
                          </span>
                          <span className="text-[13px] text-zinc-500 font-light">
                            {formatDistanceToNow(new Date(comment.createdAt))} ago
                          </span>
                        </div>
                        <div className="p-4 rounded-2xl rounded-tl-sm bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] text-[15px] text-zinc-700 dark:text-zinc-300 leading-relaxed font-light">
                          {comment.content}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="h-px w-full bg-black/[0.04] dark:bg-white/[0.04]" />

              <form onSubmit={handleSubmitComment} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[14px] font-medium text-zinc-700 dark:text-zinc-300">Add an Update (Public)</Label>
                  <Textarea
                    placeholder="Write a response or update..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={4}
                    disabled={submitting}
                    className="resize-none rounded-2xl border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[15px] p-4 placeholder:text-zinc-400 focus-visible:ring-black/20 dark:focus-visible:ring-white/20"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    disabled={submitting || !newComment.trim()}
                    className="h-12 px-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[15px] font-medium shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {submitting ? 'Posting...' : 'Post Update'}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar - Admin Controls */}
          <div className="space-y-6">
            {/* Ticket Management */}
            <div className="p-6 sm:p-8 rounded-[32px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
              <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Save className="h-4 w-4 text-zinc-400" />
                Controls
              </h3>
              
              <div className="space-y-5">
                {/* Status */}
                <div className="space-y-2.5">
                  <Label htmlFor="status-select" className="text-[13px] font-medium text-zinc-500 uppercase tracking-wider">
                    Status
                  </Label>
                  <Select value={ticket.status} onValueChange={(value) => handleStatusChange(value as TicketStatus)}>
                    <SelectTrigger id="status-select" className={`w-full h-12 px-4 border-0 rounded-2xl font-medium text-[13px] uppercase tracking-wide transition-colors ${getStatusStyle(ticket.status)} hover:opacity-80 focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10`}>
                      <div className="flex items-center gap-2 relative z-10">
                        {/* <span className={`h-2 w-2 rounded-full ${getStatusDot(ticket.status)}`} /> */}
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {Object.values(TicketStatus).map(s => (
                        <SelectItem key={s} value={s} className="text-[13px] font-medium py-2">
                          <span className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${getStatusDot(s)}`} />
                            {s.replace(/_/g,' ')}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="h-px w-full bg-black/[0.04] dark:bg-white/[0.04]" />

                {/* Priority */}
                <div className="space-y-2.5">
                  <Label htmlFor="priority-select" className="text-[13px] font-medium text-zinc-500 uppercase tracking-wider">
                    Priority
                  </Label>
                  <Select value={ticket.priority} onValueChange={(value) => handlePriorityChange(value as TicketPriority)}>
                    <SelectTrigger id="priority-select" className="w-full h-12 rounded-2xl border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[14px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value={TicketPriority.URGENT}>🔴 Urgent</SelectItem>
                      <SelectItem value={TicketPriority.HIGH}>🟠 High</SelectItem>
                      <SelectItem value={TicketPriority.MEDIUM}>🟡 Medium</SelectItem>
                      <SelectItem value={TicketPriority.LOW}>🟢 Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="h-px w-full bg-black/[0.04] dark:bg-white/[0.04]" />

                {/* Assignment */}
                <div className="space-y-2.5">
                  <Label htmlFor="assignee-select" className="text-[13px] font-medium text-zinc-500 uppercase tracking-wider">
                    Assignee
                  </Label>
                  <Select 
                    value={ticket.assignedTo || 'unassigned'} 
                    onValueChange={async (value) => {
                      const assigneeId = value === 'unassigned' ? null : value;
                      // Logic handled above but reimplemented below cleanly if needed
                      try {
                        const token = localStorage.getItem('accessToken');
                        if (!token) return;
                        const response = await fetch(`/api/tickets/${ticketId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ assignedTo: assigneeId }),
                        });
                        if (response.ok) {
                          const updatedTicket = await response.json();
                          setTicket(updatedTicket);
                          toast.success('Assignment updated');
                          fetch(`/api/tickets/${ticketId}/send-email`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ type: 'assignment', assignedToId: assigneeId }),
                          }).catch(()=>null);
                        }
                      } catch (error) { toast.error('Failed to assign ticket'); }
                    }}
                  >
                    <SelectTrigger id="assignee-select" className="w-full h-12 rounded-2xl border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[14px]">
                      <SelectValue>
                        {ticket.assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px] bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                                {getInitials(ticket.assignee.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{ticket.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-500">Unassigned</span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="unassigned">
                        <span className="text-zinc-500">Unassigned</span>
                      </SelectItem>
                      {itTeamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id} className="py-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px] bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="p-6 sm:p-8 rounded-[32px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
              <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-zinc-400" />
                Details
              </h3>
              
              <div className="space-y-4 text-[14px]">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">App Area</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{ticket.category}</span>
                </div>
                <div className="h-px w-full bg-black/[0.04] dark:bg-white/[0.04]" />
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Issue Type</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{getSubcategoryLabel(ticket.subcategory)}</span>
                </div>
                <div className="h-px w-full bg-black/[0.04] dark:bg-white/[0.04]" />
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-500">Created At</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
                <div className="h-px w-full bg-black/[0.04] dark:bg-white/[0.04]" />
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-500">Last Updated</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatDistanceToNow(new Date(ticket.updatedAt))} ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminTicketLayout>
  );
}
