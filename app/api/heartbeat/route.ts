import { NextResponse } from "next/server";
import { requireAuth } from "../../../lib/requireAuth";
import { logger } from "../../../lib/logger";
import { prisma } from "../../../lib/prisma";

const HEARTBEAT_TIMEOUT_MS = 600_000; // consider app alive if heartbeat within last 60mins

type HeartbeatRecord = {
    clientId: string;
    userId?: string;
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
        
        // Get userId from body or from the authenticated user
        const userId = body?.userId || (auth.user as any)?.id;
        
        const rec: HeartbeatRecord = {
            clientId,
            userId,
            lastSeenMs: now,
            name: body?.name ?? null,
            ip: body?.ip ?? null,
            payload: body?.payload ?? null,
        };

        store.set(clientId, rec);

        // Check if this user's device should be force-stopped
        if (userId) {
            const deviceControl = await (prisma as any).deviceControl.findUnique({
                where: { userId }
            });

            if (deviceControl?.forceStop) {
                logger.info("POST /api/heartbeat - Force stop signal sent", { userId, reason: deviceControl.reason });
                
                return NextResponse.json({ 
                    ok: true, 
                    clientId, 
                    lastSeen: new Date(now).toISOString(),
                    forceStop: true, 
                    reason: deviceControl.reason 
                }, { status: 200 });
            }
        }

        return NextResponse.json({ ok: true, clientId, lastSeen: new Date(now).toISOString(), forceStop: false }, { status: 200 });
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
        userId: r.userId,
        alive: isAlive(r.lastSeenMs),
        lastSeen: new Date(r.lastSeenMs).toISOString(),
        secondsAgo: Math.round((Date.now() - r.lastSeenMs) / 1000),
        name: r.name,
    }));

    return NextResponse.json({ clients: items, timeoutSeconds: Math.round(HEARTBEAT_TIMEOUT_MS / 1000) }, { status: 200 });
}