import { NextRequest, NextResponse } from "next/server";
import { requireRoles, requireAuth, unauthorizedResponse } from "../../../../../lib/roleAuth";
import { prisma } from "../../../../../lib/prisma";
import { logger } from "../../../../../lib/logger";

// Reuse global session state store to expose per-user realtime status
const GLOBAL_SESSION_STATE_KEY = "__ace_ems_session_state_store__";
const g: any = globalThis as any;
if (!g[GLOBAL_SESSION_STATE_KEY]) g[GLOBAL_SESSION_STATE_KEY] = new Map<string, any>();
const sessionStateStore: Map<string, any> = g[GLOBAL_SESSION_STATE_KEY];
const SESSION_STATE_TIMEOUT_MS = 120_000; // 2 minutes

// POST /api/teams/[id]/members - Add member to team (Admin/HR only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  const resolvedParams = await params;
  const authResult = await requireRoles(req, ["ADMIN", "HR"]);

  if (authResult.error || !authResult.user) {
    logger.warn("POST /api/teams/[id]/members - Unauthorized");
    return unauthorizedResponse(authResult.error);
  }

  try {
    const departmentId = resolvedParams.id;
    const { userId } = await req.json();
    logger.info("POST /api/teams/[id]/members - Adding member", { departmentId, userId, by: authResult.user.id });

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId }
    });

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employmentInfo: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already has a department
    if (user.employmentInfo?.departmentId) {
      return NextResponse.json({ error: 'User is already in a department' }, { status: 400 });
    }

    // Add user to department via employmentInfo
    const employmentInfo = await prisma.employmentInfo.upsert({
      where: { userId },
      create: { userId, departmentId },
      update: { departmentId },
      include: { department: true }
    });

    logger.info("POST /api/teams/[id]/members - Member added", { departmentId, userId });
    logger.response("POST", `/api/teams/${departmentId}/members`, 200, Date.now() - startTime);
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: employmentInfo.department
      }
    });
  } catch (error) {
    const err = error as Error;
    logger.error("POST /api/teams/[id]/members - Failed", err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/teams/[id]/members - Remove member from team (Admin/HR only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  const resolvedParams = await params;
  const authResult = await requireRoles(req, ["ADMIN", "HR"]);
  
  if (authResult.error || !authResult.user) {
    logger.warn("DELETE /api/teams/[id]/members - Unauthorized");
    return unauthorizedResponse(authResult.error);
  }

  try {
    const departmentId = resolvedParams.id;
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    logger.info("DELETE /api/teams/[id]/members - Removing member", { departmentId, userId, by: authResult.user.id });

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId }
    });

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // Verify user exists and is in this department
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employmentInfo: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.employmentInfo?.departmentId !== departmentId) {
      return NextResponse.json({ error: 'User is not in this department' }, { status: 400 });
    }

    // Remove user from department
    await prisma.employmentInfo.update({
      where: { userId },
      data: { departmentId: null }
    });

    logger.info("DELETE /api/teams/[id]/members - Member removed", { departmentId, userId });
    logger.response("DELETE", `/api/teams/${departmentId}/members`, 200, Date.now() - startTime);
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: null
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

    const departmentId = resolvedParams.id;

    // Verify department exists
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) return NextResponse.json({ error: 'Department not found' }, { status: 404 });

    // Authorization: Admin and HR can view any department; managers can view their department
    if (authResult.user.role === 'MANAGER') {
      if (department.managerId !== authResult.user.id && authResult.user.departmentId !== departmentId) {
        logger.warn("GET /api/teams/[id]/members - Access denied for manager", { departmentId, by: authResult.user.id });
        return unauthorizedResponse('Access denied. Not manager of this department');
      }
    } else if (authResult.user.role === 'SENIOR_MANAGER') {
      if (!authResult.user.managedDepartmentIds?.includes(departmentId)) {
        logger.warn("GET /api/teams/[id]/members - Access denied for senior manager", { departmentId, by: authResult.user.id });
        return unauthorizedResponse('Access denied. Department not assigned to you');
      }
    } else if (authResult.user.role !== 'ADMIN' && authResult.user.role !== 'HR') {
      // Employees cannot list department members
      logger.warn("GET /api/teams/[id]/members - Access denied for non-privileged user", { departmentId, by: authResult.user.id });
      return unauthorizedResponse('Access denied');
    }

    const employmentInfos = await prisma.employmentInfo.findMany({
      where: { 
        departmentId,
        user: { isArchived: false }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true }
        },
        department: {
          select: { id: true, name: true }
        }
      }
    });

    const members = employmentInfos.map(ei => ({
      ...ei.user,
      departmentId: ei.departmentId,
      department: ei.department
    }));

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

    // Backfill sessionStateStore from DB for cluster-safe reads
    const membersDeviceControls = await prisma.deviceControl.findMany({
      where: { userId: { in: memberIds } },
      select: { userId: true, sessionState: true },
    });
    for (const dc of membersDeviceControls) {
      if (dc.sessionState && !sessionStateStore.has(`user:${dc.userId}`)) {
        sessionStateStore.set(`user:${dc.userId}`, dc.sessionState);
      }
    }

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

    logger.response("GET", `/api/teams/${departmentId}/members`, 200, Date.now() - startTime);
    return NextResponse.json({ success: true, members: membersWithStats });
  } catch (err) {
    const error = err as Error;
    console.error('GET /api/teams/[id]/members - Exception', error);
    logger.error("GET /api/teams/[id]/members - Failed", error);
    return NextResponse.json({ error: error.message || 'Server error', stack: (error.stack || '').split('\n').slice(0,5) }, { status: 500 });
  }
}