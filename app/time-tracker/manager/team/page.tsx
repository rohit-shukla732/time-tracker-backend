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
import { Users, Zap, Moon, Coffee } from 'lucide-react';
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
  name?: string;
  email: string;
  status?: 'Active' | 'Idle' | 'Break' | 'Offline';
  avgWorkMs?: number;
  avgBreakMs?: number;
  avgIdleMs?: number;
  lastActive?: string;
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
    setTeamId(user.teamId);
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
      const data = await authFetch(`/api/teams/${teamId}/members`, {}, '/manager/login') as { members?: TeamMember[] };
      setMembers(data.members || []);
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
      case 'Active': return 'bg-green-500';
      case 'Idle': return 'bg-yellow-500';
      case 'Break': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500/20 text-green-700 border-green-500/50';
      case 'Idle': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/50';
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Avg Work</TableHead>
                <TableHead>Avg Break</TableHead>
                <TableHead>Avg Idle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
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
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(member.status || 'Offline')}`} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadge(member.status || 'Offline')}>
                      {member.status || 'Offline'}
                    </Badge>
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
              ))}
            </TableBody>
          </Table>
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

  // Session-specific data - always calculate to avoid hooks order issues
  const sessionData = React.useMemo(() => {
    if (!selectedSession) return [];
    console.log('Selected session:', selectedSession);
    
    // Check if session has summary data, otherwise use direct properties
    const workTime = selectedSession.summary?.workTimeMs || selectedSession.workTimeMs || 0;
    const breakTime = selectedSession.summary?.totalBreakMs || selectedSession.breakTimeMs || 0;
    const idleTime = selectedSession.summary?.totalIdleMs || selectedSession.idleTimeMs || 0;
    
    // Store values in minutes for better display
    return [
      { name: 'Work', value: Math.round(workTime / (1000 * 60)), valueMs: workTime, fill: '#10b981' },
      { name: 'Break', value: Math.round(breakTime / (1000 * 60)), valueMs: breakTime, fill: '#3b82f6' },
      { name: 'Idle', value: Math.round(idleTime / (1000 * 60)), valueMs: idleTime, fill: '#f59e0b' },
    ];
  }, [selectedSession]);

  const totalSessionTime = React.useMemo(() => {
    const total = sessionData.reduce((acc, curr) => acc + curr.valueMs, 0);
    console.log('Total session time:', total, 'sessionData:', sessionData);
    return total;
  }, [sessionData]);

  const sessionApps = selectedSession?.appUsage || [];
  const sessionWebsites = selectedSession?.websiteUsage || [];

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
                      : (member.lastActive ? toLocaleDateStringTz(member.lastActive, timezone as 'IST' | 'EST') : '-')}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Timeline - shown when session is selected */}
            {selectedSession && selectedSession.appSwitchEvents && selectedSession.events && (
              <ActivityTimeline
                sessionStart={selectedSession.startedAt}
                sessionEnd={selectedSession.endedAt || null}
                summary={selectedSession.summary ? {
                  workTimeMs: selectedSession.summary.workTimeMs ?? 0,
                  totalBreakMs: selectedSession.summary.totalBreakMs ?? 0,
                  totalIdleMs: selectedSession.summary.totalIdleMs ?? 0
                } : undefined}
                appUsage={selectedSession.appUsage}
                websiteUsage={selectedSession.websiteUsage}
                appSwitchEvents={selectedSession.appSwitchEvents}
                events={selectedSession.events}
              />
            )}

            {/* Recent Sessions Table */}
            {recentSessions.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">All Sessions</CardTitle>
                    <CardDescription>Click on a session to view detailed breakdown</CardDescription>
                  </div>
                  {selectedSession && (
                    <button
                      onClick={() => setSelectedSession(null)}
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
                        <TableHead>Started</TableHead>
                        <TableHead>Ended</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Work Time</TableHead>
                        <TableHead>Break Time</TableHead>
                        <TableHead>Idle Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentSessions.map((session: Session) => {
                        const duration = session.endedAt 
                          ? new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()
                          : Date.now() - new Date(session.startedAt).getTime();
                        const isSelected = selectedSession?.id === session.id;
                        
                        return (
                          <TableRow 
                            key={session.id}
                            className={`cursor-pointer hover:bg-muted/50 ${isSelected ? 'bg-muted' : ''}`}
                            onClick={() => setSelectedSession(session)}
                          >
                            <TableCell className="text-sm">
                              {toLocaleStringTz(session.startedAt, timezone as 'IST' | 'EST')}
                            </TableCell>
                            <TableCell className="text-sm">
                              {session.endedAt ? toLocaleStringTz(session.endedAt, timezone as 'IST' | 'EST') : '-'}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {formatTime(duration)}
                            </TableCell>
                            <TableCell className="text-sm text-green-600">
                              {session.summary?.workTimeMs 
                                ? formatTime(session.summary.workTimeMs)
                                : (session.workTimeMs ? formatTime(session.workTimeMs) : '-')}
                            </TableCell>
                            <TableCell className="text-sm text-blue-600">
                              {session.summary?.totalBreakMs 
                                ? formatTime(session.summary.totalBreakMs)
                                : (session.breakTimeMs ? formatTime(session.breakTimeMs) : '-')}
                            </TableCell>
                            <TableCell className="text-sm text-yellow-600">
                              {session.summary?.totalIdleMs 
                                ? formatTime(session.summary.totalIdleMs)
                                : (session.idleTimeMs ? formatTime(session.idleTimeMs) : '-')}
                            </TableCell>
                            <TableCell>
                              {session.isActive ? (
                                <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                  Active
                                </span>
                              ) : (
                                <span className="text-gray-500 text-sm">Ended</span>
                              )}
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
