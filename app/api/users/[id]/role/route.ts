import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "../../../../../lib/roleAuth";
import { prisma } from "../../../../../lib/prisma";
import { logger } from "../../../../../lib/logger";
import type { Role } from "@prisma/client";

// PATCH /api/users/[id]/role - Update user role (Admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  const resolvedParams = await params;
  const authResult = await requireAdmin(req);
  
  if (authResult.error || !authResult.user) {
    logger.warn("PATCH /api/users/[id]/role - Unauthorized");
    return unauthorizedResponse(authResult.error);
  }

  try {
    const userId = resolvedParams.id;
    const { role } = await req.json();
    logger.info("PATCH /api/users/[id]/role - Updating role", { targetUserId: userId, newRole: role, by: authResult.user.id });

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    const validRoles: Role[] = ['ADMIN', 'MANAGER', 'HR', 'EMPLOYEE'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
      }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin from changing their own role (to avoid lockout)
    if (user.id === authResult.user.id && role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Cannot change your own admin role' 
      }, { status: 400 });
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    logger.info("PATCH /api/users/[id]/role - Role updated", { userId, newRole: role });
    logger.response("PATCH", `/api/users/${userId}/role`, 200, Date.now() - startTime);
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        team: updatedUser.team,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    const err = error as Error;
    logger.error("PATCH /api/users/[id]/role - Failed", err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}