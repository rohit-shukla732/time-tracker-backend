import { NextRequest } from "next/server";
import * as crypto from "crypto";
import * as jose from "jose";

const TENANT = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;

export const SSO_SCOPE = "openid email profile offline_access";
export const SSO_STATE_COOKIE = "sso_state";
export const SSO_PORTAL_COOKIE = "sso_portal";
export const SSO_VERIFIER_COOKIE = "sso_verifier";
export const SSO_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export interface SsoPortal {
  slug: "employee" | "admin";
  loginPath: string;
  dashboardPath: string;
}

export const SSO_PORTALS: Record<string, SsoPortal> = {
  employee: { slug: "employee", loginPath: "/helpdesk/employee/login", dashboardPath: "/helpdesk/employee/dashboard" },
  admin: { slug: "admin", loginPath: "/helpdesk/admin/login", dashboardPath: "/helpdesk/admin" },
};

export function requireSsoConfig(): { tenant: string; clientId: string; clientSecret: string } {
  if (!TENANT || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Entra SSO not configured. Missing AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET."
    );
  }
  return { tenant: TENANT, clientId: CLIENT_ID, clientSecret: CLIENT_SECRET };
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64UrlEncode(crypto.randomBytes(32));
  const challenge = base64UrlEncode(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

/**
 * Resolve the exact redirect URI to use for this request. Only hosts listed in
 * ENTRA_REDIRECT_URIS are accepted; each entry must also be registered as a
 * Web redirect URI in the Microsoft Entra app registration.
 */
export function resolveRedirectUri(req: NextRequest): string {
  const allowed = (process.env.ENTRA_REDIRECT_URIS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const host = req.headers.get("host") || "";
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (req.nextUrl.protocol === "https:" ? "https" : "http");
  const candidate = `${proto}://${host}/api/auth/sso/callback`;

  if (!allowed.includes(candidate)) {
    throw new Error(`SSO redirect URI not allowed for ${candidate}. Add it to ENTRA_REDIRECT_URIS and the Entra app registration.`);
  }

  return candidate;
}

export function buildAuthorizeUrl(options: {
  state: string;
  codeChallenge: string;
  redirectUri: string;
  prompt?: string;
}): string {
  const { tenant, clientId } = requireSsoConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: options.redirectUri,
    response_mode: "query",
    scope: SSO_SCOPE,
    state: options.state,
    code_challenge: options.codeChallenge,
    code_challenge_method: "S256",
  });
  if (options.prompt) params.set("prompt", options.prompt);

  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
}

export interface SsoTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export async function exchangeCodeForTokens(options: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<SsoTokenResponse> {
  const { tenant, clientId, clientSecret } = requireSsoConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: SSO_SCOPE,
    code: options.code,
    redirect_uri: options.redirectUri,
    grant_type: "authorization_code",
    code_verifier: options.codeVerifier,
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await res.json().catch(() => ({}))) as SsoTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!res.ok) {
    throw new Error(
      `Entra token exchange failed (${res.status}): ${data.error_description || data.error || res.statusText}`
    );
  }

  return data;
}

export interface IdTokenClaims {
  aud?: string;
  iss?: string;
  exp?: number;
  oid?: string;
  tid?: string;
  name?: string;
  email?: string;
  preferred_username?: string;
}

const JWKS_CACHE_KEY = "__ace_ems_sso_jwks__";
const g = globalThis as Record<string, unknown>;
if (!g[JWKS_CACHE_KEY]) {
  const { tenant } = requireSsoConfig();
  g[JWKS_CACHE_KEY] = jose.createRemoteJWKSet(
    new URL(`https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`)
  );
}
const getJwks = () => g[JWKS_CACHE_KEY] as ReturnType<typeof jose.createRemoteJWKSet>;

/**
 * Verify an ID token from the Microsoft v2 token endpoint using the tenant's
 * JWKS, and extract the verified email claim.
 */
export async function validateIdToken(idToken: string): Promise<{ email: string; name?: string }> {
  const { tenant, clientId } = requireSsoConfig();

  const { payload } = await jose.jwtVerify(idToken, getJwks(), {
    audience: clientId,
    issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
    algorithms: ["RS256"],
  });

  const claims = payload as unknown as IdTokenClaims;
  const email = (claims.email || claims.preferred_username || "").toLowerCase();
  if (!email) {
    throw new Error("Entra ID token did not contain an email address.");
  }

  return { email, name: claims.name };
}

export function isSslRequest(req: NextRequest): boolean {
  return (
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:"
  );
}