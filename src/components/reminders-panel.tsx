"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BellIcon, TrashIcon } from "@/components/icons";
import { BTN_PRIMARY, Card, CardHeader, INPUT, LABEL } from "@/components/ui";
import { ApiClientError, api } from "@/lib/client-api";
import { computeRemindAt } from "@/lib/reminder-math";
import { formatDate } from "@/lib/format";
import type { ReminderDTO } from "@/lib/types";

/**
 * Follow-up reminders for one application. Quick presets compute the date with
 * the same pure helper the API uses; a custom date can be picked instead.
 */

const PRESETS = [
  { label: "In 3 days", days: 3 },
  { label: "In 5 days", days: 5 },
  { label: "In 1 week", days: 7 },
  { label: "In 2 weeks", days: 14 },
];

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RemindersPanel({
  applicationId,
  reminders,
}: {
  applicationId: string;
  reminders: ReminderDTO[];
}) {
  const router = useRouter();
  const [remindAt, setRemindAt] = useState(() =>
    toDatetimeLocal(computeRemindAt(new Date(), 5)),
  );
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const upcoming = reminders.filter((r) => !r.sent);
  const sent = reminders.filter((r) => r.sent);

  function applyPreset(days: number) {
    setRemindAt(toDatetimeLocal(computeRemindAt(new Date(), days)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setInfo(null);
    try {
      const res = await api<{ queued: boolean }>(
        `/api/applications/${applicationId}/reminders`,
        {
          method: "POST",
          body: JSON.stringify({
            remindAt: new Date(remindAt).toISOString(),
            note: note.trim() || null,
          }),
        },
      );
      if (!res.queued) {
        setInfo(
          "Reminder saved. The queue is unreachable right now — the worker will schedule it on its next start.",
        );
      }
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save reminder");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    setError(null);
    try {
      await api(`/api/reminders/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not delete reminder");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader title="Follow-up reminders" />
      <div className="space-y-4 p-5">
        {upcoming.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-zinc-500">
            <BellIcon className="text-zinc-600" />
            No reminders scheduled — set one so this application doesn&apos;t go quiet.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-indigo-400/20 bg-indigo-500/5 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    {formatDate(r.remindAt)}
                  </p>
                  {r.note ? <p className="mt-0.5 text-xs text-zinc-500">{r.note}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => void remove(r.id)}
                  disabled={deleting === r.id}
                  aria-label="Delete reminder"
                  className="rounded-md p-1.5 text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                >
                  <TrashIcon width={14} height={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {sent.length > 0 ? (
          <details className="text-sm text-zinc-500">
            <summary className="cursor-pointer text-xs text-zinc-600 transition hover:text-zinc-400">
              {sent.length} sent reminder{sent.length > 1 ? "s" : ""}
            </summary>
            <ul className="mt-2 space-y-1.5">
              {sent.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-xs">
                  <span>{r.note ?? "Follow-up reminder"}</span>
                  <span className="text-zinc-600">sent {formatDate(r.sentAt)}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-3 border-t border-white/5 pt-4">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => applyPreset(p.days)}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-400 transition hover:border-indigo-400/40 hover:text-indigo-300"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="remindAt" className={LABEL}>
              Remind me on
            </label>
            <input
              id="remindAt"
              type="datetime-local"
              required
              className={INPUT}
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="reminder-note" className={LABEL}>
              Note (lands in the email)
            </label>
            <input
              id="reminder-note"
              className={INPUT}
              maxLength={500}
              placeholder="e.g. Ask about next steps"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-rose-400">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              {info}
            </p>
          ) : null}
          <button type="submit" disabled={pending} className={`${BTN_PRIMARY} w-full`}>
            <BellIcon width={14} height={14} />
            {pending ? "Scheduling…" : "Schedule reminder"}
          </button>
        </form>
      </div>
    </Card>
  );
}
