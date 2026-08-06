'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AdminTicketLayout } from '@/components/tickets/AdminTicketLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  UserPlus,
  Upload,
  MoreVertical,
  Pencil,
  KeyRound,
  Archive,
  ArchiveRestore,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { makeAuthenticatedRequest, setupAutoRefresh } from '@/lib/adminAuth';
import { formatDistanceToNow } from '@/lib/utils';
import { toast } from 'sonner';

type RoleFilter = 'all' | 'ADMIN' | 'SENIOR_MANAGER' | 'MANAGER' | 'HR' | 'EMPLOYEE';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isArchived: boolean;
  createdAt: string;
  _count: { createdTickets: number; assignedTickets: number };
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  SENIOR_MANAGER: 'Senior Manager',
  MANAGER: 'Manager',
  HR: 'HR',
  EMPLOYEE: 'Employee',
};

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
  SENIOR_MANAGER: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
  MANAGER: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  HR: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  EMPLOYEE: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

interface UserFormState {
  id: string;
  name: string;
  email: string;
  role: string;
  password: string;
}

const emptyForm: UserFormState = { id: '', name: '', email: '', role: 'EMPLOYEE', password: '' };

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [archivedFilter, setArchivedFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<UserFormState>(emptyForm);

  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; empCode: string; error: string }>;
  } | null>(null);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) { router.push('/helpdesk/admin/login'); return; }
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
      });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (archivedFilter !== 'all') params.set('archived', String(archivedFilter === 'archived'));
      const response = await makeAuthenticatedRequest(`/api/admin/users?${params}`);
      if (response.status === 401) {
        ['accessToken','refreshToken','user'].forEach(k => localStorage.removeItem(k));
        router.push('/helpdesk/admin/login'); return;
      }
      if (!response.ok) throw new Error();
      const data = await response.json();
      setUsers(data.users);
      setTotalCount(data.pagination.totalCount);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchUsers();
    const cleanup = setupAutoRefresh();
    return () => cleanup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, searchQuery, roleFilter, archivedFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const hasFilters = searchQuery.trim() || roleFilter !== 'all' || archivedFilter !== 'active';
  const resetFilters = () => { setSearchQuery(''); setRoleFilter('all'); setArchivedFilter('active'); setCurrentPage(1); };

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      const response = await makeAuthenticatedRequest('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id.trim() || undefined,
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          password: form.password.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Failed to create user'); return; }
      toast.success(`User ${data.user.id} created — password: ${form.password.trim() || data.user.id}`);
      setCreateDialogOpen(false);
      setForm(emptyForm);
      fetchUsers();
    } catch { toast.error('Failed to create user'); }
    finally { setSaving(false); }
  };

  const openEdit = (user: AdminUser) => {
    setEditUser(user);
    setEditForm({ id: user.id, name: user.name, email: user.email, role: user.role, password: '' });
  };

  const handleEdit = async () => {
    if (!editUser) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string | boolean> = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
      };
      if (editForm.password.trim()) body.password = editForm.password.trim();
      const response = await makeAuthenticatedRequest(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Failed to update user'); return; }
      toast.success('User updated');
      setEditUser(null);
      fetchUsers();
    } catch { toast.error('Failed to update user'); }
    finally { setSaving(false); }
  };

  const handleArchiveToggle = async (user: AdminUser) => {
    try {
      const response = await makeAuthenticatedRequest(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !user.isArchived }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Failed to update user'); return; }
      toast.success(user.isArchived ? 'User unarchived' : 'User archived');
      fetchUsers();
    } catch { toast.error('Failed to update user'); }
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    setResetting(true);
    try {
      const response = await makeAuthenticatedRequest(`/api/admin/users/${resetUser.id}/reset-password`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Failed to reset password'); return; }
      setTempPassword(data.temporaryPassword);
      toast.success('Password reset');
    } catch { toast.error('Failed to reset password'); }
    finally { setResetting(false); }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const response = await makeAuthenticatedRequest(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Failed to delete user'); return; }
      toast.success('User deleted');
      setUserToDelete(null);
      if (users.length === 1 && currentPage > 1) setCurrentPage(p => p - 1);
      fetchUsers();
    } catch { toast.error('Failed to delete user'); }
    finally { setDeleting(false); }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) { toast.error('Choose an Excel file first'); return; }
    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      const response = await makeAuthenticatedRequest('/api/admin/users/bulk-upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Upload failed'); return; }
      setUploadResult(data.results);
      toast.success(data.message);
      fetchUsers();
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <AdminTicketLayout>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
              Users
            </h1>
            <p className="text-[17px] text-zinc-500 dark:text-zinc-400 font-light">
              Manage staff accounts, roles and access.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => { setBulkDialogOpen(true); setBulkFile(null); setUploadResult(null); }}
              className="flex items-center justify-center h-12 px-6 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white text-[14px] font-medium shadow-sm hover:bg-white dark:hover:bg-zinc-800 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center justify-center h-12 px-6 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[14px] font-medium transition-transform hover:shadow-md active:scale-[0.98]"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search name, email or code…"
              className="w-[280px] h-11 pl-11 rounded-2xl border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[14px] shadow-sm"
            />
          </div>
          <Select value={roleFilter} onValueChange={v => setRoleFilter(v as RoleFilter)}>
            <SelectTrigger className="w-[160px] h-11 rounded-2xl border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[14px] shadow-sm"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">All Roles</SelectItem>
              {Object.keys(ROLE_LABELS).map(r => (
                <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={archivedFilter} onValueChange={v => setArchivedFilter(v as typeof archivedFilter)}>
            <SelectTrigger className="w-[150px] h-11 rounded-2xl border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[14px] shadow-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-11 px-4 rounded-2xl text-[14px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Reset
            </Button>
          )}
          <span className="ml-auto text-[14px] text-zinc-500 font-medium whitespace-nowrap">
            {totalCount} user{totalCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-[32px] bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between py-5 px-6 sm:px-8 border-b border-black/[0.04] dark:border-white/[0.04]">
            <h2 className="text-[17px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Staff Register</h2>
            <div className="flex items-center gap-3 text-[14px] text-zinc-500">
              <span>Rows</span>
              <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="h-9 w-[80px] rounded-xl border-black/[0.06] dark:border-white/[0.06] bg-white/50 dark:bg-zinc-900/50 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">{PAGE_SIZE_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 dark:border-white border-t-transparent" />
                <span className="text-[15px] text-zinc-500 font-light">Loading users…</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/20 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 border-b border-black/[0.04] dark:border-white/[0.04]">
                        <TableHead className="pl-6 w-[130px]">Code</TableHead>
                        <TableHead className="w-[200px]">Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-[140px]">Role</TableHead>
                        <TableHead className="w-[120px]">Tickets</TableHead>
                        <TableHead className="w-[110px]">Status</TableHead>
                        <TableHead className="w-[120px]">Created</TableHead>
                        <TableHead className="w-[52px] pr-4" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="py-24 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2">
                                <Search className="h-5 w-5 text-zinc-400" />
                              </div>
                              <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">No users found</span>
                              <span className="text-[14px] text-zinc-500 font-light">Try adjusting your filters or search query</span>
                              {hasFilters && <Button variant="link" size="sm" onClick={resetFilters} className="mt-2 text-zinc-900 dark:text-white">Clear all filters</Button>}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : users.map((user: AdminUser) => (
                        <TableRow key={user.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 border-b border-black/[0.04] dark:border-white/[0.04] transition-colors">
                          <TableCell className="pl-6 font-mono text-xs font-medium">
                            {user.id}
                            {user.isArchived && <span className="ml-2 text-[10px] uppercase tracking-wider text-zinc-400">archived</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium truncate max-w-[140px]">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-[220px] block">{user.email}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`font-medium text-[12px] border-0 ${ROLE_STYLES[user.role] ?? ROLE_STYLES.EMPLOYEE}`}>
                              {ROLE_LABELS[user.role] ?? user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-[13px] text-zinc-500">
                              {user._count.createdTickets} created · {user._count.assignedTickets} assigned
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${user.isArchived ? 'text-zinc-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${user.isArchived ? 'bg-zinc-400' : 'bg-emerald-500'}`} />
                              {user.isArchived ? 'Archived' : 'Active'}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(user.createdAt))}
                          </TableCell>
                          <TableCell className="pr-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                                <DropdownMenuLabel className="px-2.5 py-1.5 text-[12px] font-semibold uppercase tracking-wider text-zinc-400">{user.id}</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5 my-1" />
                                <DropdownMenuItem onClick={() => openEdit(user)} className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-[14px] cursor-pointer">
                                  <Pencil className="h-4 w-4 text-zinc-400" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setResetUser(user); setTempPassword(''); }} className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-[14px] cursor-pointer">
                                  <KeyRound className="h-4 w-4 text-zinc-400" /> Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleArchiveToggle(user)} className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-[14px] cursor-pointer">
                                  {user.isArchived ? <ArchiveRestore className="h-4 w-4 text-zinc-400" /> : <Archive className="h-4 w-4 text-zinc-400" />}
                                  {user.isArchived ? 'Unarchive' : 'Archive'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5 my-1" />
                                <DropdownMenuItem onClick={() => setUserToDelete(user)} className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-[14px] text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-500/10 dark:focus:text-red-400 cursor-pointer">
                                  <Trash2 className="h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-t border-black/[0.04] dark:border-white/[0.04] bg-zinc-50/50 dark:bg-zinc-900/20">
                    <span className="text-[14px] text-zinc-500">
                      Showing <strong className="font-medium text-zinc-900 dark:text-zinc-100">{Math.min((currentPage - 1) * pageSize + 1, totalCount)}–{Math.min(currentPage * pageSize, totalCount)}</strong> of <strong className="font-medium text-zinc-900 dark:text-zinc-100">{totalCount}</strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-black/[0.06] dark:border-white/[0.06]" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-black/[0.06] dark:border-white/[0.06]" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                          acc.push(p); return acc;
                        }, [])
                        .map((p, i) => p === '...'
                          ? <span key={`e-${i}`} className="px-2 text-zinc-400 text-sm">…</span>
                          : <Button key={p} variant={currentPage === p ? 'default' : 'outline'} size="icon" className={`h-8 w-8 rounded-lg text-[13px] ${currentPage === p ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'border-black/[0.06] dark:border-white/[0.06] hover:bg-black/5 dark:hover:bg-white/5'}`} onClick={() => setCurrentPage(p as number)}>{p}</Button>
                        )}
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-black/[0.06] dark:border-white/[0.06]" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-black/[0.06] dark:border-white/[0.06]" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><ChevronsRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create user dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Create a new staff account. The employee code is auto-generated if left blank.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="new-id">Employee Code</Label>
              <Input id="new-id" value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} placeholder="e.g. ACE135 (auto if empty)" className="h-11 rounded-2xl" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-name">Full Name *</Label>
              <Input id="new-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className="h-11 rounded-2xl" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-email">Email *</Label>
              <Input id="new-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john.doe@company.com" className="h-11 rounded-2xl" />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {Object.keys(ROLE_LABELS).map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">Password</Label>
              <Input id="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Defaults to employee code" className="h-11 rounded-2xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="rounded-2xl">Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
              {saving ? 'Creating…' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editUser} onOpenChange={o => !o && setEditUser(null)}>
        <DialogContent className="sm:max-w-[440px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Edit {editUser?.id}</DialogTitle>
            <DialogDescription>
              Update account details or assign a new password.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input id="edit-name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="h-11 rounded-2xl" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input id="edit-email" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="h-11 rounded-2xl" />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {Object.keys(ROLE_LABELS).map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">New Password</Label>
              <Input id="edit-password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep current" className="h-11 rounded-2xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} className="rounded-2xl">Cancel</Button>
            <Button onClick={handleEdit} disabled={saving} className="rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetUser} onOpenChange={o => !o && setResetUser(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset the password for {resetUser?.name} ({resetUser?.id}). All existing sessions will be signed out.
            </DialogDescription>
          </DialogHeader>
          {tempPassword ? (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
              <p className="text-[14px] text-zinc-500 mb-2">Temporary password</p>
              <p className="font-mono text-xl font-semibold text-emerald-600 dark:text-emerald-400">{tempPassword}</p>
              <p className="text-[12px] text-zinc-400 mt-3">The user will be asked to change it at next login.</p>
            </div>
          ) : (
            <p className="text-[14px] text-zinc-500 text-center py-2">
              The temporary password will be the user&apos;s employee code ({resetUser?.id}).
            </p>
          )}
          <DialogFooter>
            {tempPassword ? (
              <Button onClick={() => setResetUser(null)} className="rounded-2xl w-full">Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setResetUser(null)} className="rounded-2xl">Cancel</Button>
                <Button onClick={handleResetPassword} disabled={resetting} className="rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
                  {resetting ? 'Resetting…' : 'Reset Password'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!userToDelete} onOpenChange={o => !o && setUserToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This permanently deletes {userToDelete?.name} ({userToDelete?.id}) along with their tickets, comments and sessions. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)} className="rounded-2xl">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="rounded-2xl bg-red-600 text-white hover:bg-red-700">
              {deleting ? 'Deleting…' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk upload dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={o => !o && setBulkDialogOpen(false)}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Users</DialogTitle>
            <DialogDescription>
              Upload an Excel file (.xlsx, .xls) with columns: <span className="font-mono text-[12px]">empCode</span>, <span className="font-mono text-[12px]">name</span>, <span className="font-mono text-[12px]">email</span>. Passwords default to the employee code.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-black/10 dark:border-white/10 rounded-2xl p-8 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
              <FileSpreadsheet className="h-8 w-8 text-zinc-400" />
              <span className="text-[14px] font-medium text-zinc-700 dark:text-zinc-300">
                {bulkFile ? bulkFile.name : 'Click to choose Excel file'}
              </span>
              <span className="text-[12px] text-zinc-400">{bulkFile ? `${(bulkFile.size / 1024).toFixed(1)} KB` : 'All new users are created with the EMPLOYEE role'}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={e => setBulkFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {uploadResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 p-3">
                  <div className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> {uploadResult.success} succeeded
                  </div>
                  <div className="flex items-center gap-1.5 text-[13px] font-medium text-red-600 dark:text-red-400">
                    <XCircle className="h-4 w-4" /> {uploadResult.failed} failed
                  </div>
                </div>
                {uploadResult.errors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                    {uploadResult.errors.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 text-[12px]">
                        <span className="font-mono text-zinc-400 shrink-0">Row {e.row}</span>
                        <span className="font-mono text-zinc-500 shrink-0">{e.empCode}</span>
                        <span className="text-red-600 dark:text-red-400">{e.error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)} className="rounded-2xl">Close</Button>
            <Button onClick={handleBulkUpload} disabled={!bulkFile || uploading} className="rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
              {uploading ? 'Uploading…' : 'Upload & Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminTicketLayout>
  );
}
