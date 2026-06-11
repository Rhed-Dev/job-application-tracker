import { describe, expect, it } from "vitest";
import {
  generateRefreshToken,
  hashToken,
  signAccessToken,
  verifyAccessToken,
  type AccessTokenClaims,
} from "@/lib/jwt";

const SECRET = "test-secret-at-least-32-characters-long!";
const CLAIMS: AccessTokenClaims = {
  sub: "user_123",
  email: "ada@example.com",
  name: "Ada Lovelace",
  role: "USER",
};

describe("access tokens", () => {
  it("round-trips claims through sign + verify", async () => {
    const token = await signAccessToken(CLAIMS, SECRET);
    const verified = await verifyAccessToken(token, SECRET);
    expect(verified).toEqual(CLAIMS);
  });

  it("preserves the ADMIN role claim", async () => {
    const token = await signAccessToken({ ...CLAIMS, role: "ADMIN" }, SECRET);
    const verified = await verifyAccessToken(token, SECRET);
    expect(verified?.role).toBe("ADMIN");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signAccessToken(CLAIMS, SECRET);
    expect(await verifyAccessToken(token, "another-secret-entirely-here!")).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signAccessToken(CLAIMS, SECRET, -10);
    expect(await verifyAccessToken(token, SECRET)).toBeNull();
  });

  it("rejects a tampered payload", async () => {
    const token = await signAccessToken(CLAIMS, SECRET);
    const [header, payload, signature] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    decoded.role = "ADMIN"; // privilege escalation attempt
    const forged = [
      header,
      Buffer.from(JSON.stringify(decoded)).toString("base64url"),
      signature,
    ].join(".");
    expect(await verifyAccessToken(forged, SECRET)).toBeNull();
  });

  it("rejects garbage input", async () => {
    expect(await verifyAccessToken("not-a-jwt", SECRET)).toBeNull();
    expect(await verifyAccessToken("", SECRET)).toBeNull();
  });
});

describe("refresh token primitives", () => {
  it("generates 96-char hex tokens (384 bits of entropy)", () => {
    const token = generateRefreshToken();
    expect(token).toMatch(/^[0-9a-f]{96}$/);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, generateRefreshToken));
    expect(tokens.size).toBe(100);
  });

  it("hashes tokens with SHA-256 (known vector)", async () => {
    expect(await hashToken("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("is deterministic so the stored hash can be looked up", async () => {
    const token = generateRefreshToken();
    expect(await hashToken(token)).toBe(await hashToken(token));
  });
});
