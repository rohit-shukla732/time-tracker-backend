import { TicketStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Ticket, 
  Clock, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  AlertCircle,
  Activity
} from 'lucide-react';

interface TicketStatsCardsProps {
  stats: TicketStats;
  loading?: boolean;
}

export function TicketStatsCards({ stats, loading = false }: TicketStatsCardsProps) {
  const statCards = [
    {
      title: 'Total Tickets',
      value: stats.total,
      icon: Ticket,
      description: 'All tickets in system',
      color: 'text-blue-500',
    },
    {
      title: 'Open',
      value: stats.open,
      icon: Clock,
      description: 'Awaiting assignment',
      color: 'text-yellow-500',
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: Activity,
      description: 'Being worked on',
      color: 'text-orange-500',
    },
    {
      title: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle2,
      description: 'Completed tickets',
      color: 'text-green-500',
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface PriorityStatsProps {
  stats: TicketStats;
}

export function PriorityStats({ stats }: PriorityStatsProps) {
  const priorities = [
    { label: 'Urgent', value: stats.byPriority.urgent, color: 'bg-red-500' },
    { label: 'High', value: stats.byPriority.high, color: 'bg-orange-500' },
    { label: 'Medium', value: stats.byPriority.medium, color: 'bg-yellow-500' },
    { label: 'Low', value: stats.byPriority.low, color: 'bg-green-500' },
  ];

  const total = priorities.reduce((sum, p) => sum + p.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Priority Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {priorities.map((priority) => {
          const percentage = total > 0 ? (priority.value / total) * 100 : 0;
          return (
            <div key={priority.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{priority.label}</span>
                <span className="text-muted-foreground">
                  {priority.value} ({percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${priority.color} transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
