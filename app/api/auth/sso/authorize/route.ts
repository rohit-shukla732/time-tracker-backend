import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import { logger } from "../../../../../lib/logger";
import { rateLimit } from "../../../../../lib/rateLimit";
import {
  SSO_COOKIE_MAX_AGE_SECONDS,
  SSO_PORTAL_COOKIE,
  SSO_PORTALS,
  SSO_STATE_COOKIE,
  SSO_VERIFIER_COOKIE,
  buildAuthorizeUrl,
  generatePkcePair,
  isSslRequest,
  resolveRedirectUri,
} from "../../../../../lib/sso";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  const rl = rateLimit(req);
  if (rl) return rl;

  try {
    const { portal: rawPortal } = (await req.json().catch(() => ({}))) as { portal?: string };
    const portal = rawPortal ?? "";
    const portalDef = SSO_PORTALS[portal];
    if (!portalDef) {
      return NextResponse.json({ error: "Invalid portal" }, { status: 400 });
    }

    const redirectUri = resolveRedirectUri(req);
    const state = crypto.randomUUID();
    const { verifier, challenge } = generatePkcePair();
    const url = buildAuthorizeUrl({ state, codeChallenge: challenge, redirectUri });

    const secure = isSslRequest(req);
    const res = NextResponse.json({ url });
    res.cookies.set(SSO_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: SSO_COOKIE_MAX_AGE_SECONDS,
      path: "/",
    });
    res.cookies.set(SSO_VERIFIER_COOKIE, verifier, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: SSO_COOKIE_MAX_AGE_SECONDS,
      path: "/",
    });
    res.cookies.set(SSO_PORTAL_COOKIE, portal, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: SSO_COOKIE_MAX_AGE_SECONDS,
      path: "/",
    });

    logger.info("POST /api/auth/sso/authorize - SSO authorization URL generated", { portal });
    logger.response("POST", "/api/auth/sso/authorize", 200, Date.now() - startTime);
    return res;
  } catch (err) {
    const error = err as Error;
    logger.error("POST /api/auth/sso/authorize - Failed", error);
    return NextResponse.json({ error: "Failed to start sign in" }, { status: 500 });
  }
}