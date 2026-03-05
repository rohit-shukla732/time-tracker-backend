'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Database, Users, Clock, UserCheck, UserX, RefreshCw, Zap, Bell, AlertTriangle } from 'lucide-react';
import { makeAuthenticatedRequest } from '@/lib/adminAuth';
import { toast } from 'sonner';

// Use local timezone date (not UTC) so it matches the biometric machine's clock
function getLocalDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface AttendanceRecord {
  UserID: string;
  IDateTime: string;
  IOType: number;
  Status: string;
}

interface EmployeeStatus {
  userId: string;
  name: string;
  status: 'IN' | 'OUT' | 'UNKNOWN';
  lastAction: string;
  checkInTime?: string;
  checkOutTime?: string;
}

export default function BiometricTestPage() {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [testDate, setTestDate] = useState(getLocalDate());
  const [employeeId, setEmployeeId] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeStatus[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [syncResult, setSyncResult] = useState<{ processed: number; skipped: number; biometricFound: number; unmatched: string[]; diagnosticDates?: string[]; resolvedDate?: string } | null>(null);

  type DeptLateResult = {
    managerId: string;
    managerName: string;
    departmentId: string;
    departmentName: string;
    shiftStartTime: string;
    lateThresholdMins: number;
    cutoffTime: string;
    notYetPastCutoff: boolean;
    totalMembers: number;
    presentCount: number;
    presentEmployees: { id: string; name: string; checkInTime: string; checkOutTime?: string }[];
    lateEmployees: { id: string; name: string; email: string }[];
    alreadyNotified: boolean;
    message: string;
  };
  const [lateCheckResult, setLateCheckResult] = useState<DeptLateResult[] | null>(null);
  const [isTestingLate, setIsTestingLate] = useState(false);

  const testConnection = async () => {
    setConnectionStatus('testing');
    setConnectionMessage('');

    try {
      const response = await makeAuthenticatedRequest('/api/hr/biometric/test-connection');
      
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus('success');
        setConnectionMessage(data.message);
        toast.success('Biometric database connected successfully!');
      } else {
        const error = await response.json();
        setConnectionStatus('error');
        setConnectionMessage(error.details || error.error || 'Connection failed');
        toast.error('Failed to connect to biometric database');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      setConnectionMessage(error.message || 'Network error');
      toast.error('Network error occurred');
    }
  };

  const processAttendanceData = (records: AttendanceRecord[]) => {
    // Group records by employee
    const employeeMap = new Map<string, EmployeeStatus>();

    records.forEach(record => {
      const existing = employeeMap.get(record.UserID);
      const actionTime = new Date(record.IDateTime).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      if (!existing) {
        employeeMap.set(record.UserID, {
          userId: record.UserID,
          name: record.UserID, // You can map this to actual names later
          status: record.Status as 'IN' | 'OUT' | 'UNKNOWN',
          lastAction: actionTime,
          checkInTime: record.IOType === 0 ? actionTime : undefined,
          checkOutTime: record.IOType === 1 ? actionTime : undefined,
        });
      } else {
        // Update with latest status
        existing.status = record.Status as 'IN' | 'OUT' | 'UNKNOWN';
        existing.lastAction = actionTime;
        if (record.IOType === 0) {
          existing.checkInTime = actionTime;
        } else if (record.IOType === 1) {
          existing.checkOutTime = actionTime;
        }
      }
    });

    return Array.from(employeeMap.values()).sort((a, b) => 
      a.userId.localeCompare(b.userId)
    );
  };

  const fetchAttendance = async () => {
    setIsLoadingRecords(true);

    try {
      const params = new URLSearchParams({ date: testDate });
      if (employeeId.trim()) {
        params.append('employeeId', employeeId.trim());
      }

      // 1. Fetch display data
      const response = await makeAuthenticatedRequest(
        `/api/hr/biometric/attendance?${params.toString()}`
      );

      if (response.ok) {
        const data = await response.json();
        setAttendanceRecords(data.records);
        setEmployeeStatuses(processAttendanceData(data.records));
        setLastUpdate(new Date());
      } else {
        const error = await response.json();
        toast.error(error.details || 'Failed to fetch attendance records');
      }

      // 2. Only sync DeviceControl when viewing today — avoids replaying old data
      const today = getLocalDate();
      if (testDate === today) {
        // Do NOT pass a date — let the biometric SQL server use CAST(GETDATE() AS DATE)
        // so it always uses its own local clock, avoiding UTC vs local timezone mismatch.
        const syncParams = new URLSearchParams();
        if (employeeId.trim()) syncParams.append('employeeId', employeeId.trim());

        const syncResp = await makeAuthenticatedRequest(
          `/api/attendance/biometric-sync?${syncParams.toString()}`,
          { method: 'POST' }
        );
        if (syncResp.ok) {
          const syncData = await syncResp.json();
          setSyncResult({
            processed: syncData.processed ?? 0,
            skipped: syncData.skipped ?? 0,
            biometricFound: syncData.biometricFound ?? 0,
            unmatched: syncData.unmatchedIds ?? [],
            diagnosticDates: syncData.diagnosticDates,
            resolvedDate: syncData.resolvedDate,
          });
        }

        // 3. Late arrival check — same today guard; route deduplicates email/notification per day
        const lateResp = await makeAuthenticatedRequest('/api/attendance/check-late', { method: 'POST' });
        if (lateResp.ok) {
          const lateData = await lateResp.json();
          setLateCheckResult(lateData.departments ?? []);
        }
      } else {
        // Viewing a past date — clear dept cards so stale today-data doesn't show
        setLateCheckResult(null);
      }
    } catch (error: any) {
      toast.error('Failed to fetch attendance records');
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const resetLateNotifications = async () => {
    try {
      const resp = await makeAuthenticatedRequest('/api/attendance/check-late/reset', { method: 'DELETE' });
      const data = await resp.json();
      if (resp.ok) {
        toast.success(data.message);
        setLateCheckResult(null);
        fetchAttendance();
      } else {
        toast.error(data.error || 'Failed to reset');
      }
    } catch {
      toast.error('Failed to reset notifications');
    }
  };

  // Force-run the late check right now, ignoring cutoff time (for testing)
  const runLateCheckNow = async () => {
    setIsTestingLate(true);
    try {
      const resp = await makeAuthenticatedRequest('/api/attendance/check-late?force=true', { method: 'POST' });
      const data = await resp.json();
      if (resp.ok) {
        setLateCheckResult(data.departments ?? []);
        toast.success('Late check ran with cutoff override');
      } else {
        toast.error(data.error || 'Test failed');
      }
    } catch {
      toast.error('Test failed');
    } finally {
      setIsTestingLate(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      // Initial fetch
      fetchAttendance();

      // Set up interval for auto-refresh every 5 seconds
      const interval = setInterval(() => {
        fetchAttendance();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [testDate, employeeId, autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN':
        return 'bg-green-500/10';
      case 'OUT':
        return 'bg-gray-400/10';
      default:
        return 'bg-yellow-500/10';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Biometric Attendance</h1>
          <p className="text-muted-foreground mt-1">
            Real-time office attendance monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
          {syncResult !== null && (
            <div className="flex flex-col gap-0.5 text-xs">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                {syncResult.resolvedDate && (
                  <span className="text-muted-foreground">SQL date: <strong>{syncResult.resolvedDate}</strong></span>
                )}
                <span>Biometric found: <strong>{syncResult.biometricFound}</strong></span>
                <span className="text-green-600 font-medium">{syncResult.processed} synced to device control</span>
                {syncResult.skipped > 0 && <span className="text-muted-foreground">{syncResult.skipped} skipped</span>}
              </div>
              {syncResult.unmatched.length > 0 && (
                <div className="text-orange-500">
                  ⚠ Biometric IDs not in app DB: {syncResult.unmatched.join(', ')}
                </div>
              )}
              {syncResult.biometricFound === 0 && syncResult.diagnosticDates && syncResult.diagnosticDates.length > 0 && (
                <div className="text-red-500">
                  ⚠ No data for date &quot;{syncResult.resolvedDate}&quot;. DB has data on: {syncResult.diagnosticDates.join(' | ')}
                </div>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refreshing' : 'Auto-refresh off'}
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeId">
                Employee ID <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="employeeId"
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g., ACE001"
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                onClick={fetchAttendance}
                disabled={isLoadingRecords}
                className="w-full"
              >
                {isLoadingRecords && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Refresh Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === Unified Department Attendance Section === */}
      {(() => {
        // Build a set of all employee IDs tracked inside dept cards
        const deptTrackedIds = new Set(
          (lateCheckResult ?? []).flatMap(d => [
            ...d.presentEmployees.map(e => e.id),
            ...d.lateEmployees.map(e => e.id),
          ])
        );
        // Employees with biometric scans but not assigned to any managed dept
        const otherEmployees = employeeStatuses.filter(e => !deptTrackedIds.has(e.userId));

        return (
          <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Department Attendance
                {lateCheckResult && lateCheckResult.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({lateCheckResult.reduce((s, d) => s + d.totalMembers, 0)} employees · {lateCheckResult.reduce((s, d) => s + d.presentCount, 0)} in office)
                  </span>
                )}
              </h2>
              {lateCheckResult !== null && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={runLateCheckNow} disabled={isTestingLate}>
                    {isTestingLate && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    <Bell className="h-3 w-3 mr-1" />
                    Test Late Check
                  </Button>
                  {lateCheckResult.some(d => d.alreadyNotified) && (
                    <Button variant="outline" size="sm" className="text-xs" onClick={resetLateNotifications}>
                      Reset Today&apos;s Notifications
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* No dept config yet */}
            {lateCheckResult !== null && lateCheckResult.length === 0 && (
              <Card>
                <CardContent className="py-4 text-center text-sm text-muted-foreground">
                  No managers have configured shift times yet. Managers can set their shift in their Settings menu.
                </CardContent>
              </Card>
            )}

            {/* One card per department */}
            {lateCheckResult !== null && lateCheckResult.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {lateCheckResult.map(dept => {
                  const hasLate = dept.lateEmployees.length > 0;
                  const notYet = dept.notYetPastCutoff;
                  const borderColor = notYet ? 'border-muted' : hasLate ? 'border-orange-400' : 'border-green-400';
                  return (
                    <Card key={dept.departmentId} className={`border-2 ${borderColor}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center justify-between">
                          <span>{dept.departmentName}</span>
                          <div className="flex items-center gap-1">
                            {dept.presentCount > 0 && (
                              <Badge className="bg-green-500 text-white text-xs">{dept.presentCount} in</Badge>
                            )}
                            {!notYet && hasLate && (
                              <Badge className="bg-orange-500 text-white text-xs">{dept.lateEmployees.length} late</Badge>
                            )}
                            {notYet && (
                              <Badge variant="outline" className="text-muted-foreground text-xs">cutoff pending</Badge>
                            )}
                            {!notYet && !hasLate && dept.totalMembers > 0 && (
                              <Badge className="bg-green-500 text-white text-xs">all present</Badge>
                            )}
                          </div>
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {dept.managerName} · Shift {dept.shiftStartTime} +{dept.lateThresholdMins}min
                          {' · Cutoff '}
                          {new Date(dept.cutoffTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {dept.alreadyNotified && (
                            <span className="text-orange-500"> · Notified</span>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-1">
                        {/* Present employees */}
                        {dept.presentEmployees.map(emp => (
                          <div key={emp.id} className="flex items-center justify-between py-1 px-2 rounded bg-green-50 dark:bg-green-950/20">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="h-3.5 w-3.5 text-green-600 shrink-0" />
                              <span className="text-sm font-medium truncate">{emp.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              IN {emp.checkInTime}{emp.checkOutTime ? ` · OUT ${emp.checkOutTime}` : ''}
                            </div>
                          </div>
                        ))}
                        {/* Late employees (only after cutoff) */}
                        {!notYet && dept.lateEmployees.map(emp => (
                          <div key={emp.id} className="flex items-center justify-between py-1 px-2 rounded bg-orange-50 dark:bg-orange-950/20">
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                              <span className="text-sm font-medium truncate">{emp.name}</span>
                            </div>
                            <span className="text-xs text-orange-500 whitespace-nowrap ml-2">Not arrived</span>
                          </div>
                        ))}
                        {/* Not yet scanned, but cutoff not reached */}
                        {notYet && dept.totalMembers - dept.presentCount > 0 && (
                          <div className="text-xs text-muted-foreground px-2 pt-1">
                            {dept.totalMembers - dept.presentCount} not yet scanned
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Other employees (biometric scans but no managed dept) */}
            {otherEmployees.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <UserX className="h-4 w-4" />
                  Other / Unassigned ({otherEmployees.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
                  {otherEmployees.map(emp => (
                    <Card key={emp.userId} className={`${getStatusColor(emp.status)}`}>
                      <CardContent className="p-3">
                        <p className="text-xs font-medium truncate">{emp.userId}</p>
                        <p className="text-xs text-muted-foreground">
                          {emp.checkInTime && `IN ${emp.checkInTime}`}
                          {emp.checkOutTime && ` OUT ${emp.checkOutTime}`}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Loading placeholder */}
            {isLoadingRecords && (lateCheckResult === null || lateCheckResult.length === 0) && otherEmployees.length === 0 && (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}

      {/* Raw Data & Debug Section - Collapsible */}
      {attendanceRecords.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer">
            <Card className="group-open:rounded-b-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Raw Data & Debugging ({attendanceRecords.length} records)
                </CardTitle>
              </CardHeader>
            </Card>
          </summary>
          <Card className="rounded-t-none border-t-0">
            <CardContent className="pt-6">
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">User ID</th>
                        <th className="px-4 py-3 text-left font-medium">Date Time</th>
                        <th className="px-4 py-3 text-left font-medium">Type</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.map((record, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-4 py-3 font-medium">{record.UserID}</td>
                          <td className="px-4 py-3">
                            {new Date(record.IDateTime).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={record.IOType === 0 ? 'default' : 'secondary'}>
                              {record.IOType === 0 ? 'IN' : 'OUT'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">{record.Status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  View Raw JSON
                </summary>
                <pre className="mt-2 p-4 bg-muted rounded-lg overflow-x-auto text-xs">
                  {JSON.stringify(attendanceRecords, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        </details>
      )}

      {/* Connection Test Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Connection Test
          </CardTitle>
          <CardDescription>
            Test the connection to the biometric database (Microsoft SQL Server)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={testConnection}
              disabled={connectionStatus === 'testing'}
              variant={connectionStatus === 'success' ? 'outline' : 'default'}
            >
              {connectionStatus === 'testing' && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {connectionStatus === 'success' && (
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              )}
              {connectionStatus === 'error' && (
                <XCircle className="mr-2 h-4 w-4 text-red-500" />
              )}
              Test Connection
            </Button>

            {connectionStatus !== 'idle' && (
              <Badge
                variant={
                  connectionStatus === 'success'
                    ? 'default'
                    : connectionStatus === 'error'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {connectionStatus === 'testing' && 'Testing...'}
                {connectionStatus === 'success' && 'Connected'}
                {connectionStatus === 'error' && 'Failed'}
              </Badge>
            )}
          </div>

          {connectionMessage && (
            <Alert>
              <AlertDescription>{connectionMessage}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
