import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
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

  // ✅ 2. Ticketing subdomain → helpdesk UI
  if (hostname.startsWith("ticketing")) {
    if (!pathname.startsWith("/helpdesk")) {
      return NextResponse.rewrite(
        new URL(`/helpdesk${pathname}`, req.url)
      );
    }
  }

  // ✅ 3. HR subdomain → HR UI
  if (hostname.startsWith("hr")) {
    if (pathname === "/") {
      return NextResponse.rewrite(
        new URL("/hr/employee", req.url)
      );
    }
    if (!pathname.startsWith("/hr")) {
      return NextResponse.rewrite(
        new URL(`/hr${pathname}`, req.url)
      );
    }
  }

  if(pathname.startsWith("/ticketing")) {
    const url = req.nextUrl.clone();
    url.pathname = '/helpdesk/employee/login';

    return NextResponse.redirect(url);
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
