import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GoogleIcon } from "@/components/icons";
import { PasswordForm, ProfileForm, SessionsCard } from "@/components/settings-forms";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const accounts = await getDb().account.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <PageHeader title="Settings" description="Account, security, and connected sign-ins" />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <ProfileForm initialName={user.name} />
          <Card>
            <CardHeader title="Connected sign-ins" />
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5">
                <span className="text-sm text-zinc-300">Email &amp; password</span>
                <span className="text-xs text-zinc-500">
                  {user.passwordHash ? "Enabled" : "Not set (Google only)"}
                </span>
              </div>
              {accounts.length > 0 ? (
                accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2 text-sm text-zinc-300">
                      <GoogleIcon width={14} height={14} />
                      {account.provider === "google" ? "Google" : account.provider}
                    </span>
                    <span className="text-xs text-zinc-500">
                      linked {formatDate(account.createdAt.toISOString())}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-600">
                  No OAuth providers linked. Sign in with Google using the same email to
                  link it automatically.
                </p>
              )}
            </div>
          </Card>
        </div>
        <div className="space-y-5">
          <PasswordForm hasPassword={user.passwordHash !== null} />
          <SessionsCard />
        </div>
      </div>
    </>
  );
}
