import type { Metadata } from "next";
import Link from "next/link";
import {
  FunnelChart,
  SourceResponseChart,
  StageDurationChart,
  WeeklyApplicationsChart,
} from "@/components/analytics-charts";
import { ChartIcon } from "@/components/icons";
import { BTN_PRIMARY, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import {
  averageDaysInStage,
  computeFunnel,
  computeSourceStats,
  daysInStage,
  weeklyCounts,
} from "@/lib/analytics";
import { requireUser } from "@/lib/auth";
import { STATUSES } from "@/lib/constants";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Analytics" };

/**
 * All metrics are derived server-side from the StatusEvent log — the kanban
 * board writes events, this page folds them into funnels and durations.
 */
export default async function AnalyticsPage() {
  const user = await requireUser();
  const apps = await getDb().application.findMany({
    where: { userId: user.id },
    include: { statusEvents: { orderBy: { at: "asc" } } },
  });

  if (apps.length === 0) {
    return (
      <>
        <PageHeader title="Analytics" description="Funnel and response metrics for your search" />
        <EmptyState
          icon={<ChartIcon width={20} height={20} />}
          title="No data to chart yet"
          description="Add applications and move them through the pipeline — every status change feeds these charts."
          action={
            <Link href="/dashboard" className={BTN_PRIMARY}>
              Go to the pipeline
            </Link>
          }
        />
      </>
    );
  }

  const eventsByApp = apps.map((a) => a.statusEvents);
  const funnel = computeFunnel(eventsByApp);
  const weekly = weeklyCounts(apps.map((a) => a.appliedAt ?? a.createdAt));
  const sources = computeSourceStats(
    apps.map((a) => ({ source: a.source, events: a.statusEvents })),
  );
  const stageOrder = new Map(STATUSES.map((s, i) => [s, i] as const));
  const stages = averageDaysInStage(eventsByApp.map((events) => daysInStage(events)))
    .sort((a, b) => (stageOrder.get(a.status) ?? 0) - (stageOrder.get(b.status) ?? 0));

  const totalResponded = sources.reduce((sum, s) => sum + s.responded, 0);
  const totalWithOutcome = sources.reduce((sum, s) => sum + s.total, 0);
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  const stats = [
    { label: "Applications tracked", value: String(apps.length) },
    {
      label: "Response rate",
      value: totalWithOutcome === 0 ? "—" : pct(totalResponded / totalWithOutcome),
    },
    { label: "Interview rate", value: funnel.applied === 0 ? "—" : pct(funnel.interviewRate) },
    { label: "Offer rate", value: funnel.applied === 0 ? "—" : pct(funnel.overallRate) },
  ];

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Computed from your status history — every drag of a card is a data point"
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="px-5 py-4">
            <p className="text-xs font-medium text-zinc-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-100">
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Applications per week" />
          <div className="p-4">
            <WeeklyApplicationsChart data={weekly} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Conversion funnel" />
          <div className="p-4">
            <FunnelChart funnel={funnel} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Response rate by source" />
          <div className="p-4">
            <SourceResponseChart sources={sources} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Average days in stage" />
          <div className="p-4">
            <StageDurationChart stages={stages} />
          </div>
        </Card>
      </div>
      <p className="mt-4 text-xs text-zinc-600">
        “Responded” counts any transition to Interviewing, Offer, or Rejected — a rejection
        is still a response. Open stages accrue time until today.
      </p>
    </>
  );
}
