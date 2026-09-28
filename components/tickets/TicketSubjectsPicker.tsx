'use client';

import { Trash2, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';

export interface TicketSubjectInput {
  key: string;
  name: string;
}

export function createBlankSubject(): TicketSubjectInput {
  return {
    key: crypto.randomUUID(),
    name: '',
  };
}

interface TicketSubjectsPickerProps {
  subjects: TicketSubjectInput[];
  onChange: (subjects: TicketSubjectInput[]) => void;
  ticketTypeLabel: 'onboarding' | 'offboarding';
}

export function TicketSubjectsPicker({
  subjects,
  onChange,
  ticketTypeLabel,
}: TicketSubjectsPickerProps) {
  const update = (index: number, patch: Partial<TicketSubjectInput>) => {
    onChange(subjects.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const add = () => {
    onChange([...subjects, createBlankSubject()]);
  };

  const remove = (index: number) => {
    if (subjects.length <= 1) return;
    onChange(subjects.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {subjects.map((subject, index) => (
        <div
          key={subject.key}
          className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white/40 dark:bg-zinc-900/30 p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Joiner {index + 1}
            </p>
            {subjects.length > 1 && (
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove joiner ${index + 1}`}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[12px] text-zinc-400 hover:text-red-600 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>

          <Input
            placeholder={`${ticketTypeLabel} joiner${index === 0 ? ' (primary)' : ''} name *`}
            value={subject.name}
            onChange={(e) => update(index, { name: e.target.value })}
            className="h-11 px-4 bg-white/50 dark:bg-zinc-900/50 border-black/5 dark:border-white/5 rounded-2xl text-[15px]"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl border border-dashed border-black/10 dark:border-white/10 hover:border-teal-500/40 hover:bg-teal-500/5 text-[14px] font-medium text-zinc-500 dark:text-zinc-400 transition-colors"
      >
        <UserPlus className="h-4 w-4" />
        Add another joiner
      </button>
    </div>
  );
}