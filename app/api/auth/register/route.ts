import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "../../../../lib/hash";
import { signAccessToken, signRefreshToken } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { logger } from "../../../../lib/logger";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { name, email, password } = await req.json();
    logger.info("POST /api/auth/register - Registration attempt", { email, name });

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate a unique user ID
    const userCount = await prisma.user.count();
    const userId = `ACE${String(userCount + 1000).padStart(3, '0')}`;

    // Create user
    const user = await prisma.user.create({
      data: {
        id: userId,
        name,
        email,
        passwordHash
      }
    });

    // Generate tokens
    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    logger.info("POST /api/auth/register - Registration successful", { userId: user.id, email: user.email });
    logger.response("POST", "/api/auth/register", 200, Date.now() - startTime);
    return NextResponse.json({
      success: true,
      user: { 
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    const err = error as Error;
    logger.error("POST /api/auth/register - Failed", err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
