import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, unauthorizedResponse } from '@/lib/roleAuth';

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
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        screenshots: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check if user has access to this ticket
    if (user.role !== 'ADMIN' && ticket.createdBy !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
    if (user.role !== 'ADMIN' && existingTicket.createdBy !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (resolvedAt !== undefined) updateData.resolvedAt = resolvedAt;

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
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        screenshots: true,
      },
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


