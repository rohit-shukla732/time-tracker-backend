import { NextResponse } from "next/server";
import { requireAuth } from "../../../lib/requireAuth";
import { logger } from "../../../lib/logger";

const HEARTBEAT_TIMEOUT_MS = 60_000; // consider app alive if heartbeat within last 60s

type HeartbeatRecord = {
    clientId: string;
    lastSeenMs: number;
    name?: string | null;
    ip?: string | null;
    payload?: any;
};

const GLOBAL_HEARTBEAT_KEY = "__ace_ems_heartbeat_store__";
const g: any = globalThis as any;
if (!g[GLOBAL_HEARTBEAT_KEY]) g[GLOBAL_HEARTBEAT_KEY] = new Map<string, HeartbeatRecord>();
const store: Map<string, HeartbeatRecord> = g[GLOBAL_HEARTBEAT_KEY];

function isAlive(lastSeenMs?: number) {
    if (!lastSeenMs) return false;
    return Date.now() - lastSeenMs <= HEARTBEAT_TIMEOUT_MS;
}

// POST /api/heartbeat
export async function POST(request: Request) {
    const auth = requireAuth(request);
    if (!auth || "error" in auth || !auth.user) {
        logger.warn("POST /api/heartbeat - Unauthorized");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const clientId = typeof body?.clientId === "string" ? body.clientId : undefined;
        if (!clientId) {
            logger.warn("POST /api/heartbeat - Missing clientId");
            return NextResponse.json({ error: "clientId is required" }, { status: 400 });
        }
        
        logger.debug("POST /api/heartbeat - Heartbeat received", { clientId, name: body?.name });

        const now = Date.now();
        const rec: HeartbeatRecord = {
            clientId,
            lastSeenMs: now,
            name: body?.name ?? null,
            ip: body?.ip ?? null,
            payload: body?.payload ?? null,
        };

        store.set(clientId, rec);

        return NextResponse.json({ ok: true, clientId, lastSeen: new Date(now).toISOString() }, { status: 200 });
    } catch (err) {
        const error = err as Error;
        logger.error("POST /api/heartbeat - Failed", error);
        return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
    }
}

// GET /api/heartbeat
export async function GET(request: Request) {
    // query param: clientId to get a single record
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId");

    if (clientId) {
        const rec = store.get(clientId) ?? null;
        return NextResponse.json({
            clientId,
            alive: rec ? isAlive(rec.lastSeenMs) : false,
            lastSeen: rec ? new Date(rec.lastSeenMs).toISOString() : null,
            secondsAgo: rec ? Math.round((Date.now() - rec.lastSeenMs) / 1000) : null,
            timeoutSeconds: Math.round(HEARTBEAT_TIMEOUT_MS / 1000),
            meta: rec ? { name: rec.name, ip: rec.ip, payload: rec.payload } : null,
        });
    }

    // list all clients
    const items = Array.from(store.values()).map((r) => ({
        clientId: r.clientId,
        alive: isAlive(r.lastSeenMs),
        lastSeen: new Date(r.lastSeenMs).toISOString(),
        secondsAgo: Math.round((Date.now() - r.lastSeenMs) / 1000),
        name: r.name,
    }));

    return NextResponse.json({ clients: items, timeoutSeconds: Math.round(HEARTBEAT_TIMEOUT_MS / 1000) }, { status: 200 });
}





/*
 /api/heartbeat/route.ts
export async function POST(request: Request) {
  const { clientId, userId, status } = await request.json();
  
  // Check if this device should be force-stopped
  const deviceControl = await prisma.deviceControl.findFirst({
    where: { userId, forceStop: true }
  });
  
  if (deviceControl) {
    // Clear the flag after sending (one-time signal)
    await prisma.deviceControl.update({
      where: { id: deviceControl.id },
      data: { forceStop: false }
    });
    
    return Response.json({ 
      forceStop: true, 
      reason: deviceControl.reason 
    });
  }
  
  return Response.json({ ok: true });
} 

/api/device/status/route.ts
export async function POST(request: Request) {
  const { userId } = await request.json();
  
  // Check if device can resume
  const deviceControl = await prisma.deviceControl.findFirst({
    where: { userId }
  });
  
  // If no control record or forceStop is false, allow resume
  const canResume = !deviceControl || !deviceControl.forceStop;
  
  return Response.json({ 
    canResume,
    reason: deviceControl?.reason 
  });
}


*/