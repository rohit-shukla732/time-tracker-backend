import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/roleAuth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const endTaskSchema = z.object({
  sessionId: z.string(),
  totalActiveMs: z.number().optional(),
  totalBreakMs: z.number().optional(),
  totalIdleMs: z.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

// POST /api/tasks/[id]/end - End a task session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = endTaskSchema.parse(body);

    // Check if task exists and is assigned to user
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.assignedTo !== authResult.user.id) {
      return NextResponse.json(
        { error: 'Task not assigned to this user' },
        { status: 403 }
      );
    }

    // Find or create the session
    let session = await prisma.session.findUnique({
      where: { sessionId: validatedData.sessionId }
    });

    if (!session) {
      // Create session if it doesn't exist (from electron app)
      session = await prisma.session.create({
        data: {
          sessionId: validatedData.sessionId,
          userId: authResult.user.id,
          startedAt: validatedData.startTime ? new Date(validatedData.startTime) : new Date(),
          endedAt: validatedData.endTime ? new Date(validatedData.endTime) : new Date(),
        }
      });
    }

    // Calculate duration
    const durationMs = validatedData.totalActiveMs || 0;

    // Find existing task session or create new one
    const existingTaskSession = await prisma.taskSession.findFirst({
      where: {
        taskId: taskId,
        sessionId: validatedData.sessionId,
        userId: authResult.user.id,
      }
    });

    if (existingTaskSession) {
      // Update existing task session
      await prisma.taskSession.update({
        where: { id: existingTaskSession.id },
        data: {
          endedAt: validatedData.endTime ? new Date(validatedData.endTime) : new Date(),
          durationMs: BigInt(durationMs),
        }
      });
    } else {
      // Create new task session
      await prisma.taskSession.create({
        data: {
          taskId: taskId,
          sessionId: validatedData.sessionId,
          userId: authResult.user.id,
          startedAt: validatedData.startTime ? new Date(validatedData.startTime) : new Date(),
          endedAt: validatedData.endTime ? new Date(validatedData.endTime) : new Date(),
          durationMs: BigInt(durationMs),
        }
      });
    }

    // Update task status to IN_PROGRESS if not already
    if (task.status === 'ACTIVE') {
      await prisma.task.update({
        where: { id: taskId },
        data: { 
          status: 'IN_PROGRESS',
          startedAt: task.startedAt || new Date()
        }
      });
    }

    logger.info(`Task session ended: ${taskId} by user ${authResult.user.id}`);

    return NextResponse.json({ 
      success: true,
      message: 'Task session ended successfully',
      taskId: taskId,
      sessionId: validatedData.sessionId,
      durationMs: durationMs
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Error ending task session:', error as Error);
    return NextResponse.json(
      { error: 'Failed to end task session' },
      { status: 500 }
    );
  }
}
