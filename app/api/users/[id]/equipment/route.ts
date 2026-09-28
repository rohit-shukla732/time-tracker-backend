import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';
import { canAccessUserData } from '@/lib/roleAuth';

const ADMIN_ROLES = ['ADMIN', 'HR'];

// GET /api/users/[id]/equipment - equipment change history + counts for a user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (!authResult.user) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  const { id } = await params;

  // Admins/HR see everyone; employees only see their own
  const allowed = await canAccessUserData(authResult.user, id);
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const changes = await prisma.equipmentChange.findMany({
    where: { userId: id },
    include: {
      recordedBy: { select: { id: true, name: true, email: true, role: true } },
      ticket: { select: { id: true, ticketNumber: true, title: true } },
    },
    orderBy: { changedAt: 'desc' },
  });

  // Summary counts per category, e.g. how many times a laptop was changed
  const summary: Record<string, { total: number; byAction: Record<string, number> }> = {};
  for (const c of changes) {
    if (!summary[c.category]) summary[c.category] = { total: 0, byAction: {} };
    summary[c.category].total += 1;
    summary[c.category].byAction[c.action] = (summary[c.category].byAction[c.action] ?? 0) + 1;
  }

  return NextResponse.json({ changes, summary });
}

// POST /api/users/[id]/equipment - manually log an equipment change (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (!authResult.user) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!ADMIN_ROLES.includes(authResult.user.role)) {
    return NextResponse.json(
      { error: 'Only administrators can log equipment changes' },
      { status: 403 }
    );
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = await req.json();
  const { category, action, label, note, changedAt, ticketId } = body;

  const validCategories = [
    'LAPTOP', 'MONITOR', 'KEYBOARD', 'MOUSE', 'HEADSET', 'SEAT', 'OTHER',
  ];
  const validActions = ['ISSUED', 'REPLACED', 'RETURNED', 'RELOCATED'];

  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: 'Invalid equipment category' }, { status: 400 });
  }
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid equipment action' }, { status: 400 });
  }

  let resolvedTicketId: string | null = null;
  if (ticketId) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, createdBy: true },
    });
    if (ticket && ticket.createdBy === id) resolvedTicketId = ticket.id;
  }

  const change = await prisma.equipmentChange.create({
    data: {
      userId: id,
      ticketId: resolvedTicketId,
      subjectName: user.name,
      subjectEmail: user.email,
      category,
      action,
      label: typeof label === 'string' && label.trim() ? label.trim() : null,
      note: typeof note === 'string' && note.trim() ? note.trim() : null,
      changedAt: changedAt ? new Date(changedAt) : new Date(),
      recordedById: authResult.user.id,
    },
    include: { recordedBy: { select: { id: true, name: true, email: true, role: true } } },
  });

  return NextResponse.json(change, { status: 201 });
}
