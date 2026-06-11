# JobTrail — Job Application Tracker

> Track every application, its status, and follow-up reminders — nothing slips through.

JobTrail is a self-hostable job-search CRM. Applications move through a drag-and-drop kanban pipeline (Saved → Applied → Interviewing → Offer), every status change is recorded as an immutable event, follow-up reminders arrive by email exactly when they're due, and an analytics dashboard shows which sourcing channels actually convert. It exists because a serious job search is a funnel, and funnels managed in spreadsheets leak: applications go stale, follow-ups get forgotten, and nobody knows their real interview rate.

![Next.js](https://img.shields.io/badge/Next.js_15-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-FF4438?logo=redis&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-D94C3D)
![Resend](https://img.shields.io/badge/Resend-000000?logo=resend&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-22B5BF)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue)

## Features

- **Kanban pipeline with drag-and-drop** — applications move through `Saved → Applied → Interviewing → Offer → Rejected/Ghosted` on a hand-rolled HTML5 DnD board (no DnD library). Drops optimistically update the UI, POST the transition, and roll back on failure. Interviewing tracks per-application rounds (R1, R2, …).
- **Status history as an event log** — every transition is appended as a `StatusEvent` in the same transaction that updates the row. The detail page replays the full timeline with per-stage durations; analytics are derived entirely from this log.
- **Email follow-up reminders** — "remind me in 5 days" creates a delayed BullMQ job in Redis. A separate worker process (`npm run worker`) delivers a clean HTML email through Resend at the scheduled instant, with retries, idempotent job ids, and a startup recovery sweep so reminders survive outages.
- **Analytics dashboard** — applications per week, an Applied → Interview → Offer conversion funnel, response-rate by source (LinkedIn / referral / company site / …), and average days-in-stage. Computed server-side with Prisma + pure functions, rendered with Recharts.
- **JWT auth with refresh rotation + Google OAuth** — bcrypt-hashed credentials, 15-minute JWT access tokens, 30-day rotating opaque refresh tokens (stored hashed, reuse detection revokes the session family), all in httpOnly cookies. Google sign-in is a hand-implemented authorization-code flow.
- **Role-based access control** — `USER` and `ADMIN` roles. Admins get `/admin` with platform stats, a user list, and deactivation controls. Enforced in middleware *and* at the API boundary via `requireRole()` — never just hidden in the UI.
- **Table view with filtering, sorting, and search** — alongside the board, a sortable table with status/source filters and free-text search across company, role, and location.

## Architecture

```mermaid
flowchart LR
    subgraph Client["Browser"]
        UI["React UI<br/>(kanban · table · charts)"]
    end

    subgraph Next["Next.js 15 (App Router)"]
        MW["Edge middleware<br/>JWT verify · role gate · refresh bounce"]
        Pages["Server components<br/>(dashboard · analytics · admin)"]
        API["API route handlers<br/>zod validation · requireRole()"]
    end

    subgraph Data["Data & jobs"]
        PG[("PostgreSQL<br/>Prisma")]
        REDIS[("Redis<br/>BullMQ delayed jobs")]
    end

    subgraph Worker["Worker process (npm run worker)"]
        W["BullMQ worker<br/>recovery sweep · retries"]
    end

    EXT1["Google OAuth"]
    EXT2["Resend API"]

    UI -->|httpOnly cookies| MW
    MW --> Pages
    MW --> API
    Pages --> PG
    API --> PG
    API -->|enqueue delayed job| REDIS
    REDIS -->|due jobs| W
    W --> PG
    W -->|reminder email| EXT2
    API <-->|authorization-code flow| EXT1
```

**Key flows**

1. **Auth** — middleware verifies the access-token JWT on every protected route; if it has expired but a refresh cookie exists, the request bounces through `/api/auth/refresh`, which rotates the token pair and redirects back.
2. **Status change** — board drop → `POST /api/applications/:id/status` → Prisma transaction writes the `StatusEvent` *and* updates the application atomically.
3. **Reminder** — `POST …/reminders` persists the row, then enqueues a BullMQ job delayed by `remindAt − now`. The worker (separate process) sends the email and marks the reminder sent.

## Tech stack

| Technology | Role | Why this choice |
|---|---|---|
| Next.js 15 (App Router) | Full-stack framework | Server components keep Prisma queries off the client; route handlers give a real API surface; one deployable app |
| TypeScript (strict) | Language | End-to-end types from the Prisma schema to chart props; `strict` catches the bugs reviews miss |
| PostgreSQL | Database | Relational fit (users → applications → events), transactional writes for the event log |
| Prisma | ORM | Typed queries, readable schema, painless migrations and seeding |
| Redis + BullMQ | Job queue | Native *delayed* jobs with retries and persistence — exactly the shape of "email me in 5 days" |
| Resend | Transactional email | Minimal API for one HTML email; trivially swappable behind `sendReminderEmail()` |
| `jose` | JWT | Web-Crypto based, so the same verify code runs in edge middleware, Node routes, and tests |
| Tailwind CSS 4 | Styling | A constrained utility scale keeps the dark UI consistent without a component framework |
| Recharts | Charts | Declarative SVG charts that compose with React server-fetched data |
| zod | Validation | Every API boundary parses unknown input into typed data, with field-level errors returned to forms |
| Vitest | Tests | Fast, zero-config TS tests for the pure domain logic |

## Getting started

**Prerequisites:** Node 20+, npm, Docker (for Postgres + Redis).

```bash
git clone https://github.com/<you>/job-application-tracker.git
cd job-application-tracker
npm install                    # runs `prisma generate` via postinstall

docker compose up -d           # local PostgreSQL :5432 + Redis :6379

cp .env.example .env           # defaults match docker-compose; set JWT_SECRET

npx prisma migrate dev         # create the schema
npx prisma db seed             # demo users + ~15 realistic applications

npm run dev                    # web app → http://localhost:3000
npm run worker                 # reminder worker (separate terminal)
```

Seeded accounts: `demo@jobtrail.app / demo1234` (user with showcase data) and `admin@jobtrail.app / admin1234` (can open `/admin`).

Useful scripts: `npm test` (unit tests), `npm run build` (production build — works with no database/Redis running), `npm run db:studio` (Prisma Studio).

> **Note on email:** without `RESEND_API_KEY` the worker prints reminder emails to stdout instead of sending — handy for local development.

## Environment variables

| Name | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (compose default: `postgresql://postgres:postgres@localhost:5432/jobtrail`) |
| `JWT_SECRET` | Yes | HMAC secret for access tokens — `openssl rand -hex 32` |
| `REDIS_URL` | Yes (reminders) | Redis connection string for BullMQ (`redis://localhost:6379`) |
| `RESEND_API_KEY` | No | Resend API key; when unset, emails are printed to stdout |
| `EMAIL_FROM` | No | From address for reminder emails (defaults to Resend's onboarding sender) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client id; Google sign-in is hidden-by-error when unset |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `APP_URL` | No | Public base URL for OAuth redirects and email links (default `http://localhost:3000`) |

Nothing reads env vars at import time — a missing variable produces a clear error at the point of use, which is also why the project builds with no `.env` at all.

## API reference

All responses are JSON; errors share the envelope `{ "error": { "message", "details?" } }`. Auth = session cookie required; Admin = `ADMIN` role required.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account (bcrypt), issue session cookies |
| POST | `/api/auth/login` | — | Verify credentials, issue session cookies |
| GET/POST | `/api/auth/refresh` | refresh cookie | Rotate the refresh token; GET redirects (middleware bounce), POST returns JSON |
| POST | `/api/auth/logout` | — | Revoke the presented refresh token, clear cookies |
| POST | `/api/auth/logout-all` | Auth | Revoke every refresh token for the user |
| GET | `/api/auth/google` | — | Redirect to Google's consent screen (sets `state` cookie) |
| GET | `/api/auth/google/callback` | — | Verify `state`, exchange code, upsert user, issue cookies |
| GET / PATCH | `/api/me` | Auth | Read / update the profile |
| POST | `/api/me/password` | Auth | Change password; revokes all other sessions |
| GET / POST | `/api/applications` | Auth | List / create applications (creation writes the initial `StatusEvent`) |
| GET / PATCH / DELETE | `/api/applications/:id` | Auth | Read / edit / delete one application (ownership enforced) |
| POST | `/api/applications/:id/status` | Auth | Transition status (transactional event append); repeat `INTERVIEWING` advances the round |
| POST | `/api/applications/:id/reminders` | Auth | Create a reminder and enqueue its delayed email job |
| DELETE | `/api/reminders/:id` | Auth | Delete a reminder and remove its queued job |
| GET | `/api/admin/users` | Admin | List users with role, providers, and application counts |
| PATCH | `/api/admin/users/:id` | Admin | Activate / deactivate a user (deactivation revokes sessions) |

## Database schema

```mermaid
erDiagram
    User ||--o{ Application : owns
    User ||--o{ Account : "links OAuth"
    User ||--o{ RefreshToken : "has sessions"
    Application ||--o{ StatusEvent : "appends"
    Application ||--o{ Reminder : "schedules"

    User {
        string id PK
        string email UK
        string name
        string passwordHash "null for OAuth-only"
        Role role "USER | ADMIN"
        boolean active
    }
    Account {
        string id PK
        string provider
        string providerAccountId
    }
    Application {
        string id PK
        string company
        string roleTitle
        string location
        ApplicationSource source
        string url
        int salaryMin
        int salaryMax
        ApplicationStatus status
        int interviewRound
        datetime appliedAt
    }
    StatusEvent {
        string id PK
        ApplicationStatus fromStatus "null on creation"
        ApplicationStatus toStatus
        string note
        datetime at
    }
    Reminder {
        string id PK
        datetime remindAt
        string note
        boolean sent
        string jobId "BullMQ job id"
    }
    RefreshToken {
        string id PK
        string tokenHash UK "SHA-256, never plaintext"
        datetime expiresAt
        datetime revokedAt
        string replacedById "rotation chain"
    }
```

## Implementation highlights

**Refresh-token rotation, and why httpOnly cookies beat localStorage.** Access tokens are 15-minute JWTs; refresh tokens are opaque 384-bit random strings stored only as SHA-256 hashes. Both live in `httpOnly` cookies, so a successful XSS payload cannot read them — `localStorage` tokens, by contrast, are one `JSON.stringify(localStorage)` away from exfiltration. Every call to `/api/auth/refresh` *rotates*: the presented token is revoked and linked (`replacedById`) to its successor. The decision logic is a pure function, which makes the security-critical branch unit-testable:

```ts
export function evaluateRefreshToken(record, now = new Date()): RefreshTokenState {
  if (record.revokedAt !== null) return "reused";   // replay → revoke the whole family
  if (record.expiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}
```

A revoked token showing up again means someone is replaying a stolen token (the legitimate client already holds the newer one), so the handler revokes *every* active session for that user. Middleware completes the UX: an expired access token with a live refresh cookie bounces through `GET /api/auth/refresh?next=…` and back, so users never see a login wall mid-session.

**Reliable reminders: BullMQ delayed jobs + a dedicated worker.** A naive `setTimeout` dies with the process; a cron poller trades latency for load and silently skips windows when it's down. Instead, creating a reminder enqueues a Redis-persisted *delayed* job with `delay = remindAt − now`, so it survives deploys and fires at the right instant. Delivery runs in a separate process (`src/worker.ts`, `npm run worker`) so a slow email API can never block a web request. Failures retry three times with exponential backoff, and job ids are deterministic (`reminder:<id>`), which makes enqueueing idempotent — the worker runs a recovery sweep at startup that re-enqueues any unsent reminder (covering "Redis was down when the reminder was created") with zero risk of double-sending. The database row is the source of truth; the queue is just the alarm clock.

```ts
queue.add("send-reminder", { reminderId }, {
  jobId: `reminder:${reminderId}`,          // idempotent re-enqueue
  delay: delayMs(remindAt),
  attempts: 3,
  backoff: { type: "exponential", delay: 30_000 },
});
```

**The StatusEvent log is the analytics engine (event sourcing-lite).** `Application.status` answers "where is it now?", but the funnel needs "did it *ever* reach interviews?" — a question a mutable column can't answer once a card moves to Rejected. Every transition is appended as an immutable `StatusEvent` inside the same Prisma `$transaction` that updates the row, so the projection can never drift from the log. From the log alone the app derives the conversion funnel (an application rejected after interviewing still counts toward the interview rate), per-stage durations (`daysInStage` folds event intervals, accumulating revisited stages), and source response rates (a rejection counts as a response; ghosting doesn't). These are pure functions over `{toStatus, at}` arrays — trivially unit-tested with no database.

**RBAC is enforced server-side, not hidden client-side.** There are three layers, and the inner one is the one that matters: edge middleware redirects non-admins away from `/admin` (pure UX), the admin page re-checks the role against the database, and every `/api/admin/*` handler starts with `await requireRole("ADMIN")`, which resolves the user from the access-token cookie *and re-reads the row* — so a deactivated admin is cut off even while holding a syntactically valid JWT. Deactivating a user also revokes all their refresh tokens, bounding their remaining access to the ≤15-minute life of the current access token. Ownership uses the same philosophy: every application query is scoped `where: { id, userId }`, so IDOR probing returns 404 rather than leaking other users' data.

**Building with zero infrastructure.** `next build` and `npm test` succeed with no database, Redis, or API keys: every page and route that touches data declares `dynamic = "force-dynamic"`, and all clients (Prisma, BullMQ queue, Resend) are lazy singletons created at first request — never at import time. Missing configuration surfaces as a clear runtime error pointing at `.env.example`, instead of a crashed build.

## Project structure

```
job-application-tracker/
├── docker-compose.yml        # local PostgreSQL + Redis
├── prisma/
│   ├── schema.prisma         # data model (User, Application, StatusEvent, …)
│   └── seed.ts               # demo accounts + realistic pipeline data
├── src/
│   ├── app/                  # App Router: pages, layouts, API route handlers
│   ├── components/           # kanban board, table, charts, forms, UI primitives
│   ├── lib/                  # auth, jwt, oauth, db, queue, email, analytics, validation
│   ├── middleware.ts         # edge auth gate + refresh bounce + admin gate
│   └── worker.ts             # standalone BullMQ reminder worker
├── tests/                    # Vitest unit tests (pure logic, no DB/network)
└── vitest.config.ts
```

## Testing

Unit tests cover the security- and money-critical pure logic — no database, Redis, or network involved:

- **JWT** — sign/verify round-trips, expiry, wrong-secret and tampered-payload rejection (including a forged role-escalation attempt)
- **Refresh rotation** — valid / expired / reused decisions, reuse-beats-expiry precedence, boundary instants
- **Days-in-stage** — event folding, out-of-order input, revisited stages, open-stage accrual
- **Funnel & source stats** — conversion rates, skipped-stage semantics, "rejection is a response, ghosting isn't", weekly bucketing
- **Reminder date math** — "in N days at 9:00", past-clamping, month rollover, invalid input

```bash
npm test        # vitest run — 44 tests
```

## Roadmap

- [ ] Interview-round sub-stages with scheduled dates and calendar (.ics) export
- [ ] Browser extension / bookmarklet to capture postings from LinkedIn and job boards
- [ ] Attachment storage for per-application resume and cover-letter versions
- [ ] Weekly digest email summarizing pipeline movement and stale applications
- [ ] Account linking & unlinking UI for multiple OAuth providers
- [ ] Optional team workspaces (shared pipelines for career coaches)

## License

MIT © 2026 John Rhed Atienza — see [LICENSE](LICENSE).
