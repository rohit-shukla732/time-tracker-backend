'use client';

import { motion } from 'framer-motion';

export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  className,
  trackClassName = 'text-zinc-200/70 dark:text-zinc-800',
  progressClassName = 'text-indigo-500',
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  progressClassName?: string;
}) {
  const radius = (size - stroke) / 2;
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={className} style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          stroke="currentColor"
          className={trackClassName}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          stroke="currentColor"
          strokeLinecap="round"
          className={progressClassName}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: clamped / 100 }}
          transition={{ type: 'spring', stiffness: 60, damping: 20 }}
        />
      </svg>
    </div>
  );
}