'use client';

import { AdminTicketLayout } from '@/components/tickets/AdminTicketLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp,
  FileText,
  PieChart,
  Users,
  Clock,
} from 'lucide-react';

export default function AdminReportsPage() {
  const monthlyStats = {
    totalTickets: 156,
    resolved: 132,
    avgResponseTime: '2.5 hrs',
    satisfactionRate: 4.7,
    trends: {
      tickets: '+12%',
      resolution: '+8%',
      responseTime: '-15%',
    }
  };

  const categoryBreakdown = [
    { name: 'IT Support', count: 45, percentage: 29 },
    { name: 'HR', count: 38, percentage: 24 },
    { name: 'Facilities', count: 32, percentage: 21 },
    { name: 'Payroll', count: 24, percentage: 15 },
    { name: 'Technical', count: 17, percentage: 11 },
  ];

  const topPerformers = [
    { name: 'Admin User', resolved: 48, avgTime: '1.8 hrs', satisfaction: 4.9 },
    { name: 'HR Manager', resolved: 42, avgTime: '2.1 hrs', satisfaction: 4.8 },
    { name: 'IT Support', resolved: 38, avgTime: '2.4 hrs', satisfaction: 4.6 },
  ];

  return (
    <AdminTicketLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground">Comprehensive ticket system analytics and insights</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Select Range
            </Button>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyStats.totalTickets}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-600">{monthlyStats.trends.tickets}</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyStats.resolved}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-600">{monthlyStats.trends.resolution}</span> resolution rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyStats.avgResponseTime}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-600">{monthlyStats.trends.responseTime}</span> faster
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyStats.satisfactionRate}/5.0</div>
              <p className="text-xs text-muted-foreground mt-1">Based on 142 ratings</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Tickets by Category
              </CardTitle>
              <CardDescription>Distribution across categories this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryBreakdown.map((category) => (
                  <div key={category.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{category.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{category.count} tickets</span>
                        <Badge variant="secondary">{category.percentage}%</Badge>
                      </div>
                    </div>
                    <Progress value={category.percentage} className="h-2" />
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                <Download className="mr-2 h-4 w-4" />
                Export Category Report
              </Button>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Performers
              </CardTitle>
              <CardDescription>Team members with best performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformers.map((performer, index) => (
                  <div key={performer.name} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{performer.name}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>{performer.resolved} resolved</span>
                        <span>•</span>
                        <span>{performer.avgTime} avg</span>
                        <span>•</span>
                        <span>⭐ {performer.satisfaction}</span>
                      </div>
                    </div>
                    <Badge variant="outline">Top {((index + 1) * 10)}%</Badge>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                <Download className="mr-2 h-4 w-4" />
                Export Team Report
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle>Export Reports</CardTitle>
            <CardDescription>Download detailed reports in various formats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Button variant="outline" className="justify-start h-auto py-4">
                <div className="flex flex-col items-start gap-1 w-full">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="font-semibold">Monthly Summary</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Complete monthly breakdown</span>
                  <Button size="sm" className="mt-2 w-full">
                    <Download className="mr-2 h-3 w-3" />
                    Download PDF
                  </Button>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto py-4">
                <div className="flex flex-col items-start gap-1 w-full">
                  <div className="flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    <span className="font-semibold">Category Analysis</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Tickets by category</span>
                  <Button size="sm" className="mt-2 w-full">
                    <Download className="mr-2 h-3 w-3" />
                    Download CSV
                  </Button>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto py-4">
                <div className="flex flex-col items-start gap-1 w-full">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="font-semibold">Team Performance</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Individual metrics</span>
                  <Button size="sm" className="mt-2 w-full">
                    <Download className="mr-2 h-3 w-3" />
                    Download Excel
                  </Button>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminTicketLayout>
  );
}
