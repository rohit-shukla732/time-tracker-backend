import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "");

  if (!auth)
    return NextResponse.json({ error: "No token" }, { status: 401 });

  await prisma.refreshToken.deleteMany({
    where: { token: auth },
  });

  return NextResponse.json({ success: true });
}
