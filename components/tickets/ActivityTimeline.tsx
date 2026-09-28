'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, isToday, formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  Send,
  Lock,
  Sparkles,
  BadgeCheck,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/tickets/shared';
import { Stagger, StaggerItem, EASE } from '@/components/tickets/motion';
import type { Ticket, TicketComment } from '@/types';

interface ActivityEvent {
  id: string;
  type: 'created' | 'resolve' | 'comment';
  at: Date;
  title?: string | null;
  actor?: string | null;
  comment?: TicketComment;
}

function buildEvents(ticket: Ticket, comments: TicketComment[]): ActivityEvent[] {
  const events: ActivityEvent[] = [
    {
      id: `created-${ticket.id}`,
      type: 'created',
      at: new Date(ticket.createdAt),
      actor: ticket.creator?.name ?? null,
      title: ticket.title,
    },
  ];

  if (ticket.resolvedAt) {
    events.push({ id: `resolve-${ticket.id}`, type: 'resolve', at: new Date(ticket.resolvedAt) });
  }

  for (const comment of comments) {
    events.push({
      id: `comment-${comment.id}`,
      type: 'comment',
      at: new Date(comment.createdAt),
      comment,
    });
  }

  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}

function getInitials(name?: string | null) {
  return (
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'
  );
}

const NODE_STYLES: Record<ActivityEvent['type'], string> = {
  created: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300',
  resolve: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  comment: 'bg-white text-zinc-600 border border-black/[0.06] dark:bg-zinc-800/70 dark:text-zinc-300 dark:border-white/[0.06]',
};

const NODE_ICONS: Record<ActivityEvent['type'], React.ComponentType<{ className?: string }>> = {
  created: Sparkles,
  resolve: BadgeCheck,
  comment: MessageSquare,
};

