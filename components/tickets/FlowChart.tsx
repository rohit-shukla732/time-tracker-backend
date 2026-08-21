'use client';

import { motion } from 'framer-motion';

export interface FlowPoint {
  date: string;
  created: number;
  resolved: number;
}

const W = 560;
const H = 190;
const PAD = 10;

function smoothPath(pts: Array<{ x: number; y: number }>) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function FlowChart({ data }: { data: FlowPoint[] }) {
  if (!data.length) return null;

  const max = Math.max(1, ...data.map(d => Math.max(d.created, d.resolved)));
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);

  const createdPts = data.map((d, i) => ({ x: x(i), y: y(d.created) }));
  const resolvedPts = data.map((d, i) => ({ x: x(i), y: y(d.resolved) }));

  const createdLine = smoothPath(createdPts);
  const resolvedLine = smoothPath(resolvedPts);
  const createdArea = `${createdLine} L ${x(data.length - 1)} ${H - PAD} L ${x(0)} ${H - PAD} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto text-zinc-900 dark:text-zinc-100"
      role="img"
      aria-label="Tickets created and resolved over the last 14 days"
    >
      <defs>
        <linearGradient id="flow-created-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.16} />
          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75].map(f => (
        <line
          key={f}
          x1={PAD}
          x2={W - PAD}
          y1={y(max * f)}
          y2={y(max * f)}
          stroke="currentColor"
          strokeOpacity={0.07}
          strokeDasharray="3 7"
        />
      ))}

      <motion.path
        d={createdArea}
        fill="url(#flow-created-fill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.5 }}
      />

      <motion.path
        d={createdLine}
        fill="none"
        stroke="#6366f1"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
      <motion.path
        d={resolvedLine}
        fill="none"
        stroke="#10b981"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: 'easeOut', delay: 0.25 }}
      />

      {data.map((d, i) => (
        <g key={d.date}>
          <circle cx={x(i)} cy={y(d.created)} r={3.5} fill="#6366f1">
            <title>{`${d.date}: ${d.created} created`}</title>
          </circle>
          <circle cx={x(i)} cy={y(d.resolved)} r={3.5} fill="#10b981">
            <title>{`${d.date}: ${d.resolved} resolved`}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}
