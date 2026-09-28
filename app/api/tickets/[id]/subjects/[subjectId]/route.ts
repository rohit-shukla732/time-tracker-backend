import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, unauthorizedResponse } from '@/lib/roleAuth';

const ADMIN_ROLES = ['ADMIN', 'HR'];

// DELETE /api/tickets/[id]/subjects/[subjectId]
// Remove a joiner from a lifecycle ticket. Deletes that joiner's checklist copy
// and equipment changes, then the subject itself. If the primary is removed and
// others remain, the first remaining is promoted (and mirrored into the
// relatedEmployee fields); if none remain the mirrors are cleared.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subjectId: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }
  if (!ADMIN_ROLES.includes(authResult.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id, subjectId } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        subjects: {
          select: { id: true, isPrimary: true, employeeId: true, name: true, email: true, createdAt: true },
          orderBy: { createdAt: 'asc' as const },
        },
      },
    });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    if (ticket.type === 'SUPPORT') {
      return NextResponse.json({ error: 'Support tickets have no joiners to remove' }, { status: 400 });
    }

    const subjectIndex = ticket.subjects.findIndex((s) => s.id === subjectId);
    if (subjectIndex === -1) {
      return NextResponse.json({ error: 'Joiner not found on this ticket' }, { status: 404 });
    }

    const removed = ticket.subjects[subjectIndex];
    const remaining = ticket.subjects.filter((s) => s.id !== subjectId);

    // Remove the joiner's own checklist copy and equipment records
    await prisma.checklistItem.deleteMany({ where: { subjectId } });
    await prisma.equipmentChange.deleteMany({ where: { subjectId } });
    await prisma.ticketSubject.delete({ where: { id: subjectId } });

    // Recompute the primary subject + related employee mirrors
    if (remaining.length > 0) {
      const nextPrimary = remaining[0];
      if (removed.isPrimary) {
        await prisma.ticketSubject.update({
          where: { id: nextPrimary.id },
          data: { isPrimary: true },
        });
        await prisma.ticket.update({
          where: { id },
          data: {
            relatedEmployeeId: nextPrimary.employeeId,
            relatedName: nextPrimary.name,
            relatedEmail: nextPrimary.email,
          },
        });
      }
    } else {
      await prisma.ticket.update({
        where: { id },
        data: {
          relatedEmployeeId: null,
          relatedName: null,
          relatedEmail: null,
        },
      });
    }

    return NextResponse.json({ success: true, remaining: remaining.length });
  } catch (error) {
    console.error('[tickets] DELETE subject error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}