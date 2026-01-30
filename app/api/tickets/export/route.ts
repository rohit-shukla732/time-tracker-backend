import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';

export async function GET(req: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(req);
    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can export tickets
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // Fetch all tickets with related data
    const tickets = await prisma.ticket.findMany({
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        ticketNumber: 'asc',
      },
    });

    return NextResponse.json(tickets, { status: 200 });
  } catch (error) {
    console.error('Error exporting tickets:', error);
    return NextResponse.json(
      { error: 'Failed to export tickets' },
      { status: 500 }
    );
  }
}
