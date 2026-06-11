import { Queue, type RedisOptions } from "bullmq";
import { requireEnv } from "./env";
import { delayMs, reminderJobId } from "./reminder-math";

/**
 * BullMQ producer side. The queue and its Redis connection are created
 * lazily on first use — never at import time — so building the app and
 * rendering pages works without Redis running.
 *
 * Scheduling strategy: each reminder becomes a *delayed* job whose delay is
 * `remindAt - now`. The deterministic job id ("reminder:<id>") makes enqueues
 * idempotent: the worker's startup recovery sweep can safely re-add jobs for
 * pending reminders without ever double-sending.
 */

export const REMINDER_QUEUE_NAME = "reminders";

export interface ReminderJobData {
  reminderId: string;
}

/**
 * REDIS_URL → ioredis-style options. BullMQ owns its connections (and tunes
 * blocking-command settings itself), so we hand it options instead of a
 * pre-built client.
 */
export function redisConnectionOptions(url: string): RedisOptions {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    username: u.username || undefined,
    password: u.password || undefined,
    db: u.pathname && u.pathname !== "/" ? Number(u.pathname.slice(1)) : undefined,
    ...(u.protocol === "rediss:" ? { tls: {} } : {}),
  };
}

let queue: Queue | null = null;

function getReminderQueue(): Queue {
  if (!queue) {
    queue = new Queue(REMINDER_QUEUE_NAME, {
      connection: redisConnectionOptions(requireEnv("REDIS_URL")),
    });
  }
  return queue;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms — is Redis running?`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Schedules the delayed email job. Returns the job id, or null if Redis is
 * unreachable — the reminder row is still persisted and the worker's recovery
 * sweep will schedule it on next startup, so nothing is lost.
 */
export async function enqueueReminder(
  reminderId: string,
  remindAt: Date,
): Promise<string | null> {
  const jobId = reminderJobId(reminderId);
  try {
    const data: ReminderJobData = { reminderId };
    await withTimeout(
      getReminderQueue().add(
        "send-reminder",
        data,
        {
          jobId,
          delay: delayMs(remindAt),
          attempts: 3,
          backoff: { type: "exponential", delay: 30_000 },
          removeOnComplete: true,
          removeOnFail: 500,
        },
      ),
      5_000,
      "Enqueueing reminder",
    );
    return jobId;
  } catch (err) {
    console.error(`[queue] Could not enqueue reminder ${reminderId}:`, err);
    return null;
  }
}

/** Best-effort removal of a scheduled job when its reminder is deleted. */
export async function removeReminderJob(jobId: string): Promise<void> {
  try {
    await withTimeout(
      (async () => {
        const job = await getReminderQueue().getJob(jobId);
        if (job) await job.remove();
      })(),
      5_000,
      "Removing reminder job",
    );
  } catch (err) {
    console.error(`[queue] Could not remove job ${jobId}:`, err);
  }
}
