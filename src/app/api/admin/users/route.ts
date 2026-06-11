import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { AdminUserDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    await requireRole("ADMIN");
    const users = await getDb().user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        accounts: { select: { provider: true } },
        _count: { select: { applications: true } },
      },
    });
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
    return NextResponse.json({ users: dtos });
  } catch (err) {
    return handleApiError(err);
  }
}
