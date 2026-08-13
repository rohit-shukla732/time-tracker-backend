'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HrAdminLayout } from '@/components/hr/HrAdminLayout';
import {
  Loader2,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserCog,
  Mail,
  CalendarDays,
  UserPlus,
  Pencil,
  Wallet,
  Upload,
  FileSpreadsheet,
  ListChecks,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface BalanceEntry {
  typeId: string;
  name: string;
  isPaid: boolean;
  monthlyCredit: number;
  earned: number;
  used: number;
  pending: number;
  available: number;
  withoutPay: number;
  carriedOver: number;
  openingBalance: number;
}

interface AttendanceTypeInfo {
  id: string;
  name: string;
  code: string;
  color: string;
  category: string;
}

interface EmployeeRow {
  id: string;
  name: string;
  email: string;
  role: string;
  manager: { id: string; name: string } | null;
  shiftGroup: { id: string; name: string; startTime: string; endTime: string } | null;
  isProbation: boolean;
  joinedAt: string;
  balances: BalanceEntry[];
  attendanceSummary: Record<string, number>;
}

interface ManagerOption {
  id: string;
  name: string;
  role: string;
}

const ROLE_STYLE: Record<string, string> = {
  ADMIN: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
  SENIOR_MANAGER: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  MANAGER: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  HR: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
  EMPLOYEE: 'bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400',
};

export default function HrEmployeesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [attendanceTypes, setAttendanceTypes] = useState<AttendanceTypeInfo[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [role, setRole] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [managerTarget, setManagerTarget] = useState<EmployeeRow | null>(null);
  const [selectedManager, setSelectedManager] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<EmployeeRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmployeeRow | null>(null);
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('EMPLOYEE');
  const [formManager, setFormManager] = useState('');
  const [formShiftGroup, setFormShiftGroup] = useState('');
  const [shiftGroups, setShiftGroups] = useState<
    { id: string; name: string; startTime: string; endTime: string }[]
  >([]);
  const [formPassword, setFormPassword] = useState('');
  const [formArchive, setFormArchive] = useState(false);
  const [formProbation, setFormProbation] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [openingTarget, setOpeningTarget] = useState<EmployeeRow | null>(null);
  const [openingTypes, setOpeningTypes] = useState<{ leaveTypeId: string; name: string; isPaid: boolean }[]>([]);
  const [openingValues, setOpeningValues] = useState<Record<string, string>>({});
  const [openingLoading, setOpeningLoading] = useState(false);
  const [openingSaving, setOpeningSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkMode, setBulkMode] = useState<'create' | 'update' | 'upsert'>('create');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; empCode: string; error: string }>;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditManager, setBulkEditManager] = useState('');
  const [bulkEditShift, setBulkEditShift] = useState('');
  const [bulkEditRole, setBulkEditRole] = useState('');
  const [bulkEditProbation, setBulkEditProbation] = useState('');
  const [bulkEditSaving, setBulkEditSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/hr/admin/login');
        return;
      }

      const params = new URLSearchParams({ page: String(page), year: String(year) });
      if (search.trim()) params.set('search', search.trim());
      if (role) params.set('role', role);

      const [balancesRes, usersRes] = await Promise.all([
        fetch(`/api/hr/leaves/balances?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
        fetch('/api/hr/users?limit=100', {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
      ]);

      if (balancesRes.status === 401 || balancesRes.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/hr/admin/login');
        return;
      }

      if (balancesRes.ok) {
        const data = await balancesRes.json();
        setRows(data.rows || []);
        setAttendanceTypes(data.attendanceTypes || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.totalCount || 0);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setManagers(data.managers || []);
      }
      const shiftRes = await fetch('/api/hr/shift-groups', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (shiftRes.ok) {
        const data = await shiftRes.json();
        setShiftGroups(data.groups || []);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  }, [router, page, search, role, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveManager = async () => {
    if (!managerTarget) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/hr/users/${managerTarget.id}/manager`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ managerId: selectedManager || null }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to assign manager');
        return;
      }

      toast.success(selectedManager ? 'Manager assigned' : 'Manager removed');
      setManagerTarget(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to assign manager');
    } finally {
      setSaving(false);
    }
  };

  const openManagerDialog = (row: EmployeeRow) => {
    setSelectedManager(row.manager?.id || '');
    setManagerTarget(row);
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error('Choose an Excel file first');
      return;
    }
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const formData = new FormData();
      formData.append('file', bulkFile);
      formData.append('mode', bulkMode);
      const response = await fetch('/api/hr/users/bulk-upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Upload failed');
        return;
      }
      setBulkResult(data.results);
      toast.success(data.message);
      fetchData();
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setBulkUploading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const pageIds = rows.map((r) => r.id);
      const allSelected = pageIds.length > 0 && pageIds.every((id) => prev.has(id));
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  useEffect(() => {
    if (!selectAllRef.current) return;
    const pageIds = rows.map((r) => r.id);
    const selectedCount = pageIds.filter((id) => selectedIds.has(id)).length;
    selectAllRef.current.indeterminate = selectedCount > 0 && selectedCount < pageIds.length;
  }, [rows, selectedIds]);

  const openBulkEdit = () => {
    setBulkEditManager('');
    setBulkEditShift('');
    setBulkEditRole('');
    setBulkEditProbation('');
    setBulkEditOpen(true);
  };

  const saveBulkEdit = async () => {
    if (selectedIds.size === 0) {
      toast.error('Select employees first (tick the checkboxes in the table)');
      return;
    }
    const payload: any = { userIds: [...selectedIds] };
    if (bulkEditManager === '__REMOVE__') payload.managerId = null;
    else if (bulkEditManager) payload.managerId = bulkEditManager;
    if (bulkEditShift === '__REMOVE__') payload.shiftGroupId = null;
    else if (bulkEditShift) payload.shiftGroupId = bulkEditShift;
    if (bulkEditRole) payload.role = bulkEditRole;
    if (bulkEditProbation !== '') payload.isProbation = bulkEditProbation === 'true';
    if (Object.keys(payload).length === 1) {
      toast.error('Pick at least one field to change');
      return;
    }

    setBulkEditSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/hr/users/bulk-edit', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Bulk edit failed');
        return;
      }
      toast.success(`Updated ${data.updated} employee(s)`);
      setBulkEditOpen(false);
      setSelectedIds(new Set());
      fetchData();
    } catch (error) {
      toast.error('Bulk edit failed');
    } finally {
      setBulkEditSaving(false);
    }
  };

  const openAddForm = () => {
    setEditTarget(null);
    setFormId('');
    setFormName('');
    setFormEmail('');
    setFormRole('EMPLOYEE');
    setFormManager('');
    setFormShiftGroup('');
    setFormPassword('');
    setFormArchive(false);
    setFormProbation(false);
    setFormOpen(true);
  };

  const openEditForm = (row: EmployeeRow) => {
    setEditTarget(row);
    setFormId(row.id);
    setFormName(row.name);
    setFormEmail(row.email);
    setFormRole(row.role);
    setFormManager(row.manager?.id || '');
    setFormShiftGroup(row.shiftGroup?.id || '');
    setFormPassword('');
    setFormArchive(false);
    setFormProbation(row.isProbation);
    setFormOpen(true);
  };

  const saveEmployee = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      setFormSaving(true);
      const isEdit = !!editTarget;
      const payload: any = {
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        managerId: formManager || null,
        shiftGroupId: formShiftGroup || null,
      };
      if (!isEdit) {
        payload.id = formId.trim();
        payload.isProbation = formProbation;
        if (formPassword.trim()) payload.password = formPassword.trim();
      } else {
        if (formPassword.trim()) payload.password = formPassword.trim();
        if (formArchive) payload.isArchived = true;
        if (formProbation !== editTarget.isProbation) payload.isProbation = formProbation;
      }

      const response = await fetch(
        isEdit ? `/api/hr/users/${editTarget.id}` : '/api/hr/users',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to save employee');
        return;
      }

      toast.success(isEdit ? 'Employee updated' : 'Employee created');
      setFormOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save employee');
    } finally {
      setFormSaving(false);
    }
  };

  const openOpeningDialog = async (row: EmployeeRow) => {
    try {
      setOpeningTarget(row);
      setOpeningLoading(true);
      setOpeningValues({});
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `/api/hr/users/${row.id}/opening-balances?year=${new Date().getFullYear()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }
      );
      if (response.ok) {
        const data = await response.json();
        setOpeningTypes(data.balances || []);
        const vals: Record<string, string> = {};
        for (const b of data.balances || []) {
          if (b.balance > 0) vals[b.leaveTypeId] = String(b.balance);
        }
        setOpeningValues(vals);
      } else {
        toast.error('Failed to load opening balances');
        setOpeningTarget(null);
      }
    } catch (error) {
      toast.error('Failed to load opening balances');
      setOpeningTarget(null);
    } finally {
      setOpeningLoading(false);
    }
  };

  const saveOpeningBalances = async () => {
    if (!openingTarget) return;
    try {
      setOpeningSaving(true);
      const token = localStorage.getItem('accessToken');
      const balances = openingTypes.map((t) => ({
        leaveTypeId: t.leaveTypeId,
        balance: openingValues[t.leaveTypeId] ? parseFloat(openingValues[t.leaveTypeId]) : 0,
      }));
      const response = await fetch(`/api/hr/users/${openingTarget.id}/opening-balances`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ balances }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to save opening balances');
        return;
      }
      toast.success('Opening balance saved — monthly accrual and rollover continue from here');
      setOpeningTarget(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to save opening balances');
    } finally {
      setOpeningSaving(false);
    }
  };

  const allTypeIds = Array.from(new Set(rows.flatMap((r) => r.balances.map((b) => b.typeId))));

  return (
    <HrAdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
              Employees & Balances
            </h1>
            <p className="text-[19px] text-zinc-500 dark:text-zinc-400 font-light">
              Leave balances, reporting managers and employee details.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={openBulkEdit}
              className="h-11 px-5 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-[14px]"
            >
              <ListChecks className="h-4 w-4" />
              Bulk Edit
              {selectedIds.size > 0 && (
                <span className="ml-0.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-bold px-1.5 py-0.5">
                  {selectedIds.size}
                </span>
              )}
            </Button>
            <Button
              onClick={() => {
                setBulkOpen(true);
                setBulkFile(null);
                setBulkResult(null);
                setBulkMode('create');
              }}
              className="h-11 px-5 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-[14px]"
            >
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
            <Button
              onClick={openAddForm}
              className="h-11 px-5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium text-[14px]"
            >
              <UserPlus className="h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="h-4 w-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearch(searchInput);
                  setPage(1);
                }
              }}
              placeholder="Search by name, email or code..."
              className="w-full h-11 pl-11 pr-4 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
            />
          </div>

          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="h-11 px-4 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
          >
            <option value="">All roles</option>
            <option value="ADMIN">Admin</option>
            <option value="SENIOR_MANAGER">Senior Manager</option>
            <option value="MANAGER">Manager</option>
            <option value="HR">HR</option>
            <option value="EMPLOYEE">Employee</option>
          </select>

          <select
            value={year}
            onChange={(e) => {
              setYear(parseInt(e.target.value));
              setPage(1);
            }}
            className="h-11 px-4 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
          >
            {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-24 text-center">
            <Users className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
            <p className="text-[16px] font-medium text-zinc-500 dark:text-zinc-400">No employees found</p>
            <p className="text-[14px] text-zinc-400 dark:text-zinc-500 mt-1">Try adjusting the filters.</p>
          </div>
        ) : (
          <>
            <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-black/[0.04] dark:border-white/[0.04]">
                      <th className="px-5 py-3.5 w-12">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={rows.length > 0 && rows.every((r) => selectedIds.has(r.id))}
                          onChange={toggleSelectAll}
                          title="Select all on this page"
                          className="h-4 w-4 rounded accent-zinc-900 dark:accent-white cursor-pointer"
                        />
                      </th>
                      <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Employee
                      </th>
                      <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Role
                      </th>
                      <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Manager
                      </th>
                      {allTypeIds.length > 0 && (
                        <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                          Balance
                        </th>
                      )}
                      <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <EmployeeTableRow
                        key={row.id}
                        row={row}
                        expanded={expandedId === row.id}
                        year={year}
                        attendanceTypes={attendanceTypes}
                        selected={selectedIds.has(row.id)}
                        onSelect={() => toggleSelect(row.id)}
                        onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
                        onAssignManager={() => openManagerDialog(row)}
                        onEdit={() => openEditForm(row)}
                        onOpening={() => openOpeningDialog(row)}
                        onViewDetails={() => setDetailsTarget(row)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                {totalCount} employee(s) · Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Assign manager dialog */}
      <Dialog open={!!managerTarget} onOpenChange={(open) => !open && setManagerTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="text-[18px] tracking-tight">Assign manager</DialogTitle>
            <DialogDescription className="text-[14px]">
              {managerTarget
                ? `Choose the reporting manager for ${managerTarget.name} (${managerTarget.id}). Their leave requests will go to this person for approval.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">Manager</label>
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="w-full h-[50px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
            >
              <option value="">No manager (HR handles approvals)</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id} · {m.role})
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setManagerTarget(null)}
              disabled={saving}
              className="h-11 px-5 rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={saveManager}
              disabled={saving}
              className="h-11 px-5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee add/edit dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
        <DialogContent className="sm:max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="text-[18px] tracking-tight">
              {editTarget ? `Edit ${editTarget.id}` : 'Add Employee'}
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              {editTarget
                ? 'Update employee details. Leave password blank to keep the current one.'
                : 'Create a new employee. Password defaults to the employee code.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">
                  Employee Code {!editTarget && <span className="text-zinc-400">(optional)</span>}
                </label>
                <input
                  value={formId}
                  onChange={(e) => setFormId(e.target.value.toUpperCase())}
                  disabled={!!editTarget}
                  placeholder={editTarget ? editTarget.id : 'e.g. ACE334 (auto if blank)'}
                  className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 disabled:opacity-50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="SENIOR_MANAGER">Senior Manager</option>
                  <option value="HR">HR</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Full Name</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Jane Cooper"
                className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Email</label>
              <input
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="e.g. jane.cooper@acehcs.com"
                type="email"
                className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">
                  Manager <span className="text-zinc-400">(optional)</span>
                </label>
                <select
                  value={formManager}
                  onChange={(e) => setFormManager(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                >
                  <option value="">No manager</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">
                  Shift group <span className="text-zinc-400">(optional)</span>
                </label>
                <select
                  value={formShiftGroup}
                  onChange={(e) => setFormShiftGroup(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                >
                  <option value="">Default shift</option>
                  {shiftGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.startTime}–{g.endTime})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">
                  Password <span className="text-zinc-400">(optional)</span>
                </label>
                <input
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editTarget ? 'Keep current' : 'Defaults to employee code'}
                  type="password"
                  className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                />
              </div>
            </div>

            {editTarget && (
              <label className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-black/[0.04] dark:border-white/[0.04] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formArchive}
                  onChange={(e) => setFormArchive(e.target.checked)}
                  className="h-4 w-4 rounded accent-zinc-900 dark:accent-white"
                />
                <span className="text-[13px] text-zinc-600 dark:text-zinc-300">
                  Archive this employee (removes from active lists)
                </span>
              </label>
            )}

            <label className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-black/[0.04] dark:border-white/[0.04] cursor-pointer">
              <input
                type="checkbox"
                checked={formProbation}
                onChange={(e) => setFormProbation(e.target.checked)}
                className="h-4 w-4 rounded accent-zinc-900 dark:accent-white"
              />
              <span className="text-[13px] text-zinc-600 dark:text-zinc-300">
                On probation (no monthly leave accrual · 45 min late grace)
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={saveEmployee}
              disabled={formSaving || !formName.trim() || !formEmail.trim()}
              className="rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              {formSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editTarget ? 'Save Changes' : 'Create Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk upload dialog */}
      <Dialog open={bulkOpen} onOpenChange={(open) => !open && setBulkOpen(false)}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="text-[18px] tracking-tight">Bulk Upload Employees</DialogTitle>
            <DialogDescription className="text-[14px]">
              Upload an Excel file (.xlsx, .xls). Columns:{' '}
              <span className="font-mono text-[12px]">empCode</span>
              {bulkMode !== 'create' && <span className="text-zinc-400"> (required)</span>},{' '}
              <span className="font-mono text-[12px]">name</span>,{' '}
              <span className="font-mono text-[12px]">email</span>,{' '}
              <span className="font-mono text-[12px]">role</span> (optional),{' '}
              <span className="font-mono text-[12px]">managerCode</span> (optional),{' '}
              <span className="font-mono text-[12px]">shiftGroup</span> (optional — shift group name),{' '}
              <span className="font-mono text-[12px]">password</span> (optional),{' '}
              <span className="font-mono text-[12px]">probation</span> (optional). Passwords default to
              the employee code.
              {bulkMode === 'update' &&
                ' Only columns present in the file are changed — empty name/email/role/password are skipped, empty managerCode/shiftGroup remove the assignment.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-zinc-100/60 dark:bg-zinc-800/60">
              {(
                [
                  ['create', 'Create new'],
                  ['update', 'Update only'],
                  ['upsert', 'Create + update'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setBulkMode(value)}
                  className={`h-9 rounded-xl text-[13px] font-medium transition-colors ${
                    bulkMode === value
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-black/10 dark:border-white/10 rounded-2xl p-8 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
              <FileSpreadsheet className="h-8 w-8 text-zinc-400" />
              <span className="text-[14px] font-medium text-zinc-700 dark:text-zinc-300">
                {bulkFile ? bulkFile.name : 'Click to choose Excel file'}
              </span>
              <span className="text-[12px] text-zinc-400">
                {bulkFile
                  ? `${(bulkFile.size / 1024).toFixed(1)} KB`
                  : bulkMode === 'update'
                    ? 'empCode must match an existing employee'
                    : 'Role defaults to EMPLOYEE'}
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {bulkResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 p-3">
                  <div className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> {bulkResult.success} succeeded
                  </div>
                  <div className="flex items-center gap-1.5 text-[13px] font-medium text-red-600 dark:text-red-400">
                    <XCircle className="h-4 w-4" /> {bulkResult.failed} failed
                  </div>
                </div>
                {bulkResult.errors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                    {bulkResult.errors.map((e, i) => (
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
            <Button
              variant="outline"
              onClick={() => setBulkOpen(false)}
              className="h-11 px-5 rounded-2xl"
            >
              Close
            </Button>
            <Button
              onClick={handleBulkUpload}
              disabled={!bulkFile || bulkUploading}
              className="h-11 px-5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100"
            >
              {bulkUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {bulkUploading ? 'Uploading…' : 'Upload & Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk edit dialog */}
      <Dialog open={bulkEditOpen} onOpenChange={(open) => !open && setBulkEditOpen(false)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="text-[18px] tracking-tight">Bulk Edit Employees</DialogTitle>
            <DialogDescription className="text-[14px]">
              Apply the same manager, shift group, role or probation status to{' '}
              {selectedIds.size > 0 ? (
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {selectedIds.size} selected employee(s)
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">no selected employees</span>
              )}
              . Fields left on “No change” are untouched.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Manager</label>
              <select
                value={bulkEditManager}
                onChange={(e) => setBulkEditManager(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
              >
                <option value="">No change</option>
                <option value="__REMOVE__">No manager (remove)</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.id} · {m.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Shift group</label>
              <select
                value={bulkEditShift}
                onChange={(e) => setBulkEditShift(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
              >
                <option value="">No change</option>
                <option value="__REMOVE__">Default shift (remove)</option>
                {shiftGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.startTime}–{g.endTime})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Role</label>
                <select
                  value={bulkEditRole}
                  onChange={(e) => setBulkEditRole(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                >
                  <option value="">No change</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="SENIOR_MANAGER">Senior Manager</option>
                  <option value="HR">HR</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">Probation</label>
                <select
                  value={bulkEditProbation}
                  onChange={(e) => setBulkEditProbation(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                >
                  <option value="">No change</option>
                  <option value="true">On probation</option>
                  <option value="false">Not on probation</option>
                </select>
              </div>
            </div>
            {selectedIds.size === 0 && (
              <p className="text-[13px] text-amber-600 dark:text-amber-400">
                No employees selected yet — tick the checkboxes in the table first.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkEditOpen(false)}
              disabled={bulkEditSaving}
              className="h-11 px-5 rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={saveBulkEdit}
              disabled={bulkEditSaving || selectedIds.size === 0}
              className="h-11 px-5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100"
            >
              {bulkEditSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
              {bulkEditSaving ? 'Applying…' : `Apply to ${selectedIds.size} employee(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Opening balance dialog */}
      <Dialog
        open={!!openingTarget}
        onOpenChange={(open) => !open && setOpeningTarget(null)}
      >
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="text-[18px] tracking-tight">
              Opening Balance — {openingTarget?.name}
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              Enter the leave days this employee already has for {new Date().getFullYear()}. Set it once —
              the system accrues monthly credit and rolls over unused days from here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {openingLoading ? (
              <div className="flex items-center justify-center py-10 text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : openingTypes.length === 0 ? (
              <p className="text-[13px] text-zinc-400 text-center py-8">
                No active leave types yet.
              </p>
            ) : (
              openingTypes.map((t) => (
                <div
                  key={t.leaveTypeId}
                  className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-black/[0.04] dark:border-white/[0.04]"
                >
                  <div>
                    <p className="text-[14px] font-medium text-zinc-900 dark:text-white">{t.name}</p>
                    <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
                      {t.isPaid ? 'Paid' : 'Unpaid'} · days for {new Date().getFullYear()}
                    </p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={openingValues[t.leaveTypeId] || ''}
                    onChange={(e) =>
                      setOpeningValues({ ...openingValues, [t.leaveTypeId]: e.target.value })
                    }
                    placeholder="0"
                    className="w-24 h-10 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 text-right"
                  />
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpeningTarget(null)}
              disabled={openingSaving}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={saveOpeningBalances}
              disabled={openingSaving || openingLoading}
              className="rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              {openingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee details dialog */}
      <Dialog open={!!detailsTarget} onOpenChange={(open) => !open && setDetailsTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="text-[18px] tracking-tight">{detailsTarget?.name}</DialogTitle>
            <DialogDescription className="text-[14px]">
              {detailsTarget ? `${detailsTarget.id} · ${detailsTarget.role}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 text-[14px]">
              <p className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                <Mail className="h-4 w-4 text-zinc-400" />
                {detailsTarget?.email}
              </p>
              <p className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                <CalendarDays className="h-4 w-4 text-zinc-400" />
                Joined{' '}
                {detailsTarget
                  ? new Date(detailsTarget.joinedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : ''}
              </p>
              <p className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                <UserCog className="h-4 w-4 text-zinc-400" />
                Manager: {detailsTarget?.manager?.name || 'None (HR handles approvals)'}
              </p>
              <p className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                <CalendarDays className="h-4 w-4 text-zinc-400" />
                Shift:{' '}
                {detailsTarget?.shiftGroup
                  ? `${detailsTarget.shiftGroup.name} (${detailsTarget.shiftGroup.startTime}–${detailsTarget.shiftGroup.endTime})`
                  : 'Default shift'}
              </p>
            </div>

            <div className="border-t border-black/[0.04] dark:border-white/[0.04] pt-4 space-y-3">
              <p className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                Leave balance — {year}
              </p>
              {detailsTarget?.balances.length === 0 && (
                <p className="text-[13px] text-zinc-400">No active leave types.</p>
              )}
              {detailsTarget?.balances.map((b) => (
                <div
                  key={b.typeId}
                  className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[14px] font-semibold text-zinc-900 dark:text-white">{b.name}</p>
                    <p className="text-[16px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {b.available} left
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${b.earned === 0 ? 0 : Math.min(100, (b.used / b.earned) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[12px] text-zinc-500 dark:text-zinc-400">
                    <span>{b.used} used</span>
                    <span>{b.pending} pending</span>
                    <span>{b.earned} accrued</span>
                  </div>
                  {(b.openingBalance > 0 || b.carriedOver > 0) && (
                    <p className="text-[12px] text-emerald-600 dark:text-emerald-400 mt-1.5">
                      {b.openingBalance > 0 && `${b.openingBalance} opening balance`}
                      {b.openingBalance > 0 && b.carriedOver > 0 && ' · '}
                      {b.carriedOver > 0 && `${b.carriedOver} carried over`}
                    </p>
                  )}
                  {b.withoutPay > 0 && (
                    <p className="text-[12px] text-amber-600 dark:text-amber-400 mt-1.5">
                      {b.withoutPay} day(s) without pay
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-black/[0.04] dark:border-white/[0.04] pt-4">
              <p className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                Attendance — {year}
              </p>
              {attendanceTypes.filter((t) => (detailsTarget?.attendanceSummary[t.code] || 0) > 0).length === 0 ? (
                <p className="text-[13px] text-zinc-400 mt-2">No attendance records for {year} yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {attendanceTypes
                    .filter((t) => (detailsTarget?.attendanceSummary[t.code] || 0) > 0)
                    .map((t) => {
                      const count = detailsTarget?.attendanceSummary[t.code] || 0;
                      return (
                        <span
                          key={t.id}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border"
                          style={{
                            color: t.color,
                            backgroundColor: t.color + '0f',
                            borderColor: t.color + '33',
                          }}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.name}: {count}
                        </span>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </HrAdminLayout>
  );
}

function EmployeeTableRow({
  row,
  expanded,
  year,
  attendanceTypes,
  selected,
  onSelect,
  onToggle,
  onAssignManager,
  onEdit,
  onOpening,
  onViewDetails,
}: {
  row: EmployeeRow;
  expanded: boolean;
  year: number;
  attendanceTypes: AttendanceTypeInfo[];
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onAssignManager: () => void;
  onEdit: () => void;
  onOpening: () => void;
  onViewDetails: () => void;
}) {
  return (
    <>
      <tr
        className={`border-b border-black/[0.04] dark:border-white/[0.04] transition-colors cursor-pointer ${
          selected ? 'bg-zinc-100/70 dark:bg-zinc-800/60' : 'hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30'
        }`}
        onClick={onToggle}
      >
        <td className="px-5 py-4 w-12">
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded accent-zinc-900 dark:accent-white cursor-pointer"
          />
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[13px] font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
              {row.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-zinc-900 dark:text-white">{row.name}</p>
              <p className="text-[12px] text-zinc-400 dark:text-zinc-500">{row.id}</p>
            </div>
          </div>
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${ROLE_STYLE[row.role] || ROLE_STYLE.EMPLOYEE}`}>
              {row.role}
            </span>
            {row.isProbation && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                Probation
              </span>
            )}
            {row.shiftGroup && (
              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400"
                title={`${row.shiftGroup.name}: ${row.shiftGroup.startTime}–${row.shiftGroup.endTime}`}
              >
                {row.shiftGroup.name}
              </span>
            )}
          </div>
        </td>
        <td className="px-5 py-4">
          <p className="text-[13px] text-zinc-600 dark:text-zinc-300">
            {row.manager?.name || <span className="text-zinc-400 dark:text-zinc-500">No manager</span>}
          </p>
        </td>
        {row.balances.length > 0 && (
          <td className="px-5 py-4">
            {row.isProbation && (
              <p className="mb-1.5 inline-flex px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 text-[10.5px] font-semibold uppercase tracking-wide">
                Probation — no accrual
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {row.balances.map((b) => (
                <span
                  key={b.typeId}
                  className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[12px] font-medium text-zinc-600 dark:text-zinc-300"
                  title={
                    b.withoutPay > 0
                      ? `${b.name}: ${b.available} available / ${b.used} used / ${b.earned} accrued / ${b.withoutPay} without pay`
                      : `${b.name}: ${b.available} available / ${b.used} used / ${b.earned} accrued`
                  }
                >
                  {b.name.split(' ')[0]}: {b.available}
                </span>
              ))}
            </div>
          </td>
        )}
        <td className="px-5 py-4">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAssignManager();
              }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <UserCog className="h-3.5 w-3.5" />
              Manager
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpening();
              }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <Wallet className="h-3.5 w-3.5" />
              Balance
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Details
            </button>
            <ChevronDown
              className={`h-4 w-4 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-black/[0.04] dark:border-white/[0.04] bg-zinc-50/50 dark:bg-zinc-800/20">
          <td colSpan={row.balances.length > 0 ? 6 : 5} className="px-8 py-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {row.balances.map((b) => (
                <div
                  key={b.typeId}
                  className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04]"
                >
                  <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">{b.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {b.earned} accrued · {b.used} used
                    </span>
                    <span className="text-[16px] font-semibold text-zinc-900 dark:text-white">
                      {b.available}
                      <span className="text-[11px] text-zinc-400 font-medium"> left</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${b.earned === 0 ? 0 : Math.min(100, (b.used / b.earned) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5">
                    {b.openingBalance > 0 && `${b.openingBalance} opening · `}
                    {b.carriedOver > 0 && `${b.carriedOver} carried over · `}
                    {b.withoutPay > 0
                      ? `${b.withoutPay} without pay`
                      : b.pending > 0
                        ? `${b.pending} pending`
                        : `${b.monthlyCredit} day(s)/month`}
                  </p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Attendance — {year}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {attendanceTypes
                  .filter((t) => (row.attendanceSummary[t.code] || 0) > 0)
                  .map((t) => {
                    const count = row.attendanceSummary[t.code] || 0;
                    return (
                      <span
                        key={t.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border"
                        style={{
                          color: t.color,
                          backgroundColor: t.color + '0f',
                          borderColor: t.color + '33',
                        }}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                        {t.name}: {count}
                      </span>
                    );
                  })}
                {attendanceTypes.filter((t) => (row.attendanceSummary[t.code] || 0) > 0).length === 0 && (
                  <p className="text-[12px] text-zinc-400">No attendance records for {year} yet.</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
