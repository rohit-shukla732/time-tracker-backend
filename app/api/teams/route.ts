import { NextRequest, NextResponse } from "next/server";
import { requireRoles, requireAdmin, unauthorizedResponse } from "../../../lib/roleAuth";
import { prisma } from "../../../lib/prisma";
import { logger } from "../../../lib/logger";

// GET /api/teams - List all departments (Admin/HR see all, Manager sees their own)
export async function GET(req: NextRequest) {
  const authResult = await requireRoles(req, ['ADMIN', 'HR', 'MANAGER', 'SENIOR_MANAGER']);
  
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    // Admins/HR see all; Managers see their own dept; Senior Managers see all their assigned depts
    let whereClause: any = {};
    if (authResult.user.role === 'MANAGER') {
      whereClause = { managerId: authResult.user.id };
    } else if (authResult.user.role === 'SENIOR_MANAGER') {
      whereClause = { seniorManagers: { some: { userId: authResult.user.id } } };
    }

    const departments = await prisma.department.findMany({
      where: whereClause,
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        employmentInfo: {
          where: {
            user: { isArchived: false }
          },
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isArchived: true
              }
            }
          }
        },
        _count: {
          select: {
            employmentInfo: {
              where: {
                user: { isArchived: false }
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      departments: departments.map((dept: any) => ({
        id: dept.id,
        name: dept.name,
        code: dept.code,
        description: dept.description,
        managerId: dept.managerId,
        manager: dept.manager,
        members: dept.employmentInfo.map((e: any) => e.user),
        memberCount: dept._count.employmentInfo,
        createdAt: dept.createdAt,
        updatedAt: dept.updatedAt
      }))
    });
  } catch (error) {
    console.error('[teams] GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/teams - Create a new department (Admin/HR only)
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const authResult = await requireRoles(req, ['ADMIN', 'HR']);
  
  if (authResult.error || !authResult.user) {
    logger.warn("POST /api/teams - Unauthorized");
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { name, code, description, managerId } = await req.json();
    logger.info("POST /api/teams - Creating department", { name, code, managerId, by: authResult.user.id });

    if (!name) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    // Check if department name already exists
    const existingDept = await prisma.department.findFirst({
      where: { name }
    });

    if (existingDept) {
      return NextResponse.json({ error: 'Department name already exists' }, { status: 400 });
    }

    // If managerId provided, verify the user exists and can be a manager
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId }
      });

      if (!manager) {
        return NextResponse.json({ error: 'Manager not found' }, { status: 400 });
      }

      if (manager.role !== 'MANAGER' && manager.role !== 'ADMIN') {
        return NextResponse.json({ error: 'User must have MANAGER or ADMIN role' }, { status: 400 });
      }
    }

    const department = await prisma.department.create({
      data: {
        name,
        code: code || null,
        description,
        managerId
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    logger.info("POST /api/teams - Department created", { departmentId: department.id, name: department.name });
    logger.response("POST", "/api/teams", 200, Date.now() - startTime);
    return NextResponse.json({
      success: true,
      team: {
        id: department.id,
        name: department.name,
        description: department.description,
        manager: department.manager,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt
      }
    });
  } catch (error) {
    const err = error as Error;
    logger.error("POST /api/teams - Failed", err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}