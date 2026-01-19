'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { TicketsLayout } from '@/components/tickets/TicketsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ticket, TicketComment, TicketStatus, TicketPriority, TicketCategory, Role, ITSupportSubcategory } from '@/types';
import { ArrowLeft, Clock, User, MessageSquare, AlertCircle, Send, Image as ImageIcon, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils';
import { toast } from 'sonner';

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
        router.push('/ticketing/employee/login');
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
        router.push('/ticketing/employee/login');
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
      router.push('/ticketing/employee/dashboard');
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
        router.push('/ticketing/employee/login');
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
        router.push('/ticketing/employee/login');
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
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
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

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.URGENT:
        return 'destructive';
      case TicketPriority.HIGH:
        return 'default';
      case TicketPriority.MEDIUM:
        return 'secondary';
      case TicketPriority.LOW:
        return 'outline';
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

  if (loading) {
    return (
      <TicketsLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </TicketsLayout>
    );
  }

  if (!ticket) {
    return (
      <TicketsLayout>
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">Ticket not found</p>
        </div>
      </TicketsLayout>
    );
  }

  return (
    <TicketsLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ticket Details</h1>
            <p className="text-muted-foreground">View and update your ticket</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                    <Badge variant="outline">T-{String(ticket.ticketNumber).padStart(2, '0')}</Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant="outline">{ticket.category}</Badge>
                    <Badge variant="outline">{getSubcategoryLabel(ticket.subcategory)}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                </div>

                {/* Screenshots Section */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Screenshots
                  </h4>
                  {!ticket.screenshots || ticket.screenshots.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No screenshots attached
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {ticket.screenshots.map((screenshot: any, index: number) => (
                        <div key={screenshot.id} className="relative group cursor-pointer">
                          <div className="aspect-video rounded-lg border bg-muted overflow-hidden">
                            <img
                              src={screenshot.url}
                              alt={screenshot.filename}
                              className="w-full h-full object-cover hover:scale-105 transition-transform"
                              onClick={() => window.open(screenshot.url, '_blank')}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {screenshot.filename}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(ticket.creator?.name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <span>Created by {ticket.creator?.name}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(ticket.createdAt))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments & Updates ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {getInitials(comment.user?.name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {comment.user?.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt))}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSubmitComment} className="space-y-3">
                  <Separator />
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    disabled={submitting}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={submitting || !newComment.trim()}>
                      <Send className="mr-2 h-3 w-3" />
                      Post Comment
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium capitalize">
                    {ticket.status.replace(/_/g, ' ')}
                  </p>
                </div>
                <Separator />
                <div>
                  <span className="text-muted-foreground">Priority</span>
                  <p className="font-medium">{ticket.priority}</p>
                </div>
                <Separator />
                <div>
                  <span className="text-muted-foreground">Category</span>
                  <p className="font-medium">{ticket.category}</p>
                </div>
                <Separator />
                <div>
                  <span className="text-muted-foreground">Issue Type</span>
                  <p className="font-medium">{getSubcategoryLabel(ticket.subcategory)}</p>
                </div>
                <Separator />
                <div>
                  <span className="text-muted-foreground">Created</span>
                  <p className="font-medium">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </p>
                </div>
                <Separator />
                <div>
                  <span className="text-muted-foreground">Last Updated</span>
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(ticket.updatedAt))}
                  </p>
                </div>
                <Separator />
                <div>
                  <span className="text-muted-foreground">Assigned To</span>
                  <p className="font-medium">
                    {ticket.assignee?.name || 'Unassigned'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {ticket.assignee && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Assigned To
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(ticket.assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{ticket.assignee.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.assignee.email}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </TicketsLayout>
  );
}
