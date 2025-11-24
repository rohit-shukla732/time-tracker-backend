import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "../../../../lib/hash";
import { signAccessToken, signRefreshToken } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid)
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });

    const accessToken = signAccessToken({ id: user.id, email });
    const refreshToken = signRefreshToken({ id: user.id });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });

    return NextResponse.json({
      success: true,
      token: accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
