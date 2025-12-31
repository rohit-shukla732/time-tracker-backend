import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/emailService';

export async function POST(req: NextRequest) {
  try {
    const { testType, email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    let result = false;
    let message = '';

    switch (testType) {
      case 'ticket-created':
        result = await emailService.sendTicketCreatedEmail(
          email,
          'Test User',
          'TEST-001',
          'Test Ticket - Email Integration'
        );
        message = 'Ticket created email sent';
        break;

      case 'ticket-assigned':
        result = await emailService.sendTicketAssignedEmail(
          email,
          'Test User',
          'TEST-001',
          'Test Ticket - Email Integration',
          'IT Support Lead'
        );
        message = 'Ticket assigned email sent';
        break;

      case 'ticket-status':
        result = await emailService.sendTicketStatusUpdateEmail(
          email,
          'Test User',
          'TEST-001',
          'Test Ticket - Email Integration',
          'In Progress'
        );
        message = 'Status update email sent';
        break;

      case 'ticket-resolved':
        result = await emailService.sendTicketResolvedEmail(
          email,
          'Test User',
          'TEST-001',
          'Test Ticket - Email Integration',
          'Issue was resolved by restarting the application and clearing cache.'
        );
        message = 'Ticket resolved email sent';
        break;

      case 'ticket-comment':
        result = await emailService.sendTicketCommentEmail(
          email,
          'Test User',
          'TEST-001',
          'Test Ticket - Email Integration',
          'IT Support Team',
          'We are currently investigating this issue. We will update you shortly with our findings.'
        );
        message = 'Comment notification email sent';
        break;

      case 'admin-notification':
        result = await emailService.sendNewTicketNotificationToAdmin(
          'TEST-001',
          'Test Ticket - Email Integration',
          'URGENT',
          'Test User',
          email,
          'This is a test ticket to verify that admin notifications are working correctly.'
        );
        message = 'Admin notification email sent';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid test type' },
          { status: 400 }
        );
    }

    if (result) {
      return NextResponse.json({
        success: true,
        message,
        sentTo: email,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send email. Check server logs for details.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Email test error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email Test Endpoint',
    availableTests: [
      'ticket-created',
      'ticket-assigned',
      'ticket-status',
      'ticket-resolved',
      'ticket-comment',
      'admin-notification',
    ],
    usage: 'POST with { testType: "ticket-created", email: "user@example.com" }',
  });
}
