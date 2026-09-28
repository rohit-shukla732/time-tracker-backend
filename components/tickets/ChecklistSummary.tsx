'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { GlassCard } from '@/components/tickets/shared';
import { ProgressRing } from '@/components/tickets/ProgressRing';
import { AnimatedNumber } from '@/components/tickets/AnimatedNumber';
import { ListChecks, CheckCircle2, ChevronRight } from 'lucide-react';
import type { ChecklistItem } from '@/components/tickets/ChecklistPanel';

interface ChecklistSummaryProps {
  items: ChecklistItem[];
  onOpen: () => void;
}

export function ChecklistSummary({ items, onOpen }: ChecklistSummaryProps) {
  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const allDone = total > 0 && doneCount === total;
  const remaining = total - doneCount;
  const reduce = useReducedMotion();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group cursor-pointer"
      aria-label="Open checklist"
    >
      <motion.div
        whileHover={reduce ? undefined : { y: -4 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      >
        <GlassCard className="p-6 transition-shadow duration-300 hover:shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <ListChecks className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Checklist
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    allDone
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {allDone ? <CheckCircle2 className="h-3 w-3" /> : null}
                  <AnimatedNumber value={doneCount} />/{total}
                </span>
              </div>
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 font-light">
                {total === 0
                  ? 'No items yet'
                  : allDone
                    ? 'All done'
                    : `${remaining} remaining · ${progress}%`}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 shrink-0" />
          </div>

          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <ProgressRing
                value={progress}
                size={72}
                stroke={7}
                progressClassName={allDone ? 'text-emerald-500' : 'text-teal-500'}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <AnimatedNumber value={progress} className="text-[16px] font-semibold text-zinc-900 dark:text-zinc-100" />
                <span className="text-[10px] text-zinc-400 font-medium">%</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              {total > 0 && !allDone && (
                <p className="text-[13px] text-zinc-600 dark:text-zinc-300 font-light">
                  Focus on the remaining items to unlock resolution.
                </p>
              )}
              <p className="text-[12px] text-amber-600 dark:text-amber-400 font-light mt-1">
                Complete every item before resolving this ticket.
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}