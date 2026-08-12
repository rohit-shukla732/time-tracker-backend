'use client';

import { useState } from 'react';
import { ChevronsUpDown, Check, Search, Users, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

export interface MultiSelectEmployee {
  id: string;
  name: string;
  email: string;
}

export interface EmployeeRecordInfo {
  userId: string;
  typeName: string;
  color: string;
  isOverride: boolean;
}

interface EmployeeMultiSelectProps {
  employees: MultiSelectEmployee[];
  records: EmployeeRecordInfo[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  placeholder?: string;
}

export default function EmployeeMultiSelect({
  employees,
  records,
  selected,
  onChange,
  placeholder = 'Select employees...',
}: EmployeeMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const recordByUser = new Map(records.map((r) => [r.userId, r]));
  const selectedCount = selected.size;

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const selectAll = () => {
    if (selected.size === employees.length) onChange(new Set());
    else onChange(new Set(employees.map((e) => e.id)));
  };

  const marked = employees.filter((e) => recordByUser.has(e.id));
  const unmarked = employees.filter((e) => !recordByUser.has(e.id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between gap-2 w-full h-[52px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-left transition-all hover:border-zinc-900/20 dark:hover:border-white/20 outline-none"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Users className="h-4 w-4 text-zinc-400 shrink-0" />
              {selectedCount === 0 ? (
                <span className="text-[14px] text-zinc-400 dark:text-zinc-500 truncate">{placeholder}</span>
              ) : (
                <span className="text-[14px] font-medium text-zinc-900 dark:text-white truncate">
                  {selectedCount} employee{selectedCount > 1 ? 's' : ''} selected
                </span>
              )}
            </span>
            <ChevronsUpDown className="h-4 w-4 text-zinc-400 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[calc(100vw-3rem)] max-w-lg p-0 rounded-2xl border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search by name or email..." />
            <CommandList>
              <CommandEmpty>No employees found.</CommandEmpty>
              <CommandItem
                onSelect={selectAll}
                className="flex items-center gap-2 py-2.5 px-3 rounded-xl cursor-pointer data-[selected=true]:bg-transparent"
              >
                <span
                  className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                    selectedCount === employees.length && employees.length > 0
                      ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white'
                      : 'border-zinc-300 dark:border-zinc-600'
                  }`}
                >
                  {selectedCount === employees.length && employees.length > 0 && (
                    <Check className="h-3 w-3 text-white dark:text-zinc-900" />
                  )}
                </span>
                <span className="text-[13px] font-medium">
                  {selectedCount === employees.length && employees.length > 0 ? 'Clear all' : 'Select all'}
                </span>
                <span className="ml-auto text-[12px] text-zinc-400">{employees.length} total</span>
              </CommandItem>
              <CommandSeparator />

              {marked.length > 0 && (
                <CommandGroup heading={`Marked (${marked.length})`}>
                  {marked.map((e) => {
                    const rec = recordByUser.get(e.id)!;
                    const isSelected = selected.has(e.id);
                    return (
                      <CommandItem
                        key={e.id}
                        onSelect={() => toggle(e.id)}
                        className="flex items-center gap-2.5 py-2 px-3 rounded-xl cursor-pointer"
                      >
                        <span
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white'
                              : 'border-zinc-300 dark:border-zinc-600'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white dark:text-zinc-900" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-medium text-zinc-900 dark:text-white truncate">
                            {e.name}
                          </span>
                          <span className="block text-[11.5px] text-zinc-400 truncate">{e.email}</span>
                        </span>
                        <span
                          className="text-[11px] font-medium px-2 py-1 rounded-full border shrink-0"
                          style={{ color: rec.color, backgroundColor: rec.color + '14', borderColor: rec.color + '33' }}
                        >
                          {rec.typeName}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {unmarked.length > 0 && (
                <CommandGroup heading={`No record yet (${unmarked.length})`}>
                  {unmarked.map((e) => {
                    const isSelected = selected.has(e.id);
                    return (
                      <CommandItem
                        key={e.id}
                        onSelect={() => toggle(e.id)}
                        className="flex items-center gap-2.5 py-2 px-3 rounded-xl cursor-pointer"
                      >
                        <span
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white'
                              : 'border-zinc-300 dark:border-zinc-600'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white dark:text-zinc-900" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-medium text-zinc-900 dark:text-white truncate">
                            {e.name}
                          </span>
                          <span className="block text-[11.5px] text-zinc-400 truncate">{e.email}</span>
                        </span>
                        <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 shrink-0">
                          No record
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected chips */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {employees
            .filter((e) => selected.has(e.id))
            .map((e) => (
              <span
                key={e.id}
                className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-zinc-900/[0.05] dark:bg-white/[0.08] border border-black/[0.04] dark:border-white/[0.04] text-[12px] font-medium"
              >
                {e.name.split(' ')[0]}
                <button
                  type="button"
                  onClick={() => toggle(e.id)}
                  className="p-0.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  aria-label={`Remove ${e.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          {selectedCount > 8 && (
            <span className="flex items-center pl-3 pr-2 py-1 rounded-full text-[12px] font-medium text-zinc-400">
              +{selectedCount - 8} more
            </span>
          )}
        </div>
      )}

      {/* Hidden search affordance hint */}
      <p className="text-[11.5px] text-zinc-400 dark:text-zinc-500">
        <Search className="h-3 w-3 inline mr-1 -mt-0.5" />
        Type to search · click to toggle employees
      </p>
    </div>
  );
}
