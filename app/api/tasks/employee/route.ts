import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/roleAuth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// GET /api/tasks/employee - Get tasks assigned to the logged-in employee
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = authResult.user;

    // Get tasks assigned to this employee with ACTIVE or IN_PROGRESS status
    const tasks = await prisma.task.findMany({
      where: {
        assignedTo: user.id,
        status: {
          in: ['ACTIVE', 'IN_PROGRESS']
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Format tasks for electron app
    const formattedTasks = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      projectId: task.projectId || null,
      projectName: task.project?.name || null,
      priority: task.priority.toLowerCase(),
      status: task.status.toLowerCase().replace('_', '-'),
      estimatedHours: task.estimatedHours || null,
      dueDate: task.dueDate?.toISOString() || null,
      createdBy: task.createdBy.id,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    }));

    return NextResponse.json({ tasks: formattedTasks });
  } catch (error) {
    logger.error('Error fetching employee tasks:', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
