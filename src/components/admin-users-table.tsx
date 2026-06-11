"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiClientError, api } from "@/lib/client-api";
import { formatDate } from "@/lib/format";
import type { AdminUserDTO } from "@/lib/types";

/** Admin user list with activate / deactivate controls. */
export function AdminUsersTable({
  users,
  currentUserId,
}: {
  users: AdminUserDTO[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setActive(id: string, active: boolean) {
    setPending(id);
    setError(null);
    try {
      await api(`/api/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update user");
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      {error ? (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
        >
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead className="border-b border-white/10 bg-zinc-900/80">
            <tr>
              {["User", "Role", "Sign-in", "Applications", "Joined", "Status", ""].map(
                (h, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => (
              <tr key={u.id} className="bg-zinc-950/40">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-200">
                    {u.name}
                    {u.id === currentUserId ? (
                      <span className="ml-2 text-xs text-zinc-500">(you)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-zinc-500">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                      u.role === "ADMIN"
                        ? "bg-indigo-500/15 text-indigo-300"
                        : "bg-white/5 text-zinc-400"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">
                  {[u.hasPassword ? "Password" : null, ...u.providers.map((p) => p === "google" ? "Google" : p)]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
                <td className="px-4 py-3 text-zinc-400">{u.applicationCount}</td>
                <td className="px-4 py-3 text-zinc-400">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.active
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-rose-500/10 text-rose-300"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${u.active ? "bg-emerald-400" : "bg-rose-400"}`}
                    />
                    {u.active ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.id !== currentUserId ? (
                    <button
                      type="button"
                      disabled={pending === u.id}
                      onClick={() => void setActive(u.id, !u.active)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                        u.active
                          ? "border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                          : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                      }`}
                    >
                      {pending === u.id ? "Saving…" : u.active ? "Deactivate" : "Reactivate"}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
