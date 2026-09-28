'use client';

import { useState } from 'react';
import { ChevronsUpDown, Search, UserPlus, User as UserIcon } from 'lucide-react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export interface EmployeeOption {
  id: string;
  name: string;
  email: string;
  role: string;
  isArchived?: boolean;
}

export interface EmployeeSelection {
  employeeId: string | null;
  isNewJoiner: boolean;
}

interface EmployeeSelectProps {
  employees: EmployeeOption[];
  value: EmployeeSelection;
  onChange: (next: EmployeeSelection) => void;
  label?: string;
  hideHelper?: boolean;
}

export default function EmployeeSelect({
  employees,
  value,
  onChange,
  label = 'Employee',
  hideHelper = false,
}: EmployeeSelectProps) {
  const [open, setOpen] = useState(false);

  const selected = employees.find((e) => e.id === value.employeeId);
  const active = employees.filter((e) => !e.isArchived);
  const archived = employees.filter((e) => e.isArchived);

  return (
    <div className="space-y-2.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between gap-2 w-full h-14 px-4 rounded-2xl bg-white/50 dark:bg-zinc-900/50 border-black/5 dark:border-white/5 text-left text-[16px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] outline-none transition-all hover:border-black/20 dark:hover:border-white/20"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              {value.isNewJoiner ? (
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="h-8 w-8 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <UserPlus className="h-4 w-4" />
                  </span>
                  <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    New joiner — no account yet
                  </span>
                </span>
              ) : selected ? (
                <span className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-[11px] bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium">
                      {selected.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {selected.name}
                    </span>
                    <span className="block text-[12px] text-zinc-400 truncate">{selected.email}</span>
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="h-8 w-8 rounded-full bg-black/[0.04] dark:bg-white/[0.04] text-zinc-400 flex items-center justify-center shrink-0">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <span className="text-[15px] text-zinc-500 font-light truncate">
                    Select the {label.toLowerCase()}…
                  </span>
                </span>
              )}
            </span>
            <ChevronsUpDown className="h-4 w-4 text-zinc-400 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[calc(100vw-3rem)] max-w-xl p-0 rounded-2xl border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
          align="start"
        >
          <Command>
            <CommandInput placeholder={`Search employees by name or email…`} />
            <CommandList>
              <CommandEmpty>No employees found.</CommandEmpty>

              {active.length > 0 && (
                <CommandGroup heading={`Employees (${active.length})`}>
                  {active.map((e) => {
                    const isSelected = !value.isNewJoiner && value.employeeId === e.id;
                    return (
                      <CommandItem
                        key={e.id}
                        value={`${e.name} ${e.email}`}
                        onSelect={() => {
                          onChange({ employeeId: e.id, isNewJoiner: false });
                          setOpen(false);
                        }}
                        className="flex items-center gap-2.5 py-2 px-3 rounded-xl cursor-pointer"
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-[10px] bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium">
                            {e.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-medium text-zinc-900 dark:text-white truncate">
                            {e.name}
                          </span>
                          <span className="block text-[11.5px] text-zinc-400 truncate">{e.email}</span>
                        </span>
                        <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0">
                          {e.role.replace(/_/g, ' ')}
                        </span>
                        {isSelected && (
                          <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" aria-hidden />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {archived.length > 0 && (
                <CommandGroup heading={`Archived (${archived.length})`}>
                  {archived.map((e) => (
                    <CommandItem
                      key={e.id}
                      value={`${e.name} ${e.email}`}
                      onSelect={() => {
                        onChange({ employeeId: e.id, isNewJoiner: false });
                        setOpen(false);
                      }}
                      className="flex items-center gap-2.5 py-2 px-3 rounded-xl cursor-pointer opacity-70"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-[10px] bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium">
                          {e.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-medium text-zinc-900 dark:text-white truncate">
                          {e.name}
                        </span>
                        <span className="block text-[11.5px] text-zinc-400 truncate">{e.email}</span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandSeparator />
              <CommandItem
                onSelect={() => {
                  onChange({ employeeId: null, isNewJoiner: true });
                  setOpen(false);
                }}
                className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl cursor-pointer"
              >
                <span className="h-8 w-8 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <UserPlus className="h-4 w-4" />
                </span>
                <span className="text-[13.5px] font-medium">
                  New joiner — not in the system yet
                </span>
                {value.isNewJoiner && (
                  <span className="h-2 w-2 rounded-full bg-teal-500 ml-auto shrink-0" aria-hidden />
                )}
              </CommandItem>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {!hideHelper && (
        <p className="flex items-center gap-1.5 text-[11.5px] text-zinc-400 dark:text-zinc-500">
          <Search className="h-3 w-3 inline" />
          Who is this {label.toLowerCase()} about? Picks the employee for the checklist and equipment log.
        </p>
      )}
    </div>
  );
}