import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuth, unauthorizedResponse } from "../../../../../lib/roleAuth";
import { prisma } from "../../../../../lib/prisma";
import { logger } from "../../../../../lib/logger";

// Reuse global session state store to expose per-user realtime status
const GLOBAL_SESSION_STATE_KEY = "__ace_ems_session_state_store__";
const g: any = globalThis as any;
if (!g[GLOBAL_SESSION_STATE_KEY]) g[GLOBAL_SESSION_STATE_KEY] = new Map<string, any>();
const sessionStateStore: Map<string, any> = g[GLOBAL_SESSION_STATE_KEY];
const SESSION_STATE_TIMEOUT_MS = 120_000; // 2 minutes

// POST /api/teams/[id]/members - Add member to team (Admin only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  const resolvedParams = await params;
  const authResult = await requireAdmin(req);
  
  if (authResult.error || !authResult.user) {
    logger.warn("POST /api/teams/[id]/members - Unauthorized");
    return unauthorizedResponse(authResult.error);
  }

  try {
    const teamId = resolvedParams.id;
    const { userId } = await req.json();
    logger.info("POST /api/teams/[id]/members - Adding member", { teamId, userId, by: authResult.user.id });

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already in a team
    if (user.teamId) {
      return NextResponse.json({ error: 'User is already in a team' }, { status: 400 });
    }

    // Add user to team
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { teamId },
      include: {
        team: true
      }
    });

    logger.info("POST /api/teams/[id]/members - Member added", { teamId, userId });
    logger.response("POST", `/api/teams/${teamId}/members`, 200, Date.now() - startTime);
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        team: updatedUser.team
      }
    });
  } catch (error) {
    const err = error as Error;
    logger.error("POST /api/teams/[id]/members - Failed", err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/teams/[id]/members - Remove member from team (Admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  const resolvedParams = await params;
  const authResult = await requireAdmin(req);
  
  if (authResult.error || !authResult.user) {
    logger.warn("DELETE /api/teams/[id]/members - Unauthorized");
    return unauthorizedResponse(authResult.error);
  }

  try {
    const teamId = resolvedParams.id;
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    logger.info("DELETE /api/teams/[id]/members - Removing member", { teamId, userId, by: authResult.user.id });

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Verify user exists and is in this team
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.teamId !== teamId) {
      return NextResponse.json({ error: 'User is not in this team' }, { status: 400 });
    }

    // Remove user from team
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { teamId: null }
    });

    logger.info("DELETE /api/teams/[id]/members - Member removed", { teamId, userId });
    logger.response("DELETE", `/api/teams/${teamId}/members`, 200, Date.now() - startTime);
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        teamId: null
      }
    });
  } catch (error) {
    const err = error as Error;
    logger.error("DELETE /api/teams/[id]/members - Failed", err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET /api/teams/[id]/members - List members of a team (Admin/HR or Manager of the team)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  const resolvedParams = await params;

  try {
    const authResult = await requireAuth(req);
    if (authResult.error || !authResult.user) {
      logger.warn("GET /api/teams/[id]/members - Unauthorized");
      return unauthorizedResponse(authResult.error);
    }

    const teamId = resolvedParams.id;

    // Verify team exists
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    // Authorization: Admin and HR can view any team; managers can view their team
    if (authResult.user.role === 'MANAGER') {
      if (team.managerId !== authResult.user.id && authResult.user.teamId !== teamId) {
        logger.warn("GET /api/teams/[id]/members - Access denied for manager", { teamId, by: authResult.user.id });
        return unauthorizedResponse('Access denied. Not manager of this team');
      }
    } else if (authResult.user.role !== 'ADMIN' && authResult.user.role !== 'HR') {
      // Employees cannot list team members
      logger.warn("GET /api/teams/[id]/members - Access denied for non-privileged user", { teamId, by: authResult.user.id });
      return unauthorizedResponse('Access denied');
    }

    const members = await prisma.user.findMany({
      where: { teamId },
      select: { id: true, name: true, email: true, role: true, teamId: true, createdAt: true, updatedAt: true }
    });

    // Build per-user aggregates for the last 30 days
    const memberIds = members.map((m) => m.id);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const perUserAggs = await prisma.sessionSummary.groupBy({
      by: ['userId'],
      where: { userId: { in: memberIds }, createdAt: { gte: monthAgo } },
      _avg: { workTimeMs: true, totalBreakMs: true, totalIdleMs: true },
      _max: { createdAt: true },
    });

    const aggMap = new Map<string, any>();
    perUserAggs.forEach((a: any) => {
      aggMap.set(a.userId, {
        avgWorkMs: a._avg.workTimeMs ? Number(a._avg.workTimeMs) : null,
        avgBreakMs: a._avg.totalBreakMs ? Number(a._avg.totalBreakMs) : null,
        avgIdleMs: a._avg.totalIdleMs ? Number(a._avg.totalIdleMs) : null,
        lastActive: a._max.createdAt ? new Date(a._max.createdAt).toISOString() : null,
      });
    });

    // Determine realtime status per user from sessionStateStore
    const membersWithStats = members.map((m) => {
      const agg = aggMap.get(m.id) || {};
      let status = 'Offline';
      const key = `user:${m.id}`;
      const state = sessionStateStore.get(key);
      if (state && state.lastUpdated && Date.now() - state.lastUpdated <= SESSION_STATE_TIMEOUT_MS) {
        const cs = state.currentState;
        if (cs?.clockedIn) {
          if (cs.onBreak || cs.autoBreak) status = 'Break';
          else if (cs.isIdle) status = 'Idle';
          else status = 'Active';
        } else {
          status = 'Offline';
        }
      }

      return {
        ...m,
        status,
        lastActive: agg.lastActive || null,
        avgWorkMs: agg.avgWorkMs || null,
        avgBreakMs: agg.avgBreakMs || null,
        avgIdleMs: agg.avgIdleMs || null,
      };
    });

    logger.response("GET", `/api/teams/${teamId}/members`, 200, Date.now() - startTime);
    return NextResponse.json({ success: true, members: membersWithStats });
  } catch (err) {
    const error = err as Error;
    console.error('GET /api/teams/[id]/members - Exception', error);
    logger.error("GET /api/teams/[id]/members - Failed", error);
    return NextResponse.json({ error: error.message || 'Server error', stack: (error.stack || '').split('\n').slice(0,5) }, { status: 500 });
  }
}