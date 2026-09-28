'use client';

import { cn } from '@/lib/utils';

export const TICKET_TYPE_LABELS: Record<string, string> = {
  SUPPORT: 'Support',
  ONBOARDING: 'Onboarding',
  OFFBOARDING: 'Offboarding',
};

export const TICKET_TYPE_STYLES: Record<string, { badge: string; dot: string }> = {
  SUPPORT: {
    badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    dot: 'bg-zinc-400',
  },
  ONBOARDING: {
    badge: 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400',
    dot: 'bg-teal-500',
  },
  OFFBOARDING: {
    badge: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
};

export function ticketTypeLabel(type: string) {
  return TICKET_TYPE_LABELS[type] ?? type;
}

export function TicketTypeBadge({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const style = TICKET_TYPE_STYLES[type] ?? TICKET_TYPE_STYLES.SUPPORT;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide w-fit',
        style.badge,
        className
      )}
    >
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {ticketTypeLabel(type)}
    </span>
  );
}

export const EQUIPMENT_CATEGORY_LABELS: Record<string, string> = {
  LAPTOP: 'Laptop',
  MONITOR: 'Monitor',
  KEYBOARD: 'Keyboard',
  MOUSE: 'Mouse',
  HEADSET: 'Headset',
  SEAT: 'Seat / Workstation',
  OTHER: 'Other',
};

export const EQUIPMENT_ACTION_LABELS: Record<string, string> = {
  ISSUED: 'Issued',
  REPLACED: 'Replaced',
  RETURNED: 'Returned',
  RELOCATED: 'Relocated',
};

export const EQUIPMENT_ACTION_STYLES: Record<string, string> = {
  ISSUED: 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400',
  REPLACED: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  RETURNED: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  RELOCATED: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
};

export function isLifecycleTicket(type: string | undefined | null): boolean {
  return type === 'ONBOARDING' || type === 'OFFBOARDING';
}
