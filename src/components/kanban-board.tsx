"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { ApplicationFormDialog } from "@/components/application-form-dialog";
import { BellIcon, ColumnsIcon, PlusIcon } from "@/components/icons";
import { BTN_PRIMARY, EmptyState, PageHeader } from "@/components/ui";
import {
  STATUSES,
  STATUS_LABELS,
  STATUS_STYLES,
  type Status,
} from "@/lib/constants";
import { ApiClientError, api } from "@/lib/client-api";
import { daysSince, formatDaysCompact, formatSalaryRange } from "@/lib/format";
import type { ApplicationDTO } from "@/lib/types";

/**
 * Drag-and-drop pipeline board. Hand-rolled HTML5 DnD (no library): cards set
 * the application id on the drag event; columns accept drops and optimistically
 * move the card while POSTing the status change — rolling back on failure.
 */

interface Props {
  initialApplications: ApplicationDTO[];
}

function KanbanCard({
  app,
  onDragStart,
}: {
  app: ApplicationDTO;
  onDragStart: (e: DragEvent<HTMLDivElement>, id: string) => void;
}) {
  const salary = formatSalaryRange(app.salaryMin, app.salaryMax);
  const inStage = app.lastStatusAt ? daysSince(app.lastStatusAt) : null;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, app.id)}
      className="group cursor-grab rounded-lg border border-white/5 bg-zinc-900 p-3 transition hover:border-indigo-400/30 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/applications/${app.id}`}
          draggable={false}
          className="min-w-0 text-sm font-medium text-zinc-200 transition group-hover:text-indigo-300"
        >
          {app.company}
        </Link>
        {app.pendingReminders > 0 ? (
          <span
            title={`${app.pendingReminders} pending reminder${app.pendingReminders > 1 ? "s" : ""}`}
            className="flex shrink-0 items-center gap-1 rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[11px] text-indigo-300"
          >
            <BellIcon width={11} height={11} />
            {app.pendingReminders}
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 truncate text-xs text-zinc-500">{app.roleTitle}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
        {inStage !== null ? (
          <span className="rounded-md bg-white/5 px-1.5 py-0.5">
            {formatDaysCompact(inStage)} in stage
          </span>
        ) : null}
        {app.status === "INTERVIEWING" && app.interviewRound > 0 ? (
          <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-amber-300">
            Round {app.interviewRound}
          </span>
        ) : null}
        {salary ? (
          <span className="rounded-md bg-white/5 px-1.5 py-0.5">{salary}</span>
        ) : null}
      </div>
    </div>
  );
}

export function KanbanBoard({ initialApplications }: Props) {
  const router = useRouter();
  const [apps, setApps] = useState<ApplicationDTO[]>(initialApplications);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragOver, setDragOver] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const draggedId = useRef<string | null>(null);

  function onDragStart(e: DragEvent<HTMLDivElement>, id: string) {
    draggedId.current = id;
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }

  async function onDrop(toStatus: Status) {
    setDragOver(null);
    const id = draggedId.current;
    draggedId.current = null;
    const current = apps.find((a) => a.id === id);
    if (!id || !current || current.status === toStatus) return;

    // Optimistic move; the server response (with the new lastStatusAt and
    // interview round) replaces it, and failures roll back.
    const snapshot = apps;
    setError(null);
    setApps((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: toStatus, lastStatusAt: new Date().toISOString() }
          : a,
      ),
    );
    try {
      const res = await api<{ application: ApplicationDTO }>(
        `/api/applications/${id}/status`,
        { method: "POST", body: JSON.stringify({ toStatus }) },
      );
      setApps((prev) => prev.map((a) => (a.id === id ? res.application : a)));
      router.refresh();
    } catch (err) {
      setApps(snapshot);
      setError(
        err instanceof ApiClientError ? err.message : "Could not move the application",
      );
    }
  }

  const byStatus = (status: Status) =>
    apps
      .filter((a) => a.status === status)
      .sort((a, b) => (b.lastStatusAt ?? "").localeCompare(a.lastStatusAt ?? ""));

  return (
    <>
      <PageHeader
        title="Pipeline"
        description={`${apps.length} application${apps.length === 1 ? "" : "s"} · drag cards to update their stage`}
        action={
          <button type="button" onClick={() => setDialogOpen(true)} className={BTN_PRIMARY}>
            <PlusIcon width={15} height={15} /> New application
          </button>
        }
      />

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
        >
          {error}
        </p>
      ) : null}

      {apps.length === 0 ? (
        <EmptyState
          icon={<ColumnsIcon width={20} height={20} />}
          title="Your pipeline is empty"
          description="Add the first role you're interested in — you can drag it through the stages as things progress."
          action={
            <button type="button" onClick={() => setDialogOpen(true)} className={BTN_PRIMARY}>
              <PlusIcon width={15} height={15} /> Add your first application
            </button>
          }
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((status) => {
            const cards = byStatus(status);
            return (
              <div
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOver(status);
                }}
                onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  void onDrop(status);
                }}
                className={`flex w-64 shrink-0 flex-col rounded-xl border border-t-2 bg-zinc-950/60 ${STATUS_STYLES[status].column} ${
                  dragOver === status
                    ? "border-indigo-400/40 bg-indigo-500/5"
                    : "border-white/5"
                }`}
              >
                <div className="flex items-center justify-between px-3 pb-2 pt-3">
                  <span className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                    <span className={`size-1.5 rounded-full ${STATUS_STYLES[status].dot}`} />
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-zinc-500">
                    {cards.length}
                  </span>
                </div>
                <div className="flex min-h-28 flex-col gap-2 px-3 pb-3">
                  {cards.map((app) => (
                    <KanbanCard key={app.id} app={app} onDragStart={onDragStart} />
                  ))}
                  {cards.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-white/5 py-6 text-xs text-zinc-600">
                      Drop here
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
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
