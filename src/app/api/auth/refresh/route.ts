import { NextRequest, NextResponse } from "next/server";
import { handleApiError, jsonError } from "@/lib/api";
import {
  REFRESH_COOKIE,
  applySessionCookies,
  clearSessionCookies,
  rotateSession,
} from "@/lib/auth";
import { toPublicUserDTO } from "@/lib/serialize";

export const dynamic = "force-dynamic";

/** Only allow same-origin relative paths as redirect targets. */
function sanitizeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}

/**
 * GET — browser flow. The middleware redirects here when the access token has
 * expired but a refresh cookie exists; on success we rotate and bounce back
 * to the originally requested page.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const next = sanitizeNext(req.nextUrl.searchParams.get("next"));
  const presented = req.cookies.get(REFRESH_COOKIE)?.value;

  const fail = () => {
    const res = NextResponse.redirect(new URL("/login?error=session_expired", req.url));
    clearSessionCookies(res); // prevents a redirect loop via middleware
    return res;
  };

  if (!presented) return fail();
  try {
    const rotated = await rotateSession(presented);
    if (!rotated) return fail();
    const res = NextResponse.redirect(new URL(next, req.url));
    applySessionCookies(res, rotated.session);
    return res;
  } catch (err) {
    console.error("[auth] Refresh (GET) failed:", err);
    return fail();
  }
}

/** POST — programmatic flow used by the client fetch wrapper on 401s. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const presented = req.cookies.get(REFRESH_COOKIE)?.value;
    if (!presented) {
      return jsonError(401, "No refresh token");
    }
    const rotated = await rotateSession(presented);
    if (!rotated) {
      const res = jsonError(401, "Refresh token is invalid or expired");
      clearSessionCookies(res);
      return res;
    }
    const res = NextResponse.json({ user: toPublicUserDTO(rotated.user) });
    applySessionCookies(res, rotated.session);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
