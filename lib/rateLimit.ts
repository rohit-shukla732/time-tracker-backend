/**
 * Per-route, per-IP sliding-window rate limiter.
 *
 * Key  =  "<ip>:<pathname>"  so each route has its own independent counter.
 *
 * Tiers
 * ─────────────────────────────────────────────────────
 * default    →  10  req / 1 s   (all endpoints unless overridden)
 * privileged → 200  req / 1 s   (ADMIN / HR routes)
 */

import { NextResponse } from "next/server";

export type RateLimitTier = "default" | "privileged";

const TIERS: Record<RateLimitTier, { max: number; windowMs: number }> = {
  default:    { max: 10,  windowMs: 1_000 },
  privileged: { max: 200, windowMs: 1_000 },
};

// Global store: Map<"ip:route", timestamp[]>
const GLOBAL_RL_KEY = "__ace_ems_rate_limit_store__";
const g = globalThis as Record<string, unknown>;
if (!g[GLOBAL_RL_KEY]) g[GLOBAL_RL_KEY] = new Map<string, number[]>();
const store = g[GLOBAL_RL_KEY] as Map<string, number[]>;

// Prune stale entries every 5 minutes to prevent unbounded memory growth
const GLOBAL_RL_PRUNE_KEY = "__ace_ems_rate_limit_prune__";
if (!g[GLOBAL_RL_PRUNE_KEY]) {
  g[GLOBAL_RL_PRUNE_KEY] = setInterval(() => {
    const cutoff = Date.now() - 5 * 60_000;
    for (const [key, ts] of store.entries()) {
      const fresh = ts.filter((t) => t > cutoff);
      fresh.length === 0 ? store.delete(key) : store.set(key, fresh);
    }
  }, 5 * 60_000);
}

/**
 * Extract the real client IP from the request headers.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Rate-limit a request by IP + route path.
 *
 * @returns `null`          – within limit, proceed
 * @returns `NextResponse`  – 429, return this immediately
 */
export function rateLimit(
  req: Request,
  tier: RateLimitTier = "default"
): NextResponse | null {
  const { max, windowMs } = TIERS[tier];
  const ip = getClientIp(req);
  const route = new URL(req.url).pathname;
  const key = `${ip}:${route}`;

  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= max) {
    const retryAfterSec = Math.ceil((timestamps[0] + windowMs - now) / 1000);
    return NextResponse.json(
      { error: "Too Many Requests", retryAfter: retryAfterSec },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": String(max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil((timestamps[0] + windowMs) / 1000)),
        },
      }
    );
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return null;
}
