import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  // ✅ 1. Never touch APIs or Next internals
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/auth")
  ) {
    return NextResponse.next();
  }

  // ✅ 2. Ticketing subdomain → ticketing UI
  if (hostname.startsWith("ticketing.")) {
    if (!pathname.startsWith("/ticketing")) {
      return NextResponse.rewrite(
        new URL(`/ticketing${pathname}`, req.url)
      );
    }
  }

  // ✅ 3. EMS subdomain → time-tracker UI
  if (hostname.startsWith("ems.")) {
    if (!pathname.startsWith("/time-tracker")) {
      return NextResponse.rewrite(
        new URL(`/time-tracker${pathname}`, req.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Apply middleware to all paths EXCEPT:
     * - /api
     * - /_next
     * - /favicon.ico
     */
    "/((?!api|_next|favicon.ico).*)",
  ],
};
