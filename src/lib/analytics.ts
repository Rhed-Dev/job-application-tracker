import type { Source, Status } from "./constants";

/**
 * Pure analytics computations over the StatusEvent log.
 *
 * Because every status transition is recorded as an immutable event, all of
 * these metrics can be derived without extra tracking columns — the event log
 * is the single source of truth (event sourcing-lite). All functions are
 * side-effect free and covered by unit tests.
 */

export interface EventLike {
  toStatus: Status;
  at: Date;
}

/**
 * Funnel position implied by a status. Terminal-negative outcomes
 * (REJECTED/GHOSTED) don't advance the funnel.
 */
const STAGE_RANK: Record<Status, number> = {
  SAVED: 0,
  APPLIED: 1,
  INTERVIEWING: 2,
  OFFER: 3,
  REJECTED: -1,
  GHOSTED: -1,
};

/**
 * Furthest funnel stage an application ever reached. Reaching OFFER implies
 * having "passed through" APPLIED and INTERVIEWING even if a stage was
 * skipped when dragging a card.
 */
export function reachedRank(events: { toStatus: Status }[]): number {
  return events.reduce((max, e) => Math.max(max, STAGE_RANK[e.toStatus]), 0);
}

export interface FunnelStats {
  applied: number;
  interviewing: number;
  offer: number;
  /** interviewing / applied */
  interviewRate: number;
  /** offer / interviewing */
  offerRate: number;
  /** offer / applied */
  overallRate: number;
}

export function computeFunnel(eventsByApp: { toStatus: Status }[][]): FunnelStats {
  let applied = 0;
  let interviewing = 0;
  let offer = 0;
  for (const events of eventsByApp) {
    const rank = reachedRank(events);
    if (rank >= 1) applied += 1;
    if (rank >= 2) interviewing += 1;
    if (rank >= 3) offer += 1;
  }
  const ratio = (a: number, b: number) => (b === 0 ? 0 : a / b);
  return {
    applied,
    interviewing,
    offer,
    interviewRate: ratio(interviewing, applied),
    offerRate: ratio(offer, interviewing),
    overallRate: ratio(offer, applied),
  };
}

/**
 * Total days spent in each status for one application. A stage lasts from its
 * event until the next event (or `now` for the current stage). Revisited
 * stages (e.g. multiple interview loops) accumulate.
 */
export function daysInStage(
  events: EventLike[],
  now: Date = new Date(),
): Partial<Record<Status, number>> {
  const sorted = [...events].sort((a, b) => a.at.getTime() - b.at.getTime());
  const result: Partial<Record<Status, number>> = {};
  for (let i = 0; i < sorted.length; i++) {
    const end = i + 1 < sorted.length ? sorted[i + 1].at : now;
    const ms = Math.max(0, end.getTime() - sorted[i].at.getTime());
    const status = sorted[i].toStatus;
    result[status] = (result[status] ?? 0) + ms / 86_400_000;
  }
  return result;
}

/** Average days-in-stage across applications that visited each stage. */
export function averageDaysInStage(
  perApplication: Partial<Record<Status, number>>[],
): { status: Status; avgDays: number; samples: number }[] {
  const totals = new Map<Status, { sum: number; n: number }>();
  for (const stages of perApplication) {
    for (const [status, days] of Object.entries(stages) as [Status, number][]) {
      const entry = totals.get(status) ?? { sum: 0, n: 0 };
      entry.sum += days;
      entry.n += 1;
      totals.set(status, entry);
    }
  }
  return Array.from(totals.entries()).map(([status, { sum, n }]) => ({
    status,
    avgDays: sum / n,
    samples: n,
  }));
}

/** Monday 00:00 (local) of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const offset = (x.getDay() + 6) % 7; // Mon=0 … Sun=6
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - offset);
  return x;
}

function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Buckets dates into the trailing `weeks` calendar weeks ending in the week
 * of `now`. Dates outside the window are ignored.
 */
export function weeklyCounts(
  dates: Date[],
  weeks = 12,
  now: Date = new Date(),
): { weekStart: string; count: number }[] {
  const currentWeek = startOfWeek(now);
  const buckets: { weekStart: string; count: number }[] = [];
  const index = new Map<string, number>();
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = new Date(currentWeek);
    ws.setDate(ws.getDate() - 7 * i);
    const key = toIsoDate(ws);
    index.set(key, buckets.length);
    buckets.push({ weekStart: key, count: 0 });
  }
  for (const date of dates) {
    const key = toIsoDate(startOfWeek(date));
    const i = index.get(key);
    if (i !== undefined) buckets[i].count += 1;
  }
  return buckets;
}

/** Statuses that count as "the employer responded". A rejection is a response. */
const RESPONSE_STATUSES: ReadonlySet<Status> = new Set([
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
]);

export interface SourceStats {
  source: Source;
  total: number;
  responded: number;
  rate: number;
}

/**
 * Response rate per application source. "Responded" means the application
 * ever transitioned to INTERVIEWING, OFFER, or REJECTED — i.e. a human on the
 * other side reacted. GHOSTED and stale APPLIED rows count against the rate.
 */
export function computeSourceStats(
  apps: { source: Source; events: { toStatus: Status }[] }[],
): SourceStats[] {
  const map = new Map<Source, { total: number; responded: number }>();
  for (const app of apps) {
    const entry = map.get(app.source) ?? { total: 0, responded: 0 };
    entry.total += 1;
    if (app.events.some((e) => RESPONSE_STATUSES.has(e.toStatus))) {
      entry.responded += 1;
    }
    map.set(app.source, entry);
  }
  return Array.from(map.entries())
    .map(([source, { total, responded }]) => ({
      source,
      total,
      responded,
      rate: total === 0 ? 0 : responded / total,
    }))
    .sort((a, b) => b.total - a.total);
}
