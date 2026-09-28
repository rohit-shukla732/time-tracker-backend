import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';

const ADMIN_ROLES = ['ADMIN', 'HR'];

async function assertAdmin(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.user) {
    return {
      error: NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      ),
      user: null,
    };
  }
  if (!ADMIN_ROLES.includes(authResult.user.role)) {
    return {
      error: NextResponse.json({ error: 'Access denied' }, { status: 403 }),
      user: null,
    };
  }
  return { error: null, user: authResult.user };
}

// PATCH /api/admin/checklist-templates/[id] - rename, toggle active, reorder,
// or replace the item list of a template.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await assertAdmin(req);
  if (access.error || !access.user) return access.error;

  const { id } = await params;

  const template = await prisma.checklistTemplate.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const body = await req.json();
  const updateData: any = {};

  if (typeof body.name === 'string' && body.name.trim()) updateData.name = body.name.trim();
  if (typeof body.active === 'boolean') updateData.active = body.active;
  if (typeof body.sortOrder === 'number') updateData.sortOrder = body.sortOrder;

  // Full item replacement when an array is supplied
  if (Array.isArray(body.items)) {
    const cleanItems = body.items
      .map((it: any, i: number) => ({
        title: String(typeof it === 'string' ? it : it?.title ?? '').trim(),
        optional: Boolean(it?.optional ?? false),
        order: typeof it?.order === 'number' ? it.order : i,
        equipmentCategory: it?.equipmentCategory || null,
        equipmentAction: it?.equipmentAction || null,
      }))
      .filter((it: { title: string }) => it.title.length > 0);

    await prisma.checklistTemplateItem.deleteMany({ where: { templateId: id } });
    updateData.items = { create: cleanItems };
  }

  const updated = await prisma.checklistTemplate.update({
    where: { id },
    data: updateData,
    include: { items: { orderBy: { order: 'asc' } } },
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/checklist-templates/[id] - remove a template and its items
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await assertAdmin(req);
  if (access.error || !access.user) return access.error;

  const { id } = await params;

  const template = await prisma.checklistTemplate.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  await prisma.checklistTemplate.delete({ where: { id } });

  return NextResponse.json({ success: true, message: 'Template deleted' });
}
