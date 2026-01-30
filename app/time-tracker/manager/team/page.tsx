"use client";

import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, validateAuth } from '@/lib/authFetch';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Users, Zap, Moon, Coffee, CheckSquare, LayoutList, ChevronDown, ChevronRight, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  Cell,
  Rectangle,
  PieChart,
  Pie,
  Label,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { ActivityTimeline } from '@/components/ui/activity-timeline';
import { 
  toLocaleStringTz, 
  toLocaleDateStringTz 
} from '@/lib/timezoneUtils';

interface TeamMember {
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
  avgWorkMs?: number;
  avgBreakMs?: number;
  avgIdleMs?: number;
}

interface SessionSummary {
  workTimeMs?: number;
  totalBreakMs?: number;
  totalIdleMs?: number;
}

interface AppUsage {
  appName?: string;
  name?: string;
  timeMs?: number;
}

interface WebsiteUsage {
  website?: string;
  name?: string;
  browser?: string;
  timeMs?: number;
}

interface Session {
  id: string;
  startedAt: string;
  endedAt?: string;
  isActive: boolean;
  summary?: SessionSummary;
  workTimeMs?: number;
  breakTimeMs?: number;
  idleTimeMs?: number;
  appUsage?: AppUsage[];
  websiteUsage?: WebsiteUsage[];
  appSwitchEvents?: Array<{
    fromApp: string;
    toApp: string;
    timestamp: string;
    durationMs: number;
  }>;
  events?: Array<{
    type: string;
    reason: string | null;
    timestamp: string;
    durationMs: number;
  }>;
}

interface DailyWorkData {
  day: string;
  workTimeMs?: number;
  breakTimeMs?: number;
  idleTimeMs?: number;
}

interface TaskSession {
  id: string;
  taskId: string;
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  durationMs: number;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  project?: {
    id: string;
    name: string;
  };
  taskSessions?: TaskSession[];
  totalTimeMs?: number;
}

interface MemberDetails {
  status?: 'Active' | 'Idle' | 'Break' | 'Offline';
  aggregates?: {
    avgWorkMs?: number;
    totalWorkMs?: number;
    lastActive?: string;
  };
  topApps?: AppUsage[];
  topWebsites?: WebsiteUsage[];
  charts?: {
    dailyWorkData?: DailyWorkData[];
  };
  recentSessions?: Session[];
  tasks?: Task[];
}

interface TeamStats {
  realtime?: {
    working?: number;
    idle?: number;
    break?: number;
    total?: number;
  };
  users?: {
    total?: number;
  };
}

