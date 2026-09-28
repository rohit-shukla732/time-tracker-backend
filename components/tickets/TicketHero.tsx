'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { statusDotClass, priorityDotClass, priorityLabel } from '@/components/tickets/shared';
import { isLifecycleTicket } from '@/components/tickets/lifecycle';
import { formatDistanceToNow } from '@/lib/utils';
import EmployeeSelect, { type EmployeeOption, type EmployeeSelection } from '@/components/tickets/EmployeeSelect';
import type { Ticket } from '@/types';
import { TicketStatus, TicketPriority } from '@/types';

const STATUS_GLOW: Record<string, string> = {
  OPEN: 'rgba(59,130,246,0.10)',
  IN_PROGRESS: 'rgba(139,92,246,0.10)',
  PENDING: 'rgba(234,179,8,0.09)',
  RESOLVED: 'rgba(16,185,129,0.10)',
  CLOSED: 'rgba(113,113,122,0.09)',
};

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

const triggerClass =
  'flex items-center gap-2 h-9 rounded-full px-3.5 cursor-pointer bg-black/[0.04] dark:bg-white/[0.06] outline-none transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-indigo-400/60 data-[state=open]:bg-black/[0.06] dark:data-[state=open]:bg-white/[0.09]';

const itemClass = 'text-[13px] font-medium py-2';

