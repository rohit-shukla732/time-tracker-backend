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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Clock,
  Banknote,
  LogOut,
  Settings,
  Bed,
  ChevronDown,
  FileSpreadsheet,
  Calendar as CalendarIcon
} from 'lucide-react';
import Image from 'next/image';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function HRLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [salaryAllowed, setSalaryAllowed] = useState(false);
  const [timezone, setTimezone] = useState<string>('IST');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const basePath = '/hr';
  const loginPath = '/hr/login';

  const navItems = [
    { href: `${basePath}`, label: 'Overview', icon: LayoutDashboard },
    { href: `${basePath}/leaves`, label: 'Leaves', icon: Bed },
    { href: `${basePath}/attendance`, label: 'Attendance', icon: Clock },
    { href: `${basePath}/attendance/consolidated`, label: 'Consolidated', icon: FileSpreadsheet },
    { href: `${basePath}/salary`, label: 'Salary', icon: Banknote },
    { href: `${basePath}/departments`, label: 'Departments', icon: LayoutDashboard },
    { href: `${basePath}/calendar`, label: 'Calendar', icon: CalendarIcon },
  ];

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);

          // determine if Salary page should be visible for this user
          const allowedId = process.env.NEXT_PUBLIC_SALARY_USER_ID;
          const allowedEmailsCsv = process.env.NEXT_PUBLIC_SALARY_ALLOWED_EMAILS || '';
          const allowedEmails = allowedEmailsCsv.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
          const email = (parsed.email || '').toLowerCase();
          if ((allowedId && parsed.id === allowedId) || (allowedEmails.length > 0 && allowedEmails.includes(email))) {
            setSalaryAllowed(true);
          } else {
            setSalaryAllowed(false);
          }
        } catch (e) {
          console.error('Failed to parse user:', e);
        }
      }
    };
    
    // Load timezone preference
    const storedTimezone = localStorage.getItem('timezone');
    if (storedTimezone) {
      setTimezone(storedTimezone);
    }
    
    // Load user immediately
    loadUser();
    
    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        loadUser();
      }
    };
    
    // Listen for custom user update event
    const handleUserUpdate = () => {
      loadUser();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userUpdated', handleUserUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdated', handleUserUpdate);
    };
  }, []);

  const handleTimezoneChange = (newTimezone: string) => {
    setTimezone(newTimezone);
    localStorage.setItem('timezone', newTimezone);
    window.dispatchEvent(new CustomEvent('timezoneChanged', { detail: newTimezone }));
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      toast.error('Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push(loginPath);
  };

  const getInitials = (name: string | undefined, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'HR';
  };

  return (
    <div className="min-h-screen text-zinc-900 dark:text-zinc-100 font-sans selection:bg-primary/20 bg-zinc-50 dark:bg-zinc-950">
      {/* Top Navigation Bar - Apple Style Glassmorphism */}
      <nav className="sticky top-0 z-50 w-full border-b border-black/[0.04] dark:border-white/[0.04] bg-white/70 dark:bg-zinc-900/70 backdrop-blur-[40px] saturate-150 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo/Title */}
            <div 
              className="flex items-center gap-3 shrink-0 cursor-pointer group"
              onClick={() => router.push(basePath)}
            >
              <Image src="/assets/email_dp.jpg" alt="ACE Logo" width={48} height={40} className="object-cover rounded-xl" />
              <span className="text-[17px] font-semibold tracking-tight hidden sm:block">ACE-EMS HR</span>
            </div>

            {/* Navigation Links - Centered/Inline Pill style */}
            <div className="flex flex-1 justify-center overflow-hidden">
              <div className="flex items-center gap-1 p-1 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-full border border-black/5 dark:border-white/5 overflow-x-auto no-scrollbar">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || 
                    (item.href !== basePath && pathname.startsWith(item.href));
                  // hide Salary nav item when not allowed
                  if (item.href === `${basePath}/salary` && !salaryAllowed) return null;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                        isActive 
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/10 scale-100'
                          : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 active:scale-95'
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 2} />
                      <span className="hidden md:block">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* User Profile / Logout */}
            <div className="flex items-center gap-3 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none group">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-zinc-800 shadow-sm transition-transform group-active:scale-95">
                      <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold">
                        {user ? getInitials(user.name, user.email) : 'HR'}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 transition-colors hidden sm:block" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-panel rounded-2xl border border-black/5 dark:border-white/10 shadow-xl mt-2 p-2 relative z-[100]">
                  <DropdownMenuLabel className="font-normal px-2 py-1.5">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{user?.name || 'Loading...'}</p>
                      <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5 my-1" />
                  <DropdownMenuItem 
                    onClick={() => setSettingsOpen(true)}
                    className="flex text-[13px] items-center gap-2 px-2 py-2 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 focus:bg-black/5 dark:focus:bg-white/5"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5 my-1" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="flex text-[13px] items-center gap-2 px-2 py-2 rounded-xl cursor-pointer text-red-600 focus:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 focus:bg-red-50 dark:focus:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="font-medium">Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </main>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Configure your preferences and security settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Timezone Settings */}
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <p className="text-sm text-muted-foreground mb-2">
                All times and reports will be displayed in the selected timezone
              </p>
              <Select value={timezone} onValueChange={handleTimezoneChange}>
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IST">
                    IST (Indian Standard Time - UTC+5:30)
                  </SelectItem>
                  <SelectItem value="EST">
                    EST (Eastern Standard Time - UTC-5:00)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Current: {timezone === 'IST' ? 'Indian Standard Time (UTC+5:30)' : 'Eastern Standard Time (UTC-5:00)'}
              </p>
            </div>

            {/* Change Password */}
            <div className="space-y-4 border-t pt-4">
              <div>
                <h3 className="text-sm font-medium">Change Password</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input 
                  id="currentPassword" 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input 
                  id="newPassword" 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleChangePassword} 
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full"
              >
                {changingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
