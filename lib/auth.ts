import * as jwt from "jsonwebtoken";

export function signAccessToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, process.env.JWT_SECRET as jwt.Secret, {
    expiresIn: process.env.TOKEN_EXPIRES_IN || "15m",
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, process.env.REFRESH_SECRET as jwt.Secret, {
    expiresIn: process.env.REFRESH_EXPIRES_IN || "7d",
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET as jwt.Secret);
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, process.env.REFRESH_SECRET as jwt.Secret);
}
