import { NextResponse } from "next/server";
import { verifyAccessToken } from "./auth";

export function requireAuth(req: Request) {
  const header = req.headers.get("Authorization");
  if (!header)
    return { error: "Missing token", user: null };

  try {
    const token = header.replace("Bearer ", "");
    const user = verifyAccessToken(token);
    return { user };
  } catch (err) {
    return { error: "Invalid token", user: null };
  }
}
