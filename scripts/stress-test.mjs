/**
 * Stress Test — Live Visual Dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 * Usage:
 *   node scripts/stress-test.mjs [concurrency] [duration_sec] [base_url]
 *
 * Defaults:
 *   concurrency   500 simultaneous workers (targets ~10,000 req/s)
 *   duration_sec  30 seconds
 *   base_url      http://localhost:4000
 *
 * Endpoints hit (all high-frequency routes):
 *   POST /api/heartbeat      desktop app ping
 *   POST /api/events         activity events
 *   POST /api/app-switch     app-switch events
 *   POST /api/website-visit  website tracking
 *   GET  /api/health         metrics probe
 *   POST /api/auth/login     auth endpoint (hard rate-limited)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { setTimeout as sleep } from 'timers/promises';

// ── Config ───────────────────────────────────────────────────────────────────
const CONCURRENCY  = parseInt(process.argv[2] ?? '500');
const DURATION_SEC = parseInt(process.argv[3] ?? '30');
const BASE_URL     = process.argv[4] ?? 'http://localhost:4000';
const POLL_MS      = 250; // dashboard refresh interval
const FAKE_TOKEN   = 'Bearer stress.test.invalid'; // triggers auth path after rate limit

// ── ANSI helpers ─────────────────────────────────────────────────────────────
const A = {
  reset:     '\x1b[0m',
  bold:      '\x1b[1m',
  dim:       '\x1b[2m',
  red:       '\x1b[31m',
  green:     '\x1b[32m',
  yellow:    '\x1b[33m',
  blue:      '\x1b[34m',
  magenta:   '\x1b[35m',
  cyan:      '\x1b[36m',
  white:     '\x1b[37m',
  bgRed:     '\x1b[41m',
  bgGreen:   '\x1b[42m',
  bgYellow:  '\x1b[43m',
  bgBlue:    '\x1b[44m',
  clearScr:  '\x1b[2J\x1b[H',
  clearLine: '\x1b[2K',
  up: (n) => `\x1b[${n}A`,
  col: (n) => `\x1b[${n}G`,
};

const bar = (val, max, width = 30, color = A.green) => {
  const filled = max > 0 ? Math.round((val / max) * width) : 0;
  return color + '█'.repeat(filled) + A.dim + '░'.repeat(width - filled) + A.reset;
};

const pad   = (s, n) => String(s).padStart(n);
const rpad  = (s, n) => String(s).padEnd(n);
const fmt   = (n) => n.toLocaleString();
const ms    = (n) => `${n.toFixed(1)}ms`;

// ── Stats ────────────────────────────────────────────────────────────────────
const ENDPOINT_NAMES = ['heartbeat', 'events', 'app-switch', 'website-visit', 'health', 'login'];

const stats = {
  total:     0,
  s2xx:      0,
  s4xx:      0,
  s429:      0,
  s503:      0,
  s5xx:      0,
  netErr:    0,
  latencies: [],
  history:   [],  // { s2xx, s429, s503, s5xx, netErr }
  // per-endpoint counters
  ep: Object.fromEntries(ENDPOINT_NAMES.map(n => [n, { total: 0, s2xx: 0, s429: 0, s503: 0, s5xx: 0, err: 0 }])),
  server: {
    queueActive:  0,
    queueWaiting: 0,
    rlKeys:       0,
    rlRequests:   0,
  },
};

let running = true;
let startMs = Date.now();
let lastTotal = 0;
let lastTs    = Date.now();
let rps       = 0;

// ── IP spoofing ───────────────────────────────────────────────────────────────
// Each worker gets a unique X-Forwarded-For IP so the rate limiter treats them
// as distinct clients instead of all sharing 127.0.0.1.
// 500 workers → 10.0.0.1 – 10.0.1.244
function workerIp(id) {
  const a = Math.floor(id / 256);
  const b = id % 256;
  return `10.${a}.${b}.1`;
}

// ── Endpoints ────────────────────────────────────────────────────────────────
// Each entry: { name, fn(ip) }
// Workers cycle through all endpoints in round-robin; each passes its own IP.
const endpoints = [
  {
    name: 'heartbeat',
    fn: async (ip) => {
      const r = await fetch(`${BASE_URL}/api/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': FAKE_TOKEN, 'X-Forwarded-For': ip },
        body: JSON.stringify({ clientId: `stress-${Math.random().toString(36).slice(2)}`, name: 'StressBot' }),
        signal: AbortSignal.timeout(6000),
      });
      return r.status;
    },
  },
  {
    name: 'events',
    fn: async (ip) => {
      const r = await fetch(`${BASE_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': FAKE_TOKEN, 'X-Forwarded-For': ip },
        body: JSON.stringify({
          userId: `stress-${ip}`, sessionId: `sess-${ip}`,
          type: 'APP_FOCUS', timestamp: new Date().toISOString(), epochMs: Date.now(),
        }),
        signal: AbortSignal.timeout(6000),
      });
      return r.status;
    },
  },
  {
    name: 'app-switch',
    fn: async (ip) => {
      const r = await fetch(`${BASE_URL}/api/app-switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': FAKE_TOKEN, 'X-Forwarded-For': ip },
        body: JSON.stringify({
          userId: `stress-${ip}`, sessionId: `sess-${ip}`,
          fromApp: 'Chrome', toApp: 'VSCode', durationMs: 1000,
          timestamp: new Date().toISOString(), epochMs: Date.now(),
        }),
        signal: AbortSignal.timeout(6000),
      });
      return r.status;
    },
  },
  {
    name: 'website-visit',
    fn: async (ip) => {
      const r = await fetch(`${BASE_URL}/api/website-visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': FAKE_TOKEN, 'X-Forwarded-For': ip },
        body: JSON.stringify({
          sessionId: `sess-${ip}`, toWebsite: 'https://stress.test',
          browser: 'Chrome', durationMs: 500, timestamp: Date.now(),
        }),
        signal: AbortSignal.timeout(6000),
      });
      return r.status;
    },
  },
  {
    name: 'health',
    fn: async (_ip) => {
      const r = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(6000) });
      return r.status;
    },
  },
  {
    name: 'login',
    fn: async (ip) => {
      const r = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
        body: JSON.stringify({ email: 'stress@test.invalid', password: 'wrongpassword' }),
        signal: AbortSignal.timeout(6000),
      });
      return r.status;
    },
  },
];

// ── Workers ───────────────────────────────────────────────────────────────────
async function worker(id) {
  const { name, fn } = endpoints[id % endpoints.length];
  const ip      = workerIp(id);   // unique IP → own rate-limit bucket
  const epStats = stats.ep[name];
  while (running) {
    const t0 = Date.now();
    try {
      const status = await fn(ip);
      const lat = Date.now() - t0;
      stats.total++;
      epStats.total++;
      stats.latencies.push(lat);
      if (status >= 200 && status < 300) { stats.s2xx++; epStats.s2xx++; }
      else if (status === 429)           { stats.s429++; stats.s4xx++; epStats.s429++; }
      else if (status === 503)           { stats.s503++; epStats.s503++; }
      else if (status >= 500)            { stats.s5xx++; epStats.s5xx++; }
      else                               { stats.s4xx++; }
    } catch {
      stats.netErr++;
      stats.total++;
      epStats.err++;
    }
    // No artificial sleep — fire as fast as possible for max throughput
  }
}

// ── Health poller ─────────────────────────────────────────────────────────────
async function pollHealth() {
  while (running) {
    try {
      const r = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
      if (r.ok) {
        const j = await r.json();
        stats.server.queueActive  = j.queue?.active  ?? 0;
        stats.server.queueWaiting = j.queue?.waiting ?? 0;
        stats.server.rlKeys       = j.rateLimit?.activeKeys ?? 0;
        stats.server.rlRequests   = j.rateLimit?.totalRequestsTracked ?? 0;
      }
    } catch { /* ignore */ }
    await sleep(POLL_MS);
  }
}

