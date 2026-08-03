'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';
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
  Plus,
  User,
  LogOut,
  ChevronDown,
  MessageSquare,
  Download,
} from 'lucide-react';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TicketsLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: '/helpdesk/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/helpdesk/employee/new', label: 'New Ticket', icon: Plus },
  { href: '/helpdesk/employee/my-tickets', label: 'My Tickets', icon: User },
  { href: '/helpdesk/employee/downloads', label: 'Downloads', icon: Download },
];

export function TicketsLayout({ children }: TicketsLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAdmin(userData.role === 'ADMIN' || userData.role === 'HR');
        } catch (e) {
          console.error('Failed to parse user:', e);
        }
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
  }, []);

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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/helpdesk/employee/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear tokens even if logout API fails
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/helpdesk/employee/login');
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
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm">
                <Image src="/assets/email_dp.jpg" alt="ACE Logo" width={40} height={20} className="w-full h-full object-cover rounded-xl" />
              </div>
              <span className="text-[17px] font-semibold tracking-tight"> Helpdesk</span>
            </div>

            {/* Navigation Links - Centered/Inline Pill style */}
            <div className="hidden md:flex flex-1 justify-center">
              <div className="flex items-center gap-1 p-1 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-full border border-black/5 dark:border-white/5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-medium transition-all duration-200 ${
                          isActive 
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 2} />
                        {item.label}
                      </button>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/10 shadow-sm">
                      {user ? getInitials(user.name) : 'U'}
                    </div>
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-[14px] font-medium leading-tight">{user?.name || 'User'}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                  <DropdownMenuLabel className="px-3 py-2">
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-[15px] font-medium text-zinc-900 dark:text-white">{user?.name}</p>
                      <p className="text-[13px] text-zinc-500 font-light">{user?.email}</p>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mt-1">{user?.role}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5 my-1" />
                  {/* Mobile Navigation fallback */}
                  <div className="md:hidden">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link href={item.href} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[14px] ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-zinc-600 dark:text-zinc-300'}`}>
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5 my-1" />
                  </div>
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="flex items-center px-3 py-2 text-[14px] text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-500/10 dark:focus:text-red-300 rounded-xl cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}
