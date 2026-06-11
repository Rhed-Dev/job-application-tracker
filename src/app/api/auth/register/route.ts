import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ApiError, handleApiError, parseJson } from "@/lib/api";
import { applySessionCookies, issueSessionCookies } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toPublicUserDTO } from "@/lib/serialize";
import { registerSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { name, email, password } = await parseJson(req, registerSchema);
    const db = getDb();

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, "An account with this email already exists");
    }

    const user = await db.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 12) },
    });

    const res = NextResponse.json({ user: toPublicUserDTO(user) }, { status: 201 });
    applySessionCookies(res, await issueSessionCookies(user));
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
