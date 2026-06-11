import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { REFRESH_COOKIE, clearSessionCookies, revokeRefreshToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
    if (refresh && process.env.DATABASE_URL) {
      await revokeRefreshToken(refresh).catch(() => undefined);
    }
    const res = NextResponse.json({ ok: true });
    clearSessionCookies(res);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