// ── Percentile ───────────────────────────────────────────────────────────────
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
const HISTORY_LEN = 40;
let firstRender = true;
let dashboardLines = 0;

function renderDashboard() {
  const now     = Date.now();
  const elapsed = (now - startMs) / 1000;
  const remaining = Math.max(0, DURATION_SEC - elapsed);

  // RPS
  const delta = stats.total - lastTotal;
  const dtSec = (now - lastTs) / 1000;
  if (dtSec > 0) rps = delta / dtSec;
  lastTotal = stats.total;
  lastTs    = now;

  // History snapshot
  stats.history.push({
    s2xx: stats.s2xx, s429: stats.s429,
    s503: stats.s503, s5xx: stats.s5xx, netErr: stats.netErr,
  });
  if (stats.history.length > HISTORY_LEN) stats.history.shift();

  // Latencies
  const lats  = stats.latencies.splice(0);  // drain
  const p50   = percentile(lats, 50);
  const p95   = percentile(lats, 95);
  const p99   = percentile(lats, 99);

  const total = stats.total || 1;
  const pct   = (n) => ((n / total) * 100).toFixed(1) + '%';

  // Build lines
  const lines = [];

  lines.push(`${A.bold}${A.cyan}╔══════════════════════════════════════════════════════════════╗${A.reset}`);
  lines.push(`${A.bold}${A.cyan}║           🔥  ACE EMS STRESS TEST  •  Live Dashboard          ║${A.reset}`);
  lines.push(`${A.bold}${A.cyan}╚══════════════════════════════════════════════════════════════╝${A.reset}`);
  lines.push('');

  // Config row
  lines.push(`  ${A.dim}Workers: ${A.reset}${A.bold}${CONCURRENCY}${A.reset}   ${A.dim}Target: ${A.reset}${A.bold}${BASE_URL}${A.reset}   ${A.dim}Duration: ${A.reset}${A.bold}${DURATION_SEC}s${A.reset}   ${A.dim}Elapsed: ${A.reset}${A.yellow}${A.bold}${elapsed.toFixed(1)}s${A.reset}   ${A.dim}Remaining: ${A.reset}${A.green}${A.bold}${remaining.toFixed(1)}s${A.reset}`);
  lines.push('');

  // Progress bar
  const prog = elapsed / DURATION_SEC;
  const progWidth = 62;
  const progFilled = Math.min(Math.round(prog * progWidth), progWidth);
  lines.push(`  ${A.dim}Progress${A.reset}  [${A.cyan}${'▓'.repeat(progFilled)}${A.dim}${'░'.repeat(progWidth - progFilled)}${A.reset}] ${(prog * 100).toFixed(0)}%`);
  lines.push('');

  // ── Request counts ──
  lines.push(`  ${A.bold}REQUEST COUNTS  ${A.dim}(all endpoints combined)${A.reset}`);
  lines.push(`  ${A.dim}─────────────────────────────────────────────────────────────${A.reset}`);

  const maxCount = Math.max(stats.s2xx, stats.s429, stats.s503, stats.s5xx, stats.netErr, 1);

  lines.push(`  ${A.green}${A.bold}  2xx OK    ${A.reset} ${pad(fmt(stats.s2xx), 9)}  ${bar(stats.s2xx, maxCount, 28, A.green)}  ${A.dim}${pct(stats.s2xx)}${A.reset}`);
  lines.push(`  ${A.yellow}${A.bold}  429 Limit ${A.reset} ${pad(fmt(stats.s429), 9)}  ${bar(stats.s429, maxCount, 28, A.yellow)}  ${A.dim}${pct(stats.s429)}${A.reset}`);
  lines.push(`  ${A.magenta}${A.bold}  503 Busy  ${A.reset} ${pad(fmt(stats.s503), 9)}  ${bar(stats.s503, maxCount, 28, A.magenta)}  ${A.dim}${pct(stats.s503)}${A.reset}`);
  lines.push(`  ${A.red}${A.bold}  5xx Error ${A.reset} ${pad(fmt(stats.s5xx), 9)}  ${bar(stats.s5xx, maxCount, 28, A.red)}    ${A.dim}${pct(stats.s5xx)}${A.reset}`);
  lines.push(`  ${A.red}${A.bold}  Net Error ${A.reset} ${pad(fmt(stats.netErr), 9)}  ${bar(stats.netErr, maxCount, 28, A.red)}    ${A.dim}${pct(stats.netErr)}${A.reset}`);
  lines.push(`  ${A.cyan}${A.bold}  TOTAL     ${A.reset} ${pad(fmt(stats.total), 9)}`);
  lines.push('');

  // ── Per-endpoint breakdown ──
  lines.push(`  ${A.bold}PER-ENDPOINT BREAKDOWN${A.reset}`);
  lines.push(`  ${A.dim}─────────────────────────────────────────────────────────────${A.reset}`);
  lines.push(`  ${A.dim}${rpad('endpoint', 14)} ${pad('total', 8)}  ${pad('2xx', 7)}  ${pad('429', 7)}  ${pad('503', 7)}  ${pad('5xx', 7)}  ${pad('err', 7)}${A.reset}`);
  for (const name of ENDPOINT_NAMES) {
    const e = stats.ep[name];
    const eTot = e.total || 1;
    const statusColor = e.s2xx > e.s429 ? A.green : A.yellow;
    lines.push(
      `  ${statusColor}${rpad(name, 14)}${A.reset}` +
      ` ${pad(fmt(e.total), 8)}` +
      `  ${A.green}${pad(fmt(e.s2xx), 7)}${A.reset}` +
      `  ${A.yellow}${pad(fmt(e.s429), 7)}${A.reset}` +
      `  ${A.magenta}${pad(fmt(e.s503), 7)}${A.reset}` +
      `  ${A.red}${pad(fmt(e.s5xx), 7)}${A.reset}` +
      `  ${A.red}${pad(fmt(e.err), 7)}${A.reset}`
    );
  }
  lines.push('');

  // ── Throughput & Latency ──
  lines.push(`  ${A.bold}THROUGHPUT & LATENCY${A.reset}`);
  lines.push(`  ${A.dim}─────────────────────────────────────────────────────────────${A.reset}`);
  lines.push(`  ${A.cyan}Req/s${A.reset}   ${A.bold}${rps.toFixed(1)}${A.reset}   ${A.dim}p50${A.reset} ${A.green}${ms(p50)}${A.reset}   ${A.dim}p95${A.reset} ${A.yellow}${ms(p95)}${A.reset}   ${A.dim}p99${A.reset} ${A.red}${ms(p99)}${A.reset}`);
  lines.push('');

  // ── Server-side metrics ──
  lines.push(`  ${A.bold}SERVER-SIDE (from /api/health)${A.reset}`);
  lines.push(`  ${A.dim}─────────────────────────────────────────────────────────────${A.reset}`);
  const qMax = 10;
  lines.push(`  ${A.cyan}DB queue active ${A.reset} ${A.bold}${pad(stats.server.queueActive, 3)}${A.reset} / 10   ${bar(stats.server.queueActive, qMax, 20, A.cyan)}`);
  const wMax = 200;
  lines.push(`  ${A.magenta}DB queue waiting${A.reset} ${A.bold}${pad(stats.server.queueWaiting, 3)}${A.reset} / 200  ${bar(stats.server.queueWaiting, wMax, 20, A.magenta)}`);
  lines.push(`  ${A.yellow}RL tracked keys  ${A.reset} ${A.bold}${stats.server.rlKeys}${A.reset}    ${A.dim}total req in window: ${stats.server.rlRequests}${A.reset}`);
  lines.push('');

  // ── Rolling bar chart ──
  lines.push(`  ${A.bold}ROLLING RESPONSE MIX  ${A.dim}(last ${HISTORY_LEN} samples)${A.reset}`);
  lines.push(`  ${A.dim}─────────────────────────────────────────────────────────────${A.reset}`);

  // Mini sparkline per type over history
  const sparkLine = (key, color, label) => {
    const vals = stats.history.map(h => h[key]);
    const max  = Math.max(...vals, 1);
    const BLOCKS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const spark  = vals.map(v => {
      const idx = Math.round((v / max) * (BLOCKS.length - 1));
      return color + BLOCKS[idx] + A.reset;
    }).join('');
    return `  ${color}${rpad(label, 10)}${A.reset} ${spark}`;
  };

  lines.push(sparkLine('s2xx',   A.green,   '2xx OK'));
  lines.push(sparkLine('s429',   A.yellow,  '429 Limit'));
  lines.push(sparkLine('s503',   A.magenta, '503 Busy'));
  lines.push(sparkLine('s5xx',   A.red,     '5xx Error'));
  lines.push(sparkLine('netErr', A.red,     'Net Error'));
  lines.push('');

  lines.push(`  ${A.dim}Press Ctrl+C to stop early.${A.reset}`);

  // Render: move cursor to top of dashboard on redraw
  if (firstRender) {
    process.stdout.write(A.clearScr);
    firstRender = false;
  } else {
    process.stdout.write(A.up(dashboardLines));
  }

  dashboardLines = lines.length;
  process.stdout.write(lines.map(l => A.clearLine + l).join('\n') + '\n');
}

