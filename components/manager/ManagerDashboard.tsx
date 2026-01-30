"use client";

import { useEffect, useState, useMemo } from 'react';
import { authFetch } from '@/lib/authFetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Clock, Coffee, Zap, Moon, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  XAxis,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Label,
  LineChart,
  Line,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent,  } from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface StatsData {
  realtime?: {
    working?: number;
    idle?: number;
    break?: number;
    total?: number;
  };
  users?: {
    total?: number;
  };
  charts?: {
    dailyWorkData?: DailyWorkData[];
    dailySessions?: DailySession[];
    topApps?: TopApp[];
    topWebsites?: TopWebsite[];
  };
  workTime?: {
    avgWorkTimeMs?: number;
    totalWorkTimeMs?: number;
    totalBreakTimeMs?: number;
    totalIdleTimeMs?: number;
  };
  sessions?: {
    thisMonth?: number;
  };
  aggregates?: {
    avgWorkMs?: number;
    totalWorkMs?: number;
    avgBreakMs?: number;
    avgIdleMs?: number;
  };
  topUsers?: TopUser[];
}

interface DailyWorkData {
  day: string;
  workTimeMs?: number;
  breakTimeMs?: number;
  idleTimeMs?: number;
}

interface DailySession {
  day: string;
  sessions?: number;
}

interface TopApp {
  name: string;
  timeMs?: number;
  hours?: number;
}

interface TopWebsite {
  name: string;
  browser?: string;
  timeMs?: number;
  hours?: number;
}

interface TopUser {
  userId?: string;
  workTimeMs?: number;
  user?: {
    name?: string;
  };
}

interface FloorEmployee {
  id: string;
  name: string | null;
  email: string;
  role: string;
  departmentId: string | null;
  departmentName: string | null;
  seatNumber: number | null;
  status: 'working' | 'idle' | 'break' | 'offline';
  lastActivity: string | null;
  currentApp: string | null;
  sessionId: string | null;
  sessionStartedAt: string | null;
  sessionEndedAt: string | null;
  onBreakSince: string | null;
  idleSince: string | null;
  workingDuration: number | null;
}

interface FloorStatusResponse {
  success: boolean;
  departmentId: string;
  departmentName: string;
  employees: FloorEmployee[];
  stats: {
    working: number;
    idle: number;
    break: number;
    offline: number;
    total: number;
  };
  timestamp: string;
}

