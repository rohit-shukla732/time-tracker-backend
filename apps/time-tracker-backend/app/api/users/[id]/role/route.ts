import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "../../../../../lib/roleAuth";
import { prisma } from "../../../../../lib/prisma";
import type { Role } from "@ace-ems/shared";

// PATCH /api/users/[id]/role - Update user role (Admin only)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireAdmin(req);
  
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const userId = params.id;
    const { role } = await req.json();

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
    console.error('[users] Role update error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}