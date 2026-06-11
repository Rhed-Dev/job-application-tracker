import { getAppUrl, requireEnv } from "./env";

/**
 * Google OAuth 2.0 — standard authorization-code flow, implemented directly
 * against Google's endpoints (no auth library) to keep the moving parts
 * visible:
 *
 *   1. /api/auth/google           → redirect to Google with client_id, scope,
 *                                   redirect_uri and a random `state` (also
 *                                   stored in a short-lived httpOnly cookie).
 *   2. Google redirects back to   /api/auth/google/callback?code=…&state=…
 *   3. We check state === cookie (CSRF protection), then exchange the code
 *      for tokens server-side using the client secret.
 *   4. We fetch the OpenID userinfo, upsert User + Account, and issue our own
 *      first-party session cookies.
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export const OAUTH_STATE_COOKIE = "oauth_state";

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri(): string {
  return `${getAppUrl()}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
      redirect_uri: googleRedirectUri(),
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed with status ${res.status}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Google token exchange returned no access token");
  }
  return data.access_token;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google userinfo request failed with status ${res.status}`);
  }
  const data = (await res.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    email_verified?: boolean;
  };
  if (!data.sub || !data.email) {
    throw new Error("Google profile is missing required fields");
  }
  return {
    sub: data.sub,
    email: data.email.toLowerCase(),
    name: data.name ?? data.email.split("@")[0],
    emailVerified: Boolean(data.email_verified),
  };
}

/** Random URL-safe state value for CSRF protection. */
export function generateOauthState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
