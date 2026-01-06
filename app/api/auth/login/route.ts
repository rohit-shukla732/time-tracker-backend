import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "../../../../lib/hash";
import { signAccessToken, signRefreshToken } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { logger } from "../../../../lib/logger";

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3001',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { email, password } = await req.json();
    logger.info("POST /api/auth/login - Login attempt", { email });
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          },
        }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:3001',
            'Access-Control-Allow-Credentials': 'true',
          },
        }
      );
    }

    const accessToken = signAccessToken({ userId: user.id, email });
    const refreshToken = signRefreshToken({ userId: user.id });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });

    logger.info("POST /api/auth/login - Login successful", { userId: user.id, email: user.email });
    logger.response("POST", "/api/auth/login", 200, Date.now() - startTime);
    return NextResponse.json(
      {
        success: true,
        accessToken,
        token: accessToken, // Keep for backward compatibility
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, teamId: user.teamId },
      },
      {
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        },
      }
    );
  } catch (err) {
    const error = err as Error;
    logger.error("POST /api/auth/login - Failed", error);
    return NextResponse.json(
      { error: "Server error" },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3001',
          'Access-Control-Allow-Credentials': 'true',
        },
      }
    );
  }
}
