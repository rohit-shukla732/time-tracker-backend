import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/roleAuth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = authResult.user;
    if (user.role !== 'ADMIN' && user.role !== 'HR') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    console.log('Starting ticket number assignment...');

    // Get all tickets ordered by creation time (oldest first)
    const tickets = await prisma.ticket.findMany({
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    console.log(`Found ${tickets.length} tickets to process`);

    if (tickets.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No tickets found to assign numbers',
        totalTickets: 0,
        ticketsUpdated: 0,
      });
    }

    // Step 1: Assign temporary large numbers to avoid conflicts
    let tempNumber = 1000000;
    for (const ticket of tickets) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { ticketNumber: tempNumber },
      });
      tempNumber++;
    }

    // Step 2: Now reassign sequential numbers starting from 1
    let ticketNumber = 1;
    const updates = [];

    for (const ticket of tickets) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { ticketNumber },
      });
      updates.push({
        id: ticket.id,
        number: ticketNumber,
        createdAt: ticket.createdAt,
      });
      console.log(`Assigned T-${String(ticketNumber).padStart(2, '0')} to ticket ${ticket.id}`);
      ticketNumber++;
    }

    console.log('Ticket number assignment completed successfully!');

    return NextResponse.json({
      success: true,
      message: 'Ticket numbers reassigned successfully',
      totalTickets: tickets.length,
      ticketsUpdated: updates.length,
      updates: updates.slice(0, 10), // Return first 10 for preview
    });

  } catch (error) {
    console.error('Error assigning ticket numbers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
