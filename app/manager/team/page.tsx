"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer as RechartsResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

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
      if (!user?.teamId) {
        setError('You are not assigned to a team');
        setLoading(false);
        return;
      }
      setTeamId(user.teamId);
    } catch (e) {
      router.push('/manager/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    if (!teamId) return;
    let mounted = true;
    const token = localStorage.getItem('accessToken');
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/teams/${teamId}/stats`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          router.push('/manager/login');
          return;
        }
        const data = await res.json();
        if (!data.success) {
          setError(data.error || 'Failed to load team stats');
        } else {
          if (mounted) setStats(data.stats);
        }
      } catch (err) {
        setError('Failed to connect to server');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const fetchMembers = async () => {
      try {
        const res = await fetch(`/api/teams/${teamId}/members`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          router.push('/manager/login');
          return;
        }
        const data = await res.json();
        if (data.success) {
          if (mounted) setMembers(data.members || []);
        }
      } catch (e) {
        // ignore for now
      }
    };

    fetchStats();
    fetchMembers();
    return () => { mounted = false; };
  }, [teamId, router]);

  const formatHours = (ms: number | null | undefined) => {
    if (!ms || ms <= 0) return '-';
    return `${(ms / (1000 * 60 * 60)).toFixed(1)}h`;
  };

  const openMemberDialog = async (m: any) => {
    setSelectedMember(m);
    setMemberDetails(null);
    setLoadingMember(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/users/${m.id}/stats`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!res.ok) {
        setMemberDetails({ error: 'Failed to load member details' });
        setLoadingMember(false);
        return;
      }
      const data = await res.json();
      if (data.success) setMemberDetails(data.stats);
      else setMemberDetails({ error: data.error || 'Failed to load' });
    } catch (e) {
      setMemberDetails({ error: 'Failed to connect' });
    } finally {
      setLoadingMember(false);
    }
  };

  return (
    <div className="space-y-6">

      <Card>
        <CardHeader>
          <CardTitle>{stats?.team?.name || 'Team'}</CardTitle>
          <CardDescription>{stats ? `${stats.users?.total || 0} members` : 'Team overview'}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading…</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Members</h2>
                {members.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No member details available yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead>Avg Work</TableHead>
                        <TableHead>Avg Break</TableHead>
                        <TableHead>Avg Idle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((m) => (
                        <TableRow key={m.id} className="hover:cursor-pointer" onClick={() => openMemberDialog(m)}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8"><AvatarFallback>{(m.name || m.email || '?')[0].toUpperCase()}</AvatarFallback></Avatar>
                              <div>
                                <div className="font-medium">{m.name || 'Unknown'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{m.email}</TableCell>
                          <TableCell>{m.status || 'Offline'}</TableCell>
                          <TableCell>{m.lastActive ? new Date(m.lastActive).toLocaleString() : '-'}</TableCell>
                          <TableCell>{formatHours(m.avgWorkMs)}</TableCell>
                          <TableCell>{formatHours(m.avgBreakMs)}</TableCell>
                          <TableCell>{formatHours(m.avgIdleMs)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Member details dialog (renders when a member is selected) */}
      <MemberDetailsDialog member={selectedMember} details={memberDetails} loading={loadingMember} onClose={() => setSelectedMember(null)} />
    </div>
  );
}

function MemberDetailsDialog({ member, details, loading, onClose }: { member: any, details: any, loading: boolean, onClose: () => void }) {
  if (!member) return null;

  // radar chart removed - using stacked bar chart below
  
  const pieColors = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)'
  ];
  const topApps = details?.topApps || [];
  const totalAppHours = topApps.reduce((s: number, a: any) => s + (a?.hours || 0), 0);
  const maxAppHours = Math.max(1, ...(topApps.map((a: any) => a?.hours || 0)));
  const dailyWork = details?.charts?.dailyWorkData || [];
  return (
    <Dialog open={!!member} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl overflow-auto" style={{ width: '80vw', maxWidth: '80vw', height: '85vh', maxHeight: '85vh' }}>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h2 className="font-semibold text-xl">Overview</h2>
            <div className="mt-2 text-sm text-muted-foreground">
            <div>Name: <span className="font-medium"> {member.name || member.email}</span></div>
          <div>Email: <span className="font-medium">{member.email}</span></div>
              <div>Status: <span className="font-medium">{details?.status || member.status || 'Offline'}</span></div>
              <div>Last Active: <span className="font-medium">{details?.aggregates?.lastActive ? new Date(details.aggregates.lastActive).toLocaleString() : (member.lastActive ? new Date(member.lastActive).toLocaleString() : '-')}</span></div>
              <div className="mt-2">Avg Work (month): <span className="font-medium">{details?.aggregates ? `${((details.aggregates.avgWorkMs || 0)/(1000*60*60)).toFixed(1)}h` : '-'}</span></div>
            </div>
            <Separator className="my-4" />
            <h3 className="font-semibold">Top Apps (month)</h3>
            {/* <div className="mt-2">
              {loading ? (
                <div>Loading…</div>
              ) : topApps.length ? (
                <div className="mt-2 flex gap-4 items-start">
                  {totalAppHours > 0 ? (
                    <div style={{ width: 140, height: 140 }}>
                      <RechartsResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={topApps.slice(0, 5)}
                            dataKey="hours"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={56}
                            innerRadius={28}
                            paddingAngle={2}
                            label={() => null}
                          >
                            {topApps.slice(0, 5).map((entry: any, idx: number) => (
                              <Cell key={entry.name} fill={pieColors[idx % pieColors.length]} />
                            ))}
                          </Pie>
                          <Legend verticalAlign="bottom" height={24} />
                        </PieChart>
                      </RechartsResponsiveContainer>
                    </div>
                  ) : (
                    <div style={{ width: 220, height: Math.max(80, topApps.length * 28) }}>
                      <RechartsResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={topApps.slice(0, 5)} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                          <XAxis type="number" domain={[0, maxAppHours]} hide />
                          <YAxis dataKey="name" type="category" width={100} />
                          <RechartsTooltip />
                          <Bar dataKey="hours" fill="var(--chart-1)">
                            {topApps.slice(0, 5).map((entry: any, idx: number) => (
                              <Cell key={entry.name} fill={pieColors[idx % pieColors.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </RechartsResponsiveContainer>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No app usage yet.</div>
              )}
            </div> */}
          </div>

          <div>
            <h3 className="font-semibold">Activity</h3>
            <div style={{ width: '100%', height: 220 }}>
              {loading ? (
                <div className="p-6">Loading…</div>
              ) : dailyWork.length ? (
                (() => {
                  const activityChartConfig = {
                    workTimeMs: { label: 'Work', color: 'var(--chart-1)' },
                    breakTimeMs: { label: 'Break', color: 'var(--chart-2)' },
                    idleTimeMs: { label: 'Idle', color: 'var(--chart-3)' },
                  };

                  return (
                    <ChartContainer config={activityChartConfig}>
                      <RechartsResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyWork} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="day" />
                          <YAxis tickFormatter={(v: number) => (v / (1000 * 60 * 60)).toFixed(0)} />
                          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar dataKey="workTimeMs" stackId="a" fill="var(--color-workTimeMs)" />
                          <Bar dataKey="breakTimeMs" stackId="a" fill="var(--color-breakTimeMs)" />
                          <Bar dataKey="idleTimeMs" stackId="a" fill="var(--color-idleTimeMs)" />
                        </BarChart>
                      </RechartsResponsiveContainer>
                    </ChartContainer>
                  );
                })()
              ) : (
                <div className="p-4 text-sm text-muted-foreground">No aggregates available.</div>
              )}

            </div>

            {/* radar chart removed - replaced by stacked work/break/idle bar chart above */}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

export { MemberDetailsDialog };
