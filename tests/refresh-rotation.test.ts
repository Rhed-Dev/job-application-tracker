import { describe, expect, it } from "vitest";
import { REFRESH_TOKEN_TTL_MS, evaluateRefreshToken } from "@/lib/jwt";

const NOW = new Date("2026-06-12T12:00:00Z");

function record(overrides: Partial<{ expiresAt: Date; revokedAt: Date | null }> = {}) {
  return {
    expiresAt: new Date(NOW.getTime() + REFRESH_TOKEN_TTL_MS),
    revokedAt: null,
    ...overrides,
  };
}

describe("refresh-token rotation decision", () => {
  it("accepts a live, unrevoked token", () => {
    expect(evaluateRefreshToken(record(), NOW)).toBe("valid");
  });

  it("flags an already-rotated token as reuse (replay detection)", () => {
    const revoked = record({ revokedAt: new Date(NOW.getTime() - 60_000) });
    expect(evaluateRefreshToken(revoked, NOW)).toBe("reused");
  });

  it("treats reuse with higher priority than expiry", () => {
    // A token that is both revoked AND expired must still trigger the
    // reuse path so the whole session family gets revoked.
    const both = record({
      revokedAt: new Date(NOW.getTime() - 120_000),
      expiresAt: new Date(NOW.getTime() - 60_000),
    });
    expect(evaluateRefreshToken(both, NOW)).toBe("reused");
  });

  it("rejects an expired token", () => {
    const expired = record({ expiresAt: new Date(NOW.getTime() - 1) });
    expect(evaluateRefreshToken(expired, NOW)).toBe("expired");
  });

  it("treats expiry as exclusive at the boundary instant", () => {
    const boundary = record({ expiresAt: NOW });
    expect(evaluateRefreshToken(boundary, NOW)).toBe("expired");
  });

  it("accepts a token expiring one millisecond from now", () => {
    const fresh = record({ expiresAt: new Date(NOW.getTime() + 1) });
    expect(evaluateRefreshToken(fresh, NOW)).toBe("valid");
  });

  it("uses a 30-day refresh TTL", () => {
    expect(REFRESH_TOKEN_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
