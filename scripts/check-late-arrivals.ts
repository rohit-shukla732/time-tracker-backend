/**
 * Cron job to check for late employee arrivals
 * 
 * This script should be run periodically (e.g., every hour during work hours)
 * to check if any employees are late and send notifications to managers.
 * 
 * Setup:
 * 1. Add to package.json scripts:
 *    "check-late-arrivals": "ts-node scripts/check-late-arrivals.ts"
 * 
 * 2. Or set up a cron job:
 *    - Linux/Mac: Add to crontab: 0 9-18 * * 1-5 cd /path/to/app && npm run check-late-arrivals
 *    - Windows: Use Task Scheduler to run the script
 * 
 * 3. Or use a service like GitHub Actions, Vercel Cron, or AWS EventBridge
 */

import { prisma } from '../lib/prisma';
import { AttendanceEmailService } from '../lib/attendanceEmailService';

async function checkLateArrivals() {
  console.log('Starting late arrival check...');
  const now = new Date();
  
  try {
    // Get all managers with shift settings
    const managers = await prisma.user.findMany({
      where: {
        role: { in: ['MANAGER', 'ADMIN'] },
        shiftStartTime: { not: null },
      },
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

    console.log(`Found ${managers.length} managers with shift settings`);

    for (const manager of managers) {
      try {
        const shiftStartTime = manager.shiftStartTime!;
        const lateThresholdMins = manager.lateThresholdMins || 15;

        // Calculate cutoff time
        const [hours, minutes] = shiftStartTime.split(':').map(Number);
        const cutoffTime = new Date(now);
        cutoffTime.setHours(hours, minutes + lateThresholdMins, 0, 0);

        // Only check if current time is past the cutoff
        if (now < cutoffTime) {
          console.log(`Manager ${manager.name}: Not yet past cutoff time`);
          continue;
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
          console.log(`Manager ${manager.name}: No team members found`);
          continue;
        }

        // Check if we already sent a notification today
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: manager.id,
            type: 'LATE_ARRIVAL',
            createdAt: {
              gte: todayStart,
            },
          },
        });

        if (existingNotification) {
          console.log(`Manager ${manager.name}: Notification already sent today`);
          continue;
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
          },
        });

        const clockedInUserIds = new Set(sessionsToday.map(s => s.userId));
        const lateUserIds = teamMemberIds.filter(id => !clockedInUserIds.has(id));

        if (lateUserIds.length === 0) {
          console.log(`Manager ${manager.name}: All team members present`);
          continue;
        }

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

        console.log(`Manager ${manager.name}: Found ${lateEmployees.length} late employees`);

        // Create notification
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

        console.log(`✅ Sent late arrival notification to ${manager.name} for ${lateEmployees.length} employees`);
      } catch (error) {
        console.error(`Error processing manager ${manager.name}:`, error);
      }
    }

    console.log('Late arrival check completed');
  } catch (error) {
    console.error('Failed to check late arrivals:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkLateArrivals()
  .then(() => {
    console.log('Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
