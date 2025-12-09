"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, Coffee, Users } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  LabelList,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface StatsResponse {
  error: string;
  success: boolean;
  stats: any;
}

export default function ManagerDashboard() {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (token?: string | null) => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Prefer team-scoped stats for managers
      let url = '/api/admin/stats';
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed?.role === 'MANAGER' && parsed?.teamId) {
            url = `/api/teams/${parsed.teamId}/stats`;
          }
        }
      } catch (e) {}

      const res = await fetch(url, { headers });
      if (res.status === 401 || res.status === 403) {
        setError('Unauthorized. Please login.');
        setLoading(false);
        return;
      }

      const data: StatsResponse = await res.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error || 'Failed to retrieve stats');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetchStats(token);

    const interval = setInterval(() => {
      const t = localStorage.getItem('accessToken');
      fetchStats(t);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="p-6">Loading manager dashboard…</div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">{error}</div>
    );
  }

  const isTeamScoped = !!stats?.team;

  const total = isTeamScoped ? (stats?.users?.total || 0) : 0;
  const working = isTeamScoped ? (stats?.realtime?.working || 0) : 0;
  const idle = isTeamScoped ? (stats?.realtime?.idle || 0) : 0;
  const onBreak = isTeamScoped ? (stats?.realtime?.break || 0) : 0;
  const dailyWorkData = stats?.charts?.dailyWorkData || [];
  const topUsers = stats?.topUsers || [];
  const realtimeTotal = stats?.realtime?.total || 0;
  const offline = Math.max(0, (total || 0) - realtimeTotal);

  const donutData = [
    { name: 'Active', value: working, color: '#16a34a' },
    { name: 'Idle', value: idle, color: '#f59e0b' },
    { name: 'Break', value: onBreak, color: '#3b82f6' },
    { name: 'Offline', value: offline, color: '#9ca3af' },
  ];

  const sessions = stats?.charts?.dailySessions || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manager Dashboard</h2>
          <p className="text-muted-foreground">Team overview and recent activity</p>
        </div>
        <Badge variant="outline">Manager View</Badge>
      </div>

      {/* Additional Charts: Work breakdown and Top users */}
      <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> Work / Break / Idle (7 days)
              </CardTitle>
              <CardDescription>Daily breakdown of work, break and idle time</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyWorkData} margin={{ top: 10, right: 12, left: 4, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" />
                    <RechartsTooltip formatter={(value: number) => `${(value / (1000*60*60)).toFixed(1)}h`} />
                    <Legend />
                    <Area type="monotone" dataKey="workTimeMs" stackId="a" stroke="#16a34a" fill="#bbf7d0" />
                    <Area type="monotone" dataKey="breakTimeMs" stackId="a" stroke="#f59e0b" fill="#fef3c7" />
                    <Area type="monotone" dataKey="idleTimeMs" stackId="a" stroke="#facc15" fill="#fff7c2" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Top Contributors
              </CardTitle>
              <CardDescription>Top team members by work time (this month)</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topUsers.map((u: any) => ({ name: u.user?.name || u.userId, hours: (u.workTimeMs || 0) / (1000*60*60) }))} layout="vertical" margin={{ left: 16 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={140} />
                    <RechartsTooltip formatter={(value: number) => `${Number(value).toFixed(1)}h`} />
                    <Bar dataKey="hours" fill="#3b82f6" radius={[4,0,0,4]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Team Status
              </CardTitle>
              <CardDescription>Total team members and status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {isTeamScoped ? (
                <>
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width={250} height={250}>
                      <PieChart>
                        <RechartsTooltip />
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={68}
                          outerRadius={90}
                          paddingAngle={4}
                          strokeWidth={0}
                        >
                          {donutData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
                    {donutData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                        <span className="font-medium">{d.name}:</span>
                        <span>{d.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-center mt-3 text-sm text-muted-foreground">Total: <span className="font-semibold">{total}</span></div>
                </>
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Team data not selected. This card shows team-specific status — switch to a team view to see team metrics.
                </div>
              )}
            </CardContent>
            <CardFooter />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" /> Session Activity (7 days)
              </CardTitle>
              <CardDescription>Sessions over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sessions} margin={{ top: 20, right: 12, left: 4, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="sessions" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }}>
                      <LabelList dataKey="sessions" position="top" />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