export function TicketHero({
  ticket,
  onBack,
  itTeamMembers,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  allEmployees,
  linkSelections,
  onLinkSelectionChange,
  linking,
  onLinkEmployee,
  removingSubjectId,
  onRemoveSubject,
}: {
  ticket: Ticket;
  onBack: () => void;
  itTeamMembers: Array<{ id: string; name: string; email: string; role: string }>;
  onStatusChange: (status: TicketStatus) => void;
  onPriorityChange: (priority: TicketPriority) => void;
  onAssigneeChange: (assigneeId: string | null) => void;
  allEmployees: EmployeeOption[];
  linkSelections: Record<string, EmployeeSelection>;
  onLinkSelectionChange: (subjectId: string, selection: EmployeeSelection) => void;
  linking: boolean;
  onLinkEmployee: (subjectId: string, selection: EmployeeSelection) => void;
  removingSubjectId: string | null;
  onRemoveSubject: (subjectId: string) => void;
}) {
  const lifecycle = isLifecycleTicket(ticket.type);

  return (
    <header className="relative">
      {/* Soft status-tinted glow — settles on load, crossfades on change */}
      <motion.div
        key={ticket.status}
        className="pointer-events-none absolute -top-24 -right-24 h-[26rem] w-[26rem] rounded-full blur-[120px]"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: STATUS_GLOW[ticket.status] ?? STATUS_GLOW.CLOSED }}
      />

      <div className="relative flex flex-col gap-10 lg:flex-row lg:items-stretch lg:justify-between lg:gap-10">
        {/* Left column — title, description, details, controls */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onBack}
              aria-label="Go back to tickets"
              className="flex items-center gap-1.5 h-9 pl-3 pr-4 rounded-full text-[13px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Tickets
            </motion.button>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
              T-{String(ticket.ticketNumber).padStart(2, '0')}
            </span>
          </div>

          <div className="mt-10">
            <h1 className="text-[34px] sm:text-[46px] font-semibold tracking-[-0.03em] leading-[1.08] text-zinc-900 dark:text-zinc-100">
              {ticket.title}
            </h1>

            {/* Description in place of the subtitle line */}
            <p className="mt-5 text-[15px] sm:text-[16px] leading-[1.75] text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap font-light">
              {ticket.description}
            </p>

            {/* Details — above the controls */}
            <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-2 text-[13px] text-zinc-400 dark:text-zinc-500 font-light">
              {ticket.category?.name && (
                <>
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">{ticket.category.name}</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span>{ticket.subcategory?.name || 'Not specified'}</span>
              <span aria-hidden="true">·</span>
              <span>Opened {formatDistanceToNow(new Date(ticket.createdAt))} ago</span>
              <span aria-hidden="true">·</span>
              <span>Updated {formatDistanceToNow(new Date(ticket.updatedAt))} ago</span>
            </div>

            {/* Controls — status / priority / assignee in place of badges */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {/* Status */}
              <Select value={ticket.status} onValueChange={(v) => onStatusChange(v as TicketStatus)}>
                <SelectTrigger aria-label="Change ticket status" className={triggerClass}>
                  <span className={`h-2 w-2 rounded-full ${statusDotClass(ticket.status)}`} aria-hidden="true" />
                  <span className="text-[13px] font-semibold capitalize text-zinc-900 dark:text-zinc-100">
                    {ticket.status.replace(/_/g, ' ')}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {Object.values(TicketStatus).map((s) => (
                    <SelectItem key={s} value={s} className={itemClass}>
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${statusDotClass(s)}`} />
                        {s.replace(/_/g, ' ')}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Priority */}
              <Select value={ticket.priority} onValueChange={(v) => onPriorityChange(v as TicketPriority)}>
                <SelectTrigger aria-label="Change ticket priority" className={triggerClass}>
                  <span className={`h-2 w-2 rounded-full ${priorityDotClass(ticket.priority)}`} aria-hidden="true" />
                  <span className="text-[13px] font-semibold capitalize text-zinc-900 dark:text-zinc-100">
                    {priorityLabel(ticket.priority)}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {Object.values(TicketPriority).map((p) => (
                    <SelectItem key={p} value={p} className={itemClass}>
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${priorityDotClass(p)}`} />
                        {priorityLabel(p)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Assignee */}
              <Select
                value={ticket.assignedTo || 'unassigned'}
                onValueChange={(value) => onAssigneeChange(value === 'unassigned' ? null : value)}
              >
                <SelectTrigger aria-label="Assign ticket" className={`${triggerClass} min-w-0 max-w-full`}>
                  <SelectValue placeholder="Assign to…">
                    <div className="flex items-center gap-2 min-w-0">
                      {ticket.assignee ? (
                        <>
                          <Avatar className="h-5 w-5 shrink-0">
                            <AvatarFallback className="text-[9px] bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium">
                              {getInitials(ticket.assignee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {ticket.assignee.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-[13px] font-medium text-zinc-400 dark:text-zinc-500">Unassigned</span>
                      )}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="unassigned" className={itemClass}>
                    <span className="text-zinc-500">Unassigned</span>
                  </SelectItem>
                  {itTeamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id} className={itemClass}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px] bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium">
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

        {/* Right column — reporter card */}
        <div className="lg:w-80 shrink-0 lg:self-stretch">
          {ticket.creator && (
            <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-3 rounded-[24px] border border-black/[0.05] dark:border-white/[0.08] bg-white/50 dark:bg-zinc-900/40 p-5 text-center">
              <Avatar className="h-20 w-20 shrink-0 ring-2 ring-black/[0.04] dark:ring-white/[0.08]">
                <AvatarFallback className="text-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
                  {getInitials(ticket.creator.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Requested by</p>
                <p className="mt-1 text-[16px] font-semibold text-zinc-900 dark:text-zinc-100">
                  {ticket.creator.name}
                </p>
                <p className="mt-0.5 text-[13px] text-zinc-500 font-light truncate">{ticket.creator.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Joiners strip — compact cards below the hero so multi-joiner tickets
          don't stack into a tall narrow column */}
      {lifecycle && (ticket.subjects?.length ?? 0) > 0 && (
        <div className="relative mt-10">
          <div className="mb-3 flex items-baseline gap-2 px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
              Joiners
            </h2>
            <span className="text-[12px] text-zinc-400 dark:text-zinc-500 font-light">
              {(ticket.subjects ?? []).length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(ticket.subjects ?? []).map((subject, index) => {
              const employee = subject.employee;
              const linked = Boolean(employee);
              const selection =
                linkSelections[subject.id] ?? { employeeId: null, isNewJoiner: false };
              const displayName = employee?.name ?? subject.name ?? subject.email ?? 'New joiner';
              const displayEmail = employee?.email ?? subject.email ?? null;
              return (
                <div
                  key={subject.id}
                  className={`relative flex flex-col gap-3 rounded-[24px] border p-4 ${
                    linked
                      ? 'border-teal-500/20 bg-teal-500/[0.04] dark:bg-teal-500/[0.06]'
                      : 'border-amber-500/25 bg-amber-500/[0.04] dark:bg-amber-500/[0.06]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onRemoveSubject(subject.id)}
                    disabled={removingSubjectId === subject.id}
                    aria-label={`Remove joiner ${index + 1}`}
                    title="This joiner is not coming — remove them from the ticket"
                    className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:text-red-600 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                  >
                    {removingSubjectId === subject.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <div className="flex items-center gap-3 min-w-0 pr-8">
                    <Avatar className={`h-12 w-12 shrink-0 ring-2 ${linked ? 'ring-teal-500/20' : 'ring-amber-500/20'}`}>
                      <AvatarFallback
                        className={`text-[14px] font-semibold ${
                          linked
                            ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {getInitials(displayName || displayEmail)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                          {subject.isPrimary ? 'Primary joiner' : `Joiner ${index + 1}`}
                        </p>
                        {linked ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[9px] font-semibold uppercase tracking-wide">
                            Linked
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-semibold uppercase tracking-wide">
                            No account yet
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[14px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {displayName}
                      </p>
                      {displayEmail && (
                        <p className="text-[12px] text-zinc-500 font-light truncate">{displayEmail}</p>
                      )}
                    </div>
                  </div>

                  {!linked && (
                    <div className="w-full">
                      <EmployeeSelect
                        employees={allEmployees}
                        value={selection}
                        onChange={(sel) => onLinkSelectionChange(subject.id, sel)}
                        label="account"
                        hideHelper
                      />
                      {selection.employeeId && (
                        <Button
                          onClick={() => onLinkEmployee(subject.id, selection)}
                          disabled={linking}
                          className="w-full h-10 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 mt-2"
                        >
                          {linking ? 'Linking…' : 'Link account'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}