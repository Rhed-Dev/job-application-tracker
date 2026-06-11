import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ApiError, handleApiError, parseJson } from "@/lib/api";
import { applySessionCookies, issueSessionCookies } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toPublicUserDTO } from "@/lib/serialize";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { email, password } = await parseJson(req, loginSchema);
    const user = await getDb().user.findUnique({ where: { email } });

    // Identical error for unknown email, OAuth-only account, and wrong
    // password — no account enumeration.
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ApiError(401, "Invalid email or password");
    }
    if (!user.active) {
      throw new ApiError(403, "This account has been deactivated");
    }

    const res = NextResponse.json({ user: toPublicUserDTO(user) });
    applySessionCookies(res, await issueSessionCookies(user));
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
