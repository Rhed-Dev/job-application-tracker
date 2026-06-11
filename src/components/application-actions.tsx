"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApplicationFormDialog } from "@/components/application-form-dialog";
import { PencilIcon, TrashIcon } from "@/components/icons";
import { BTN_DANGER, BTN_SECONDARY } from "@/components/ui";
import { ApiClientError, api } from "@/lib/client-api";
import type { ApplicationDTO } from "@/lib/types";

/** Edit / delete actions in the detail-page header. */
export function ApplicationActions({ application }: { application: ApplicationDTO }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setDeleting(true);
    setError(null);
    try {
      await api(`/api/applications/${application.id}`, { method: "DELETE" });
      router.push("/applications");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not delete");
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button type="button" onClick={() => setEditOpen(true)} className={BTN_SECONDARY}>
          <PencilIcon width={14} height={14} /> Edit
        </button>
        {confirming ? (
          <>
            <button
              type="button"
              onClick={() => void onDelete()}
              disabled={deleting}
              className={BTN_DANGER}
            >
              {deleting ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={BTN_SECONDARY}
            >
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={BTN_DANGER}>
            <TrashIcon width={14} height={14} /> Delete
          </button>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      ) : null}
      <ApplicationFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={application}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
