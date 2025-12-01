'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  AlertCircle, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Zap,
  User,
  Calendar,
  Timer,
  Coffee,
  Moon,
  Monitor,
  ArrowRight,
  Activity
} from 'lucide-react';

interface Session {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  startedAt: string;
  endedAt: string | null;
  isActive: boolean;
  autoClockOut: boolean;
  autoReason: string | null;
  summary: {
    sessionDurationMs: number;
    workTimeMs: number;
    totalBreakMs: number;
    totalIdleMs: number;
  } | null;
  eventCount: number;
  appSwitchCount: number;
}

interface SessionDetail {
  id: string;
  sessionId: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    teamName: string | null;
  } | null;
  startedAt: string;
  endedAt: string | null;
  isActive: boolean;
  autoClockOut: boolean;
  autoReason: string | null;
  summary: {
    sessionDurationMs: number;
    workTimeMs: number;
    totalBreakMs: number;
    totalIdleMs: number;
  } | null;
  appUsage: Array<{
    id: string;
    appName: string;
    timeMs: number;
  }>;
  events: Array<{
    id: string;
    type: string;
    reason: string | null;
    durationMs: number | null;
    timestamp: string;
  }>;
  appSwitches: Array<{
    id: string;
    fromApp: string | null;
    toApp: string | null;
    durationMs: number | null;
    timestamp: string;
  }>;
  counts: {
    events: number;
    appSwitches: number;
  };
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
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

function formatTimeOnly(dateString: string): string {
  return new Date(dateString).toLocaleTimeString();
}