// ── Summary ───────────────────────────────────────────────────────────────────
function printSummary() {
  const elapsed = (Date.now() - startMs) / 1000;
  const avgRps  = stats.total / elapsed;
  const tot     = stats.total || 1;
  const p = (n) => ((n / tot) * 100).toFixed(1) + '%';

  console.log('');
  console.log(`${A.bold}${A.cyan}═══════════════════════  FINAL SUMMARY  ═══════════════════════${A.reset}`);
  console.log(`  Duration        : ${elapsed.toFixed(2)}s`);
  console.log(`  Concurrency     : ${CONCURRENCY} workers`);
  console.log(`  Total requests  : ${fmt(stats.total)}`);
  console.log(`  Avg RPS         : ${A.bold}${avgRps.toFixed(1)}${A.reset} req/s`);
  console.log('');
  console.log(`  ${A.green}2xx OK          : ${fmt(stats.s2xx).padStart(9)}  (${p(stats.s2xx)})${A.reset}`);
  console.log(`  ${A.yellow}429 Rate limit  : ${fmt(stats.s429).padStart(9)}  (${p(stats.s429)})${A.reset}`);
  console.log(`  ${A.magenta}503 Queue full  : ${fmt(stats.s503).padStart(9)}  (${p(stats.s503)})${A.reset}`);
  console.log(`  ${A.red}5xx Server err  : ${fmt(stats.s5xx).padStart(9)}  (${p(stats.s5xx)})${A.reset}`);
  console.log(`  ${A.red}Net errors      : ${fmt(stats.netErr).padStart(9)}  (${p(stats.netErr)})${A.reset}`);
  console.log('');
  console.log(`  ${A.bold}PER-ENDPOINT BREAKDOWN${A.reset}`);
  console.log(`  ${'endpoint'.padEnd(14)} ${'total'.padStart(8)}  ${'2xx'.padStart(7)}  ${'429'.padStart(7)}  ${'503'.padStart(7)}  ${'5xx'.padStart(7)}  ${'err'.padStart(7)}`);
  for (const name of ENDPOINT_NAMES) {
    const e = stats.ep[name];
    const rps = (e.total / elapsed).toFixed(0);
    console.log(
      `  ${name.padEnd(14)} ${fmt(e.total).padStart(8)}` +
      `  ${A.green}${fmt(e.s2xx).padStart(7)}${A.reset}` +
      `  ${A.yellow}${fmt(e.s429).padStart(7)}${A.reset}` +
      `  ${A.magenta}${fmt(e.s503).padStart(7)}${A.reset}` +
      `  ${A.red}${fmt(e.s5xx).padStart(7)}${A.reset}` +
      `  ${A.red}${fmt(e.err).padStart(7)}${A.reset}` +
      `  ${A.dim}(${rps} rps)${A.reset}`
    );
  }
  console.log(`${A.cyan}═══════════════════════════════════════════════════════════════${A.reset}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`${A.bold}${A.cyan}Starting stress test: ${CONCURRENCY} workers × ${DURATION_SEC}s → ${BASE_URL}${A.reset}`);
  await sleep(300);

  startMs = Date.now();

  // Kick off workers
  const workerPromises = Array.from({ length: CONCURRENCY }, (_, i) => worker(i));

  // Health poller
  pollHealth();

  // Dashboard render loop
  const dashInterval = setInterval(renderDashboard, POLL_MS);

  // Stop after duration
  await sleep(DURATION_SEC * 1000);
  running = false;

  clearInterval(dashInterval);
  renderDashboard(); // final frame

  // Wait for in-flight workers to drain
  await Promise.allSettled(workerPromises);

  printSummary();
  process.exit(0);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  running = false;
  setTimeout(() => { printSummary(); process.exit(0); }, 600);
});

main();
