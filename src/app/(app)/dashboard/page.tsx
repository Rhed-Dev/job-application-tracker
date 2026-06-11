import type { Metadata } from "next";
import { KanbanBoard } from "@/components/kanban-board";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toApplicationDTO } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Pipeline" };

export default async function DashboardPage() {
  const user = await requireUser();
  const apps = await getDb().application.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      statusEvents: { orderBy: { at: "desc" }, take: 1 },
      reminders: { where: { sent: false } },
    },
  });

  return <KanbanBoard initialApplications={apps.map(toApplicationDTO)} />;
}
