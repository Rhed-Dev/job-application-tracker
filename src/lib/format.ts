/** Pure formatting helpers, safe in both server and client components. */

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const DATE_SHORT_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return DATE_FMT.format(new Date(iso));
}

export function formatDateShort(iso: string): string {
  return DATE_SHORT_FMT.format(new Date(iso));
}

/** "yyyy-mm-dd" → "Mar 4" without timezone surprises. */
export function formatIsoWeekLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return DATE_SHORT_FMT.format(new Date(y, m - 1, d));
}

export function formatSalaryRange(
  min: number | null,
  max: number | null,
): string | null {
  const k = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min !== null && max !== null) return `${k(min)}–${k(max)}`;
  if (min !== null) return `${k(min)}+`;
  if (max !== null) return `up to ${k(max)}`;
  return null;
}

export function daysSince(iso: string, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));
}

/** Compact duration for card badges: "today", "3d", "2w". */
export function formatDaysCompact(days: number): string {
  if (days < 1) return "today";
  if (days < 14) return `${Math.floor(days)}d`;
  return `${Math.floor(days / 7)}w`;
}

export function formatDays(days: number): string {
  const rounded = Math.round(days * 10) / 10;
  return `${rounded} ${rounded === 1 ? "day" : "days"}`;
}
