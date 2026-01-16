import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// POST /api/tasks/current/end - End current task session
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Find active task session
    const activeSession = await prisma.taskSession.findFirst({
      where: {
        sessionId,
        userId: user.id,
        endedAt: null
      }
    });

    if (!activeSession) {
      return NextResponse.json(
        { error: "No active task session found" },
        { status: 404 }
      );
    }

    // End the session
    const endTime = new Date();
    const duration = endTime.getTime() - new Date(activeSession.startedAt).getTime();

    const updatedSession = await prisma.taskSession.update({
      where: { id: activeSession.id },
      data: {
        endedAt: endTime,
        durationMs: BigInt(duration)
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });

    logger.info(`Task session ended: ${updatedSession.id} for task ${activeSession.taskId} by user ${user.id}`);

    return NextResponse.json(updatedSession);
  } catch (error) {
    logger.error("Error ending task session:", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/tasks/current - Get current active task session
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Find active task session
    const activeSession = await prisma.taskSession.findFirst({
      where: {
        sessionId,
        userId: user.id,
        endedAt: null
      },
      include: {
        task: {
          include: {
            project: true,
            assignee: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!activeSession) {
      return NextResponse.json({ activeTask: null });
    }

    return NextResponse.json({ activeTask: activeSession });
  } catch (error) {
    logger.error("Error fetching current task:", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
