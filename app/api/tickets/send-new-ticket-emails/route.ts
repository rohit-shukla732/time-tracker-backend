import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/emailService';
import { requireAuth } from '@/lib/requireAuth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId } = body;

    // Fetch ticket with relations
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        creator: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const emailsSent = { confirmationToCreator: false, notificationToAdmin: false };

    try {
      // Send confirmation email to ticket creator
      await emailService.sendTicketCreatedEmail(
        ticket.creator.email,
        ticket.creator.name || 'User',
        ticket.ticketNumber,
        ticket.title
      );
      emailsSent.confirmationToCreator = true;

      // Send notification to admins
      await emailService.sendNewTicketNotificationToAdmin(
        ticket.ticketNumber,
        ticket.title,
        ticket.priority,
        ticket.creator.name || 'User',
        ticket.creator.email,
        ticket.description
      );
      emailsSent.notificationToAdmin = true;

      return NextResponse.json({ success: true, emailsSent });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return NextResponse.json({ 
        success: true, 
        emailsSent,
        emailError: emailError instanceof Error ? emailError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error in send-new-ticket-emails route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
