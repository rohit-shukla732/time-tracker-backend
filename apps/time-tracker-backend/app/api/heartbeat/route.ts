import { NextResponse } from "next/server";

const HEARTBEAT_TIMEOUT_MS = 60_000; // consider app alive if heartbeat within last 60s

// store last heartbeat times in a global so it survives module reloads in dev
type HBStore = Map<string, number>;
const store: HBStore = (globalThis as any).__heartbeatStore || new Map();
;(globalThis as any).__heartbeatStore = store;

function isAlive(lastSeenMs?: number) {
    if (!lastSeenMs) return false;
    return Date.now() - lastSeenMs <= HEARTBEAT_TIMEOUT_MS;
}

export async function POST(request: Request) {
    // record heartbeat from desktop app
    try {
        const body = await request.json();
        const clientId = typeof body?.clientId === "string" ? body.clientId : undefined;
        if (!clientId) {
            return NextResponse.json({ error: "clientId is required" }, { status: 400 });
        }

        const now = Date.now();
        store.set(clientId, now);

        return NextResponse.json({
            ok: true,
            clientId,
            lastSeen: new Date(now).toISOString(),
        });
    } catch (err) {
        return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
    }
}

export async function GET(request: Request) {
    // check status for a specific client or list all
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId");

    if (clientId) {
        const lastSeen = store.get(clientId);
        return NextResponse.json({
            clientId,
            alive: isAlive(lastSeen),
            lastSeen: lastSeen ? new Date(lastSeen).toISOString() : null,
            secondsAgo: lastSeen ? Math.round((Date.now() - lastSeen) / 1000) : null,
            timeoutSeconds: Math.round(HEARTBEAT_TIMEOUT_MS / 1000),
        });
    }

    // list all clients
    const items = Array.from(store.entries()).map(([id, ts]) => ({
        clientId: id,
        alive: isAlive(ts),
        lastSeen: new Date(ts).toISOString(),
        secondsAgo: Math.round((Date.now() - ts) / 1000),
    }));

    return NextResponse.json({ clients: items, timeoutSeconds: Math.round(HEARTBEAT_TIMEOUT_MS / 1000) });
}