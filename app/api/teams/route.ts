import { NextRequest, NextResponse } from "next/server";
import { requireRoles, requireAdmin, unauthorizedResponse } from "../../../lib/roleAuth";
import { prisma } from "../../../lib/prisma";

// GET /api/teams - List all teams (Admin/HR only)
export async function GET(req: NextRequest) {
  const authResult = await requireRoles(req, ['ADMIN', 'HR']);
  
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const teams = await prisma.team.findMany({
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      teams: teams.map((team: any) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        manager: team.manager,
        members: team.members,
        memberCount: team._count.members,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt
      }))
    });
  } catch (error) {
    console.error('[teams] GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/teams - Create a new team (Admin only)
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { name, description, managerId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    // Check if team name already exists
    const existingTeam = await prisma.team.findFirst({
      where: { name }
    });

    if (existingTeam) {
      return NextResponse.json({ error: 'Team name already exists' }, { status: 400 });
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

    const team = await prisma.team.create({
      data: {
        name,
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

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        manager: team.manager,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt
      }
    });
  } catch (error) {
    console.error('[teams] POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}