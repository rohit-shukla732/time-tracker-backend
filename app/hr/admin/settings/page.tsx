'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HrAdminLayout } from '@/components/hr/HrAdminLayout';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Settings,
  CircleDollarSign,
  CalendarClock,
  Palette,
  Briefcase,
  Lock,
  Bell,
  Save,
  RefreshCcw,
  Clock,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  monthlyCredit: number;
  isPaid: boolean;
  active: boolean;
  rolloverMonthly: boolean;
  rolloverYearly: boolean;
  createdAt: string;
  _count: { requests: number };
}

interface TypeForm {
  id?: string;
  name: string;
  description: string;
  monthlyCredit: string;
  isPaid: boolean;
  active: boolean;
  rolloverMonthly: boolean;
  rolloverYearly: boolean;
}

const EMPTY_FORM: TypeForm = {
  name: '',
  description: '',
  monthlyCredit: '1',
  isPaid: true,
  active: true,
  rolloverMonthly: true,
  rolloverYearly: false,
};

interface AttendanceType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: string;
  color: string;
  isPaid: boolean;
  isWorking: boolean;
  active: boolean;
  isSystem: boolean;
  sortOrder: number;
}

interface AttTypeForm {
  id?: string;
  name: string;
  code: string;
  description: string;
  category: string;
  color: string;
  isPaid: boolean;
  isWorking: boolean;
  active: boolean;
  sortOrder: string;
}

const EMPTY_ATT_FORM: AttTypeForm = {
  name: '',
  code: '',
  description: '',
  category: 'OTHER',
  color: '#10b981',
  isPaid: true,
  isWorking: false,
  active: true,
  sortOrder: '0',
};

const CATEGORIES = ['PRESENT', 'LEAVE', 'HOLIDAY', 'WEEKEND', 'OTHER'];

interface NotificationSettingItem {
  eventType: string;
  label: string;
  notifyEmployee: boolean;
  notifyManager: boolean;
  notifyHR: boolean;
  extraEmails: string[];
}

