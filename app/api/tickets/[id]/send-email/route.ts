import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/emailService';
import { requireAuth } from '@/lib/requireAuth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { type, newStatus, comment, assignedToId } = body;

    // Fetch ticket with relations
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        creator: true,
        assignee: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    let emailSent = false;

    try {
      switch (type) {
        case 'status_update':
          if (newStatus === 'RESOLVED') {
            await emailService.sendTicketResolvedEmail(
              ticket.creator.email,
              ticket.creator.name || 'User',
              ticket.ticketNumber,
              ticket.title
            );
          } else {
            await emailService.sendTicketStatusUpdateEmail(
              ticket.creator.email,
              ticket.creator.name || 'User',
              ticket.ticketNumber,
              ticket.title,
              newStatus.replace(/_/g, ' ')
            );
          }
          emailSent = true;
          break;

        case 'assignment':
          if (assignedToId) {
            const assignedUser = await prisma.user.findUnique({
              where: { id: assignedToId },
            });
            if (assignedUser && assignedUser.name) {
              // Send email to the IT member who was assigned the ticket
              await emailService.sendTicketAssignedNotificationToIT(
                assignedUser.email,
                assignedUser.name,
                ticket.ticketNumber,
                ticket.title,
                ticket.creator.name || 'User',
                ticket.description,
                ticket.priority
              );
              
              // Send email to the ticket creator notifying them of assignment
              await emailService.sendTicketAssignedNotificationToCreator(
                ticket.creator.email,
                ticket.creator.name || 'User',
                ticket.ticketNumber,
                ticket.title,
                assignedUser.name
              );
              
              emailSent = true;
            }
          }
          break;

        case 'comment':
          if (comment) {
            const user = authResult.user as { name: string; userId: string; role: string };
            await emailService.sendTicketCommentEmail(
              ticket.creator.email,
              ticket.creator.name || 'User',
              ticket.ticketNumber,
              ticket.title,
              user.name,
              comment
            );
            emailSent = true;
          }
          break;

        default:
          return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
      }

      return NextResponse.json({ success: true, emailSent });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the request if email fails
      return NextResponse.json({ 
        success: true, 
        emailSent: false,
        emailError: emailError instanceof Error ? emailError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error in send-email route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
