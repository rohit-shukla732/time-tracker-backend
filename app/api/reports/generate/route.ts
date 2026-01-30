import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/roleAuth';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

interface ReportFilters {
  reportType: string;
  members: string[];
  dateFrom: string;
  dateTo: string;
  format: 'excel' | 'pdf';
  idleThreshold?: number;
  lowActivityThreshold?: number;
  productiveApps?: string[];
  timezone?: 'IST' | 'EST';
}

// Timezone mapping
const TIMEZONE_MAP = {
  IST: 'Asia/Kolkata',
  EST: 'America/New_York'
};

// Helper to get date in specific timezone
function getDateInTimezone(date: Date, timezone: 'IST' | 'EST'): string {
  const tz = TIMEZONE_MAP[timezone];
  const zonedDate = toZonedTime(date, tz);
  return formatTz(zonedDate, 'yyyy-MM-dd', { timeZone: tz });
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRoles(request, ['MANAGER', 'ADMIN', 'HR']);
    
    if (authResult.error || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const user = authResult.user;
    
    const body = await request.json();
    const { filters, departmentId } = body as { filters: ReportFilters; departmentId: string };

    if (!filters || !departmentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify manager has access to this department
    if (user.role === 'MANAGER') {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        return NextResponse.json(
          { error: 'Department not found' },
          { status: 404 }
        );
      }

      // Allow if user is the department's manager
      if (department.managerId !== user.id) {
        return NextResponse.json(
          { error: 'Access denied to this department' },
          { status: 403 }
        );
      }
    }

    // Get department members
    const deptEmployments = await prisma.employmentInfo.findMany({
      where: { departmentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        }
      },
    });

    // Filter members if specific ones are selected
    const departmentMembers = deptEmployments.map(emp => emp.user);
    const memberIds = filters.members[0] === 'all'
      ? departmentMembers.map(m => m.id)
      : filters.members;

    const dateFrom = new Date(filters.dateFrom);
    const dateTo = new Date(filters.dateTo);
    dateTo.setHours(23, 59, 59, 999); // End of day

    const timezone = filters.timezone || 'IST'; // Default to IST

    let reportData: any = {};

    switch (filters.reportType) {
      case 'task-summary':
        reportData = await generateTaskSummaryReport(memberIds, dateFrom, dateTo, timezone);
        break;
      
      case 'task-productivity':
        reportData = await generateTaskProductivityReport(memberIds, dateFrom, dateTo, timezone);
        break;
      
      case 'task-time-tracking':
        reportData = await generateTaskTimeTrackingReport(memberIds, dateFrom, dateTo, timezone);
        break;
      
      case 'exception-alert':
        reportData = await generateExceptionReport(memberIds, dateFrom, dateTo, filters, timezone);
        break;
      
      case 'trend-comparison':
        reportData = await generateTrendReport(memberIds, dateFrom, dateTo, timezone);
        break;
      
      case 'attendance-session':
        reportData = await generateAttendanceReport(memberIds, dateFrom, dateTo, timezone);
        break;
      
      case 'productivity-score':
        reportData = await generateProductivityReport(memberIds, dateFrom, dateTo, timezone);
        break;
      
      case 'app-website-usage':
        reportData = await generateUsageReport(memberIds, dateFrom, dateTo, timezone);
        break;
      
      case 'active-idle-time':
        reportData = await generateActiveIdleReport(memberIds, dateFrom, dateTo, timezone);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      reportData,
      filters,
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function generateExceptionReport(
  memberIds: string[],
  dateFrom: Date,
  dateTo: Date,
  filters: ReportFilters,
  timezone: 'IST' | 'EST' = 'IST'
) {
  const sessions = await prisma.session.findMany({
    where: {
      userId: { in: memberIds },
      startedAt: {
        gte: dateFrom,
        lte: dateTo,
      },
      endedAt: { not: null },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      summary: true,
    },
    orderBy: { startedAt: 'desc' },
  });

  const exceptions = sessions
    .map((session) => {
      const totalMs = session.endedAt
        ? session.endedAt.getTime() - session.startedAt.getTime()
        : 0;
      const activeMs = session.summary ? Number(session.summary.workTimeMs) : 0;
      const idleMs = session.summary ? Number(session.summary.totalIdleMs) : (totalMs - activeMs);
      const idleMinutes = Math.round(idleMs / 60000);
      const activityPercentage = totalMs > 0 ? Math.round((activeMs / totalMs) * 100) : 0;

      const alerts = [];
      
      if (filters.idleThreshold && idleMinutes > filters.idleThreshold) {
        alerts.push({
          type: 'EXCESSIVE_IDLE',
          message: `Idle time (${idleMinutes} min) exceeds threshold (${filters.idleThreshold} min)`,
          severity: 'high',
        });
      }

      if (filters.lowActivityThreshold && activityPercentage < filters.lowActivityThreshold) {
        alerts.push({
          type: 'LOW_ACTIVITY',
          message: `Activity (${activityPercentage}%) below threshold (${filters.lowActivityThreshold}%)`,
          severity: 'medium',
        });
      }

      return {
        sessionId: session.id,
        user: session.user,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        totalMinutes: Math.round(totalMs / 60000),
        activeMinutes: Math.round(activeMs / 60000),
        idleMinutes,
        activityPercentage,
        alerts,
      };
    })
    .filter((s) => s.alerts.length > 0);

  return {
    summary: {
      totalSessions: sessions.length,
      exceptionalSessions: exceptions.length,
      exceptionRate: sessions.length > 0
        ? Math.round((exceptions.length / sessions.length) * 100)
        : 0,
    },
    exceptions,
  };
}

async function generateTrendReport(
  memberIds: string[],
  dateFrom: Date,
  dateTo: Date,
  timezone: 'IST' | 'EST' = 'IST'
) {
  const sessions = await prisma.session.findMany({
    where: {
      userId: { in: memberIds },
      startedAt: {
        gte: dateFrom,
        lte: dateTo,
      },
      endedAt: { not: null },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      summary: true,
    },
    orderBy: { startedAt: 'asc' },
  });

  // Group by day (in user's timezone)
  const dailyData = new Map<string, any>();
  
  sessions.forEach((session) => {
    const dayKey = getDateInTimezone(session.startedAt, timezone);

    if (!dailyData.has(dayKey)) {
      dailyData.set(dayKey, {
        date: dayKey,
        sessions: [],
        totalActiveTime: 0,
        totalTime: 0,
      });
    }

    const day = dailyData.get(dayKey)!;
    const totalMs = session.endedAt
      ? session.endedAt.getTime() - session.startedAt.getTime()
      : 0;
    const activeMs = session.summary ? Number(session.summary.workTimeMs) : 0;
    
    day.sessions.push(session);
    day.totalActiveTime += activeMs;
    day.totalTime += totalMs;
  });

  const dailyRecords = Array.from(dailyData.values()).map(day => ({
    date: day.date,
    sessionCount: day.sessions.length,
    totalActiveHours: Math.round((day.totalActiveTime / 3600000) * 10) / 10,
    totalHours: Math.round((day.totalTime / 3600000) * 10) / 10,
    activityPercentage: day.totalTime > 0
      ? Math.round((day.totalActiveTime / day.totalTime) * 100)
      : 0,
  })).sort((a, b) => a.date.localeCompare(b.date));

  // Calculate trends
  const trends = dailyRecords.length > 1
    ? {
        sessionCountTrend: dailyRecords[dailyRecords.length - 1].sessionCount - dailyRecords[0].sessionCount,
        activeHoursTrend: dailyRecords[dailyRecords.length - 1].totalActiveHours - dailyRecords[0].totalActiveHours,
        activityTrend: dailyRecords[dailyRecords.length - 1].activityPercentage - dailyRecords[0].activityPercentage,
      }
    : null;

  // Group by user and day for per-user breakdown
  const userDailyData = new Map<string, any>();
  
  sessions.forEach((session) => {
    const userId = session.userId;
    if (!userId) return;
    
    const dayKey = getDateInTimezone(session.startedAt, timezone);

    if (!userDailyData.has(userId)) {
      userDailyData.set(userId, {
        user: session.user,
        days: new Map<string, any>(),
        totalSessions: 0,
        totalActiveTime: 0,
        totalTime: 0,
      });
    }

    const userData = userDailyData.get(userId)!;
    userData.totalSessions++;
    
    if (!userData.days.has(dayKey)) {
      userData.days.set(dayKey, {
        date: dayKey,
        sessionCount: 0,
        activeTime: 0,
        totalTime: 0,
      });
    }

    const userDay = userData.days.get(dayKey)!;
    const totalMs = session.endedAt
      ? session.endedAt.getTime() - session.startedAt.getTime()
      : 0;
    const activeMs = session.summary ? Number(session.summary.workTimeMs) : 0;
    
    userDay.sessionCount++;
    userDay.activeTime += activeMs;
    userDay.totalTime += totalMs;
    userData.totalActiveTime += activeMs;
    userData.totalTime += totalMs;
  });

  const userTrends = Array.from(userDailyData.values()).map(userData => {
    const userDays = Array.from(userData.days.values()).map((day: any) => ({
      date: day.date,
      sessionCount: day.sessionCount,
      activeHours: Math.round((day.activeTime / 3600000) * 10) / 10,
      activityPercentage: day.totalTime > 0
        ? Math.round((day.activeTime / day.totalTime) * 100)
        : 0,
    })).sort((a, b) => a.date.localeCompare(b.date));

    const userTrend = userDays.length > 1
      ? {
          sessionCountTrend: userDays[userDays.length - 1].sessionCount - userDays[0].sessionCount,
          activeHoursTrend: userDays[userDays.length - 1].activeHours - userDays[0].activeHours,
          activityTrend: userDays[userDays.length - 1].activityPercentage - userDays[0].activityPercentage,
        }
      : null;

    return {
      user: userData.user,
      totalSessions: userData.totalSessions,
      totalActiveHours: Math.round((userData.totalActiveTime / 3600000) * 10) / 10,
      averageActivityPercentage: userData.totalTime > 0
        ? Math.round((userData.totalActiveTime / userData.totalTime) * 100)
        : 0,
      dailyData: userDays,
      trend: userTrend,
    };
  });

  return {
    summary: {
      totalSessions: sessions.length,
      totalDays: dailyRecords.length,
      averageSessionsPerDay: dailyRecords.length > 0
        ? Math.round(sessions.length / dailyRecords.length)
        : 0,
    },
    dailyData: dailyRecords,
    trends,
    userTrends: userTrends.sort((a, b) => b.totalActiveHours - a.totalActiveHours),
  };
}

async function generateAttendanceReport(
  memberIds: string[],
  dateFrom: Date,
  dateTo: Date,
  timezone: 'IST' | 'EST' = 'IST'
) {
  // Fetch all team member profiles (so absent members still appear)
  const allMembers = await prisma.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  // Fetch all sessions in the date range with summaries
  const sessions = await prisma.session.findMany({
    where: {
      userId: { in: memberIds },
      startedAt: { gte: dateFrom, lte: dateTo },
    },
    include: {
      summary: true,
    },
    orderBy: { startedAt: 'asc' },
  });

  // Build the full date range (one entry per calendar day)
  const dateKeys: string[] = [];
  const cursor = new Date(dateFrom);
  while (cursor <= dateTo) {
    dateKeys.push(getDateInTimezone(cursor, timezone));
    cursor.setDate(cursor.getDate() + 1);
  }

  // Group sessions: date → userId → session[]
  const byDateUser = new Map<string, Map<string, any[]>>();
  sessions.forEach((s) => {
    if (!s.userId) return;
    const dk = getDateInTimezone(s.startedAt, timezone);
    if (!byDateUser.has(dk)) byDateUser.set(dk, new Map());
    const uMap = byDateUser.get(dk)!;
    if (!uMap.has(s.userId)) uMap.set(s.userId, []);
    uMap.get(s.userId)!.push(s);
  });

  // Build per-date attendance records
  const dailyAttendance = dateKeys.map((date) => {
    const uMap = byDateUser.get(date) || new Map();

    const members = allMembers.map((member) => {
      const userSessions = uMap.get(member.id) || [];
      if (userSessions.length === 0) {
        return { user: member, present: false };
      }

      // Earliest clock-in, latest clock-out
      const clockIn = userSessions.reduce((min: Date, s: any) =>
        s.startedAt < min ? s.startedAt : min, userSessions[0].startedAt);
      const lastSession = userSessions.reduce((max: any, s: any) =>
        (s.endedAt && (!max.endedAt || s.endedAt > max.endedAt)) ? s : max, userSessions[0]);

      const workMs   = userSessions.reduce((sum: number, s: any) => sum + Number(s.summary?.workTimeMs  || 0), 0);
      const breakMs  = userSessions.reduce((sum: number, s: any) => sum + Number(s.summary?.totalBreakMs || 0), 0);
      const idleMs   = userSessions.reduce((sum: number, s: any) => sum + Number(s.summary?.totalIdleMs  || 0), 0);
      // Use summary-based total (work + break + idle) so activePct can never exceed 100
      const summaryTotalMs = workMs + breakMs + idleMs;

      const workMinutes  = Math.round(workMs  / 60000);
      const breakMinutes = Math.round(breakMs / 60000);
      const idleMinutes  = Math.round(idleMs  / 60000);
      const totalMinutes = Math.round(summaryTotalMs / 60000);
      const activePct    = totalMinutes > 0 ? Math.min(100, Math.round((workMinutes / totalMinutes) * 100)) : 0;

      return {
        user: member,
        present: true,
        clockIn,
        clockOut: lastSession.endedAt || null,
        workMinutes,
        breakMinutes,
        idleMinutes,
        totalMinutes,
        activePct,
      };
    });

    // Present members first, then absent; within present sort by name
    members.sort((a, b) => {
      if (a.present && !b.present) return -1;
      if (!a.present && b.present) return 1;
      return (a.user.name || '').localeCompare(b.user.name || '');
    });

    const presentCount = members.filter((m) => m.present).length;
    return {
      date,
      presentCount,
      absentCount: allMembers.length - presentCount,
      members,
    };
  });

  return {
    summary: {
      totalMembers: allMembers.length,
      totalDays: dailyAttendance.length,
      daysWithActivity: dailyAttendance.filter((d) => d.presentCount > 0).length,
      dateRange: {
        from: getDateInTimezone(dateFrom, timezone),
        to: getDateInTimezone(dateTo, timezone),
      },
    },
    dailyAttendance,
  };
}

async function generateProductivityReport(
  memberIds: string[],
  dateFrom: Date,
  dateTo: Date,
  timezone: 'IST' | 'EST' = 'IST'
) {
  const sessions = await prisma.session.findMany({
    where: {
      userId: { in: memberIds },
      startedAt: {
        gte: dateFrom,
        lte: dateTo,
      },
      endedAt: { not: null },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      appUsage: true,
      summary: true,
    },
  });

  const productivityByUser = sessions.reduce((acc: Record<string, any>, session) => {
    const userId = session.userId;
    if (!userId) return acc; // Skip sessions without userId
    
    if (!acc[userId]) {
      acc[userId] = {
        user: session.user,
        sessions: [],
        totalActiveTime: 0,
        totalTime: 0,
        productiveAppTime: 0,
      };
    }

    const totalMs = session.endedAt!.getTime() - session.startedAt.getTime();
    const activeMs = session.summary ? Number(session.summary.workTimeMs) : 0;
    
    // Define productive apps (this can be customized)
    const productiveApps = ['Visual Studio Code', 'Chrome', 'Slack', 'Microsoft Teams', 'Excel'];
    const productiveAppMs = session.appUsage
      .filter((app) => productiveApps.some((pa) => app.appName.includes(pa)))
      .reduce((sum, app) => sum + Number(app.timeMs || 0), 0);

    acc[userId].sessions.push(session);
    acc[userId].totalActiveTime += activeMs;
    acc[userId].totalTime += totalMs;
    acc[userId].productiveAppTime += productiveAppMs;

    return acc;
  }, {} as Record<string, any>);

  const productivityScores = Object.values(productivityByUser).map((userData: any) => {
    const activityScore = userData.totalTime > 0
      ? (userData.totalActiveTime / userData.totalTime) * 40 // Max 40 points
      : 0;
    
    const productivityScore = userData.totalActiveTime > 0
      ? (userData.productiveAppTime / userData.totalActiveTime) * 40 // Max 40 points
      : 0;
    
    const consistencyScore = Math.min(userData.sessions.length * 2, 20); // Max 20 points
    
    const finalScore = Math.round(activityScore + productivityScore + consistencyScore);

    return {
      user: userData.user,
      score: finalScore,
      breakdown: {
        activityScore: Math.round(activityScore),
        productivityScore: Math.round(productivityScore),
        consistencyScore: Math.round(consistencyScore),
      },
      metrics: {
        totalSessions: userData.sessions.length,
        totalActiveHours: Math.round((userData.totalActiveTime / 3600000) * 10) / 10,
        productiveHours: Math.round((userData.productiveAppTime / 3600000) * 10) / 10,
        activityPercentage: userData.totalTime > 0
          ? Math.round((userData.totalActiveTime / userData.totalTime) * 100)
          : 0,
      },
    };
  });

  return {
    summary: {
      totalUsers: productivityScores.length,
      averageScore: productivityScores.length > 0
        ? Math.round(productivityScores.reduce((sum, u) => sum + u.score, 0) / productivityScores.length)
        : 0,
    },
    scores: productivityScores.sort((a, b) => b.score - a.score),
  };
}

async function generateUsageReport(
  memberIds: string[],
  dateFrom: Date,
  dateTo: Date,
  timezone: 'IST' | 'EST' = 'IST'
) {
  const appUsage = await prisma.sessionAppUsage.findMany({
    where: {
      session: {
        userId: { in: memberIds },
        startedAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
    },
    include: {
      session: {
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
  });

  const websiteUsage = await prisma.sessionWebsiteUsage.findMany({
    where: {
      session: {
        userId: { in: memberIds },
        startedAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
    },
    include: {
      session: {
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
  });

  // Aggregate app usage
  const appAggregation = appUsage.reduce((acc: Record<string, any>, usage) => {
    const key = usage.appName;
    if (!acc[key]) {
      acc[key] = { appName: key, totalTime: 0, userCount: new Set() };
    }
    acc[key].totalTime += Number(usage.timeMs || 0);
    acc[key].userCount.add(usage.session.userId);
    return acc;
  }, {} as Record<string, any>);

  const topApps = Object.values(appAggregation)
    .map((app: any) => ({
      appName: app.appName,
      totalHours: Math.round((app.totalTime / 3600000) * 10) / 10,
      userCount: app.userCount.size,
    }))
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 20);

  // Aggregate website usage
  const websiteAggregation = websiteUsage.reduce((acc: Record<string, any>, usage) => {
    const key = usage.website;
    if (!acc[key]) {
      acc[key] = { website: key, totalTime: 0, userCount: new Set() };
    }
    acc[key].totalTime += Number(usage.timeMs || 0);
    acc[key].userCount.add(usage.session.userId);
    return acc;
  }, {} as Record<string, any>);

  const topWebsites = Object.values(websiteAggregation)
    .map((site: any) => ({
      website: site.website,
      totalHours: Math.round((site.totalTime / 3600000) * 10) / 10,
      userCount: site.userCount.size,
    }))
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 20);

  // Per-user app usage breakdown
  const userAppUsage = new Map<string, any>();
  appUsage.forEach((usage) => {
    const userId = usage.session.userId;
    if (!userId) return;
    
    if (!userAppUsage.has(userId)) {
      userAppUsage.set(userId, {
        user: usage.session.user,
        apps: new Map<string, number>(),
        totalAppTime: 0,
      });
    }
    
    const userData = userAppUsage.get(userId)!;
    const appTime = Number(usage.timeMs || 0);
    userData.totalAppTime += appTime;
    
    const currentTime = userData.apps.get(usage.appName) || 0;
    userData.apps.set(usage.appName, currentTime + appTime);
  });

  const userAppBreakdown = Array.from(userAppUsage.values()).map(userData => {
    const topUserApps = (Array.from(userData.apps.entries()) as [string, number][])
      .map(([appName, time]) => ({
        appName,
        hours: Math.round((time / 3600000) * 10) / 10,
      }))
      .sort((a: any, b: any) => b.hours - a.hours)
      .slice(0, 10);

    return {
      user: userData.user,
      totalAppHours: Math.round((userData.totalAppTime / 3600000) * 10) / 10,
      appCount: userData.apps.size,
      topApps: topUserApps,
    };
  });

  // Per-user website usage breakdown
  const userWebsiteUsage = new Map<string, any>();
  websiteUsage.forEach((usage) => {
    const userId = usage.session.userId;
    if (!userId) return;
    
    if (!userWebsiteUsage.has(userId)) {
      userWebsiteUsage.set(userId, {
        user: usage.session.user,
        websites: new Map<string, number>(),
        totalBrowsingTime: 0,
      });
    }
    
    const userData = userWebsiteUsage.get(userId)!;
    const browsingTime = Number(usage.timeMs || 0);
    userData.totalBrowsingTime += browsingTime;
    
    const currentTime = userData.websites.get(usage.website) || 0;
    userData.websites.set(usage.website, currentTime + browsingTime);
  });

  const userWebsiteBreakdown = Array.from(userWebsiteUsage.values()).map(userData => {
    const topUserWebsites = (Array.from(userData.websites.entries()) as [string, number][])
      .map(([website, time]) => ({
        website,
        hours: Math.round((time / 3600000) * 10) / 10,
      }))
      .sort((a: any, b: any) => b.hours - a.hours)
      .slice(0, 10);

    return {
      user: userData.user,
      totalBrowsingHours: Math.round((userData.totalBrowsingTime / 3600000) * 10) / 10,
      websiteCount: userData.websites.size,
      topWebsites: topUserWebsites,
    };
  });

  return {
    summary: {
      totalApps: Object.keys(appAggregation).length,
      totalWebsites: Object.keys(websiteAggregation).length,
      totalAppHours: Math.round(
        Object.values(appAggregation).reduce((sum: number, app: any) => sum + app.totalTime, 0) / 3600000
      ),
      totalBrowsingHours: Math.round(
        Object.values(websiteAggregation).reduce((sum: number, site: any) => sum + site.totalTime, 0) / 3600000
      ),
    },
    topApps,
    topWebsites,
    userAppUsage: userAppBreakdown.sort((a, b) => b.totalAppHours - a.totalAppHours),
    userWebsiteUsage: userWebsiteBreakdown.sort((a, b) => b.totalBrowsingHours - a.totalBrowsingHours),
  };
}

async function generateActiveIdleReport(
  memberIds: string[],
  dateFrom: Date,
  dateTo: Date,
  timezone: 'IST' | 'EST' = 'IST'
) {
  const sessions = await prisma.session.findMany({
    where: {
      userId: { in: memberIds },
      startedAt: {
        gte: dateFrom,
        lte: dateTo,
      },
      endedAt: { not: null },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      summary: true,
    },
    orderBy: { startedAt: 'asc' },
  });

  const userAnalysis = sessions.reduce((acc: Record<string, any>, session) => {
    const userId = session.userId;
    if (!userId) return acc; // Skip sessions without userId
    
    if (!acc[userId]) {
      acc[userId] = {
        user: session.user,
        totalActiveTime: 0,
        totalIdleTime: 0,
        totalTime: 0,
        sessions: [],
        maxIdleStreak: 0,
      };
    }

    const totalMs = session.endedAt!.getTime() - session.startedAt.getTime();
    const activeMs = session.summary ? Number(session.summary.workTimeMs) : 0;
    const idleMs = session.summary ? Number(session.summary.totalIdleMs) : (totalMs - activeMs);

    acc[userId].totalActiveTime += activeMs;
    acc[userId].totalIdleTime += idleMs;
    acc[userId].totalTime += totalMs;
    acc[userId].sessions.push({
      id: session.id,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      activeMinutes: Math.round(activeMs / 60000),
      idleMinutes: Math.round(idleMs / 60000),
    });

    // Track max idle streak
    const idleMinutes = Math.round(idleMs / 60000);
    if (idleMinutes > acc[userId].maxIdleStreak) {
      acc[userId].maxIdleStreak = idleMinutes;
    }

    return acc;
  }, {} as Record<string, any>);

  const analysis = Object.values(userAnalysis).map((userData: any) => ({
    user: userData.user,
    totalSessions: userData.sessions.length,
    totalHours: Math.round((userData.totalTime / 3600000) * 10) / 10,
    activeHours: Math.round((userData.totalActiveTime / 3600000) * 10) / 10,
    idleHours: Math.round((userData.totalIdleTime / 3600000) * 10) / 10,
    activityPercentage: userData.totalTime > 0
      ? Math.round((userData.totalActiveTime / userData.totalTime) * 100)
      : 0,
    maxIdleStreakMinutes: userData.maxIdleStreak,
    averageActiveMinutesPerSession: userData.sessions.length > 0
      ? Math.round(userData.totalActiveTime / 60000 / userData.sessions.length)
      : 0,
  }));

  return {
    summary: {
      totalUsers: analysis.length,
      totalHours: Math.round(analysis.reduce((sum, u) => sum + u.totalHours, 0)),
      totalActiveHours: Math.round(analysis.reduce((sum, u) => sum + u.activeHours, 0)),
      totalIdleHours: Math.round(analysis.reduce((sum, u) => sum + u.idleHours, 0)),
      averageActivityPercentage: analysis.length > 0
        ? Math.round(analysis.reduce((sum, u) => sum + u.activityPercentage, 0) / analysis.length)
        : 0,
    },
    userAnalysis: analysis.sort((a, b) => b.activityPercentage - a.activityPercentage),
  };
}

// ==================== TASK-BASED REPORTS ====================

// Task Summary Report
async function generateTaskSummaryReport(
  memberIds: string[],
  dateFrom: Date,
  dateTo: Date,
  timezone: 'IST' | 'EST'
) {
  // Get all tasks for the members in the date range
  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { assignedTo: { in: memberIds } },
        { createdById: { in: memberIds } }
      ],
      createdAt: { gte: dateFrom, lte: dateTo }
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
      taskSessions: {
        select: {
          startedAt: true,
          endedAt: true,
          durationMs: true,
          userId: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate metrics by user
  const userMetrics = memberIds.map(userId => {
    const userTasks = tasks.filter(t => t.assignedTo === userId || t.createdById === userId);
    const assignedTasks = tasks.filter(t => t.assignedTo === userId);
    const createdTasks = tasks.filter(t => t.createdById === userId);
    
    const completedTasks = assignedTasks.filter(t => t.status === 'COMPLETED');
    const pendingTasks = assignedTasks.filter(t => t.status === 'PENDING_APPROVAL' || t.status === 'ACTIVE');
    const inProgressTasks = assignedTasks.filter(t => t.status === 'IN_PROGRESS');
    
    // Calculate total time spent
    const totalTimeMs = assignedTasks.reduce((sum, task) => {
      const taskTime = task.taskSessions
        .filter(s => s.userId === userId)
        .reduce((tSum, session) => tSum + Number(session.durationMs || 0), 0);
      return sum + taskTime;
    }, 0);

    const user = tasks.find(t => t.assignee?.id === userId || t.createdBy?.id === userId);
    
    return {
      userId,
      userName: user?.assignee?.name || user?.createdBy?.name || 'Unknown',
      totalTasks: assignedTasks.length,
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      inProgressTasks: inProgressTasks.length,
      createdTasks: createdTasks.length,
      totalTimeMs,
      totalTimeHours: Number((totalTimeMs / (1000 * 60 * 60)).toFixed(2)),
      completionRate: assignedTasks.length > 0 
        ? Math.round((completedTasks.length / assignedTasks.length) * 100)
        : 0
    };
  });

  // Task breakdown by status
  const statusBreakdown = {
    ACTIVE: tasks.filter(t => t.status === 'ACTIVE').length,
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
    PENDING_APPROVAL: tasks.filter(t => t.status === 'PENDING_APPROVAL').length,
    CANCELLED: tasks.filter(t => t.status === 'CANCELLED').length,
  };

  // Task breakdown by priority
  const priorityBreakdown = {
    LOW: tasks.filter(t => t.priority === 'LOW').length,
    MEDIUM: tasks.filter(t => t.priority === 'MEDIUM').length,
    HIGH: tasks.filter(t => t.priority === 'HIGH').length,
    URGENT: tasks.filter(t => t.priority === 'URGENT').length,
  };

  return {
    summary: {
      totalTasks: tasks.length,
      totalUsers: memberIds.length,
      dateRange: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
      statusBreakdown,
      priorityBreakdown
    },
    userMetrics: userMetrics.sort((a, b) => b.totalTimeHours - a.totalTimeHours),
    taskList: tasks.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee?.name,
      project: t.project?.name,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      totalTime: t.taskSessions.reduce((sum, s) => sum + Number(s.durationMs || 0), 0)
    }))
  };
}

// Task Productivity Report
async function generateTaskProductivityReport(
  memberIds: string[],
  dateFrom: Date,
  dateTo: Date,
  timezone: 'IST' | 'EST'
) {
  const tasks = await prisma.task.findMany({
    where: {
      assignedTo: { in: memberIds },
      taskSessions: {
        some: {
          startedAt: { gte: dateFrom, lte: dateTo }
        }
      }
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
      taskSessions: {
        where: {
          startedAt: { gte: dateFrom, lte: dateTo }
        },
        select: {
          userId: true,
          startedAt: true,
          endedAt: true,
          durationMs: true
        }
      }
    }
  });

  const productivityMetrics = memberIds.map(userId => {
    const userTasks = tasks.filter(t => t.assignedTo === userId);
    const completedTasks = userTasks.filter(t => t.status === 'COMPLETED');
    
    const totalTimeMs = userTasks.reduce((sum, task) => {
      const taskTime = task.taskSessions
        .filter(s => s.userId === userId)
        .reduce((tSum, session) => tSum + Number(session.durationMs || 0), 0);
      return sum + taskTime;
    }, 0);

    const avgTimePerTask = userTasks.length > 0 ? totalTimeMs / userTasks.length : 0;
    const avgTimePerCompletedTask = completedTasks.length > 0 
      ? completedTasks.reduce((sum, task) => {
          const taskTime = task.taskSessions
            .filter(s => s.userId === userId)
            .reduce((tSum, session) => tSum + Number(session.durationMs || 0), 0);
          return sum + taskTime;
        }, 0) / completedTasks.length
      : 0;

    // Calculate estimated vs actual time
    const estimatedVsActual = userTasks
      .filter(t => t.estimatedHours)
      .map(task => {
        const actualMs = task.taskSessions
          .filter(s => s.userId === userId)
          .reduce((sum, s) => sum + Number(s.durationMs || 0), 0);
        const estimatedMs = (task.estimatedHours || 0) * 60 * 60 * 1000;
        return {
          taskId: task.id,
          taskTitle: task.title,
          estimated: task.estimatedHours,
          actual: Number((actualMs / (1000 * 60 * 60)).toFixed(2)),
          variance: estimatedMs > 0 ? Math.round(((actualMs - estimatedMs) / estimatedMs) * 100) : 0
        };
      });

    const user = tasks.find(t => t.assignee?.id === userId)?.assignee;

    return {
      userId,
      userName: user?.name || 'Unknown',
      totalTasks: userTasks.length,
      completedTasks: completedTasks.length,
      completionRate: userTasks.length > 0 ? Math.round((completedTasks.length / userTasks.length) * 100) : 0,
      totalTimeHours: Number((totalTimeMs / (1000 * 60 * 60)).toFixed(2)),
      avgTimePerTaskHours: Number((avgTimePerTask / (1000 * 60 * 60)).toFixed(2)),
      avgTimePerCompletedTaskHours: Number((avgTimePerCompletedTask / (1000 * 60 * 60)).toFixed(2)),
      estimatedVsActual,
      efficiencyScore: avgTimePerCompletedTask > 0 && completedTasks.length > 0
        ? Math.min(100, Math.round((1 - (avgTimePerCompletedTask / (8 * 60 * 60 * 1000))) * 100))
        : 0
    };
  });

  return {
    summary: {
      totalUsers: memberIds.length,
      avgCompletionRate: productivityMetrics.length > 0
        ? Math.round(productivityMetrics.reduce((sum, m) => sum + m.completionRate, 0) / productivityMetrics.length)
        : 0,
      totalTasksAcrossUsers: productivityMetrics.reduce((sum, m) => sum + m.totalTasks, 0),
      totalCompletedTasksAcrossUsers: productivityMetrics.reduce((sum, m) => sum + m.completedTasks, 0)
    },
    userMetrics: productivityMetrics.sort((a, b) => b.efficiencyScore - a.efficiencyScore)
  };
}

// Task Time Tracking Report
async function generateTaskTimeTrackingReport(
  memberIds: string[],
  dateFrom: Date,
  dateTo: Date,
  timezone: 'IST' | 'EST'
) {
  const taskSessions = await prisma.taskSession.findMany({
    where: {
      userId: { in: memberIds },
      startedAt: { gte: dateFrom, lte: dateTo }
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      task: {
        include: {
          project: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { startedAt: 'desc' }
  });

  // Group by user
  const userTimeTracking = memberIds.map(userId => {
    const userSessions = taskSessions.filter(s => s.userId === userId);
    const totalTimeMs = userSessions.reduce((sum, s) => sum + Number(s.durationMs || 0), 0);
    
    // Group by task
    const taskBreakdown = userSessions.reduce((acc, session) => {
      const taskId = session.task.id;
      if (!acc[taskId]) {
        acc[taskId] = {
          taskId,
          taskTitle: session.task.title,
          project: session.task.project?.name,
          status: session.task.status,
          priority: session.task.priority,
          sessions: [],
          totalTimeMs: 0
        };
      }
      acc[taskId].sessions.push({
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        durationMs: Number(session.durationMs || 0)
      });
      acc[taskId].totalTimeMs += Number(session.durationMs || 0);
      return acc;
    }, {} as Record<string, any>);

    const user = userSessions[0]?.user;

    return {
      userId,
      userName: user?.name || 'Unknown',
      totalSessions: userSessions.length,
      totalTimeHours: Number((totalTimeMs / (1000 * 60 * 60)).toFixed(2)),
      uniqueTasks: Object.keys(taskBreakdown).length,
      taskBreakdown: Object.values(taskBreakdown)
        .sort((a: any, b: any) => b.totalTimeMs - a.totalTimeMs)
        .map((t: any) => ({
          ...t,
          totalTimeHours: Number((t.totalTimeMs / (1000 * 60 * 60)).toFixed(2)),
          sessionCount: t.sessions.length
        }))
    };
  });

  return {
    summary: {
      totalUsers: memberIds.length,
      totalSessions: taskSessions.length,
      totalTimeHours: Number(
        (taskSessions.reduce((sum, s) => sum + Number(s.durationMs || 0), 0) / (1000 * 60 * 60)).toFixed(2)
      ),
      dateRange: { from: dateFrom.toISOString(), to: dateTo.toISOString() }
    },
    userTimeTracking: userTimeTracking.sort((a, b) => b.totalTimeHours - a.totalTimeHours)
  };
}
