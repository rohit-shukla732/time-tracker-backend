import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, unauthorizedResponse } from '@/lib/roleAuth';

const ADMIN_ROLES = ['ADMIN', 'HR'];

// Shared include payload (matches /api/tickets, plus ticket-scoped equipment)
const TICKET_INCLUDE = {
  creator: { select: { id: true, name: true, email: true, role: true } },
  assignee: { select: { id: true, name: true, email: true, role: true } },
  relatedEmployee: { select: { id: true, name: true, email: true, role: true } },
  subjects: {
    include: { employee: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { isPrimary: 'desc' as const },
  },
  category: { select: { id: true, name: true } },
  subcategory: { select: { id: true, name: true } },
  comments: {
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  screenshots: true,
  checklist: {
    include: {
      doneBy: { select: { id: true, name: true, email: true, role: true } },
      subject: {
        include: { employee: { select: { id: true, name: true, email: true, role: true } } },
      },
    },
    orderBy: { order: 'asc' as const },
  },
  equipmentChanges: {
    include: {
      recordedBy: { select: { id: true, name: true, email: true, role: true } },
      subject: {
        include: { employee: { select: { id: true, name: true, email: true, role: true } } },
      },
    },
    orderBy: { changedAt: 'desc' as const },
  },
};

// GET /api/tickets/[id] - Get a single ticket
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: TICKET_INCLUDE,
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Lifecycle tickets are admin-only; support tickets are visible to their creator
    if (!ADMIN_ROLES.includes(user.role)) {
      if (ticket.type !== 'SUPPORT' || ticket.createdBy !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    return NextResponse.json(ticket);
  } catch (error: any) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ticket' },
      { status: error.status || 500 }
    );
  }
}

// PATCH /api/tickets/[id] - Update a ticket
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const { id } = await params;
    const body = await req.json();

    const { status, priority, assignedTo, resolvedAt, categoryId, subcategoryId } = body;

    // Check if ticket exists
    const existingTicket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Only admins can update tickets (except the creator can add comments)
    if (!ADMIN_ROLES.includes(user.role) && existingTicket.createdBy !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Non-admins may only update their own SUPPORT tickets, and only
    // lifecycle tickets accept admin updates at all.
    if (!ADMIN_ROLES.includes(user.role) && existingTicket.type !== 'SUPPORT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Lifecycle tickets cannot be resolved/closed until the checklist is complete
    if (
      (existingTicket.type === 'ONBOARDING' || existingTicket.type === 'OFFBOARDING') &&
      status &&
      (status === 'RESOLVED' || status === 'CLOSED')
    ) {
      const pending = await prisma.checklistItem.count({
        where: { ticketId: id, done: false },
      });
      if (pending > 0) {
        return NextResponse.json(
          { error: `Complete all checklist items before resolving (${pending} remaining)` },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (resolvedAt !== undefined) updateData.resolvedAt = resolvedAt;

    // Link (or unlink) a subject — a joiner — to an employee account. Admin/HR
    // only. The admin UI sends { subjectId, employeeId }; the legacy
    // { relatedEmployeeId } shape is accepted and maps to the primary subject.
    // Linking a previously-unlinked joiner backfills pending equipment changes
    // onto their account.
    const hasSubjectLink =
      body.subjectId !== undefined && body.employeeId !== undefined;
    const hasLegacyLink =
      body.relatedEmployeeId !== undefined && body.subjectId === undefined;
    if (hasSubjectLink || hasLegacyLink) {
      if (!ADMIN_ROLES.includes(user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      if (existingTicket.type === 'SUPPORT') {
        return NextResponse.json(
          { error: 'Only lifecycle tickets have subjects' },
          { status: 400 }
        );
      }

      const targetSubjectId =
        hasLegacyLink
          ? (await prisma.ticketSubject.findFirst({
              where: { ticketId: id, isPrimary: true },
              select: { id: true },
            }))?.id ?? null
          : (body.subjectId as string);

      const subject = targetSubjectId
        ? await prisma.ticketSubject.findFirst({
            where: { id: targetSubjectId, ticketId: id },
          })
        : null;
      if (!subject) {
        return NextResponse.json(
          hasLegacyLink
            ? { error: 'Ticket has no subject to link' }
            : { error: 'Subject not found' },
          { status: 404 }
        );
      }

      const employeeId = hasLegacyLink
        ? (body.relatedEmployeeId as string | null)
        : (body.employeeId as string | null);

      if (employeeId) {
        const employee = await prisma.user.findUnique({
          where: { id: employeeId },
          select: { id: true, name: true, email: true },
        });
        if (!employee) {
          return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }
        await prisma.ticketSubject.update({
          where: { id: subject.id },
          data: {
            employeeId: employee.id,
            name: employee.name,
            email: employee.email,
          },
        });
        if (subject.isPrimary) {
          updateData.relatedEmployeeId = employee.id;
          updateData.relatedName = employee.name;
          updateData.relatedEmail = employee.email;
        }
        // Backfill pending equipment changes recorded before the account existed
        await prisma.equipmentChange.updateMany({
          where: { ticketId: id, subjectId: subject.id, userId: null },
          data: {
            userId: employee.id,
            subjectName: employee.name,
            subjectEmail: employee.email,
          },
        });
      } else {
        await prisma.ticketSubject.update({
          where: { id: subject.id },
          data: { employeeId: null },
        });
        if (subject.isPrimary) {
          updateData.relatedEmployeeId = null;
        }
      }
    }

    if (categoryId !== undefined) {
      updateData.categoryId = categoryId || null;
      // Changing category clears a subcategory that doesn't belong to it
      if (updateData.categoryId === null) updateData.subcategoryId = null;
      if (subcategoryId !== undefined) {
        if (subcategoryId) {
          const sub = await prisma.ticketSubcategory.findFirst({
            where: { id: subcategoryId, categoryId: updateData.categoryId },
            select: { id: true },
          });
          updateData.subcategoryId = sub?.id ?? null;
        } else {
          updateData.subcategoryId = null;
        }
      } else if (existingTicket.subcategoryId) {
        const sub = await prisma.ticketSubcategory.findUnique({
          where: { id: existingTicket.subcategoryId },
          select: { categoryId: true },
        });
        if (sub && sub.categoryId !== updateData.categoryId) updateData.subcategoryId = null;
      }
    } else if (subcategoryId !== undefined) {
      if (subcategoryId) {
        const sub = await prisma.ticketSubcategory.findFirst({
          where: { id: subcategoryId, categoryId: existingTicket.categoryId ?? undefined },
          select: { id: true },
        });
        updateData.subcategoryId = sub?.id ?? null;
      } else {
        updateData.subcategoryId = null;
      }
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: TICKET_INCLUDE,
    });

    return NextResponse.json(ticket);
  } catch (error: any) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update ticket' },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/tickets/[id] - Delete a ticket and all its related records (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id } = await params;

  try {
    await prisma.ticketComment.deleteMany({ where: { ticketId: id } });
    await prisma.ticketScreenshot.deleteMany({ where: { ticketId: id } });
    await prisma.ticket.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Ticket deleted' });
  } catch (error: any) {
    console.error('Error deleting ticket:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete ticket' },
      { status: 500 }
    );
  }
}


