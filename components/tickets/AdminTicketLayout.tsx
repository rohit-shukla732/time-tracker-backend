'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  BarChart3,
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavItems = [
  { href: '/ticketing/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ticketing/admin/tickets', label: 'All Tickets', icon: Ticket },
];

export function AdminTicketLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = () => {
      let storedUser = localStorage.getItem('user');
      
      // For demo purposes, create a default admin user if none exists
      if (!storedUser) {
        const defaultAdmin = {
          id: 'admin-1',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'ADMIN'
        };
        localStorage.setItem('user', JSON.stringify(defaultAdmin));
        storedUser = JSON.stringify(defaultAdmin);
      }
      
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          
          // Check if user is admin - only redirect if they are NOT admin/HR
          if (userData.role !== 'ADMIN' && userData.role !== 'HR') {
            router.push('/ticketing/employee/dashboard');
            return;
          }
        } catch (e) {
          console.error('Failed to parse user:', e);
          router.push('/ticketing/employee/dashboard');
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
  }, [router]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
      }
    } catch (error) {
      console.error('Logout failed:', error);
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
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-16 items-center gap-4 px-6">
          {/* Logo/Title */}
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <span className="text-xl font-bold">Ticket Admin</span>
              <span className="ml-2 text-xs text-muted-foreground">Management Portal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 flex items-center gap-1 ml-8">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/ticketing/admin' && pathname.startsWith(item.href));
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* User Section Link */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/ticketing/employee/dashboard')}
          >
            User View
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user ? getInitials(user.name) : 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm">
                  <span className="font-medium">{user?.name || 'Admin'}</span>
                  <span className="text-xs text-muted-foreground">{user?.role || 'ADMIN'}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/ticketing/admin/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        {children}
      </main>
    </div>
  );
}
