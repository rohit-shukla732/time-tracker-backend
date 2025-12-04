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
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertCircle, Search, ChevronLeft, ChevronRight, ExternalLink, UserPlus, Users, Plus } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId: string | null;
  teamName: string | null;
  createdAt: string;
  totalSessions: number;
  totalEvents: number;
  todayActivity: {
    sessions: number;
    isActive: boolean;
  };
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [addToTeamOpen, setAddToTeamOpen] = useState(false);
  const [selectedUserForTeam, setSelectedUserForTeam] = useState<User | null>(null);
  
  // Form states
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', password: '' });
  const [newTeam, setNewTeam] = useState({ name: '', description: '' });
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
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
      if (search) params.set('search', search);
      if (roleFilter && roleFilter !== 'all') params.set('role', roleFilter);

      const response = await fetch(`/api/admin/users?${params}`, {
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
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [router, currentPage, search, roleFilter]);

  const fetchTeams = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setTeams(data.teams);
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, [fetchUsers, fetchTeams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update role');
      }
    } catch (err) {
      alert('Failed to update role');
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEmployee),
      });

      const data = await response.json();
      if (data.success) {
        setAddEmployeeOpen(false);
        setNewEmployee({ name: '', email: '', password: '' });
        fetchUsers();
      } else {
        alert(data.error || 'Failed to add employee');
      }
    } catch (err) {
      alert('Failed to add employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTeam),
      });

      const data = await response.json();
      if (data.success) {
        setCreateTeamOpen(false);
        setNewTeam({ name: '', description: '' });
        fetchTeams();
      } else {
        alert(data.error || 'Failed to create team');
      }
    } catch (err) {
      alert('Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToTeam = async () => {
    if (!selectedUserForTeam || !selectedTeamId) return;
    
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/teams/${selectedTeamId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedUserForTeam.id }),
      });

      const data = await response.json();
      if (data.success) {
        setAddToTeamOpen(false);
        setSelectedUserForTeam(null);
        setSelectedTeamId('');
        fetchUsers();
      } else {
        alert(data.error || 'Failed to add user to team');
      }
    } catch (err) {
      alert('Failed to add user to team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveFromTeam = async (user: User) => {
    if (!user.teamId) return;
    
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    if (!confirm(`Remove ${user.name || user.email} from their team?`)) return;

    try {
      const response = await fetch(`/api/teams/${user.teamId}/members?userId=${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error || 'Failed to remove user from team');
      }
    } catch (err) {
      alert('Failed to remove user from team');
    }
  };

  const openAddToTeamDialog = (user: User) => {
    setSelectedUserForTeam(user);
    setSelectedTeamId('');
    setAddToTeamOpen(true);
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
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Users</h2>
            <p className="text-muted-foreground">
              Manage user accounts and permissions
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                  <DialogDescription>
                    Create a new team to organize employees
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTeam}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="teamName">Team Name</Label>
                      <Input
                        id="teamName"
                        value={newTeam.name}
                        onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                        placeholder="e.g., Development Team"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teamDescription">Description (Optional)</Label>
                      <Input
                        id="teamDescription"
                        value={newTeam.description}
                        onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                        placeholder="e.g., Frontend and backend developers"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateTeamOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Creating...' : 'Create Team'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                  <DialogDescription>
                    Create a new employee account
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddEmployee}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={newEmployee.name}
                        onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newEmployee.email}
                        onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                        placeholder="john@company.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newEmployee.password}
                        onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAddEmployeeOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Adding...' : 'Add Employee'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
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
            <form onSubmit={handleSearch} className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              {pagination?.totalCount || 0} users total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      <div className="text-xs text-muted-foreground/60">{user.id}</div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                      >
                        <SelectTrigger className="w-[120px]">
                          {user.role}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="EMPLOYEE">Employee</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.teamName ? (
                        <div className="flex items-center gap-2">
                          <span>{user.teamName}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleRemoveFromTeam(user)}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => openAddToTeamDialog(user)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add to team
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">Total: {user.totalSessions}</div>
                      <div className="text-sm text-muted-foreground">Today: {user.todayActivity.sessions}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.todayActivity.isActive ? 'default' : 'secondary'}>
                        {user.todayActivity.isActive ? 'Active' : 'Offline'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/reports?userId=${user.id}`}>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Report
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No users found
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

      {/* Add to Team Dialog */}
      <Dialog open={addToTeamOpen} onOpenChange={setAddToTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Team</DialogTitle>
            <DialogDescription>
              Add {selectedUserForTeam?.name || selectedUserForTeam?.email} to a team
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label>Select Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No teams available. Create one first.
                    </SelectItem>
                  ) : (
                    teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({team.memberCount} members)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToTeamOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddToTeam} disabled={!selectedTeamId || submitting}>
              {submitting ? 'Adding...' : 'Add to Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
