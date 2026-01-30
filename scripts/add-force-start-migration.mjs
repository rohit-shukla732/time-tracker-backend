/**
 * Migration script: Add forceStart, startedBy, startedAt to DeviceControl
 * Run with: node scripts/add-force-start-migration.mjs
 */
import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const { Client } = pg;

// Load .env manually
const envPath = resolve(process.cwd(), '.env');
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
}

const databaseUrl = envVars['DATABASE_URL'] || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

async function migrate() {
  await client.connect();
  console.log('Connected to database');

  try {
    // Add forceStart column if not exists
    await client.query(`
      ALTER TABLE "DeviceControl"
        ADD COLUMN IF NOT EXISTS "forceStart" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "startedBy"  TEXT,
        ADD COLUMN IF NOT EXISTS "startedAt"  TIMESTAMPTZ;
    `);
    console.log('✓ Columns added (forceStart, startedBy, startedAt) to DeviceControl');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await client.end();
    console.log('Done.');
  }
}

migrate().catch(console.error);