export function ActivityTimeline({
  ticket,
  comments,
  newComment,
  isInternalNote,
  submitting,
  onCommentChange,
  onInternalNoteChange,
  onSubmit,
}: {
  ticket: Ticket;
  comments: TicketComment[];
  newComment: string;
  isInternalNote: boolean;
  submitting: boolean;
  onCommentChange: (value: string) => void;
  onInternalNoteChange: (value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const [focused, setFocused] = useState(false);

  const events = useMemo(() => buildEvents(ticket, comments), [ticket, comments]);

  const days = useMemo(() => {
    const out: Array<{ label: string; events: ActivityEvent[] }> = [];
    for (const ev of events) {
      const label = isToday(ev.at) ? 'Today' : format(ev.at, 'EEEE, MMM d');
      const last = out[out.length - 1];
      if (last && last.label === label) {
        last.events.push(ev);
      } else {
        out.push({ label, events: [ev] });
      }
    }
    return out;
  }, [events]);

  const flatItems: Array<{ kind: 'divider' | 'event'; label?: string; event?: ActivityEvent }> = [];
  for (const day of days) {
    flatItems.push({ kind: 'divider', label: day.label });
    day.events.forEach((event) => flatItems.push({ kind: 'event', event }));
  }

  return (
    <GlassCard className="p-7 sm:p-10">
      <div className="flex items-baseline gap-3 mb-8">
        <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Activity
        </h2>
        <span className="text-[13px] text-zinc-400 dark:text-zinc-500 font-light">
          {comments.length} update{comments.length !== 1 ? 's' : ''}
        </span>
      </div>

      <Stagger className="space-y-1">
        {flatItems.map((item) =>
          item.kind === 'divider' ? (
            <StaggerItem key={`divider-${item.label}`}>
              <div className="flex items-center gap-3 py-4">
                <div className="h-px flex-1 bg-black/[0.04] dark:bg-white/[0.05]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                  {item.label}
                </span>
                <div className="h-px flex-1 bg-black/[0.04] dark:bg-white/[0.05]" />
              </div>
            </StaggerItem>
          ) : (
            <StaggerItem key={item.event!.id}>
              <EventRow event={item.event!} isLast={item.event!.id === events[events.length - 1]?.id} />
            </StaggerItem>
          ),
        )}
      </Stagger>

      {/* Composer */}
      <form onSubmit={onSubmit} className="mt-8">
        <div
          className={`space-y-3 rounded-3xl border p-4 sm:p-5 transition-colors duration-300 ${
            isInternalNote
              ? 'border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/[0.06]'
              : 'border-black/[0.06] dark:border-white/[0.06] bg-white/60 dark:bg-zinc-900/50'
          }`}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Label htmlFor="new-comment" className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
              {isInternalNote ? 'Internal note' : 'Add an update'}
            </Label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Switch
                checked={isInternalNote}
                onCheckedChange={onInternalNoteChange}
                aria-label="Toggle internal note"
              />
              <span
                className={`flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
                  isInternalNote ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500'
                }`}
              >
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Internal
              </span>
            </label>
          </div>

          <motion.div
            animate={{ minHeight: focused ? 140 : 92 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          >
            <Textarea
              id="new-comment"
              placeholder={isInternalNote ? 'Visible to staff only — the requester will not see this…' : 'Write a response or update...'}
              value={newComment}
              onChange={(e) => onCommentChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              rows={focused ? 5 : 3}
              disabled={submitting}
              className={`h-full resize-none rounded-2xl border bg-white/70 dark:bg-zinc-950/40 text-[15px] p-4 placeholder:text-zinc-400 focus-visible:ring-2 transition-colors ${
                isInternalNote
                  ? 'border-amber-500/40 dark:border-amber-500/30 focus-visible:ring-amber-500/40'
                  : 'border-black/[0.06] dark:border-white/[0.06] focus-visible:ring-black/20 dark:focus-visible:ring-white/20'
              }`}
            />
          </motion.div>

          <div className="flex justify-end">
            <motion.div whileTap={{ scale: 0.96 }}>
              <Button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className={`h-10 px-5 rounded-full text-[14px] font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  isInternalNote
                    ? 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-zinc-950'
                    : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100'
                }`}
              >
                <Send className="mr-2 h-4 w-4" />
                {submitting ? 'Posting…' : 'Post'}
              </Button>
            </motion.div>
          </div>
        </div>
      </form>
    </GlassCard>
  );
}

function EventRow({ event, isLast }: { event: ActivityEvent; isLast: boolean }) {
  const Icon = NODE_ICONS[event.type];
  const iconBg = NODE_STYLES[event.type];

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.03] dark:border-white/[0.05] ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && (
          <motion.div
            className="w-px flex-1 min-h-6 my-1.5 bg-gradient-to-b from-zinc-200/80 via-zinc-200/50 to-transparent dark:from-zinc-700/70 dark:via-zinc-700/40"
            initial={false}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.4, ease: EASE }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0 pb-1 pt-0.5">
        {event.type === 'comment' && event.comment ? (
          <CommentBody comment={event.comment} at={event.at} />
        ) : (
          <EventBody event={event} />
        )}
      </div>
    </div>
  );
}

function EventBody({ event }: { event: ActivityEvent }) {
  const label =
    event.type === 'created'
      ? 'Request created'
      : event.type === 'resolve'
        ? 'Resolved'
        : '';

  return (
    <div className="min-w-0">
      <p className="text-[14px] font-medium leading-snug text-zinc-900 dark:text-zinc-100">{label}</p>
      <p className="mt-0.5 text-[12px] text-zinc-400 dark:text-zinc-500 font-light">
        {formatDistanceToNow(event.at)}
        {event.actor ? ` · by ${event.actor}` : ''} · {format(event.at, 'h:mm a')}
      </p>
    </div>
  );
}

function CommentBody({ comment, at }: { comment: TicketComment; at: Date }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-[14px] text-zinc-900 dark:text-zinc-100">
          {comment.user?.name ?? 'Unknown'}
        </span>
        {comment.isInternal && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wide">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Internal
          </span>
        )}
        <span className="text-[12px] text-zinc-400 dark:text-zinc-500 font-light">
          {formatDistanceToNow(at)}
        </span>
      </div>
      <div
        className={`mt-1.5 p-3.5 rounded-2xl rounded-tl-sm border text-[14px] leading-relaxed font-light ${
          comment.isInternal
            ? 'bg-amber-500/[0.06] dark:bg-amber-500/[0.08] border-amber-500/20 dark:border-amber-500/20 text-zinc-800 dark:text-amber-100'
            : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.04] dark:border-white/[0.05] text-zinc-700 dark:text-zinc-300'
        }`}
      >
        {comment.content}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <Avatar className="h-4 w-4">
          <AvatarFallback className="text-[8px] bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium">
            {getInitials(comment.user?.name)}
          </AvatarFallback>
        </Avatar>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-light">
          {format(at, 'h:mm a')}
        </span>
      </div>
    </div>
  );
}