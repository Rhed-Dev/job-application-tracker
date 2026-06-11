import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toApplicationDTO } from "@/lib/serialize";
import { statusChangeSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Moves an application through the pipeline. Every transition is recorded as
 * a StatusEvent in the same transaction that updates the row, so the event
 * log can never drift from the current status.
 *
 * Special case: posting INTERVIEWING while already INTERVIEWING advances the
 * interview round (round 1 → 2 → 3 …).
 */
export async function POST(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { toStatus, note } = await parseJson(req, statusChangeSchema);

    const db = getDb();
    const app = await db.application.findFirst({ where: { id, userId: user.id } });
    if (!app) throw new ApiError(404, "Application not found");

    const advancingRound = toStatus === "INTERVIEWING" && app.status === "INTERVIEWING";
    if (toStatus === app.status && !advancingRound) {
      return NextResponse.json({ application: toApplicationDTO(app) });
    }

    const data: {
      status: typeof toStatus;
      appliedAt?: Date;
      interviewRound?: number;
    } = { status: toStatus };

    if (toStatus === "APPLIED" && !app.appliedAt) {
      data.appliedAt = new Date();
    }
    if (toStatus === "INTERVIEWING") {
      data.interviewRound = advancingRound
        ? app.interviewRound + 1
        : Math.max(app.interviewRound, 1);
    }

    const eventNote =
      note ??
      (advancingRound ? `Advanced to interview round ${app.interviewRound + 1}` : null);

    const [, updated] = await db.$transaction([
      db.statusEvent.create({
        data: {
          applicationId: app.id,
          fromStatus: app.status,
          toStatus,
          note: eventNote,
        },
      }),
      db.application.update({
        where: { id: app.id },
        data,
        include: {
          statusEvents: { orderBy: { at: "desc" }, take: 1 },
          reminders: { where: { sent: false } },
        },
      }),
    ]);

    return NextResponse.json({ application: toApplicationDTO(updated) });
  } catch (err) {
    return handleApiError(err);
  }
}