export default function AdminSessions() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Detail view state
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchSessions = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const response = await fetch(`/api/admin/sessions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        router.push('/admin/login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions);
        setPagination(data.pagination);
      } else {
        setError(data.error || 'Failed to fetch sessions');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [router, currentPage, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const fetchSessionDetail = async (sessionId: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    setDetailLoading(true);
    setSheetOpen(true);

    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setSelectedSession(data.session);
      }
    } catch (err) {
      console.error('Failed to fetch session details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSessions();
  };

  const handleRowClick = (session: Session) => {
    fetchSessionDetail(session.id);
  };

  const getEventTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'break':
        return <Coffee className="h-4 w-4 text-yellow-500" />;
      case 'idle':
        return <Moon className="h-4 w-4 text-gray-500" />;
      case 'active':
        return <Activity className="h-4 w-4 text-green-500" />;
      default:
        return <Zap className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
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
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sessions</h2>
          <p className="text-muted-foreground">
            View and manage work sessions. Click on a row to see details.
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
            <form onSubmit={handleFilter} className="flex gap-4 flex-wrap items-end">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button type="submit">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Sessions</CardTitle>
            <CardDescription>
              {pagination?.totalCount || 0} sessions total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Ended</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Work Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow 
                    key={session.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(session)}
                  >
                    <TableCell>
                      <div className="font-medium">{session.userName || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">{session.userId}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTime(session.startedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {session.endedAt ? formatTime(session.endedAt) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {session.summary ? formatDuration(session.summary.sessionDurationMs) : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {session.summary ? formatDuration(session.summary.workTimeMs) : '-'}
                    </TableCell>
                    <TableCell>
                      {session.isActive ? (
                        <Badge>Active</Badge>
                      ) : session.autoClockOut ? (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600" title={session.autoReason || ''}>
                          Auto Clock Out
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Completed</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Zap className="h-3 w-3 text-muted-foreground" />
                        <span>{session.eventCount} events</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {session.appSwitchCount} app switches
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No sessions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                    disabled={currentPage === pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Session Details
            </SheetTitle>
            <SheetDescription>
              {selectedSession?.sessionId}
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : selectedSession ? (
            <div className="mt-6 space-y-6">
              {/* User Info */}
              <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                <div className="bg-primary/10 p-2 rounded-full">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{selectedSession.user?.name || 'Unknown User'}</h4>
                  <p className="text-sm text-muted-foreground">{selectedSession.user?.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{selectedSession.user?.role}</Badge>
                    {selectedSession.user?.teamName && (
                      <Badge variant="secondary">{selectedSession.user?.teamName}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Session Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    Started
                  </div>
                  <p className="font-medium">{formatTime(selectedSession.startedAt)}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    Ended
                  </div>
                  <p className="font-medium">
                    {selectedSession.endedAt ? formatTime(selectedSession.endedAt) : 'Still Active'}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {selectedSession.isActive ? (
                  <Badge className="bg-green-500">Active</Badge>
                ) : selectedSession.autoClockOut ? (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    Auto Clock Out: {selectedSession.autoReason}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Completed</Badge>
                )}
              </div>

              {/* Time Summary */}
              {selectedSession.summary && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      Time Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3 text-green-500" />
                          Work Time
                        </span>
                        <span className="font-medium">{formatDuration(selectedSession.summary.workTimeMs)}</span>
                      </div>
                      <Progress 
                        value={(selectedSession.summary.workTimeMs / selectedSession.summary.sessionDurationMs) * 100} 
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-1">
                          <Coffee className="h-3 w-3 text-yellow-500" />
                          Break Time
                        </span>
                        <span className="font-medium">{formatDuration(selectedSession.summary.totalBreakMs)}</span>
                      </div>
                      <Progress 
                        value={(selectedSession.summary.totalBreakMs / selectedSession.summary.sessionDurationMs) * 100} 
                        className="h-2 [&>div]:bg-yellow-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-1">
                          <Moon className="h-3 w-3 text-gray-500" />
                          Idle Time
                        </span>
                        <span className="font-medium">{formatDuration(selectedSession.summary.totalIdleMs)}</span>
                      </div>
                      <Progress 
                        value={(selectedSession.summary.totalIdleMs / selectedSession.summary.sessionDurationMs) * 100} 
                        className="h-2 [&>div]:bg-gray-400"
                      />
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total Duration</span>
                      <span>{formatDuration(selectedSession.summary.sessionDurationMs)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabs for Events and App Usage */}
              <Tabs defaultValue="apps" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="apps">
                    <Monitor className="h-4 w-4 mr-1" />
                    Apps
                  </TabsTrigger>
                  <TabsTrigger value="events">
                    <Zap className="h-4 w-4 mr-1" />
                    Events
                  </TabsTrigger>
                  <TabsTrigger value="switches">
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Switches
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="apps" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Top Applications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        {selectedSession.appUsage.length > 0 ? (
                          <div className="space-y-3">
                            {selectedSession.appUsage.map((app) => {
                              const maxTime = selectedSession.appUsage[0]?.timeMs || 1;
                              return (
                                <div key={app.id} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="truncate flex-1 mr-2">{app.appName}</span>
                                    <span className="text-muted-foreground font-mono">
                                      {formatDuration(app.timeMs)}
                                    </span>
                                  </div>
                                  <Progress 
                                    value={(app.timeMs / maxTime) * 100} 
                                    className="h-1.5"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No app usage data
                          </p>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="events" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Recent Events ({selectedSession.counts.events} total)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        {selectedSession.events.length > 0 ? (
                          <div className="space-y-2">
                            {selectedSession.events.map((event) => (
                              <div 
                                key={event.id} 
                                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted"
                              >
                                {getEventTypeIcon(event.type)}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm capitalize">{event.type}</span>
                                    {event.durationMs && (
                                      <span className="text-xs text-muted-foreground">
                                        ({formatDuration(event.durationMs)})
                                      </span>
                                    )}
                                  </div>
                                  {event.reason && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {event.reason}
                                    </p>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatTimeOnly(event.timestamp)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No events recorded
                          </p>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="switches" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        App Switches ({selectedSession.counts.appSwitches} total)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        {selectedSession.appSwitches.length > 0 ? (
                          <div className="space-y-2">
                            {selectedSession.appSwitches.map((sw) => (
                              <div 
                                key={sw.id} 
                                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-sm"
                              >
                                <span className="truncate flex-1 max-w-[120px]" title={sw.fromApp || undefined}>
                                  {sw.fromApp || 'Unknown'}
                                </span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="truncate flex-1 max-w-[120px]" title={sw.toApp || undefined}>
                                  {sw.toApp || 'Unknown'}
                                </span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatTimeOnly(sw.timestamp)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No app switches recorded
                          </p>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
