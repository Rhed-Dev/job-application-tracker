import { PrismaClient, type ApplicationSource, type ApplicationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Demo seed — run with `npx prisma db seed` (after `npx prisma migrate dev`).
 *
 * DESTRUCTIVE: wipes all data first so re-seeding always yields a clean,
 * predictable demo state.
 *
 * Accounts:
 *   demo@jobtrail.app  / demo1234   (USER  — has the showcase data)
 *   admin@jobtrail.app / admin1234  (ADMIN — can open /admin)
 */

const db = new PrismaClient();

function daysAgo(days: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function daysFromNow(days: number, hour = 9): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

interface SeedApp {
  company: string;
  roleTitle: string;
  location: string | null;
  source: ApplicationSource;
  url: string | null;
  notes: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  /** [status, daysAgo, note?] — ordered oldest → newest; last entry is current. */
  timeline: [ApplicationStatus, number, string?][];
  interviewRound?: number;
  reminders?: { inDays: number; note: string }[];
}

const APPS: SeedApp[] = [
  {
    company: "Vercel", roleTitle: "Frontend Engineer", location: "Remote (US)",
    source: "COMPANY_SITE", url: "https://vercel.com/careers", salaryMin: 140000, salaryMax: 180000,
    notes: "Referred internally after the Next.js meetup. Team works heavily with RSC.",
    timeline: [["SAVED", 52], ["APPLIED", 48], ["INTERVIEWING", 35, "Recruiter screen booked"], ["INTERVIEWING", 24, "Advanced to interview round 2"], ["OFFER", 9, "Verbal offer — written offer to follow"]],
    interviewRound: 2,
  },
  {
    company: "Linear", roleTitle: "Product Engineer", location: "Remote (EU/US)",
    source: "LINKEDIN", url: "https://linear.app/careers", salaryMin: 150000, salaryMax: 190000,
    notes: "Small team, high bar. Take-home was a mini issue tracker.",
    timeline: [["SAVED", 40], ["APPLIED", 33], ["INTERVIEWING", 21, "Take-home received"], ["INTERVIEWING", 12, "Advanced to interview round 2"]],
    interviewRound: 2,
    reminders: [{ inDays: 3, note: "Ask recruiter about the onsite timeline" }],
  },
  {
    company: "Stripe", roleTitle: "Full-Stack Engineer, Billing", location: "New York, NY",
    source: "REFERRAL", url: "https://stripe.com/jobs", salaryMin: 160000, salaryMax: 210000,
    notes: "Referral from Maya. Billing team, TypeScript + Ruby.",
    timeline: [["SAVED", 31], ["APPLIED", 28], ["INTERVIEWING", 14, "Phone screen passed"]],
    interviewRound: 1,
    reminders: [{ inDays: 5, note: "Follow up if no word on the virtual onsite" }],
  },
  {
    company: "Supabase", roleTitle: "Backend Engineer, Postgres", location: "Remote",
    source: "JOB_BOARD", url: "https://supabase.com/careers", salaryMin: 130000, salaryMax: 170000,
    notes: null,
    timeline: [["SAVED", 26], ["APPLIED", 22]],
  },
  {
    company: "Raycast", roleTitle: "macOS Engineer", location: "Remote (EU)",
    source: "COMPANY_SITE", url: null, salaryMin: null, salaryMax: null,
    notes: "Mostly Swift; my TS background is a stretch but the AI features need web infra.",
    timeline: [["SAVED", 19], ["APPLIED", 16]],
    reminders: [{ inDays: 2, note: "Ping the hiring manager on the application status" }],
  },
  {
    company: "Figma", roleTitle: "Software Engineer, Editor", location: "San Francisco, CA",
    source: "LINKEDIN", url: "https://figma.com/careers", salaryMin: 170000, salaryMax: 220000,
    notes: "Rejected after round 1 — feedback: go deeper on systems design.",
    timeline: [["SAVED", 45], ["APPLIED", 42], ["INTERVIEWING", 30], ["REJECTED", 23, "Round 1 feedback: systems design depth"]],
    interviewRound: 1,
  },
  {
    company: "Notion", roleTitle: "Growth Engineer", location: "New York, NY",
    source: "RECRUITER", url: null, salaryMin: 150000, salaryMax: 185000,
    notes: "Recruiter reached out on LinkedIn. No response since applying.",
    timeline: [["APPLIED", 38], ["GHOSTED", 10, "No reply after two follow-ups"]],
  },
  {
    company: "Render", roleTitle: "Platform Engineer", location: "Remote (US)",
    source: "JOB_BOARD", url: "https://render.com/careers", salaryMin: 140000, salaryMax: 175000,
    notes: null,
    timeline: [["SAVED", 13], ["APPLIED", 11]],
  },
  {
    company: "PostHog", roleTitle: "Product Engineer", location: "Remote",
    source: "COMPANY_SITE", url: "https://posthog.com/careers", salaryMin: 120000, salaryMax: 160000,
    notes: "Transparent comp calculator on their site. SQL-heavy product work.",
    timeline: [["SAVED", 9], ["APPLIED", 6]],
  },
  {
    company: "Datadog", roleTitle: "Software Engineer, Frontend Platform", location: "Boston, MA",
    source: "LINKEDIN", url: null, salaryMin: 145000, salaryMax: 180000,
    notes: "Applied through Easy Apply — low expectations.",
    timeline: [["APPLIED", 29], ["REJECTED", 20, "Automated rejection email"]],
  },
  {
    company: "Cal.com", roleTitle: "Senior Full-Stack Engineer", location: "Remote",
    source: "REFERRAL", url: "https://cal.com/jobs", salaryMin: 130000, salaryMax: 165000,
    notes: "Open-source contributions count — link the scheduling PR.",
    timeline: [["SAVED", 5]],
  },
  {
    company: "Resend", roleTitle: "Developer Experience Engineer", location: "Remote",
    source: "OTHER", url: "https://resend.com", salaryMin: null, salaryMax: null,
    notes: "Found via their changelog. Docs + SDK work.",
    timeline: [["SAVED", 3]],
  },
  {
    company: "Anthropic", roleTitle: "Software Engineer, Product", location: "San Francisco, CA",
    source: "COMPANY_SITE", url: "https://anthropic.com/careers", salaryMin: 200000, salaryMax: 280000,
    notes: null,
    timeline: [["SAVED", 56], ["APPLIED", 50], ["INTERVIEWING", 41], ["INTERVIEWING", 32, "Advanced to interview round 2"], ["INTERVIEWING", 25, "Advanced to interview round 3"], ["REJECTED", 17, "Strong loop, lost to an internal candidate"]],
    interviewRound: 3,
  },
  {
    company: "Shopify", roleTitle: "Senior Frontend Developer", location: "Toronto, ON",
    source: "JOB_BOARD", url: null, salaryMin: 125000, salaryMax: 155000,
    notes: null,
    timeline: [["APPLIED", 65], ["GHOSTED", 35]],
  },
];

async function main(): Promise<void> {
  console.log("Seeding database (existing data will be wiped)…");

  await db.statusEvent.deleteMany();
  await db.reminder.deleteMany();
  await db.application.deleteMany();
  await db.refreshToken.deleteMany();
  await db.account.deleteMany();
  await db.user.deleteMany();

  const demo = await db.user.create({
    data: {
      email: "demo@jobtrail.app",
      name: "Demo User",
      passwordHash: await bcrypt.hash("demo1234", 12),
    },
  });
  const admin = await db.user.create({
    data: {
      email: "admin@jobtrail.app",
      name: "Avery Admin",
      role: "ADMIN",
      passwordHash: await bcrypt.hash("admin1234", 12),
    },
  });
  await db.user.create({
    data: {
      email: "sam@example.com",
      name: "Sam OAuth-Only",
      passwordHash: null,
      accounts: { create: { provider: "google", providerAccountId: "seed-google-1001" } },
    },
  });

  for (const spec of APPS) {
    const current = spec.timeline[spec.timeline.length - 1];
    const appliedEntry = spec.timeline.find(([status]) => status === "APPLIED");
    const createdAt = daysAgo(spec.timeline[0][1]);

    await db.application.create({
      data: {
        userId: demo.id,
        company: spec.company,
        roleTitle: spec.roleTitle,
        location: spec.location,
        source: spec.source,
        url: spec.url,
        notes: spec.notes,
        salaryMin: spec.salaryMin,
        salaryMax: spec.salaryMax,
        status: current[0],
        interviewRound: spec.interviewRound ?? 0,
        appliedAt: appliedEntry ? daysAgo(appliedEntry[1]) : null,
        createdAt,
        statusEvents: {
          create: spec.timeline.map(([toStatus, ago, note], i) => ({
            fromStatus: i === 0 ? null : spec.timeline[i - 1][0],
            toStatus,
            note: note ?? (i === 0 ? "Application created" : null),
            at: daysAgo(ago, 10 + i),
          })),
        },
        reminders: spec.reminders
          ? {
              create: spec.reminders.map((r) => ({
                remindAt: daysFromNow(r.inDays),
                note: r.note,
              })),
            }
          : undefined,
      },
    });
  }

  // A couple of rows for the admin so /admin stats aren't single-user.
  await db.application.create({
    data: {
      userId: admin.id,
      company: "GitHub",
      roleTitle: "Engineering Manager",
      source: "REFERRAL",
      status: "APPLIED",
      appliedAt: daysAgo(7),
      statusEvents: {
        create: [
          { fromStatus: null, toStatus: "SAVED", note: "Application created", at: daysAgo(12) },
          { fromStatus: "SAVED", toStatus: "APPLIED", at: daysAgo(7) },
        ],
      },
    },
  });

  const counts = {
    users: await db.user.count(),
    applications: await db.application.count(),
    statusEvents: await db.statusEvent.count(),
    reminders: await db.reminder.count(),
  };
  console.log("Seed complete:", counts);
  console.log("Sign in as demo@jobtrail.app / demo1234 (or admin@jobtrail.app / admin1234).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
