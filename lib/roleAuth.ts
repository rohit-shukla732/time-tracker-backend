import { NextResponse } from "next/server";
import { verifyAccessToken } from "./auth";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";
import { rateLimit, RateLimitTier } from "./rateLimit";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: Role;
  departmentId?: string;
  managedDepartmentIds?: string[]; // for SENIOR_MANAGER
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error?: string;
}

/**
 * Basic authentication - extracts user from JWT token.
 * `tier` controls the rate-limit applied to this request:
 *  - "default"    → 10 req / 60 s per IP per route  (everyone)
 *  - "privileged" → 200 req / 60 s per IP per route (ADMIN / HR)
 */
export async function requireAuth(
  req: Request,
  tier: RateLimitTier = "default"
): Promise<AuthResult> {
  // Rate-limit by IP + route before touching the database
  const rl = rateLimit(req, tier);
  if (rl) return { user: null, error: "Too Many Requests" };

  const header = req.headers.get("Authorization");
  if (!header) {
    return { user: null, error: "Missing token" };
  }

  try {
    const token = header.replace("Bearer ", "");
    const payload = verifyAccessToken(token) as { userId: string };

    // Get full user info including role and department from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        employmentInfo: {
          include: {
            department: true
          }
        },
        seniorManagerOf: {
          select: { departmentId: true }
        }
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
        departmentId: user.employmentInfo?.departmentId || undefined,
        managedDepartmentIds: user.role === 'SENIOR_MANAGER'
          ? user.seniorManagerOf.map((s: { departmentId: string }) => s.departmentId)
          : undefined
      }
    };
  } catch {
    return { user: null, error: "Invalid token" };
  }
}

/**
 * Role-based authentication - requires specific roles.
 * Automatically uses the "privileged" tier for ADMIN and HR.
 */
export async function requireRoles(req: Request, allowedRoles: Role[]): Promise<AuthResult> {
  // ADMIN and HR get a higher rate-limit allowance
  const tier: RateLimitTier =
    allowedRoles.some((r) => r === "ADMIN" || r === "HR") ? "privileged" : "default";

  const authResult = await requireAuth(req, tier);
  
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
  return requireRoles(req, ['ADMIN', 'MANAGER', 'SENIOR_MANAGER']);
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

  // Managers can access their department members' data
  if (currentUser.role === 'MANAGER' && currentUser.departmentId) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { employmentInfo: true }
    });
    
    if (targetUser?.employmentInfo?.departmentId === currentUser.departmentId) {
      return true;
    }
  }

  // Senior managers can access members across all their assigned departments
  if (currentUser.role === 'SENIOR_MANAGER' && currentUser.managedDepartmentIds?.length) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { employmentInfo: true }
    });
    if (targetUser?.employmentInfo?.departmentId &&
        currentUser.managedDepartmentIds.includes(targetUser.employmentInfo.departmentId)) {
      return true;
    }
  }

  // Employees can only access their own data
  return false;
}

/**
 * Get users that the current user can access based on their role and department
 */
export async function getAccessibleUsers(currentUser: AuthenticatedUser): Promise<string[]> {
  // Admin and HR can access all users
  if (currentUser.role === 'ADMIN' || currentUser.role === 'HR') {
    const allUsers = await prisma.user.findMany({
      select: { id: true }
    });
    return allUsers.map((u: { id: string }) => u.id);
  }

  // Managers can access their department members
  if (currentUser.role === 'MANAGER' && currentUser.departmentId) {
    const deptMembers = await prisma.employmentInfo.findMany({
      where: { departmentId: currentUser.departmentId },
      select: { userId: true }
    });
    return deptMembers.map((e: { userId: string }) => e.userId);
  }

  // Senior managers can access members across all their assigned departments
  if (currentUser.role === 'SENIOR_MANAGER' && currentUser.managedDepartmentIds?.length) {
    const deptMembers = await prisma.employmentInfo.findMany({
      where: { departmentId: { in: currentUser.managedDepartmentIds } },
      select: { userId: true }
    });
    return deptMembers.map((e: { userId: string }) => e.userId);
  }

  // Employees can only access their own data
  return [currentUser.id];
}

/**
 * Utility function to return JSON error response.
 * Automatically returns 429 when the message is "Too Many Requests".
 */
export function unauthorizedResponse(message: string = "Unauthorized") {
  const status = message === "Too Many Requests" ? 429 : 403;
  return NextResponse.json({ error: message }, { status });
}