'use client';

import { useCallback, useEffect, useState } from 'react';
import { GlassCard } from '@/components/tickets/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, History } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils';
import { toast } from 'sonner';
import {
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_ACTION_LABELS,
  EQUIPMENT_ACTION_STYLES,
} from '@/components/tickets/lifecycle';
import { CATEGORY_ICONS, buildEquipmentSummary, type EquipmentData } from '@/components/tickets/equipment';
import type { EquipmentChange, EquipmentSubject } from '@/types';

export function useEquipment(ticketId: string, enabled = true) {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<EquipmentSubject[]>([]);
  const [subject, setSubject] = useState<EquipmentSubject | null>(null);
  const [changes, setChanges] = useState<EquipmentChange[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reload = useCallback(
    async (subjectId?: string | null) => {
      try {
        const token = localStorage.getItem('accessToken');
        const qs = subjectId
          ? `?subjectId=${encodeURIComponent(subjectId)}`
          : '';
        const res = await fetch(`/api/tickets/${ticketId}/equipment${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSubjects(data.subjects ?? []);
        setSubject(data.subject ?? null);
        setChanges(data.changes ?? []);
        if (data.subject?.id) setSelectedId(data.subject.id);
      } catch {
        // keep whatever we last had; panel surfaces errors via toast on actions
      } finally {
        setLoading(false);
      }
    },
    [ticketId]
  );

  const selectSubject = useCallback(
    (id: string) => {
      setSelectedId(id);
      reload(id);
    },
    [reload]
  );

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  return { loading, subjects, subject, changes, selectedId, selectSubject, reload };
}

interface EquipmentPanelProps {
  ticketId: string;
  embedded?: boolean;
  data?: EquipmentData;
  onRefresh?: (subjectId?: string | null) => void;
}

export function EquipmentPanel({
  ticketId,
  embedded,
  data: externalData,
  onRefresh,
}: EquipmentPanelProps) {
  const internal = useEquipment(ticketId, !externalData);
  const loading = externalData ? externalData.loading : internal.loading;
  const subjects = externalData ? externalData.subjects : internal.subjects;
  const subject = externalData ? externalData.subject : internal.subject;
  const changes = externalData ? externalData.changes : internal.changes;
  const selectedId = externalData ? (externalData.selectedId ?? externalData.subject?.id ?? null) : internal.selectedId;
  const chooseSubject = externalData
    ? (id: string) => {
        if (externalData.selectSubject) externalData.selectSubject(id);
        else onRefresh?.(id);
      }
    : internal.selectSubject;
  const refresh = externalData ? (onRefresh ?? (() => {})) : internal.reload;

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ category: 'LAPTOP', action: 'ISSUED', label: '', note: '' });

  const getInitials = (name: string) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const summary = buildEquipmentSummary(changes);
  const summaryEntries = Object.entries(summary).sort((a, b) => b[1].total - a[1].total);

  const addChange = async () => {
    setAdding(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/tickets/${ticketId}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ ...form, subjectId: selectedId ?? undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed');
      }
      setForm({ category: 'LAPTOP', action: 'ISSUED', label: '', note: '' });
      toast.success('Equipment change logged');
      refresh();
    } catch {
      toast.error('Failed to log equipment change');
    } finally {
      setAdding(false);
    }
  };

  const subjectLabel = subject?.subjectName ?? subject?.subjectEmail ?? 'this employee';

  const subjectSelector = subjects.length > 1 && (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shrink-0">
        For
      </span>
      <Select value={selectedId ?? undefined} onValueChange={(v) => chooseSubject(v)}>
        <SelectTrigger className={`${embedded ? 'h-10 rounded-xl' : 'h-11 rounded-2xl'} border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[13px] w-auto min-w-0 flex-1`}>
          <SelectValue placeholder="Select joiner…" />
        </SelectTrigger>
        <SelectContent className="rounded-2xl">
          {subjects.map((s) => (
            <SelectItem key={s.id} value={s.id} className="text-[13px] font-medium">
              {s.subjectName || s.subjectEmail || 'Joiner'}
              {!(s.userId) ? ' (unlinked)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const summaryChips = summaryEntries.length > 0 && (
    <div className={`flex flex-wrap ${embedded ? 'gap-1.5' : 'gap-2'}`}>
      {summaryEntries.map(([category, { total, byAction }]) => {
        const Icon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.OTHER;
        const actions = Object.entries(byAction)
          .map(([a, n]) => `${EQUIPMENT_ACTION_LABELS[a] ?? a} ${n}×`)
          .join(' · ');
        return (
          <span
            key={category}
            title={actions}
            className={`inline-flex items-center gap-1 font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 ${
              embedded
                ? 'px-2.5 py-1 rounded-lg text-[12px]'
                : 'px-3 py-1.5 rounded-full text-[13px]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {EQUIPMENT_CATEGORY_LABELS[category] ?? category}:{' '}
            <strong className="font-semibold">{total}×</strong>
            {actions && (
              <span className={`text-zinc-400 font-light ${embedded ? 'hidden' : 'hidden sm:inline'}`}>
                {' '}
                — {actions}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );

  const list = loading ? (
    <div className="flex items-center justify-center py-10 text-[14px] text-zinc-400 font-light">
      Loading equipment history…
    </div>
  ) : changes.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <History className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-3" strokeWidth={1.5} />
      <p className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">No equipment changes yet</p>
      <p className="text-[14px] text-zinc-500 font-light">
        Log a change below to start {subjectLabel}&apos;s equipment record
      </p>
    </div>
  ) : (
    <div className={embedded ? 'space-y-1.5' : 'space-y-3'}>
      {changes.map((change) => {
        const isFromThisTicket = change.ticketId === ticketId;
        return (
          <div
            key={change.id}
            className={`flex items-center gap-2.5 rounded-xl border ${
              isFromThisTicket
                ? 'bg-indigo-50/40 dark:bg-indigo-500/[0.06] border-indigo-200/50 dark:border-indigo-500/20'
                : 'bg-zinc-50/60 dark:bg-zinc-800/40 border-black/[0.03] dark:border-white/[0.03]'
            } ${embedded ? 'px-3 py-2' : 'px-3.5 py-3'}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                  {EQUIPMENT_CATEGORY_LABELS[change.category] ?? change.category}
                </span>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                    EQUIPMENT_ACTION_STYLES[change.action] ?? EQUIPMENT_ACTION_STYLES.ISSUED
                  }`}
                >
                  {EQUIPMENT_ACTION_LABELS[change.action] ?? change.action}
                </span>
              </div>
              {change.label && (
                <p className="text-[12px] text-zinc-600 dark:text-zinc-300 font-light truncate">
                  {change.label}
                </p>
              )}
              {change.note && (
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 font-light truncate">
                  {change.note}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[8px] bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium">
                    {getInitials(change.recordedBy?.name ?? 'U')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-light">
                  {change.recordedBy?.name ?? '—'} · {formatDistanceToNow(new Date(change.changedAt))}
                  {change.ticket?.ticketNumber && (
                    <> · via T-{String(change.ticket.ticketNumber).padStart(2, '0')}</>
                  )}
                  {isFromThisTicket && <span className="text-indigo-500 dark:text-indigo-400"> · this ticket</span>}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const manualForm = (
    <div className={embedded ? 'space-y-2' : 'space-y-3'}>
      <div className={`grid grid-cols-2 gap-2 `}>
        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
          <SelectTrigger className={`${embedded ? 'h-10 rounded-xl' : 'h-11 rounded-2xl'} border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[14px]`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            {Object.entries(EQUIPMENT_CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-[13px] font-medium">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v })}>
          <SelectTrigger className={`${embedded ? 'h-10 rounded-xl' : 'h-11 rounded-2xl'} border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[14px]`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            {Object.entries(EQUIPMENT_ACTION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-[13px] font-medium">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input
        placeholder="Label (e.g. serial number, seat code) — optional"
        value={form.label}
        onChange={(e) => setForm({ ...form, label: e.target.value })}
        disabled={adding}
        className={`${embedded ? 'h-10 rounded-xl' : 'h-11 rounded-2xl'} border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[14px]`}
      />
      <div className="flex gap-2">
        <Input
          placeholder="Note — optional"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          disabled={adding}
          className={`${embedded ? 'h-10 rounded-xl' : 'h-11 rounded-2xl'} border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[14px]`}
        />
        <Button
          onClick={addChange}
          disabled={adding}
          className={`${embedded ? 'h-10 rounded-xl px-4' : 'h-11 rounded-2xl px-5'} bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 shrink-0`}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Log
        </Button>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="flex flex-col gap-5">
        {subjectSelector}
        {summaryChips}
        {list}
        <div className="pt-4 border-t border-black/[0.04] dark:border-white/[0.04] space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Log a change
          </p>
          {manualForm}
        </div>
      </div>
    );
  }

  return (
    <GlassCard className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <History className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Equipment Ledger
          </h2>
          <p className="text-[14px] text-zinc-500 dark:text-zinc-400 font-light">
            {loading
              ? 'Loading history…'
              : subject?.isPending
                ? `History for ${subjectLabel} (account not linked yet)`
                : `Every equipment change recorded for ${subjectLabel} across all tickets`}
          </p>
        </div>
        {!loading && changes.length > 0 && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-[13px] font-semibold text-indigo-600 dark:text-indigo-400">
            {changes.length} event{changes.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {subjectSelector && <div className="mb-4">{subjectSelector}</div>}
      {summaryChips && <div className="mb-6">{summaryChips}</div>}
      {list}
      <div className="mt-6 pt-6 border-t border-black/[0.04] dark:border-white/[0.04]">
        {manualForm}
      </div>
    </GlassCard>
  );
}