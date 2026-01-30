import { NextRequest, NextResponse } from 'next/server';
import { requireManager, unauthorizedResponse } from '@/lib/roleAuth';
import { prisma } from '@/lib/prisma';

// Reuse the same global stores as admin
const GLOBAL_HEARTBEAT_KEY = '__ace_ems_heartbeat_store__';
const GLOBAL_SESSION_STATE_KEY = '__ace_ems_session_state_store__';
const g: any = globalThis as any;

if (!g[GLOBAL_HEARTBEAT_KEY]) g[GLOBAL_HEARTBEAT_KEY] = new Map<string, number>();
if (!g[GLOBAL_SESSION_STATE_KEY]) g[GLOBAL_SESSION_STATE_KEY] = new Map<string, any>();

const heartbeatStore: Map<string, number> = g[GLOBAL_HEARTBEAT_KEY];
const sessionStateStore: Map<string, any> = g[GLOBAL_SESSION_STATE_KEY];

const HEARTBEAT_TIMEOUT_MS = 600_000; // 10 minutes
const SESSION_STATE_TIMEOUT_MS = 120_000; // 2 minutes

type EmployeeStatus = 'working' | 'idle' | 'break' | 'offline';

interface FloorEmployee {
  id: string;
  name: string | null;
  email: string;
  role: string;
  departmentId: string | null;
  departmentName: string | null;
  seatNumber: number | null;
  status: EmployeeStatus;
  lastActivity: string | null;
  currentApp: string | null;
  sessionId: string | null;
  sessionStartedAt: string | null;
  sessionEndedAt: string | null;
  onBreakSince: string | null;
  idleSince: string | null;
  workingDuration: number | null;
}

interface StatusStats {
  working: number;
  idle: number;
  break: number;
  offline: number;
  total: number;
}

/**
 * GET /api/teams/[id]/floor-status
 * Returns real-time floor status for department members
 * Manager only - filtered to their department
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const departmentId = resolved.id;

  const authResult = await requireManager(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    // Verify department exists
    const department = await prisma.department.findUnique({ 
      where: { id: departmentId },
      select: { id: true, name: true, managerId: true }
    });
    
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // Verify manager has access to this department
    if (authResult.user.role === 'MANAGER') {
      if (department.managerId !== authResult.user.id && authResult.user.departmentId !== departmentId) {
        return unauthorizedResponse('Access denied. Not manager of this department');
      }
    }

    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all department members via employmentInfo
    const employmentInfos = await prisma.employmentInfo.findMany({
      where: { departmentId },
      select: {
        userId: true,
        department: {
          select: { id: true, name: true }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { user: { name: 'asc' } }
    });

    const users = employmentInfos.map(ei => ({
      id: ei.user.id,
      name: ei.user.name,
      email: ei.user.email,
      role: ei.user.role,
      departmentId: ei.department?.id || null,
      department: ei.department
    }));

    // Fetch active sessions for team members today
    const activeSessions = await prisma.session.findMany({
      where: {
        userId: { in: users.map(u => u.id) },
        startedAt: { gte: today },
      },
      select: {
        id: true,
        userId: true,
        startedAt: true,
        endedAt: true,
      }
    });

    const sessionMap = new Map<string, { id: string; startedAt: Date; endedAt: Date | null }[]>();
    activeSessions.forEach(session => {
      if (!session.userId) return; // Skip sessions without userId
      const existing = sessionMap.get(session.userId) || [];
      existing.push(session);
      sessionMap.set(session.userId, existing);
    });

    const employees: FloorEmployee[] = [];
    const stats: StatusStats = {
      working: 0,
      idle: 0,
      break: 0,
      offline: 0,
      total: users.length
    };

    users.forEach((user, index) => {
      const userKey = `user:${user.id}`;
      const lastHeartbeat = heartbeatStore.get(userKey);
      const sessionState = sessionStateStore.get(userKey);

      let status: EmployeeStatus = 'offline';
      let lastActivity: string | null = null;
      let currentApp: string | null = null;
      let sessionId: string | null = null;
      let onBreakSince: string | null = null;
      let idleSince: string | null = null;
      let workingDuration: number | null = null;
      let sessionStartedAt: string | null = null;
      let sessionEndedAt: string | null = null;

      // Check if user has recent heartbeat
      const isOnline = lastHeartbeat && (now - lastHeartbeat <= HEARTBEAT_TIMEOUT_MS);
      
      if (isOnline) {
        lastActivity = new Date(lastHeartbeat).toISOString();
      }

      // Check session state (more precise, 2min timeout)
      const hasRecentSessionState = sessionState?.lastUpdated && (now - sessionState.lastUpdated <= SESSION_STATE_TIMEOUT_MS);
      
      if (hasRecentSessionState && sessionState.currentState?.clockedIn) {
        const state = sessionState.currentState;
        // sessionId is stored at the top level of sessionState, not inside currentState
        sessionId = sessionState.sessionId || state.sessionId || null;
        currentApp = state.currentApp || null;

        if (state.onBreak || state.autoBreak) {
          status = 'break';
          onBreakSince = state.breakStartedAt ? new Date(state.breakStartedAt).toISOString() : null;
        } else if (state.isIdle) {
          status = 'idle';
          idleSince = state.idleSince ? new Date(state.idleSince).toISOString() : null;
        } else {
          status = 'working';
        }

        // Calculate working duration from sessions today
        const userSessions = sessionMap.get(user.id) || [];
        if (userSessions.length > 0) {
          workingDuration = 0;
          const sessionStarts: Date[] = [];
          const sessionEnds: Date[] = [];
          let hasActiveSession = false;
          
          userSessions.forEach(session => {
            const start = session.startedAt.getTime();
            const end = session.endedAt ? session.endedAt.getTime() : now;
            workingDuration! += (end - start);
            
            // Track session start
            sessionStarts.push(session.startedAt);
            
            // Track session end
            if (session.endedAt) {
              sessionEnds.push(session.endedAt);
            } else {
              hasActiveSession = true;
            }
          });
          
          // Set session start time (earliest)
          if (sessionStarts.length > 0) {
            const earliest = sessionStarts.reduce((min, date) => date < min ? date : min);
            sessionStartedAt = earliest.toISOString();
          }
          
          // Set session end time (latest, only if all sessions have ended)
          if (sessionEnds.length > 0 && !hasActiveSession) {
            const latest = sessionEnds.reduce((max, date) => date > max ? date : max);
            sessionEndedAt = latest.toISOString();
          }
        }
      } else if (isOnline) {
        // Has heartbeat but no active session = idle/offline
        status = 'offline';
      }

      stats[status]++;

      employees.push({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.department?.name || null,
        seatNumber: index + 1, // Simple seat numbering (can be customized)
        status,
        lastActivity,
        currentApp,
        sessionId,
        sessionStartedAt,
        sessionEndedAt,
        onBreakSince,
        idleSince,
        workingDuration
      });
    });

    return NextResponse.json({
      success: true,
      departmentId,
      departmentName: department.name,
      employees,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching team floor status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch floor status' },
      { status: 500 }
    );
  }
}
