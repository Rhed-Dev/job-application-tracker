"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { GoogleIcon } from "@/components/icons";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL } from "@/components/ui";
import { ApiClientError, api } from "@/lib/client-api";

const OAUTH_ERRORS: Record<string, string> = {
  session_expired: "Your session expired — please sign in again.",
  google_not_configured:
    "Google sign-in isn't configured on this server. Use email and password instead.",
  oauth_state: "The Google sign-in attempt could not be verified. Please try again.",
  oauth_failed: "Google sign-in failed. Please try again.",
  deactivated: "This account has been deactivated by an administrator.",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const urlError = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    urlError ? (OAUTH_ERRORS[urlError] ?? "Something went wrong. Please try again.") : null,
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push(next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
      <h1 className="text-lg font-semibold text-zinc-100">Welcome back</h1>
      <p className="mt-1 text-sm text-zinc-500">Sign in to your pipeline.</p>

      <a href="/api/auth/google" className={`${BTN_SECONDARY} mt-5 w-full`}>
        <GoogleIcon /> Continue with Google
      </a>

      <div className="my-5 flex items-center gap-3 text-xs text-zinc-600">
        <span className="h-px flex-1 bg-white/10" />
        or with email
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className={LABEL}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            className={INPUT}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password" className={LABEL}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            className={INPUT}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        <button type="submit" disabled={pending} className={`${BTN_PRIMARY} w-full`}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-500">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-indigo-400 hover:text-indigo-300">
          Create one
        </Link>
      </p>
      <p className="mt-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-center text-xs text-zinc-600">
        Demo (after seeding): demo@jobtrail.app / demo1234
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
