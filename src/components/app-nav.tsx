"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BriefcaseIcon,
  ChartIcon,
  ColumnsIcon,
  GearIcon,
  LogoutIcon,
  TableIcon,
  UsersIcon,
} from "@/components/icons";

interface AppNavProps {
  name: string;
  email: string;
  role: "USER" | "ADMIN";
}

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Pipeline", icon: <ColumnsIcon /> },
  { href: "/applications", label: "Applications", icon: <TableIcon /> },
  { href: "/analytics", label: "Analytics", icon: <ChartIcon /> },
  { href: "/admin", label: "Admin", icon: <UsersIcon />, adminOnly: true },
  { href: "/settings", label: "Settings", icon: <GearIcon /> },
];

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-500 text-white">
        <BriefcaseIcon width={15} height={15} />
      </span>
      <span className="text-base font-semibold tracking-tight text-zinc-100">
        Job<span className="text-indigo-400">Trail</span>
      </span>
    </Link>
  );
}

export function AppNav({ name, email, role }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "ADMIN");
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  const linkClass = (href: string) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
      isActive(href)
        ? "bg-indigo-500/15 font-medium text-indigo-300"
        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
    }`;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/5 bg-zinc-950/95 px-4 py-5 lg:flex">
        <Brand />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/5 pt-4">
          <div className="mb-3 flex items-center gap-2.5 px-1">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300">
              {name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-200">{name}</p>
              <p className="truncate text-xs text-zinc-500">{email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100 disabled:opacity-50"
          >
            <LogoutIcon />
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-zinc-950/90 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Brand />
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            aria-label="Sign out"
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
          >
            <LogoutIcon />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                isActive(item.href)
                  ? "bg-indigo-500/15 font-medium text-indigo-300"
                  : "text-zinc-400 hover:bg-white/5"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
