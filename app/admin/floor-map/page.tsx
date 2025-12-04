'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  User,
  Coffee,
  Clock,
  Wifi,
  WifiOff,
  Activity,
  Users,
  Zap,
  Moon,
  LayoutGrid,
  List,
} from 'lucide-react';

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
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    borderColor: 'border-green-500',
    icon: Activity,
    label: 'Working'
  },
  idle: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
    borderColor: 'border-yellow-500',
    icon: Moon,
    label: 'Idle'
  },
  break: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500',
    icon: Coffee,
    label: 'On Break'
  },
  offline: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-400',
    borderColor: 'border-gray-300',
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
  return date.toLocaleDateString();
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
    // Empty workstation
    return (
      <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-900/50">
        <Monitor className="w-5 h-5 text-gray-300 dark:text-gray-600" />
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
            className={`relative w-16 h-16 rounded-lg border-2 ${config.borderColor} 
              transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer
              flex flex-col items-center justify-center gap-1 bg-white dark:bg-gray-800`}
          >
            {/* Status indicator dot */}
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${config.bgColor} animate-pulse`} />
            
            {/* User avatar/initials */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${config.bgColor}`}>
              {employee.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
            </div>
            
            {/* Status icon */}
            <StatusIcon className={`w-3 h-3 ${config.color}`} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-sm">
            <p className="font-semibold">{employee.name || employee.email}</p>
            <p className="text-xs text-muted-foreground">{employee.teamName || 'No Team'}</p>
            <div className="flex items-center gap-1 mt-1">
              <StatusIcon className={`w-3 h-3 ${config.color}`} />
              <span className={config.color}>{config.label}</span>
            </div>
            {employee.currentApp && (
              <p className="text-xs mt-1">Using: {employee.currentApp}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Desk cluster component (group of 4 desks facing each other)
function DeskCluster({ 
  employees, 
  startIndex,
  onEmployeeClick 
}: { 
  employees: (FloorEmployee | null)[]; 
  startIndex: number;
  onEmployeeClick: (employee: FloorEmployee) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Top row (2 seats) */}
      <div className="flex gap-1">
        <Workstation 
          employee={employees[0] || null} 
          onClick={() => employees[0] && onEmployeeClick(employees[0])}
        />
        <Workstation 
          employee={employees[1] || null} 
          onClick={() => employees[1] && onEmployeeClick(employees[1])}
        />
      </div>
      
      {/* Desk divider */}
      <div className="w-full h-2 bg-amber-700/60 rounded" />
      
      {/* Bottom row (2 seats) */}
      <div className="flex gap-1">
        <Workstation 
          employee={employees[2] || null} 
          onClick={() => employees[2] && onEmployeeClick(employees[2])}
        />
        <Workstation 
          employee={employees[3] || null} 
          onClick={() => employees[3] && onEmployeeClick(employees[3])}
        />
      </div>
    </div>
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
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'floor' | 'list'>('floor');
  const [selectedEmployee, setSelectedEmployee] = useState<FloorEmployee | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    try {
      const response = await fetch('/api/admin/floor-status', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        router.push('/admin/login');
        return;
      }

      const data = await response.json();

      if (data.success) {
        setEmployees(data.employees);
        setStats(data.stats);
        setLastUpdated(new Date(data.timestamp));
        setError(null);
      } else {
        setError(data.error || 'Failed to load floor data');
      }
    } catch (err) {
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
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Get unique teams for filter
  const teams = Array.from(new Set(employees.map(e => e.teamName).filter(Boolean))) as string[];

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
    if (teamFilter !== 'all' && emp.teamName !== teamFilter) return false;
    return true;
  });

  // Handle employee click
  const handleEmployeeClick = (employee: FloorEmployee) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  // Create desk clusters (4 employees per cluster)
  const clusters: (FloorEmployee | null)[][] = [];
  for (let i = 0; i < filteredEmployees.length; i += 4) {
    const cluster = [
      filteredEmployees[i] || null,
      filteredEmployees[i + 1] || null,
      filteredEmployees[i + 2] || null,
      filteredEmployees[i + 3] || null,
    ];
    clusters.push(cluster);
  }

  // Add empty clusters to fill the floor if needed (min 8 clusters for visual)
  while (clusters.length < 8) {
    clusters.push([null, null, null, null]);
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <LayoutGrid className="w-8 h-8 text-blue-600" />
              Live Floor Map
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time employee status view • Last updated: {lastUpdated?.toLocaleTimeString() || 'N/A'}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-linear-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Working</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.working}</p>
                </div>
                <Activity className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Idle</p>
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.idle}</p>
                </div>
                <Moon className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">On Break</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.break}</p>
                </div>
                <Coffee className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20 border-gray-200 dark:border-gray-700">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Offline</p>
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.offline}</p>
                </div>
                <WifiOff className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-linear-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

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

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Team:</span>
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team} value={team}>{team}</SelectItem>
                    ))}
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
                Office Floor Plan
              </CardTitle>
              <CardDescription>
                Click on any workstation to view employee details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Legend */}
              <div className="mb-6 pb-4 border-b">
                <StatusLegend stats={stats} />
              </div>

              {/* Floor Layout */}
              <div className="relative rounded-xl p-8 overflow-x-auto">

                <div className="mt-6 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 justify-items-center">
                  {clusters.map((cluster, idx) => (
                    <div key={idx} className="relative">
                      {/* Workstation label */}
                      <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-[10px] text-muted-foreground font-medium">
                        WS-{(idx + 1).toString().padStart(2, '0')}
                      </div>
                      <DeskCluster
                        employees={cluster}
                        startIndex={idx * 4}
                        onEmployeeClick={handleEmployeeClick}
                      />
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
                Employee List View
              </CardTitle>
              <CardDescription>
                All employees with current status
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
                      className={`p-4 rounded-lg border-2 ${config.borderColor} cursor-pointer 
                        transition-all hover:shadow-lg hover:scale-[1.02] bg-white dark:bg-gray-800`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white ${config.bgColor}`}>
                          {employee.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{employee.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground truncate">{employee.teamName || 'No Team'}</p>
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
    </AdminLayout>
  );
}
