import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";

/**
 * Edge middleware guarding the authenticated area.
 *
 * - No valid access token but a refresh cookie → bounce through
 *   /api/auth/refresh (which rotates the token and redirects back).
 * - No tokens at all → /login?next=…
 * - /admin/* additionally requires the ADMIN role claim. This is a UX-level
 *   gate; the API boundary re-enforces roles via requireRole() so the
 *   middleware is never the only line of defense.
 */

const AUTH_PAGES = ["/login", "/register"];

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const secret = process.env.JWT_SECRET;
  const accessToken = req.cookies.get("access_token")?.value;
  const claims =
    accessToken && secret ? await verifyAccessToken(accessToken, secret) : null;

  // Already signed in → keep auth pages out of the way.
  if (AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    if (claims) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (!claims) {
    if (req.cookies.get("refresh_token")?.value) {
      const refreshUrl = new URL("/api/auth/refresh", req.url);
      refreshUrl.searchParams.set("next", pathname + req.nextUrl.search);
      return NextResponse.redirect(refreshUrl);
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && claims.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/applications/:path*",
    "/analytics/:path*",
    "/admin/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
