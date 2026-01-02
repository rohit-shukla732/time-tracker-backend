import { Ticket, TicketPriority, TicketStatus, TicketCategory } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Clock, 
  User, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  ArrowRight 
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from '@/lib/utils';

interface TicketCardProps {
  ticket: Ticket;
}

export function TicketCard({ ticket }: TicketCardProps) {
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
      default:
        return 'secondary';
    }
  };

  const getPriorityIcon = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.URGENT:
        return <AlertCircle className="h-3 w-3" />;
      case TicketPriority.HIGH:
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
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
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  const formatStatus = (status: TicketStatus) => {
    return status.replace(/_/g, ' ');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg line-clamp-1">
              {ticket.title}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {ticket.description}
            </CardDescription>
          </div>
          <Badge 
            variant={getPriorityColor(ticket.priority)} 
            className="ml-2 flex items-center gap-1"
          >
            {getPriorityIcon(ticket.priority)}
            {ticket.priority}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Status and Category */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={getStatusColor(ticket.status)}>
              {formatStatus(ticket.status)}
            </Badge>
            <Badge variant="outline">
              {ticket.category}
            </Badge>
          </div>

          {/* Meta Information */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              {/* Creator */}
              {ticket.creator && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-xs">
                      {getInitials(ticket.creator.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{ticket.creator.name}</span>
                </div>
              )}

              {/* Time */}
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">
                  {formatDistanceToNow(new Date(ticket.createdAt))}
                </span>
              </div>
            </div>

            {/* Assignee */}
            {ticket.assignee && (
              <div className="flex items-center gap-1 text-xs">
                <User className="h-3.5 w-3.5" />
                <span>Assigned to {ticket.assignee.name}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2">
            <Link href={`/ticketing/employee/${ticket.id}`}>
              <Button variant="ghost" size="sm" className="gap-1">
                View Details
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
