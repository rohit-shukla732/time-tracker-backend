import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

// GET /api/hr/biometric/mappings - Biometric ID -> employee mappings (HR/ADMIN)
export async function GET(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const mappings = await prisma.biometricMapping.findMany({
      orderBy: { id: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ success: true, mappings });
  } catch (error) {
    console.error("Error fetching biometric mappings:", error);
    return NextResponse.json({ error: "Failed to fetch biometric mappings" }, { status: 500 });
  }
}

// POST /api/hr/biometric/mappings - Create a mapping (HR/ADMIN)
// Body: { externalId, userId }
export async function POST(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const body = await req.json();
    const externalId = String(body.externalId || "").trim().toUpperCase();
    const userId = String(body.userId || "").trim();

    if (!externalId || !userId) {
      return NextResponse.json({ error: "externalId and userId are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await prisma.biometricMapping.findUnique({ where: { id: externalId } });
    if (existing) {
      return NextResponse.json({ error: "A mapping with this external ID already exists" }, { status: 409 });
    }

    const mapping = await prisma.biometricMapping.create({
      data: { id: externalId, userId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ success: true, mapping }, { status: 201 });
  } catch (error) {
    console.error("Error creating biometric mapping:", error);
    return NextResponse.json({ error: "Failed to create biometric mapping" }, { status: 500 });
  }
}
