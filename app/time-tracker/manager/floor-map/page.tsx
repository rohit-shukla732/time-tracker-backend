'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  toLocaleDateStringTz,
  toLocaleTimeStringTz 
} from '@/lib/timezoneUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  AlertCircle, 
  Monitor,
  RefreshCw,
  Coffee,
  Wifi,
  WifiOff,
  Activity,
  Moon,
  LayoutGrid,
  List,
} from 'lucide-react';
import { authFetch } from '@/lib/authFetch';

type EmployeeStatus = 'working' | 'idle' | 'break' | 'offline';

interface FloorEmployee {
  id: string;
  name: string | null;
  email: string;
  role: string;
  teamId: string | null;
  teamName: string | null;
  seatNumber: number | null;
  status: EmployeeStatus;
  lastActivity: string | null;
  currentApp: string | null;
  sessionId: string | null;
  onBreakSince: string | null;
  idleSince: string | null;
  workingDuration: number | null;
}

interface StatusStats {
  working: number;
  idle: number;
  break: number;
  offline: number;
  total: number;
}

const STATUS_CONFIG: Record<EmployeeStatus, { color: string; bgColor: string; borderColor: string; icon: any; label: string }> = {
  working: {
    color: 'text-green-700',
    bgColor: 'bg-green-600',
    borderColor: 'border-transparent',
    icon: Activity,
    label: 'Working'
  },
  idle: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-500',
    borderColor: 'border-transparent',
    icon: Moon,
    label: 'Idle'
  },
  break: {
    color: 'text-sky-700',
    bgColor: 'bg-sky-500',
    borderColor: 'border-transparent',
    icon: Coffee,
    label: 'On Break'
  },
  offline: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-400',
    borderColor: 'border-transparent',
    icon: WifiOff,
    label: 'Offline'
  },
};

// Format duration in hours and minutes
function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Format time ago
function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return toLocaleDateStringTz(date);
}

// Workstation component (single seat)
function Workstation({ 
  employee, 
  onClick 
}: { 
  employee: FloorEmployee | null; 
  onClick?: () => void;
}) {
  if (!employee) {
    // Empty workstation - subtle blank desk
    return (
      <div className="w-20 h-20 rounded-md flex items-center justify-center bg-slate-50 dark:bg-gray-900 shadow-sm">
        <Monitor className="w-6 h-6 text-gray-300 dark:text-gray-600" />
      </div>
    );
  }

  const config = STATUS_CONFIG[employee.status];
  const StatusIcon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={`relative w-20 h-20 rounded-md shadow-sm transition-colors duration-150 cursor-pointer flex items-center justify-center bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/90`}
          >
            {/* Small status dot */}
            <span className={`absolute top-2 right-2 w-3 h-3 rounded-full ${config.bgColor} ring-1 ring-white`} />

            {/* User avatar/initials */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white ${config.bgColor}`}>
              {employee.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-sm">
            <p className="font-semibold">{employee.name || employee.email}</p>
            <p className="text-xs text-muted-foreground">{employee.teamName || 'No Team'}</p>
            <div className="flex items-center gap-2 mt-2">
              <StatusIcon className={`w-4 h-4 ${config.color}`} />
              <span className={`text-sm ${config.color}`}>{config.label}</span>
            </div>
            {employee.currentApp && (
              <p className="text-xs mt-2">Using: {employee.currentApp}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Status legend component
function StatusLegend({ stats }: { stats: StatusStats }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {Object.entries(STATUS_CONFIG).map(([status, config]) => {
        const Icon = config.icon;
        const count = stats[status as EmployeeStatus];
        return (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${config.bgColor}`} />
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className="text-sm font-medium">{config.label}</span>
            <Badge variant="secondary" className="ml-1">{count}</Badge>
          </div>
        );
      })}
    </div>
  );
}

