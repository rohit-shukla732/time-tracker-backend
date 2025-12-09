"use client";

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  YAxis,
  CartesianGrid,
  Cell,
  Rectangle,
  PieChart,
  Pie,
  Label,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';

export default function TeamPage() {
  const router = useRouter();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [memberDetails, setMemberDetails] = useState<any | null>(null);
  const [loadingMember, setLoadingMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      router.push('/manager/login');
      return;
    }
    try {
      const user = JSON.parse(storedUser);
      if (user.role !== 'MANAGER') {
        router.push('/manager/login');
        return;
      }
      setTeamId(user.teamId);
    } catch (e) {
      console.error('Failed to parse user:', e);
      router.push('/manager/login');
    }
  }, [router]);

  useEffect(() => {
    if (!teamId) return;
    fetchTeamStats();
    fetchTeamMembers();
  }, [teamId]);

  async function fetchTeamStats() {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/teams/${teamId}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      console.log('Team stats API response:', data);
      // API returns { success: true, stats: {...} }
      setStats(data.stats || data);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function fetchTeamMembers() {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/teams/${teamId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch members');
      const data = await res.json();
      setMembers(data.members || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMemberDetails(userId: string) {
    setLoadingMember(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/users/${userId}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch member details');
      const data = await res.json();
      console.log('Member details API response:', data);
      // API returns { success: true, stats: {...} }
      setMemberDetails(data.stats || data);
    } catch (err: any) {
      console.error('Error fetching member details:', err);
      setMemberDetails(null);
    } finally {
      setLoadingMember(false);
    }
  }

  function handleMemberClick(member: any) {
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
      <div>
        <h1 className="text-3xl font-bold">My Team</h1>
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
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(member.status)}`} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadge(member.status)}>
                      {member.status || 'Offline'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.avgWorkMs ? `${(member.avgWorkMs / (1000 * 60 * 60)).toFixed(1)}h` : '-'}
                  </TableCell>
                  <TableCell>
                    {member.avgBreakMs ? `${(member.avgBreakMs / (1000 * 60 * 60)).toFixed(1)}h` : '-'}
                  </TableCell>
                  <TableCell>
                    {member.avgIdleMs ? `${(member.avgIdleMs / (1000 * 60 * 60)).toFixed(1)}h` : '-'}
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
      />
    </div>
  );
}

function MemberDetailsDialog({
  member,
  details,
  loading,
  onClose
}: {
  member: any;
  details: any;
  loading: boolean;
  onClose: () => void;
}) {
  const [selectedSession, setSelectedSession] = React.useState<any | null>(null);
  
  const chartColors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))'
  ];

  const topApps = details?.topApps || [];
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
    
    return [
      { name: 'Work', value: workTime, fill: '#10b981' },
      { name: 'Break', value: breakTime, fill: '#3b82f6' },
      { name: 'Idle', value: idleTime, fill: '#f59e0b' },
    ];
  }, [selectedSession]);

  const totalSessionTime = React.useMemo(() => {
    const total = sessionData.reduce((acc, curr) => acc + curr.value, 0);
    console.log('Total session time:', total, 'sessionData:', sessionData);
    return total;
  }, [sessionData]);

  const sessionApps = selectedSession?.appUsage || [];

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
                      ? `${((details.aggregates.avgWorkMs || 0) / (1000 * 60 * 60)).toFixed(1)}h`
                      : '-'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground mb-1">Total Work (Month)</div>
                  <div className="text-lg font-bold">
                    {details?.aggregates?.totalWorkMs 
                      ? `${((details.aggregates.totalWorkMs || 0) / (1000 * 60 * 60)).toFixed(1)}h`
                      : '-'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground mb-1">Last Active</div>
                  <div className="text-sm font-medium">
                    {details?.aggregates?.lastActive 
                      ? new Date(details.aggregates.lastActive).toLocaleDateString()
                      : (member.lastActive ? new Date(member.lastActive).toLocaleDateString() : '-')}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Activity Chart / Session Donut */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {selectedSession ? 'Session Time Distribution' : 'Daily Activity (Last 7 Days)'}
                  </CardTitle>
                  <CardDescription>
                    {selectedSession 
                      ? `Session started: ${new Date(selectedSession.startedAt).toLocaleString()}`
                      : 'Work, break, and idle time distribution'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedSession ? (
                    sessionData.some(d => d.value > 0) ? (
                      <ChartContainer
                        config={{
                          value: { label: "Time" },
                          Work: { label: "Work", color: "#10b981" },
                          Break: { label: "Break", color: "#3b82f6" },
                          Idle: { label: "Idle", color: "#f59e0b" },
                        }}
                        className="mx-auto aspect-square max-h-[300px]"
                      >
                        <PieChart>
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                          />
                          <Pie
                            data={sessionData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            strokeWidth={5}
                          >
                            {sessionData.map((entry, index) => (
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
                                        className="fill-foreground text-2xl font-bold"
                                      >
                                        {(totalSessionTime / (1000 * 60 * 60)).toFixed(1)}h
                                      </tspan>
                                      <tspan
                                        x={viewBox.cx}
                                        y={(viewBox.cy || 0) + 24}
                                        className="fill-muted-foreground"
                                      >
                                        Total
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
                      <div className="mx-auto aspect-square max-h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                        No session data available
                      </div>
                    )
                  ) : dailyWork.length ? (
                    <ChartContainer 
                      config={{
                        workTimeMs: { label: 'Work', color: '#10b981' },
                        breakTimeMs: { label: 'Break', color: '#3b82f6' },
                        idleTimeMs: { label: 'Idle', color: '#f59e0b' },
                      }}
                      className="h-[300px]"
                    >
                      <BarChart accessibilityLayer data={dailyWork}>
                        <CartesianGrid vertical={false} />
                        <XAxis 
                          dataKey="day" 
                          tickLine={false}
                          tickMargin={10}
                          axisLine={false}
                        />
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar
                          dataKey="workTimeMs"
                          stackId="a"
                          fill="#10b981"
                          radius={[0, 0, 4, 4]}
                        />
                        <Bar
                          dataKey="breakTimeMs"
                          stackId="a"
                          fill="#3b82f6"
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar
                          dataKey="idleTimeMs"
                          stackId="a"
                          fill="#f59e0b"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                      No activity data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Apps Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {selectedSession ? 'Session Applications' : 'Top Applications (This Month)'}
                  </CardTitle>
                  <CardDescription>
                    {selectedSession ? 'Applications used in this session' : 'Most used applications by time'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(selectedSession ? sessionApps : topApps).length ? (
                    <ChartContainer
                      config={(selectedSession ? sessionApps : topApps).slice(0, 5).reduce((acc: any, app: any, idx: number) => {
                        const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
                        acc[app.name || app.appName] = { label: app.name || app.appName, color: colors[idx % 5] };
                        return acc;
                      }, { hours: { label: 'Hours' } })}
                      className="h-[300px]"
                    >
                      <BarChart accessibilityLayer data={(selectedSession ? sessionApps : topApps).slice(0, 5).map((app: any, idx: number) => {
                        const colors = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
                        return { 
                          name: app.name || app.appName,
                          hours: app.hours || ((app.timeMs || 0) / (1000 * 60 * 60)),
                          fill: colors[idx % 5] 
                        };
                      })}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          tickMargin={10}
                          axisLine={false}
                          tickFormatter={(value) => value.length > 10 ? value.slice(0, 10) + '...' : value}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent hideLabel />}
                        />
                        <Bar
                          dataKey="hours"
                          strokeWidth={2}
                          radius={8}
                          activeIndex={0}
                          activeBar={({ ...props }) => {
                            return (
                              <Rectangle
                                {...props}
                                fillOpacity={0.8}
                                stroke={props.payload.fill}
                                strokeDasharray={4}
                                strokeDashoffset={4}
                              />
                            );
                          }}
                        />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                      No app usage data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

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
                      {recentSessions.map((session: any) => {
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
                              {new Date(session.startedAt).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-sm">
                              {session.endedAt ? new Date(session.endedAt).toLocaleString() : '-'}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {(duration / (1000 * 60 * 60)).toFixed(1)}h
                            </TableCell>
                            <TableCell className="text-sm text-green-600">
                              {session.summary?.workTimeMs 
                                ? `${(session.summary.workTimeMs / (1000 * 60 * 60)).toFixed(1)}h` 
                                : (session.workTimeMs ? `${(session.workTimeMs / (1000 * 60 * 60)).toFixed(1)}h` : '-')}
                            </TableCell>
                            <TableCell className="text-sm text-blue-600">
                              {session.summary?.totalBreakMs 
                                ? `${(session.summary.totalBreakMs / (1000 * 60 * 60)).toFixed(1)}h` 
                                : (session.breakTimeMs ? `${(session.breakTimeMs / (1000 * 60 * 60)).toFixed(1)}h` : '-')}
                            </TableCell>
                            <TableCell className="text-sm text-yellow-600">
                              {session.summary?.totalIdleMs 
                                ? `${(session.summary.totalIdleMs / (1000 * 60 * 60)).toFixed(1)}h` 
                                : (session.idleTimeMs ? `${(session.idleTimeMs / (1000 * 60 * 60)).toFixed(1)}h` : '-')}
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
