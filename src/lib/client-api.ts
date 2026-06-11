"use client";

/**
 * Minimal fetch wrapper for client components.
 *
 * If a request hits a 401 (expired access token), it transparently calls
 * POST /api/auth/refresh once — which rotates the refresh token and re-issues
 * cookies — then retries the original request.
 */

interface ErrorEnvelope {
  error?: { message?: string; details?: Record<string, string[]> };
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function rawRequest(path: string, init: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function parseResponse<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as (ErrorEnvelope & T) | null;
  if (!res.ok) {
    throw new ApiClientError(
      res.status,
      body?.error?.message ?? `Request failed with status ${res.status}`,
      body?.error?.details,
    );
  }
  return body as T;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await rawRequest(path, init);
  if (res.status === 401) {
    const refreshed = await fetch("/api/auth/refresh", { method: "POST" });
    if (refreshed.ok) {
      res = await rawRequest(path, init);
    }
  }
  return parseResponse<T>(res);
}
