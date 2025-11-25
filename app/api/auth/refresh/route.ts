import { NextResponse, NextRequest } from "next/server";
import { verifyRefreshToken, signAccessToken } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!stored)
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });

    try {
      const payload = verifyRefreshToken(refreshToken) as any;
      const newAccess = signAccessToken({ id: payload.id, email: payload.email });

      return NextResponse.json({ success: true, token: newAccess });
    } catch (e) {
      return NextResponse.json({ error: "Refresh expired" }, { status: 401 });
    }
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
