import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { logger } from "../../../../lib/logger";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "");

    if (!auth) {
      logger.warn("POST /api/auth/logout - No token provided");
      return NextResponse.json({ error: "No token" }, { status: 401 });
    }

    await prisma.refreshToken.deleteMany({
      where: { token: auth },
    });

    logger.info("POST /api/auth/logout - Logout successful");
    logger.response("POST", "/api/auth/logout", 200, Date.now() - startTime);
    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error;
    logger.error("POST /api/auth/logout - Failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
