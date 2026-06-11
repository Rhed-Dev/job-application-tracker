/**
 * Shared domain constants. This module is intentionally framework-free and
 * import-safe from both server and client components.
 */

export const STATUSES = [
  "SAVED",
  "APPLIED",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
  "GHOSTED",
] as const;

export type Status = (typeof STATUSES)[number];

export const SOURCES = [
  "LINKEDIN",
  "REFERRAL",
  "COMPANY_SITE",
  "JOB_BOARD",
  "RECRUITER",
  "OTHER",
] as const;

export type Source = (typeof SOURCES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  REJECTED: "Rejected",
  GHOSTED: "Ghosted",
};

export const SOURCE_LABELS: Record<Source, string> = {
  LINKEDIN: "LinkedIn",
  REFERRAL: "Referral",
  COMPANY_SITE: "Company site",
  JOB_BOARD: "Job board",
  RECRUITER: "Recruiter",
  OTHER: "Other",
};

/** Tailwind class fragments per status, used by badges and the kanban board. */
export const STATUS_STYLES: Record<
  Status,
  { badge: string; dot: string; column: string }
> = {
  SAVED: {
    badge: "border-slate-500/30 bg-slate-500/15 text-slate-300",
    dot: "bg-slate-400",
    column: "border-t-slate-500",
  },
  APPLIED: {
    badge: "border-sky-500/30 bg-sky-500/15 text-sky-300",
    dot: "bg-sky-400",
    column: "border-t-sky-500",
  },
  INTERVIEWING: {
    badge: "border-amber-500/30 bg-amber-500/15 text-amber-300",
    dot: "bg-amber-400",
    column: "border-t-amber-500",
  },
  OFFER: {
    badge: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
    dot: "bg-emerald-400",
    column: "border-t-emerald-500",
  },
  REJECTED: {
    badge: "border-rose-500/30 bg-rose-500/15 text-rose-300",
    dot: "bg-rose-400",
    column: "border-t-rose-500",
  },
  GHOSTED: {
    badge: "border-violet-500/30 bg-violet-500/15 text-violet-300",
    dot: "bg-violet-400",
    column: "border-t-violet-500",
  },
};

/** Concrete hex values for Recharts (SVG fills can't use Tailwind classes). */
export const STATUS_CHART_COLORS: Record<Status, string> = {
  SAVED: "#94a3b8",
  APPLIED: "#38bdf8",
  INTERVIEWING: "#fbbf24",
  OFFER: "#34d399",
  REJECTED: "#fb7185",
  GHOSTED: "#a78bfa",
};

export const ACCENT_COLOR = "#6366f1";
