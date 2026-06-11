import { SignJWT, jwtVerify } from "jose";

/**
 * Token primitives. Edge-safe: uses only `jose` and the Web Crypto API so the
 * same code runs in Next.js middleware (edge runtime), route handlers, the
 * BullMQ worker, and Vitest. Secrets are passed in as arguments — this module
 * never reads process.env, which keeps it pure and trivially testable.
 */

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 15; // 15 minutes
export const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export interface AccessTokenClaims {
  sub: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
}

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signAccessToken(
  claims: AccessTokenClaims,
  secret: string,
  ttlSeconds: number = ACCESS_TOKEN_TTL_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    email: claims.email,
    name: claims.name,
    role: claims.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(encoder.encode(secret));
}

/** Returns the verified claims, or null for any invalid/expired/tampered token. */
export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret));
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      (payload.role !== "USER" && payload.role !== "ADMIN")
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

/** 384 bits of CSPRNG entropy, hex-encoded (96 chars). Opaque — not a JWT. */
export function generateRefreshToken(): string {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/** SHA-256 hex digest. Only the hash of a refresh token is ever stored. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return toHex(new Uint8Array(digest));
}

export type RefreshTokenState = "valid" | "expired" | "reused";

export interface RefreshTokenRecordLike {
  expiresAt: Date;
  revokedAt: Date | null;
}

/**
 * Pure rotation decision. A token that was already revoked (i.e. already
 * rotated once) being presented again signals theft/replay — callers must
 * revoke the entire session family. Reuse takes precedence over expiry.
 */
export function evaluateRefreshToken(
  record: RefreshTokenRecordLike,
  now: Date = new Date(),
): RefreshTokenState {
  if (record.revokedAt !== null) return "reused";
  if (record.expiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}
