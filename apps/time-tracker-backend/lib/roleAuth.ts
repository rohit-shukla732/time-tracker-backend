import { NextResponse } from "next/server";
import { verifyAccessToken } from "./auth";
import { prisma } from "./prisma";
import type { Role } from "@ace-ems/shared";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: Role;
  teamId?: string;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error?: string;
}

/**
 * Basic authentication - extracts user from JWT token
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const header = req.headers.get("Authorization");
  if (!header) {
    return { user: null, error: "Missing token" };
  }

  try {
    const token = header.replace("Bearer ", "");
    const payload = verifyAccessToken(token) as any;
    
    // Get full user info including role and team from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        team: true
      }
    });

    if (!user) {
      return { user: null, error: "User not found" };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        role: user.role as Role,
        teamId: user.teamId || undefined
      }
    };
  } catch (err) {
    return { user: null, error: "Invalid token" };
  }
}

/**
 * Role-based authentication - requires specific roles
 */
export async function requireRoles(req: Request, allowedRoles: Role[]): Promise<AuthResult> {
  const authResult = await requireAuth(req);
  
  if (authResult.error || !authResult.user) {
    return authResult;
  }

  if (!allowedRoles.includes(authResult.user.role)) {
    return { 
      user: null, 
      error: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
    };
  }

  return authResult;
}

/**
 * Admin-only authentication
 */
export async function requireAdmin(req: Request): Promise<AuthResult> {
  return requireRoles(req, ['ADMIN']);
}

/**
 * Manager or Admin authentication
 */
export async function requireManager(req: Request): Promise<AuthResult> {
  return requireRoles(req, ['ADMIN', 'MANAGER']);
}

/**
 * HR or Admin authentication
 */
export async function requireHR(req: Request): Promise<AuthResult> {
  return requireRoles(req, ['ADMIN', 'HR']);
}

/**
 * Check if user can access another user's data
 * Rules:
 * - ADMIN: Can access any user's data
 * - MANAGER: Can access their team members' data
 * - HR: Can access any user's data
 * - EMPLOYEE: Can only access their own data
 */
export async function canAccessUserData(
  currentUser: AuthenticatedUser, 
  targetUserId: string
): Promise<boolean> {
  // Users can always access their own data
  if (currentUser.id === targetUserId) {
    return true;
  }

  // Admin and HR can access any user's data
  if (currentUser.role === 'ADMIN' || currentUser.role === 'HR') {
    return true;
  }

  // Managers can access their team members' data
  if (currentUser.role === 'MANAGER' && currentUser.teamId) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { teamId: true }
    });
    
    if (targetUser?.teamId === currentUser.teamId) {
      return true;
    }
  }

  // Employees can only access their own data
  return false;
}

/**
 * Get users that the current user can access based on their role and team
 */
export async function getAccessibleUsers(currentUser: AuthenticatedUser): Promise<string[]> {
  // Admin and HR can access all users
  if (currentUser.role === 'ADMIN' || currentUser.role === 'HR') {
    const allUsers = await prisma.user.findMany({
      select: { id: true }
    });
    return allUsers.map(u => u.id);
  }

  // Managers can access their team members
  if (currentUser.role === 'MANAGER' && currentUser.teamId) {
    const teamMembers = await prisma.user.findMany({
      where: { teamId: currentUser.teamId },
      select: { id: true }
    });
    return teamMembers.map(u => u.id);
  }

  // Employees can only access their own data
  return [currentUser.id];
}

/**
 * Utility function to return JSON error response
 */
export function unauthorizedResponse(message: string = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 403 });
}