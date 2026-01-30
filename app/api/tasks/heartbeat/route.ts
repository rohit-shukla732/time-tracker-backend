import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/roleAuth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const heartbeatSchema = z.object({
  taskId: z.string(),
  sessionId: z.string(),
  userId: z.string(),
  totalActiveMs: z.number(),
  totalBreakMs: z.number().optional(),
  totalIdleMs: z.number().optional(),
  timestamp: z.string(),
});

// POST /api/tasks/heartbeat - Update task session progress
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = heartbeatSchema.parse(body);

    // Verify user matches authenticated user
    if (validatedData.userId !== authResult.user.id) {
      return NextResponse.json(
        { error: 'User ID mismatch' },
        { status: 403 }
      );
    }

    // Check if task exists and is assigned to user
    const task = await prisma.task.findUnique({
      where: { id: validatedData.taskId }
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
      // Create session if it doesn't exist
      session = await prisma.session.create({
        data: {
          sessionId: validatedData.sessionId,
          userId: validatedData.userId,
          startedAt: new Date(validatedData.timestamp),
        }
      });
    }

    // Find or create task session
    let taskSession = await prisma.taskSession.findFirst({
      where: {
        taskId: validatedData.taskId,
        sessionId: validatedData.sessionId,
        userId: validatedData.userId,
      }
    });

    if (taskSession) {
      // Update existing task session with latest duration
      await prisma.taskSession.update({
        where: { id: taskSession.id },
        data: {
          durationMs: BigInt(validatedData.totalActiveMs),
        }
      });
    } else {
      // Create new task session
      taskSession = await prisma.taskSession.create({
        data: {
          taskId: validatedData.taskId,
          sessionId: validatedData.sessionId,
          userId: validatedData.userId,
          startedAt: new Date(validatedData.timestamp),
          durationMs: BigInt(validatedData.totalActiveMs),
        }
      });
    }

    // Update task status to IN_PROGRESS if currently ACTIVE
    if (task.status === 'ACTIVE') {
      await prisma.task.update({
        where: { id: validatedData.taskId },
        data: { 
          status: 'IN_PROGRESS',
          startedAt: task.startedAt || new Date()
        }
      });
    }

    logger.info(`Task heartbeat received: ${validatedData.taskId} - ${validatedData.totalActiveMs}ms`);

    return NextResponse.json({ 
      success: true,
      message: 'Heartbeat received',
      taskId: validatedData.taskId,
      sessionId: validatedData.sessionId,
      totalActiveMs: validatedData.totalActiveMs
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Error processing task heartbeat:', error as Error);
    return NextResponse.json(
      { error: 'Failed to process heartbeat' },
      { status: 500 }
    );
  }
}
