import { Worker, type Job } from "bullmq";
import { getDb } from "./lib/db";
import { sendReminderEmail } from "./lib/email";
import { getAppUrl, requireEnv } from "./lib/env";
import {
  REMINDER_QUEUE_NAME,
  enqueueReminder,
  redisConnectionOptions,
  type ReminderJobData,
} from "./lib/queue";

/**
 * Standalone reminder worker — run with `npm run worker`.
 *
 * Lives in its own process so email delivery never blocks (or is killed with)
 * a web request. BullMQ persists delayed jobs in Redis, so reminders survive
 * restarts of both the web app and this worker. Failed sends retry 3 times
 * with exponential backoff (configured on the producer side in lib/queue.ts).
 */

async function processReminder(job: Job<ReminderJobData>): Promise<void> {
  const db = getDb();
  const reminder = await db.reminder.findUnique({
    where: { id: job.data.reminderId },
    include: { application: { include: { user: true } } },
  });

  // Deleted, already handled, or owner deactivated → ack and move on.
  if (!reminder) {
    console.log(`[worker] Reminder ${job.data.reminderId} no longer exists, skipping`);
    return;
  }
  if (reminder.sent) {
    console.log(`[worker] Reminder ${reminder.id} already sent, skipping`);
    return;
  }
  const { application } = reminder;
  if (!application.user.active) {
    console.log(`[worker] User for reminder ${reminder.id} is deactivated, skipping`);
    return;
  }

  const result = await sendReminderEmail({
    to: application.user.email,
    userName: application.user.name,
    company: application.company,
    roleTitle: application.roleTitle,
    status: application.status,
    note: reminder.note,
    detailUrl: `${getAppUrl()}/applications/${application.id}`,
  });

  // Mark sent only after the email call succeeded; a thrown error above lets
  // BullMQ retry the job with backoff instead.
  await db.reminder.update({
    where: { id: reminder.id },
    data: { sent: true, sentAt: new Date() },
  });

  console.log(
    `[worker] Reminder ${reminder.id} → ${application.user.email} ` +
      `(${result.delivered ? "delivered via Resend" : "dev preview, no API key"})`,
  );
}

/**
 * Recovery sweep: re-enqueue every unsent reminder. Covers reminders created
 * while Redis was down (jobId null) and jobs lost to a flushed Redis.
 * Deterministic job ids ("reminder:<id>") make this idempotent — adding an
 * existing job id is a no-op, so nothing is ever double-scheduled.
 */
async function recoverPendingReminders(): Promise<void> {
  const db = getDb();
  const pending = await db.reminder.findMany({ where: { sent: false } });
  let recovered = 0;
  for (const reminder of pending) {
    const jobId = await enqueueReminder(reminder.id, reminder.remindAt);
    if (jobId) {
      recovered += 1;
      if (reminder.jobId !== jobId) {
        await db.reminder.update({ where: { id: reminder.id }, data: { jobId } });
      }
    }
  }
  console.log(`[worker] Recovery sweep: ${recovered}/${pending.length} pending reminders scheduled`);
}

function main(): void {
  const worker = new Worker<ReminderJobData>(REMINDER_QUEUE_NAME, processReminder, {
    connection: redisConnectionOptions(requireEnv("REDIS_URL")),
    concurrency: 5,
  });

  worker.on("ready", () => {
    console.log(`[worker] Listening on queue "${REMINDER_QUEUE_NAME}"`);
    void recoverPendingReminders().catch((err) =>
      console.error("[worker] Recovery sweep failed:", err),
    );
  });
  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  });
  worker.on("error", (err) => {
    console.error("[worker] Worker error:", err.message);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[worker] ${signal} received, shutting down…`);
    await worker.close();
    await getDb().$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main();
