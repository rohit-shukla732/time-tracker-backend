import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';
import type { EquipmentCategory, EquipmentAction } from '@prisma/client';
import { TicketPriority, TicketType } from '@/types';

// Shared include payload so every ticket response carries the same shape
const TICKET_INCLUDE = {
  creator: { select: { id: true, name: true, email: true, role: true } },
  assignee: { select: { id: true, name: true, email: true, role: true } },
  relatedEmployee: { select: { id: true, name: true, email: true, role: true } },
  subjects: {
    include: { employee: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { isPrimary: 'desc' as const },
  },
  category: { select: { id: true, name: true, active: true } },
  subcategory: { select: { id: true, categoryId: true, name: true, active: true } },
  comments: {
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  screenshots: true,
  checklist: {
    include: { doneBy: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { order: 'asc' as const },
  },
};

const LIFECYCLE_TYPES: TicketType[] = [TicketType.ONBOARDING, TicketType.OFFBOARDING];
const ADMIN_ROLES = ['ADMIN', 'HR'];

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
    const type = searchParams.get('type');
    const limitParam = parseInt(searchParams.get('limit') || '', 10);

    const where: any = {};

    // Non-admin users can only see their own tickets; lifecycle
    // (onboarding/offboarding) tickets are always admin-only.
    if (!ADMIN_ROLES.includes(user.role)) {
      where.createdBy = user.id;
      where.type = 'SUPPORT';
    } else if (type) {
      where.type = type;
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
        {
          subjects: {
            some: {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
      if (!Number.isNaN(asNumber)) {
        searchOr.push({ ticketNumber: asNumber });
      }
      where.OR = searchOr;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      ...(Number.isFinite(limitParam) && limitParam > 0 ? { take: limitParam } : {}),
      include: TICKET_INCLUDE,
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

    const {
      title,
      description,
      priority,
      categoryId,
      subcategoryId,
      type,
      checklist: customChecklist,
      employeeId,
      employeeName,
      employeeEmail,
      subjects,
    } = body;

    // Only SUPPORT is a plain ticket; lifecycle types are admin/HR-only
    const ticketType: TicketType =
      type && LIFECYCLE_TYPES.includes(type as TicketType) ? (type as TicketType) : TicketType.SUPPORT;

    if (LIFECYCLE_TYPES.includes(ticketType) && !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json(
        { error: 'Only administrators can create onboarding or offboarding tickets' },
        { status: 403 }
      );
    }

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Lifecycle tickets name who they are about: one or more employees and/or
    // new joiners. `subjects[]` is the multi-joiner shape; the legacy singular
    // employeeId/employeeName/employeeEmail fields are wrapped into one subject
    // for back-compat. The first subject becomes the ticket's primary subject
    // (mirrored into relatedEmployeeId/Name/Email for older code paths).
    const subjectRows: {
      employeeId: string | null;
      name: string | null;
      email: string | null;
    }[] = [];
    let relatedEmployeeId: string | null = null;
    let relatedName: string | null = null;
    let relatedEmail: string | null = null;

    if (LIFECYCLE_TYPES.includes(ticketType)) {
      const rawSubjects = Array.isArray(subjects) && subjects.length > 0
        ? subjects.map((s: any) => ({
            employeeId:
              typeof s?.employeeId === 'string' && s.employeeId ? s.employeeId : null,
            name:
              typeof s?.name === 'string' && s.name.trim() ? s.name.trim() : null,
            email:
              typeof s?.email === 'string' && s.email.trim() ? s.email.trim() : null,
          }))
        : [
            {
              employeeId:
                employeeId && typeof employeeId === 'string' ? employeeId : null,
              name:
                employeeName && typeof employeeName === 'string' ? employeeName.trim() : null,
              email:
                employeeEmail && typeof employeeEmail === 'string' ? employeeEmail.trim() : null,
            },
          ];

      for (const input of rawSubjects) {
        if (input.employeeId) {
          const employee = await prisma.user.findUnique({
            where: { id: input.employeeId },
            select: { id: true, name: true, email: true },
          });
          if (!employee) {
            return NextResponse.json({ error: 'Selected employee not found' }, { status: 400 });
          }
          subjectRows.push({
            employeeId: employee.id,
            name: employee.name,
            email: employee.email,
          });
        } else if (input.name) {
          subjectRows.push({
            employeeId: null,
            name: input.name,
            email: input.email,
          });
        } else {
          return NextResponse.json(
            { error: 'Each joiner must be an existing employee or have a name' },
            { status: 400 }
          );
        }
      }

      relatedEmployeeId = subjectRows[0]?.employeeId ?? null;
      relatedName = subjectRows[0]?.name ?? null;
      relatedEmail = subjectRows[0]?.email ?? null;
    }

    let resolvedCategoryId = categoryId ?? null;
    let resolvedSubcategoryId = subcategoryId ?? null;

    // Categories only apply to support tickets; lifecycle tickets skip them
    if (ticketType === TicketType.SUPPORT) {
      // Resolve the category: explicit id, or IT_SUPPORT, or the first active category
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
    } else {
      // Lifecycle tickets don't need a manually picked issue type; default to
      // IT_SUPPORT (or the first active category) and its OTHER subcategory so
      // the ticket is always categorized and the DB never gets nulls here.
      const itSupport = await prisma.ticketCategory.findFirst({
        where: { active: true, name: 'IT_SUPPORT' },
        select: { id: true },
      });
      resolvedCategoryId = itSupport?.id ?? null;
      if (!resolvedCategoryId) {
        const defaultCategory = await prisma.ticketCategory.findFirst({
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true },
        });
        resolvedCategoryId = defaultCategory?.id ?? null;
      }
      if (resolvedCategoryId) {
        const other = await prisma.ticketSubcategory.findFirst({
          where: { categoryId: resolvedCategoryId, active: true, name: 'OTHER' },
          select: { id: true },
        });
        resolvedSubcategoryId =
          other?.id ??
          (await prisma.ticketSubcategory.findFirst({
            where: { categoryId: resolvedCategoryId, active: true },
            orderBy: { sortOrder: 'asc' },
            select: { id: true },
          }))?.id ??
          null;
      } else {
        resolvedSubcategoryId = null;
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

    // Build the checklist items seeded from the active template (or a custom
    // list). For lifecycle tickets this template is duplicated per subject so
    // each joiner gets their own checklist.
    const baseChecklist: {
      title: string;
      order: number;
      equipmentCategory: EquipmentCategory | null;
      equipmentAction: EquipmentAction | null;
    }[] = [];
    if (LIFECYCLE_TYPES.includes(ticketType)) {
      if (Array.isArray(customChecklist) && customChecklist.length > 0) {
        baseChecklist.push(
          ...customChecklist
            .map((c: any, i: number) => ({
              title: String(typeof c === 'string' ? c : c?.title ?? '').trim(),
              order: typeof c?.order === 'number' ? c.order : i,
              equipmentCategory: c?.equipmentCategory ? (c.equipmentCategory as EquipmentCategory) : null,
              equipmentAction: c?.equipmentAction ? (c.equipmentAction as EquipmentAction) : null,
            }))
            .filter((c: { title: string }) => c.title.length > 0)
        );
      } else {
        const template = await prisma.checklistTemplate.findFirst({
          where: { type: ticketType, active: true },
          orderBy: { sortOrder: 'asc' },
          include: { items: { orderBy: { order: 'asc' } } },
        });
        if (template) {
          baseChecklist.push(
            ...template.items.map((item) => ({
              title: item.title,
              order: item.order,
              equipmentCategory: item.equipmentCategory,
              equipmentAction: item.equipmentAction,
            }))
          );
        }
      }
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        type: ticketType,
        priority: priority || TicketPriority.MEDIUM,
        categoryId: resolvedCategoryId,
        subcategoryId: resolvedSubcategoryId,
        createdBy: user.id,
        relatedEmployeeId,
        relatedName,
        relatedEmail,
        ticketNumber: nextTicketNumber,
        ...(LIFECYCLE_TYPES.includes(ticketType)
          ? {
              subjects: {
                create: subjectRows.map((s, i) => ({
                  employeeId: s.employeeId,
                  name: s.name,
                  email: s.email,
                  isPrimary: i === 0,
                })),
              },
            }
          : baseChecklist.length
            ? { checklist: { create: baseChecklist } }
            : {}),
      },
      include: TICKET_INCLUDE,
    });

    // Fan out the checklist so every joiner on a lifecycle ticket gets their
    // own copy (the nested create above cannot wire the extra ticket relation).
    if (LIFECYCLE_TYPES.includes(ticketType) && baseChecklist.length > 0) {
      const createdSubjects = await prisma.ticketSubject.findMany({
        where: { ticketId: ticket.id },
        select: { id: true },
      });
      await prisma.checklistItem.createMany({
        data: createdSubjects.flatMap((sub) =>
          baseChecklist.map((c) => ({
            title: c.title,
            order: c.order,
            equipmentCategory: c.equipmentCategory,
            equipmentAction: c.equipmentAction,
            ticketId: ticket.id,
            subjectId: sub.id,
          }))
        ),
      });
      return NextResponse.json(
        await prisma.ticket.findUnique({
          where: { id: ticket.id },
          include: TICKET_INCLUDE,
        }),
        { status: 201 }
      );
    }

    return NextResponse.json(ticket, { status: 201 });
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create ticket' },
      { status: error.status || 500 }
    );
  }
}
