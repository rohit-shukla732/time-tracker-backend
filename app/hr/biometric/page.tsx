'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Database, Users, Clock, UserCheck, UserX, RefreshCw } from 'lucide-react';
import { makeAuthenticatedRequest } from '@/lib/adminAuth';
import { toast } from 'sonner';

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
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeId, setEmployeeId] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeStatus[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

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
    } catch (error: any) {
      toast.error('Failed to fetch attendance records');
    } finally {
      setIsLoadingRecords(false);
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

      {/* Employee Status Grid */}
      {employeeStatuses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              Employees ({employeeStatuses.length})
            </h2>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-500" />
                <span>In Office: {employeeStatuses.filter(e => e.status === 'IN').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-gray-400" />
                <span>Out: {employeeStatuses.filter(e => e.status === 'OUT').length}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {employeeStatuses.map((employee) => (
              <Card key={employee.userId} className={`relative ${getStatusColor(employee.status)} overflow-hidden`}>
                <CardContent className="p-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-semibold truncate">{employee.userId}</h3>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {employee.checkInTime && (
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">IN:</span>
                            <span>{employee.checkInTime}</span>
                          </div>
                        )}
                        {employee.checkOutTime && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">OUT:</span>
                            <span>{employee.checkOutTime}</span>
                          </div>
                        )}
                      </div>
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoadingRecords && employeeStatuses.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}

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
