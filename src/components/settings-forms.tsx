"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BTN_DANGER, BTN_PRIMARY, Card, CardHeader, INPUT, LABEL } from "@/components/ui";
import { ApiClientError, api } from "@/lib/client-api";

function useFormStatus() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  return { pending, setPending, error, setError, success, setSuccess };
}

function Feedback({ error, success }: { error: string | null; success: string | null }) {
  if (error) {
    return (
      <p role="alert" className="text-sm text-rose-400">
        {error}
      </p>
    );
  }
  if (success) {
    return <p className="text-sm text-emerald-400">{success}</p>;
  }
  return null;
}

export function ProfileForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const s = useFormStatus();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    s.setPending(true);
    s.setError(null);
    s.setSuccess(null);
    try {
      await api("/api/me", { method: "PATCH", body: JSON.stringify({ name }) });
      s.setSuccess("Profile updated.");
      router.refresh();
    } catch (err) {
      s.setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      s.setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Profile" />
      <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
        <div>
          <label htmlFor="profile-name" className={LABEL}>
            Display name
          </label>
          <input
            id="profile-name"
            className={INPUT}
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Feedback error={s.error} success={s.success} />
        <button type="submit" disabled={s.pending} className={BTN_PRIMARY}>
          {s.pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </Card>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const s = useFormStatus();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    s.setPending(true);
    s.setError(null);
    s.setSuccess(null);
    try {
      await api("/api/me/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      s.setSuccess("Password changed. Other devices were signed out.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      s.setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      s.setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Password" />
      {hasPassword ? (
        <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
          <div>
            <label htmlFor="current-password" className={LABEL}>
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              className={INPUT}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="new-password" className={LABEL}>
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={INPUT}
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <Feedback error={s.error} success={s.success} />
          <button type="submit" disabled={s.pending} className={BTN_PRIMARY}>
            {s.pending ? "Updating…" : "Change password"}
          </button>
        </form>
      ) : (
        <p className="p-5 text-sm text-zinc-500">
          This account signs in with Google and has no password. Changing the password is
          only available for email/password accounts.
        </p>
      )}
    </Card>
  );
}

export function SessionsCard() {
  const router = useRouter();
  const s = useFormStatus();

  async function signOutEverywhere() {
    s.setPending(true);
    s.setError(null);
    try {
      await api("/api/auth/logout-all", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      s.setError(err instanceof ApiClientError ? err.message : "Something went wrong");
      s.setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Sessions" />
      <div className="space-y-3 p-5">
        <p className="text-sm text-zinc-500">
          Revokes every refresh token issued to your account — all devices (including this
          one) must sign in again. Use it if you suspect a session was compromised.
        </p>
        <Feedback error={s.error} success={null} />
        <button
          type="button"
          onClick={() => void signOutEverywhere()}
          disabled={s.pending}
          className={BTN_DANGER}
        >
          {s.pending ? "Signing out…" : "Sign out everywhere"}
        </button>
      </div>
    </Card>
  );
}
