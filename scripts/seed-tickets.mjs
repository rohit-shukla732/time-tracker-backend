/**
 * Ticket Data Seeder
 * 
 * This script imports ticket data from a CSV export file back into the database.
 * 
 * Usage:
 *   node scripts/seed-tickets.mjs path/to/tickets-export.csv
 * 
 * CSV Format (must match export format):
 *   Ticket Number,Title,Description,Status,Priority,Category,Subcategory,Created By,Creator Name,Creator Email,Assigned To,Assignee Name,Assignee Email,Created At,Updated At,Resolved At
 */

import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Setup Prisma with adapter
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Golden@00%23@localhost:5432/ace_ems';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function parseCSV(csvContent) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  let fields = [];

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      fields.push(current);
      current = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      // Row separator
      fields.push(current);
      if (fields.some(f => f.trim())) { // Only add non-empty rows
        rows.push(fields);
      }
      fields = [];
      current = '';
      if (char === '\r') i++; // Skip \n in \r\n
    } else {
      current += char;
    }
  }

  // Add last field and row if exists
  if (current || fields.length > 0) {
    fields.push(current);
    if (fields.some(f => f.trim())) {
      rows.push(fields);
    }
  }

  return rows;
}

async function seedTickets(csvFilePath) {
  try {
    console.log('📖 Reading CSV file:', csvFilePath);
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`File not found: ${csvFilePath}`);
    }

    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Skip header row
    const dataRows = rows.slice(1);
    
    console.log(`\n📊 Found ${dataRows.length} tickets to import\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const fields of dataRows) {
      try {
        const [
          ticketNumber,
          title,
          description,
          status,
          priority,
          category,
          subcategory,
          createdBy,
          creatorName,
          creatorEmail,
          assignedTo,
          assigneeName,
          assigneeEmail,
          createdAt,
          updatedAt,
          resolvedAt,
        ] = fields;

        // Trim and normalize empty strings to null
        const cleanTicketNumber = ticketNumber?.trim();
        const cleanTitle = title?.trim();
        const cleanCreatedBy = createdBy?.trim() || null;
        const cleanAssignedTo = assignedTo?.trim() || null;

        if (!cleanTicketNumber || !cleanTitle || !cleanCreatedBy) {
          console.warn(`⚠️  Skipping invalid row (missing required fields: ticketNumber=${cleanTicketNumber}, title=${cleanTitle?.substring(0, 30)}, createdBy=${cleanCreatedBy})`);
          skipped++;
          continue;
        }

        // Check if ticket already exists
        const existing = await prisma.ticket.findUnique({
          where: { ticketNumber: parseInt(cleanTicketNumber) },
        });

        if (existing) {
          console.log(`⏭️  Ticket #${cleanTicketNumber} already exists, skipping`);
          skipped++;
          continue;
        }

        // Verify creator exists
        const creator = await prisma.user.findUnique({
          where: { id: cleanCreatedBy },
        });

        if (!creator) {
          console.warn(`⚠️  Creator ${cleanCreatedBy} not found, skipping ticket #${cleanTicketNumber}`);
          skipped++;
          continue;
        }

        // Verify assignee exists (if assigned)
        if (cleanAssignedTo) {
          const assignee = await prisma.user.findUnique({
            where: { id: cleanAssignedTo },
          });

          if (!assignee) {
            console.warn(`⚠️  Assignee ${cleanAssignedTo} not found, ticket #${cleanTicketNumber} will be unassigned`);
          }
        }

        // Create ticket
        await prisma.ticket.create({
          data: {
            ticketNumber: parseInt(cleanTicketNumber),
            title: title.trim(),
            description: description.trim(),
            status: status.trim(),
            priority: priority.trim(),
            category: category.trim(),
            subcategory: subcategory?.trim() || null,
            createdBy: cleanCreatedBy,
            assignedTo: cleanAssignedTo,
            createdAt: new Date(createdAt),
            updatedAt: new Date(updatedAt),
            resolvedAt: resolvedAt?.trim() ? new Date(resolvedAt) : null,
          },
        });

        console.log(`✅ Imported ticket #${cleanTicketNumber}: ${title.trim().substring(0, 50)}...`);
        imported++;

      } catch (error) {
        console.error(`❌ Error importing ticket:`, error.message);
        errors++;
      }
    }

    console.log('\n📈 Import Summary:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped:  ${skipped}`);
    console.log(`   ❌ Errors:   ${errors}`);
    console.log(`   📊 Total:    ${dataRows.length}\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get CSV file path from command line arguments
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.error('❌ Error: Please provide a CSV file path');
  console.log('\nUsage:');
  console.log('  node scripts/seed-tickets.mjs path/to/tickets-export.csv');
  process.exit(1);
}

seedTickets(csvFilePath);
