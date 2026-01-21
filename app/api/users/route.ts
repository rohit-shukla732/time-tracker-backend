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
    const includeTeam = url.searchParams.get('includeTeam') === 'true';
    const role = url.searchParams.get('role');

    const whereCondition: any = {};
    
    // Role-based filtering
    if (authResult.user.role === 'ADMIN' || authResult.user.role === 'HR') {
      // Admin and HR can see all users
      if (role) {
        whereCondition.role = role;
      }
    } else if (authResult.user.role === 'MANAGER') {
      // Managers can only see their department members
      const managerEmployment = await prisma.employmentInfo.findUnique({
        where: { userId: authResult.user.id },
        select: { departmentId: true }
      });
      
      if (managerEmployment?.departmentId) {
        // Find users in the same department
        const departmentUsers = await prisma.employmentInfo.findMany({
          where: { departmentId: managerEmployment.departmentId },
          select: { userId: true }
        });
        whereCondition.id = { in: departmentUsers.map(emp => emp.userId) };
        if (role) {
          whereCondition.role = role;
        }
      } else {
        // Manager without a department can only see themselves
        whereCondition.id = authResult.user.id;
      }
    } else {
      // Employees can only see themselves
      whereCondition.id = authResult.user.id;
    }

    const users = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        employmentInfo: includeTeam ? {
          select: {
            departmentId: true,
            department: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        } : false,
        managedDepartment: authResult.user.role === 'ADMIN' || authResult.user.role === 'HR' ? {
          select: {
            id: true,
            name: true
          }
        } : false
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
        departmentId: user.employmentInfo?.departmentId || null,
        department: user.employmentInfo?.department || undefined,
        managedDepartment: user.managedDepartment || undefined,
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