import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "../../../../../lib/roleAuth";
import { prisma } from "../../../../../lib/prisma";

// GET /api/admin/sessions/[id] - Get detailed session info (Admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(req);

  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { id } = await params;

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        user: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            role: true, 
            employmentInfo: { 
              select: { 
                department: { 
                  select: { name: true } 
                } 
              } 
            } 
          },
        },
        summary: true,
        appUsage: {
          orderBy: { timeMs: 'desc' },
          take: 20,
        },
        events: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
        appSwitch: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
        _count: {
          select: {
            events: true,
            appSwitch: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        sessionId: session.sessionId,
        userId: session.userId,
        user: session.user ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          departmentName: session.user.employmentInfo?.department?.name || null,
        } : null,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        isActive: !session.endedAt,
        autoClockOut: session.autoClockOut,
        autoReason: session.autoReason,
        summary: session.summary ? {
          sessionDurationMs: Number(session.summary.sessionDurationMs),
          workTimeMs: Number(session.summary.workTimeMs),
          totalBreakMs: Number(session.summary.totalBreakMs),
          totalIdleMs: Number(session.summary.totalIdleMs),
        } : null,
        appUsage: session.appUsage.map((app: any) => ({
          id: app.id,
          appName: app.appName,
          timeMs: Number(app.timeMs),
        })),
        events: session.events.map((event: any) => ({
          id: event.id,
          type: event.type,
          reason: event.reason,
          durationMs: event.durationMs ? Number(event.durationMs) : null,
          timestamp: event.timestamp,
        })),
        appSwitches: session.appSwitch.map((sw: any) => ({
          id: sw.id,
          fromApp: sw.fromApp,
          toApp: sw.toApp,
          durationMs: sw.durationMs ? Number(sw.durationMs) : null,
          timestamp: sw.timestamp,
        })),
        counts: {
          events: session._count.events,
          appSwitches: session._count.appSwitch,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching session details:", error);
    return NextResponse.json(
      { error: "Failed to fetch session details" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/sessions/[id] - Delete a session and all related data (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(req);

  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { id } = await params;

    // First check if session exists
    const session = await prisma.session.findUnique({
      where: { id },
      select: { id: true, sessionId: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Delete all related data in the correct order (due to foreign key constraints)
    // 1. Delete events
    await prisma.event.deleteMany({
      where: { sessionId: session.sessionId },
    });

    // 2. Delete app switch events
    await prisma.appSwitchEvent.deleteMany({
      where: { sessionId: session.sessionId },
    });

    // 3. Delete app usage
    await prisma.sessionAppUsage.deleteMany({
      where: { sessionId: session.sessionId },
    });

    // 4. Delete session summary
    await prisma.sessionSummary.deleteMany({
      where: { sessionId: session.sessionId },
    });

    // 5. Finally delete the session
    await prisma.session.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
