'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AdminTicketLayout } from '@/components/tickets/AdminTicketLayout';
import {
  GlassCard,
  StatusBadge,
  PriorityBadge,
  STATUS_STYLES,
  statusDotClass,
  priorityLabel,
  priorityDotClass,
} from '@/components/tickets/shared';
import { ScreenshotLightbox } from '@/components/tickets/ScreenshotLightbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ticket, TicketComment, TicketStatus, TicketPriority, TicketSubcategory } from '@/types';
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  Send,
  Save,
  UserPlus,
  Image as ImageIcon,
  Lock,
} from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils';
import { toast } from 'sonner';
import { makeAuthenticatedRequest, setupAutoRefresh } from '@/lib/adminAuth';

export default function AdminTicketDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [itTeamMembers, setItTeamMembers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);

  useEffect(() => {
    fetchTicket();
    fetchItTeam();

    // Setup automatic token refresh for admin
    const cleanupTokenRefresh = setupAutoRefresh();

    return () => cleanupTokenRefresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const previous = ticket;

    // Optimistic update
    setTicket({ ...ticket, status: newStatus, resolvedAt: newStatus === TicketStatus.RESOLVED ? new Date() : null });

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
      setTicket(previous);
      toast.error('Failed to update status');
    }
  };

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (!ticket) return;
    const previous = ticket;

    // Optimistic update
    setTicket({ ...ticket, priority: newPriority });

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
      setTicket(previous);
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
          isInternal: isInternalNote,
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
      setIsInternalNote(false);
      toast.success(comment.isInternal ? 'Internal note added' : 'Comment added');

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

  const getSubcategoryLabel = (subcategory?: TicketSubcategory | null) => {
    return subcategory?.name || 'Not specified';
  };

  if (loading || !ticket) {
    return (
      <AdminTicketLayout>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8" aria-busy="true" aria-label="Loading ticket">
          <div className="flex items-center gap-6">
            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-9 w-72 rounded-2xl" />
              <Skeleton className="h-4 w-52 rounded-lg" />
            </div>
          </div>
          <div className="grid gap-8 lg:grid-cols-3 items-start">
            <div className="lg:col-span-2 space-y-8">
              <Skeleton className="h-[400px] rounded-[32px]" />
              <Skeleton className="h-[360px] rounded-[32px]" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-[320px] rounded-[32px]" />
              <Skeleton className="h-[240px] rounded-[32px]" />
            </div>
          </div>
        </div>
      </AdminTicketLayout>
    );
  }

  return (
    <AdminTicketLayout>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="Go back to tickets"
            className="h-12 w-12 rounded-full bg-white/80 dark:bg-zinc-800/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <ArrowLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-100" />
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
            <GlassCard className="p-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h2 className="text-[24px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug">
                    {ticket.title}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <PriorityBadge priority={ticket.priority} />
                    <StatusBadge status={ticket.status} />
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-medium tracking-wide border border-black/[0.06] dark:border-white/[0.06] bg-black/5 dark:bg-white/5 text-zinc-700 dark:text-zinc-300">
                      {ticket.category?.name}
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
                      {ticket.screenshots.map((screenshot: any, si: number) => (
                        <div
                          key={screenshot.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Open screenshot ${screenshot.filename}`}
                          className="group cursor-pointer space-y-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                          onClick={() => setLightboxIndex(si)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxIndex(si); } }}
                        >
                          <div className="relative aspect-video rounded-2xl border border-black/[0.04] dark:border-white/[0.04] bg-black/5 dark:bg-white/5 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={screenshot.url}
                              alt={screenshot.filename}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
            </GlassCard>

            {/* Comments */}
            <GlassCard className="p-8 text-zinc-900 dark:text-zinc-100 flex flex-col space-y-8">
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
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-medium text-[15px] text-zinc-900 dark:text-zinc-100">
                            {comment.user?.name}
                          </span>
                          {comment.isInternal && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 text-[11px] font-semibold uppercase tracking-wide">
                              <Lock className="h-3 w-3" aria-hidden="true" />
                              Internal
                            </span>
                          )}
                          <span className="text-[13px] text-zinc-500 font-light">
                            {formatDistanceToNow(new Date(comment.createdAt))} ago
                          </span>
                        </div>
                        <div className={`p-4 rounded-2xl rounded-tl-sm border text-[15px] leading-relaxed font-light ${comment.isInternal ? 'bg-amber-500/[0.06] dark:bg-amber-500/[0.08] border-amber-500/20 dark:border-amber-500/20 text-zinc-800 dark:text-amber-100' : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.04] text-zinc-700 dark:text-zinc-300'}`}>
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
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <Label htmlFor="new-comment" className="text-[14px] font-medium text-zinc-700 dark:text-zinc-300">
                      {isInternalNote ? 'Add an Internal Note' : 'Add an Update (Public)'}
                    </Label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Switch
                        checked={isInternalNote}
                        onCheckedChange={setIsInternalNote}
                        aria-label="Toggle internal note"
                      />
                      <span className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors ${isInternalNote ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500'}`}>
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        Internal
                      </span>
                    </label>
                  </div>
                  <Textarea
                    id="new-comment"
                    placeholder={isInternalNote ? 'Visible to staff only — the ticket creator will not see this…' : 'Write a response or update...'}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={4}
                    disabled={submitting}
                    className={`resize-none rounded-2xl border bg-white/50 dark:bg-zinc-900/50 text-[15px] p-4 placeholder:text-zinc-400 focus-visible:ring-2 ${isInternalNote ? 'border-amber-500/40 dark:border-amber-500/30 focus-visible:ring-amber-500/40' : 'border-black/[0.06] dark:border-white/[0.06] focus-visible:ring-black/20 dark:focus-visible:ring-white/20'}`}
                  />
                  {isInternalNote && (
                    <p className="flex items-center gap-1.5 text-[12px] text-amber-600 dark:text-amber-400">
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      Internal notes are hidden from the ticket creator and other employees.
                    </p>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className={`h-12 px-6 rounded-full text-[15px] font-medium shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-zinc-400 ${isInternalNote ? 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-zinc-950' : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'}`}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {submitting ? 'Posting...' : isInternalNote ? 'Post Internal Note' : 'Post Update'}
                  </Button>
                </div>
              </form>
            </GlassCard>
          </div>

          {/* Sidebar - Admin Controls */}
          <div className="space-y-6">
            {/* Ticket Management */}
            <GlassCard className="p-6 sm:p-8 space-y-6">
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
                    <SelectTrigger id="status-select" aria-label="Change ticket status" className={`w-full h-12 px-4 border-0 rounded-2xl font-medium text-[13px] uppercase tracking-wide transition-colors ${(STATUS_STYLES[ticket.status] ?? STATUS_STYLES.CLOSED).badge} hover:opacity-80 focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10`}>
                      <div className="flex items-center gap-2 relative z-10">
                        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDotClass(ticket.status)}`} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {Object.values(TicketStatus).map(s => (
                        <SelectItem key={s} value={s} className="text-[13px] font-medium py-2">
                          <span className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${statusDotClass(s)}`} />
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
                      {Object.values(TicketPriority).map(p => (
                        <SelectItem key={p} value={p} className="text-[13px] font-medium py-2">
                          <span className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${priorityDotClass(p)}`} />
                            {priorityLabel(p)}
                          </span>
                        </SelectItem>
                      ))}
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
            </GlassCard>

            {/* Details */}
            <GlassCard className="p-6 sm:p-8 space-y-6">
              <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-zinc-400" />
                Details
              </h3>
              
              <div className="space-y-4 text-[14px]">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">App Area</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{ticket.category?.name || '—'}</span>
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
            </GlassCard>
          </div>
        </div>
      </div>

      {ticket.screenshots && ticket.screenshots.length > 0 && (
        <ScreenshotLightbox
          screenshots={ticket.screenshots}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </AdminTicketLayout>
  );
}
