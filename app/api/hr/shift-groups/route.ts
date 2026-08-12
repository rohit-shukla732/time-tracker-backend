import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// GET /api/hr/shift-groups - List shift groups (HR/ADMIN)
export async function GET(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const groups = await prisma.shiftGroup.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        isDefault: true,
        _count: { select: { users: true } },
      },
    });
    return NextResponse.json({ success: true, groups });
  } catch (error) {
    console.error("Error fetching shift groups:", error);
    return NextResponse.json({ error: "Failed to fetch shift groups" }, { status: 500 });
  }
}

// POST /api/hr/shift-groups - Create a shift group (HR/ADMIN)
export async function POST(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const startTime = String(body.startTime || "").trim();
    const endTime = String(body.endTime || "").trim();
    const isDefault = Boolean(body.isDefault);

    if (!name) {
      return NextResponse.json({ error: "Shift group name is required" }, { status: 400 });
    }
    if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
      return NextResponse.json(
        { error: "Shift times must be in HH:MM 24-hour format (e.g. 09:00)" },
        { status: 400 }
      );
    }
    if (startTime === endTime) {
      return NextResponse.json(
        { error: "Shift start and end must be different times" },
        { status: 400 }
      );
    }
    // NOTE: startTime > endTime is allowed — it means an overnight shift
    // that starts in the evening and ends the next day (e.g. 17:30 -> 02:30).

    const existing = await prisma.shiftGroup.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "A shift group with this name already exists" }, { status: 409 });
    }

    const group = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.shiftGroup.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      }
      return tx.shiftGroup.create({ data: { name, startTime, endTime, isDefault } });
    });

    return NextResponse.json({ success: true, group }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating shift group:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "A shift group with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || "Failed to create shift group" }, { status: 500 });
  }
}
