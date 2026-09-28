import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';

const ADMIN_ROLES = ['ADMIN', 'HR'];

// GET /api/admin/checklist-templates - list all templates (admin only)
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.user) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!ADMIN_ROLES.includes(authResult.user.role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const templates = await prisma.checklistTemplate.findMany({
    include: { items: { orderBy: { order: 'asc' } } },
    orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
  });

  return NextResponse.json(templates);
}

// POST /api/admin/checklist-templates - create a template with items (admin only)
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.user) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!ADMIN_ROLES.includes(authResult.user.role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const body = await req.json();
  const { type, name, items } = body;

  const validTypes = ['ONBOARDING', 'OFFBOARDING'];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'Type must be ONBOARDING or OFFBOARDING' }, { status: 400 });
  }
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
  }

  const cleanItems = Array.isArray(items)
    ? items
        .map((it: any, i: number) => ({
          title: String(typeof it === 'string' ? it : it?.title ?? '').trim(),
          optional: Boolean(it?.optional ?? false),
          order: typeof it?.order === 'number' ? it.order : i,
          equipmentCategory: it?.equipmentCategory || null,
          equipmentAction: it?.equipmentAction || null,
        }))
        .filter((it: { title: string }) => it.title.length > 0)
    : [];

  if (cleanItems.length === 0) {
    return NextResponse.json({ error: 'At least one checklist item is required' }, { status: 400 });
  }

  const lastSort = await prisma.checklistTemplate.findFirst({
    where: { type },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const template = await prisma.checklistTemplate.create({
    data: {
      type,
      name: String(name).trim(),
      sortOrder: (lastSort?.sortOrder ?? -1) + 1,
      items: { create: cleanItems },
    },
    include: { items: { orderBy: { order: 'asc' } } },
  });

  return NextResponse.json(template, { status: 201 });
}
