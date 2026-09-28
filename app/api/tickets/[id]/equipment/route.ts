import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';
import { resolveTicketSubject, resolveTicketSubjects } from '@/lib/ticketSubject';
import type { EquipmentCategory, EquipmentAction } from '@prisma/client';

const ADMIN_ROLES = ['ADMIN', 'HR'];

const VALID_CATEGORIES: EquipmentCategory[] = [
  'LAPTOP', 'MONITOR', 'KEYBOARD', 'MOUSE', 'HEADSET', 'SEAT', 'OTHER',
];
const VALID_ACTIONS: EquipmentAction[] = ['ISSUED', 'REPLACED', 'RETURNED', 'RELOCATED'];

async function loadTicket(ticketId: string) {
  return prisma.ticket.findUnique({
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
}

// GET /api/tickets/[id]/equipment - the full equipment history for the people
// this ticket is about (across every ticket), not just this ticket. Lifecycle
// tickets resolve to their subjects (joiners); support tickets to the reporter.
// Pass ?subjectId= to view a specific joiner on a multi-subject ticket.
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

  const ticket = await loadTicket(id);
  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  if (
    !ADMIN_ROLES.includes(authResult.user.role) &&
    (ticket.type !== 'SUPPORT' || ticket.createdBy !== authResult.user.id)
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const requestedSubjectId = searchParams.get('subjectId');

  const subjects = await resolveTicketSubjects(ticket);

  const subject = subjects.find((s) => s.id === requestedSubjectId) ?? subjects[0];

  // Row-based subjects are filtered explicitly; creator/legacy fallbacks keep
  // the ticket's own rows plus identity matches.
  const rowSubjectId =
    subject?.id && subject.id !== 'creator' && subject.id !== 'related'
      ? subject.id
      : null;

  const changes = await prisma.equipmentChange.findMany({
    where: {
      OR: [
        ...(subject?.userId ? [{ userId: subject.userId }] : []),
        ...(subject?.subjectEmail
          ? [{ subjectEmail: subject.subjectEmail }]
          : []),
        ...(subject?.isPending && subject.subjectName
          ? [{ subjectName: subject.subjectName }]
          : []),
        rowSubjectId
          ? { ticketId: id, subjectId: rowSubjectId }
          : { ticketId: id, subjectId: null },
      ],
    },
    include: {
      recordedBy: { select: { id: true, name: true, email: true, role: true } },
      subject: {
        include: { employee: { select: { id: true, name: true, email: true, role: true } } },
      },
      ticket: { select: { id: true, ticketNumber: true, title: true, type: true } },
    },
    orderBy: { changedAt: 'desc' },
  });

  return NextResponse.json({ subjects, subject, changes });
}

// POST /api/tickets/[id]/equipment - manually log an equipment change (admin
// only). The change is always attributed to the ticket's subject, never to the
// admin who records it.
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

  const ticket = await loadTicket(id);
  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  const body = await req.json();
  const { category, action, label, note, changedAt, subjectId } = body;

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid equipment category' }, { status: 400 });
  }
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'Invalid equipment action' }, { status: 400 });
  }

  // A manual log is attributed to a specific joiner when given (multi-subject
  // tickets), otherwise to the primary subject.
  let subjectRecordId: string | null = null;
  let subject = await resolveTicketSubject(ticket);
  if (subjectId && typeof subjectId === 'string') {
    const row = await prisma.ticketSubject.findFirst({
      where: { id: subjectId, ticketId: id },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
      },
    });
    if (!row) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    subjectRecordId = row.id;
    if (row.employeeId) {
      const user = await prisma.user.findUnique({
        where: { id: row.employeeId },
        select: { id: true, name: true, email: true },
      });
      if (user) {
        subject = {
          id: row.id,
          userId: user.id,
          subjectName: user.name,
          subjectEmail: user.email,
          isPending: false,
        };
      } else {
        subject = {
          id: row.id,
          userId: null,
          subjectName: row.name ?? row.email,
          subjectEmail: row.email ?? null,
          isPending: true,
        };
      }
    } else {
      subject = {
        id: row.id,
        userId: null,
        subjectName: row.name ?? row.email,
        subjectEmail: row.email ?? null,
        isPending: true,
      };
    }
  }

  const change = await prisma.equipmentChange.create({
    data: {
      userId: subject.userId,
      ticketId: id,
      subjectId: subjectRecordId,
      subjectName: subject.subjectName,
      subjectEmail: subject.subjectEmail,
      category,
      action,
      label: typeof label === 'string' && label.trim() ? label.trim() : null,
      note: typeof note === 'string' && note.trim() ? note.trim() : null,
      changedAt: changedAt ? new Date(changedAt) : new Date(),
      recordedById: authResult.user.id,
    },
    include: {
      recordedBy: { select: { id: true, name: true, email: true, role: true } },
      subject: {
        include: { employee: { select: { id: true, name: true, email: true, role: true } } },
      },
      ticket: { select: { id: true, ticketNumber: true, title: true, type: true } },
    },
  });

  return NextResponse.json(change, { status: 201 });
}