import { NextRequest, NextResponse } from "next/server";
import { handleApiError, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toPublicUserDTO } from "@/lib/serialize";
import { profileUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    return NextResponse.json({ user: toPublicUserDTO(user) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { name } = await parseJson(req, profileUpdateSchema);
    const updated = await getDb().user.update({
      where: { id: user.id },
      data: { name },
    });
    return NextResponse.json({ user: toPublicUserDTO(updated) });
  } catch (err) {
    return handleApiError(err);
  }
}
