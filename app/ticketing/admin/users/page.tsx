'use client';

import { AdminTicketLayout } from '@/components/tickets/AdminTicketLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Mail, Briefcase } from 'lucide-react';

export default function AdminUsersPage() {
  const users = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'EMPLOYEE', tickets: 2 },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'EMPLOYEE', tickets: 1 },
    { id: '3', name: 'Mike Johnson', email: 'mike@example.com', role: 'MANAGER', tickets: 1 },
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  return (
    <AdminTicketLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">View all users and their ticket activity</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users ({users.length})
            </CardTitle>
            <CardDescription>Users who have created tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{user.role}</Badge>
                    <div className="text-right">
                      <p className="text-sm font-medium">{user.tickets} tickets</p>
                      <p className="text-xs text-muted-foreground">created</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminTicketLayout>
  );
}
