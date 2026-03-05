import { NextResponse } from 'next/server';
import { dbQueue } from '../../../lib/requestQueue';

const GLOBAL_RL_KEY = '__ace_ems_rate_limit_store__';
const g = globalThis as Record<string, unknown>;

export async function GET() {
  const rlStore = g[GLOBAL_RL_KEY] as Map<string, number[]> | undefined;
  const now = Date.now();

  let rlActiveKeys = 0;
  let rlTotalRequests = 0;
  if (rlStore) {
    for (const timestamps of rlStore.values()) {
      const recent = timestamps.filter(t => t > now - 60_000);
      if (recent.length > 0) {
        rlActiveKeys++;
        rlTotalRequests += recent.length;
      }
    }
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    queue: {
      active: dbQueue.active,
      waiting: dbQueue.depth,
    },
    rateLimit: {
      activeKeys: rlActiveKeys,
      totalRequestsTracked: rlTotalRequests,
    },
  });
}
