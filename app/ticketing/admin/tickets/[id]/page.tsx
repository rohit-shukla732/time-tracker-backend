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
import { Ticket, TicketComment, TicketStatus, TicketPriority, TicketCategory, Role } from '@/types';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  MessageSquare,
  Send,
  Save,
  UserPlus,
} from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminTicketDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Mock data
  useEffect(() => {
    const mockTicket: Ticket = {
      id: ticketId,
      title: 'Login page not working on mobile',
      description: 'Users are unable to log in from mobile devices. The login button does not respond to touches.',
      priority: TicketPriority.URGENT,
      status: TicketStatus.IN_PROGRESS,
      category: TicketCategory.IT_SUPPORT,
      createdBy: 'user-1',
      assignedTo: 'admin-1',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000),
      resolvedAt: null,
      creator: { 
        id: 'user-1', 
        name: 'John Doe', 
        email: 'john@example.com', 
        role: Role.EMPLOYEE, 
        teamId: null, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      assignee: { 
        id: 'admin-1', 
        name: 'Admin User', 
        email: 'admin@example.com', 
        role: Role.ADMIN, 
        teamId: null, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
    };

    const mockComments: TicketComment[] = [
      {
        id: 'comment-1',
        ticketId: ticketId,
        userId: 'user-1',
        content: 'This is affecting multiple users in our department.',
        createdAt: new Date(Date.now() - 90 * 60 * 1000),
        user: { 
          id: 'user-1', 
          name: 'John Doe', 
          email: 'john@example.com', 
          role: Role.EMPLOYEE, 
          teamId: null, 
          createdAt: new Date(), 
          updatedAt: new Date() 
        },
      },
    ];

    setTicket(mockTicket);
    setComments(mockComments);
  }, [ticketId]);

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (ticket) {
      setTicket({ ...ticket, status: newStatus, updatedAt: new Date() });
      toast.success('Ticket status updated');
    }
  };

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (ticket) {
      setTicket({ ...ticket, priority: newPriority, updatedAt: new Date() });
      toast.success('Ticket priority updated');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const comment: TicketComment = {
      id: `comment-${Date.now()}`,
      ticketId: ticketId,
      userId: 'admin-1',
      content: newComment,
      createdAt: new Date(),
      user: { 
        id: 'admin-1', 
        name: 'Admin User', 
        email: 'admin@example.com', 
        role: Role.ADMIN, 
        teamId: null, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
    };

    setComments([...comments, comment]);
    setNewComment('');
    setSubmitting(false);
    toast.success('Comment added');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
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

  if (!ticket) {
    return (
      <AdminTicketLayout>
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">Loading ticket...</p>
        </div>
      </AdminTicketLayout>
    );
  }

  return (
    <AdminTicketLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Ticket #{ticket.id}</h1>
            <p className="text-muted-foreground">Manage and resolve ticket</p>
          </div>
          <Button variant="default">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Ticket Info */}
            <Card>
              <CardHeader>
                <div className="space-y-2">
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
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {ticket.description}
                  </p>
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

            {/* Comments */}
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
                  <div className="space-y-2">
                    <Label>Add Comment (Public)</Label>
                    <Textarea
                      placeholder="Write a response to the user..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      disabled={submitting}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="submit" disabled={submitting || !newComment.trim()}>
                      <Send className="mr-2 h-3 w-3" />
                      Post Comment
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Admin Controls */}
          <div className="space-y-4">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={ticket.status} onValueChange={(value) => handleStatusChange(value as TicketStatus)}>
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

            {/* Priority */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={ticket.priority} onValueChange={(value) => handlePriorityChange(value as TicketPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TicketPriority.LOW}>Low</SelectItem>
                    <SelectItem value={TicketPriority.MEDIUM}>Medium</SelectItem>
                    <SelectItem value={TicketPriority.HIGH}>High</SelectItem>
                    <SelectItem value={TicketPriority.URGENT}>Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.assignee ? (
                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {getInitials(ticket.assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{ticket.assignee.name}</p>
                      <p className="text-xs text-muted-foreground">{ticket.assignee.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Unassigned</p>
                )}
                <Button variant="outline" className="w-full" size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Reassign
                </Button>
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Category</span>
                  <p className="font-medium">{ticket.category}</p>
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminTicketLayout>
  );
}
