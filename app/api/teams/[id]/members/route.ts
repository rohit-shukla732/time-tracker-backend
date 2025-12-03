import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "../../../../../lib/roleAuth";
import { prisma } from "../../../../../lib/prisma";
import { logger } from "../../../../../lib/logger";

// POST /api/teams/[id]/members - Add member to team (Admin only)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  const resolvedParams = await params;
  const authResult = await requireAdmin(req);
  
  if (authResult.error || !authResult.user) {
    logger.warn("POST /api/teams/[id]/members - Unauthorized");
    return unauthorizedResponse(authResult.error);
  }

  try {
    const teamId = resolvedParams.id;
    const { userId } = await req.json();
    logger.info("POST /api/teams/[id]/members - Adding member", { teamId, userId, by: authResult.user.id });

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already in a team
    if (user.teamId) {
      return NextResponse.json({ error: 'User is already in a team' }, { status: 400 });
    }

    // Add user to team
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { teamId },
      include: {
        team: true
      }
    });

    logger.info("POST /api/teams/[id]/members - Member added", { teamId, userId });
    logger.response("POST", `/api/teams/${teamId}/members`, 200, Date.now() - startTime);
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        team: updatedUser.team
      }
    });
  } catch (error) {
    const err = error as Error;
    logger.error("POST /api/teams/[id]/members - Failed", err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/teams/[id]/members - Remove member from team (Admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  const resolvedParams = await params;
  const authResult = await requireAdmin(req);
  
  if (authResult.error || !authResult.user) {
    logger.warn("DELETE /api/teams/[id]/members - Unauthorized");
    return unauthorizedResponse(authResult.error);
  }

  try {
    const teamId = resolvedParams.id;
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    logger.info("DELETE /api/teams/[id]/members - Removing member", { teamId, userId, by: authResult.user.id });

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Verify user exists and is in this team
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.teamId !== teamId) {
      return NextResponse.json({ error: 'User is not in this team' }, { status: 400 });
    }

    // Remove user from team
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { teamId: null }
    });

    logger.info("DELETE /api/teams/[id]/members - Member removed", { teamId, userId });
    logger.response("DELETE", `/api/teams/${teamId}/members`, 200, Date.now() - startTime);
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        teamId: null
      }
    });
  } catch (error) {
    const err = error as Error;
    logger.error("DELETE /api/teams/[id]/members - Failed", err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}