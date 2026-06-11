import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { removeReminderJob } from "@/lib/queue";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    // Ownership is checked through the application relation.
    const reminder = await getDb().reminder.findFirst({
      where: { id, application: { userId: user.id } },
    });
    if (!reminder) throw new ApiError(404, "Reminder not found");

    if (reminder.jobId && !reminder.sent) {
      await removeReminderJob(reminder.jobId);
    }
    await getDb().reminder.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
