'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { makeAuthenticatedRequest, setupAutoRefresh } from '@/lib/adminAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { 
  AlertCircle, 
  Search, 
  Power, 
  PowerOff, 
  Play, 
  Square,
  Monitor,
  RefreshCw,
  Shield,
  Clock
} from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  teamName: string | null;
  todayActivity?: {
    isActive: boolean;
  };
}

interface DeviceControl {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  forceStop: boolean;
  forceStart: boolean;
  reason: string | null;
  stoppedBy: string | null;
  stoppedAt: string | null;
  startedBy: string | null;
  startedAt: string | null;
  updatedAt: string;
}

interface HeartbeatClient {
  clientId: string;
  userId?: string;
  alive: boolean;
  lastSeen: string;
  secondsAgo: number;
  name: string | null;
}

export default function AdminDeviceControl() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [deviceControls, setDeviceControls] = useState<DeviceControl[]>([]);
  const [heartbeatClients, setHeartbeatClients] = useState<HeartbeatClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Filter state
  const [onlineFilter, setOnlineFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [controlFilter, setControlFilter] = useState<'all' | 'running' | 'stopped'>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Dialog state
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'stop' | 'resume' | 'start'>('stop');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/time-tracker/admin/login');
      return;
    }

    try {
      // Fetch users, device controls, and heartbeat data in parallel
      const [usersRes, controlsRes, heartbeatRes] = await Promise.all([
        makeAuthenticatedRequest('/api/admin/users?limit=100'),
        makeAuthenticatedRequest('/api/admin/device-control'),
        makeAuthenticatedRequest('/api/heartbeat'),
      ]);

      if (usersRes.status === 401 || controlsRes.status === 401) {
        localStorage.removeItem('accessToken');
        router.push('/time-tracker/admin/login');
        return;
      }

      const usersData = await usersRes.json();
      const controlsData = await controlsRes.json();
      const heartbeatData = await heartbeatRes.json();

      if (usersData.success) {
        setUsers(usersData.users);
      }
      if (controlsData.success) {
        setDeviceControls(controlsData.devices || []);
      }
      if (heartbeatData.clients) {
        setHeartbeatClients(heartbeatData.clients);
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();

    // Setup automatic token refresh for admin
    const cleanupTokenRefresh = setupAutoRefresh();

    return () => cleanupTokenRefresh();
  }, [fetchData]);

  const getDeviceStatus = (userId: string): DeviceControl | undefined => {
    return deviceControls.find(dc => dc.userId === userId);
  };

  const isUserOnline = (userId: string): boolean => {
    // Check if user has an active heartbeat by matching userId
    const heartbeat = heartbeatClients.find(hb => hb.userId === userId && hb.alive);
    return !!heartbeat;
  };

  const getOnlineCount = (): number => {
    // Count unique users who are online (by userId)
    const onlineUserIds = new Set(
      heartbeatClients
        .filter(hb => hb.alive && hb.userId)
        .map(hb => hb.userId)
    );
    return onlineUserIds.size;
  };

  const openActionDialog = (user: User, action: 'stop' | 'resume' | 'start') => {
    setSelectedUser(user);
    setActionType(action);
    setReason('');
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedUser) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/device-control', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          action: actionType,
          reason: reason || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setActionDialogOpen(false);
        fetchData(); // Refresh the data
      } else {
        alert(data.error || `Failed to ${actionType} device`);
      }
    } catch (err) {
      alert(`Failed to ${actionType} device`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch = (
        user.name?.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.id.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }
    
    // Online status filter
    if (onlineFilter !== 'all') {
      const online = isUserOnline(user.id);
      if (onlineFilter === 'online' && !online) return false;
      if (onlineFilter === 'offline' && online) return false;
    }
    
    // Control status filter
    if (controlFilter !== 'all') {
      const deviceStatus = getDeviceStatus(user.id);
      const isStopped = deviceStatus?.forceStop || false;
      if (controlFilter === 'stopped' && !isStopped) return false;
      if (controlFilter === 'running' && isStopped) return false;
    }
    
    return true;
  });
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, onlineFilter, controlFilter]);

  const stoppedDevices = deviceControls.filter(dc => dc.forceStop);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
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
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Device Control
          </h2>
          <p className="text-muted-foreground">
            Remotely control employee time tracker applications
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                Registered employees
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online Now</CardTitle>
              <Power className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {getOnlineCount()}
              </div>
              <p className="text-xs text-muted-foreground">
                Sending heartbeats
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Force Stopped</CardTitle>
              <PowerOff className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stoppedDevices.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Manually stopped by admin
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Force Stopped Devices Alert */}
        {stoppedDevices.length > 0 && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <PowerOff className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <strong>{stoppedDevices.length} device(s)</strong> currently force-stopped:
              <ul className="mt-2 ml-4 list-disc">
                {stoppedDevices.map(dc => (
                  <li key={dc.id}>
                    {dc.userName || dc.userEmail} - {dc.reason || 'No reason provided'}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" onClick={fetchData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Label htmlFor="online-filter" className="text-sm whitespace-nowrap">Online Status:</Label>
                  <Select value={onlineFilter} onValueChange={(value: 'all' | 'online' | 'offline') => setOnlineFilter(value)}>
                    <SelectTrigger id="online-filter" className="w-[140px]">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="control-filter" className="text-sm whitespace-nowrap">Control Status:</Label>
                  <Select value={controlFilter} onValueChange={(value: 'all' | 'running' | 'stopped') => setControlFilter(value)}>
                    <SelectTrigger id="control-filter" className="w-[140px]">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="stopped">Force Stopped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(onlineFilter !== 'all' || controlFilter !== 'all') && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setOnlineFilter('all');
                      setControlFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Start recording via biometric trigger, Stop to force-stop a tracker, or Resume to allow it to run again
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Online Status</TableHead>
                  <TableHead>Control Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => {
                  const deviceStatus = getDeviceStatus(user.id);
                  const isStopped = deviceStatus?.forceStop || false;
                  const isPendingStart = !isStopped && (deviceStatus?.forceStart || false);
                  const online = isUserOnline(user.id);
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        <div className="text-xs text-muted-foreground/60">{user.id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.teamName || '-'}
                      </TableCell>
                      <TableCell>
                        {online ? (
                          <Badge className="gap-1 bg-green-100 text-green-700 border-green-300 hover:bg-green-100">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <span className="h-2 w-2 rounded-full bg-gray-400" />
                            Offline
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isStopped ? (
                          <div>
                            <Badge variant="destructive" className="gap-1">
                              <Square className="h-3 w-3" />
                              Force Stopped
                            </Badge>
                            {deviceStatus?.reason && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {deviceStatus.reason}
                              </p>
                            )}
                            {deviceStatus?.stoppedAt && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" />
                                {new Date(deviceStatus.stoppedAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ) : isPendingStart ? (
                          <Badge variant="outline" className="gap-1 text-blue-600 border-blue-400">
                            <Play className="h-3 w-3 animate-pulse" />
                            Pending Start
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                            <Play className="h-3 w-3" />
                            Running
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {isStopped ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => openActionDialog(user, 'resume')}
                              >
                                <Play className="h-4 w-4" />
                                Resume
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => openActionDialog(user, 'start')}
                              >
                                <Play className="h-4 w-4" />
                                Start
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => openActionDialog(user, 'stop')}
                              >
                                <Square className="h-4 w-4" />
                                Stop
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => openActionDialog(user, 'start')}
                              >
                                <Play className="h-4 w-4" />
                                Start
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginatedUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {/* First page */}
                {currentPage > 2 && (
                  <>
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(1);
                        }}
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {currentPage > 3 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                  </>
                )}
                
                {/* Pages around current */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page >= currentPage - 1 && page <= currentPage + 1)
                  .map(page => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page);
                        }}
                        isActive={page === currentPage}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                
                {/* Last page */}
                {currentPage < totalPages - 1 && (
                  <>
                    {currentPage < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(totalPages);
                        }}
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
                
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'stop' ? (
                <>
                  <PowerOff className="h-5 w-5 text-red-600" />
                  Force Stop Device
                </>
              ) : actionType === 'start' ? (
                <>
                  <Play className="h-5 w-5 text-blue-600" />
                  Signal Start Recording
                </>
              ) : (
                <>
                  <Power className="h-5 w-5 text-green-600" />
                  Resume Device
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'stop' ? (
                <>
                  This will force-stop the time tracker application for{' '}
                  <strong>{selectedUser?.name || selectedUser?.email}</strong>.
                  The app will stop tracking until you resume it.
                </>
              ) : actionType === 'start' ? (
                <>
                  This will send a <strong>start recording</strong> signal to the time tracker for{' '}
                  <strong>{selectedUser?.name || selectedUser?.email}</strong>.
                  The app will begin a new session on its next heartbeat.
                </>
              ) : (
                <>
                  This will allow the time tracker for{' '}
                  <strong>{selectedUser?.name || selectedUser?.email}</strong>{' '}
                  to run normally again.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {actionType === 'stop' && (
            <div className="space-y-2 py-4">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Maintenance, Investigation, Policy violation..."
                value={reason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === 'stop' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={submitting}
              className={
                actionType === 'resume' ? 'bg-green-600 hover:bg-green-700' :
                actionType === 'start'  ? 'bg-blue-600 hover:bg-blue-700'  : ''
              }
            >
              {submitting ? (
                'Processing...'
              ) : actionType === 'stop' ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Force Stop
                </>
              ) : actionType === 'start' ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Signal Start
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
