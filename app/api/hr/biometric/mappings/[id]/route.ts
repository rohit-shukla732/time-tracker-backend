import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

// DELETE /api/hr/biometric/mappings/[id] - Remove a mapping (HR/ADMIN)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id } = await params;

  try {
    await prisma.biometricMapping.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
    }
    console.error("Error deleting biometric mapping:", error);
    return NextResponse.json({ error: "Failed to delete biometric mapping" }, { status: 500 });
  }
}