export default function ManagerDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<'week' | 'month'>('week');
  const [chartType, setChartType] = useState<'sessions' | 'time'>('sessions');
  const [timezone, setTimezone] = useState<string>('IST');
  const [, forceUpdate] = useState({});
  const [floorStatus, setFloorStatus] = useState<FloorStatusResponse | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);

  // Helper function to format time (hours or minutes)
  const formatTime = (ms: number): string => {
    const hours = ms / (1000 * 60 * 60);
    if (hours < 1) {
      const minutes = Math.round(ms / (1000 * 60));
      return `${minutes}m`;
    }
    return `${hours.toFixed(1)}h`;
  };

  useEffect(() => {
    // Load timezone
    setTimezone(localStorage.getItem('timezone') || 'IST');
    
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    
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
  }, []);

  async function fetchStats() {
    try {
      const storedUser = localStorage.getItem('user');
      
      if (!storedUser) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const user = JSON.parse(storedUser);
      let url = '/api/admin/stats';
      let deptId: string | null = null;
      
      // If manager, get their managed department(s) first
      if (user.role === 'MANAGER') {
        try {
          // Fetch departments managed by this user
          const teamsResponse = await authFetch('/api/teams', {}, '/time-tracker/manager/login') as any;
          const managedDepartments = teamsResponse?.departments?.filter((dept: any) => 
            dept.managerId === user.id
          ) || [];
          
          if (managedDepartments.length > 0) {
            // Use the first managed department's stats
            deptId = managedDepartments[0].id;
            url = `/api/teams/${deptId}/stats`;
            setDepartmentId(deptId);
          } else {
            setError('No department assigned');
            setLoading(false);
            return;
          }
        } catch (teamsErr) {
          console.error('Failed to fetch teams:', teamsErr);
          setError('Failed to load department information');
          setLoading(false);
          return;
        }
      }

      const data = await authFetch(url, {}, '/time-tracker/manager/login') as { stats?: StatsData } & StatsData;
      console.log('Stats API response:', data);
      // API returns { success: true, stats: {...} }
      setStats(data.stats || data);
      
      // Fetch floor status if we have a department ID
      if (deptId) {
        try {
          const floorData = await authFetch(`/api/teams/${deptId}/floor-status`, {}, '/time-tracker/manager/login') as FloorStatusResponse;
          setFloorStatus(floorData);
        } catch (floorErr) {
          console.error('Failed to fetch floor status:', floorErr);
        }
      }
    } catch (err) {
      // authFetch already handles auth errors with toast
      if (err instanceof Error && err.name !== 'AuthError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }
  const statusData = useMemo(() => [
    { name: 'Working', value: stats?.realtime?.working || 0, fill: '#10b981' },
    { name: 'Idle', value: stats?.realtime?.idle || 0, fill: '#f59e0b' },
    { name: 'Break', value: stats?.realtime?.break || 0, fill: '#3b82f6' },
    { name: 'Offline', value: (stats?.users?.total || 0) - (stats?.realtime?.total || 0), fill: '#6b7280' },
  ], [stats?.realtime?.working, stats?.realtime?.idle, stats?.realtime?.break, stats?.users?.total, stats?.realtime?.total]);

  const statusChartConfig = {
    value: {
      label: "Members",
    },
    Working: {
      label: "Working",
      color: "#10b981",
    },
    Idle: {
      label: "Idle",
      color: "#f59e0b",
    },
    Break: {
      label: "Break",
      color: "#3b82f6",
    },
    Offline: {
      label: "Offline",
      color: "#6b7280",
    },
  };

  const totalMembers = useMemo(() => {
    return statusData.reduce((acc, curr) => acc + curr.value, 0)
  }, [statusData]);

  // Create user-wise chart data for today
  const userChartData = useMemo(() => {
    if (!floorStatus?.employees) return [];
    
    return floorStatus.employees
      .filter(emp => emp.workingDuration && emp.workingDuration > 0)
      .map(emp => ({
        name: (emp.name || emp.email).split(' ')[0], // First name only
        workTime: parseFloat(((emp.workingDuration || 0) / (1000 * 60 * 60)).toFixed(1)),
        status: emp.status
      }))
      .sort((a, b) => b.workTime - a.workTime)
      .slice(0, 10); // Top 10 users
  }, [floorStatus]);

  // Filter and sort employees - must be before early returns (hooks rule)
  const filteredAndSortedEmployees = useMemo(() => {
    if (!floorStatus?.employees) return [];
    
    let filtered = floorStatus.employees;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(emp => 
        (emp.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (emp.email?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(emp => emp.status === statusFilter);
    }
    
    // Apply sorting
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof FloorEmployee];
        let bValue: any = b[sortConfig.key as keyof FloorEmployee];
        
        // Handle null values
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        // Convert to lowercase for string comparison
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [floorStatus?.employees, searchTerm, statusFilter, sortConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  const dailyWork = stats?.charts?.dailyWorkData || [];
  const sessions = stats?.charts?.dailySessions || [];

  // Map workTime to aggregates for compatibility
  const aggregates = stats?.workTime ? {
    avgWorkMs: stats.workTime.avgWorkTimeMs,
    totalWorkMs: stats.workTime.totalWorkTimeMs,
    avgBreakMs: (stats.workTime.totalBreakTimeMs || 0) / Math.max(1, stats.sessions?.thisMonth || 1),
    avgIdleMs: (stats.workTime.totalIdleTimeMs || 0) / Math.max(1, stats.sessions?.thisMonth || 1),
  } : stats?.aggregates;

  // Helper function to format start time
  const formatStartTime = (employee: FloorEmployee) => {
    if (employee.status === 'offline' || !employee.sessionId) return 'N/A';
    
    // Use sessionStartedAt if available
    if (employee.sessionStartedAt) {
      const startTime = new Date(employee.sessionStartedAt);
      return startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    
    // Fallback: Try to calculate from working duration if available
    if (employee.workingDuration && employee.workingDuration > 0) {
      const now = new Date();
      const startTime = new Date(now.getTime() - employee.workingDuration);
      return startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    
    // Last fallback: Try to use lastActivity
    if (employee.lastActivity) {
      const lastActivityTime = new Date(employee.lastActivity);
      return lastActivityTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    
    return 'N/A';
  };

  // Helper function to format end time (current time for active sessions)
  const formatEndTime = (employee: FloorEmployee) => {
    if (employee.status === 'offline' || !employee.sessionId) return 'N/A';
    
    // If session has ended, show the end time
    if (employee.sessionEndedAt) {
      const endTime = new Date(employee.sessionEndedAt);
      return endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    
    // For active sessions, show current time
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Helper function to get status badge color
  const getStatusBadge = (status: FloorEmployee['status']) => {
    switch (status) {
      case 'working':
        return <Badge className="bg-green-500">Working</Badge>;
      case 'idle':
        return <Badge className="bg-yellow-500">Idle</Badge>;
      case 'break':
        return <Badge className="bg-blue-500">Break</Badge>;
      case 'offline':
        return <Badge variant="secondary">Offline</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Handle column sort
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  // Get sort icon
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Manager Dashboard</h1>
        <Badge variant="outline" className="text-xs">
          {(() => {
            const tz = typeof window !== 'undefined' ? (localStorage.getItem('timezone') || 'IST') : 'IST';
            return tz === 'IST' ? 'Indian Standard Time (IST)' : 'Eastern Standard Time (EST)';
          })()}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Team Members Status</CardTitle>
            <CardDescription>Real-time status of all team members</CardDescription>
          </CardHeader>
          <CardContent>
            {floorStatus && floorStatus.employees.length > 0 ? (
              <div className="space-y-4">
                {/* Search and Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <Filter className="mr-2 h-4 w-4" />
                        Status: {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                        All
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('working')}>
                        Working
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('idle')}>
                        Idle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('break')}>
                        Break
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('offline')}>
                        Offline
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Scrollable Table */}
                <div className="rounded-md border max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('name')}
                            className="h-auto p-0 hover:bg-transparent font-semibold"
                          >
                            Name
                            {getSortIcon('name')}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('workingDuration')}
                            className="h-auto p-0 hover:bg-transparent font-semibold"
                          >
                            Start Time
                            {getSortIcon('workingDuration')}
                          </Button>
                        </TableHead>
                        <TableHead>End Time</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('status')}
                            className="h-auto p-0 hover:bg-transparent font-semibold"
                          >
                            Status
                            {getSortIcon('status')}
                          </Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedEmployees.length > 0 ? (
                        filteredAndSortedEmployees.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell className="font-medium">{employee.name || 'N/A'}</TableCell>
                            <TableCell>{formatStartTime(employee)}</TableCell>
                            <TableCell>{formatEndTime(employee)}</TableCell>
                            <TableCell>{getStatusBadge(employee.status)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No employees found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Results count */}
                <div className="text-sm text-muted-foreground">
                  Showing {filteredAndSortedEmployees.length} of {floorStatus.employees.length} employees
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No team member data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Status Distribution */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Team Status Distribution</CardTitle>
            <CardDescription>Current status of all team members</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {statusData.some(d => d.value > 0) ? (
              <ChartContainer
                config={statusChartConfig}
                className="mx-auto aspect-square max-h-[250px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-3xl font-bold"
                              >
                                {totalMembers.toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground"
                              >
                                Members
                              </tspan>
                            </text>
                          )
                        }
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="mx-auto aspect-square max-h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                No status data available
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm pt-4">
            <div className="flex flex-wrap justify-center gap-4">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-muted-foreground">{item.name}:</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charts */}

        {/* Session Activity - Interactive */}
        <Card className="col-span-2 py-4 sm:py-0">
          <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
            <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
              <CardTitle>{chartType === 'sessions' ? 'User Work Hours (Today)' : 'Time Trends'}</CardTitle>
              <CardDescription>
                {chartType === 'sessions' ? 'Work hours by team member today' : 'Work, break, and idle time trends'}
              </CardDescription>
            </div>
            <div className="flex">
              {chartType === 'sessions' ? (
                // User data view - show total hours today
                <div className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-center sm:border-t-0 sm:px-8 sm:py-6 min-w-[140px] bg-muted/50">
                  <span className="text-muted-foreground text-xs">Total Today</span>
                  <span className="text-lg leading-none font-bold sm:text-3xl">
                    {userChartData.reduce((acc, curr) => acc + curr.workTime, 0).toFixed(1)}h
                  </span>
                </div>
              ) : (
                // Time trends view
                [{key: 'week', label: 'Week'}, {key: 'month', label: 'Month'}].map((period) => {
                  const isActive = activeChart === period.key;
                  const periodData = activeChart === 'week' 
                    ? dailyWork.slice(-7) 
                    : dailyWork.slice(-30);
                  const totalHours = periodData.reduce((acc: number, curr: DailyWorkData) => 
                    acc + ((curr.workTimeMs || 0) / (1000 * 60 * 60)), 0
                  );
                  
                  return (
                    <button
                      key={period.key}
                      data-active={isActive}
                      className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6 min-w-[140px]"
                      onClick={() => setActiveChart(period.key as 'week' | 'month')}
                    >
                      <span className="text-muted-foreground text-xs">
                        {period.key === 'week' ? '7 Days' : '30 Days'}
                      </span>
                      <span className="text-lg leading-none font-bold sm:text-3xl">
                        {totalHours.toFixed(1)}h
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:p-6">
            <div className="flex justify-end mb-4">
              <div className="inline-flex rounded-lg border p-1">
                <Button
                  variant={chartType === 'sessions' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('sessions')}
                  className="h-7 px-3"
                >
                  Users
                </Button>
                <Button
                  variant={chartType === 'time' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('time')}
                  className="h-7 px-3"
                >
                  Time Trends
                </Button>
              </div>
            </div>
            {chartType === 'sessions' ? (
              userChartData.length ? (
                <ChartContainer
                  config={{
                    workTime: {
                      label: "Work Time",
                      color: "#10b981",
                    },
                  }}
                  className="aspect-auto h-[250px] w-full"
                >
                  <LineChart
                    accessibilityLayer
                    data={userChartData}
                    margin={{
                      left: 12,
                      right: 12,
                    }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={20}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          className="w-[150px]"
                          nameKey="workTime"
                          formatter={(value) => `${value} hours`}
                        />
                      }
                    />
                    <Line
                      dataKey="workTime"
                      type="monotone"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: "#10b981", r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                  No user data available for today
                </div>
              )
            ) : (
              dailyWork.length ? (
                <ChartContainer
                  config={{
                    workTime: {
                      label: "Work Time",
                      color: "#10b981",
                    },
                    breakTime: {
                      label: "Break Time",
                      color: "#3b82f6",
                    },
                    idleTime: {
                      label: "Idle Time",
                      color: "#f59e0b",
                    },
                  }}
                  className="aspect-auto h-[250px] w-full"
                >
                  <LineChart
                    accessibilityLayer
                    data={(activeChart === 'week' ? dailyWork.slice(-7) : dailyWork.slice(-30)).map((d: DailyWorkData) => ({
                      ...d,
                      workTime: parseFloat(((d.workTimeMs || 0) / (1000 * 60 * 60)).toFixed(1)),
                      breakTime: parseFloat(((d.breakTimeMs || 0) / (1000 * 60 * 60)).toFixed(1)),
                      idleTime: parseFloat(((d.idleTimeMs || 0) / (1000 * 60 * 60)).toFixed(1)),
                    }))}
                    margin={{
                      left: 12,
                      right: 12,
                    }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      dataKey="workTime"
                      type="monotone"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      dataKey="breakTime"
                      type="monotone"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      dataKey="idleTime"
                      type="monotone"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                  No time data available
                </div>
              )
            )}
          </CardContent>
        </Card>

        
      </div>

      {/* Top Apps and Websites Section */}
      <div className="grid gap-4 md:grid-cols-2 mt-4">
        {/* Top Applications */}
        <Card>
          <CardHeader>
            <CardTitle>Top Applications</CardTitle>
            <CardDescription>Most used applications this month</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.charts?.topApps && stats.charts.topApps.length > 0 ? (
              <div className="space-y-2">
                {stats.charts.topApps.slice(0, 8).map((app: TopApp, index: number) => {
                  const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-2 h-8 rounded-full shrink-0"
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <span className="text-sm font-medium truncate">
                          {app.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-muted-foreground">
                          {formatTime(app.timeMs || 0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No application data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Websites */}
        <Card>
          <CardHeader>
            <CardTitle>Top Websites</CardTitle>
            <CardDescription>Most visited websites this month</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.charts?.topWebsites && stats.charts.topWebsites.length > 0 ? (
              <div className="space-y-2">
                {stats.charts.topWebsites.slice(0, 8).map((site: TopWebsite, index: number) => {
                  const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-2 h-8 rounded-full shrink-0"
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">
                            {site.name}
                          </span>
                          {site.browser && (
                            <span className="text-xs text-muted-foreground">
                              {site.browser}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-muted-foreground">
                          {formatTime(site.timeMs || 0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No website data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
