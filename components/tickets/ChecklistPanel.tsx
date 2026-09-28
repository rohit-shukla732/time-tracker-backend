'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/tickets/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle2, Circle, Plus, Trash2, Loader2, ListChecks, ClipboardList, Users } from 'lucide-react';
import {
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_ACTION_LABELS,
} from '@/components/tickets/lifecycle';
import { formatDistanceToNow } from '@/lib/utils';
import { toast } from 'sonner';
import type { TicketSubjectInfo } from '@/types';

export interface ChecklistItem {
  id: string;
  ticketId: string;
  title: string;
  order: number;
  done: boolean;
  doneById: string | null;
  doneAt: Date | null;
  note: string | null;
  equipmentCategory?: string | null;
  equipmentAction?: string | null;
  doneBy?: { id: string; name: string; email: string; role: string } | null;
  subjectId?: string | null;
}

interface ChecklistPanelProps {
  ticketId: string;
  items: ChecklistItem[];
  onItemsChange: (items: ChecklistItem[]) => void;
  subjects?: TicketSubjectInfo[];
  disabled?: boolean;
  embedded?: boolean;
}

export function ChecklistPanel({
  ticketId,
  items,
  onItemsChange,
  subjects,
  disabled,
  embedded,
}: ChecklistPanelProps) {
  const [newItemTitle, setNewItemTitle] = useState('');
  const [addSubjectId, setAddSubjectId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const hasGrouping = Boolean(subjects && subjects.length > 0);
  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const allDone = total > 0 && doneCount === total;

  const getInitials = (name: string) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const toggleItem = async (item: ChecklistItem) => {
    if (disabled) return;
    // Optimistic update
    const updated: ChecklistItem = {
      ...item,
      done: !item.done,
      doneAt: !item.done ? new Date() : null,
      doneById: !item.done ? 'me' : null,
    };
    onItemsChange(items.map((i) => (i.id === item.id ? updated : i)));
    setBusyIds((prev) => new Set(prev).add(item.id));

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/tickets/${ticketId}/checklist/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ done: updated.done }),
      });
      if (!res.ok) throw new Error();
      const serverItem = await res.json();
      onItemsChange(items.map((i) => (i.id === item.id ? serverItem : i)));
    } catch {
      onItemsChange(items.map((i) => (i.id === item.id ? item : i)));
      toast.error('Failed to update checklist item');
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const deleteItem = async (item: ChecklistItem) => {
    const previous = items;
    onItemsChange(items.filter((i) => i.id !== item.id));
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/tickets/${ticketId}/checklist/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      toast.success('Checklist item removed');
    } catch {
      onItemsChange(previous);
      toast.error('Failed to remove item');
    }
  };

  const addItem = async () => {
    const title = newItemTitle.trim();
    if (!title) return;
    setAdding(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/tickets/${ticketId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({
          title,
          ...(hasGrouping && addSubjectId ? { subjectId: addSubjectId } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      const item = await res.json();
      onItemsChange([...items, item]);
      setNewItemTitle('');
    } catch {
      toast.error('Failed to add checklist item');
    } finally {
      setAdding(false);
    }
  };

  const renderItemRow = (item: ChecklistItem) => (
    <div
      key={item.id}
      className="group flex items-start gap-3 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
    >
      <div className="pt-0.5">
        {busyIds.has(item.id) ? (
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        ) : (
          <Checkbox
            checked={item.done}
            onCheckedChange={() => toggleItem(item)}
            disabled={disabled}
            aria-label={`Mark "${item.title}" as done`}
            className={item.done ? 'border-teal-500 data-[state=checked]:bg-teal-500' : ''}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-[15px] leading-relaxed ${
            item.done
              ? 'text-zinc-400 dark:text-zinc-500 line-through font-light'
              : 'text-zinc-900 dark:text-zinc-100 font-medium'
          }`}
        >
          {item.title}
        </p>
        {item.equipmentCategory && item.equipmentAction && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
            <ClipboardList className="h-3 w-3" />
            Logs {EQUIPMENT_CATEGORY_LABELS[item.equipmentCategory] ?? item.equipmentCategory} ·{' '}
            {EQUIPMENT_ACTION_LABELS[item.equipmentAction] ?? item.equipmentAction}
          </span>
        )}
        {item.done && item.doneBy && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px] bg-teal-500/10 text-teal-600 dark:text-teal-400 font-medium">
                {getInitials(item.doneBy.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[12px] text-zinc-500 dark:text-zinc-400 font-light">
              {item.doneBy.name} · {item.doneAt ? formatDistanceToNow(new Date(item.doneAt)) : ''}
            </span>
          </div>
        )}
      </div>
      {!disabled && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove "${item.title}"`}
          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-destructive hover:bg-destructive/10 transition-opacity"
          onClick={() => deleteItem(item)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );

  // Group items by joiner when the ticket has multiple subjects; anything not
  // assigned to a known subject lands in a shared "General" group.
  const groups = hasGrouping
    ? (subjects as TicketSubjectInfo[]).map((subject) => ({
        subject,
        items: items.filter((i) => i.subjectId === subject.id),
      }))
    : [];
  const unassigned = hasGrouping
    ? items.filter(
        (i) => !i.subjectId || !(subjects as TicketSubjectInfo[]).some((s) => s.id === i.subjectId)
      )
    : items;
  const hasUnassigned = hasGrouping && unassigned.length > 0;

  const progressBar = total > 0 && (
    <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          allDone ? 'bg-emerald-500' : 'bg-teal-500'
        }`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );

  const primaryDefault =
    (hasGrouping && (subjects as TicketSubjectInfo[]).find((s) => s.isPrimary)?.id) ||
    (hasGrouping && (subjects as TicketSubjectInfo[])[0]?.id) ||
    null;

  const subjectPicker =
    hasGrouping && (subjects as TicketSubjectInfo[]).length > 1 ? (
      <Select value={addSubjectId ?? primaryDefault ?? undefined} onValueChange={setAddSubjectId}>
        <SelectTrigger id="checklist-subject" aria-label="Assign new task to" className="h-11 rounded-2xl border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[13px] w-full sm:w-56 shrink-0">
          <SelectValue placeholder="Assign to joiner…" />
        </SelectTrigger>
        <SelectContent className="rounded-2xl">
          {(subjects as TicketSubjectInfo[]).map((subject) => (
            <SelectItem key={subject.id} value={subject.id} className="text-[13px] font-medium">
              {subject.name || subject.email || 'Joiner'} {subject.isPrimary ? '(primary)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null;

  const itemsList = total > 0 ? (
    <div className={hasUnassigned || groups.some((g) => g.items.length > 0) ? 'space-y-5' : 'space-y-1.5'}>
      {hasGrouping ? (
        groups.map(({ subject, items: groupItems }) => {
          if (groupItems.length === 0) return null;
          const gDone = groupItems.filter((i) => i.done).length;
          const linked = Boolean(subject.employee);
          return (
            <div key={subject.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 px-1 pt-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className={`text-[9px] font-medium ${
                      linked
                        ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {getInitials(subject.name || subject.email || 'J')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                    {subject.name || subject.email || 'Joiner'}
                  </span>
                  {subject.isPrimary && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[9px] font-semibold uppercase tracking-wide">
                      Primary
                    </span>
                  )}
                  {linked ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[9px] font-semibold uppercase tracking-wide">
                      Linked
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-semibold uppercase tracking-wide">
                      Unlinked
                    </span>
                  )}
                </div>
                <span className="text-[12px] text-zinc-400 font-light shrink-0">
                  {gDone}/{groupItems.length}
                </span>
              </div>
              <div className="space-y-0.5">
                {groupItems.map(renderItemRow)}
              </div>
            </div>
          );
        })
      ) : null}
      {hasUnassigned && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 px-1 pt-1">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-500 dark:text-zinc-400">
              <Users className="h-3.5 w-3.5" />
              General / shared
            </span>
          </div>
          <div className="space-y-0.5">{unassigned.map(renderItemRow)}</div>
        </div>
      )}
      {!hasGrouping && (
        <div className="space-y-0.5">{items.map(renderItemRow)}</div>
      )}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <ListChecks className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-3" strokeWidth={1.5} />
      <p className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">No checklist items</p>
      <p className="text-[14px] text-zinc-500 font-light">Add the first task below</p>
    </div>
  );

  const addForm = !disabled && (
    <div className="flex flex-col gap-2 pt-5 border-t border-black/[0.04] dark:border-white/[0.04]">
      {subjectPicker && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Assign new task to
          </p>
          <div className="w-full sm:w-56">{subjectPicker}</div>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="Add a checklist task…"
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !adding) addItem(); }}
          disabled={adding}
          className="h-11 rounded-2xl border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[14px]"
        />
        <Button
          onClick={addItem}
          disabled={adding || !newItemTitle.trim()}
          className="h-11 px-5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 shrink-0"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add
        </Button>
      </div>
    </div>
  );

  const hint = total > 0 && !allDone && disabled && (
    <p className="text-[13px] text-amber-600 dark:text-amber-400 font-light">
      Complete every checklist item before resolving this ticket.
    </p>
  );

  if (embedded) {
    return (
      <div className="flex flex-col gap-5">
        {progressBar}
        {itemsList}
        {addForm}
        {hint}
      </div>
    );
  }

  return (
    <GlassCard className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
          <ListChecks className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Checklist
          </h2>
          <p className="text-[14px] text-zinc-500 dark:text-zinc-400 font-light">
            {doneCount} of {total} complete
            {hasGrouping && subjects && subjects.length > 1 && ` · ${subjects.length} joiners each with their own copy`}
          </p>
        </div>
        {total > 0 && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold ${
              allDone
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            {allDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
            {progress}%
          </span>
        )}
      </div>
      {total > 0 && <div className="mb-6">{progressBar}</div>}
      {itemsList}
      {addForm && <div className="mt-6">{addForm}</div>}
      {hint}
    </GlassCard>
  );
}