import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';

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

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, type: true, createdBy: true },
  });

  if (!ticket) {
    return {
      error: NextResponse.json({ error: 'Ticket not found' }, { status: 404 }),
      user: null,
      ticket: null,
    };
  }

  // Lifecycle tickets are admin-only; support tickets belong to their creator
  if (
    !ADMIN_ROLES.includes(authResult.user.role) &&
    (ticket.type !== 'SUPPORT' || ticket.createdBy !== authResult.user.id)
  ) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }),
      user: null,
      ticket: null,
    };
  }

  return { error: null, user: authResult.user, ticket };
}

// GET /api/tickets/[id]/checklist - List checklist items for a ticket
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await assertTicketAccess(req, id);
  if (access.error || !access.ticket) return access.error;

  const items = await prisma.checklistItem.findMany({
    where: { ticketId: id },
    include: {
      doneBy: { select: { id: true, name: true, email: true, role: true } },
      subject: {
        include: { employee: { select: { id: true, name: true, email: true, role: true } } },
      },
    },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json(items);
}

// POST /api/tickets/[id]/checklist - Add a checklist item (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await assertTicketAccess(req, id);
  if (access.error || !access.user || !access.ticket) return access.error;

  if (!ADMIN_ROLES.includes(access.user.role)) {
    return NextResponse.json(
      { error: 'Only administrators can manage checklists' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const note = typeof body.note === 'string' ? body.note.trim() : null;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // New items on multi-subject tickets are assigned to a specific joiner when
  // given, otherwise to the primary subject.
  let subjectId: string | null = null;
  if (
    access.ticket.type === 'ONBOARDING' ||
    access.ticket.type === 'OFFBOARDING'
  ) {
    if (typeof body.subjectId === 'string' && body.subjectId) {
      const subject = await prisma.ticketSubject.findFirst({
        where: { id: body.subjectId, ticketId: id },
        select: { id: true },
      });
      if (!subject) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }
      subjectId = subject.id;
    } else {
      const primary = await prisma.ticketSubject.findFirst({
        where: { ticketId: id, isPrimary: true },
        select: { id: true },
      });
      subjectId = primary?.id ?? null;
    }
  }

  // Append after the last item so ordering stays stable
  const last = await prisma.checklistItem.findFirst({
    where: { ticketId: id },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const item = await prisma.checklistItem.create({
    data: {
      ticketId: id,
      title,
      note,
      order: (last?.order ?? -1) + 1,
      subjectId,
    },
    include: {
      doneBy: { select: { id: true, name: true, email: true, role: true } },
      subject: {
        include: { employee: { select: { id: true, name: true, email: true, role: true } } },
      },
    },
  });

  return NextResponse.json(item, { status: 201 });
}
