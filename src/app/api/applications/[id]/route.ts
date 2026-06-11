import { NextRequest, NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { ApiError, handleApiError, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toApplicationDTO } from "@/lib/serialize";
import { applicationUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** Ownership check — scoping every query by userId prevents IDOR. */
async function getOwnedApplicationId(user: User, id: string): Promise<string> {
  const app = await getDb().application.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!app) throw new ApiError(404, "Application not found");
  return app.id;
}

export async function GET(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const app = await getDb().application.findFirst({
      where: { id, userId: user.id },
      include: {
        statusEvents: { orderBy: { at: "asc" } },
        reminders: { orderBy: { remindAt: "asc" } },
      },
    });
    if (!app) throw new ApiError(404, "Application not found");
    return NextResponse.json({ application: toApplicationDTO(app) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await getOwnedApplicationId(user, id);
    const data = await parseJson(req, applicationUpdateSchema);
    const app = await getDb().application.update({
      where: { id },
      data,
      include: { statusEvents: true, reminders: true },
    });
    return NextResponse.json({ application: toApplicationDTO(app) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await getOwnedApplicationId(user, id);
    // StatusEvents and Reminders cascade at the database level.
    await getDb().application.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
