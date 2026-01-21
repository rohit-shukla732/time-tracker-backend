import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// Get session state store from global
const GLOBAL_SESSION_STATE_KEY = "__ace_ems_session_state_store__";
const g: any = globalThis as any;
if (!g[GLOBAL_SESSION_STATE_KEY]) g[GLOBAL_SESSION_STATE_KEY] = new Map<string, any>();
const sessionStateStore: Map<string, any> = g[GLOBAL_SESSION_STATE_KEY];

const SESSION_STATE_TIMEOUT_MS = 120_000; // 2 minutes

// GET /api/tv/stats - Get real-time stats for TV display (no auth required)
export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all departments with their members via employmentInfo
    const departments = await prisma.department.findMany({
      include: {
        employmentInfo: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get today's sessions for all users
    const todaySessions = await prisma.session.findMany({
      where: {
        startedAt: { gte: today },
        endedAt: null, // Only active sessions
      },
      include: {
        user: {
          select: {
            id: true,
            employmentInfo: {
              select: {
                departmentId: true
              }
            },
          },
        },
      },
    });

    // Get session summaries for today
    const sessionSummaries = await prisma.sessionSummary.findMany({
      where: {
        session: {
          startedAt: { gte: today },
        },
      },
      include: {
        session: {
          select: {
            sessionId: true,
            userId: true,
            startedAt: true,
            endedAt: true,
          },
        },
      },
    });

    // Build department data
    const departmentData = departments.map((dept: any) => {
      const deptMembers = dept.employmentInfo.map((e: any) => e.user);
      
      const membersWithStatus = deptMembers.map((member: any) => {
        // Check real-time status from session state store
        const stateKey = `user:${member.id}`;
        const userState = sessionStateStore.get(stateKey);
        
        let status: 'working' | 'idle' | 'break' | 'offline' = 'offline';
        let currentSession = undefined;

        // Check if user has valid state in last 2 minutes
        if (userState?.lastUpdated && Date.now() - userState.lastUpdated <= SESSION_STATE_TIMEOUT_MS) {
          const state = userState.currentState;
          if (state?.clockedIn) {
            if (state.onBreak || state.autoBreak) {
              status = 'break';
            } else if (state.isIdle) {
              status = 'idle';
            } else {
              status = 'working';
            }

            // Find active session for this user
            const activeSession = todaySessions.find((s: any) => s.userId === member.id);
            if (activeSession) {
              // Find summary for this session
              const summary = sessionSummaries.find((s: any) => s.sessionId === activeSession.sessionId);
              
              currentSession = {
                startedAt: activeSession.startedAt.toISOString(),
                workTimeMs: Number(summary?.workTimeMs || 0),
                breakTimeMs: Number(summary?.totalBreakMs || 0),
                idleTimeMs: Number(summary?.totalIdleMs || 0),
              };
            }
          }
        }

        return {
          id: member.id,
          name: member.name || 'Unknown',
          email: member.email,
          status,
          currentSession,
        };
      });

      // Calculate department stats
      const stats = {
        working: membersWithStatus.filter((m: any) => m.status === 'working').length,
        idle: membersWithStatus.filter((m: any) => m.status === 'idle').length,
        break: membersWithStatus.filter((m: any) => m.status === 'break').length,
        offline: membersWithStatus.filter((m: any) => m.status === 'offline').length,
        totalWorkTimeMs: membersWithStatus.reduce((sum: number, m: any) => 
          sum + (m.currentSession?.workTimeMs || 0), 0
        ),
        avgWorkTimeMs: 0,
      };

      const activeMembers = stats.working + stats.idle + stats.break;
      stats.avgWorkTimeMs = activeMembers > 0 
        ? Math.round(stats.totalWorkTimeMs / activeMembers)
        : 0;

      return {
        id: dept.id,
        name: dept.name,
        members: membersWithStatus,
        stats,
      };
    });

    return NextResponse.json({
      success: true,
      teams: departmentData,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching TV stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch TV statistics" },
      { status: 500 }
    );
  }
}
