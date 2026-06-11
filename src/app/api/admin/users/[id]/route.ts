import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson } from "@/lib/api";
import { requireRole, revokeAllSessions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { adminUserUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Admin-only: activate / deactivate a user. Deactivation also revokes every
 * refresh token, so the account is locked out as soon as its short-lived
 * access token expires (≤ 15 minutes) — and immediately for any request that
 * re-checks the database row via requireUser().
 */
export async function PATCH(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  try {
    const admin = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const { active } = await parseJson(req, adminUserUpdateSchema);

    if (id === admin.id && !active) {
      throw new ApiError(400, "You cannot deactivate your own account");
    }

    const db = getDb();
    const target = await db.user.findUnique({ where: { id } });
    if (!target) throw new ApiError(404, "User not found");

    const updated = await db.user.update({ where: { id }, data: { active } });
    if (!active) {
      await revokeAllSessions(id);
    }

    return NextResponse.json({
      user: { id: updated.id, email: updated.email, active: updated.active },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