export default function TeamPage() {
  const router = useRouter();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberDetails, setMemberDetails] = useState<MemberDetails | null>(null);
  const [loadingMember, setLoadingMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>('IST');
  const [, forceUpdate] = useState({});
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
    const user = validateAuth('MANAGER', '/time-tracker/manager/login');
    if (!user) {
      return;
    }
    
    // Fetch manager's department
    async function fetchManagerDepartment() {
      try {
        const teamsResponse = await authFetch('/api/teams', {}, '/time-tracker/manager/login') as any;
        const managedDepartments = teamsResponse?.departments?.filter((dept: any) => 
          dept.managerId === user.id
        ) || [];
        
        if (managedDepartments.length > 0) {
          setTeamId(managedDepartments[0].id);
        } else {
          setError('No department assigned');
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch departments:', err);
        setError('Failed to load department information');
        setLoading(false);
      }
    }
    
    fetchManagerDepartment();
  }, [router]);

  const fetchTeamStats = useCallback(async () => {
    if (!teamId) return;
    try {
      const data = await authFetch(`/api/teams/${teamId}/stats`, {}, '/manager/login') as { stats?: TeamStats } & TeamStats;
      console.log('Team stats API response:', data);
      // API returns { success: true, stats: {...} }
      setStats(data.stats || data);
    } catch (err) {
      // authFetch already handles auth errors with toast
      if (err instanceof Error && err.name !== 'AuthError') {
        setError(err.message);
      }
    }
  }, [teamId]);

  const fetchTeamMembers = useCallback(async () => {
    if (!teamId) return;
    try {
      // Fetch both real-time floor status and member stats
      const [floorData, membersData] = await Promise.all([
        authFetch(`/api/teams/${teamId}/floor-status`, {}, '/manager/login') as Promise<{ employees?: TeamMember[] }>,
        authFetch(`/api/teams/${teamId}/members`, {}, '/manager/login') as Promise<{ members?: Array<{ id: string; avgWorkMs?: number; avgBreakMs?: number; avgIdleMs?: number; }> }>
      ]);
      
      // Merge the data - floor status with avg stats
      const floorEmployees = floorData.employees || [];
      const memberStats = membersData.members || [];
      
      const mergedMembers = floorEmployees.map(emp => {
        const stats = memberStats.find(m => m.id === emp.id);
        return {
          ...emp,
          avgWorkMs: stats?.avgWorkMs,
          avgBreakMs: stats?.avgBreakMs,
          avgIdleMs: stats?.avgIdleMs
        };
      });
      
      setMembers(mergedMembers);
    } catch (err) {
      // authFetch already handles auth errors with toast
      if (err instanceof Error && err.name !== 'AuthError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;
    
    // Load timezone
    setTimezone(localStorage.getItem('timezone') || 'IST');
    
    fetchTeamStats();
    fetchTeamMembers();

    // Listen for timezone changes and force re-render
    const handleTimezoneChange = (e: CustomEvent) => {
      setTimezone(e.detail);
      forceUpdate({});
    };

    window.addEventListener('timezoneChanged' as any, handleTimezoneChange);
    return () => {
      window.removeEventListener('timezoneChanged' as any, handleTimezoneChange);
    };
  }, [teamId, fetchTeamStats, fetchTeamMembers]);

  // Helper functions for formatting and filtering
  const formatStartTime = (member: TeamMember) => {
    if (member.status === 'offline' || !member.sessionId) return 'N/A';
    
    // Use sessionStartedAt if available
    if (member.sessionStartedAt) {
      const startTime = new Date(member.sessionStartedAt);
      return startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    
    // Fallback: Try to calculate from working duration if available
    if (member.workingDuration && member.workingDuration > 0) {
      const now = new Date();
      const startTime = new Date(now.getTime() - member.workingDuration);
      return startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    
    // Last fallback: Try to use lastActivity
    if (member.lastActivity) {
      const lastActivityTime = new Date(member.lastActivity);
      return lastActivityTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    
    return 'N/A';
  };

  const formatEndTime = (member: TeamMember) => {
    if (member.status === 'offline' || !member.sessionId) return 'N/A';
    
    // If session has ended, show the end time
    if (member.sessionEndedAt) {
      const endTime = new Date(member.sessionEndedAt);
      return endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    
    // For active sessions, show current time
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getStatusBadgeNew = (status: TeamMember['status']) => {
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

  // Filter and sort members - must be before early returns
  const filteredAndSortedMembers = React.useMemo(() => {
    let filtered = members;
    
    if (searchTerm) {
      filtered = filtered.filter(member => 
        (member.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (member.email?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter);
    }
    
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof TeamMember];
        let bValue: any = b[sortConfig.key as keyof TeamMember];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  }, [members, searchTerm, statusFilter, sortConfig]);

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

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  async function fetchMemberDetails(userId: string) {
    setLoadingMember(true);
    try {
      const data = await authFetch(`/api/users/${userId}/stats`, {}, '/manager/login') as { stats?: MemberDetails } & MemberDetails;
      console.log('Member details API response:', data);
      // API returns { success: true, stats: {...} }
      setMemberDetails(data.stats || data);
    } catch (err) {
      console.error('Error fetching member details:', err);
      // authFetch already handles auth errors with toast
      if (err instanceof Error && err.name !== 'AuthError') {
        setMemberDetails(null);
      }
    } finally {
      setLoadingMember(false);
    }
  }

  function handleMemberClick(member: TeamMember) {
    setSelectedMember(member);
    fetchMemberDetails(member.id);
  }

  function closeDialog() {
    setSelectedMember(null);
    setMemberDetails(null);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'bg-green-500';
      case 'Active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'Idle': return 'bg-yellow-500';
      case 'break': return 'bg-blue-500';
      case 'Break': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'working':
      case 'Active': return 'bg-green-500/20 text-green-700 border-green-500/50';
      case 'idle':
      case 'Idle': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/50';
      case 'break':
      case 'Break': return 'bg-blue-500/20 text-blue-700 border-blue-500/50';
      default: return 'bg-gray-500/20 text-gray-700 border-gray-500/50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Loading team data...</div>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Team</h1>
        <Badge variant="outline" className="text-xs">
          {(() => {
            const tz = typeof window !== 'undefined' ? (localStorage.getItem('timezone') || 'IST') : 'IST';
            return tz === 'IST' ? 'Indian Standard Time (IST)' : 'Eastern Standard Time (EST)';
          })()}
        </Badge>
      </div>

      {/* Team Stats Cards */}
      {stats?.realtime && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Active */}
          <Card className="border-2 border-green-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                    <Zap className="h-4 w-4" />
                    Active
                  </div>
                  <div className="text-3xl font-bold text-green-700 dark:text-green-300 mt-2">
                    {stats.realtime.working || 0}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Idle */}
          <Card className="border-2 border-yellow-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    <Moon className="h-4 w-4" />
                    Idle
                  </div>
                  <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-300 mt-2">
                    {stats.realtime.idle || 0}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Break */}
          <Card className="border-2 border-blue-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                    <Coffee className="h-4 w-4" />
                    Break
                  </div>
                  <div className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-2">
                    {stats.realtime.break || 0}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Offline */}
          <Card className="border-2 border-gray-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    <Users className="h-4 w-4" />
                    Offline
                  </div>
                  <div className="text-3xl font-bold text-gray-700 dark:text-gray-300 mt-2">
                    {(stats.users?.total || 0) - (stats.realtime.total || 0)}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-gray-500/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Click on a member to view detailed stats</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
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
              <div className="rounded-md border max-h-[600px] overflow-auto">
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
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('avgWorkMs')}
                          className="h-auto p-0 hover:bg-transparent font-semibold"
                        >
                          Avg Work
                          {getSortIcon('avgWorkMs')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('avgBreakMs')}
                          className="h-auto p-0 hover:bg-transparent font-semibold"
                        >
                          Avg Break
                          {getSortIcon('avgBreakMs')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('avgIdleMs')}
                          className="h-auto p-0 hover:bg-transparent font-semibold"
                        >
                          Avg Idle
                          {getSortIcon('avgIdleMs')}
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedMembers.length > 0 ? (
                      filteredAndSortedMembers.map((member) => (
                        <TableRow
                          key={member.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleMemberClick(member)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {(member.name || member.email || '?')[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{member.name || 'Unknown'}</span>
                                <div className={`w-2 h-2 rounded-full ${getStatusColor(member.status || 'offline')}`} />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatStartTime(member)}</TableCell>
                          <TableCell>{formatEndTime(member)}</TableCell>
                          <TableCell>
                            {getStatusBadgeNew(member.status || 'offline')}
                          </TableCell>
                          <TableCell>
                            {member.avgWorkMs ? formatTime(member.avgWorkMs) : '-'}
                          </TableCell>
                          <TableCell>
                            {member.avgBreakMs ? formatTime(member.avgBreakMs) : '-'}
                          </TableCell>
                          <TableCell>
                            {member.avgIdleMs ? formatTime(member.avgIdleMs) : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No members found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Results count */}
              <div className="text-sm text-muted-foreground">
                Showing {filteredAndSortedMembers.length} of {members.length} members
              </div>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
              No team members found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member Details Dialog */}
      <MemberDetailsDialog
        member={selectedMember}
        details={memberDetails}
        loading={loadingMember}
        onClose={closeDialog}
        timezone={timezone}
      />
    </div>
  );
}

function MemberDetailsDialog({
  member,
  details,
  loading,
  onClose,
  timezone
}: {
  member: TeamMember | null;
  details: MemberDetails | null;
  loading: boolean;
  onClose: () => void;
  timezone: string;
}) {
  const [selectedSession, setSelectedSession] = React.useState<Session | null>(null);
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'tasks' | 'overall'>('tasks');
  const [expandedTasks, setExpandedTasks] = React.useState<Set<string>>(new Set());

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // Helper function to format time (hours or minutes)
  const formatTime = (ms: number): string => {
    const hours = ms / (1000 * 60 * 60);
    if (hours < 1) {
      const minutes = Math.round(ms / (1000 * 60));
      return `${minutes}m`;
    }
    return `${hours.toFixed(1)}h`;
  };

  const topApps = details?.topApps || [];
  const topWebsites = details?.topWebsites || [];
  const dailyWork = details?.charts?.dailyWorkData || [];
  const recentSessions = details?.recentSessions || [];

  // Group sessions by day based on timezone
  const sessionsByDay = React.useMemo(() => {
    const grouped = new Map<string, Session[]>();
    
    recentSessions.forEach((session) => {
      const dateKey = toLocaleDateStringTz(session.startedAt, timezone as 'IST' | 'EST');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(session);
    });
    
    // Convert to array and sort by date (newest first)
    return Array.from(grouped.entries())
      .sort((a, b) => {
        const dateA = new Date(recentSessions.find(s => toLocaleDateStringTz(s.startedAt, timezone as 'IST' | 'EST') === a[0])?.startedAt || 0);
        const dateB = new Date(recentSessions.find(s => toLocaleDateStringTz(s.startedAt, timezone as 'IST' | 'EST') === b[0])?.startedAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
  }, [recentSessions, timezone]);

  // Aggregate data for selected day
  const dayAggregatedData = React.useMemo(() => {
    if (!selectedDay) return { sessionData: [], totalTime: 0, apps: [], websites: [], timeline: [] };
    
    const daySessions = sessionsByDay.find(([date]) => date === selectedDay)?.[1] || [];
    
    // Calculate daily totals
    const dayTotalWork = daySessions.reduce((sum, s) => 
      sum + (s.summary?.workTimeMs || s.workTimeMs || 0), 0
    );
    const dayTotalBreak = daySessions.reduce((sum, s) => 
      sum + (s.summary?.totalBreakMs || s.breakTimeMs || 0), 0
    );
    const dayTotalIdle = daySessions.reduce((sum, s) => 
      sum + (s.summary?.totalIdleMs || s.idleTimeMs || 0), 0
    );
    const dayTotalTime = dayTotalWork + dayTotalBreak + dayTotalIdle;
    
    // Aggregate app usage
    const appUsageMap = new Map<string, number>();
    daySessions.forEach(session => {
      session.appUsage?.forEach(app => {
        const existing = appUsageMap.get(app.appName!) || 0;
        appUsageMap.set(app.appName!, existing + app.timeMs!);
      });
    });
    
    // Aggregate website usage - combine with browser
    const websiteUsageMap = new Map<string, { url: string; timeMs: number; browser?: string }>();
    daySessions.forEach(session => {
      session.websiteUsage?.forEach(website => {
        const websiteUrl = website.website || website.name || 'Unknown';
        const existing = websiteUsageMap.get(websiteUrl);
        if (existing) {
          existing.timeMs += website.timeMs!;
        } else {
          websiteUsageMap.set(websiteUrl, { 
            url: websiteUrl, 
            timeMs: website.timeMs!,
            browser: website.browser || 'Browser'
          });
        }
      });
    });
    
    // Create unified timeline combining apps and websites
    const timeline: Array<{ name: string; timeMs: number; type: 'app' | 'website'; browser?: string }> = [];
    
    // Add apps
    appUsageMap.forEach((timeMs, appName) => {
      timeline.push({ name: appName, timeMs, type: 'app' });
    });
    
    // Add websites with browser info
    websiteUsageMap.forEach((data) => {
      timeline.push({ 
        name: data.url, 
        timeMs: data.timeMs, 
        type: 'website',
        browser: data.browser
      });
    });
    
    // Sort timeline by time descending
    timeline.sort((a, b) => b.timeMs - a.timeMs);
    
    return {
      sessionData: [
        { name: 'Work', value: Math.round(dayTotalWork / (1000 * 60)), valueMs: dayTotalWork, fill: '#10b981' },
        { name: 'Break', value: Math.round(dayTotalBreak / (1000 * 60)), valueMs: dayTotalBreak, fill: '#3b82f6' },
        { name: 'Idle', value: Math.round(dayTotalIdle / (1000 * 60)), valueMs: dayTotalIdle, fill: '#f59e0b' },
      ],
      totalTime: dayTotalTime,
      timeline
    };
  }, [selectedDay, sessionsByDay]);

  if (!member) return null;

  return (
    <Dialog open={!!member} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[80%] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-lg">
                {(member.name || member.email || '?')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xl font-bold">{member.name || 'Unknown'}</div>
              <div className="text-sm text-muted-foreground font-normal">{member.email}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading employee details...</div>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-2">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-1">
                    {details?.status === 'Active' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                    {details?.status === 'Idle' && <span className="w-2 h-2 rounded-full bg-yellow-500" />}
                    {details?.status === 'Break' && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    {details?.status === 'Offline' && <span className="w-2 h-2 rounded-full bg-gray-400" />}
                    <span className="text-xs text-muted-foreground">Status</span>
                  </div>
                  <div className={`text-lg font-bold ${
                    details?.status === 'Active' ? 'text-green-600' :
                    details?.status === 'Idle' ? 'text-yellow-600' :
                    details?.status === 'Break' ? 'text-blue-600' :
                    'text-gray-500'
                  }`}>{details?.status || member.status || 'Offline'}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground mb-1">Avg Work/Day</div>
                  <div className="text-lg font-bold">
                    {details?.aggregates?.avgWorkMs
                      ? formatTime(details.aggregates.avgWorkMs)
                      : '-'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground mb-1">Total Work</div>
                  <div className="text-lg font-bold">
                    {details?.aggregates?.totalWorkMs
                      ? formatTime(details.aggregates.totalWorkMs)
                      : '-'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground mb-1">Last Active</div>
                  <div className="text-sm font-medium">
                    {details?.aggregates?.lastActive
                      ? toLocaleDateStringTz(details.aggregates.lastActive, timezone as 'IST' | 'EST')
                      : (member.lastActivity ? toLocaleDateStringTz(member.lastActivity, timezone as 'IST' | 'EST') : '-')}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* View Mode Tabs - For Charts Only */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'tasks' | 'overall')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tasks" className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Task Breakdown
                </TabsTrigger>
                <TabsTrigger value="overall" className="flex items-center gap-2">
                  <LayoutList className="h-4 w-4" />
                  App Usage
                </TabsTrigger>
              </TabsList>

              {/* Tasks View */}
              <TabsContent value="tasks" className="space-y-4 mt-4">
                {details?.tasks && details.tasks.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Task Breakdown</CardTitle>
                      <CardDescription>Time spent on each task with session details</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {details.tasks.map((task) => (
                          <div key={task.id} className="border rounded-lg">
                            <div 
                              className="p-4 cursor-pointer hover:bg-muted/50 flex items-center justify-between"
                              onClick={() => toggleTaskExpansion(task.id)}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{task.title}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {task.status}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {task.priority}
                                  </Badge>
                                </div>
                                {task.project && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Project: {task.project.name}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-sm font-medium">
                                    {formatTime(task.totalTimeMs || 0)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {task.taskSessions?.length || 0} sessions
                                  </div>
                                </div>
                                {expandedTasks.has(task.id) ? (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            
                            {expandedTasks.has(task.id) && (
                              <div className="px-4 pb-4 space-y-4 border-t pt-4">
                                {/* Task Sessions */}
                                {task.taskSessions && task.taskSessions.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold mb-2">Sessions</h5>
                                    <div className="space-y-2">
                                      {task.taskSessions.map((session) => (
                                        <div key={session.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                                          <span className="text-muted-foreground">
                                            {toLocaleStringTz(session.startedAt, timezone as 'IST' | 'EST')}
                                          </span>
                                          <span className="font-medium">
                                            {formatTime(Number(session.durationMs))}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No tasks found for this employee
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* App Usage View */}
              <TabsContent value="overall" className="space-y-4 mt-4">
                {/* Show aggregated data for selected day */}
                {selectedDay ? (
                  <div className="space-y-6">
                    {/* Header with date and clear button */}
                    <div className="flex items-center justify-between pb-2 border-b">
                      <div>
                        <h3 className="text-xl font-semibold">{selectedDay}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Total: {formatTime(dayAggregatedData.totalTime)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDay(null)}
                      >
                        Clear Selection
                      </Button>
                    </div>
                    
                    {/* Compact Time Distribution */}
                    {dayAggregatedData.sessionData.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {dayAggregatedData.sessionData.map((item) => (
                          <Card key={item.name}>
                            <CardContent className="pt-4 pb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: item.fill }}
                                />
                                <span className="text-xs text-muted-foreground">{item.name}</span>
                              </div>
                              <div className="text-xl font-bold">{formatTime(item.valueMs)}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {((item.valueMs / dayAggregatedData.totalTime) * 100).toFixed(1)}%
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    {/* Unified Activity Timeline */}
                    {dayAggregatedData.timeline.length > 0 ? (
                      <Card className="border-2">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <div className="w-1 h-5 bg-primary rounded-full" />
                            Activity Timeline
                          </CardTitle>
                          <CardDescription>
                            {dayAggregatedData.timeline.length} application{dayAggregatedData.timeline.length !== 1 ? 's' : ''} and website{dayAggregatedData.timeline.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2.5">
                            {dayAggregatedData.timeline.slice(0, 20).map((item, idx) => {
                              const totalActivityTime = dayAggregatedData.timeline.reduce((sum, i) => sum + i.timeMs, 0);
                              const percentage = (item.timeMs / totalActivityTime) * 100;
                              
                              return (
                                <div key={idx} className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="text-xs font-semibold text-muted-foreground w-6 text-right">
                                        #{idx + 1}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <Badge 
                                            variant={item.type === 'app' ? 'default' : 'secondary'}
                                            className="text-xs px-1.5 py-0 h-5"
                                          >
                                            {item.type === 'app' ? 'App' : item.browser || 'Web'}
                                          </Badge>
                                          <span className="text-sm font-medium truncate">
                                            {item.name}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground min-w-[45px] text-right">
                                        {percentage.toFixed(1)}%
                                      </span>
                                      <span className="text-sm font-semibold min-w-[55px] text-right">
                                        {formatTime(item.timeMs)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-1.5 ml-8">
                                    <div
                                      className={`h-1.5 rounded-full transition-all duration-500 ${
                                        item.type === 'app' ? 'bg-primary' : 'bg-purple-500'
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                          No application or website usage data available for this day
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card className="border-2 border-dashed">
                    <CardContent className="py-16 text-center">
                      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                        <LayoutList className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">No Day Selected</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Select a day from the Daily Summary table below to view aggregated app usage and website activity
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            {/* Recent Sessions Table - Always Visible */}
                {recentSessions.length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Daily Summary</CardTitle>
                        <CardDescription>Click on a day to view aggregated activity</CardDescription>
                      </div>
                      {selectedDay && (
                        <button
                          onClick={() => setSelectedDay(null)}
                          className="text-sm text-primary hover:underline"
                        >
                          Clear Selection
                        </button>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Start Time</TableHead>
                            <TableHead>End Time</TableHead>
                            <TableHead>Work Time</TableHead>
                            <TableHead>Break Time</TableHead>
                            <TableHead>Idle Time</TableHead>
                            <TableHead>Total Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sessionsByDay.map(([dateKey, sessions]) => {
                            // Calculate daily totals
                            const dayTotalWork = sessions.reduce((sum, s) => 
                              sum + (s.summary?.workTimeMs || s.workTimeMs || 0), 0
                            );
                            const dayTotalBreak = sessions.reduce((sum, s) => 
                              sum + (s.summary?.totalBreakMs || s.breakTimeMs || 0), 0
                            );
                            const dayTotalIdle = sessions.reduce((sum, s) => 
                              sum + (s.summary?.totalIdleMs || s.idleTimeMs || 0), 0
                            );
                            const dayTotalTime = dayTotalWork + dayTotalBreak + dayTotalIdle;
                            
                            // Find earliest start and latest end for the day
                            const startTimes = sessions.map(s => new Date(s.startedAt).getTime());
                            const endTimes = sessions.map(s => s.endedAt ? new Date(s.endedAt).getTime() : Date.now());
                            const earliestStart = Math.min(...startTimes);
                            const latestEnd = Math.max(...endTimes);
                            
                            const formatSessionTime = (timestamp: number) => {
                              return new Date(timestamp).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                hour12: true 
                              });
                            };
                            
                            return (
                              <TableRow 
                                key={dateKey}
                                className={`cursor-pointer hover:bg-muted/50 ${selectedDay === dateKey ? 'bg-muted' : ''}`}
                                onClick={() => setSelectedDay(dateKey)}
                              >
                                <TableCell className="font-medium">{dateKey}</TableCell>
                                <TableCell>{formatSessionTime(earliestStart)}</TableCell>
                                <TableCell>{formatSessionTime(latestEnd)}</TableCell>
                                <TableCell className="text-green-600 font-medium">
                                  {formatTime(dayTotalWork)}
                                </TableCell>
                                <TableCell className="text-blue-600 font-medium">
                                  {formatTime(dayTotalBreak)}
                                </TableCell>
                                <TableCell className="text-yellow-600 font-medium">
                                  {formatTime(dayTotalIdle)}
                                </TableCell>
                                <TableCell className="font-semibold">
                                  {formatTime(dayTotalTime)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