// Employee detail dialog
function EmployeeDetailDialog({ 
  employee, 
  open, 
  onOpenChange 
}: { 
  employee: FloorEmployee | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  if (!employee) return null;
  
  const config = STATUS_CONFIG[employee.status];
  const StatusIcon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white ${config.bgColor}`}>
              {employee.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div>
              <div>{employee.name || 'Unknown'}</div>
              <div className="text-sm font-normal text-muted-foreground">{employee.email}</div>
            </div>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-4 mt-4">
              {/* Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">Current Status</span>
                <Badge className={`${config.bgColor} text-white`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground">Team</div>
                  <div className="font-medium">{employee.teamName || 'No Team'}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground">Role</div>
                  <div className="font-medium capitalize">{employee.role.toLowerCase()}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground">Seat Number</div>
                  <div className="font-medium">#{employee.seatNumber}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground">Work Time Today</div>
                  <div className="font-medium">{formatDuration(employee.workingDuration)}</div>
                </div>
              </div>

              {/* Activity Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Activity</span>
                  <span>{formatTimeAgo(employee.lastActivity)}</span>
                </div>
                {employee.currentApp && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Current Application</span>
                    <span>{employee.currentApp}</span>
                  </div>
                )}
                {employee.onBreakSince && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">On Break Since</span>
                    <span>{formatTimeAgo(employee.onBreakSince)}</span>
                  </div>
                )}
                {employee.idleSince && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Idle Since</span>
                    <span>{formatTimeAgo(employee.idleSince)}</span>
                  </div>
                )}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export default function FloorMapPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<FloorEmployee[]>([]);
  const [stats, setStats] = useState<StatusStats>({ working: 0, idle: 0, break: 0, offline: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | EmployeeStatus>('all');
  const [viewMode, setViewMode] = useState<'floor' | 'list'>('floor');
  const [selectedEmployee, setSelectedEmployee] = useState<FloorEmployee | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>('IST');
  const [, forceUpdate] = useState({});

  const fetchData = useCallback(async () => {
    // Get team ID from stored user
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/time-tracker/manager/login');
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      if (!user.departmentId) {
        setError('No department assigned');
        setLoading(false);
        return;
      }

      setTeamId(user.departmentId);

      const data = await authFetch(`/api/teams/${user.departmentId}/floor-status`, {}, '/manager/login');

      if (data.success) {
        setEmployees(data.employees);
        setStats(data.stats);
        setLastUpdated(new Date(data.timestamp));
        setError(null);
      } else {
        setError(data.error || 'Failed to load floor data');
      }
    } catch (err) {
      console.error('Floor map fetch error:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    // Load timezone
    setTimezone(localStorage.getItem('timezone') || 'IST');
    
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    
    // Listen for timezone changes
    const handleTimezoneChange = (e: CustomEvent) => {
      setTimezone(e.detail);
      forceUpdate({});
    };
    window.addEventListener('timezoneChanged' as any, handleTimezoneChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('timezoneChanged' as any, handleTimezoneChange);
    };
  }, [autoRefresh, fetchData]);

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
    return true;
  });

  // Handle employee click
  const handleEmployeeClick = (employee: FloorEmployee) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <LayoutGrid className="w-8 h-8 text-blue-600" />
                Team Floor Map
              </h1>
              <Badge variant="outline" className="text-xs">
                {(() => {
                  const tz = typeof window !== 'undefined' ? (localStorage.getItem('timezone') || 'IST') : 'IST';
                  return tz === 'IST' ? 'IST' : 'EST';
                })()}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Real-time team member status • Last updated: {lastUpdated ? toLocaleTimeStringTz(lastUpdated, timezone as 'IST' | 'EST') : 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="gap-2"
            >
              <Wifi className="w-4 h-4" />
              {autoRefresh ? 'Live' : 'Paused'}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="working">Working</SelectItem>
                    <SelectItem value="idle">Idle</SelectItem>
                    <SelectItem value="break">On Break</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm font-medium">View:</span>
                <Button
                  variant={viewMode === 'floor' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('floor')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Floor Map View */}
        {viewMode === 'floor' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Team Floor Plan
              </CardTitle>
              <CardDescription>
                Click on any workstation to view employee details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Floor Layout (blueprint grid background) */}
              <div
                className="relative rounded-xl p-8 overflow-x-auto"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(100,116,139,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.06) 1px, transparent 1px)`,
                  backgroundSize: '40px 40px',
                }}
              >
                {/* Compact legend overlay */}
                <div className="absolute top-4 left-4 z-10 bg-white/80 dark:bg-gray-800/70 backdrop-blur-sm rounded-md px-3 py-2 shadow-sm border border-slate-200/30">
                  <StatusLegend stats={stats} />
                </div>

                <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10 gap-6">
                  {filteredEmployees.map((emp) => (
                    <div key={emp.id} className="flex justify-center">
                      <Workstation employee={emp} onClick={() => handleEmployeeClick(emp)} />
                    </div>
                  ))}
                </div>

              </div>
            </CardContent>
          </Card>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="w-5 h-5" />
                Team Member List View
              </CardTitle>
              <CardDescription>
                All team members with current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map(employee => {
                  const config = STATUS_CONFIG[employee.status];
                  const StatusIcon = config.icon;
                  
                  return (
                    <div
                      key={employee.id}
                      onClick={() => handleEmployeeClick(employee)}
                      className={`p-4 rounded-lg border dark:border-gray-700 cursor-pointer 
                        transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-800`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white ${config.bgColor}`}>
                          {employee.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{employee.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground truncate capitalize">{employee.role.toLowerCase()}</p>
                        </div>
                        <Badge className={`${config.bgColor} text-white`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Seat #{employee.seatNumber}</span>
                        <span>{formatDuration(employee.workingDuration)} today</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Employee Detail Dialog */}
      <EmployeeDetailDialog
        employee={selectedEmployee}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
