import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/roleAuth';
import { prisma } from '@/lib/prisma';
import { AttendanceEmailService } from '@/lib/attendanceEmailService';

// POST /api/attendance/check-late - Check for late employees and send notifications
export async function POST(request: Request) {
  const { user, error } = await requireRoles(request, ['MANAGER', 'ADMIN']);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const manager = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        shiftStartTime: true,
        lateThresholdMins: true,
        managedDepartments: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!manager) {
      return NextResponse.json({ error: 'Manager not found' }, { status: 404 });
    }

    const shiftStartTime = manager.shiftStartTime || '09:00';
    const lateThresholdMins = manager.lateThresholdMins || 15;

    // Calculate cutoff time
    const now = new Date();
    const [hours, minutes] = shiftStartTime.split(':').map(Number);
    const cutoffTime = new Date(now);
    cutoffTime.setHours(hours, minutes + lateThresholdMins, 0, 0);

    // Only check if current time is past the cutoff
    if (now < cutoffTime) {
      return NextResponse.json({
        message: 'Not yet past the late threshold',
        cutoffTime: cutoffTime.toISOString(),
        lateEmployees: [],
      });
    }

    // Get today's date range
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Get team members from manager's department
    let teamMemberIds: string[] = [];
    
    if (manager.managedDepartments) {
      const teamMembers = await prisma.employmentInfo.findMany({
        where: {
          departmentId: manager.managedDepartments.id,
          status: 'ACTIVE',
        },
        select: {
          userId: true,
        },
      });
      teamMemberIds = teamMembers.map(tm => tm.userId);
    }

    if (teamMemberIds.length === 0) {
      return NextResponse.json({
        message: 'No team members found',
        lateEmployees: [],
      });
    }

    // Find team members who haven't clocked in yet today
    const sessionsToday = await prisma.session.findMany({
      where: {
        userId: {
          in: teamMemberIds,
        },
        startedAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      select: {
        userId: true,
        startedAt: true,
      },
    });

    const clockedInUserIds = new Set(sessionsToday.map(s => s.userId));
    const lateUserIds = teamMemberIds.filter(id => !clockedInUserIds.has(id));

    // Get details of late employees
    const lateEmployees = await prisma.user.findMany({
      where: {
        id: {
          in: lateUserIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Create notifications for manager
    if (lateEmployees.length > 0) {
      await prisma.notification.create({
        data: {
          userId: manager.id,
          type: 'LATE_ARRIVAL',
          title: `${lateEmployees.length} Employee(s) Late`,
          message: `${lateEmployees.length} team member(s) have not clocked in yet: ${lateEmployees.map(e => e.name).join(', ')}`,
          data: {
            lateEmployees: lateEmployees.map(e => ({
              id: e.id,
              name: e.name,
              email: e.email,
            })),
            cutoffTime: cutoffTime.toISOString(),
          },
        },
      });

      // Send email notification
      const emailService = new AttendanceEmailService();
      await emailService.sendLateArrivalNotification(
        manager.email,
        manager.name,
        lateEmployees,
        shiftStartTime,
        cutoffTime
      );
    }

    return NextResponse.json({
      message: `Found ${lateEmployees.length} late employee(s)`,
      lateEmployees: lateEmployees.map(e => ({
        id: e.id,
        name: e.name,
        email: e.email,
      })),
      cutoffTime: cutoffTime.toISOString(),
    });
  } catch (error) {
    console.error('Failed to check late arrivals:', error);
    return NextResponse.json(
      { error: 'Failed to check late arrivals' },
      { status: 500 }
    );
  }
}
