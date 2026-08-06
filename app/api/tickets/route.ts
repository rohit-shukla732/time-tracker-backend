import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';
import { TicketPriority, TicketStatus } from '@/types';

// GET /api/tickets - Get all tickets (filtered by user role)
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');

    const where: any = {};

    // Non-admin users can only see their own tickets
    if (user.role !== 'ADMIN') {
      where.createdBy = user.id;
    }

    // Apply filters
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedTo = assignedTo;

    const tickets = await prisma.ticket.findMany({
      where,
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
            active: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            categoryId: true,
            name: true,
            active: true,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(tickets);
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tickets' },
      { status: error.status || 500 }
    );
  }
}

// POST /api/tickets - Create a new ticket
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const body = await req.json();

    const { title, description, priority, categoryId, subcategoryId } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Resolve the category: explicit id, or the first active category
    let resolvedCategoryId = categoryId ?? null;
    if (!resolvedCategoryId) {
      const defaultCategory = await prisma.ticketCategory.findFirst({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true },
      });
      resolvedCategoryId = defaultCategory?.id ?? null;
    }

    // Subcategory must belong to the resolved category
    let resolvedSubcategoryId = subcategoryId ?? null;
    if (resolvedSubcategoryId && resolvedCategoryId) {
      const sub = await prisma.ticketSubcategory.findFirst({
        where: { id: resolvedSubcategoryId, categoryId: resolvedCategoryId },
        select: { id: true },
      });
      if (!sub) resolvedSubcategoryId = null;
    } else {
      resolvedSubcategoryId = null;
    }

    // Get the next ticket number
    const lastTicket = await prisma.ticket.findFirst({
      orderBy: {
        ticketNumber: 'desc',
      },
      select: {
        ticketNumber: true,
      },
    });

    const nextTicketNumber = lastTicket ? lastTicket.ticketNumber + 1 : 1;

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        priority: priority || TicketPriority.MEDIUM,
        categoryId: resolvedCategoryId,
        subcategoryId: resolvedSubcategoryId,
        createdBy: user.id,
        ticketNumber: nextTicketNumber,
      },
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
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create ticket' },
      { status: error.status || 500 }
    );
  }
}
