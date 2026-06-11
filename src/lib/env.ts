/**
 * Environment access helpers.
 *
 * Nothing in this module reads env vars at import time — values are resolved
 * at the point of use so `next build` succeeds with no .env present, and
 * missing configuration produces a clear error at request time instead.
 */

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

/** Public base URL, used in OAuth redirect URIs and email links. */
export function getAppUrl(): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
