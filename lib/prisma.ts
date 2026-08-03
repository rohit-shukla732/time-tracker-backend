import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                     // 20 per process × 10 PM2 instances = 200 max connections
  idleTimeoutMillis: 30_000,   // close idle connections after 30 s
  connectionTimeoutMillis: 5_000, // fail fast if no connection available in 5 s
  statement_timeout: 30_000,   // kill runaway queries after 30 s
});

// Surface pool errors so they appear in logs instead of crashing the process
pool.on("error", (err) => {
  console.error("[pg-pool] Unexpected pool error:", err.message);
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "production" ? ["error", "warn"] : ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;