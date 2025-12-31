import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  isHTML?: boolean;
}

class EmailService {
  private client: Client | null = null;

  private async getClient(): Promise<Client> {
    if (this.client) {
      return this.client;
    }

    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const helpdeskEmail = process.env.HELPDESK_EMAIL;

    console.log('Email Service - Environment Variables Check:', {
      AZURE_TENANT_ID: tenantId ? 'Set' : 'Missing',
      AZURE_CLIENT_ID: clientId ? 'Set' : 'Missing',
      AZURE_CLIENT_SECRET: clientSecret ? 'Set' : 'Missing',
      HELPDESK_EMAIL: helpdeskEmail ? 'Set' : 'Missing',
    });

    if (!tenantId || !clientId || !clientSecret || !helpdeskEmail) {
      const missing = [];
      if (!tenantId) missing.push('AZURE_TENANT_ID');
      if (!clientId) missing.push('AZURE_CLIENT_ID');
      if (!clientSecret) missing.push('AZURE_CLIENT_SECRET');
      if (!helpdeskEmail) missing.push('HELPDESK_EMAIL');
      throw new Error(`Azure credentials not configured. Missing: ${missing.join(', ')}`);
    }

    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

    this.client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const token = await credential.getToken('https://graph.microsoft.com/.default');
          return token.token;
        },
      },
    });

    return this.client;
  }

  async sendEmail({ to, subject, body, isHTML = true }: EmailOptions): Promise<boolean> {
    try {
      const client = await this.getClient();
      const helpdeskEmail = process.env.HELPDESK_EMAIL;

      const message = {
        message: {
          subject,
          body: {
            contentType: isHTML ? 'HTML' : 'Text',
            content: body,
          },
          toRecipients: [
            {
              emailAddress: {
                address: to,
              },
            },
          ],
        },
        saveToSentItems: true,
      };

      await client.api(`/users/${helpdeskEmail}/sendMail`).post(message);

      console.log(`Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  // Ticket-specific email templates
  async sendTicketCreatedEmail(userEmail: string, userName: string, ticketId: string, ticketTitle: string) {
    const subject = `Ticket Created: #${ticketId} - ${ticketTitle}`;
    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 5px 5px 0 0; border-bottom: 3px solid #e5e7eb; }
          .logo-text { color: #2563eb; font-size: 28px; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px; }
          .header h1 { color: #1f2937; margin: 0; font-size: 24px; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .ticket-info { background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://acehcs.in/_next/image?url=%2Fassets%2FACE-Logo.png&w=256&q=75" alt="ACE Logo" class="logo" />
            <h1>IT Support Ticket Created</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Your IT support ticket has been successfully created. Our team has been notified and will respond as soon as possible.</p>
            
            <div class="ticket-info">
              <p><strong>Ticket ID:</strong> #${ticketId}</p>
              <p><strong>Subject:</strong> ${ticketTitle}</p>
              <p><strong>Status:</strong> Open</p>
            </div>

            <p>You will receive email updates when:</p>
            <ul>
              <li>Your ticket is assigned to an IT team member</li>
              <li>There are updates or comments on your ticket</li>
              <li>Your ticket is resolved</li>
            </ul>

            <p>You can view your ticket details and add comments by logging into the ticketing system.</p>
            
            <p>Thank you for contacting IT Support!</p>
          </div>
          <div class="footer">
            <p>This is an automated message from IT Support. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: userEmail, subject, body });
  }

  async sendTicketAssignedEmail(
    userEmail: string,
    userName: string,
    ticketId: string,
    ticketTitle: string,
    assigneeName: string
  ) {
    const subject = `Ticket Assigned: #${ticketId} - ${ticketTitle}`;
    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 5px 5px 0 0; border-bottom: 3px solid #e5e7eb; }
          .logo-text { color: #2563eb; font-size: 28px; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px; }
          .header h1 { color: #1f2937; margin: 0; font-size: 24px; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .ticket-info { background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
             <img src="https://acehcs.in/_next/image?url=%2Fassets%2FACE-Logo.png&w=256&q=75" alt="ACE Logo" class="logo" />
            <h1>Ticket Assigned</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Good news! Your IT support ticket has been assigned to <strong>${assigneeName}</strong> for resolution.</p>
            
            <div class="ticket-info">
              <p><strong>Ticket ID:</strong> #${ticketId}</p>
              <p><strong>Subject:</strong> ${ticketTitle}</p>
              <p><strong>Assigned To:</strong> ${assigneeName}</p>
            </div>

            <p>${assigneeName} will review your issue and respond shortly.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from IT Support. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: userEmail, subject, body });
  }

  async sendTicketStatusUpdateEmail(
    userEmail: string,
    userName: string,
    ticketId: string,
    ticketTitle: string,
    newStatus: string
  ) {
    const subject = `Ticket Status Update: #${ticketId} - ${ticketTitle}`;
    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 5px 5px 0 0; border-bottom: 3px solid #e5e7eb; }
          .logo-text { color: #2563eb; font-size: 28px; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px; }
          .header h1 { color: #1f2937; margin: 0; font-size: 24px; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .ticket-info { background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .status { display: inline-block; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
             <img src="https://acehcs.in/_next/image?url=%2Fassets%2FACE-Logo.png&w=256&q=75" alt="ACE Logo" class="logo" />
            <h1>Ticket Status Updated</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Your IT support ticket status has been updated.</p>
            
            <div class="ticket-info">
              <p><strong>Ticket ID:</strong> #${ticketId}</p>
              <p><strong>Subject:</strong> ${ticketTitle}</p>
              <p><strong>New Status:</strong> <span class="status">${newStatus}</span></p>
            </div>

            <p>You can view the details and any updates in the ticketing system.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from IT Support. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: userEmail, subject, body });
  }

  async sendTicketResolvedEmail(
    userEmail: string,
    userName: string,
    ticketId: string,
    ticketTitle: string,
    resolutionNotes?: string
  ) {
    const subject = `Ticket Resolved: #${ticketId} - ${ticketTitle}`;
    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 5px 5px 0 0; border-bottom: 3px solid #86efac; }
          .logo-text { color: #2563eb; font-size: 28px; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px; }
          .header h1 { color: #1f2937; margin: 0; font-size: 24px; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .ticket-info { background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .success { color: #10b981; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://acehcs.in/_next/image?url=%2Fassets%2FACE-Logo.png&w=256&q=75" alt="ACE Logo" class="logo" />
            <h1>✓ Ticket Resolved</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            <p class="success">Your IT support ticket has been resolved!</p>
            
            <div class="ticket-info">
              <p><strong>Ticket ID:</strong> #${ticketId}</p>
              <p><strong>Subject:</strong> ${ticketTitle}</p>
              <p><strong>Status:</strong> Resolved</p>
              ${resolutionNotes ? `<p><strong>Resolution Notes:</strong> ${resolutionNotes}</p>` : ''}
            </div>

            <p>If you're satisfied with the resolution, no further action is needed. If you're still experiencing issues, please reply to your ticket or create a new one.</p>
            
            <p>Thank you for using IT Support!</p>
          </div>
          <div class="footer">
            <p>This is an automated message from IT Support. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: userEmail, subject, body });
  }

  async sendTicketCommentEmail(
    userEmail: string,
    userName: string,
    ticketId: string,
    ticketTitle: string,
    commenterName: string,
    comment: string
  ) {
    const subject = `New Comment on Ticket #${ticketId}`;
    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 5px 5px 0 0; border-bottom: 3px solid #e5e7eb; }
          .logo-text { color: #2563eb; font-size: 28px; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px; }
          .header h1 { color: #1f2937; margin: 0; font-size: 24px; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .ticket-info { background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .comment { background-color: #e0e7ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #2563eb; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://acehcs.in/_next/image?url=%2Fassets%2FACE-Logo.png&w=256&q=75" alt="ACE Logo" class="logo" />
            <h1>New Comment</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            <p><strong>${commenterName}</strong> has added a comment to your ticket:</p>
            
            <div class="ticket-info">
              <p><strong>Ticket ID:</strong> #${ticketId}</p>
              <p><strong>Subject:</strong> ${ticketTitle}</p>
            </div>

            <div class="comment">
              <p><strong>${commenterName}:</strong></p>
              <p>${comment}</p>
            </div>

            <p>Log in to the ticketing system to view the full conversation and respond.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from IT Support. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: userEmail, subject, body });
  }

  async sendNewTicketNotificationToAdmin(
    ticketId: string,
    ticketTitle: string,
    priority: string,
    creatorName: string,
    creatorEmail: string,
    description: string
  ) {
    const subject = `New IT Support Ticket: #${ticketId} - ${priority} Priority`;
    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ffffff; padding: 30px 20px; text-align: center; border-radius: 5px 5px 0 0; border-bottom: 3px solid #fca5a5; }
          .logo-text { color: #2563eb; font-size: 28px; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px; }
          .header h1 { color: #1f2937; margin: 0; font-size: 24px; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .ticket-info { background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .urgent { color: #dc2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://acehcs.in/_next/image?url=%2Fassets%2FACE-Logo.png&w=256&q=75" alt="ACE Logo" class="logo" />
            <h1>⚠ New Support Ticket</h1>
          </div>
          <div class="content">
            <p>A new IT support ticket has been created and requires attention.</p>
            
            <div class="ticket-info">
              <p><strong>Ticket ID:</strong> #${ticketId}</p>
              <p><strong>Subject:</strong> ${ticketTitle}</p>
              <p><strong>Priority:</strong> <span class="urgent">${priority}</span></p>
              <p><strong>Created By:</strong> ${creatorName} (${creatorEmail})</p>
              <p><strong>Description:</strong></p>
              <p>${description}</p>
            </div>

            <p>Please log in to the admin panel to review and assign this ticket.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from IT Support System.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to helpdesk email
    return this.sendEmail({ to: process.env.HELPDESK_EMAIL!, subject, body });
  }
}

export const emailService = new EmailService();
