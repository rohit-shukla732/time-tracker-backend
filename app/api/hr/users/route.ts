import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash";
import type { Role } from "@prisma/client";

const MANAGER_ROLES: Role[] = ["ADMIN", "SENIOR_MANAGER", "MANAGER", "HR"];
const VALID_ROLES: Role[] = ["ADMIN", "SENIOR_MANAGER", "MANAGER", "HR", "EMPLOYEE"];

// GET /api/hr/users - Employees for manager assignment (HR/ADMIN)
// Params: search, page, limit
export async function GET(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "25"), 1), 500);
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";

    const where: any = { isArchived: false };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { id: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          managerId: true,
          createdAt: true,
          manager: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const managers = await prisma.user.findMany({
      where: { role: { in: MANAGER_ROLES }, isArchived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    });

    return NextResponse.json({
      success: true,
      users,
      managers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/hr/users - Create an employee (HR/ADMIN)
export async function POST(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const body = await req.json();
    const { id, name, email, role, managerId, password, isProbation, shiftGroupId } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const emailNormalized = String(email).toLowerCase().trim();
    const roleNormalized: Role = VALID_ROLES.includes(role as Role) ? role : "EMPLOYEE";

    const existing = await prisma.user.findUnique({ where: { email: emailNormalized } });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    let userId = id ? String(id).trim().toUpperCase() : "";
    if (userId && (await prisma.user.findUnique({ where: { id: userId } }))) {
      return NextResponse.json({ error: "A user with this ID already exists" }, { status: 409 });
    }

    if (!userId) {
      const last = await prisma.user.findMany({ select: { id: true } });
      const maxNum = last
        .map((u) => u.id.match(/^ACE(\d+)$/i)?.[1])
        .filter(Boolean)
        .map((n) => parseInt(n!, 10))
        .reduce((a, b) => Math.max(a, b), 0);
      let n = maxNum + 1;
      userId = `ACE${String(n).padStart(3, "0")}`;
      while (await prisma.user.findUnique({ where: { id: userId } })) {
        n++;
        userId = `ACE${String(n).padStart(3, "0")}`;
      }
    }

    if (managerId) {
      const manager = await prisma.user.findFirst({
        where: { id: managerId, role: { in: MANAGER_ROLES }, isArchived: false },
        select: { id: true },
      });
      if (!manager) {
        return NextResponse.json({ error: "Selected manager is invalid" }, { status: 400 });
      }
    }

    let shiftGroupIdFinal: string | null = null;
    if (shiftGroupId) {
      const group = await prisma.shiftGroup.findUnique({
        where: { id: String(shiftGroupId) },
        select: { id: true },
      });
      if (!group) {
        return NextResponse.json({ error: "Selected shift group is invalid" }, { status: 400 });
      }
      shiftGroupIdFinal = group.id;
    }

    const passwordHash = await hashPassword(password ? String(password).trim() : userId);

    const user = await prisma.user.create({
      data: {
        id: userId,
        name: String(name).trim(),
        email: emailNormalized,
        role: roleNormalized,
        managerId: managerId || null,
        shiftGroupId: shiftGroupIdFinal,
        isProbation: isProbation !== undefined ? Boolean(isProbation) : false,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        managerId: true,
        shiftGroupId: true,
        isProbation: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating user:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "A user with this ID or email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || "Failed to create user" }, { status: 500 });
  }
}
