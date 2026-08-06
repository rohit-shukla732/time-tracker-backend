import { NextRequest, NextResponse } from "next/server";
import { requireRoles, requireAuth, getAccessibleUsers, unauthorizedResponse } from "../../../lib/roleAuth";
import { prisma } from "../../../lib/prisma";

// GET /api/users - List users based on role permissions
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const url = new URL(req.url);
    const role = url.searchParams.get('role');

    const whereCondition: any = {};

    // Role-based filtering
    if (authResult.user.role === 'ADMIN' || authResult.user.role === 'HR') {
      // Admin and HR can see all users
      if (role) {
        whereCondition.role = role;
      }
    } else {
      // All other roles can only see themselves
      whereCondition.id = authResult.user.id;
    }

    const users = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      users: users.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isArchived: user.isArchived,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })),
      currentUser: {
        id: authResult.user.id,
        role: authResult.user.role
      }
    });
  } catch (error) {
    console.error('[users] GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}