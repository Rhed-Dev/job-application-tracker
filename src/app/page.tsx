import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRightIcon,
  BellIcon,
  BriefcaseIcon,
  ChartIcon,
  ClockIcon,
  ColumnsIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/icons";

/** Marketing landing page — fully static, no data dependencies. */

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-500 text-white">
        <BriefcaseIcon width={15} height={15} />
      </span>
      <span className="text-base font-semibold tracking-tight text-zinc-100">
        Job<span className="text-indigo-400">Trail</span>
      </span>
    </Link>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-zinc-400 sm:flex">
          <a href="#features" className="transition hover:text-zinc-100">
            Features
          </a>
          <a href="#how-it-works" className="transition hover:text-zinc-100">
            How it works
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-indigo-500 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-dot-grid absolute inset-0" aria-hidden />
      <div
        className="absolute left-1/2 top-[-12rem] h-[26rem] w-[42rem] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[120px]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-20 text-center sm:px-6 sm:pt-28">
        <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300">
          <span className="size-1.5 rounded-full bg-indigo-400" />
          Built for job seekers who treat the search like a pipeline
        </p>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight text-zinc-50 sm:text-6xl">
          Every application, tracked from{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">
            saved to signed
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-zinc-400 sm:text-lg">
          Track every application, its status, and follow-up reminders — nothing slips
          through. A kanban pipeline, automated email nudges, and analytics that show
          which channels actually convert.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
          >
            Start tracking free <ArrowRightIcon width={15} height={15} />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10"
          >
            Live demo account
          </Link>
        </div>
      </div>
    </section>
  );
}

