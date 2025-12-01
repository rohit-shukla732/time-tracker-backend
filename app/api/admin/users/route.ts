import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "../../../../lib/roleAuth";
import { prisma } from "../../../../lib/prisma";

// GET /api/admin/users - Get all users with details (Admin only)
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);

  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const teamId = searchParams.get('teamId') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    if (teamId) {
      where.teamId = teamId;
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          team: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              sessions: true,
              events: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Get today's activity for each user
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userIds = users.map((u: any) => u.id);
    const todaysSessions = await prisma.session.findMany({
      where: {
        userId: { in: userIds },
        startedAt: { gte: today },
      },
      select: {
        userId: true,
        startedAt: true,
        endedAt: true,
      },
    });

    // Map today's activity to users
    const activityMap = new Map<string, { sessions: number; isActive: boolean }>();
    todaysSessions.forEach((s: any) => {
      if (!activityMap.has(s.userId)) {
        activityMap.set(s.userId, { sessions: 0, isActive: false });
      }
      const activity = activityMap.get(s.userId)!;
      activity.sessions++;
      if (!s.endedAt) {
        activity.isActive = true;
      }
    });

    return NextResponse.json({
      success: true,
      users: users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        teamId: u.teamId,
        teamName: u.team?.name,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        totalSessions: u._count.sessions,
        totalEvents: u._count.events,
        todayActivity: activityMap.get(u.id) || { sessions: 0, isActive: false },
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
