import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminUsersTable } from "@/components/admin-users-table";
import { Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { startOfWeek } from "@/lib/analytics";
import type { AdminUserDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin" };

/**
 * Admin console. Middleware blocks non-admins from the URL, the layout
 * re-checks the session, and this page checks the role against the database —
 * mirrored by requireRole("ADMIN") on every /api/admin endpoint.
 */
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const db = getDb();
  const [users, totalApplications, applicationsThisWeek, offers, pendingReminders] =
    await Promise.all([
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          accounts: { select: { provider: true } },
          _count: { select: { applications: true } },
        },
      }),
      db.application.count(),
      db.application.count({ where: { createdAt: { gte: startOfWeek(new Date()) } } }),
      db.application.count({ where: { status: "OFFER" } }),
      db.reminder.count({ where: { sent: false } }),
    ]);

  const dtos: AdminUserDTO[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt.toISOString(),
    applicationCount: u._count.applications,
    hasPassword: u.passwordHash !== null,
    providers: u.accounts.map((a) => a.provider),
  }));

  const stats = [
    { label: "Users", value: users.length },
    { label: "Active users", value: users.filter((u) => u.active).length },
    { label: "Applications tracked", value: totalApplications },
    { label: "New this week", value: applicationsThisWeek },
    { label: "Offers on the board", value: offers },
    { label: "Reminders pending", value: pendingReminders },
  ];

  return (
    <>
      <PageHeader
        title="Admin"
        description="Platform overview and user management"
      />
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} className="px-4 py-3.5">
            <p className="text-xs font-medium text-zinc-500">{s.label}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-100">
              {s.value}
            </p>
          </Card>
        ))}
      </div>
      <AdminUsersTable users={dtos} currentUserId={user.id} />
    </>
  );
}
