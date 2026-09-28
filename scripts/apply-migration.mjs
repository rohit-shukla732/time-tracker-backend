import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import 'dotenv/config';

const migrationName =
  process.argv[2] || '20260924100000_add_lifecycle_checklists_equipment';
const sqlPath = join(process.cwd(), 'prisma', 'migrations', migrationName, 'migration.sql');
const sql = readFileSync(sqlPath, 'utf-8');

// Prisma computes the migration checksum as sha256 of the migration file contents
const checksum = createHash('sha256').update(sql).digest('hex');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Apply the migration SQL
    await client.query(sql);
    console.log(`✅ Applied migration SQL: ${migrationName}`);

    // Record it in _prisma_migrations so Prisma's migration state stays consistent
    const id = cryptoRandomUuid();
    await client.query(
      `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), $4)`,
      [id, checksum, migrationName, 1]
    );
    console.log(`✅ Recorded migration in _prisma_migrations (checksum ${checksum.slice(0, 12)}…)`);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

function cryptoRandomUuid() {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  // RFC 4122 v4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
