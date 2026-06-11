import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationActions } from "@/components/application-actions";
import { ArrowLeftIcon, ClockIcon, ExternalLinkIcon } from "@/components/icons";
import { RemindersPanel } from "@/components/reminders-panel";
import { StatusControls } from "@/components/status-controls";
import { Card, CardHeader, SourceBadge, StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { formatDate, formatDays, formatSalaryRange } from "@/lib/format";
import {
  toApplicationDTO,
  toReminderDTO,
  toStatusEventDTO,
} from "@/lib/serialize";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Application" };

type PageProps = { params: Promise<{ id: string }> };

export default async function ApplicationDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;

  const app = await getDb().application.findFirst({
    where: { id, userId: user.id },
    include: {
      statusEvents: { orderBy: { at: "desc" } },
      reminders: { orderBy: { remindAt: "asc" } },
    },
  });
  if (!app) notFound();

  const dto = toApplicationDTO(app);
  const events = app.statusEvents.map(toStatusEventDTO);
  const reminders = app.reminders.map(toReminderDTO);

  const details: { label: string; value: React.ReactNode }[] = [
    { label: "Source", value: <SourceBadge source={dto.source} /> },
    { label: "Location", value: dto.location ?? "—" },
    {
      label: "Salary range",
      value: formatSalaryRange(dto.salaryMin, dto.salaryMax) ?? "—",
    },
    { label: "Applied", value: formatDate(dto.appliedAt) },
    { label: "Added", value: formatDate(dto.createdAt) },
    {
      label: "Posting",
      value: dto.url ? (
        <a
          href={dto.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-indigo-400 transition hover:text-indigo-300"
        >
          Open <ExternalLinkIcon width={13} height={13} />
        </a>
      ) : (
        "—"
      ),
    },
  ];

  return (
    <div>
      <Link
        href="/applications"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-200"
      >
        <ArrowLeftIcon width={14} height={14} /> All applications
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            {dto.company}
          </h1>
          <p className="mt-1 text-zinc-400">{dto.roleTitle}</p>
          <div className="mt-3">
            <StatusBadge status={dto.status} round={dto.interviewRound} />
          </div>
        </div>
        <ApplicationActions application={dto} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Details" />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3">
              {details.map((d) => (
                <div key={d.label}>
                  <dt className="text-xs font-medium text-zinc-500">{d.label}</dt>
                  <dd className="mt-1 text-sm text-zinc-200">{d.value}</dd>
                </div>
              ))}
            </dl>
            {dto.notes ? (
              <div className="border-t border-white/5 p-5">
                <p className="mb-1.5 text-xs font-medium text-zinc-500">Notes</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                  {dto.notes}
                </p>
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader title="Status timeline" />
            <div className="p-5">
              <ol className="relative space-y-5 border-l border-white/10 pl-5">
                {events.map((event, i) => {
                  const next = i === 0 ? null : events[i - 1];
                  const stageEnd = next ? new Date(next.at) : new Date();
                  const stageDays =
                    (stageEnd.getTime() - new Date(event.at).getTime()) / 86_400_000;
                  return (
                    <li key={event.id} className="relative">
                      <span
                        className={`absolute -left-[26.5px] top-1 size-3 rounded-full border-2 border-zinc-950 ${STATUS_STYLES[event.toStatus].dot}`}
                        aria-hidden
                      />
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-sm font-medium text-zinc-200">
                          {event.fromStatus
                            ? `${STATUS_LABELS[event.fromStatus]} → ${STATUS_LABELS[event.toStatus]}`
                            : `Created as ${STATUS_LABELS[event.toStatus]}`}
                        </span>
                        <span className="text-xs text-zinc-500">{formatDate(event.at)}</span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-zinc-500">
                          <ClockIcon width={11} height={11} />
                          {i === 0
                            ? `${formatDays(stageDays)} and counting`
                            : `${formatDays(stageDays)} in stage`}
                        </span>
                      </div>
                      {event.note ? (
                        <p className="mt-1 text-sm text-zinc-500">{event.note}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <StatusControls application={dto} />
          <RemindersPanel applicationId={dto.id} reminders={reminders} />
        </div>
      </div>
    </div>
  );
}
