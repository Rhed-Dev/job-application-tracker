import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { enqueueReminder } from "@/lib/queue";
import { toReminderDTO } from "@/lib/serialize";
import { reminderCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Creates a follow-up reminder and schedules its delayed BullMQ job.
 *
 * The DB row is the source of truth: if Redis is briefly unavailable the
 * reminder is still saved (queued: false) and the worker's startup recovery
 * sweep schedules it later — reminders are never silently dropped.
 */
export async function POST(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { remindAt, note } = await parseJson(req, reminderCreateSchema);

    const db = getDb();
    const app = await db.application.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!app) throw new ApiError(404, "Application not found");

    const reminder = await db.reminder.create({
      data: { applicationId: app.id, remindAt, note },
    });

    const jobId = await enqueueReminder(reminder.id, remindAt);
    const saved = jobId
      ? await db.reminder.update({ where: { id: reminder.id }, data: { jobId } })
      : reminder;

    return NextResponse.json(
      { reminder: toReminderDTO(saved), queued: jobId !== null },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
