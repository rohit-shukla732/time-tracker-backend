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
import { AlertCircle, Search, ChevronLeft, ChevronRight, ExternalLink, UserPlus, Users, Plus, Upload, FileUp, Download, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId: string | null;
  departmentName: string | null;
  createdAt: string;
  totalSessions: number;
  totalEvents: number;
  todayActivity: {
    sessions: number;
    isActive: boolean;
  };
}

interface Department {
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
  const [departments, setDepartments] = useState<Department[]>([]);
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
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [selectedUserForTeam, setSelectedUserForTeam] = useState<User | null>(null);
  
  // Form states
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', password: '' });
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '' });
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/time-tracker/admin/login');
      return;
    }

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      if (search) params.set('search', search);
      if (roleFilter && roleFilter !== 'all') params.set('role', roleFilter);

      const response = await makeAuthenticatedRequest(`/api/admin/users?${params}`);

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        router.push('/time-tracker/admin/login');
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

  const fetchDepartments = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await makeAuthenticatedRequest('/api/teams');

      const data = await response.json();
      if (data.success) {
        setDepartments(data.departments || data.teams || []);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchDepartments();

    // Setup automatic token refresh for admin
    const cleanupTokenRefresh = setupAutoRefresh();

    return () => cleanupTokenRefresh();
  }, [fetchUsers, fetchDepartments]);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        fetchUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

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

  const handleCreateTeam = async () => {
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
        body: JSON.stringify(newDepartment),
      });

      const data = await response.json();
      if (data.success) {
        setCreateTeamOpen(false);
        setNewDepartment({ name: '', description: '' });
        fetchDepartments();
      } else {
        alert(data.error || 'Failed to create department');
      }
    } catch (err) {
      alert('Failed to create department');
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
    if (!user.departmentId) return;
    
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    if (!confirm(`Remove ${user.name || user.email} from their department?`)) return;

    try {
      const response = await fetch(`/api/teams/${user.departmentId}/members?userId=${user.id}`, {
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

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token || !uploadFile) return;

    setSubmitting(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch('/api/admin/users/bulk-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setUploadResult(data);
        setUploadFile(null);
        fetchUsers();
      } else {
        alert(data.error || 'Failed to upload users');
      }
    } catch (err) {
      alert('Failed to upload users');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    // Create a simple Excel template
    const csvContent = 'empCode,name,email\nACE001,John Doe,john.doe@example.com\nACE002,Jane Smith,jane.smith@example.com';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-upload-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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
    <AdminLayout loginPath="/time-tracker/admin/login" basePath="/time-tracker/admin">
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
            <Dialog open={bulkUploadOpen} onOpenChange={(open) => { setBulkUploadOpen(open); if (!open) { setUploadResult(null); setUploadFile(null); } }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Bulk Upload Users</DialogTitle>
                  <DialogDescription>
                    Upload an Excel or CSV file with employee code, name, and email. Password will be set to the employee code.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBulkUpload}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Template</Label>
                      <div className="text-sm text-muted-foreground mb-2">
                        Download a template file to see the required format
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Template
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="excelFile">Upload File (Excel or CSV)</Label>
                      <div className="text-sm text-muted-foreground mb-2">
                        Required columns: <strong>empCode</strong>, <strong>name</strong>, <strong>email</strong>
                      </div>
                      <Input
                        id="excelFile"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        required
                      />
                    </div>
                    {uploadResult && (
                      <div className="space-y-2">
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-semibold mb-2">Upload Results</h4>
                          <p className="text-sm">{uploadResult.message}</p>
                          {uploadResult.results && uploadResult.results.errors.length > 0 && (
                            <div className="mt-4">
                              <h5 className="font-semibold text-sm mb-2">Errors:</h5>
                              <div className="max-h-40 overflow-y-auto space-y-1">
                                {uploadResult.results.errors.map((err: any, idx: number) => (
                                  <div key={idx} className="text-xs text-destructive">
                                    Row {err.row} ({err.empCode}): {err.error}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setBulkUploadOpen(false); setUploadResult(null); setUploadFile(null); }}>
                      {uploadResult ? 'Close' : 'Cancel'}
                    </Button>
                    {!uploadResult && (
                      <Button type="submit" disabled={submitting || !uploadFile}>
                        {submitting ? 'Uploading...' : 'Upload Users'}
                      </Button>
                    )}
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Create Department
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Department</DialogTitle>
                  <DialogDescription>
                    Create a new department to organize employees
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTeam}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="teamName">Department Name</Label>
                      <Input
                        id="teamName"
                        value={newDepartment.name}
                        onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                        placeholder="e.g., Development Department"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teamDescription">Description (Optional)</Label>
                      <Input
                        id="teamDescription"
                        value={newDepartment.description}
                        onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                        placeholder="e.g., Frontend and backend developers"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateTeamOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Creating...' : 'Create Department'}
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
                  <TableHead>Department</TableHead>
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
                      {user.departmentName ? (
                        <div className="flex items-center gap-2">
                          <span>{user.departmentName}</span>
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
                          Add to department
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
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/reports?userId=${user.id}`}>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Report
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => { setUserToDelete(user); setDeleteDialogOpen(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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

      {/* Add to Department Dialog */}
      <Dialog open={addToTeamOpen} onOpenChange={setAddToTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Department</DialogTitle>
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
                  {departments.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No departments available. Create one first.
                    </SelectItem>
                  ) : (
                    departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} ({dept.memberCount} members)
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
              {submitting ? 'Adding...' : 'Add to Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete user confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.name || userToDelete?.email}</strong>? This will permanently remove the user and all their associated data including sessions, events, and HR records. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
