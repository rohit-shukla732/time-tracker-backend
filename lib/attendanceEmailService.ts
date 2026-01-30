import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

interface LateEmployee {
  id: string;
  name: string;
  email: string;
}

export class AttendanceEmailService {
  private client: Client | null = null;

  private async getClient(): Promise<Client> {
    if (this.client) {
      return this.client;
    }

    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const attendanceEmail = process.env.ATTENDANCE_EMAIL || process.env.HELPDESK_EMAIL;

    if (!tenantId || !clientId || !clientSecret || !attendanceEmail) {
      throw new Error('Azure credentials not configured for attendance emails');
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

  async sendLateArrivalNotification(
    managerEmail: string,
    managerName: string,
    lateEmployees: LateEmployee[],
    shiftStartTime: string,
    cutoffTime: Date
  ): Promise<void> {
    try {
      const client = await this.getClient();
      const attendanceEmail = process.env.ATTENDANCE_EMAIL || process.env.HELPDESK_EMAIL;

      if (!attendanceEmail) {
        throw new Error('ATTENDANCE_EMAIL not configured');
      }

      const employeeList = lateEmployees
        .map((emp, idx) => `<li><strong>${emp.name}</strong> (${emp.email})</li>`)
        .join('');

      const formattedCutoffTime = cutoffTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const htmlBody = `
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background-color: #dc2626;
                color: white;
                padding: 20px;
                border-radius: 5px 5px 0 0;
              }
              .content {
                background-color: #f9fafb;
                padding: 30px;
                border: 1px solid #e5e7eb;
                border-top: none;
              }
              .employee-list {
                background-color: white;
                padding: 15px;
                border-left: 4px solid #dc2626;
                margin: 20px 0;
              }
              .info-box {
                background-color: #fef2f2;
                border: 1px solid #fecaca;
                padding: 15px;
                border-radius: 5px;
                margin: 15px 0;
              }
              .footer {
                color: #6b7280;
                font-size: 12px;
                text-align: center;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
              }
              ul {
                margin: 10px 0;
                padding-left: 20px;
              }
              li {
                margin: 5px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">⚠️ Late Arrival Alert</h1>
              </div>
              <div class="content">
                <p>Dear ${managerName},</p>
                
                <p>This is an automated notification regarding employee attendance for your team.</p>
                
                <div class="info-box">
                  <strong>📅 Date:</strong> ${new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}<br/>
                  <strong>🕐 Shift Start Time:</strong> ${shiftStartTime}<br/>
                  <strong>⏰ Current Time:</strong> ${formattedCutoffTime}<br/>
                  <strong>👥 Absent Employees:</strong> ${lateEmployees.length}
                </div>

                <p><strong>The following team members have not yet clocked in:</strong></p>
                
                <div class="employee-list">
                  <ul>
                    ${employeeList}
                  </ul>
                </div>

                <p>Please take appropriate action as per your company policy.</p>

                <p style="margin-top: 30px;">
                  <em>This is an automated email from the Time Tracker system. Please do not reply to this email.</em>
                </p>
              </div>
              
              <div class="footer">
                <p>Time Tracker System - Attendance Management</p>
                <p>For support, contact your IT administrator</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const message = {
        subject: `⚠️ Late Arrival Alert - ${lateEmployees.length} Employee(s) Not Clocked In`,
        body: {
          contentType: 'HTML',
          content: htmlBody,
        },
        toRecipients: [
          {
            emailAddress: {
              address: managerEmail,
            },
          },
        ],
      };

      await client
        .api(`/users/${attendanceEmail}/sendMail`)
        .post({
          message,
          saveToSentItems: false,
        });

      console.log(`Late arrival notification sent to manager: ${managerEmail}`);
    } catch (error) {
      console.error('Failed to send late arrival email:', error);
      throw error;
    }
  }
}
