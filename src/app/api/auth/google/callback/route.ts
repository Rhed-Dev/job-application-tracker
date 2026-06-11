import { NextRequest, NextResponse } from "next/server";
import { applySessionCookies, issueSessionCookies } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  OAUTH_STATE_COOKIE,
  exchangeGoogleCode,
  fetchGoogleProfile,
  isGoogleConfigured,
} from "@/lib/oauth";

export const dynamic = "force-dynamic";

/**
 * Step 2 of the OAuth flow: Google redirects back with ?code & ?state.
 * Verify state against the cookie (CSRF), exchange the code server-side,
 * upsert the user + provider link, then issue first-party session cookies.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/login?error=${reason}`, req.url));
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  };

  if (!isGoogleConfigured()) return fail("google_not_configured");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !storedState || state !== storedState) {
    return fail("oauth_state");
  }

  try {
    const accessToken = await exchangeGoogleCode(code);
    const profile = await fetchGoogleProfile(accessToken);
    const db = getDb();

    const account = await db.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: profile.sub,
        },
      },
      include: { user: true },
    });

    let user = account?.user ?? null;
    if (!user) {
      // Link to an existing account by verified email, or create a new
      // OAuth-only user (passwordHash stays null).
      user = await db.user.findUnique({ where: { email: profile.email } });
      if (!user) {
        user = await db.user.create({
          data: { email: profile.email, name: profile.name },
        });
      }
      await db.account.create({
        data: { userId: user.id, provider: "google", providerAccountId: profile.sub },
      });
    }

    if (!user.active) return fail("deactivated");

    const res = NextResponse.redirect(new URL("/dashboard", req.url));
    res.cookies.delete(OAUTH_STATE_COOKIE);
    applySessionCookies(res, await issueSessionCookies(user));
    return res;
  } catch (err) {
    console.error("[auth] Google OAuth callback failed:", err);
    return fail("oauth_failed");
  }
}
