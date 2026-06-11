import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * API boundary helpers: typed errors, a consistent JSON error envelope, and
 * zod-validated body parsing. Every route handler wraps its logic with
 * try/catch + handleApiError so clients always receive
 * `{ error: { message, details? } }` with a proper status code.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonError(
  status: number,
  message: string,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    { error: { message, ...(details !== undefined ? { details } : {}) } },
    { status },
  );
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return jsonError(err.status, err.message, err.details);
  }
  console.error("[api] Unhandled error:", err);
  return jsonError(500, "Internal server error");
}

/** Parses and validates a JSON request body against a zod schema. */
export async function parseJson<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, "Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}
