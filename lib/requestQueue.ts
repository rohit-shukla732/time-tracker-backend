/**
 * Server-side request queue with concurrency control.
 *
 * Prevents the Postgres connection pool from being overwhelmed by capping how
 * many async DB operations run in parallel. Excess requests wait in a bounded
 * queue; once the queue is full the server responds with 503 (backpressure)
 * rather than accepting unbounded work and crashing.
 *
 * Architecture
 * ────────────────────────────────────────────────────────────────
 *  incoming request
 *     │
 *     ▼
 *  rateLimit()          — reject obvious abuse immediately (429)
 *     │
 *     ▼
 *  dbQueue.run(fn)      — wait for a free slot, then execute
 *     │  └─ queue full? return null → caller returns 503
 *     ▼
 *  fn()                 — actual DB work (Prisma queries)
 *
 * Settings
 * ────────────────────────────────────────────────────────────────
 *  concurrency  10   max simultaneous DB operations
 *               (matches pg pool max:20, leaving headroom for admin queries)
 *  maxQueue    200   max waiting requests before refusing new ones (503)
 *  timeoutMs 15000   max ms a request may sit in the queue before giving up
 */

import { NextResponse } from "next/server";

interface QueueItem {
  run: () => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
}

class RequestQueue {
  private running = 0;
  private readonly concurrency: number;
  private readonly maxQueue: number;
  private readonly timeoutMs: number;
  private readonly waitQueue: QueueItem[] = [];

  constructor(concurrency = 10, maxQueue = 200, timeoutMs = 15_000) {
    this.concurrency = concurrency;
    this.maxQueue = maxQueue;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Enqueue an async function.
   *
   * @returns The function's return value, or `null` if the queue is full or
   *          the request timed out waiting for a slot.
   */
  run<T>(fn: () => Promise<T>): Promise<T | null> {
    return new Promise<T | null>((resolve) => {
      if (this.running < this.concurrency) {
        // Fast path — slot available immediately
        this.execute(fn, resolve);
        return;
      }

      if (this.waitQueue.length >= this.maxQueue) {
        // Queue full — reject with backpressure signal
        resolve(null);
        return;
      }

      // Slow path — wait for a free slot
      const item: QueueItem = {
        run: () => this.execute(fn, resolve),
        timeoutHandle: setTimeout(() => {
          // Timed out waiting in queue
          const idx = this.waitQueue.indexOf(item);
          if (idx !== -1) this.waitQueue.splice(idx, 1);
          resolve(null);
        }, this.timeoutMs),
      };

      this.waitQueue.push(item);
    });
  }

  private async execute<T>(
    fn: () => Promise<T>,
    resolve: (value: T | null) => void
  ) {
    this.running++;
    try {
      const result = await fn();
      resolve(result);
    } catch {
      resolve(null);
    } finally {
      this.running--;
      const next = this.waitQueue.shift();
      if (next) {
        clearTimeout(next.timeoutHandle);
        next.run();
      }
    }
  }

  /** Current queue depth — useful for health/metrics endpoints. */
  get depth() {
    return this.waitQueue.length;
  }

  /** Current active operations. */
  get active() {
    return this.running;
  }
}

// ── Singleton on globalThis (survives Next.js hot-reloads in dev) ──────────
const GLOBAL_QUEUE_KEY = "__ace_ems_db_queue__";
const g = globalThis as Record<string, unknown>;
if (!g[GLOBAL_QUEUE_KEY]) g[GLOBAL_QUEUE_KEY] = new RequestQueue(10, 200, 15_000);
export const dbQueue = g[GLOBAL_QUEUE_KEY] as RequestQueue;

// ── Helper: wrap a handler body in the queue ────────────────────────────────
/**
 * Run `fn` through the global DB queue.
 * If the queue is full / timed out, returns a 503 response automatically.
 *
 * Usage:
 *   return await withQueue(() => myHandler(req));
 */
export async function withQueue(
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  const result = await dbQueue.run(fn);
  if (result === null) {
    return NextResponse.json(
      { error: "Server is busy, please retry in a moment." },
      { status: 503 }
    );
  }
  return result;
}
