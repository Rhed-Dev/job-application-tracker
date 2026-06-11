import { NextRequest, NextResponse } from "next/server";
import { isProduction } from "@/lib/env";
import {
  OAUTH_STATE_COOKIE,
  buildGoogleAuthUrl,
  generateOauthState,
  isGoogleConfigured,
} from "@/lib/oauth";

export const dynamic = "force-dynamic";

/** Step 1 of the OAuth flow: send the user to Google's consent screen. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", req.url));
  }
  const state = generateOauthState();
  const res = NextResponse.redirect(buildGoogleAuthUrl(state));
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: 600,
  });
  return res;
}
