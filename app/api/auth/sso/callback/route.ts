import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import { signAccessToken, signRefreshToken } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { logger } from "../../../../../lib/logger";
import {
  SSO_PORTALS,
  SSO_PORTAL_COOKIE,
  SSO_STATE_COOKIE,
  SSO_VERIFIER_COOKIE,
  exchangeCodeForTokens,
  isSslRequest,
  resolveRedirectUri,
  validateIdToken,
  type SsoPortal,
} from "../../../../../lib/sso";

/** Parse a duration string like "7d", "30d", "2h", "90m" into milliseconds. */
function parseDurationMs(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d|w)$/i);
  if (!match) return 7 * 24 * 3600 * 1000; // default 7 days
  const value = parseInt(match[1], 10);
  switch (match[2].toLowerCase()) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 3600 * 1000;
    case 'd': return value * 24 * 3600 * 1000;
    case 'w': return value * 7 * 24 * 3600 * 1000;
    default: return 7 * 24 * 3600 * 1000;
  }
}

function clearSsoCookies(res: NextResponse, secure: boolean) {
  for (const name of [SSO_STATE_COOKIE, SSO_VERIFIER_COOKIE, SSO_PORTAL_COOKIE]) {
    res.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: 0,
      path: "/",
    });
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const secure = isSslRequest(req);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const stateCookie = req.cookies.get(SSO_STATE_COOKIE)?.value;
  const portalCookie = req.cookies.get(SSO_PORTAL_COOKIE)?.value;
  const portalDef = portalCookie ? SSO_PORTALS[portalCookie] : undefined;

  const failRedirect = (portal?: SsoPortal, error = "sso_error") => {
    const base = portal?.loginPath || "/helpdesk/employee/login";
    const res = NextResponse.redirect(new URL(`${base}?error=${encodeURIComponent(error)}`, req.url));
    clearSsoCookies(res, secure);
    return res;
  };

  try {
    if (oauthError) {
      logger.warn("GET /api/auth/sso/callback - OAuth error", { oauthError });
      return failRedirect(portalDef, "access_denied");
    }

    if (!code || !state) {
      logger.warn("GET /api/auth/sso/callback - Missing code or state");
      return failRedirect(portalDef);
    }

    if (!stateCookie || state !== stateCookie) {
      logger.warn("GET /api/auth/sso/callback - CSRF state mismatch");
      return failRedirect(portalDef);
    }

    const verifier = req.cookies.get(SSO_VERIFIER_COOKIE)?.value;
    if (!verifier) {
      logger.warn("GET /api/auth/sso/callback - Verifier cookie missing");
      return failRedirect(portalDef, "session_expired");
    }

    const redirectUri = resolveRedirectUri(req);
    const tokens = await exchangeCodeForTokens({ code, codeVerifier: verifier, redirectUri });
    const { email, name } = await validateIdToken(tokens.id_token);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      logger.warn("GET /api/auth/sso/callback - No account linked to email", { email });
      return failRedirect(portalDef, "no_account");
    }

    if (user.isArchived) {
      logger.warn("GET /api/auth/sso/callback - Account disabled", { userId: user.id });
      return failRedirect(portalDef, "account_disabled");
    }

    if (portalDef && portalDef.slug === "admin" && user.role !== "ADMIN") {
      logger.warn("GET /api/auth/sso/callback - Non-admin tried admin portal", { userId: user.id });
      return failRedirect(portalDef, "not_admin");
    }

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id, jti: crypto.randomUUID() });

    const refreshExpiresIn = process.env.REFRESH_EXPIRES_IN || "7d";
    const refreshExpiryMs = parseDurationMs(refreshExpiresIn);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + refreshExpiryMs),
      },
    });

    logger.info("GET /api/auth/sso/callback - SSO login successful", { userId: user.id, email: user.email, name });

    const destination = portalDef?.dashboardPath || "/helpdesk/employee/dashboard";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");

const target = new URL("/sso/return", `${proto}://${host}`);
    
    target.searchParams.set("accessToken", accessToken);
    target.searchParams.set("refreshToken", refreshToken);
    target.searchParams.set("destination", destination);
    target.searchParams.set(
      "user",
      JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role })
    );

    const res = NextResponse.redirect(target);
    clearSsoCookies(res, secure);

    logger.response("GET", "/api/auth/sso/callback", 302, Date.now() - startTime);
    return res;
  } catch (err) {
    const error = err as Error;
    logger.error("GET /api/auth/sso/callback - Failed", error);
    return failRedirect(portalDef);
  }
}