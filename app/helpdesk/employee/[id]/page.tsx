'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { TicketsLayout } from '@/components/tickets/TicketsLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Ticket, TicketComment, TicketStatus, TicketPriority } from '@/types';
import { ArrowLeft, Clock, MessageSquare, Send, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils';
import { toast } from 'sonner';
import Image from 'next/image';

export default function TicketDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/helpdesk/employee/login');
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
        router.push('/helpdesk/employee/login');
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
      router.push('/helpdesk/employee/dashboard');
    } finally {
      setLoading(false);
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
        router.push('/helpdesk/employee/login');
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
        router.push('/helpdesk/employee/login');
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
        console.error('Failed to send email notification:', error);
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
      <TicketsLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-900 dark:border-white border-t-transparent" />
          <p className="text-[15px] text-zinc-500 font-light">Loading ticket...</p>
        </div>
      </TicketsLayout>
    );
  }

  return (
    <TicketsLayout>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="h-12 w-12 rounded-full bg-white/80 dark:bg-zinc-800/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shrink-0"
          >
            <ArrowLeft className="h-5 w-5 text-zinc-300 dark:text-zinc-100" />
          </Button>
          <div className="space-y-2 flex-1">
            <h1 className="text-[32px] sm:text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
              Ticket T-{String(ticket.ticketNumber).padStart(2, '0')}
            </h1>
            <p className="text-[17px] text-zinc-500 dark:text-zinc-400 font-light">
              View and update your ticket
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 items-start">
          <div className="lg:col-span-2 space-y-8">
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
                      <span className="text-zinc-500 text-[12px]">Created by you</span>
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

            <div className="p-8 rounded-[32px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-zinc-900 dark:text-zinc-100 flex flex-col space-y-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h2 className="text-[20px] font-semibold tracking-tight">Comments & Updates</h2>
                <span className="ml-auto px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[13px] font-medium">
                  {comments.length}
                </span>
              </div>

              <div className="space-y-6">
                {comments.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-[15px] font-light italic">
                    No comments yet.
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4 group">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="text-[13px] bg-black/5 dark:bg-white/10 font-medium">
                          {getInitials(comment.user?.name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-[15px] text-zinc-900 dark:text-zinc-100">
                            {comment.user?.name}
                          </span>
                          <span className="text-[13px] text-zinc-500 font-light">
                            {formatDistanceToNow(new Date(comment.createdAt))} ago
                          </span>
                        </div>
                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-black/[0.02] dark:border-white/[0.02] text-[15px] text-zinc-700 dark:text-zinc-300 leading-relaxed font-light whitespace-pre-wrap">
                          {comment.content}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSubmitComment} className="mt-4">
                <div className="relative">
                  <Textarea
                    placeholder="Type a message..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[120px] resize-none pb-14 bg-white/50 dark:bg-zinc-900/50 rounded-2xl border-black/[0.06] dark:border-white/[0.06] text-[15px] focus-visible:ring-black/5 dark:focus-visible:ring-white/5"
                    disabled={submitting}
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <Button 
                      type="submit" 
                      size="sm"
                      disabled={submitting || !newComment.trim()}
                      className="rounded-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 shadow-sm"
                    >
                      {submitting ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-100 border-t-transparent" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </TicketsLayout>
  );
}
