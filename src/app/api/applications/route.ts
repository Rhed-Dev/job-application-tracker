import { NextRequest, NextResponse } from "next/server";
import { handleApiError, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toApplicationDTO } from "@/lib/serialize";
import { applicationCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const apps = await getDb().application.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        statusEvents: { orderBy: { at: "desc" }, take: 1 },
        reminders: { where: { sent: false } },
      },
    });
    return NextResponse.json({ applications: apps.map(toApplicationDTO) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const data = await parseJson(req, applicationCreateSchema);

    // The initial StatusEvent (fromStatus: null) anchors the timeline and
    // every analytics computation for this application.
    const app = await getDb().application.create({
      data: {
        userId: user.id,
        company: data.company,
        roleTitle: data.roleTitle,
        location: data.location,
        source: data.source,
        url: data.url,
        notes: data.notes,
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        status: data.status,
        interviewRound: data.status === "INTERVIEWING" ? 1 : 0,
        appliedAt: data.status === "SAVED" ? null : new Date(),
        statusEvents: {
          create: { fromStatus: null, toStatus: data.status, note: "Application created" },
        },
      },
      include: { statusEvents: true },
    });

    return NextResponse.json({ application: toApplicationDTO(app) }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
