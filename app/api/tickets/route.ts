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
    const search = searchParams.get('search');
    const limitParam = parseInt(searchParams.get('limit') || '', 10);

    const where: any = {};

    // Non-admin users can only see their own tickets
    if (user.role !== 'ADMIN') {
      where.createdBy = user.id;
    }

    // Apply filters
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo === 'none') {
      where.assignedTo = null;
    } else if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    // Global search: title, description, ticket number, creator name
    if (search && search.trim()) {
      const term = search.trim();
      const asNumber = parseInt(term.replace(/^t-0*/i, ''), 10);
      const searchOr: any[] = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { creator: { is: { name: { contains: term, mode: 'insensitive' } } } },
      ];
      if (!Number.isNaN(asNumber)) {
        searchOr.push({ ticketNumber: asNumber });
      }
      where.OR = searchOr;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      ...(Number.isFinite(limitParam) && limitParam > 0 ? { take: limitParam } : {}),
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

    // Resolve the category: explicit id, or IT_SUPPORT, or the first active category
    let resolvedCategoryId = categoryId ?? null;
    if (!resolvedCategoryId) {
      const itSupport = await prisma.ticketCategory.findFirst({
        where: { active: true, name: 'IT_SUPPORT' },
        select: { id: true },
      });
      if (itSupport) {
        resolvedCategoryId = itSupport.id;
      } else {
        const defaultCategory = await prisma.ticketCategory.findFirst({
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true },
        });
        resolvedCategoryId = defaultCategory?.id ?? null;
      }
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

    // Issue type is required whenever the category offers any
    if (!resolvedSubcategoryId && resolvedCategoryId) {
      const subCount = await prisma.ticketSubcategory.count({
        where: { categoryId: resolvedCategoryId, active: true },
      });
      if (subCount > 0) {
        return NextResponse.json(
          { error: 'Issue type is required' },
          { status: 400 }
        );
      }
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
