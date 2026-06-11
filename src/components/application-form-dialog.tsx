"use client";

import { useEffect, useState, type FormEvent } from "react";
import { XIcon } from "@/components/icons";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL } from "@/components/ui";
import {
  SOURCES,
  SOURCE_LABELS,
  STATUSES,
  STATUS_LABELS,
  type Source,
  type Status,
} from "@/lib/constants";
import { ApiClientError, api } from "@/lib/client-api";
import type { ApplicationDTO } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  /** When set, the dialog edits this application instead of creating one. */
  initial?: ApplicationDTO;
  onSaved: (app: ApplicationDTO) => void;
}

interface FormState {
  company: string;
  roleTitle: string;
  location: string;
  url: string;
  source: Source;
  status: Status;
  salaryMin: string;
  salaryMax: string;
  notes: string;
}

function initialState(app?: ApplicationDTO): FormState {
  return {
    company: app?.company ?? "",
    roleTitle: app?.roleTitle ?? "",
    location: app?.location ?? "",
    url: app?.url ?? "",
    source: app?.source ?? "LINKEDIN",
    status: app?.status ?? "SAVED",
    salaryMin: app?.salaryMin?.toString() ?? "",
    salaryMax: app?.salaryMax?.toString() ?? "",
    notes: app?.notes ?? "",
  };
}

function toInt(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function ApplicationFormDialog({ open, onClose, initial, onSaved }: Props) {
  const isEdit = initial !== undefined;
  const [form, setForm] = useState<FormState>(() => initialState(initial));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);

  // Reset the form each time the dialog opens (or the target app changes).
  useEffect(() => {
    if (open) {
      setForm(initialState(initial));
      setError(null);
      setFieldErrors({});
    }
  }, [open, initial]);

  if (!open) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const payload = {
      company: form.company,
      roleTitle: form.roleTitle,
      location: form.location || null,
      url: form.url || null,
      source: form.source,
      salaryMin: toInt(form.salaryMin),
      salaryMax: toInt(form.salaryMax),
      notes: form.notes || null,
      ...(isEdit ? {} : { status: form.status }),
    };
    try {
      const res = isEdit
        ? await api<{ application: ApplicationDTO }>(`/api/applications/${initial.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await api<{ application: ApplicationDTO }>("/api/applications", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      onSaved(res.application);
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFieldErrors(err.details ?? {});
      } else {
        setError("Something went wrong");
      }
    } finally {
      setPending(false);
    }
  }

  const fieldError = (field: string) =>
    fieldErrors[field]?.[0] ? (
      <p className="mt-1 text-xs text-rose-400">{fieldErrors[field][0]}</p>
    ) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit application" : "New application"}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">
            {isEdit ? "Edit application" : "New application"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
          >
            <XIcon />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="company" className={LABEL}>
                Company *
              </label>
              <input
                id="company"
                className={INPUT}
                required
                placeholder="Acme Inc."
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
              />
              {fieldError("company")}
            </div>
            <div>
              <label htmlFor="roleTitle" className={LABEL}>
                Role title *
              </label>
              <input
                id="roleTitle"
                className={INPUT}
                required
                placeholder="Frontend Engineer"
                value={form.roleTitle}
                onChange={(e) => set("roleTitle", e.target.value)}
              />
              {fieldError("roleTitle")}
            </div>
            <div>
              <label htmlFor="location" className={LABEL}>
                Location
              </label>
              <input
                id="location"
                className={INPUT}
                placeholder="Remote / City"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="source" className={LABEL}>
                Source
              </label>
              <select
                id="source"
                className={INPUT}
                value={form.source}
                onChange={(e) => set("source", e.target.value as Source)}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="salaryMin" className={LABEL}>
                Salary min (USD/yr)
              </label>
              <input
                id="salaryMin"
                type="number"
                min={0}
                className={INPUT}
                placeholder="120000"
                value={form.salaryMin}
                onChange={(e) => set("salaryMin", e.target.value)}
              />
              {fieldError("salaryMin")}
            </div>
            <div>
              <label htmlFor="salaryMax" className={LABEL}>
                Salary max (USD/yr)
              </label>
              <input
                id="salaryMax"
                type="number"
                min={0}
                className={INPUT}
                placeholder="160000"
                value={form.salaryMax}
                onChange={(e) => set("salaryMax", e.target.value)}
              />
              {fieldError("salaryMax")}
            </div>
          </div>

          <div>
            <label htmlFor="url" className={LABEL}>
              Job posting URL
            </label>
            <input
              id="url"
              type="url"
              className={INPUT}
              placeholder="https://…"
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
            />
            {fieldError("url")}
          </div>

          {!isEdit ? (
            <div>
              <label htmlFor="status" className={LABEL}>
                Starting stage
              </label>
              <select
                id="status"
                className={INPUT}
                value={form.status}
                onChange={(e) => set("status", e.target.value as Status)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label htmlFor="notes" className={LABEL}>
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              className={`${INPUT} resize-y`}
              placeholder="Referral contact, prep notes, anything…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
            >
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className={BTN_SECONDARY}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={BTN_PRIMARY}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
