import { NextRequest, NextResponse } from "next/server";
import { requireRoles, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash";
import type { Role } from "@prisma/client";

const VALID_ROLES: Role[] = ["ADMIN", "SENIOR_MANAGER", "MANAGER", "HR", "EMPLOYEE"];

// GET /api/admin/users - Get all users with search, filter and pagination (Admin/HR only)
export async function GET(req: NextRequest) {
  const authResult = await requireRoles(req, ["ADMIN", "HR"]);

  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const archived = searchParams.get('archived'); // 'true' | 'false' | null (all)
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role && VALID_ROLES.includes(role as Role)) {
      where.role = role;
    }

    if (archived === 'true') {
      where.isArchived = true;
    } else if (archived === 'false') {
      where.isArchived = false;
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              createdTickets: true,
              assignedTickets: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      users,
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

// POST /api/admin/users - Create a new user (Admin only)
export async function POST(req: NextRequest) {
  const authResult = await requireRoles(req, ["ADMIN"]);

  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const body = await req.json();
    const { id, name, email, role, password } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const emailNormalized = String(email).toLowerCase().trim();
    const roleNormalized: Role = VALID_ROLES.includes(role as Role) ? role : "EMPLOYEE";

    // Email must be unique
    const existing = await prisma.user.findUnique({ where: { email: emailNormalized } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Auto-generate an ACE-style employee code if none provided
    let userId = id ? String(id).trim() : "";
    if (!userId) {
      const last = await prisma.user.findMany({
        select: { id: true },
      });
      const maxNum = last
        .map((u) => u.id.match(/^ACE(\d+)$/i)?.[1])
        .filter(Boolean)
        .map((n) => parseInt(n!, 10))
        .reduce((a, b) => Math.max(a, b), 0);
      userId = `ACE${String(maxNum + 1).padStart(3, '0')}`;

      // Guard against a duplicate code
      const clash = await prisma.user.findUnique({ where: { id: userId } });
      if (clash) {
        let n = maxNum + 1;
        do {
          userId = `ACE${String(n).padStart(3, '0')}`;
          n++;
        } while (await prisma.user.findUnique({ where: { id: userId } }));
      }
    }

    const passwordHash = await hashPassword(password || userId);

    const user = await prisma.user.create({
      data: {
        id: userId,
        name,
        email: emailNormalized,
        role: roleNormalized,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isArchived: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating user:", error);
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: "A user with this ID or email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