/** A miniature, CSS-only render of the kanban board (no screenshots needed). */
function BoardPreview() {
  const columns: {
    title: string;
    accent: string;
    cards: { company: string; role: string; meta: string }[];
  }[] = [
    {
      title: "Applied",
      accent: "border-t-sky-500",
      cards: [
        { company: "Supabase", role: "Backend Engineer", meta: "4d in stage" },
        { company: "Render", role: "Platform Engineer", meta: "2d in stage" },
        { company: "PostHog", role: "Product Engineer", meta: "today" },
      ],
    },
    {
      title: "Interviewing",
      accent: "border-t-amber-500",
      cards: [
        { company: "Stripe", role: "Full-Stack Engineer", meta: "Round 2 · 6d" },
        { company: "Linear", role: "Product Engineer", meta: "Round 1 · 3d" },
      ],
    },
    {
      title: "Offer",
      accent: "border-t-emerald-500",
      cards: [{ company: "Vercel", role: "Frontend Engineer", meta: "$140k–180k" }],
    },
  ];
  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-3">
          <span className="size-2.5 rounded-full bg-rose-500/70" />
          <span className="size-2.5 rounded-full bg-amber-500/70" />
          <span className="size-2.5 rounded-full bg-emerald-500/70" />
          <span className="ml-3 rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-zinc-500">
            jobtrail.app/dashboard
          </span>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-6">
          {columns.map((col) => (
            <div
              key={col.title}
              className={`rounded-xl border border-white/5 border-t-2 bg-zinc-950/60 p-3 ${col.accent}`}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-zinc-300">{col.title}</span>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-zinc-500">
                  {col.cards.length}
                </span>
              </div>
              <div className="space-y-2">
                {col.cards.map((card) => (
                  <div
                    key={card.company}
                    className="rounded-lg border border-white/5 bg-zinc-900 p-3"
                  >
                    <p className="text-sm font-medium text-zinc-200">{card.company}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{card.role}</p>
                    <p className="mt-2 inline-flex rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-zinc-400">
                      {card.meta}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-zinc-600">
        The actual board — drag a card and the move is recorded to the status timeline.
      </p>
    </section>
  );
}

const FEATURES: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <ColumnsIcon width={18} height={18} />,
    title: "Kanban pipeline",
    body: "Drag applications through Saved → Applied → Interviewing → Offer. Interview rounds are tracked per application, and every move is logged.",
  },
  {
    icon: <BellIcon width={18} height={18} />,
    title: "Email follow-up reminders",
    body: "“Remind me in 5 days” becomes a delayed queue job. A background worker delivers a clean HTML email exactly when it's due — even across restarts.",
  },
  {
    icon: <ChartIcon width={18} height={18} />,
    title: "Conversion analytics",
    body: "Applications per week, an Applied → Interview → Offer funnel, and response-rate by source, all computed from the status-event log.",
  },
  {
    icon: <ClockIcon width={18} height={18} />,
    title: "Full status history",
    body: "Every transition is an immutable StatusEvent. The detail page replays the whole timeline — when you applied, who responded, how long each stage took.",
  },
  {
    icon: <ShieldIcon width={18} height={18} />,
    title: "Serious auth",
    body: "JWT access tokens with rotating refresh tokens in httpOnly cookies, bcrypt-hashed passwords, and a hand-rolled Google OAuth authorization-code flow.",
  },
  {
    icon: <UsersIcon width={18} height={18} />,
    title: "Roles & admin",
    body: "USER and ADMIN roles enforced server-side at the API boundary. Admins get platform stats and user management at /admin.",
  },
];

function Features() {
  return (
    <section id="features" className="border-t border-white/5 bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-50">
            The whole search, under control
          </h2>
          <p className="mt-3 text-zinc-400">
            JobTrail replaces the spreadsheet, the calendar reminders, and the
            “did they ever reply?” anxiety.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-white/10 bg-zinc-900/50 p-5 transition hover:border-indigo-400/30 hover:bg-zinc-900"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-indigo-300 transition group-hover:border-indigo-400/40">
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS: { step: string; title: string; body: string }[] = [
  {
    step: "01",
    title: "Capture every lead",
    body: "Save roles the moment you find them — company, salary range, source, and the posting URL live on one card.",
  },
  {
    step: "02",
    title: "Work the pipeline",
    body: "Drag cards as things progress and set a follow-up reminder whenever you're waiting on someone else.",
  },
  {
    step: "03",
    title: "Learn what converts",
    body: "The analytics dashboard shows your interview and offer rates per source, so you invest time where it pays off.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-white/5">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-50">
              From bookmark to offer letter
            </h2>
            <p className="mt-3 text-zinc-400">
              A job search is a funnel. JobTrail makes the funnel visible and keeps you
              moving things through it.
            </p>
            <Link
              href="/register"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
            >
              Create your pipeline <ArrowRightIcon width={14} height={14} />
            </Link>
          </div>
          <ol className="space-y-4">
            {STEPS.map((s) => (
              <li
                key={s.step}
                className="flex gap-4 rounded-xl border border-white/10 bg-zinc-900/50 p-5"
              >
                <span className="font-mono text-sm font-semibold text-indigo-400">
                  {s.step}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="border-t border-white/5">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-950/80 via-zinc-900 to-zinc-950 px-6 py-14 text-center sm:px-12">
          <div
            className="absolute left-1/2 top-0 h-40 w-[30rem] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl"
            aria-hidden
          />
          <h2 className="relative text-balance text-3xl font-semibold tracking-tight text-zinc-50">
            Stop losing applications to a spreadsheet
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-zinc-400">
            Self-hostable, open source, and seeded with demo data — clone it, run{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-zinc-300">
              docker compose up
            </code>
            , and you have a pipeline in two minutes.
          </p>
          <Link
            href="/register"
            className="relative mt-7 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
          >
            Get started <ArrowRightIcon width={15} height={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-zinc-500 sm:px-6">
        <Logo />
        <p>
          MIT licensed · Built with Next.js, PostgreSQL, Redis &amp; Resend ·{" "}
          <span className="text-zinc-400">© 2026 John Rhed Atienza</span>
        </p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main>
      <Nav />
      <Hero />
      <BoardPreview />
      <Features />
      <HowItWorks />
      <Cta />
      <Footer />
    </main>
  );
}
