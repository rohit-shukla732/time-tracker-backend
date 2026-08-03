'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { HRLayout } from '@/components/hr/HRLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { AlertCircle, Search, ChevronLeft, ChevronRight, Plus, Trash2, Users, Edit2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId: string | null;
  departmentName: string | null;
  createdAt: string;
  clientProjectId?: string | null;
  clientProjectName?: string | null;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  createdAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export default function HRDepartments() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // Dialog states
  const [createDeptOpen, setCreateDeptOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteDeptOpen, setDeleteDeptOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);

  // Client projects
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [assignProjectOpen, setAssignProjectOpen] = useState(false);
  const [selectedProjectUser, setSelectedProjectUser] = useState<User | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Form states
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '' });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Project creation form
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  // Filter states
  const [deptFilter, setDeptFilter] = useState('all');

  const getAuthToken = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/hr/login');
      return null;
    }
    return token;
  };

  const fetchDepartments = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        router.push('/hr/login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setDepartments(data.departments || data.teams || []);
      } else {
        setError(data.error || 'Failed to fetch departments');
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      setError('Failed to connect to server');
    }
  }, [router]);

  const fetchUsers = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
      });
      if (search) params.set('search', search);
      if (deptFilter && deptFilter !== 'all') params.set('departmentId', deptFilter);

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        router.push('/hr/login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.users || []);
        setPagination(data.pagination);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [router, currentPage, search, deptFilter]);

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
    // fetch client projects
    (async () => {
      const token = getAuthToken();
      if (!token) return;
      try {
        const res = await fetch('/api/client-projects', { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (res.ok && j.success) setProjects(j.data || j.projects || []);
      } catch (e) {
        // ignore
      }
    })();
  }, [fetchDepartments, fetchUsers]);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
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
        setCreateDeptOpen(false);
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

  const handleAddUserToDept = async () => {
    if (!selectedDept || !selectedUserId) return;
    const token = getAuthToken();
    if (!token) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/teams/${selectedDept.id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedUserId }),
      });

      const data = await response.json();
      if (data.success) {
        setAddUserOpen(false);
        setSelectedDept(null);
        setSelectedUserId('');
        fetchUsers();
        fetchDepartments();
      } else {
        alert(data.error || 'Failed to add user to department');
      }
    } catch (err) {
      alert('Failed to add user to department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveUserFromDept = async (user: User) => {
    if (!user.departmentId) return;
    const token = getAuthToken();
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
        fetchDepartments();
      } else {
        alert(data.error || 'Failed to remove user from department');
      }
    } catch (err) {
      alert('Failed to remove user from department');
    }
  };

  const handleDeleteDepartment = async () => {
    if (!deptToDelete) return;
    const token = getAuthToken();
    if (!token) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/teams/${deptToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setDeleteDeptOpen(false);
        setDeptToDelete(null);
        fetchDepartments();
        fetchUsers();
      } else {
        alert(data.error || 'Failed to delete department');
      }
    } catch (err) {
      alert('Failed to delete department');
    } finally {
      setDeleting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const openAddUserDialog = (dept: Department) => {
    setSelectedDept(dept);
    setSelectedUserId('');
    setAddUserOpen(true);
  };

  if (loading) {
    return (
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 bg-black/5 dark:bg-white/5 rounded-xl" />
          <div className="p-8 rounded-[32px] bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-black/5 dark:bg-white/5 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Department Management
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[17px] text-zinc-500 dark:text-zinc-400 font-light">
              <p>Manage departments and assign employees</p>
            </div>
          </div>

          <Dialog open={createDeptOpen} onOpenChange={setCreateDeptOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center justify-center px-5 h-11 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[14px] font-medium hover:bg-zinc-800 dark:hover:bg-white transition-all active:scale-[0.98] shadow-xl shadow-zinc-900/10 dark:shadow-white/10 gap-2">
                <Plus className="h-4 w-4" />
                New Department
              </button>
            </DialogTrigger>
            <button
              onClick={() => setCreateProjectOpen(true)}
              className="ml-3 flex items-center justify-center px-4 h-11 rounded-full bg-white/0 text-zinc-900 dark:text-zinc-100 text-[14px] font-medium hover:bg-black/[0.03] dark:hover:bg-white/5 transition-all active:scale-[0.98] shadow-sm gap-2 border border-black/[0.04]"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
            <DialogContent className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-black/[0.04] dark:border-white/[0.04] shadow-2xl rounded-[32px] p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Create New Department</DialogTitle>
                <DialogDescription className="text-zinc-500">
                  Add a new department to organize your employees
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateDepartment}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="deptName" className="text-zinc-700 dark:text-zinc-300">Department Name</Label>
                    <Input
                      id="deptName"
                      value={newDepartment.name}
                      onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                      placeholder="e.g., Engineering, Sales, HR"
                      required
                      className="rounded-xl border-black/10 dark:border-white/10 bg-white/50 dark:bg-zinc-800/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deptDescription" className="text-zinc-700 dark:text-zinc-300">Description (Optional)</Label>
                    <Input
                      id="deptDescription"
                      value={newDepartment.description}
                      onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                      placeholder="e.g., Software development and infrastructure"
                      className="rounded-xl border-black/10 dark:border-white/10 bg-white/50 dark:bg-zinc-800/50"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateDeptOpen(false)} className="rounded-xl border-black/10 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white shadow-xl shadow-zinc-900/10 dark:shadow-white/10">
                    {submitting ? 'Creating...' : 'Create Department'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Create Project Dialog */}
          <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
            <DialogContent className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-black/[0.04] dark:border-white/[0.04] shadow-2xl rounded-[32px] p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Create Client Project</DialogTitle>
                <DialogDescription className="text-zinc-500">Add a new client project to assign employees</DialogDescription>
              </DialogHeader>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const token = getAuthToken(); if (!token) return;
                setCreatingProject(true);
                try {
                  const res = await fetch('/api/client-projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ name: newProjectName, description: newProjectDescription })
                  });
                  const j = await res.json();
                  if (res.ok && j.success) {
                    setCreateProjectOpen(false);
                    setNewProjectName('');
                    setNewProjectDescription('');
                    // refresh projects
                    try {
                      const r = await fetch('/api/client-projects', { headers: { Authorization: `Bearer ${token}` } });
                      const dj = await r.json();
                      if (r.ok && dj.success) setProjects(dj.data || dj.projects || []);
                    } catch (_) {}
                  } else {
                    alert(j.error || 'Failed to create project');
                  }
                } catch (err) {
                  alert('Failed to create project');
                } finally {
                  setCreatingProject(false);
                }
              }}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-700 dark:text-zinc-300">Project Name</Label>
                    <Input placeholder="Project name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} required className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-700 dark:text-zinc-300">Description (optional)</Label>
                    <Input placeholder="Short description" value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateProjectOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={creatingProject || !newProjectName}>{creatingProject ? 'Creating...' : 'Create Project'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-900/50 rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Departments Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-[24px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
            <div className="text-[14px] text-zinc-500 dark:text-zinc-400 font-medium mb-2">Total Departments</div>
            <div className="text-[32px] font-semibold text-zinc-900 dark:text-zinc-100">{departments.length}</div>
          </div>
          <div className="p-6 rounded-[24px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
            <div className="text-[14px] text-zinc-500 dark:text-zinc-400 font-medium mb-2">Total Users</div>
            <div className="text-[32px] font-semibold text-zinc-900 dark:text-zinc-100">{pagination?.totalCount || 0}</div>
          </div>
          <div className="p-6 rounded-[24px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-sm">
            <div className="text-[14px] text-zinc-500 dark:text-zinc-400 font-medium mb-2">Avg. Dept Size</div>
            <div className="text-[32px] font-semibold text-zinc-900 dark:text-zinc-100">
              {departments.length > 0 ? Math.round(departments.reduce((sum, d) => sum + d.memberCount, 0) / departments.length) : 0}
            </div>
          </div>
        </div>

        {/* Tabs Container */}
        <div className="rounded-[32px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <Tabs defaultValue="departments" className="w-full">
            {/* Tabs Header */}
            <div className="border-b border-black/[0.04] dark:border-white/[0.04] px-8 pt-6">
              <TabsList className="bg-transparent border-b-0 p-0 h-auto gap-8">
                <TabsTrigger 
                  value="departments" 
                  className="py-3 px-0 text-[15px] font-medium text-zinc-600 dark:text-zinc-400 border-b-2 border-transparent data-[state=active]:border-zinc-900 dark:data-[state=active]:border-zinc-100 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 rounded-none"
                >
                  Departments
                </TabsTrigger>
                <TabsTrigger 
                  value="employees" 
                  className="py-3 px-0 text-[15px] font-medium text-zinc-600 dark:text-zinc-400 border-b-2 border-transparent data-[state=active]:border-zinc-900 dark:data-[state=active]:border-zinc-100 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 rounded-none"
                >
                  Employee Assignments
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Departments Tab */}
            <TabsContent value="departments" className="mt-0 p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-[20px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Departments
                </h3>
                <p className="text-[15px] text-zinc-500 dark:text-zinc-400 font-light">
                  View and manage all departments
                </p>
              </div>

              <ScrollArea className="w-full rounded-lg border border-black/[0.02] dark:border-white/[0.02]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-black/[0.04] dark:border-white/[0.04] hover:bg-transparent">
                      <TableHead className="text-[14px] font-medium text-zinc-500 h-12 px-8">Department</TableHead>
                      <TableHead className="text-[14px] font-medium text-zinc-500 h-12">Members</TableHead>
                      <TableHead className="text-[14px] font-medium text-zinc-500 h-12">Description</TableHead>
                      <TableHead className="text-[14px] font-medium text-zinc-500 h-12 pr-8 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((dept) => (
                      <TableRow key={dept.id} className="border-b border-black/[0.02] dark:border-white/[0.02] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors h-[72px]">
                        <TableCell className="px-8">
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{dept.name}</div>
                            <div className="text-[13px] text-zinc-500">{dept.id.substring(0, 8)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30">
                            {dept.memberCount} members
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-[14px] text-zinc-600 dark:text-zinc-400">
                            {dept.description || <span className="text-zinc-400 italic">No description</span>}
                          </span>
                        </TableCell>
                        <TableCell className="pr-8 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[13px] font-medium gap-1.5"
                              onClick={() => openAddUserDialog(dept)}
                            >
                              <Plus className="h-4 w-4" />
                              Add User
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                              onClick={() => {
                                setDeptToDelete(dept);
                                setDeleteDeptOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {departments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-[15px] text-zinc-500">
                          No departments found. Create one to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* Employee Assignments Tab */}
            <TabsContent value="employees" className="mt-0 p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-[20px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    Employee Assignments
                  </h3>
                  <p className="text-[15px] text-zinc-500 dark:text-zinc-400 font-light">
                    Manage employee-to-department assignments
                  </p>
                </div>

                {/* Search and Filters */}
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 bg-black/[0.01] dark:bg-white/[0.01] p-4 rounded-lg">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-11 h-11 rounded-xl bg-white dark:bg-zinc-800/50 border-black/5 dark:border-white/5 shadow-sm text-[15px]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={deptFilter} onValueChange={setDeptFilter}>
                      <SelectTrigger className="w-[180px] h-11 rounded-xl bg-white dark:bg-zinc-800/50 border-black/5 dark:border-white/5 text-[14px]">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-black/5 dark:border-white/5 shadow-xl">
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button type="submit" className="flex items-center justify-center h-11 px-5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[14px] font-medium hover:bg-zinc-800 dark:hover:bg-white transition-all active:scale-[0.98] shadow-sm gap-2">
                      <Search className="h-4 w-4" />
                      Search
                    </button>
                  </div>
                </form>
              </div>

              <ScrollArea className="w-full rounded-lg border border-black/[0.02] dark:border-white/[0.02]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-black/[0.04] dark:border-white/[0.04] hover:bg-transparent">
                      <TableHead className="text-[14px] font-medium text-zinc-500 h-12 px-8">Employee</TableHead>
                      <TableHead className="text-[14px] font-medium text-zinc-500 h-12">Email</TableHead>
                      <TableHead className="text-[14px] font-medium text-zinc-500 h-12">Role</TableHead>
                      <TableHead className="text-[14px] font-medium text-zinc-500 h-12">Assigned Department</TableHead>
                      <TableHead className="text-[14px] font-medium text-zinc-500 h-12">Client Project</TableHead>
                      <TableHead className="text-[14px] font-medium text-zinc-500 h-12 pr-8 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="border-b border-black/[0.02] dark:border-white/[0.02] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors h-[72px]">
                        <TableCell className="px-8">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 flex items-center justify-center text-zinc-700 dark:text-zinc-300 text-[15px] font-semibold shadow-sm">
                              {(user.name || user.email || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-zinc-900 dark:text-zinc-100">{user.name || 'Unknown'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-[14px] text-zinc-600 dark:text-zinc-400">{user.email}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full border-black/10 dark:border-white/10 text-[12px]">
                            {user.role.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.departmentName ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-lg">
                                {user.departmentName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[13px] text-zinc-500 italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.clientProjectName ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-lg">
                                {user.clientProjectName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[13px] text-zinc-500 italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="pr-8 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Department actions */}
                              {user.departmentName && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 dark:text-red-400 text-[13px] font-medium"
                                  onClick={() => handleRemoveUserFromDept(user)}
                                >
                                  Remove
                                </Button>
                              )}
                              {!user.departmentName && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[13px] font-medium gap-1.5"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setSelectedUserId(user.id);
                                    if (departments.length > 0) {
                                      setSelectedDept(departments[0]);
                                      setAddUserOpen(true);
                                    } else {
                                      alert('Create a department first');
                                    }
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                  Assign
                                </Button>
                              )}

                              {/* Client project assign/remove */}
                              {user.clientProjectName ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 dark:text-red-400 text-[13px] font-medium"
                                  onClick={async () => {
                                    const token = getAuthToken();
                                    if (!token) return;
                                    if (!confirm(`Remove ${user.name || user.email} from project ${user.clientProjectName}?`)) return;
                                    try {
                                      const res = await fetch(`/api/client-projects/${user.clientProjectId}/members?userId=${user.id}`, {
                                        method: 'DELETE',
                                        headers: { Authorization: `Bearer ${token}` }
                                      });
                                      const j = await res.json();
                                      if (res.ok && j.success) {
                                        fetchUsers();
                                      } else alert(j.error || 'Failed to remove from project');
                                    } catch (e) { alert('Failed to remove from project'); }
                                  }}
                                >
                                  Remove Project
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[13px] font-medium gap-1.5"
                                  onClick={() => {
                                    setSelectedProjectUser(user);
                                    setSelectedProjectId('');
                                    if (projects.length > 0) setSelectedProjectId(projects[0].id);
                                    setAssignProjectOpen(true);
                                  }}
                                >
                                  Assign Project
                                </Button>
                              )}
                            </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-[15px] text-zinc-500">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 bg-black/[0.01] dark:bg-white/[0.01] rounded-lg">
                  <p className="text-[14px] font-medium text-zinc-500">
                    Page {currentPage} of {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl border-black/10 dark:border-white/10 shadow-sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl border-black/10 dark:border-white/10 shadow-sm"
                      onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                      disabled={currentPage === pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add User to Department Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-black/[0.04] dark:border-white/[0.04] shadow-2xl rounded-[32px] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Assign User to Department
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              {selectedDept && `Select a user to assign to ${selectedDept.name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">Department</Label>
              <div className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100 bg-black/5 dark:bg-white/5 px-4 py-2 rounded-xl">
                {selectedDept?.name}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 dark:text-zinc-300">Select Employee</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full h-11 rounded-xl bg-white dark:bg-zinc-800/50 border-black/5 dark:border-white/5 text-[14px]">
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-black/5 dark:border-white/5 shadow-xl">
                  {users
                    .filter((u) => !u.departmentId)
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  {users.filter((u) => !u.departmentId).length === 0 && (
                    <SelectItem value="_none" disabled>
                      All employees are assigned
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddUserOpen(false);
                setSelectedDept(null);
                setSelectedUserId('');
              }}
              className="rounded-xl border-black/10 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddUserToDept}
              disabled={!selectedUserId || submitting}
              className="rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white shadow-xl shadow-zinc-900/10 dark:shadow-white/10"
            >
              {submitting ? 'Assigning...' : 'Assign User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Project Dialog */}
      <Dialog open={assignProjectOpen} onOpenChange={setAssignProjectOpen}>
        <DialogContent className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-black/[0.04] dark:border-white/[0.04] shadow-2xl rounded-[32px] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Assign Project</DialogTitle>
            <DialogDescription className="text-zinc-500">Select a client project to assign</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <div className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100 bg-black/5 dark:bg-white/5 px-4 py-2 rounded-xl">
                {selectedProjectUser?.name} ({selectedProjectUser?.email})
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full h-11 rounded-xl bg-white dark:bg-zinc-800/50 border-black/5 dark:border-white/5 text-[14px]">
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-black/5 dark:border-white/5 shadow-xl">
                  {projects.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  {projects.length === 0 && <SelectItem value="_none" disabled>No projects available</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignProjectOpen(false); setSelectedProjectUser(null); setSelectedProjectId(''); }}>Cancel</Button>
            <Button onClick={async () => {
              if (!selectedProjectUser || !selectedProjectId) return alert('Select a project');
              const token = getAuthToken(); if (!token) return;
              try {
                const res = await fetch(`/api/client-projects/${selectedProjectId}/members`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ userId: selectedProjectUser.id })
                });
                const j = await res.json();
                if (res.ok && j.success) {
                  setAssignProjectOpen(false);
                  setSelectedProjectUser(null);
                  setSelectedProjectId('');
                  fetchUsers();
                } else alert(j.error || 'Failed to assign project');
              } catch (e) {
                alert('Failed to assign project');
              }
            }}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Department Dialog */}
      <Dialog open={deleteDeptOpen} onOpenChange={setDeleteDeptOpen}>
        <DialogContent className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-black/[0.04] dark:border-white/[0.04] shadow-2xl rounded-[32px] p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
              </span>
              Delete Department
            </DialogTitle>
            <DialogDescription className="text-[15px] pt-4 leading-relaxed text-zinc-600 dark:text-zinc-400">
              Are you sure you want to delete <strong className="text-zinc-900 dark:text-zinc-100">{deptToDelete?.name}</strong>? This action cannot be undone. Members will be unassigned from the department.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDeptOpen(false)}
              disabled={deleting}
              className="rounded-xl border-black/10 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDepartment}
              disabled={deleting}
              className="rounded-xl shadow-lg shadow-red-500/20"
            >
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}