"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ApplicationFormDialog } from "@/components/application-form-dialog";
import { BellIcon, PlusIcon, SearchIcon, TableIcon } from "@/components/icons";
import {
  BTN_PRIMARY,
  EmptyState,
  INPUT,
  PageHeader,
  SourceBadge,
  StatusBadge,
} from "@/components/ui";
import {
  SOURCES,
  SOURCE_LABELS,
  STATUSES,
  STATUS_LABELS,
  type Source,
  type Status,
} from "@/lib/constants";
import { formatDate, formatSalaryRange } from "@/lib/format";
import type { ApplicationDTO } from "@/lib/types";

/** Filterable / sortable / searchable table view of all applications. */

type SortKey = "company" | "status" | "appliedAt" | "updatedAt" | "salary";
type SortDir = "asc" | "desc";

const SORT_LABELS: Record<SortKey, string> = {
  company: "Company",
  status: "Status",
  appliedAt: "Applied",
  updatedAt: "Updated",
  salary: "Salary",
};

const STATUS_ORDER: Record<Status, number> = {
  OFFER: 0,
  INTERVIEWING: 1,
  APPLIED: 2,
  SAVED: 3,
  REJECTED: 4,
  GHOSTED: 5,
};

function compare(a: ApplicationDTO, b: ApplicationDTO, key: SortKey): number {
  switch (key) {
    case "company":
      return a.company.localeCompare(b.company);
    case "status":
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    case "appliedAt":
      return (a.appliedAt ?? "").localeCompare(b.appliedAt ?? "");
    case "updatedAt":
      return a.updatedAt.localeCompare(b.updatedAt);
    case "salary":
      return (a.salaryMax ?? a.salaryMin ?? 0) - (b.salaryMax ?? b.salaryMin ?? 0);
  }
}

export function ApplicationsTable({ initialApplications }: { initialApplications: ApplicationDTO[] }) {
  const router = useRouter();
  const [apps, setApps] = useState(initialApplications);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "ALL">("ALL");
  const [source, setSource] = useState<Source | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dialogOpen, setDialogOpen] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = apps.filter((a) => {
      if (status !== "ALL" && a.status !== status) return false;
      if (source !== "ALL" && a.source !== source) return false;
      if (!q) return true;
      return (
        a.company.toLowerCase().includes(q) ||
        a.roleTitle.toLowerCase().includes(q) ||
        (a.location ?? "").toLowerCase().includes(q)
      );
    });
    const sorted = [...filtered].sort((a, b) => compare(a, b, sortKey));
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [apps, query, status, source, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "company" ? "asc" : "desc");
    }
  }

  const headerCell = (key: SortKey) => (
    <th scope="col" className="px-4 py-3 text-left">
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition hover:text-zinc-200 ${
          sortKey === key ? "text-indigo-300" : "text-zinc-500"
        }`}
      >
        {SORT_LABELS[key]}
        {sortKey === key ? <span aria-hidden>{sortDir === "asc" ? "↑" : "↓"}</span> : null}
      </button>
    </th>
  );

  return (
    <>
      <PageHeader
        title="Applications"
        description={`${apps.length} total · ${visible.length} shown`}
        action={
          <button type="button" onClick={() => setDialogOpen(true)} className={BTN_PRIMARY}>
            <PlusIcon width={15} height={15} /> New application
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            placeholder="Search company, role, location…"
            aria-label="Search applications"
            className={`${INPUT} pl-9`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter by status"
          className={`${INPUT} w-auto`}
          value={status}
          onChange={(e) => setStatus(e.target.value as Status | "ALL")}
        >
          <option value="ALL">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by source"
          className={`${INPUT} w-auto`}
          value={source}
          onChange={(e) => setSource(e.target.value as Source | "ALL")}
        >
          <option value="ALL">All sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {apps.length === 0 ? (
        <EmptyState
          icon={<TableIcon width={20} height={20} />}
          title="No applications yet"
          description="Everything you track will show up here with filtering and sorting."
          action={
            <button type="button" onClick={() => setDialogOpen(true)} className={BTN_PRIMARY}>
              <PlusIcon width={15} height={15} /> Add your first application
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<SearchIcon width={20} height={20} />}
          title="Nothing matches"
          description="Try a different search term or clear the status and source filters."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="border-b border-white/10 bg-zinc-900/80">
              <tr>
                {headerCell("company")}
                {headerCell("status")}
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Source
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Location
                </th>
                {headerCell("salary")}
                {headerCell("appliedAt")}
                {headerCell("updatedAt")}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visible.map((app) => (
                <tr key={app.id} className="bg-zinc-950/40 transition hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <Link href={`/applications/${app.id}`} className="group block">
                      <span className="flex items-center gap-2 font-medium text-zinc-200 group-hover:text-indigo-300">
                        {app.company}
                        {app.pendingReminders > 0 ? (
                          <BellIcon width={12} height={12} className="text-indigo-400" />
                        ) : null}
                      </span>
                      <span className="text-xs text-zinc-500">{app.roleTitle}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status} round={app.interviewRound} />
                  </td>
                  <td className="px-4 py-3">
                    <SourceBadge source={app.source} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{app.location ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {formatSalaryRange(app.salaryMin, app.salaryMax) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{formatDate(app.appliedAt)}</td>
                  <td className="px-4 py-3 text-zinc-400">{formatDate(app.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ApplicationFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={(app) => {
          setApps((prev) => [app, ...prev]);
          router.refresh();
        }}
      />
    </>
  );
}
