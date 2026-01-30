import * as jwt from "jsonwebtoken";
import { verifyAccessToken } from "./auth";

export type AuthResult =
  | { user: jwt.JwtPayload | string; error?: never; expired?: never; decoded?: never }
  | { user: null; error: string; expired: boolean; decoded: jwt.JwtPayload | null };

export function requireAuth(req: Request): AuthResult {
  const header = req.headers.get("Authorization");
  if (!header)
    return { user: null, error: "Missing token", expired: false, decoded: null };

  const token = header.replace("Bearer ", "");

  try {
    const user = verifyAccessToken(token);
    return { user };
  } catch (err: unknown) {
    const isExpired =
      err instanceof jwt.TokenExpiredError ||
      (err instanceof Error && err.name === "TokenExpiredError");

    // Decode without verification so we can read the userId for logging/fallback
    let decoded: jwt.JwtPayload | null = null;
    try {
      const raw = jwt.decode(token);
      if (raw && typeof raw === "object") decoded = raw as jwt.JwtPayload;
    } catch {
      // ignore decode failure
    }

    return {
      user: null,
      error: isExpired ? "Token expired" : "Invalid token",
      expired: isExpired,
      decoded,
    };
  }
}
