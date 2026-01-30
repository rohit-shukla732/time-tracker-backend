"use client";

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, validateAuth } from '@/lib/authFetch';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FileText, Download, Calendar, Users, TrendingUp, Clock, AlertTriangle, BarChart3, Activity, FileSpreadsheet, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatInUserTimezone, getUserTimezone } from '@/lib/timezoneUtils';

interface TeamInfo {
  id: string;
  name: string;
  memberCount?: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface ReportFilters {
  reportType: string;
  members: string[]; // 'all' or specific member IDs
  dateFrom: string;
  dateTo: string;
  format: 'excel' | 'pdf';
  // Exception report specific
  idleThreshold?: number;
  lowActivityThreshold?: number;
  // Productivity score specific
  productiveApps?: string[];
}

export default function ManagerReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const today = new Date();
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return {
      reportType: '',
      members: ['all'],
      dateFrom: formatInUserTimezone(lastWeek, 'yyyy-MM-dd', getUserTimezone()),
      dateTo: formatInUserTimezone(today, 'yyyy-MM-dd', getUserTimezone()),
      format: 'excel',
      idleThreshold: 30,
      lowActivityThreshold: 50,
    };
  });

  useEffect(() => {
    async function init() {
      const valid = await validateAuth();
      if (!valid) {
        router.push('/time-tracker/manager/login');
        return;
      }

      // Fetch manager's department
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        try {
          const teamsResponse = await authFetch('/api/teams', {}, '/time-tracker/manager/login') as any;
          const managedDepartments = teamsResponse?.departments?.filter((dept: any) => 
            dept.managerId === user.id
          ) || [];
          
          if (managedDepartments.length > 0) {
            const departmentId = managedDepartments[0].id;
            await fetchTeamInfo(departmentId);
            await fetchTeamMembers(departmentId);
          } else {
            setError('No department assigned');
            setLoading(false);
          }
        } catch (err) {
          console.error('Failed to fetch departments:', err);
          setError('Failed to load department information');
          setLoading(false);
        }
      } else {
        setError('User information not found');
        setLoading(false);
      }
    }
    init();

    // Listen for timezone changes and update date filters
    const handleTimezoneChange = () => {
      const today = new Date();
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      setFilters(prev => ({
        ...prev,
        dateFrom: formatInUserTimezone(lastWeek, 'yyyy-MM-dd', getUserTimezone()),
        dateTo: formatInUserTimezone(today, 'yyyy-MM-dd', getUserTimezone()),
      }));
    };

    window.addEventListener('timezoneChanged' as any, handleTimezoneChange);
    return () => {
      window.removeEventListener('timezoneChanged' as any, handleTimezoneChange);
    };
  }, [router]);

  async function fetchTeamInfo(teamId: string) {
    try {
      const data = await authFetch(`/api/teams/${teamId}/stats`);
      
      if (data.success && data.stats) {
        setTeamInfo({
          id: teamId,
          name: data.stats.team?.name || 'My Team',
          memberCount: data.stats.users?.total || 0,
        });
      } else {
        setError('Failed to load team information');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching team info:', err);
      setError('Failed to load team information');
      setLoading(false);
    }
  }

  async function fetchTeamMembers(teamId: string) {
    try {
      const data = await authFetch(`/api/teams/${teamId}/members`);
      if (data.success && data.members) {
        setTeamMembers(data.members);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  }

  const openReportDialog = (reportType: string) => {
    setSelectedReportType(reportType);
    setFilters(prev => ({ ...prev, reportType }));
    setShowFilterDialog(true);
  };

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      // Get timezone from localStorage
      const timezone = (localStorage.getItem('timezone') || 'IST') as 'IST' | 'EST';
      
      const response = await authFetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            ...filters,
            timezone, // Add timezone to filters
          },
          departmentId: teamInfo?.id,
        }),
      });

      if (response.success) {
        // Store report data in sessionStorage and navigate to view page
        sessionStorage.setItem('currentReport', JSON.stringify(response.reportData));
        sessionStorage.setItem('currentReportFilters', JSON.stringify(filters));
        setShowFilterDialog(false);
        toast.success('Report generated successfully');
        router.push('/time-tracker/manager/reports/view');
      } else {
        toast.error(response.error || 'Failed to generate report');
      }
    } catch (err) {
      console.error('Error generating report:', err);
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const reportTypes = [
    {
      id: 'exception-alert',
      title: 'Exception / Alert Report',
      description: 'Users with excessive idle time, low activity, or high non-productive usage',
      icon: AlertTriangle,
      color: 'bg-red-500',
      available: true,
    },
    {
      id: 'trend-comparison',
      title: 'Trend & Comparison Report',
      description: 'Week-over-week and month-over-month productivity trends',
      icon: TrendingUp,
      color: 'bg-blue-500',
      available: true,
    },
    {
      id: 'attendance-session',
      title: 'Attendance & Work Session Report',
      description: 'Login/logout times, session durations, and attendance patterns',
      icon: Clock,
      color: 'bg-green-500',
      available: true,
    },
    {
      id: 'productivity-score',
      title: 'User Productivity Score',
      description: 'Calculated productivity index (0-100) based on active time and app usage',
      icon: BarChart3,
      color: 'bg-purple-500',
      available: true,
    },
    {
      id: 'app-website-usage',
      title: 'Application & Website Usage Report',
      description: 'Detailed breakdown of apps and websites with productivity categorization',
      icon: Activity,
      color: 'bg-orange-500',
      available: true,
    },
    {
      id: 'active-idle-time',
      title: 'Active vs Idle Time Report',
      description: 'Active and idle time analysis with streak detection',
      icon: Clock,
      color: 'bg-pink-500',
      available: true,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate and download reports for {teamInfo?.name || 'your team'}
          </p>
        </div>
        {teamInfo && (
          <Badge variant="outline" className="text-sm">
            <Users className="w-4 h-4 mr-2" />
            {teamInfo.memberCount} Members
          </Badge>
        )}
      </div>

      {/* Report Types Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${report.color} bg-opacity-10`}>
                    <Icon className={`h-6 w-6 ${report.color.replace('bg-', 'text-')}`} />
                  </div>
                  {report.available ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Available
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                      Coming Soon
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-4">{report.title}</CardTitle>
                <CardDescription className="mt-2">{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  variant={report.available ? "default" : "outline"}
                  disabled={!report.available}
                  onClick={() => openReportDialog(report.id)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter Dialog */}
      <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Report</DialogTitle>
            <DialogDescription>
              Set filters and parameters for your report
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
            </div>

            {/* Team Members Selection */}
            <div className="space-y-2">
              <Label htmlFor="members">Team Members</Label>
              <Select
                value={filters.members[0]}
                onValueChange={(value) => setFilters({ ...filters, members: [value] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Members</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Export Format */}
            <div className="space-y-2">
              <Label htmlFor="format">Export Format</Label>
              <Select
                value={filters.format}
                onValueChange={(value: 'excel' | 'pdf') => setFilters({ ...filters, format: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Exception Report Specific Filters */}
            {selectedReportType === 'exception-alert' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="idleThreshold">Idle Time Threshold (minutes)</Label>
                  <Input
                    id="idleThreshold"
                    type="number"
                    value={filters.idleThreshold}
                    onChange={(e) => setFilters({ ...filters, idleThreshold: parseInt(e.target.value) })}
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground">Alert if idle time exceeds this threshold</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lowActivityThreshold">Low Activity Threshold (%)</Label>
                  <Input
                    id="lowActivityThreshold"
                    type="number"
                    value={filters.lowActivityThreshold}
                    onChange={(e) => setFilters({ ...filters, lowActivityThreshold: parseInt(e.target.value) })}
                    min="1"
                    max="100"
                  />
                  <p className="text-xs text-muted-foreground">Alert if activity percentage is below this threshold</p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFilterDialog(false)}>
              Cancel
            </Button>
            <Button onClick={generateReport} disabled={generatingReport}>
              {generatingReport ? 'Generating...' : 'Generate Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Report Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Date Range</p>
              <p className="text-sm text-muted-foreground">
                Select appropriate date ranges for meaningful insights. Longer periods show better trends.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Export Format</p>
              <p className="text-sm text-muted-foreground">
                Excel format is best for further analysis, while PDF is ideal for presentations.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Data Privacy</p>
              <p className="text-sm text-muted-foreground">
                All reports are generated in real-time and contain only data for your assigned team members.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}