import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

const CATEGORIES = ["PRESENT", "LEAVE", "HOLIDAY", "WEEKEND", "OTHER"];

// GET /api/hr/attendance/types - List attendance types (all or only active)
export async function GET(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  try {
    const types = await prisma.attendanceType.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ success: true, types });
  } catch (error) {
    console.error("Error fetching attendance types:", error);
    return NextResponse.json({ error: "Failed to fetch attendance types" }, { status: 500 });
  }
}

// POST /api/hr/attendance/types - Create a new attendance type
export async function POST(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const body = await req.json();
    const { name, code, description, category, color, isPaid, isWorking, sortOrder } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "name and code are required" }, { status: 400 });
    }
    if (category && !CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    const type = await prisma.attendanceType.create({
      data: {
        name: String(name).trim(),
        code: String(code).trim().toUpperCase(),
        description: description ? String(description).trim() : null,
        category: category || "OTHER",
        color: color || "#10b981",
        isPaid: isPaid !== undefined ? Boolean(isPaid) : true,
        isWorking: isWorking !== undefined ? Boolean(isWorking) : false,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
        isSystem: false,
      },
    });

    return NextResponse.json({ success: true, type }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A type with this name or code already exists" },
        { status: 409 }
      );
    }
    console.error("Error creating attendance type:", error);
    return NextResponse.json({ error: "Failed to create attendance type" }, { status: 500 });
  }
}
