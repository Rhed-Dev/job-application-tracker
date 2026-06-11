import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ApiError, handleApiError, parseJson } from "@/lib/api";
import {
  applySessionCookies,
  issueSessionCookies,
  requireUser,
  revokeAllSessions,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { passwordChangeSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Changes the password, then revokes every existing refresh token and issues
 * a fresh session for this browser — any other device must log in again.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { currentPassword, newPassword } = await parseJson(req, passwordChangeSchema);

    if (!user.passwordHash) {
      throw new ApiError(400, "This account uses Google sign-in and has no password");
    }
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new ApiError(401, "Current password is incorrect");
    }

    const updated = await getDb().user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
    await revokeAllSessions(user.id);

    const res = NextResponse.json({ ok: true });
    applySessionCookies(res, await issueSessionCookies(updated));
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
