'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminTicketLayout } from '@/components/tickets/AdminTicketLayout';
import { PageHeader, GlassCard, btnPrimary } from '@/components/tickets/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import { TicketCategory } from '@/types';
import {
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  Layers,
  ChevronUp,
  ChevronDown,
  ClipboardCheck,
} from 'lucide-react';
import {
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_ACTION_LABELS,
} from '@/components/tickets/lifecycle';
import { makeAuthenticatedRequest, setupAutoRefresh } from '@/lib/adminAuth';
import { toast } from 'sonner';

type CategoryWithSubs = TicketCategory;

interface SubcategoryItem {
  id: string;
  categoryId: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryWithSubs[]>([]);
  const [loading, setLoading] = useState(true);

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  const [editCategory, setEditCategory] = useState<CategoryWithSubs | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  const [deleteCategory, setDeleteCategory] = useState<CategoryWithSubs | null>(null);

  const [addSubOpen, setAddSubOpen] = useState(false);
  const [subCategoryId, setSubCategoryId] = useState('');
  const [subName, setSubName] = useState('');

  const [editSub, setEditSub] = useState<SubcategoryItem | null>(null);
  const [editSubName, setEditSubName] = useState('');

  const [deleteSub, setDeleteSub] = useState<SubcategoryItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Lifecycle checklist templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateModal, setTemplateModal] = useState<{ type: string } | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateItems, setTemplateItems] = useState<
    { title: string; equipmentCategory: string; equipmentAction: string }[]
  >([]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) { router.push('/helpdesk/admin/login'); return; }
      const response = await makeAuthenticatedRequest('/api/admin/categories');
      if (response.status === 401) {
        ['accessToken','refreshToken','user'].forEach(k => localStorage.removeItem(k));
        router.push('/helpdesk/admin/login'); return;
      }
      if (!response.ok) throw new Error();
      setCategories(await response.json());
    } catch { toast.error('Failed to load categories'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchCategories();
    fetchTemplates();
    const cleanup = setupAutoRefresh();
    return () => cleanup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await makeAuthenticatedRequest('/api/admin/checklist-templates');
      if (response.status === 401) {
        ['accessToken','refreshToken','user'].forEach(k => localStorage.removeItem(k));
        router.push('/helpdesk/admin/login'); return;
      }
      if (response.ok) setTemplates(await response.json());
    } catch { /* silent */ }
  };

  const openTemplateModal = (type: string) => {
    const active = templates.find((t) => t.type === type && t.active);
    setTemplateModal({ type });
    setTemplateName(active?.name ?? `${type === 'ONBOARDING' ? 'Onboarding' : 'Offboarding'} Checklist`);
    setTemplateItems(
      active?.items?.map((i: any) => ({
        title: i.title ?? '',
        equipmentCategory: i.equipmentCategory ?? '',
        equipmentAction: i.equipmentAction ?? '',
      })) ?? [{ title: '', equipmentCategory: '', equipmentAction: '' }]
    );
  };

  const saveTemplate = async () => {
    const items = templateItems
      .map(({ title, equipmentCategory, equipmentAction }) => ({
        title: title.trim(),
        equipmentCategory: equipmentCategory || null,
        equipmentAction: equipmentAction || null,
      }))
      .filter((i) => i.title.length > 0);
    if (!templateName.trim()) { toast.error('Template name is required'); return; }
    if (items.length === 0) { toast.error('At least one checklist item is required'); return; }
    setSaving(true);
    try {
      const active = templates.find((t) => t.type === templateModal!.type && t.active);
      const url = active
        ? `/api/admin/checklist-templates/${active.id}`
        : '/api/admin/checklist-templates';
      const response = await makeAuthenticatedRequest(url, {
        method: active ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: templateModal!.type, name: templateName.trim(), items }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Failed to save template'); return; }
      toast.success('Checklist template saved');
      setTemplateModal(null);
      fetchTemplates();
    } catch { toast.error('Failed to save template'); }
    finally { setSaving(false); }
  };

  const toggleTemplate = async (tpl: any) => {
    try {
      const response = await makeAuthenticatedRequest(`/api/admin/checklist-templates/${tpl.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !tpl.active }),
      });
      if (!response.ok) { toast.error('Failed to update template'); return; }
      toast.success(tpl.active ? 'Template disabled' : 'Template enabled');
      fetchTemplates();
    } catch { toast.error('Failed to update template'); }
  };

  const deleteTemplate = async (tpl: any) => {
    try {
      const response = await makeAuthenticatedRequest(`/api/admin/checklist-templates/${tpl.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) { toast.error('Failed to delete template'); return; }
      toast.success('Template deleted');
      fetchTemplates();
    } catch { toast.error('Failed to delete template'); }
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) { toast.error('Category name is required'); return; }
    setSaving(true);
    try {
      const response = await makeAuthenticatedRequest('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryName.trim() }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Failed to create category'); return; }
      toast.success('Category created');
      setAddCategoryOpen(false);
      setCategoryName('');
      fetchCategories();
    } catch { toast.error('Failed to create category'); }
    finally { setSaving(false); }
  };

  const handleEditCategory = async () => {
    if (!editCategory) return;
    if (!editCategoryName.trim()) { toast.error('Category name is required'); return; }
    setSaving(true);
    try {
      const response = await makeAuthenticatedRequest(`/api/admin/categories/${editCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editCategoryName.trim() }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Failed to update category'); return; }
      toast.success('Category updated');
      setEditCategory(null);
      fetchCategories();
    } catch { toast.error('Failed to update category'); }
    finally { setSaving(false); }
  };

  const handleToggleCategory = async (cat: CategoryWithSubs) => {
    try {
      const response = await makeAuthenticatedRequest(`/api/admin/categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !cat.active }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Failed to update category'); return; }
      toast.success(cat.active ? 'Category disabled' : 'Category enabled');
      fetchCategories();
    } catch { toast.error('Failed to update category'); }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategory) return;
    setSaving(true);
    try {
      const response = await makeAuthenticatedRequest(`/api/admin/categories/${deleteCategory.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Failed to delete category'); return; }
      toast.success('Category deleted');
      setDeleteCategory(null);
      fetchCategories();
    } catch { toast.error('Failed to delete category'); }
    finally { setSaving(false); }
  };

  const handleAddSub = async () => {
    if (!subName.trim()) { toast.error('Subcategory name is required'); return; }
    if (!subCategoryId) { toast.error('Choose a category'); return; }
    setSaving(true);
    try {
      const response = await makeAuthenticatedRequest('/api/admin/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: subName.trim(), categoryId: subCategoryId }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Failed to create subcategory'); return; }
      toast.success('Subcategory created');
      setAddSubOpen(false);
      setSubName('');
      setSubCategoryId('');
      fetchCategories();
    } catch { toast.error('Failed to create subcategory'); }
    finally { setSaving(false); }
  };

  const handleEditSub = async () => {
    if (!editSub) return;
    if (!editSubName.trim()) { toast.error('Subcategory name is required'); return; }
    setSaving(true);
    try {
      const response = await makeAuthenticatedRequest(`/api/admin/subcategories/${editSub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editSubName.trim() }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Failed to update subcategory'); return; }
      toast.success('Subcategory updated');
      setEditSub(null);
      fetchCategories();
    } catch { toast.error('Failed to update subcategory'); }
    finally { setSaving(false); }
  };

  const handleToggleSub = async (sub: SubcategoryItem) => {
    try {
      const response = await makeAuthenticatedRequest(`/api/admin/subcategories/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !sub.active }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Failed to update subcategory'); return; }
      toast.success(sub.active ? 'Subcategory disabled' : 'Subcategory enabled');
      fetchCategories();
    } catch { toast.error('Failed to update subcategory'); }
  };

  const handleDeleteSub = async () => {
    if (!deleteSub) return;
    setSaving(true);
    try {
      const response = await makeAuthenticatedRequest(`/api/admin/subcategories/${deleteSub.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Failed to delete subcategory'); return; }
      toast.success('Subcategory deleted');
      setDeleteSub(null);
      fetchCategories();
    } catch { toast.error('Failed to delete subcategory'); }
    finally { setSaving(false); }
  };

  const moveCategory = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= categories.length) return;
    const a = categories[index];
    const b = categories[j];
    try {
      await makeAuthenticatedRequest(`/api/admin/categories/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: b.sortOrder }),
      });
      await makeAuthenticatedRequest(`/api/admin/categories/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: a.sortOrder }),
      });
      fetchCategories();
    } catch { toast.error('Failed to reorder'); }
  };

  const moveSub = async (catIndex: number, subIndex: number, dir: -1 | 1) => {
    const cat = categories[catIndex];
    const subs = cat.subcategories ?? [];
    const j = subIndex + dir;
    if (j < 0 || j >= subs.length) return;
    const a = subs[subIndex];
    const b = subs[j];
    try {
      await makeAuthenticatedRequest(`/api/admin/subcategories/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: b.sortOrder }),
      });
      await makeAuthenticatedRequest(`/api/admin/subcategories/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: a.sortOrder }),
      });
      fetchCategories();
    } catch { toast.error('Failed to reorder'); }
  };

  return (
    <AdminTicketLayout>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
        {/* Header */}
        <PageHeader
          title="Settings"
          subtitle="Manage ticket categories and subcategories. Disabled items are hidden from new ticket forms."
          actions={
            <Button onClick={() => setAddCategoryOpen(true)} className={btnPrimary}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          }
        />

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6" aria-busy="true" aria-label="Loading categories">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[280px] rounded-[32px]" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <GlassCard className="flex flex-col items-center justify-center min-h-[300px] gap-3">
            <FolderOpen className="h-10 w-10 text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
            <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">No categories yet</span>
            <span className="text-[14px] text-zinc-500 font-light">Create your first ticket category to get started</span>
            <Button onClick={() => setAddCategoryOpen(true)} className={`mt-2 ${btnPrimary}`}>
              <Plus className="h-4 w-4 mr-2" />Add Category
            </Button>
          </GlassCard>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {categories.map((cat, ci) => (
              <GlassCard key={cat.id} className="overflow-hidden">
                <div className="flex items-center gap-3 py-4 px-6 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Layers className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[16px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">{cat.name}</h3>
                      {!cat.active && (
                        <Badge variant="outline" className="text-[11px] border-0 bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">Disabled</Badge>
                      )}
                    </div>
                    <p className="text-[12px] text-zinc-400">{(cat.subcategories ?? []).length} subcategor{(cat.subcategories ?? []).length !== 1 ? 'ies' : 'y'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" aria-label={`Move ${cat.name} up`} className="h-8 w-8 rounded-xl focus-visible:ring-2 focus-visible:ring-zinc-400" disabled={ci === 0} onClick={() => moveCategory(ci, -1)}><ChevronUp className="h-4 w-4 text-zinc-500 dark:text-zinc-400" /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Move ${cat.name} down`} className="h-8 w-8 rounded-xl focus-visible:ring-2 focus-visible:ring-zinc-400" disabled={ci === categories.length - 1} onClick={() => moveCategory(ci, 1)}><ChevronDown className="h-4 w-4 text-zinc-500 dark:text-zinc-400" /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Rename ${cat.name}`} className="h-8 w-8 rounded-xl focus-visible:ring-2 focus-visible:ring-zinc-400" onClick={() => { setEditCategory(cat); setEditCategoryName(cat.name); }}><Pencil className="h-4 w-4 text-zinc-500 dark:text-zinc-400" /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${cat.name}`} className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-zinc-400" onClick={() => setDeleteCategory(cat)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="px-6 py-3 flex items-center justify-between">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-zinc-400">Subcategories</span>
                  <Button
                    variant="ghost" size="sm"
                    className="h-8 px-3 rounded-xl text-[13px] text-primary hover:bg-primary/10"
                    onClick={() => { setSubCategoryId(cat.id); setSubName(''); setAddSubOpen(true); }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />Add
                  </Button>
                </div>

                <div className="px-6 pb-4 space-y-1.5">
                  {(cat.subcategories ?? []).length === 0 ? (
                    <p className="text-[13px] text-zinc-400 font-light py-2">No subcategories yet</p>
                  ) : (cat.subcategories ?? []).map((sub, si) => (
                    <div key={sub.id} className="flex items-center gap-2 py-1.5 px-3 rounded-2xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-black/[0.03] dark:border-white/[0.03]">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${sub.active ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                      <span className={`text-[14px] flex-1 truncate ${sub.active ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400 line-through'}`}>{sub.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" aria-label={`Move subcategory ${sub.name} up`} className="h-6 w-6 rounded-lg focus-visible:ring-2 focus-visible:ring-zinc-400" disabled={si === 0} onClick={() => moveSub(ci, si, -1)}><ChevronUp className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" /></Button>
                        <Button variant="ghost" size="icon" aria-label={`Move subcategory ${sub.name} down`} className="h-6 w-6 rounded-lg focus-visible:ring-2 focus-visible:ring-zinc-400" disabled={si === (cat.subcategories ?? []).length - 1} onClick={() => moveSub(ci, si, 1)}><ChevronDown className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" /></Button>
                        <Switch checked={sub.active} onCheckedChange={() => handleToggleSub(sub)} aria-label={`Toggle ${sub.name}`} className="scale-90" />
                        <Button variant="ghost" size="icon" aria-label={`Rename subcategory ${sub.name}`} className="h-6 w-6 rounded-lg focus-visible:ring-2 focus-visible:ring-zinc-400" onClick={() => { setEditSub(sub); setEditSubName(sub.name); }}><Pencil className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" /></Button>
                        <Button variant="ghost" size="icon" aria-label={`Delete subcategory ${sub.name}`} className="h-6 w-6 rounded-lg text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-zinc-400" onClick={() => setDeleteSub(sub)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-6 pb-5 flex items-center justify-between">
                  <span className="text-[12px] text-zinc-500 dark:text-zinc-400">Category visible in new ticket form</span>
                  <Switch checked={cat.active} onCheckedChange={() => handleToggleCategory(cat)} aria-label={`Toggle ${cat.name}`} />
                </div>
              </GlassCard>
            ))}
          </div>
        )}

      {/* Lifecycle checklist templates */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-[24px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-teal-500" />
              Lifecycle Checklists
            </h2>
            <p className="text-[15px] text-zinc-500 dark:text-zinc-400 font-light">
              Default checklists pre-filled on onboarding and offboarding tickets.
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {(['ONBOARDING', 'OFFBOARDING'] as const).map((type) => {
            const tpl = templates.find((t) => t.type === type);
            return (
              <GlassCard key={type} className="p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-[16px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                      {type === 'ONBOARDING' ? 'Onboarding' : 'Offboarding'}
                    </h3>
                    <p className="text-[12px] text-zinc-400">
                      {tpl ? `${tpl.items?.length ?? 0} tasks` : 'No template yet'}
                      {tpl && !tpl.active && ' · disabled'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {tpl && (
                      <>
                        <Switch
                          checked={!!tpl.active}
                          onCheckedChange={() => toggleTemplate(tpl)}
                          aria-label={`Toggle ${type} template`}
                        />
                        <Button
                          variant="ghost" size="icon"
                          aria-label={`Delete ${type} template`}
                          className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
                          onClick={() => deleteTemplate(tpl)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {tpl && tpl.items?.length > 0 ? (
                  <div className="space-y-1.5">
                    {tpl.items.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2 py-1 px-3 rounded-2xl bg-zinc-50/60 dark:bg-zinc-800/40">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-teal-500" />
                        <span className="text-[14px] text-zinc-700 dark:text-zinc-300 truncate">{item.title}</span>
                      </div>
                    ))}
                    {tpl.items.length > 5 && (
                      <p className="text-[12px] text-zinc-400 pl-4">+{tpl.items.length - 5} more…</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[13px] text-zinc-400 font-light py-2">
                    No tasks configured — new tickets of this type start with an empty checklist.
                  </p>
                )}

                <Button
                  variant="outline"
                  onClick={() => openTemplateModal(type)}
                  className="rounded-2xl border-black/[0.06] dark:border-white/[0.06]"
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  {tpl ? 'Edit Template' : 'Create Template'}
                </Button>
              </GlassCard>
            );
          })}
        </div>
      </div>
      </div>

      {/* Add category dialog */}
      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Create a new ticket category, e.g. &quot;IT Support&quot;.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="cat-name">Category Name *</Label>
            <Input id="cat-name" value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="e.g. HR & Payroll" className="h-11 rounded-2xl" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCategoryOpen(false)} className="rounded-2xl">Cancel</Button>
            <Button onClick={handleAddCategory} disabled={saving} className="rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
              {saving ? 'Creating…' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit category dialog */}
      <Dialog open={!!editCategory} onOpenChange={o => !o && setEditCategory(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
            <DialogDescription>Update the display name of this category.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="edit-cat-name">Category Name *</Label>
            <Input id="edit-cat-name" value={editCategoryName} onChange={e => setEditCategoryName(e.target.value)} className="h-11 rounded-2xl" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCategory(null)} className="rounded-2xl">Cancel</Button>
            <Button onClick={handleEditCategory} disabled={saving} className="rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete category dialog */}
      <Dialog open={!!deleteCategory} onOpenChange={o => !o && setDeleteCategory(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Delete &quot;{deleteCategory?.name}&quot; and its {(deleteCategory?.subcategories ?? []).length} subcategor{(deleteCategory?.subcategories ?? []).length !== 1 ? 'ies' : 'y'}? Existing tickets keep their data but show no category.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCategory(null)} className="rounded-2xl">Cancel</Button>
            <Button onClick={handleDeleteCategory} disabled={saving} className="rounded-2xl bg-red-600 text-white hover:bg-red-700">
              {saving ? 'Deleting…' : 'Delete Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add subcategory dialog */}
      <Dialog open={addSubOpen} onOpenChange={setAddSubOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add Subcategory</DialogTitle>
            <DialogDescription>Create a new subcategory inside a category.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Category *</Label>
              <Select value={subCategoryId} onValueChange={setSubCategoryId}>
                <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sub-name">Subcategory Name *</Label>
              <Input id="sub-name" value={subName} onChange={e => setSubName(e.target.value)} placeholder="e.g. Hardware" className="h-11 rounded-2xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSubOpen(false)} className="rounded-2xl">Cancel</Button>
            <Button onClick={handleAddSub} disabled={saving} className="rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
              {saving ? 'Creating…' : 'Create Subcategory'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit subcategory dialog */}
      <Dialog open={!!editSub} onOpenChange={o => !o && setEditSub(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Rename Subcategory</DialogTitle>
            <DialogDescription>Update the display name of this subcategory.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="edit-sub-name">Subcategory Name *</Label>
            <Input id="edit-sub-name" value={editSubName} onChange={e => setEditSubName(e.target.value)} className="h-11 rounded-2xl" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSub(null)} className="rounded-2xl">Cancel</Button>
            <Button onClick={handleEditSub} disabled={saving} className="rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete subcategory dialog */}
      <Dialog open={!!deleteSub} onOpenChange={o => !o && setDeleteSub(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete Subcategory</DialogTitle>
            <DialogDescription>
              Delete &quot;{deleteSub?.name}&quot;? Existing tickets keep their data but show no subcategory.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSub(null)} className="rounded-2xl">Cancel</Button>
            <Button onClick={handleDeleteSub} disabled={saving} className="rounded-2xl bg-red-600 text-white hover:bg-red-700">
              {saving ? 'Deleting…' : 'Delete Subcategory'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lifecycle checklist template editor */}
      <Dialog open={!!templateModal} onOpenChange={o => !o && setTemplateModal(null)}>
        <DialogContent className="sm:max-w-[640px] rounded-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {templateModal?.type === 'ONBOARDING' ? 'Onboarding' : 'Offboarding'} Checklist Template
            </DialogTitle>
            <DialogDescription>
              These tasks are pre-filled when an admin creates this kind of ticket. Existing tickets are not affected.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="tpl-name">Template Name *</Label>
              <Input
                id="tpl-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Standard Onboarding"
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="grid gap-2">
              <Label>Checklist Tasks *</Label>
              <div className="space-y-3">
                {templateItems.map((item, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-black/[0.04] dark:border-white/[0.04] space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={item.title}
                        onChange={(e) => setTemplateItems(templateItems.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                        placeholder={`Task ${i + 1}`}
                        className="h-10 rounded-2xl"
                      />
                      <Button
                        variant="ghost" size="icon"
                        aria-label={`Remove task ${i + 1}`}
                        className="h-10 w-10 rounded-2xl text-destructive hover:bg-destructive/10 shrink-0"
                        disabled={templateItems.length === 1}
                        onClick={() => setTemplateItems(templateItems.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={item.equipmentCategory}
                        onValueChange={(v) => setTemplateItems(templateItems.map((x, j) => (j === i ? { ...x, equipmentCategory: v === 'none' ? '' : v } : x)))}
                      >
                        <SelectTrigger className="h-9 rounded-xl text-[13px]"><SelectValue placeholder="Logs equipment…" /></SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="none" className="text-[13px] font-light">No equipment</SelectItem>
                          {Object.entries(EQUIPMENT_CATEGORY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value} className="text-[13px] font-medium">{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={item.equipmentCategory ? item.equipmentAction : ''}
                        disabled={!item.equipmentCategory}
                        onValueChange={(v) => setTemplateItems(templateItems.map((x, j) => (j === i ? { ...x, equipmentAction: v === 'none' ? '' : v } : x)))}
                      >
                        <SelectTrigger className="h-9 rounded-xl text-[13px]"><SelectValue placeholder="…with action" /></SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="none" className="text-[13px] font-light">No action</SelectItem>
                          {Object.entries(EQUIPMENT_ACTION_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value} className="text-[13px] font-medium">{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTemplateItems([...templateItems, { title: '', equipmentCategory: '', equipmentAction: '' }])}
                className="w-fit rounded-2xl mt-1"
              >
                <Plus className="h-4 w-4 mr-1.5" />Add Task
              </Button>
              <p className="text-[12px] text-zinc-400 font-light">
                When a task has an equipment category &amp; action, checking it off automatically records that event in
                the employee&apos;s equipment ledger.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateModal(null)} className="rounded-2xl">Cancel</Button>
            <Button
              onClick={saveTemplate}
              disabled={saving}
              className="rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
            >
              {saving ? 'Saving…' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminTicketLayout>
  );
}
