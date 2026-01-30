'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { makeAuthenticatedRequest, setupAutoRefresh } from '@/lib/adminAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Calendar,
  Coffee,
  Moon,
  Monitor,
  Globe,
} from 'lucide-react';

interface UserDaySession {
  userId: string;
  userName: string;
  userEmail: string;
  date: string;
  totalSessions: number;
  totalWorkTimeMs: number;
  totalBreakTimeMs: number;
  totalIdleMs: number;
  totalDurationMs: number;
  timeline: TimelineEvent[];
}

interface TimelineEvent {
  id: string;
  type: 'session_start' | 'session_end' | 'break_start' | 'break_end' | 'idle_start' | 'idle_end' | 'app_usage' | 'website_visit' | 'task_work';
  timestamp: string;
  sessionId?: string;
  data?: any;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${Math.floor(ms / 1000)}s`;
}

export default function AdminSessions() {
  const router = useRouter();
  const [userSessions, setUserSessions] = useState<UserDaySession[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserDaySession | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchUserSessions = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/time-tracker/admin/login');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        date: dateFilter,
      });

      const response = await makeAuthenticatedRequest(`/api/admin/user-sessions?${params}`);

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        router.push('/time-tracker/admin/login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setUserSessions(data.userSessions);
        setPagination(data.pagination);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch user sessions');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [router, currentPage, dateFilter]);

  useEffect(() => {
    fetchUserSessions();
    const cleanupTokenRefresh = setupAutoRefresh();
    return () => cleanupTokenRefresh();
  }, [fetchUserSessions]);

  const handleRowClick = (userSession: UserDaySession) => {
    setSelectedUser(userSession);
    setDialogOpen(true);
  };

  // Extract app and website data from timeline
  const getAppUsageData = (timeline: TimelineEvent[]) => {
    const appEvent = timeline.find(e => e.type === 'app_usage');
    return appEvent?.data?.apps || [];
  };

  const getWebsiteData = (timeline: TimelineEvent[]) => {
    const webEvent = timeline.find(e => e.type === 'website_visit');
    return webEvent?.data?.websites || [];
  };

  if (loading && userSessions.length === 0) {
    return (
      <AdminLayout loginPath="/time-tracker/admin/login" basePath="/time-tracker/admin">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout loginPath="/time-tracker/admin/login" basePath="/time-tracker/admin">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Activity</h2>
          <p className="text-muted-foreground">
            View daily activity for each user. Click on a row to see detailed breakdown.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap items-end">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-48"
                />
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Showing activity for {new Date(dateFilter).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Daily Activity</CardTitle>
            <CardDescription>
              {pagination?.totalCount || 0} users with activity on this date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-center">Sessions</TableHead>
                  <TableHead className="text-center">Work Time</TableHead>
                  <TableHead className="text-center">Break Time</TableHead>
                  <TableHead className="text-center">Idle Time</TableHead>
                  <TableHead className="text-center">Total Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userSessions.map((userSession) => (
                  <TableRow 
                    key={userSession.userId}
                    onClick={() => handleRowClick(userSession)}
                    className="cursor-pointer hover:bg-accent"
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{userSession.userName}</div>
                        <div className="text-sm text-muted-foreground">{userSession.userEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{userSession.totalSessions}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium">
                      {formatDuration(userSession.totalWorkTimeMs)}
                    </TableCell>
                    <TableCell className="text-center text-blue-600 font-medium">
                      {formatDuration(userSession.totalBreakTimeMs)}
                    </TableCell>
                    <TableCell className="text-center text-yellow-600 font-medium">
                      {formatDuration(userSession.totalIdleMs)}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {formatDuration(userSession.totalDurationMs)}
                    </TableCell>
                  </TableRow>
                ))}
                
                {userSessions.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No user activity found for this date
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="min-w-[80%] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedUser?.userName} - Activity Details</DialogTitle>
              <DialogDescription>
                {selectedUser?.userEmail} • {selectedUser && new Date(selectedUser.date).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        Total Sessions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedUser.totalSessions}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4 text-green-600" />
                        Work Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatDuration(selectedUser.totalWorkTimeMs)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Coffee className="h-4 w-4 text-blue-600" />
                        Break Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatDuration(selectedUser.totalBreakTimeMs)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Moon className="h-4 w-4 text-yellow-600" />
                        Idle Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">
                        {formatDuration(selectedUser.totalIdleMs)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Session Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-indigo-600" />
                    Session Timeline
                  </h3>
                  {(() => {
                    const sessionStarts = selectedUser.timeline.filter(e => e.type === 'session_start');
                    const sessionEnds = selectedUser.timeline.filter(e => e.type === 'session_end');
                    const sessionMap = new Map();
                    
                    sessionStarts.forEach(start => {
                      const sessionId = start.sessionId || start.id;
                      sessionMap.set(sessionId, { start: start.timestamp, end: null, id: sessionId });
                    });
                    
                    sessionEnds.forEach(end => {
                      const sessionId = end.sessionId || end.id;
                      const session = sessionMap.get(sessionId);
                      if (session) {
                        session.end = end.timestamp;
                      }
                    });
                    
                    const sessions = Array.from(sessionMap.values());
                    
                    return sessions.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Session #</TableHead>
                              <TableHead>Start Time</TableHead>
                              <TableHead>End Time</TableHead>
                              <TableHead>Duration</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sessions.map((session, index) => {
                              const startTime = new Date(session.start);
                              const endTime = session.end ? new Date(session.end) : null;
                              const duration = endTime ? endTime.getTime() - startTime.getTime() : Date.now() - startTime.getTime();
                              const isActive = !session.end;
                              
                              return (
                                <TableRow key={session.id}>
                                  <TableCell className="font-medium">Session {index + 1}</TableCell>
                                  <TableCell>
                                    {startTime.toLocaleTimeString('en-US', { 
                                      hour: '2-digit', 
                                      minute: '2-digit', 
                                      second: '2-digit',
                                      hour12: true 
                                    })}
                                  </TableCell>
                                  <TableCell>
                                    {endTime ? endTime.toLocaleTimeString('en-US', { 
                                      hour: '2-digit', 
                                      minute: '2-digit', 
                                      second: '2-digit',
                                      hour12: true 
                                    }) : (
                                      <span className="text-muted-foreground italic">Active</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{formatDuration(duration)}</TableCell>
                                  <TableCell>
                                    {isActive ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Active
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        Ended
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg">
                        No session timeline data available
                      </div>
                    );
                  })()}
                </div>

                {/* App Usage */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-purple-600" />
                    Application Usage
                  </h3>
                  {getAppUsageData(selectedUser.timeline).length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Application Name</TableHead>
                            <TableHead className="text-right">Time Spent</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getAppUsageData(selectedUser.timeline).map((app: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{app.name}</TableCell>
                              <TableCell className="text-right">{formatDuration(app.timeMs)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      No application usage data available
                    </div>
                  )}
                </div>

                {/* Website Visits */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-cyan-600" />
                    Website Visits
                  </h3>
                  {getWebsiteData(selectedUser.timeline).length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Website</TableHead>
                            <TableHead>Browser</TableHead>
                            <TableHead className="text-right">Time Spent</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getWebsiteData(selectedUser.timeline).map((site: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{site.url}</TableCell>
                              <TableCell className="text-muted-foreground">{site.browser}</TableCell>
                              <TableCell className="text-right">{formatDuration(site.timeMs)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      No website visit data available
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
