# Email Integration Setup Guide

## Overview
The ticketing system now includes email notifications using Microsoft Graph API through Azure.

## Configuration

### Environment Variables
Make sure these are set in your `.env` file:

```env
AZURE_TENANT_ID="4f3f26b0-cf61-4278-b913-b594f6ae58c6"
AZURE_CLIENT_ID="c553e668-8725-47ba-abde-96572a2ca51b"
AZURE_CLIENT_SECRET="<your-azure-ad-client-secret>"
HELPDESK_EMAIL="helpdesk@acehcs.com"
```

## Email Templates

### 1. Ticket Created
- **Recipient:** User who created the ticket
- **When:** Immediately after ticket creation
- **Content:** Confirmation with ticket ID and next steps

### 2. Ticket Assigned
- **Recipient:** User who created the ticket
- **When:** When an IT member is assigned to the ticket
- **Content:** Assignee name and reassurance

### 3. Status Update
- **Recipient:** User who created the ticket
- **When:** Ticket status changes
- **Content:** New status information

### 4. Ticket Resolved
- **Recipient:** User who created the ticket
- **When:** Ticket is marked as resolved
- **Content:** Resolution confirmation and optional notes

### 5. New Comment
- **Recipient:** User who created the ticket
- **When:** Someone adds a comment
- **Content:** Comment text and commenter name

### 6. Admin Notification
- **Recipient:** IT Support team (helpdesk@acehcs.com)
- **When:** New ticket is created
- **Content:** Ticket details and priority

## Testing

### Test Page
Navigate to: `http://localhost:3000/email-test`

This page allows you to:
- Send test emails to any address
- Test all 6 email templates
- Verify Azure configuration
- Check email delivery

### API Endpoint
```bash
# Test ticket created email
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"testType":"ticket-created","email":"your@email.com"}'

# Test admin notification
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"testType":"admin-notification","email":"your@email.com"}'
```

### Available Test Types
- `ticket-created`
- `ticket-assigned`
- `ticket-status`
- `ticket-resolved`
- `ticket-comment`
- `admin-notification`

## Integration Points

### When to Send Emails

1. **New Ticket Created**
   ```typescript
   await emailService.sendTicketCreatedEmail(
     userEmail,
     userName,
     ticketId,
     ticketTitle
   );
   
   await emailService.sendNewTicketNotificationToAdmin(
     ticketId,
     ticketTitle,
     priority,
     creatorName,
     creatorEmail,
     description
   );
   ```

2. **Ticket Assigned**
   ```typescript
   await emailService.sendTicketAssignedEmail(
     userEmail,
     userName,
     ticketId,
     ticketTitle,
     assigneeName
   );
   ```

3. **Status Changed**
   ```typescript
   await emailService.sendTicketStatusUpdateEmail(
     userEmail,
     userName,
     ticketId,
     ticketTitle,
     newStatus
   );
   ```

4. **Ticket Resolved**
   ```typescript
   await emailService.sendTicketResolvedEmail(
     userEmail,
     userName,
     ticketId,
     ticketTitle,
     resolutionNotes
   );
   ```

5. **Comment Added**
   ```typescript
   await emailService.sendTicketCommentEmail(
     userEmail,
     userName,
     ticketId,
     ticketTitle,
     commenterName,
     comment
   );
   ```

## Troubleshooting

### Email Not Sending
1. Check Azure credentials in `.env`
2. Verify helpdesk@acehcs.com has proper permissions
3. Check server console for error messages
4. Ensure Azure App Registration has Mail.Send permission

### Permission Issues
The Azure service principal needs:
- `Mail.Send` application permission
- Admin consent granted

### Testing Tips
- Start with simple test to verify credentials work
- Use your own email for testing
- Check spam folder if email doesn't arrive
- Review console logs for detailed error messages

## Next Steps

To integrate into ticket creation:
1. Open `app/helpdesk/employee/new/page.tsx`
2. Add email service call in `handleSubmit`
3. Open `app/helpdesk/admin/tickets/[id]/page.tsx`
4. Add email calls for status/assignment changes
5. Add comment notification in comment submission

## Files Created
- `lib/emailService.ts` - Main email service
- `app/api/email/test/route.ts` - Test API endpoint
- `app/email-test/page.tsx` - Test UI page
