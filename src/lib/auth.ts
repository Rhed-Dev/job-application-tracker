import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { ApiError } from "./api";
import { getDb } from "./db";
import { isProduction, requireEnv } from "./env";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_MS,
  evaluateRefreshToken,
  generateRefreshToken,
  hashToken,
  signAccessToken,
  verifyAccessToken,
} from "./jwt";

/**
 * Session management: short-lived JWT access token + rotating opaque refresh
 * token, both in httpOnly cookies. Refresh tokens are stored hashed; reuse of
 * a rotated token revokes the whole session family.
 */

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

interface CookieOptions {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
}

function cookieOptions(maxAgeSeconds: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export interface SessionCookies {
  access: string;
  refresh: string;
}

/** Signs a new access token and persists a new (hashed) refresh token row. */
export async function issueSessionCookies(user: User): Promise<SessionCookies> {
  const secret = requireEnv("JWT_SECRET");
  const access = await signAccessToken(
    { sub: user.id, email: user.email, name: user.name, role: user.role },
    secret,
  );
  const refresh = generateRefreshToken();
  await getDb().refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: await hashToken(refresh),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return { access, refresh };
}

export function applySessionCookies(res: NextResponse, session: SessionCookies): void {
  res.cookies.set(ACCESS_COOKIE, session.access, cookieOptions(ACCESS_TOKEN_TTL_SECONDS));
  res.cookies.set(REFRESH_COOKIE, session.refresh, cookieOptions(REFRESH_TOKEN_TTL_MS / 1000));
}

export function clearSessionCookies(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
}

/**
 * Refresh-token rotation. Returns a fresh session for a valid token, or null.
 *
 * Reuse detection: if the presented token exists but was already revoked,
 * someone is replaying an old token (the legitimate client holds the newer
 * one) — revoke every active token for that user as a precaution.
 */
export async function rotateSession(
  presentedToken: string,
): Promise<{ user: User; session: SessionCookies } | null> {
  const db = getDb();
  const record = await db.refreshToken.findUnique({
    where: { tokenHash: await hashToken(presentedToken) },
    include: { user: true },
  });
  if (!record) return null;

  const state = evaluateRefreshToken(record);
  if (state === "reused") {
    await db.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return null;
  }
  if (state === "expired" || !record.user.active) return null;

  const session = await issueSessionCookies(record.user);
  const replacement = await db.refreshToken.findUnique({
    where: { tokenHash: await hashToken(session.refresh) },
  });
  await db.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date(), replacedById: replacement?.id ?? null },
  });
  return { user: record.user, session };
}

export async function revokeRefreshToken(presentedToken: string): Promise<void> {
  await getDb().refreshToken.updateMany({
    where: { tokenHash: await hashToken(presentedToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await getDb().refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Resolves the authenticated user from the access-token cookie, re-checking
 * the database row so deactivated users are cut off even with a valid JWT.
 */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return null;
  const claims = await verifyAccessToken(token, secret);
  if (!claims) return null;
  const user = await getDb().user.findUnique({ where: { id: claims.sub } });
  if (!user || !user.active) return null;
  return user;
}

/** API-boundary guard: 401 when unauthenticated. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Authentication required");
  return user;
}

/** API-boundary guard: 401 when unauthenticated, 403 when the role is wrong. */
export async function requireRole(role: "ADMIN" | "USER"): Promise<User> {
  const user = await requireUser();
  if (role === "ADMIN" && user.role !== "ADMIN") {
    throw new ApiError(403, "Admin access required");
  }
  return user;
}
