'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { GlassCard } from '@/components/tickets/shared';
import { History, ChevronRight } from 'lucide-react';
import { AnimatedNumber } from '@/components/tickets/AnimatedNumber';
import {
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_ACTION_LABELS,
} from '@/components/tickets/lifecycle';
import { CATEGORY_ICONS, buildEquipmentSummary, type EquipmentData } from '@/components/tickets/equipment';

interface EquipmentSummaryProps {
  data: EquipmentData;
  onOpen: () => void;
}

export function EquipmentSummary({ data, onOpen }: EquipmentSummaryProps) {
  const { loading, subject, changes } = data;
  const summaryEntries = Object.entries(buildEquipmentSummary(changes)).sort(
    (a, b) => b[1].total - a[1].total,
  );
  const subjectLabel = subject?.subjectName ?? subject?.subjectEmail ?? 'this employee';
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
      aria-label="Open equipment ledger"
    >
      <motion.div
        whileHover={reduce ? undefined : { y: -4 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      >
        <GlassCard className="p-6 transition-shadow duration-300 hover:shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <History className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Equipment Ledger
              </h3>
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 font-light truncate">
                {loading ? 'Loading history…' : (
                  <>
                    <AnimatedNumber value={changes.length} /> event{changes.length !== 1 ? 's' : ''} · {subjectLabel}
                  </>
                )}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 shrink-0" />
          </div>

          {!loading && summaryEntries.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {summaryEntries.slice(0, 4).map(([category, { total, byAction }]) => {
                const Icon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.OTHER;
                const actions = Object.entries(byAction)
                  .map(([a, n]) => `${EQUIPMENT_ACTION_LABELS[a] ?? a} ${n}×`)
                  .join(' · ');
                return (
                  <span
                    key={category}
                    title={actions}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[13px] font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {EQUIPMENT_CATEGORY_LABELS[category] ?? category}:{' '}
                    <strong className="font-semibold">
                      <AnimatedNumber value={total} />×
                    </strong>
                  </span>
                );
              })}
              {summaryEntries.length > 4 && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-medium text-zinc-400 dark:text-zinc-500">
                  +{summaryEntries.length - 4} more
                </span>
              )}
            </div>
          ) : (
            !loading && (
              <p className="text-[13px] text-zinc-400 dark:text-zinc-500 font-light">
                No equipment changes yet — tap to log one
              </p>
            )
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}