"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardHeader, INPUT } from "@/components/ui";
import {
  STATUSES,
  STATUS_LABELS,
  STATUS_STYLES,
  type Status,
} from "@/lib/constants";
import { ApiClientError, api } from "@/lib/client-api";
import type { ApplicationDTO } from "@/lib/types";

/**
 * Stage switcher on the detail page. Each change posts to the status endpoint
 * (which appends a StatusEvent); re-selecting INTERVIEWING advances the round.
 */
export function StatusControls({ application }: { application: ApplicationDTO }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function move(toStatus: Status) {
    setPending(toStatus);
    setError(null);
    try {
      await api(`/api/applications/${application.id}/status`, {
        method: "POST",
        body: JSON.stringify({ toStatus, note: note.trim() || null }),
      });
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update status");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader title="Move stage" />
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => {
            const isCurrent = status === application.status;
            const advanceRound = isCurrent && status === "INTERVIEWING";
            const disabled = (isCurrent && !advanceRound) || pending !== null;
            return (
              <button
                key={status}
                type="button"
                disabled={disabled}
                onClick={() => void move(status)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed ${
                  isCurrent
                    ? `${STATUS_STYLES[status].badge} ${advanceRound ? "hover:brightness-125" : "opacity-100"}`
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/25 hover:text-zinc-100"
                }`}
              >
                <span className={`size-1.5 rounded-full ${STATUS_STYLES[status].dot}`} />
                {pending === status
                  ? "Saving…"
                  : advanceRound
                    ? `Round ${application.interviewRound + 1} →`
                    : STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>
        <input
          aria-label="Note for this status change"
          className={INPUT}
          placeholder="Optional note, e.g. “Onsite booked for Friday”"
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error ? (
          <p role="alert" className="text-sm text-rose-400">
            {error}
          </p>
        ) : null}
        <p className="text-xs text-zinc-600">
          Every change is recorded in the timeline below. Click Interviewing again to log
          the next round.
        </p>
      </div>
    </Card>
  );
}
