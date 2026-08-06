import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash";

// POST /api/admin/users/[id]/reset-password - Reset a user's password (Admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id: userId } = await params;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Temporary password = user's employee code (same convention as the seed)
    const tempPassword = user.id;
    const passwordHash = await hashPassword(tempPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate any existing refresh tokens so other sessions must re-login
    await prisma.refreshToken.deleteMany({ where: { userId } });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
      temporaryPassword: tempPassword,
    });
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}
