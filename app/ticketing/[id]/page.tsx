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
import { Ticket, TicketComment, TicketStatus, TicketPriority, TicketCategory } from '@/types';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  AlertCircle,
  MessageSquare,
  Send,
  CheckCircle2,
  Edit,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils';
import { toast } from 'sonner';

export default function TicketDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Mock data - replace with API call
  useEffect(() => {
    const loadTicketDetails = async () => {
      setLoading(true);

      // Simulate API call
      setTimeout(() => {
        const mockTicket: Ticket = {
          id: ticketId,
          title: 'Login page not working on mobile',
          description: 'Users are unable to log in from mobile devices. The login button does not respond to touches. This issue started appearing after the latest update deployed on December 20th. Multiple users have reported this problem across different mobile devices including iOS and Android.',
          priority: TicketPriority.URGENT,
          status: TicketStatus.IN_PROGRESS,
          category: TicketCategory.TECHNICAL,
          createdBy: 'user-1',
          assignedTo: 'admin-1',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 30 * 60 * 1000),
          resolvedAt: null,
          creator: { 
            id: 'user-1', 
            name: 'John Doe', 
            email: 'john@example.com', 
            role: 'EMPLOYEE', 
            teamId: null, 
            createdAt: new Date(), 
            updatedAt: new Date() 
          },
          assignee: { 
            id: 'admin-1', 
            name: 'Admin User', 
            email: 'admin@example.com', 
            role: 'ADMIN', 
            teamId: null, 
            createdAt: new Date(), 
            updatedAt: new Date() 
          },
        };

        const mockComments: TicketComment[] = [
          {
            id: 'comment-1',
            ticketId: ticketId,
            userId: 'admin-1',
            content: 'Thank you for reporting this issue. I\'ve assigned this to our development team and they are investigating the root cause.',
            createdAt: new Date(Date.now() - 90 * 60 * 1000),
            user: { 
              id: 'admin-1', 
              name: 'Admin User', 
              email: 'admin@example.com', 
              role: 'ADMIN', 
              teamId: null, 
              createdAt: new Date(), 
              updatedAt: new Date() 
            },
          },
          {
            id: 'comment-2',
            ticketId: ticketId,
            userId: 'user-1',
            content: 'Thanks for the quick response. Just to add, the issue seems to be specific to the login button. Other buttons on the page are working fine.',
            createdAt: new Date(Date.now() - 60 * 60 * 1000),
            user: { 
              id: 'user-1', 
              name: 'John Doe', 
              email: 'john@example.com', 
              role: 'EMPLOYEE', 
              teamId: null, 
              createdAt: new Date(), 
              updatedAt: new Date() 
            },
          },
          {
            id: 'comment-3',
            ticketId: ticketId,
            userId: 'admin-1',
            content: 'We\'ve identified the issue. It was a CSS conflict introduced in the latest update. A fix is being deployed now and should be live within the next hour.',
            createdAt: new Date(Date.now() - 30 * 60 * 1000),
            user: { 
              id: 'admin-1', 
              name: 'Admin User', 
              email: 'admin@example.com', 
              role: 'ADMIN', 
              teamId: null, 
              createdAt: new Date(), 
              updatedAt: new Date() 
            },
          },
        ];

        setTicket(mockTicket);
        setComments(mockComments);
        setLoading(false);
      }, 500);
    };

    loadTicketDetails();
  }, [ticketId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmittingComment(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      const comment: TicketComment = {
        id: `comment-${Date.now()}`,
        ticketId: ticketId,
        userId: 'current-user',
        content: newComment,
        createdAt: new Date(),
        user: { 
          id: 'current-user', 
          name: 'You', 
          email: 'you@example.com', 
          role: 'EMPLOYEE', 
          teamId: null, 
          createdAt: new Date(), 
          updatedAt: new Date() 
        },
      };

      setComments([...comments, comment]);
      setNewComment('');
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      if (ticket) {
        setTicket({ ...ticket, status: newStatus, updatedAt: new Date() });
        toast.success('Ticket status updated');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <TicketsLayout>
        <div className="space-y-6">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-full bg-muted animate-pulse rounded mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TicketsLayout>
    );
  }

  if (!ticket) {
    return (
      <TicketsLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ticket Not Found</h3>
          <p className="text-muted-foreground mb-4">
            The ticket you're looking for doesn't exist.
          </p>
          <Button onClick={() => router.push('/ticketing')}>
            Back to Tickets
          </Button>
        </div>
      </TicketsLayout>
    );
  }

  return (
    <TicketsLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Ticket Details</h1>
            <p className="text-muted-foreground">Ticket #{ticket.id}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Ticket Info */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="outline">{ticket.category}</Badge>
                    </div>
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

                <Separator />

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Created {formatDistanceToNow(new Date(ticket.createdAt))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(ticket.creator?.name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <span>by {ticket.creator?.name}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments ({comments.length})
                </CardTitle>
                <CardDescription>Discussion and updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Comments List */}
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

                {/* Add Comment Form */}
                <form onSubmit={handleSubmitComment} className="space-y-3">
                  <Separator />
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      disabled={submittingComment}
                    />
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        size="sm" 
                        disabled={submittingComment || !newComment.trim()}
                      >
                        {submittingComment ? (
                          <>Posting...</>
                        ) : (
                          <>
                            <Send className="mr-2 h-3 w-3" />
                            Post Comment
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={ticket.status}
                  onValueChange={(value) => handleStatusChange(value as TicketStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TicketStatus.OPEN}>Open</SelectItem>
                    <SelectItem value={TicketStatus.IN_PROGRESS}>In Progress</SelectItem>
                    <SelectItem value={TicketStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={TicketStatus.RESOLVED}>Resolved</SelectItem>
                    <SelectItem value={TicketStatus.CLOSED}>Closed</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Ticket Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
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
                  <span className="text-muted-foreground">Assigned To</span>
                  {ticket.assignee ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(ticket.assignee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{ticket.assignee.name}</span>
                    </div>
                  ) : (
                    <p className="font-medium text-muted-foreground">Unassigned</p>
                  )}
                </div>
                <Separator />
                <div>
                  <span className="text-muted-foreground">Last Updated</span>
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(ticket.updatedAt))}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Ticket
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-destructive hover:text-destructive" 
                  size="sm"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Ticket
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TicketsLayout>
  );
}
