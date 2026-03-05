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
import { makeAuthenticatedRequest } from '@/lib/adminAuth';
import {
  LayoutDashboard,
  Users,
  FileText,
  LogOut,
  Settings,
  ChevronDown,
  Clock,
  CheckSquare,
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId?: string;
}

interface ManagerLayoutProps {
  children: React.ReactNode;
}

export default function ManagerLayout({ children }: ManagerLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timezone, setTimezone] = useState<string>('Asia/Kolkata');
  const [shiftStartTime, setShiftStartTime] = useState<string>('09:00');
  const [lateThresholdMins, setLateThresholdMins] = useState<number>(15);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingShiftSettings, setSavingShiftSettings] = useState(false);

  const navItems = [
    { href: '/time-tracker/manager', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/time-tracker/manager/team', label: 'Team', icon: Users },
    { href: '/time-tracker/manager/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/time-tracker/manager/reports', label: 'Reports', icon: FileText },
  ];

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Failed to parse user:', e);
        }
      }
    };
    
    // Load timezone preference
    const storedTimezone = localStorage.getItem('userTimezone');
    if (storedTimezone) {
      setTimezone(storedTimezone);
    }
    
    // Load shift settings
    const loadShiftSettings = async () => {
      try {
        const response = await makeAuthenticatedRequest('/api/users/settings/shift');
        if (response.ok) {
          const data = await response.json();
          setShiftStartTime(data.shiftStartTime || '09:00');
          setLateThresholdMins(data.lateThresholdMins || 15);
        }
      } catch (error) {
        console.error('Failed to load shift settings:', error);
      }
    };
    
    loadShiftSettings();
    
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
    localStorage.setItem('userTimezone', newTimezone);
    window.dispatchEvent(
      new CustomEvent('timezoneChange', { detail: { timezone: newTimezone } })
    );
    toast.success(`Timezone changed to ${newTimezone === 'Asia/Kolkata' ? 'IST' : 'EST'}`);
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
        },
        credentials: 'include',
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
        setSettingsOpen(false);
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

  const handleSaveShiftSettings = async () => {
    setSavingShiftSettings(true);
    try {
      const response = await makeAuthenticatedRequest('/api/users/settings/shift', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftStartTime, lateThresholdMins }),
      });

      if (response.ok) {
        toast.success('Shift settings saved successfully');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to save shift settings');
      }
    } catch (error) {
      console.error('Failed to save shift settings:', error);
      toast.error('Failed to save shift settings');
    } finally {
      setSavingShiftSettings(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      router.push('/time-tracker/manager/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getInitials = (name: string | undefined, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const isLoginPage = pathname === '/time-tracker/manager/login';

  return (
    <div className="min-h-screen flex flex-col container mx-auto">
      {!isLoginPage && (
        <header className="border-b">
          <div className="container flex h-16 items-center justify-between px-4">
            <nav className="flex items-center space-x-6 text-sm font-medium">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || 
                  (item.href !== '/time-tracker/manager' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 transition-colors hover:text-foreground/80 ${
                      isActive ? 'text-foreground' : 'text-foreground/60'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user ? getInitials(user.name, user.email) : '??'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline-block">
                      {user?.name || user?.email}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground mt-1">
                        Role: <span className="font-semibold">{user?.role}</span>
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                  <SelectItem value="Asia/Kolkata">
                    IST (Indian Standard Time - UTC+5:30)
                  </SelectItem>
                  <SelectItem value="America/New_York">
                    EST (Eastern Standard Time - UTC-5:00)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Current: {timezone === 'Asia/Kolkata' ? 'Indian Standard Time (UTC+5:30)' : 'Eastern Standard Time (UTC-5:00)'}
              </p>
            </div>

            {/* Shift Time Settings */}
            <div className="space-y-4 border-t pt-4">
              <div>
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Shift & Late Arrival Settings
                </h3>
                <p className="text-sm text-muted-foreground">
                  Configure shift time and late arrival notifications
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shift-start-time">Shift Start Time</Label>
                <Input
                  id="shift-start-time"
                  type="time"
                  value={shiftStartTime}
                  onChange={(e) => setShiftStartTime(e.target.value)}
                  placeholder="09:00"
                />
                <p className="text-xs text-muted-foreground">
                  The time when your team members should start work
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="late-threshold">Late Threshold (minutes)</Label>
                <Input
                  id="late-threshold"
                  type="number"
                  min="0"
                  max="120"
                  value={lateThresholdMins}
                  onChange={(e) => setLateThresholdMins(parseInt(e.target.value) || 0)}
                  placeholder="15"
                />
                <p className="text-xs text-muted-foreground">
                  Grace period after shift start time before marking as late
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> You&apos;ll receive email and web notifications when team members 
                  haven&apos;t clocked in by {shiftStartTime || '09:00'} + {lateThresholdMins} minutes.
                </p>
              </div>

              <Button 
                onClick={handleSaveShiftSettings} 
                disabled={savingShiftSettings}
                className="w-full"
                variant="outline"
              >
                {savingShiftSettings ? 'Saving...' : 'Save Shift Settings'}
              </Button>
            </div>

            {/* Change Password */}
            <div className="space-y-4 border-t pt-4">
              <div>
                <h3 className="text-sm font-medium">Change Password</h3>
                <p className="text-sm text-muted-foreground">
                  Update your account password
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <Button 
                onClick={handleChangePassword} 
                disabled={changingPassword}
                className="w-full"
              >
                {changingPassword ? 'Changing Password...' : 'Change Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className={isLoginPage ? "flex-1 flex items-center justify-center" : "flex-1"}>
        <div className="container mx-auto py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
