# Late Arrival Notification System

This system notifies managers when team members are late or haven't clocked in after the designated shift start time.

## Features

- ✅ Configurable shift start time per manager
- ✅ Customizable grace period (late threshold in minutes)
- ✅ Automatic email notifications to managers
- ✅ Web notifications in the manager dashboard
- ✅ Daily check to prevent duplicate notifications
- ✅ Separate email service from ticketing system

## Setup

### 1. Environment Variables

Add the following to your `.env` file:

```env
# Optional: Separate email for attendance notifications
# If not set, will use HELPDESK_EMAIL
ATTENDANCE_EMAIL=attendance@yourcompany.com

# Required: Azure AD credentials (same as ticketing system)
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

### 2. Database Migration

The database migration has already been applied. It adds:
- `shiftStartTime` (TEXT) - Format: "HH:mm" (e.g., "09:00")
- `lateThresholdMins` (INTEGER) - Default: 15 minutes
- `Notification` table for web notifications

### 3. Manager Settings

Managers can configure their shift settings:

1. Click on their avatar in the top right
2. Click "Settings"
3. Navigate to "Shift & Late Arrival Settings" section
4. Set:
   - **Shift Start Time**: When team members should start (e.g., 09:00)
   - **Late Threshold**: Grace period in minutes (e.g., 15)
5. Click "Save Shift Settings"

The system will send notifications when team members haven't clocked in by:
```
Notification Time = Shift Start Time + Late Threshold Minutes
```

Example: If shift starts at 09:00 and threshold is 15 minutes, notifications are sent at 09:15.

## Running the Cron Job

There are several ways to check for late arrivals:

### Option 1: Manual API Call

Managers can trigger a check manually by calling:
```bash
POST /api/attendance/check-late
Authorization: Bearer <manager-jwt-token>
```

### Option 2: Scheduled Script (Recommended)

Run the provided script periodically:

```bash
# Run once
npm run check-late-arrivals

# Or with ts-node
ts-node scripts/check-late-arrivals.ts
```

**Setup automated scheduling:**

#### On Linux/Mac (crontab):
```bash
# Run every hour from 9 AM to 6 PM on weekdays
0 9-18 * * 1-5 cd /path/to/time-tracker-backend && npm run check-late-arrivals
```

#### On Windows (Task Scheduler):
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily at 9:00 AM
4. Set action: Start a program
   - Program: `node`
   - Arguments: `scripts/check-late-arrivals.ts`
   - Start in: `D:\time-tracker-backend`
5. Advanced settings: Repeat every 1 hour for 9 hours

### Option 3: Vercel Cron (for Vercel deployment)

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/attendance/check-late",
    "schedule": "0 9-18 * * 1-5"
  }]
}
```

### Option 4: GitHub Actions

Create `.github/workflows/check-late-arrivals.yml`:
```yaml
name: Check Late Arrivals
on:
  schedule:
    - cron: '0 9-18 * * 1-5'  # Every hour 9 AM - 6 PM weekdays
  workflow_dispatch:  # Allow manual trigger

jobs:
  check-late:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run check-late-arrivals
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          ATTENDANCE_EMAIL: ${{ secrets.ATTENDANCE_EMAIL }}
```

## How It Works

1. **Manager Configuration**: Each manager sets their shift time and grace period in settings

2. **Automated Check**: The system runs periodically (e.g., every hour) and:
   - Gets all managers with shift settings configured
   - For each manager:
     - Checks if current time > shift start + threshold
     - Gets their department's active team members
     - Checks who hasn't clocked in today
     - Creates a web notification for the manager
     - Sends an email with the list of late employees

3. **Notification Delivery**:
   - **Web**: Notification appears in the manager's dashboard (future feature)
   - **Email**: Professional HTML email sent to manager's email address

4. **Duplicate Prevention**: Only one notification per manager per day

## Email Template

The email includes:
- Date and current time
- Shift start time
- Late threshold
- Number of absent employees
- List of employee names and emails
- Professional formatting with company branding

## API Endpoints

### Get Shift Settings
```
GET /api/users/settings/shift
Authorization: Bearer <manager-jwt-token>

Response:
{
  "shiftStartTime": "09:00",
  "lateThresholdMins": 15
}
```

### Update Shift Settings
```
PUT /api/users/settings/shift
Authorization: Bearer <manager-jwt-token>
Content-Type: application/json

{
  "shiftStartTime": "09:00",
  "lateThresholdMins": 15
}
```

### Manual Late Check
```
POST /api/attendance/check-late
Authorization: Bearer <manager-jwt-token>

Response:
{
  "message": "Found 3 late employee(s)",
  "lateEmployees": [
    { "id": "...", "name": "John Doe", "email": "john@example.com" },
    { "id": "...", "name": "Jane Smith", "email": "jane@example.com" }
  ],
  "cutoffTime": "2026-01-31T09:15:00.000Z"
}
```

### Get Notifications
```
GET /api/notifications?unreadOnly=true&limit=50
Authorization: Bearer <user-jwt-token>

Response:
{
  "notifications": [...],
  "unreadCount": 3
}
```

### Mark Notifications as Read
```
POST /api/notifications/mark-read
Authorization: Bearer <user-jwt-token>
Content-Type: application/json

{
  "notificationIds": ["id1", "id2"],
  "markAll": false
}
```

## Database Schema

### User Table (additions)
```prisma
model User {
  // ... existing fields
  shiftStartTime     String?               // Format: HH:mm
  lateThresholdMins  Int?    @default(15)  // Minutes
  notifications      Notification[]
}
```

### Notification Table
```prisma
model Notification {
  id        String           @id @default(uuid())
  userId    String
  type      NotificationType
  title     String
  message   String
  data      Json?
  read      Boolean          @default(false)
  createdAt DateTime         @default(now())
  user      User             @relation(...)
}

enum NotificationType {
  LATE_ARRIVAL
  TASK_ASSIGNED
  TASK_COMPLETED
  TICKET_ASSIGNED
  TICKET_UPDATED
  LEAVE_APPROVED
  LEAVE_REJECTED
  GENERAL
}
```

## Troubleshooting

### Notifications not being sent

1. Check manager has shift settings configured
2. Verify ATTENDANCE_EMAIL or HELPDESK_EMAIL is set
3. Check Azure AD credentials are correct
4. Ensure cron job is running
5. Check logs for errors: `tail -f logs/app.log`

### Wrong employees being notified

1. Verify manager is assigned to correct department
2. Check employee department assignments
3. Ensure employment status is ACTIVE

### Testing

Test the system without waiting for cron:
```bash
# Call API directly
curl -X POST http://localhost:3000/api/attendance/check-late \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN"

# Or run script
npm run check-late-arrivals
```

## Future Enhancements

- [ ] Web notification UI component in manager dashboard
- [ ] Real-time notifications using WebSockets
- [ ] SMS notifications (Twilio integration)
- [ ] Notification preferences per manager
- [ ] Historical late arrival reports
- [ ] Integration with HR leave system
- [ ] Mobile push notifications
