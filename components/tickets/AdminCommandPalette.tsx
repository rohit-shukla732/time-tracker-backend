'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Settings,
  PlusCircle,
  Search,
  User,
  Inbox,
  Flame,
  CircleDot,
} from 'lucide-react';
import { makeAuthenticatedRequest } from '@/lib/adminAuth';

interface PaletteUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isArchived?: boolean;
}

interface PaletteTicket {
  id: string;
  ticketNumber: number;
  title: string;
  status: string;
}

const navigationItems = [
  { href: '/helpdesk/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/helpdesk/admin/tickets', label: 'Tickets', icon: Ticket },
  { href: '/helpdesk/admin/users', label: 'Users', icon: Users },
  { href: '/helpdesk/admin/settings', label: 'Settings', icon: Settings },
  { href: '/helpdesk/admin/new', label: 'Create Ticket', icon: PlusCircle },
];

const quickFilters = [
  { href: '/helpdesk/admin/tickets?assignedTo=none', label: 'Unassigned tickets', icon: Inbox },
  { href: '/helpdesk/admin/tickets?status=OPEN', label: 'Open tickets', icon: CircleDot },
  { href: '/helpdesk/admin/tickets?priority=URGENT', label: 'Urgent tickets', icon: Flame },
];

export function AdminCommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [tickets, setTickets] = useState<PaletteTicket[]>([]);
  const [users, setUsers] = useState<PaletteUser[]>([]);
  const [searching, setSearching] = useState(false);
  const requestSeq = useRef(0);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  // Reset search state when closed
  useEffect(() => {
    if (!open) {
      setSearch('');
      setTickets([]);
      setUsers([]);
    }
  }, [open]);

  // Debounced global search
  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setTickets([]);
      setUsers([]);
      return;
    }

    const seq = ++requestSeq.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const [ticketsRes, usersRes] = await Promise.all([
          makeAuthenticatedRequest(`/api/tickets?search=${encodeURIComponent(term)}&limit=5`),
          makeAuthenticatedRequest(`/api/users?search=${encodeURIComponent(term)}`),
        ]);
        if (seq !== requestSeq.current) return;
        if (ticketsRes.ok) {
          const data = await ticketsRes.json();
          setTickets(Array.isArray(data) ? data.slice(0, 5) : []);
        }
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(Array.isArray(data) ? data.filter((u: PaletteUser) => !u.isArchived).slice(0, 4) : []);
        }
      } catch {
        // ignore search errors
      } finally {
        if (seq === requestSeq.current) setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search and commands"
      description="Search tickets, people, or jump to a page"
      className="rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl shadow-[0_24px_70px_rgb(0,0,0,0.25)] [&_[cmdk-input-wrapper]]:border-black/[0.04] dark:[&_[cmdk-input-wrapper]]:border-white/[0.04]"
    >
      <CommandInput placeholder="Search tickets, people, pages…" value={search} onValueChange={setSearch} />
      <CommandList className="max-h-[380px] py-2">
        <CommandEmpty>{searching ? 'Searching…' : 'No results found.'}</CommandEmpty>

        {tickets.length > 0 && (
          <>
            <CommandGroup heading="Tickets">
              {tickets.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`ticket-${t.ticketNumber}-${t.title}`}
                  onSelect={() => go(`/helpdesk/admin/tickets/${t.id}`)}
                  className="gap-3 rounded-xl aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-500/10"
                >
                  <Ticket className="h-4 w-4 shrink-0 text-indigo-500" />
                  <span className="font-mono text-[12px] text-zinc-500">T-{String(t.ticketNumber).padStart(2, '0')}</span>
                  <span className="truncate">{t.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator className="bg-black/[0.04] dark:bg-white/[0.04]" />
          </>
        )}

        {users.length > 0 && (
          <>
            <CommandGroup heading="People">
              {users.map((u) => (
                <CommandItem
                  key={u.id}
                  value={`user-${u.name}-${u.email}`}
                  onSelect={() => go('/helpdesk/admin/users')}
                  className="gap-3 rounded-xl aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-500/10"
                >
                  <User className="h-4 w-4 shrink-0 text-indigo-500" />
                  <span className="truncate">{u.name}</span>
                  <span className="truncate text-[13px] text-zinc-500 font-light">{u.email}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator className="bg-black/[0.04] dark:bg-white/[0.04]" />
          </>
        )}

        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.href}
              value={`nav-${item.label}`}
              onSelect={() => go(item.href)}
              className="gap-3 rounded-xl aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-500/10"
            >
              <item.icon className="h-4 w-4 text-zinc-500" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Quick filters">
          {quickFilters.map((item) => (
            <CommandItem
              key={item.href}
              value={`filter-${item.label}`}
              onSelect={() => go(item.href)}
              className="gap-3 rounded-xl aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-500/10"
            >
              <item.icon className="h-4 w-4 text-zinc-500" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {search.trim().length >= 2 && (
          <CommandGroup heading="Full search">
            <CommandItem
              value={`search-all-${search}`}
              onSelect={() => go(`/helpdesk/admin/tickets?q=${encodeURIComponent(search.trim())}`)}
              className="gap-3 rounded-xl aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-500/10"
            >
              <Search className="h-4 w-4 text-zinc-500" />
              See all results for “{search.trim()}”
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
