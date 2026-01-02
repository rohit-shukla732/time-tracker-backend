'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { makeAuthenticatedRequest, setupAutoRefresh } from '@/lib/adminAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  AlertCircle, 
  Radio, 
  Play, 
  Square, 
  Coffee, 
  Moon, 
  ArrowRightLeft,
  FileText,
  Clock
} from 'lucide-react';

interface ActiveUser {
  userId: string;
  userName: string;
  userEmail: string;
  sessionId: string;
  startedAt: string;
}

interface Activity {
  type: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  details: Record<string, any>;
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return formatTime(dateString);
}

function getActivityIcon(type: string) {
  if (type.includes('session_start')) return <Play className="h-4 w-4 text-green-500" />;
  if (type.includes('session_end')) return <Square className="h-4 w-4 text-red-500" />;
  if (type.includes('break')) return <Coffee className="h-4 w-4 text-orange-500" />;
  if (type.includes('idle')) return <Moon className="h-4 w-4 text-blue-500" />;
  if (type.includes('app_switch')) return <ArrowRightLeft className="h-4 w-4 text-purple-500" />;
  return <FileText className="h-4 w-4 text-gray-500" />;
}

function getActivityLabel(type: string): string {
  const labels: Record<string, string> = {
    'session_start': 'Session Started',
    'session_end': 'Session Ended',
    'event_break_start': 'Break Started',
    'event_break_end': 'Break Ended',
    'event_idle_start': 'Idle Started',
    'event_idle_end': 'Idle Ended',
    'app_switch': 'App Switch',
  };
  return labels[type] || type;
}

export default function AdminActivity() {
  const router = useRouter();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityType, setActivityType] = useState('all');

  const fetchActivity = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/time-tracker/admin/login');
      return;
    }

    try {
      const params = new URLSearchParams({
        limit: '50',
        type: activityType,
      });

      const response = await makeAuthenticatedRequest(`/api/admin/activity?${params}`);

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        router.push('/time-tracker/admin/login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setActiveUsers(data.activeUsers);
        setActivities(data.activities);
      } else {
        setError(data.error || 'Failed to fetch activity');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [router, activityType]);

  useEffect(() => {
    fetchActivity();

    // Setup automatic token refresh for admin
    const cleanupTokenRefresh = setupAutoRefresh();

    // Auto-refresh every 10 seconds
    const activityInterval = setInterval(fetchActivity, 10000);
    
    return () => {
      cleanupTokenRefresh();
      clearInterval(activityInterval);
    };
  }, [fetchActivity]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px] lg:col-span-2" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout loginPath="/time-tracker/admin/login" basePath="/time-tracker/admin">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Live Activity</h2>
            <p className="text-muted-foreground">
              Real-time monitoring of user activity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm text-muted-foreground">Auto-refreshing</span>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Users Panel */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-green-500" />
                  Active Users
                </CardTitle>
                <Badge variant="default">{activeUsers.length} online</Badge>
              </div>
              <CardDescription>Currently working employees</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 max-h-[500px] overflow-y-auto">
              <div className="space-y-4">
                {activeUsers.map((user) => (
                  <div key={user.sessionId} className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-green-100 text-green-600">
                        {user.userName?.charAt(0) || user.userId.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.userName || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.userId}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Since {formatRelativeTime(user.startedAt)}
                      </div>
                    </div>
                  </div>
                ))}
                {activeUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No users currently active
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Activity Feed</CardTitle>
                  <CardDescription>Last 24 hours of activity</CardDescription>
                </div>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Activities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="sessions">Sessions Only</SelectItem>
                    <SelectItem value="events">Events Only</SelectItem>
                    <SelectItem value="app-switch">App Switches</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 max-h-[500px] overflow-y-auto">
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="mt-1 p-2 rounded-full bg-muted">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {getActivityLabel(activity.type)}
                        </p>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {activity.userName || activity.userId}
                      </p>
                      {activity.details && Object.keys(activity.details).length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground/80">
                          {activity.details.fromApp && activity.details.toApp && (
                            <span className="flex items-center gap-1">
                              <ArrowRightLeft className="h-3 w-3" />
                              {activity.details.fromApp} → {activity.details.toApp}
                            </span>
                          )}
                          {activity.details.reason && (
                            <span>Reason: {activity.details.reason}</span>
                          )}
                          {activity.details.autoClockOut && (
                            <Badge variant="outline" className="text-yellow-600 text-xs">
                              Auto: {activity.details.autoReason}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
