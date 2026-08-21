'use client';

import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Single source of truth for status & priority colors                 */
/* ------------------------------------------------------------------ */

export const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  PENDING: 'Pending',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  OPEN: {
    badge: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  IN_PROGRESS: {
    badge: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
    dot: 'bg-purple-500',
  },
  PENDING: {
    badge: 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400',
    dot: 'bg-yellow-500',
  },
  RESOLVED: {
    badge: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  CLOSED: {
    badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    dot: 'bg-zinc-400 dark:bg-zinc-500',
  },
};

export const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export const PRIORITY_STYLES: Record<string, { badge: string; dot: string }> = {
  URGENT: {
    badge: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
    dot: 'bg-red-500',
  },
  HIGH: {
    badge: 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
    dot: 'bg-orange-500',
  },
  MEDIUM: {
    badge: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  LOW: {
    badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    dot: 'bg-zinc-400 dark:bg-zinc-500',
  },
};

const fallbackBadge =
  'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
const fallbackDot = 'bg-zinc-400';

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

export function priorityLabel(priority: string) {
  return PRIORITY_LABELS[priority] ?? priority;
}

export function statusDotClass(status: string) {
  return STATUS_STYLES[status]?.dot ?? fallbackDot;
}

export function priorityDotClass(priority: string) {
  return PRIORITY_STYLES[priority]?.dot ?? fallbackDot;
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

const badgeBase =
  'inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-semibold uppercase tracking-wide border-0 w-fit';

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? { badge: fallbackBadge };
  return (
    <span className={cn(badgeBase, style.badge, className)}>
      <span
        aria-hidden="true"
        className={cn('h-1.5 w-1.5 rounded-full', statusDotClass(status))}
      />
      {statusLabel(status)}
    </span>
  );
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: string;
  className?: string;
}) {
  const style = PRIORITY_STYLES[priority] ?? { badge: fallbackBadge };
  return (
    <span className={cn(badgeBase, style.badge, className)}>
      <span
        aria-hidden="true"
        className={cn('h-1.5 w-1.5 rounded-full', priorityDotClass(priority))}
      />
      {priorityLabel(priority)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Glass card                                                          */
/* ------------------------------------------------------------------ */

export function GlassCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[32px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page header                                                         */
/* ------------------------------------------------------------------ */

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions, meta }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div className="space-y-2 min-w-0">
        <h1 className="text-[32px] sm:text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[17px] text-zinc-500 dark:text-zinc-400 font-light">
            {subtitle}
          </p>
        )}
        {meta}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 shrink-0">{actions}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared button styles                                                */
/* ------------------------------------------------------------------ */

export const btnPrimary =
  'inline-flex items-center justify-center h-12 px-6 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white text-[14px] font-medium transition-all hover:bg-indigo-700 dark:hover:bg-indigo-400 hover:shadow-md hover:shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950';

export const btnSecondary =
  'inline-flex items-center justify-center h-12 px-6 rounded-full border border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white text-[14px] font-medium shadow-sm transition-colors hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950';
