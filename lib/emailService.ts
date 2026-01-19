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
  async sendTicketCreatedEmail(userEmail: string, userName: string, ticketNumber: number, ticketTitle: string) {
    const subject = `Ticket Created: T-${String(ticketNumber).padStart(2, '0')} - ${ticketTitle}`;
    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f7fa; padding: 40px 20px; line-height: 1.6; }
          .enterprise { background: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 600px; margin: 0 auto; }
          .enterprise .header { background: #1f2937; padding: 30px 50px; display: flex; justify-content: space-between; align-items: center; }
          .enterprise .img { display: flex; align-items: center; justify-content: center; height: 70px; width: 70px; background-color: #ffffff; padding: 5px; border-radius: 3px; font-size: x-small; }
          .enterprise .logo-text { color: #ffffff; font-size: 22px; font-weight: 700; }
          .enterprise .header-right { text-align: right; }
          .enterprise .ticket-number { color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .enterprise .status-badge { background: #3b82f6; color: #ffffff; padding: 6px 14px; border-radius: 3px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; display: inline-block; }
          .enterprise .content { padding: 45px 50px; color: #374151; }
          .enterprise .greeting { font-size: 16px; margin-bottom: 25px; color: #111827; font-weight: 500; }
          .enterprise .message { margin-bottom: 35px; line-height: 1.8; }
          .enterprise .ticket-box { background: #f9fafb; border-left: 4px solid #1f2937; padding: 30px; margin: 30px 0; }
          .enterprise .section-title { font-weight: 700; color: #1f2937; margin-bottom: 20px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
          .enterprise .detail-row { display: flex; padding: 12px 0; }
          .enterprise .detail-label { font-weight: 600; color: #6b7280; min-width: 130px; font-size: 13px; }
          .enterprise .detail-value { color: #111827; flex: 1; }
          .enterprise .footer { padding: 30px 50px; background: #1f2937; color: #9ca3af; font-size: 11px; text-align: center; }
          .enterprise .footer-divider { width: 50px; height: 2px; background: #374151; margin: 15px auto; }
        </style>
      </head>
      <body>
        <div class="enterprise">
          <div class="header">
           <div class="img">
                <img src="https://scontent-bom5-1.xx.fbcdn.net/v/t39.30808-1/305219258_504517791677834_6144998750798505197_n.png?stp=dst-png_s200x200&_nc_cat=109&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=UltkVGztHwAQ7kNvwGQr-5F&_nc_oc=Adnn2yaznuVzV6r7k-a2bUZ8TdMg335pLEN9wBgUUf0vPP0KLHSirJ2Pjzt_YjmxcWw&_nc_zt=24&_nc_ht=scontent-bom5-1.xx&_nc_gid=84IfZ53vFPTMSh6i1twDkA&oh=00_Afpo1dxy6ZzVhbnjErHdioPQhywB4njPa9eefG7oObVwQw&oe=695DAFA8" alt="ACE Healthcare Solutions" style="height:40px;">
            </div>
            <div class="logo-text">ACE Healthcare Solutions</div>
            <div class="header-right">
              <div class="ticket-number">Support Ticket</div>
              <div class="status-badge">Created</div>
            </div>
          </div>
          <div class="content">
            <div class="greeting">Dear ${userName},</div>
            <div class="message">
              Your IT support request has been successfully received and logged into our system. Our technical support team has been notified and will review your request shortly.
            </div>
            <div class="ticket-box">
              <div class="section-title">Ticket Information</div>
              <div class="detail-row">
                <div class="detail-label">Ticket Number:</div>
                <div class="detail-value">T-${String(ticketNumber).padStart(2, '0')}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Subject:</div>
                <div class="detail-value">${ticketTitle}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Status:</div>
                <div class="detail-value">Open</div>
              </div>
            </div>
            <div class="message">
              You will receive email notifications when your ticket is assigned to a team member, when there are updates, and when it is resolved. You can also track your ticket progress by logging into the support portal.
            </div>
          </div>
          <div class="footer">
            <div class="footer-divider"></div>
            This is an automated message from the IT Support Department.<br>
            Please do not reply to this email.<br>
            © 2026 ACE Healthcare Solutions. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: userEmail, subject, body });
  }

  // Email to the ticket creator when ticket is assigned
  async sendTicketAssignedNotificationToCreator(
    creatorEmail: string,
    creatorName: string,
    ticketNumber: number,
    ticketTitle: string,
    assigneeName: string
  ) {
    const subject = `Ticket Assigned: T-${String(ticketNumber).padStart(2, '0')} - ${ticketTitle}`;
    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f7fa; padding: 40px 20px; line-height: 1.6; }
          .enterprise { background: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 600px; margin: 0 auto; }
          .enterprise .header { background: #1f2937; padding: 30px 50px; display: flex; justify-content: space-between; align-items: center; }
          .enterprise .img { display: flex; align-items: center; justify-content: center; height: 70px; width: 70px; background-color: #ffffff; padding: 5px; border-radius: 3px; font-size: x-small; }
          .enterprise .logo-text { color: #ffffff; font-size: 22px; font-weight: 700; }
          .enterprise .header-right { text-align: right; }
          .enterprise .ticket-number { color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .enterprise .status-badge { background: #10b981; color: #ffffff; padding: 6px 14px; border-radius: 3px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; display: inline-block; }
          .enterprise .content { padding: 45px 50px; color: #374151; }
          .enterprise .greeting { font-size: 16px; margin-bottom: 25px; color: #111827; font-weight: 500; }
          .enterprise .message { margin-bottom: 35px; line-height: 1.8; }
          .enterprise .ticket-box { background: #f9fafb; border-left: 4px solid #1f2937; padding: 30px; margin: 30px 0; }
          .enterprise .section-title { font-weight: 700; color: #1f2937; margin-bottom: 20px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
          .enterprise .detail-row { display: flex; padding: 12px 0; }
          .enterprise .detail-label { font-weight: 600; color: #6b7280; min-width: 130px; font-size: 13px; }
          .enterprise .detail-value { color: #111827; flex: 1; }
          .enterprise .footer { padding: 30px 50px; background: #1f2937; color: #9ca3af; font-size: 11px; text-align: center; }
          .enterprise .footer-divider { width: 50px; height: 2px; background: #374151; margin: 15px auto; }
        </style>
      </head>
      <body>
        <div class="enterprise">
          <div class="header">
          <div class="img">
                <img src="https://scontent-bom5-1.xx.fbcdn.net/v/t39.30808-1/305219258_504517791677834_6144998750798505197_n.png?stp=dst-png_s200x200&_nc_cat=109&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=UltkVGztHwAQ7kNvwGQr-5F&_nc_oc=Adnn2yaznuVzV6r7k-a2bUZ8TdMg335pLEN9wBgUUf0vPP0KLHSirJ2Pjzt_YjmxcWw&_nc_zt=24&_nc_ht=scontent-bom5-1.xx&_nc_gid=84IfZ53vFPTMSh6i1twDkA&oh=00_Afpo1dxy6ZzVhbnjErHdioPQhywB4njPa9eefG7oObVwQw&oe=695DAFA8" alt="ACE Healthcare Solutions" style="height:40px;">
            </div>
            <div class="logo-text">ACE Healthcare Solutions</div>
            <div class="header-right">
              <div class="ticket-number">Support Ticket</div>
              <div class="status-badge">Assigned</div>
            </div>
          </div>
          <div class="content">
            <div class="greeting">Dear ${creatorName},</div>
            <div class="message">
              Your IT support request has been successfully assigned to <strong>${assigneeName}</strong>, a member of our technical support team. Your ticket is now being actively reviewed.
            </div>
            <div class="ticket-box">
              <div class="section-title">Ticket Information</div>
              <div class="detail-row">
                <div class="detail-label">Ticket Number:</div>
                <div class="detail-value">T-${String(ticketNumber).padStart(2, '0')}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Subject:</div>
                <div class="detail-value">${ticketTitle}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Assigned To:</div>
                <div class="detail-value">${assigneeName}</div>
              </div>
            </div>
            <div class="message">
              ${assigneeName} will review your issue and provide a response shortly. We appreciate your patience.
            </div>
          </div>
          <div class="footer">
            <div class="footer-divider"></div>
            This is an automated message from the IT Support Department.<br>
            Please do not reply to this email.<br>
            © 2026 ACE Healthcare Solutions. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: creatorEmail, subject, body });
  }

  // Email to the IT team member when a ticket is assigned to them
  async sendTicketAssignedNotificationToIT(
    itMemberEmail: string,
    itMemberName: string,
    ticketNumber: number,
    ticketTitle: string,
    creatorName: string,
    ticketDescription: string,
    ticketPriority: string
  ) {
    const subject = `New Ticket Assigned to You: T-${String(ticketNumber).padStart(2, '0')} - ${ticketTitle}`;
    const priorityColors: { [key: string]: string } = {
      LOW: '#10b981',
      MEDIUM: '#f59e0b',
      HIGH: '#ef4444',
      URGENT: '#dc2626'
    };
    const priorityColor = priorityColors[ticketPriority] || '#6b7280';
    
    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f7fa; padding: 40px 20px; line-height: 1.6; }
          .enterprise { background: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 600px; margin: 0 auto; }
          .enterprise .header { background: #1f2937; padding: 30px 50px; display: flex; justify-content: space-between; align-items: center; }
          .enterprise .img { display: flex; align-items: center; justify-content: center; height: 70px; width: 70px; background-color: #ffffff; padding: 5px; border-radius: 3px; font-size: x-small; }
          .enterprise .logo-text { color: #ffffff; font-size: 22px; font-weight: 700; }
          .enterprise .header-right { text-align: right; }
          .enterprise .ticket-number { color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .enterprise .status-badge { background: ${priorityColor}; color: #ffffff; padding: 6px 14px; border-radius: 3px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; display: inline-block; }
          .enterprise .content { padding: 45px 50px; color: #374151; }
          .enterprise .greeting { font-size: 16px; margin-bottom: 25px; color: #111827; font-weight: 500; }
          .enterprise .message { margin-bottom: 35px; line-height: 1.8; }
          .enterprise .ticket-box { background: #f9fafb; border-left: 4px solid #1f2937; padding: 30px; margin: 30px 0; }
          .enterprise .section-title { font-weight: 700; color: #1f2937; margin-bottom: 20px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
          .enterprise .detail-row { display: flex; padding: 12px 0; }
          .enterprise .detail-label { font-weight: 600; color: #6b7280; min-width: 130px; font-size: 13px; }
          .enterprise .detail-value { color: #111827; flex: 1; }
          .enterprise .description-box { background: #ffffff; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 4px; color: #374151; line-height: 1.8; }
          .enterprise .footer { padding: 30px 50px; background: #1f2937; color: #9ca3af; font-size: 11px; text-align: center; }
          .enterprise .footer-divider { width: 50px; height: 2px; background: #374151; margin: 15px auto; }
        </style>
      </head>
      <body>
        <div class="enterprise">
          <div class="header">
          <div class="img">
                <img src="https://scontent-bom5-1.xx.fbcdn.net/v/t39.30808-1/305219258_504517791677834_6144998750798505197_n.png?stp=dst-png_s200x200&_nc_cat=109&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=UltkVGztHwAQ7kNvwGQr-5F&_nc_oc=Adnn2yaznuVzV6r7k-a2bUZ8TdMg335pLEN9wBgUUf0vPP0KLHSirJ2Pjzt_YjmxcWw&_nc_zt=24&_nc_ht=scontent-bom5-1.xx&_nc_gid=84IfZ53vFPTMSh6i1twDkA&oh=00_Afpo1dxy6ZzVhbnjErHdioPQhywB4njPa9eefG7oObVwQw&oe=695DAFA8" alt="ACE Healthcare Solutions" style="height:40px;">
            </div>
            <div class="logo-text">ACE Healthcare Solutions</div>
            <div class="header-right">
              <div class="ticket-number">Support Ticket</div>
              <div class="status-badge">${ticketPriority}</div>
            </div>
          </div>
          <div class="content">
            <div class="greeting">Dear ${itMemberName},</div>
            <div class="message">
              A new support ticket has been assigned to you. Please review the details below and take appropriate action.
            </div>
            <div class="ticket-box">
              <div class="section-title">Ticket Information</div>
              <div class="detail-row">
                <div class="detail-label">Ticket Number:</div>
                <div class="detail-value">#${ticketNumber}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Subject:</div>
                <div class="detail-value">${ticketTitle}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Priority:</div>
                <div class="detail-value">${ticketPriority}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Requested By:</div>
                <div class="detail-value">${creatorName}</div>
              </div>
            </div>
            <div class="section-title">Issue Description</div>
            <div class="description-box">
              ${ticketDescription}
            </div>
            <div class="message">
              Please log in to the ticketing system to review the full details and begin working on this ticket.
            </div>
          </div>
          <div class="footer">
            <div class="footer-divider"></div>
            This is an automated message from the IT Support Department.<br>
            Please do not reply to this email.<br>
            © 2026 ACE Healthcare Solutions. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: itMemberEmail, subject, body });
  }

  async sendTicketStatusUpdateEmail(
    userEmail: string,
    userName: string,
    ticketNumber: number,
    ticketTitle: string,
    newStatus: string
  ) {
    const subject = `Ticket Status Update: T-${String(ticketNumber).padStart(2, '0')} - ${ticketTitle}`;
    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f7fa; padding: 40px 20px; line-height: 1.6; }
          .enterprise { background: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 600px; margin: 0 auto; }
          .enterprise .header { background: #1f2937; padding: 30px 50px; display: flex; justify-content: space-between; align-items: center; }
          .enterprise .img { display: flex; align-items: center; justify-content: center; height: 70px; width: 70px; background-color: #ffffff; padding: 5px; border-radius: 3px; font-size: x-small; }
          .enterprise .logo-text { color: #ffffff; font-size: 22px; font-weight: 700; }
          .enterprise .header-right { text-align: right; }
          .enterprise .ticket-number { color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .enterprise .status-badge { background: #f59e0b; color: #ffffff; padding: 6px 14px; border-radius: 3px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; display: inline-block; }
          .enterprise .content { padding: 45px 50px; color: #374151; }
          .enterprise .greeting { font-size: 16px; margin-bottom: 25px; color: #111827; font-weight: 500; }
          .enterprise .message { margin-bottom: 35px; line-height: 1.8; }
          .enterprise .ticket-box { background: #f9fafb; border-left: 4px solid #1f2937; padding: 30px; margin: 30px 0; }
          .enterprise .section-title { font-weight: 700; color: #1f2937; margin-bottom: 20px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
          .enterprise .detail-row { display: flex; padding: 12px 0; }
          .enterprise .detail-label { font-weight: 600; color: #6b7280; min-width: 130px; font-size: 13px; }
          .enterprise .detail-value { color: #111827; flex: 1; }
          .enterprise .footer { padding: 30px 50px; background: #1f2937; color: #9ca3af; font-size: 11px; text-align: center; }
          .enterprise .footer-divider { width: 50px; height: 2px; background: #374151; margin: 15px auto; }
        </style>
      </head>
      <body>
        <div class="enterprise">
          <div class="header">
          <div class="img">
                <img src="https://scontent-bom5-1.xx.fbcdn.net/v/t39.30808-1/305219258_504517791677834_6144998750798505197_n.png?stp=dst-png_s200x200&_nc_cat=109&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=UltkVGztHwAQ7kNvwGQr-5F&_nc_oc=Adnn2yaznuVzV6r7k-a2bUZ8TdMg335pLEN9wBgUUf0vPP0KLHSirJ2Pjzt_YjmxcWw&_nc_zt=24&_nc_ht=scontent-bom5-1.xx&_nc_gid=84IfZ53vFPTMSh6i1twDkA&oh=00_Afpo1dxy6ZzVhbnjErHdioPQhywB4njPa9eefG7oObVwQw&oe=695DAFA8" alt="ACE Healthcare Solutions" style="height:40px;">
            </div>
            <div class="logo-text">ACE Healthcare Solutions</div>
            <div class="header-right">
              <div class="ticket-number">Support Ticket</div>
              <div class="status-badge">Updated</div>
            </div>
          </div>
          <div class="content">
            <div class="greeting">Dear ${userName},</div>
            <div class="message">
              We want to inform you that the status of your IT support ticket has been updated by our team.
            </div>
            <div class="ticket-box">
              <div class="section-title">Ticket Information</div>
              <div class="detail-row">
                <div class="detail-label">Ticket Number:</div>
                <div class="detail-value">T-${String(ticketNumber).padStart(2, '0')}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Subject:</div>
                <div class="detail-value">${ticketTitle}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">New Status:</div>
                <div class="detail-value">${newStatus}</div>
              </div>
            </div>
            <div class="message">
              You can log in to the support portal to view detailed updates and track the progress of your ticket.
            </div>
          </div>
          <div class="footer">
            <div class="footer-divider"></div>
            This is an automated message from the IT Support Department.<br>
            Please do not reply to this email.<br>
            © 2026 ACE Healthcare Solutions. All rights reserved.
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
    ticketNumber: number,
    ticketTitle: string,
    resolutionNotes?: string
  ) {
    const subject = `Ticket Resolved: T-${String(ticketNumber).padStart(2, '0')} - ${ticketTitle}`;
    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f7fa; padding: 40px 20px; line-height: 1.6; }
          .enterprise { background: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 600px; margin: 0 auto; }
          .enterprise .header { background: #059669; padding: 30px 50px; display: flex; justify-content: space-between; align-items: center; }
          .enterprise .img { display: flex; align-items: center; justify-content: center; height: 70px; width: 70px; background-color: #ffffff; padding: 5px; border-radius: 3px; font-size: x-small; }
          .enterprise .logo-text { color: #ffffff; font-size: 22px; font-weight: 700; }
          .enterprise .header-right { text-align: right; }
          .enterprise .ticket-number { color: #d1fae5; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .enterprise .status-badge { background: #10b981; color: #ffffff; padding: 6px 14px; border-radius: 3px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; display: inline-block; }
          .enterprise .content { padding: 45px 50px; color: #374151; }
          .enterprise .greeting { font-size: 16px; margin-bottom: 25px; color: #111827; font-weight: 500; }
          .enterprise .message { margin-bottom: 35px; line-height: 1.8; }
          .enterprise .ticket-box { background: #f0fdf4; border-left: 4px solid #059669; padding: 30px; margin: 30px 0; }
          .enterprise .section-title { font-weight: 700; color: #059669; margin-bottom: 20px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
          .enterprise .detail-row { display: flex; padding: 12px 0; }
          .enterprise .detail-label { font-weight: 600; color: #6b7280; min-width: 130px; font-size: 13px; }
          .enterprise .detail-value { color: #111827; flex: 1; }
          .enterprise .footer { padding: 30px 50px; background: #059669; color: #d1fae5; font-size: 11px; text-align: center; }
          .enterprise .footer-divider { width: 50px; height: 2px; background: #10b981; margin: 15px auto; }
        </style>
      </head>
      <body>
        <div class="enterprise">
          <div class="header">
          <div class="img">
                <img src="https://scontent-bom5-1.xx.fbcdn.net/v/t39.30808-1/305219258_504517791677834_6144998750798505197_n.png?stp=dst-png_s200x200&_nc_cat=109&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=UltkVGztHwAQ7kNvwGQr-5F&_nc_oc=Adnn2yaznuVzV6r7k-a2bUZ8TdMg335pLEN9wBgUUf0vPP0KLHSirJ2Pjzt_YjmxcWw&_nc_zt=24&_nc_ht=scontent-bom5-1.xx&_nc_gid=84IfZ53vFPTMSh6i1twDkA&oh=00_Afpo1dxy6ZzVhbnjErHdioPQhywB4njPa9eefG7oObVwQw&oe=695DAFA8" alt="ACE Healthcare Solutions" style="height:40px;">
            </div>
            <div class="logo-text">ACE Healthcare Solutions</div>
            <div class="header-right">
              <div class="ticket-number">Support Ticket</div>
              <div class="status-badge">✓ Resolved</div>
            </div>
          </div>
          <div class="content">
            <div class="greeting">Dear ${userName},</div>
            <div class="message">
              Great news! Your IT support ticket has been successfully resolved by our technical support team.
            </div>
            <div class="ticket-box">
              <div class="section-title">Ticket Information</div>
              <div class="detail-row">
                <div class="detail-label">Ticket Number:</div>
                <div class="detail-value">T-${String(ticketNumber).padStart(2, '0')}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Subject:</div>
                <div class="detail-value">${ticketTitle}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Status:</div>
                <div class="detail-value">Resolved</div>
              </div>
              ${resolutionNotes ? `<div class="detail-row"><div class="detail-label">Resolution Notes:</div><div class="detail-value">${resolutionNotes}</div></div>` : ''}
            </div>
            <div class="message">
              If you are satisfied with the resolution, no further action is required. Should you experience any additional issues, please feel free to create a new support ticket.
            </div>
          </div>
          <div class="footer">
            <div class="footer-divider"></div>
            This is an automated message from the IT Support Department.<br>
            Please do not reply to this email.<br>
            © 2026 ACE Healthcare Solutions. All rights reserved.
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
    ticketNumber: number,
    ticketTitle: string,
    commenterName: string,
    comment: string
  ) {
    const subject = `New Comment on Ticket T-${String(ticketNumber).padStart(2, '0')}`;
    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f7fa; padding: 40px 20px; line-height: 1.6; }
          .enterprise { background: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 600px; margin: 0 auto; }
          .enterprise .header { background: #1f2937; padding: 30px 50px; display: flex; justify-content: space-between; align-items: center; }
          .enterprise .img { display: flex; align-items: center; justify-content: center; height: 70px; width: 70px; background-color: #ffffff; padding: 5px; border-radius: 3px; font-size: x-small; }
          .enterprise .logo-text { color: #ffffff; font-size: 22px; font-weight: 700; }
          .enterprise .header-right { text-align: right; }
          .enterprise .ticket-number { color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .enterprise .status-badge { background: #6366f1; color: #ffffff; padding: 6px 14px; border-radius: 3px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; display: inline-block; }
          .enterprise .content { padding: 45px 50px; color: #374151; }
          .enterprise .greeting { font-size: 16px; margin-bottom: 25px; color: #111827; font-weight: 500; }
          .enterprise .message { margin-bottom: 35px; line-height: 1.8; }
          .enterprise .ticket-box { background: #f9fafb; border-left: 4px solid #1f2937; padding: 30px; margin: 30px 0; }
          .enterprise .comment-box { background: #eef2ff; border-left: 4px solid #6366f1; padding: 25px; margin: 25px 0; }
          .enterprise .section-title { font-weight: 700; color: #1f2937; margin-bottom: 20px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
          .enterprise .detail-row { display: flex; padding: 12px 0; }
          .enterprise .detail-label { font-weight: 600; color: #6b7280; min-width: 130px; font-size: 13px; }
          .enterprise .detail-value { color: #111827; flex: 1; }
          .enterprise .comment-author { font-weight: 700; color: #4f46e5; margin-bottom: 10px; font-size: 14px; }
          .enterprise .comment-text { color: #374151; line-height: 1.8; }
          .enterprise .footer { padding: 30px 50px; background: #1f2937; color: #9ca3af; font-size: 11px; text-align: center; }
          .enterprise .footer-divider { width: 50px; height: 2px; background: #374151; margin: 15px auto; }
        </style>
      </head>
      <body>
        <div class="enterprise">
          <div class="header">
          <div class="img">
                <img src="https://scontent-bom5-1.xx.fbcdn.net/v/t39.30808-1/305219258_504517791677834_6144998750798505197_n.png?stp=dst-png_s200x200&_nc_cat=109&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=UltkVGztHwAQ7kNvwGQr-5F&_nc_oc=Adnn2yaznuVzV6r7k-a2bUZ8TdMg335pLEN9wBgUUf0vPP0KLHSirJ2Pjzt_YjmxcWw&_nc_zt=24&_nc_ht=scontent-bom5-1.xx&_nc_gid=84IfZ53vFPTMSh6i1twDkA&oh=00_Afpo1dxy6ZzVhbnjErHdioPQhywB4njPa9eefG7oObVwQw&oe=695DAFA8" alt="ACE Healthcare Solutions" style="height:40px;">
            </div>
            <div class="logo-text">ACE Healthcare Solutions</div>
            <div class="header-right">
              <div class="ticket-number">Support Ticket</div>
              <div class="status-badge">New Comment</div>
            </div>
          </div>
          <div class="content">
            <div class="greeting">Dear ${userName},</div>
            <div class="message">
              <strong>${commenterName}</strong> has added a new comment to your IT support ticket.
            </div>
            <div class="ticket-box">
              <div class="section-title">Ticket Information</div>
              <div class="detail-row">
                <div class="detail-label">Ticket Number:</div>
                <div class="detail-value">T-${String(ticketNumber).padStart(2, '0')}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Subject:</div>
                <div class="detail-value">${ticketTitle}</div>
              </div>
            </div>
            <div class="comment-box">
              <div class="comment-author">${commenterName}</div>
              <div class="comment-text">${comment}</div>
            </div>
            <div class="message">
              Please log in to the support portal to view the complete conversation and provide your response if needed.
            </div>
          </div>
          <div class="footer">
            <div class="footer-divider"></div>
            This is an automated message from the IT Support Department.<br>
            Please do not reply to this email.<br>
            © 2026 ACE Healthcare Solutions. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: userEmail, subject, body });
  }

  async sendNewTicketNotificationToAdmin(
    ticketNumber: number,
    ticketTitle: string,
    priority: string,
    creatorName: string,
    creatorEmail: string,
    description: string
  ) {
    const subject = `New IT Support Ticket: T-${String(ticketNumber).padStart(2, '0')} - ${priority} Priority`;
    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f7fa; padding: 40px 20px; line-height: 1.6; }
          .enterprise { background: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 600px; margin: 0 auto; }
          .enterprise .header { background: #dc2626; padding: 30px 50px; display: flex; justify-content: space-between; align-items: center; }
          .enterprise .img { display: flex; align-items: center; justify-content: center; height: 70px; width: 70px; background-color: #ffffff; padding: 5px; border-radius: 3px; font-size: x-small; }
          .enterprise .logo-text { color: #ffffff; font-size: 22px; font-weight: 700; }
          .enterprise .header-right { text-align: right; }
          .enterprise .ticket-number { color: #fecaca; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .enterprise .status-badge { background: #ef4444; color: #ffffff; padding: 6px 14px; border-radius: 3px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; display: inline-block; }
          .enterprise .content { padding: 45px 50px; color: #374151; }
          .enterprise .greeting { font-size: 16px; margin-bottom: 25px; color: #111827; font-weight: 500; }
          .enterprise .message { margin-bottom: 35px; line-height: 1.8; }
          .enterprise .ticket-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 30px; margin: 30px 0; }
          .enterprise .section-title { font-weight: 700; color: #dc2626; margin-bottom: 20px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
          .enterprise .detail-row { display: flex; padding: 12px 0; }
          .enterprise .detail-label { font-weight: 600; color: #6b7280; min-width: 130px; font-size: 13px; }
          .enterprise .detail-value { color: #111827; flex: 1; }
          .enterprise .priority-high { color: #dc2626; font-weight: 700; }
          .enterprise .footer { padding: 30px 50px; background: #dc2626; color: #fecaca; font-size: 11px; text-align: center; }
          .enterprise .footer-divider { width: 50px; height: 2px; background: #ef4444; margin: 15px auto; }
        </style>
      </head>
      <body>
        <div class="enterprise">
          <div class="header">
          <div class="img">
                <img src="https://scontent-bom5-1.xx.fbcdn.net/v/t39.30808-1/305219258_504517791677834_6144998750798505197_n.png?stp=dst-png_s200x200&_nc_cat=109&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=UltkVGztHwAQ7kNvwGQr-5F&_nc_oc=Adnn2yaznuVzV6r7k-a2bUZ8TdMg335pLEN9wBgUUf0vPP0KLHSirJ2Pjzt_YjmxcWw&_nc_zt=24&_nc_ht=scontent-bom5-1.xx&_nc_gid=84IfZ53vFPTMSh6i1twDkA&oh=00_Afpo1dxy6ZzVhbnjErHdioPQhywB4njPa9eefG7oObVwQw&oe=695DAFA8" alt="ACE Healthcare Solutions" style="height:40px;">
            </div>
            <div class="logo-text">ACE Healthcare Solutions</div>
            <div class="header-right">
              <div class="ticket-number">Admin Alert</div>
              <div class="status-badge">⚠ New Ticket</div>
            </div>
          </div>
          <div class="content">
            <div class="greeting">IT Support Team,</div>
            <div class="message">
              A new IT support ticket has been submitted and requires immediate attention from the technical support team.
            </div>
            <div class="ticket-box">
              <div class="section-title">Ticket Information</div>
              <div class="detail-row">
                <div class="detail-label">Ticket Number:</div>
                <div class="detail-value">T-${String(ticketNumber).padStart(2, '0')}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Subject:</div>
                <div class="detail-value">${ticketTitle}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Priority:</div>
                <div class="detail-value"><span class="priority-high">${priority}</span></div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Submitted By:</div>
                <div class="detail-value">${creatorName}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Email:</div>
                <div class="detail-value">${creatorEmail}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Description:</div>
                <div class="detail-value">${description}</div>
              </div>
            </div>
            <div class="message">
              Please log in to the admin panel to review, assign, and respond to this ticket promptly.
            </div>
          </div>
          <div class="footer">
            <div class="footer-divider"></div>
            This is an automated message from the IT Support System.<br>
            Immediate attention required.<br>
            © 2026 ACE Healthcare Solutions. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to helpdesk email
    return this.sendEmail({ to: process.env.HELPDESK_EMAIL!, subject, body });
  }

  async sendPasswordResetOTP(
    userEmail: string,
    userName: string,
    otp: string
  ) {
    const subject = `Password Reset OTP - ACE Healthcare`;
    const body = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f7fa; padding: 40px 20px; line-height: 1.6; }
          .enterprise { background: #ffffff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden; max-width: 600px; margin: 0 auto; }
          .enterprise .header { background: #4f46e5; padding: 30px 50px; display: flex; justify-content: space-between; align-items: center; }
          .enterprise .logo-text { color: #ffffff; font-size: 22px; font-weight: 700; }
          .enterprise .header-right { text-align: right; }
          .enterprise .ticket-number { color: #c7d2fe; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .enterprise .status-badge { background: #6366f1; color: #ffffff; padding: 6px 14px; border-radius: 3px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px; display: inline-block; }
          .enterprise .content { padding: 45px 50px; color: #374151; }
          .enterprise .greeting { font-size: 16px; margin-bottom: 25px; color: #111827; font-weight: 500; }
          .enterprise .message { margin-bottom: 35px; line-height: 1.8; }
          .enterprise .otp-box { background: #eef2ff; border-left: 4px solid #4f46e5; padding: 30px; margin: 30px 0; text-align: center; }
          .enterprise .otp-label { font-weight: 700; color: #4f46e5; margin-bottom: 15px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
          .enterprise .otp-code { font-size: 36px; font-weight: 700; color: #4f46e5; letter-spacing: 8px; font-family: 'Courier New', monospace; margin: 10px 0; }
          .enterprise .otp-expiry { font-size: 12px; color: #6b7280; margin-top: 15px; }
          .enterprise .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; }
          .enterprise .warning-text { color: #92400e; font-size: 13px; line-height: 1.6; }
          .enterprise .footer { padding: 30px 50px; background: #4f46e5; color: #c7d2fe; font-size: 11px; text-align: center; }
          .enterprise .footer-divider { width: 50px; height: 2px; background: #6366f1; margin: 15px auto; }
        </style>
      </head>
      <body>
        <div class="enterprise">
          <div class="header">
            <div class="logo-text">ACE Healthcare Solutions</div>
            <div class="header-right">
              <div class="ticket-number">Password Reset</div>
              <div class="status-badge">🔐 OTP Verification</div>
            </div>
          </div>
          <div class="content">
            <div class="greeting">Dear ${userName},</div>
            <div class="message">
              We received a request to reset your password. Use the One-Time Password (OTP) below to complete the password reset process.
            </div>
            <div class="otp-box">
              <div class="otp-label">Your OTP Code</div>
              <div class="otp-code">${otp}</div>
              <div class="otp-expiry">⏱ Valid for 15 minutes</div>
            </div>
            <div class="warning-box">
              <div class="warning-text">
                <strong>⚠️ Security Notice:</strong><br>
                • Never share this OTP with anyone<br>
                • ACE Healthcare will never ask for your OTP via phone or email<br>
                • If you didn't request this reset, please ignore this email
              </div>
            </div>
            <div class="message">
              This OTP will expire in 15 minutes. If you need a new code, you can request another password reset.
            </div>
          </div>
          <div class="footer">
            <div class="footer-divider"></div>
            This is an automated message from ACE Healthcare Solutions.<br>
            Please do not reply to this email.<br>
            © 2026 ACE Healthcare Solutions. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: userEmail, subject, body });
  }
}

export const emailService = new EmailService();