export default function HrSettingsPage() {
  const router = useRouter();
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TypeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeaveType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [attTypes, setAttTypes] = useState<AttendanceType[]>([]);
  const [attLoading, setAttLoading] = useState(true);
  const [attDialogOpen, setAttDialogOpen] = useState(false);
  const [attForm, setAttForm] = useState<AttTypeForm>(EMPTY_ATT_FORM);
  const [attSaving, setAttSaving] = useState(false);
  const [attDeleteTarget, setAttDeleteTarget] = useState<AttendanceType | null>(null);
  const [attDeleting, setAttDeleting] = useState(false);

  const [notifSettings, setNotifSettings] = useState<NotificationSettingItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  interface BiometricConfigForm {
    enabled: boolean;
    sourceUrl: string;
    sourceToken: string;
    sourceApiKey: string;
    pollIntervalMinutes: string;
    shiftStart: string;
    shiftEnd: string;
    halfDayThresholdMin: string;
    lateGraceMinutes: string;
    probationLateGraceMinutes: string;
    autoApply: boolean;
    lastRunStatus: string | null;
    lastRunMessage: string | null;
    lastRunAt: string | null;
  }

  const [bioForm, setBioForm] = useState<BiometricConfigForm>({
    enabled: false,
    sourceUrl: '',
    sourceToken: '',
    sourceApiKey: '',
    pollIntervalMinutes: '15',
    shiftStart: '10:00',
    shiftEnd: '19:00',
    halfDayThresholdMin: '60',
    lateGraceMinutes: '60',
    probationLateGraceMinutes: '45',
    autoApply: true,
    lastRunStatus: null,
    lastRunMessage: null,
    lastRunAt: null,
  });
  const [bioLoading, setBioLoading] = useState(true);
  const [bioSaving, setBioSaving] = useState(false);
  const [bioRunning, setBioRunning] = useState(false);
  const [bioImportFrom, setBioImportFrom] = useState('');
  const [bioReapply, setBioReapply] = useState(false);

  const [bioMappings, setBioMappings] = useState<{ id: string; userId: string; user: { id: string; name: string; email: string } }[]>([]);
  const [mappingExternal, setMappingExternal] = useState('');
  const [mappingUser, setMappingUser] = useState('');
  const [mappingUsers, setMappingUsers] = useState<{ id: string; name: string }[]>([]);

  const [shiftGroups, setShiftGroups] = useState<
    { id: string; name: string; startTime: string; endTime: string; isDefault: boolean; _count: { users: number } }[]
  >([]);
  const [shiftGroupLoading, setShiftGroupLoading] = useState(true);
  const [shiftFormName, setShiftFormName] = useState('');
  const [shiftFormStart, setShiftFormStart] = useState('');
  const [shiftFormEnd, setShiftFormEnd] = useState('');
  const [shiftFormDefault, setShiftFormDefault] = useState(false);
  const [shiftSaving, setShiftSaving] = useState(false);
  const [shiftDeleting, setShiftDeleting] = useState<string | null>(null);

  const fetchBioConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const response = await fetch('/api/hr/biometric/config', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const c = data.config;
        setBioForm({
          enabled: c.enabled,
          sourceUrl: c.sourceUrl || '',
          sourceToken: c.sourceToken || '',
          sourceApiKey: c.sourceApiKey || '',
          pollIntervalMinutes: String(c.pollIntervalMinutes),
          shiftStart: c.shiftStart,
          shiftEnd: c.shiftEnd,
          halfDayThresholdMin: String(c.halfDayThresholdMin),
          lateGraceMinutes: String(c.lateGraceMinutes),
          probationLateGraceMinutes: String(c.probationLateGraceMinutes),
          autoApply: c.autoApply,
          lastRunStatus: c.lastRunStatus,
          lastRunMessage: c.lastRunMessage,
          lastRunAt: c.lastRunAt,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setBioLoading(false);
    }
  }, []);

  const fetchBioMappings = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const [m, u] = await Promise.all([
        fetch('/api/hr/biometric/mappings', {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
        fetch('/api/hr/users?limit=500', {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }),
      ]);
      if (m.ok) {
        const data = await m.json();
        setBioMappings(data.mappings || []);
      }
      if (u.ok) {
        const data = await u.json();
        setMappingUsers(data.users || []);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchShiftGroups = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const response = await fetch('/api/hr/shift-groups', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setShiftGroups(data.groups || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setShiftGroupLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBioConfig();
    fetchBioMappings();
    fetchShiftGroups();
  }, [fetchBioConfig, fetchBioMappings, fetchShiftGroups]);

  const saveShiftGroup = async () => {
    try {
      setShiftSaving(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/hr/shift-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          name: shiftFormName.trim(),
          startTime: shiftFormStart,
          endTime: shiftFormEnd,
          isDefault: shiftFormDefault,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to create shift group');
        return;
      }
      toast.success('Shift group created');
      setShiftFormName('');
      setShiftFormStart('');
      setShiftFormEnd('');
      setShiftFormDefault(false);
      fetchShiftGroups();
    } catch (error) {
      toast.error('Failed to create shift group');
    } finally {
      setShiftSaving(false);
    }
  };

  const setDefaultShiftGroup = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/hr/shift-groups/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to set default shift');
        return;
      }
      toast.success('Default shift updated');
      fetchShiftGroups();
    } catch (error) {
      toast.error('Failed to set default shift');
    }
  };

  const deleteShiftGroup = async (id: string) => {
    try {
      setShiftDeleting(id);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/hr/shift-groups/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to delete shift group');
        return;
      }
      toast.success('Shift group deleted');
      fetchShiftGroups();
    } catch (error) {
      toast.error('Failed to delete shift group');
    } finally {
      setShiftDeleting(null);
    }
  };

  const saveBioConfig = async () => {
    try {
      setBioSaving(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/hr/biometric/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          enabled: bioForm.enabled,
          sourceUrl: bioForm.sourceUrl,
          sourceToken: bioForm.sourceToken,
          sourceApiKey: bioForm.sourceApiKey,
          pollIntervalMinutes: bioForm.pollIntervalMinutes,
          shiftStart: bioForm.shiftStart,
          shiftEnd: bioForm.shiftEnd,
          halfDayThresholdMin: bioForm.halfDayThresholdMin,
          lateGraceMinutes: bioForm.lateGraceMinutes,
          probationLateGraceMinutes: bioForm.probationLateGraceMinutes,
          autoApply: bioForm.autoApply,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to save biometric settings');
        return;
      }
      toast.success('Biometric settings saved');
      fetchBioConfig();
    } catch (error) {
      toast.error('Failed to save biometric settings');
    } finally {
      setBioSaving(false);
    }
  };

  const runBioImport = async () => {
    try {
      setBioRunning(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/hr/biometric/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          ...(bioImportFrom ? { fromDate: bioImportFrom } : {}),
          ...(bioReapply ? { reapply: true } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Import failed');
        return;
      }
      const r = data.result;
      if (r.status === 'disabled') {
        toast.info(r.message || 'Biometric sync is disabled');
      } else {
        toast.success(
          `Import ${bioImportFrom ? `from ${bioImportFrom} ` : ''}done: ${r.recordsCreated} record(s) ${bioReapply ? 're-applied' : 'marked'} (${r.present} present, ${r.halfDay} half-day, ${r.unapproved + r.unapprovedWithoutPay} unapproved), ${r.punchesStored} punch(es) stored`
        );
      }
      setBioImportFrom('');
      setBioReapply(false);
      fetchBioConfig();
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setBioRunning(false);
    }
  };

  const addMapping = async () => {
    if (!mappingExternal.trim() || !mappingUser) {
      toast.error('Select an employee and enter the biometric ID');
      return;
    }
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/hr/biometric/mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ externalId: mappingExternal, userId: mappingUser }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to add mapping');
        return;
      }
      toast.success('Mapping added');
      setMappingExternal('');
      setMappingUser('');
      fetchBioMappings();
    } catch (error) {
      toast.error('Failed to add mapping');
    }
  };

  const removeMapping = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/hr/biometric/mappings/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) {
        toast.error('Failed to remove mapping');
        return;
      }
      toast.success('Mapping removed');
      fetchBioMappings();
    } catch (error) {
      toast.error('Failed to remove mapping');
    }
  };

  const fetchTypes = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/hr/admin/login');
        return;
      }

      const response = await fetch('/api/hr/leave-types', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/hr/admin/login');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch leave types');

      const data = await response.json();
      setTypes(data.types || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load leave types');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const fetchAttTypes = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/hr/admin/login');
        return;
      }

      const response = await fetch('/api/hr/attendance/types', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/hr/admin/login');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch attendance types');

      const data = await response.json();
      setAttTypes(data.types || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load attendance types');
    } finally {
      setAttLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAttTypes();
  }, [fetchAttTypes]);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('Please log in to continue');
        router.push('/hr/admin/login');
        return;
      }

      const response = await fetch('/api/hr/notification-settings', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/hr/admin/login');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch notification settings');

      const data = await response.json();
      setNotifSettings(data.settings || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load notification settings');
    } finally {
      setNotifLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const saveNotifications = async () => {
    setNotifSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/hr/notification-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(notifSettings),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to save notification settings');
        return;
      }

      toast.success('Notification settings saved');
    } catch (error) {
      toast.error('Failed to save notification settings');
    } finally {
      setNotifSaving(false);
    }
  };

  const updateNotif = (eventType: string, patch: Partial<NotificationSettingItem>) => {
    setNotifSettings((prev) =>
      prev.map((s) => (s.eventType === eventType ? { ...s, ...patch } : s))
    );
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (t: LeaveType) => {
    setForm({
      id: t.id,
      name: t.name,
      description: t.description || '',
      monthlyCredit: String(t.monthlyCredit),
      isPaid: t.isPaid,
      active: t.active,
      rolloverMonthly: t.rolloverMonthly,
      rolloverYearly: t.rolloverYearly,
    });
    setDialogOpen(true);
  };

  const saveType = async () => {
    if (!form.name.trim()) {
      toast.error('Leave type name is required');
      return;
    }
    const credit = Number(form.monthlyCredit);
    if (isNaN(credit) || credit < 0) {
      toast.error('Monthly credit must be a positive number');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = form.id ? `/api/hr/leave-types/${form.id}` : '/api/hr/leave-types';
      const response = await fetch(url, {
        method: form.id ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          monthlyCredit: credit,
          isPaid: form.isPaid,
          active: form.active,
          rolloverMonthly: form.rolloverMonthly,
          rolloverYearly: form.rolloverYearly,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to save leave type');
        return;
      }

      toast.success(form.id ? 'Leave type updated' : 'Leave type created');
      setDialogOpen(false);
      fetchTypes();
    } catch (error) {
      toast.error('Failed to save leave type');
    } finally {
      setSaving(false);
    }
  };

  const deleteType = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/hr/leave-types/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to delete leave type');
        return;
      }

      toast.success(
        data.deactivated
          ? 'Leave type deactivated (it has requests, so it was preserved for history)'
          : 'Leave type deleted'
      );
      setDeleteTarget(null);
      fetchTypes();
    } catch (error) {
      toast.error('Failed to delete leave type');
    } finally {
      setDeleting(false);
    }
  };

  const openAttCreate = () => {
    setAttForm(EMPTY_ATT_FORM);
    setAttDialogOpen(true);
  };

  const openAttEdit = (t: AttendanceType) => {
    setAttForm({
      id: t.id,
      name: t.name,
      code: t.code,
      description: t.description || '',
      category: t.category,
      color: t.color,
      isPaid: t.isPaid,
      isWorking: t.isWorking,
      active: t.active,
      sortOrder: String(t.sortOrder),
    });
    setAttDialogOpen(true);
  };

  const saveAttType = async () => {
    if (!attForm.name.trim() || !attForm.code.trim()) {
      toast.error('Name and code are required');
      return;
    }

    setAttSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const url = attForm.id ? `/api/hr/attendance/types/${attForm.id}` : '/api/hr/attendance/types';
      const response = await fetch(url, {
        method: attForm.id ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          name: attForm.name.trim(),
          code: attForm.code.trim(),
          description: attForm.description.trim(),
          category: attForm.category,
          color: attForm.color,
          isPaid: attForm.isPaid,
          isWorking: attForm.isWorking,
          active: attForm.active,
          sortOrder: Number(attForm.sortOrder) || 0,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to save attendance type');
        return;
      }

      toast.success(attForm.id ? 'Attendance type updated' : 'Attendance type created');
      setAttDialogOpen(false);
      fetchAttTypes();
    } catch (error) {
      toast.error('Failed to save attendance type');
    } finally {
      setAttSaving(false);
    }
  };

  const deleteAttType = async () => {
    if (!attDeleteTarget) return;
    setAttDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/hr/attendance/types/${attDeleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Failed to delete attendance type');
        return;
      }

      toast.success('Attendance type deleted');
      setAttDeleteTarget(null);
      fetchAttTypes();
    } catch (error) {
      toast.error('Failed to delete attendance type');
    } finally {
      setAttDeleting(false);
    }
  };

  return (
    <HrAdminLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
              Leave Settings
            </h1>
            <p className="text-[19px] text-zinc-500 dark:text-zinc-400 font-light">
              Configure leave types and monthly allocations for employees.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[15px] font-medium tracking-wide shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] active:scale-[0.98] transition-all duration-200"
          >
            <Plus className="h-5 w-5" />
            Add Leave Type
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : types.length === 0 ? (
          <div className="py-24 text-center">
            <Settings className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
            <p className="text-[16px] font-medium text-zinc-500 dark:text-zinc-400">No leave types yet</p>
            <p className="text-[14px] text-zinc-400 dark:text-zinc-500 mt-1">
              Add your first leave type to let employees start applying.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {types.map((t) => (
              <div
                key={t.id}
                className={`p-5 rounded-3xl bg-white dark:bg-zinc-900 border shadow-sm transition-shadow ${
                  t.active ? 'border-black/[0.04] dark:border-white/[0.04]' : 'border-dashed border-zinc-300 dark:border-zinc-700 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[16px] font-semibold text-zinc-900 dark:text-white">{t.name}</p>
                      {!t.active && (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 dark:bg-zinc-500/20 dark:text-zinc-400 text-[11px] font-semibold uppercase tracking-wide">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {t.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(t)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-zinc-400" />
                    <span className="text-[13px] text-zinc-600 dark:text-zinc-300">
                      <strong className="font-semibold">{t.monthlyCredit}</strong> day(s)/month
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CircleDollarSign className="h-4 w-4 text-zinc-400" />
                    <span className="text-[13px] text-zinc-600 dark:text-zinc-300">
                      {t.isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    {t.rolloverYearly && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1">
                        <RefreshCcw className="h-3 w-3" />
                        Yearly
                      </span>
                    )}
                    {t.rolloverMonthly && (
                      <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1">
                        <RefreshCcw className="h-3 w-3" />
                        Monthly
                      </span>
                    )}
                    <span className="text-[13px] text-zinc-400 dark:text-zinc-500">
                      {t._count.requests} request(s)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Attendance types */}
        <div className="pt-6 border-t border-black/[0.04] dark:border-white/[0.04] space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
                Attendance Types
              </h2>
              <p className="text-[15px] text-zinc-500 dark:text-zinc-400 font-light">
                The statuses used on attendance records — leave, holidays, weekends and more.
              </p>
            </div>
            <button
              onClick={openAttCreate}
              className="flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Attendance Type
            </button>
          </div>

          {attLoading ? (
            <div className="flex items-center justify-center py-16 text-zinc-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : attTypes.length === 0 ? (
            <div className="py-16 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
              <p className="text-[16px] font-medium text-zinc-500 dark:text-zinc-400">No attendance types yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {attTypes.map((t) => (
                <div
                  key={t.id}
                  className={`p-5 rounded-3xl bg-white dark:bg-zinc-900 border shadow-sm transition-shadow ${
                    t.active
                      ? 'border-black/[0.04] dark:border-white/[0.04]'
                      : 'border-dashed border-zinc-300 dark:border-zinc-700 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center text-[11px] font-bold uppercase"
                        style={{ color: t.color, backgroundColor: t.color + '14' }}
                      >
                        {t.code.slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[15px] font-semibold truncate">{t.name}</p>
                          {t.isSystem && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 text-[10px] font-semibold uppercase tracking-wide">
                              <Lock className="h-2.5 w-2.5" />
                              System
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                          {t.category}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openAttEdit(t)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {!t.isSystem && (
                        <button
                          onClick={() => setAttDeleteTarget(t)}
                          className="p-2 rounded-xl text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-3 line-clamp-2">
                    {t.description || 'No description'}
                  </p>

                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-zinc-400" />
                      <span className="text-[13px] text-zinc-600 dark:text-zinc-300">
                        {t.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-zinc-400" />
                      <span className="text-[13px] text-zinc-600 dark:text-zinc-300">
                        {t.isWorking ? 'Working' : 'Non-working'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <Palette className="h-4 w-4 text-zinc-400" />
                      <span
                        className="h-4 w-4 rounded-full border border-black/10 dark:border-white/10"
                        style={{ backgroundColor: t.color }}
                      />
                    </div>
                  </div>
              </div>
            ))}
          </div>
        )}
        </div>

        {/* Notification recipients */}
        <div className="pt-6 border-t border-black/[0.04] dark:border-white/[0.04] space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
                Notifications
              </h2>
              <p className="text-[15px] text-zinc-500 dark:text-zinc-400 font-light">
                Choose who receives email notifications for each leave event.
              </p>
            </div>
            <button
              onClick={saveNotifications}
              disabled={notifSaving || notifLoading}
              className="flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[14px] font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50"
            >
              {notifSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save settings
            </button>
          </div>

          {notifLoading ? (
            <div className="flex items-center justify-center py-16 text-zinc-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {notifSettings.map((s) => (
                <div
                  key={s.eventType}
                  className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04]"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                    <div className="flex items-center gap-3 lg:w-52 shrink-0">
                      <div className="h-10 w-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <Bell className="h-4.5 w-4.5 text-zinc-500 dark:text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold">{s.label}</p>
                        <p className="text-[12px] text-zinc-400 capitalize">{s.eventType.replace(/_/g, ' ').toLowerCase()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-wrap">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <Switch
                          checked={s.notifyEmployee}
                          onCheckedChange={(v) => updateNotif(s.eventType, { notifyEmployee: v })}
                        />
                        <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                          Employee
                        </span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <Switch
                          checked={s.notifyManager}
                          onCheckedChange={(v) => updateNotif(s.eventType, { notifyManager: v })}
                        />
                        <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                          Manager
                        </span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <Switch
                          checked={s.notifyHR}
                          onCheckedChange={(v) => updateNotif(s.eventType, { notifyHR: v })}
                        />
                        <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                          HR / Admin
                        </span>
                      </label>
                    </div>

                    <div className="flex-1 min-w-0">
                      <input
                        value={s.extraEmails.join(', ')}
                        onChange={(e) =>
                          updateNotif(s.eventType, {
                            extraEmails: e.target.value
                              .split(',')
                              .map((x) => x.trim())
                              .filter((x) => !!x),
                          })
                        }
                        placeholder="Extra recipients (comma-separated emails)"
                        className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Biometric & late policy */}
      <div className="pt-6 border-t border-black/[0.04] dark:border-white/[0.04] space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
              Biometric & Late Policy
            </h2>
            <p className="text-[15px] text-zinc-500 dark:text-zinc-400 font-light">
              Pull first-in / last-out punches, mark attendance automatically and track late breaches.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-stretch gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={bioImportFrom}
                  onChange={(e) => setBioImportFrom(e.target.value)}
                  title="Import punches from this date (inclusive). Leave empty to fetch only punches newer than the last sync."
                  className="h-11 px-3 rounded-full bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[13px] text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                />
                <button
                  onClick={runBioImport}
                  disabled={bioRunning || bioLoading}
                  className="flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  {bioRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Run import now
                </button>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-zinc-500 dark:text-zinc-400 cursor-pointer select-none pl-1">
                <input
                  type="checkbox"
                  checked={bioReapply}
                  onChange={(e) => setBioReapply(e.target.checked)}
                  className="h-3.5 w-3.5 rounded accent-zinc-900 dark:accent-white"
                />
                Re-apply — overwrite existing biometric attendance in the window
              </label>
            </div>
            <button
              onClick={saveBioConfig}
              disabled={bioSaving || bioLoading}
              className="flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[14px] font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50"
            >
              {bioSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save settings
            </button>
          </div>
        </div>

        {bioLoading ? (
          <div className="flex items-center justify-center py-16 text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-semibold text-zinc-900 dark:text-white">Source & sync</p>
                  <p className="text-[12px] text-zinc-400 mt-0.5">
                    Your system must expose GET {`{ sourceUrl }`} returning{' '}
                    {`[{ "employeeCode": "ACE001", "date": "YYYY-MM-DD", "firstIn": "HH:MM", "lastOut": "HH:MM" }]`}{' '}
                    or {`{ punches: [...] }`}. After the first successful run,
                    the app adds {`?since=YYYY-MM-DD`} (inclusive) so your API can
                    return only punches newer than the last sync.
                  </p>
                  <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-1.5">
                    The background worker re-evaluates biometric-marked days on every poll, so
                    late-arriving punches correct the status automatically. Manual runs only mark
                    unmarked days — tick the
                    <span className="font-medium"> Re-apply </span>checkbox (and optionally a
                    from-date) to recompute a window. Manual overrides and approved leaves are always kept.
                  </p>
                </div>
                <Switch checked={bioForm.enabled} onCheckedChange={(v) => setBioForm({ ...bioForm, enabled: v })} />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                  Source URL
                </label>
                <input
                  value={bioForm.sourceUrl}
                  onChange={(e) => setBioForm({ ...bioForm, sourceUrl: e.target.value })}
                  placeholder="https://biometric.example.com/first-last"
                  className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                    API token (optional)
                  </label>
                  <input
                    value={bioForm.sourceToken}
                    onChange={(e) => setBioForm({ ...bioForm, sourceToken: e.target.value })}
                    placeholder="Bearer token"
                    type="password"
                    className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                    API key (x-api-key)
                  </label>
                  <input
                    value={bioForm.sourceApiKey}
                    onChange={(e) => setBioForm({ ...bioForm, sourceApiKey: e.target.value })}
                    placeholder="x-api-key value"
                    type="password"
                    className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                    Poll interval (minutes)
                  </label>
                  <input
                    value={bioForm.pollIntervalMinutes}
                    onChange={(e) => setBioForm({ ...bioForm, pollIntervalMinutes: e.target.value })}
                    type="number"
                    min="1"
                    className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-black/[0.04] dark:border-white/[0.04] text-[12px] text-zinc-500 dark:text-zinc-400 space-y-1">
                <p>
                  <strong className="font-semibold text-zinc-700 dark:text-zinc-300">Last run:</strong>{' '}
                  {bioForm.lastRunAt ? new Date(bioForm.lastRunAt).toLocaleString() : 'never'}
                </p>
                {bioForm.lastRunMessage && (
                  <p>
                    <strong className="font-semibold text-zinc-700 dark:text-zinc-300">Result:</strong>{' '}
                    {bioForm.lastRunMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] space-y-4">
              <div>
                <p className="text-[15px] font-semibold text-zinc-900 dark:text-white">Attendance rules</p>
                <p className="text-[12px] text-zinc-400 mt-0.5">
                  Absent employees are marked with unapproved leave (without pay if their balance is
                  insufficient). Present but late/early beyond the half-day threshold counts as a half day.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                    Default shift start (HH:MM)
                  </label>
                  <input
                    value={bioForm.shiftStart}
                    onChange={(e) => setBioForm({ ...bioForm, shiftStart: e.target.value })}
                    className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                    Default shift end (HH:MM)
                  </label>
                  <input
                    value={bioForm.shiftEnd}
                    onChange={(e) => setBioForm({ ...bioForm, shiftEnd: e.target.value })}
                    className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                    Half-day threshold (min late/early)
                  </label>
                  <input
                    value={bioForm.halfDayThresholdMin}
                    onChange={(e) => setBioForm({ ...bioForm, halfDayThresholdMin: e.target.value })}
                    type="number"
                    min="0"
                    className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                    Monthly late grace — regular (min)
                  </label>
                  <input
                    value={bioForm.lateGraceMinutes}
                    onChange={(e) => setBioForm({ ...bioForm, lateGraceMinutes: e.target.value })}
                    type="number"
                    min="0"
                    className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                    Monthly late grace — probation (min)
                  </label>
                  <input
                    value={bioForm.probationLateGraceMinutes}
                    onChange={(e) => setBioForm({ ...bioForm, probationLateGraceMinutes: e.target.value })}
                    type="number"
                    min="0"
                    className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                  />
                </div>
                <label className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-black/[0.04] dark:border-white/[0.04] cursor-pointer self-end">
                  <Switch checked={bioForm.autoApply} onCheckedChange={(v) => setBioForm({ ...bioForm, autoApply: v })} />
                  <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                    Auto-apply attendance
                  </span>
                </label>
              </div>
              <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
                With auto-apply off, punches are still stored for the late policy but nothing is marked.
              </p>
              <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
                The default shift applies to employees without a shift group — see Shift groups below.
              </p>
            </div>
            {/* Shift groups */}
            <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-zinc-900 dark:text-white">Shift groups</p>
                  <p className="text-[12px] text-zinc-400 mt-0.5">
                    Assign employees to named shifts on the Employees page. Late / early-out calculations
                    use each employee's own shift; the default group (or the default shift above) is used
                    when an employee has no group.
                  </p>
                </div>
              </div>

              {shiftGroupLoading ? (
                <div className="flex items-center justify-center py-6 text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : shiftGroups.length === 0 ? (
                <div className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-black/[0.04] dark:border-white/[0.04]">
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                    No shift groups yet — everyone currently uses the default shift above.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {shiftGroups.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-black/[0.04] dark:border-white/[0.04]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold text-zinc-900 dark:text-white truncate">
                            {g.name}
                          </p>
                          {g.isDefault && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 text-[11px] font-semibold uppercase tracking-wide">
                              <Star className="h-3 w-3" />
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {g.startTime} – {g.endTime} · {g._count.users} employee(s)
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!g.isDefault && (
                          <button
                            onClick={() => setDefaultShiftGroup(g.id)}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                          >
                            <Star className="h-3.5 w-3.5" />
                            Set default
                          </button>
                        )}
                        <button
                          onClick={() => deleteShiftGroup(g.id)}
                          disabled={shiftDeleting === g.id}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          {shiftDeleting === g.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-black/[0.04] dark:border-white/[0.04] pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                      Shift name
                    </label>
                    <input
                      value={shiftFormName}
                      onChange={(e) => setShiftFormName(e.target.value)}
                      placeholder="e.g. Morning, Night"
                      className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                      Start / End (HH:MM)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        value={shiftFormStart}
                        onChange={(e) => setShiftFormStart(e.target.value)}
                        placeholder="09:00"
                        className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                      />
                      <span className="text-zinc-400">–</span>
                      <input
                        value={shiftFormEnd}
                        onChange={(e) => setShiftFormEnd(e.target.value)}
                        placeholder="18:00"
                        className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 mt-4">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shiftFormDefault}
                      onChange={(e) => setShiftFormDefault(e.target.checked)}
                      className="h-4 w-4 rounded accent-zinc-900 dark:accent-white"
                    />
                    <span className="text-[13px] text-zinc-600 dark:text-zinc-300">
                      Make this the default shift
                    </span>
                  </label>
                  <Button
                    onClick={saveShiftGroup}
                    disabled={shiftSaving || !shiftFormName.trim() || !shiftFormStart || !shiftFormEnd}
                    className="h-10 px-5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-[13px] font-medium"
                  >
                    {shiftSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add shift group
                  </Button>
                </div>
              </div>
            </div>
            {/* Biometric ID mappings */}
            <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] space-y-4">
          <div>
            <p className="text-[15px] font-semibold text-zinc-900 dark:text-white">Biometric ID mapping</p>
            <p className="text-[12px] text-zinc-400 mt-0.5">
              If the biometric report uses IDs that aren't ACE employee codes, map them here.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={mappingExternal}
              onChange={(e) => setMappingExternal(e.target.value.toUpperCase())}
              placeholder="Biometric ID (e.g. 1001)"
              className="flex-1 h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
            />
            <select
              value={mappingUser}
              onChange={(e) => setMappingUser(e.target.value)}
              className="flex-1 h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
            >
              <option value="">Select employee</option>
              {mappingUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.id})
                </option>
              ))}
            </select>
            <button
              onClick={addMapping}
              className="h-[46px] px-5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[14px] font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shrink-0"
            >
              Add mapping
            </button>
          </div>

          {bioMappings.length > 0 && (
            <div className="space-y-2">
              {bioMappings.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-black/[0.04] dark:border-white/[0.04]"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[12px] font-semibold">
                      {m.id}
                    </span>
                    <span className="text-[13px] text-zinc-600 dark:text-zinc-300">
                      {m.user.name} ({m.user.id})
                    </span>
                  </div>
                  <button
                    onClick={() => removeMapping(m.id)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    title="Remove mapping"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      )}
      </div>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="text-[18px] tracking-tight">
              {form.id ? 'Edit leave type' : 'Add leave type'}
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              Employees accrue the monthly credit for this type each month.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Casual Leave"
                className="w-full h-[50px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                Description
              </label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional short description"
                className="w-full h-[50px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                Monthly credit (days per month)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={form.monthlyCredit}
                onChange={(e) => setForm({ ...form, monthlyCredit: e.target.value })}
                className="w-full h-[50px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
              />
              <p className="text-[12px] text-zinc-400 dark:text-zinc-500 ml-1">
                e.g. 1 = 12 days/year, 1.5 = 18 days/year
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-black/[0.04] dark:border-white/[0.04] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPaid}
                  onChange={(e) => setForm({ ...form, isPaid: e.target.checked })}
                  className="h-4 w-4 rounded accent-zinc-900 dark:accent-white"
                />
                <span className="text-[14px] font-medium text-zinc-700 dark:text-zinc-300">Paid leave</span>
              </label>
              <label className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-black/[0.04] dark:border-white/[0.04] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded accent-zinc-900 dark:accent-white"
                />
                <span className="text-[14px] font-medium text-zinc-700 dark:text-zinc-300">Active</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-black/[0.04] dark:border-white/[0.04] cursor-pointer" title="Unused days accumulate from month to month within the year">
                <input
                  type="checkbox"
                  checked={form.rolloverMonthly}
                  onChange={(e) => setForm({ ...form, rolloverMonthly: e.target.checked })}
                  className="h-4 w-4 rounded accent-zinc-900 dark:accent-white"
                />
                <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 leading-tight">
                  Monthly rollover
                </span>
              </label>
              <label className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-black/[0.04] dark:border-white/[0.04] cursor-pointer" title="Unused days carry over into the next year">
                <input
                  type="checkbox"
                  checked={form.rolloverYearly}
                  onChange={(e) => setForm({ ...form, rolloverYearly: e.target.checked })}
                  className="h-4 w-4 rounded accent-zinc-900 dark:accent-white"
                />
                <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 leading-tight">
                  Yearly rollover
                </span>
              </label>
            </div>
            <p className="text-[12px] text-zinc-400 dark:text-zinc-500 ml-1 -mt-1">
              Monthly rollover keeps unused days accumulating within the year. Yearly rollover carries unused days into the next year.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="h-11 px-5 rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={saveType}
              disabled={saving}
              className="h-11 px-5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {form.id ? 'Save changes' : 'Create type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="text-[18px] tracking-tight">Delete leave type?</DialogTitle>
            <DialogDescription className="text-[14px]">
              {deleteTarget
                ? deleteTarget._count.requests > 0
                  ? `${deleteTarget.name} has ${deleteTarget._count.requests} request(s). It will be deactivated to preserve history — employees can no longer apply for it.`
                  : `${deleteTarget.name} will be permanently deleted.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="h-11 px-5 rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={deleteType}
              disabled={deleting}
              className="h-11 px-5 rounded-2xl bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleteTarget?._count.requests ? 'Deactivate' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Attendance type create / edit dialog */}
      <Dialog open={attDialogOpen} onOpenChange={setAttDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="text-[18px] tracking-tight">
              {attForm.id ? 'Edit attendance type' : 'Add attendance type'}
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              Defines a status shown on attendance records across the company.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">Name</label>
                <input
                  value={attForm.name}
                  onChange={(e) => setAttForm({ ...attForm, name: e.target.value })}
                  placeholder="e.g. Public Holiday"
                  className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">Code</label>
                <input
                  value={attForm.code}
                  onChange={(e) => setAttForm({ ...attForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. HOLIDAY"
                  className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all uppercase"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">Description</label>
              <input
                value={attForm.description}
                onChange={(e) => setAttForm({ ...attForm, description: e.target.value })}
                placeholder="Optional short description"
                className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">Category</label>
                <select
                  value={attForm.category}
                  onChange={(e) => setAttForm({ ...attForm, category: e.target.value })}
                  className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">Color</label>
                <div className="flex items-center gap-2 h-[46px] px-3 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04]">
                  <input
                    type="color"
                    value={attForm.color}
                    onChange={(e) => setAttForm({ ...attForm, color: e.target.value })}
                    className="h-7 w-9 rounded-lg cursor-pointer bg-transparent border-none"
                  />
                  <span className="text-[12px] font-mono text-zinc-500 uppercase">{attForm.color}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center gap-2 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-black/[0.04] dark:border-white/[0.04] cursor-pointer">
                <input
                  type="checkbox"
                  checked={attForm.isPaid}
                  onChange={(e) => setAttForm({ ...attForm, isPaid: e.target.checked })}
                  className="h-4 w-4 rounded accent-zinc-900 dark:accent-white"
                />
                <span className="text-[13px] font-medium">Paid</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-black/[0.04] dark:border-white/[0.04] cursor-pointer">
                <input
                  type="checkbox"
                  checked={attForm.isWorking}
                  onChange={(e) => setAttForm({ ...attForm, isWorking: e.target.checked })}
                  className="h-4 w-4 rounded accent-zinc-900 dark:accent-white"
                />
                <span className="text-[13px] font-medium">Working</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-black/[0.04] dark:border-white/[0.04] cursor-pointer">
                <input
                  type="checkbox"
                  checked={attForm.active}
                  onChange={(e) => setAttForm({ ...attForm, active: e.target.checked })}
                  className="h-4 w-4 rounded accent-zinc-900 dark:accent-white"
                />
                <span className="text-[13px] font-medium">Active</span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ml-1">
                Sort order <span className="text-zinc-400 font-normal">(lower = first)</span>
              </label>
              <input
                type="number"
                value={attForm.sortOrder}
                onChange={(e) => setAttForm({ ...attForm, sortOrder: e.target.value })}
                className="w-full h-[46px] px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.04] text-[14px] text-zinc-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAttDialogOpen(false)}
              disabled={attSaving}
              className="h-11 px-5 rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={saveAttType}
              disabled={attSaving}
              className="h-11 px-5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100"
            >
              {attSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {attForm.id ? 'Save changes' : 'Create type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance type delete confirmation */}
      <Dialog open={!!attDeleteTarget} onOpenChange={(open) => !open && setAttDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white dark:bg-zinc-900 border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="text-[18px] tracking-tight">Delete attendance type?</DialogTitle>
            <DialogDescription className="text-[14px]">
              {attDeleteTarget?.name} will be permanently deleted. If it is in use, you will need to
              deactivate it instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAttDeleteTarget(null)}
              disabled={attDeleting}
              className="h-11 px-5 rounded-2xl"
            >
              Cancel
            </Button>
            <Button
              onClick={deleteAttType}
              disabled={attDeleting}
              className="h-11 px-5 rounded-2xl bg-red-600 hover:bg-red-700 text-white"
            >
              {attDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </HrAdminLayout>
  );
}
