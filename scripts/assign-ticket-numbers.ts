import { prisma } from '../lib/prisma';

async function assignTicketNumbers() {
  try {
    console.log('Starting ticket number assignment...');

    // Get all tickets ordered by creation time (oldest first)
    const tickets = await prisma.ticket.findMany({
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        createdAt: true,
        ticketNumber: true,
      },
    });

    console.log(`Found ${tickets.length} tickets to process`);

    // Check if any tickets already have numbers
    const ticketsWithNumbers = tickets.filter(t => t.ticketNumber !== null && t.ticketNumber !== undefined);
    if (ticketsWithNumbers.length > 0) {
      console.log(`${ticketsWithNumbers.length} tickets already have numbers`);
    }

    // Assign sequential numbers starting from 1
    let ticketNumber = 1;
    for (const ticket of tickets) {
      if (ticket.ticketNumber === null || ticket.ticketNumber === undefined) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { ticketNumber },
        });
        console.log(`Assigned T-${String(ticketNumber).padStart(2, '0')} to ticket ${ticket.id} (created: ${ticket.createdAt})`);
        ticketNumber++;
      }
    }

    console.log('Ticket number assignment completed successfully!');
  } catch (error) {
    console.error('Error assigning ticket numbers:', error);
    throw error;
  }
}

assignTicketNumbers();
