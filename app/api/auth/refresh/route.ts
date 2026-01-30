import { NextResponse, NextRequest } from "next/server";
import { verifyRefreshToken, signAccessToken } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { logger } from "../../../../lib/logger";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { refreshToken } = await req.json();
    logger.info("POST /api/auth/refresh - Token refresh attempt");

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!stored)
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });

    // Check DB-level expiry
    if (stored.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { token: refreshToken } }).catch(() => {});
      return NextResponse.json({ error: "Refresh token expired" }, { status: 401 });
    }

    try {
      const payload = verifyRefreshToken(refreshToken) as any;
      const newAccess = signAccessToken({ userId: payload.userId, email: payload.email });

      logger.info("POST /api/auth/refresh - Token refreshed successfully");
      logger.response("POST", "/api/auth/refresh", 200, Date.now() - startTime);
      return NextResponse.json({ success: true, token: newAccess });
    } catch (e) {
      logger.warn("POST /api/auth/refresh - Token expired");
      return NextResponse.json({ error: "Refresh expired" }, { status: 401 });
    }
  } catch (err) {
    const error = err as Error;
    logger.error("POST /api/auth/refresh - Failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
