'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Ticket,
  LogOut,
  ChevronDown,
  Shield,
  Briefcase,
  PlusCircle,
  Users,
  Settings,
  Search
} from 'lucide-react';
import Image from 'next/image';
import { AdminCommandPalette } from '@/components/tickets/AdminCommandPalette';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminTicketLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
const adminNavItems = [
  { href: '/helpdesk/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/helpdesk/admin/tickets', label: 'Tickets', icon: Ticket },
  { href: '/helpdesk/admin/users', label: 'Users', icon: Users },
  { href: '/helpdesk/admin/settings', label: 'Settings', icon: Settings },
  { href: '/helpdesk/admin/new', label: 'Create Ticket', icon: PlusCircle },
];

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem('user');
      
      if (!storedUser) {
        router.push('/helpdesk/admin/login');
        return;
      }
      
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        
        // Check if user is admin - only redirect if they are NOT admin/HR
        if (userData.role !== 'ADMIN' && userData.role !== 'HR') {
          router.push('/helpdesk/employee/dashboard');
          return;
        }
      } catch (e) {
        console.error('Failed to parse user:', e);
        router.push('/helpdesk/admin/login');
      }
    };
    
    loadUser();
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        loadUser();
      }
    };
    
    const handleUserUpdate = () => {
      loadUser();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userUpdate', handleUserUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdate', handleUserUpdate);
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
        credentials: 'include',
      });

      if (response.ok) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/helpdesk/admin/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      router.push('/helpdesk/admin/login');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen text-zinc-900 dark:text-zinc-100 font-sans selection:bg-primary/20 bg-transparent">
      {/* Top Navigation Bar - Apple Style Glassmorphism */}
      <nav className="sticky top-0 z-50 w-full border-b border-black/[0.04] dark:border-white/[0.04] bg-white/70 dark:bg-zinc-900/70 backdrop-blur-[40px] saturate-150 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo/Title */}
            <div 
              className="flex items-center gap-3 shrink-0 cursor-pointer group"
              onClick={() => router.push('/helpdesk/admin')}
            >
              <div className="flex items-center justify-center text-white rounded-full dark:text-zinc-900 shadow-sm transition-transform group-active:scale-95">
                <Image src="/assets/email_dp.jpg" alt="ACE Logo" width={40} height={20} className="w-full h-full object-cover border rounded-xl" />
              </div>
              <span className="text-[17px] font-semibold tracking-tight hidden sm:block">Helpdesk Admin</span>
            </div>

            {/* Navigation Links - Centered/Inline Pill style */}
            <div className="flex flex-1 justify-center">
              <div className="flex items-center gap-1 p-1 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-full border border-black/5 dark:border-white/5">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/helpdesk/admin' && pathname.startsWith(item.href));
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 2} />
                        <span className="hidden sm:inline">{item.label}</span>
                      </button>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Search / Command Palette Trigger */}
            <div className="flex items-center shrink-0">
              <button
                onClick={() => setPaletteOpen(true)}
                aria-label="Open search (Ctrl+K)"
                className="flex items-center gap-2 h-9 pl-3 pr-2 mr-2 rounded-full bg-zinc-100/60 dark:bg-zinc-800/60 border border-black/[0.04] dark:border-white/[0.04] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <Search className="h-4 w-4" />
                <kbd className="hidden md:flex items-center gap-0.5 text-[11px] font-medium tracking-wide">
                  <span className="px-1 py-0.5 rounded-md bg-white dark:bg-zinc-700 border border-black/[0.06] dark:border-white/[0.06] shadow-sm">Ctrl</span>
                  <span className="px-1 py-0.5 rounded-md bg-white dark:bg-zinc-700 border border-black/[0.06] dark:border-white/[0.06] shadow-sm">K</span>
                </kbd>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/10 shadow-sm">
                      {user ? getInitials(user.name) : 'A'}
                    </div>
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-[14px] font-medium leading-tight">{user?.name || 'Admin'}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                  <DropdownMenuLabel className="px-3 py-2">
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-[15px] font-medium text-zinc-900 dark:text-white">{user?.name}</p>
                      <p className="text-[13px] text-zinc-500 font-light">{user?.email}</p>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mt-1">{user?.role || 'ADMIN'}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5 my-1" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[14px] font-medium text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-500/10 dark:focus:text-red-400 cursor-pointer transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content with keyed page transition */}
      <main className="w-full relative z-10">
        <div key={pathname} className="animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out">
          {children}
        </div>
      </main>

      <AdminCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
