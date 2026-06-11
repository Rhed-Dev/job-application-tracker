import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { clearSessionCookies, requireUser, revokeAllSessions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Revokes every refresh token for the current user ("sign out everywhere"). */
export async function POST(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    await revokeAllSessions(user.id);
    const res = NextResponse.json({ ok: true });
    clearSessionCookies(res);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
