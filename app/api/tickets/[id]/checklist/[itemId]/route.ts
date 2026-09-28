import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';
import { resolveTicketSubject } from '@/lib/ticketSubject';
import type { EquipmentAction } from '@prisma/client';

const ADMIN_ROLES = ['ADMIN', 'HR'];

async function assertTicketAccess(req: NextRequest, ticketId: string) {
  const authResult = await requireAuth(req);
  if (!authResult.user) {
    return {
      error: NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      ),
      user: null,
      ticket: null,
    };
  }

  if (!ADMIN_ROLES.includes(authResult.user.role)) {
    return {
      error: NextResponse.json(
        { error: 'Only administrators can manage checklists' },
        { status: 403 }
      ),
      user: null,
      ticket: null,
    };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      type: true,
      createdBy: true,
      relatedEmployeeId: true,
      relatedName: true,
      relatedEmail: true,
    },
  });

  if (!ticket) {
    return {
      error: NextResponse.json({ error: 'Ticket not found' }, { status: 404 }),
      user: null,
      ticket: null,
    };
  }

  return { error: null, user: authResult.user, ticket };
}

/**
 * When a checked checklist item carries an explicit equipment mapping, record it
 * against the subject (joiner) the item belongs to. Idempotent per (ticket,
 * subject, category, action): re-checking after an uncheck does not create a
 * duplicate, and unchecking never deletes history (audit trail is preserved).
 */
async function logEquipmentFromChecklist(params: {
  ticketId: string;
  createdBy: string;
  relatedEmployeeId: string | null;
  relatedName: string | null;
  relatedEmail: string | null;
  subjectId: string | null;
  recordedById: string;
  ticketType: string;
  itemTitle: string;
  category?: string | null;
  action?: string | null;
}): Promise<void> {
  const {
    ticketId,
    createdBy,
    relatedEmployeeId,
    relatedName,
    relatedEmail,
    subjectId,
    recordedById,
    ticketType,
    itemTitle,
    category,
    action,
  } = params;

  if (!category || !action) return;
  if (ticketType !== 'ONBOARDING' && ticketType !== 'OFFBOARDING') return;

  const existing = await prisma.equipmentChange.findFirst({
    where: {
      ticketId,
      subjectId: subjectId ?? null,
      category: category as any,
      action: action as EquipmentAction,
    },
    select: { id: true },
  });
  if (existing) return;

  // Resolve the person this equipment is for: prefer the item's own subject,
  // then fall back to the legacy primary-subject resolution.
  let subject: {
    userId: string | null;
    subjectName: string | null;
    subjectEmail: string | null;
  } | null = null;
  if (subjectId) {
    const row = await prisma.ticketSubject.findUnique({
      where: { id: subjectId },
      select: { employeeId: true, name: true, email: true },
    });
    if (row?.employeeId) {
      subject = { userId: row.employeeId, subjectName: row.name, subjectEmail: row.email };
    } else if (row && (row.name || row.email)) {
      subject = {
        userId: null,
        subjectName: row.name ?? row.email,
        subjectEmail: row.email ?? null,
      };
    }
  }
  if (!subject) {
    const resolved = await resolveTicketSubject({
      id: ticketId,
      createdBy,
      relatedEmployeeId,
      relatedName,
      relatedEmail,
    });
    subject = {
      userId: resolved.userId,
      subjectName: resolved.subjectName,
      subjectEmail: resolved.subjectEmail,
    };
  }

  await prisma.equipmentChange.create({
    data: {
      userId: subject.userId,
      ticketId,
      subjectId: subjectId ?? null,
      subjectName: subject.subjectName,
      subjectEmail: subject.subjectEmail,
      category: category as any,
      action: action as EquipmentAction,
      label: itemTitle,
      recordedById,
    },
  });
}

// PATCH /api/tickets/[id]/checklist/[itemId] - toggle done, update, or reorder
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const access = await assertTicketAccess(req, id);
  if (access.error || !access.user || !access.ticket) return access.error;

  const body = await req.json();
  const item = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      ticketId: true,
      title: true,
      done: true,
      subjectId: true,
      equipmentCategory: true,
      equipmentAction: true,
    },
  });

  if (!item || item.ticketId !== id) {
    return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
  }

  const updateData: any = {};
  if (typeof body.done === 'boolean') updateData.done = body.done;
  if (typeof body.title === 'string' && body.title.trim()) updateData.title = body.title.trim();
  if (typeof body.note === 'string') updateData.note = body.note.trim() || null;
  if (typeof body.order === 'number') updateData.order = body.order;
  if (typeof body.equipmentCategory === 'string') updateData.equipmentCategory = body.equipmentCategory || null;
  if (typeof body.equipmentAction === 'string') updateData.equipmentAction = body.equipmentAction || null;

  if (body.done === true && !item.done) {
    updateData.doneAt = new Date();
    updateData.doneById = access.user.id;
  } else if (body.done === false && item.done) {
    updateData.doneAt = null;
    updateData.doneById = null;
  }

  const updated = await prisma.checklistItem.update({
    where: { id: itemId },
    data: updateData,
    include: { doneBy: { select: { id: true, name: true, email: true, role: true } } },
  });

  // Equipment glue: log the equipment event when the item is checked and it has
  // an explicit equipment mapping.
  if (updateData.done === true) {
    await logEquipmentFromChecklist({
      ticketId: id,
      createdBy: access.ticket.createdBy,
      relatedEmployeeId: access.ticket.relatedEmployeeId,
      relatedName: access.ticket.relatedName,
      relatedEmail: access.ticket.relatedEmail,
      subjectId: item.subjectId,
      recordedById: access.user.id,
      ticketType: access.ticket.type,
      itemTitle: updated.title,
      category: updated.equipmentCategory,
      action: updated.equipmentAction,
    });
  }

  return NextResponse.json(updated);
}

// DELETE /api/tickets/[id]/checklist/[itemId] - remove a checklist item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const access = await assertTicketAccess(req, id);
  if (access.error || !access.user || !access.ticket) return access.error;

  const item = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    select: { id: true, ticketId: true },
  });

  if (!item || item.ticketId !== id) {
    return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
  }

  await prisma.checklistItem.delete({ where: { id: itemId } });

  return NextResponse.json({ success: true, message: 'Checklist item deleted' });
}