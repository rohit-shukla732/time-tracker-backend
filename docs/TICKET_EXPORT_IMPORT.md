# Ticket Data Export & Import

This feature allows you to backup ticket data to CSV format and restore it later.

## Export Tickets

### From Admin Dashboard

1. Navigate to the admin ticketing dashboard at `/ticketing/admin`
2. Click the **"Export CSV"** button in the top-right corner
3. A CSV file named `tickets-export-YYYY-MM-DD.csv` will be downloaded

### CSV Format

The exported CSV contains the following columns:

- **Ticket Number**: Unique ticket identifier
- **Title**: Ticket title
- **Description**: Full ticket description
- **Status**: Current status (OPEN, IN_PROGRESS, PENDING, RESOLVED, CLOSED)
- **Priority**: Priority level (LOW, MEDIUM, HIGH, URGENT)
- **Category**: Ticket category (IT_SUPPORT, HR, FACILITIES, etc.)
- **Subcategory**: Optional subcategory
- **Created By**: User ID of ticket creator
- **Creator Name**: Name of ticket creator
- **Creator Email**: Email of ticket creator
- **Assigned To**: User ID of assignee (if assigned)
- **Assignee Name**: Name of assignee
- **Assignee Email**: Email of assignee
- **Created At**: Timestamp when ticket was created
- **Updated At**: Timestamp of last update
- **Resolved At**: Timestamp when ticket was resolved (if resolved)

## Import Tickets

### Prerequisites

- Node.js must be installed
- Database must be running and accessible
- User IDs referenced in the CSV must exist in the database

### Import Command

```powershell
node scripts/seed-tickets.mjs path/to/tickets-export-YYYY-MM-DD.csv
```

### Import Behavior

- **Duplicate Detection**: Tickets with existing ticket numbers are skipped
- **User Validation**: Creator must exist; if assignee doesn't exist, ticket is created unassigned
- **Data Preservation**: Original timestamps (created, updated, resolved) are preserved
- **Error Handling**: Failed imports are logged but don't stop the process

### Example Output

```
📖 Reading CSV file: tickets-export-2026-01-23.csv

📊 Found 50 tickets to import

✅ Imported ticket #1: Unable to access company portal...
✅ Imported ticket #2: Laptop running slowly...
⏭️  Ticket #3 already exists, skipping
⚠️  Creator ACE999 not found, skipping ticket #4
✅ Imported ticket #5: Printer not working...

📈 Import Summary:
   ✅ Imported: 47
   ⏭️  Skipped:  2
   ❌ Errors:   1
   📊 Total:    50
```

## Use Cases

### 1. Data Backup

Export tickets regularly to create backups:

```powershell
# Weekly backup
node scripts/seed-tickets.mjs backups/tickets-export-2026-01-23.csv
```

### 2. Environment Migration

Move tickets from development to production:

```powershell
# On development
# 1. Export via admin dashboard

# On production
node scripts/seed-tickets.mjs tickets-export-2026-01-23.csv
```

### 3. Database Reset Recovery

Recover ticket data after a database reset:

```powershell
# Before reset: Export tickets
# After reset: Run migrations and seed users
# Then: Import tickets back
node scripts/seed-tickets.mjs tickets-backup.csv
```

## Important Notes

⚠️ **User Dependencies**
- Ticket creators and assignees must exist in the database before importing
- If a creator doesn't exist, that ticket will be skipped
- If an assignee doesn't exist, the ticket is imported as unassigned

⚠️ **Comments & Screenshots**
- The current export/import only handles ticket metadata
- Comments and screenshots are **not** included in the export
- Future enhancement: Export related data

⚠️ **Ticket Numbers**
- Ticket numbers are preserved during import
- This maintains consistency in references and reporting
- Duplicate ticket numbers are automatically skipped

## Troubleshooting

### "File not found" Error

```
❌ Error: File not found: tickets-export-2026-01-23.csv
```

**Solution**: Provide the full path to the CSV file:
```powershell
node scripts/seed-tickets.mjs D:\Downloads\tickets-export-2026-01-23.csv
```

### "Creator not found" Warnings

```
⚠️  Creator ACE999 not found, skipping ticket #42
```

**Solution**: Ensure all users exist in the database before importing tickets. You may need to:
1. Export user data first
2. Import users before importing tickets
3. Or manually remove references to non-existent users from the CSV

### Import Hangs or Fails

**Solution**: 
- Check database connection in `prisma.config.ts`
- Ensure PostgreSQL is running
- Verify CSV file is not corrupted (check with text editor)

## API Endpoint

The export functionality uses the following API endpoint:

**GET** `/api/tickets/export`

- **Authentication**: Required (Admin only)
- **Response**: JSON array of all tickets with creator/assignee details
- **Usage**: Called automatically by the admin dashboard export button

```typescript
const response = await fetch('/api/tickets/export', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
const tickets = await response.json();
```
