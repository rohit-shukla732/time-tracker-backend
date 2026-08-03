import { Ticket, TicketPriority, TicketStatus } from '@/types';
import { 
  Clock, 
  User, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  ArrowRight,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from '@/lib/utils';

interface TicketCardProps {
  ticket: Ticket;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const getPriorityStyle = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.URGENT:
        return 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border-red-100 dark:border-red-500/20';
      case TicketPriority.HIGH:
        return 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border-orange-100 dark:border-orange-500/20';
      case TicketPriority.MEDIUM:
        return 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-blue-100 dark:border-blue-500/20';
      case TicketPriority.LOW:
        return 'bg-stone-50 text-stone-600 dark:bg-stone-500/10 dark:text-stone-400 border-stone-100 dark:border-stone-500/20';
      default:
        return 'bg-stone-50 text-stone-600 dark:bg-stone-500/10 dark:text-stone-400 border-stone-100 dark:border-stone-500/20';
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

  const getStatusStyle = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN:
        return 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
      case TicketStatus.IN_PROGRESS:
        return 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400';
      case TicketStatus.PENDING:
        return 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400';
      case TicketStatus.RESOLVED:
        return 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400';
      case TicketStatus.CLOSED:
        return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
      default:
        return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
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
    <div className="group relative flex flex-col p-6 rounded-[28px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-black/[0.08] dark:hover:border-white/[0.08] transition-all duration-300">
      <Link href={`/helpdesk/employee/${ticket.id}`} className="absolute inset-0 z-10 rounded-[28px]" />
      
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-[12px] font-semibold tracking-wide uppercase ${getStatusStyle(ticket.status)}`}>
            {formatStatus(ticket.status)}
          </span>
          <span className="px-3 py-1 rounded-full text-[12px] font-medium tracking-wide bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-300">
            T-{String(ticket.ticketNumber).padStart(2, '0')}
          </span>
        </div>
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold tracking-wide uppercase border ${getPriorityStyle(ticket.priority)}`}>
          {getPriorityIcon(ticket.priority)}
          {ticket.priority}
        </span>
      </div>

      <div className="mb-6 flex-1">
        <h3 className="text-[19px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2 line-clamp-1 group-hover:text-primary transition-colors">
          {ticket.title}
        </h3>
        <p className="text-[15px] text-zinc-500 dark:text-zinc-400 line-clamp-2 font-light leading-relaxed">
          {ticket.description}
        </p>
      </div>

      <div className="flex flex-col gap-4 mt-auto">
        <div className="h-px w-full bg-black/5 dark:bg-white/5" />
        
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-4 text-[13px] text-zinc-500 dark:text-zinc-400">
            {ticket.creator && (
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/10">
                  {getInitials(ticket.creator.name)}
                </div>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{ticket.creator.name}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-zinc-400">
              <Clock className="h-4 w-4 opacity-70" />
              <span>{formatDistanceToNow(new Date(ticket.createdAt))}</span>
            </div>
          </div>

          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
