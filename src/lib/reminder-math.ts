/**
 * Pure date math for follow-up reminders. Kept free of I/O so the scheduling
 * rules are unit-testable without Redis or a database.
 */

export const DEFAULT_REMINDER_HOUR = 9;

/**
 * "Remind me in N days" → a concrete timestamp N days from `from`, normalized
 * to a sensible local hour (9:00 by default) so emails don't arrive at 3am.
 */
export function computeRemindAt(
  from: Date,
  days: number,
  hour: number = DEFAULT_REMINDER_HOUR,
): Date {
  if (!Number.isFinite(days) || days < 0) {
    throw new RangeError(`days must be a non-negative number, got ${days}`);
  }
  const result = new Date(from);
  result.setDate(result.getDate() + Math.floor(days));
  result.setHours(hour, 0, 0, 0);
  // Same-day reminders scheduled after the target hour fire immediately
  // rather than silently jumping to the past.
  if (result.getTime() < from.getTime()) {
    return new Date(from);
  }
  return result;
}

/** Milliseconds until `remindAt`, clamped to 0 for overdue reminders. */
export function delayMs(remindAt: Date, now: Date = new Date()): number {
  return Math.max(0, remindAt.getTime() - now.getTime());
}

export function isOverdue(remindAt: Date, now: Date = new Date()): boolean {
  return remindAt.getTime() <= now.getTime();
}

/** Deterministic BullMQ job id so re-enqueueing the same reminder is a no-op. */
export function reminderJobId(reminderId: string): string {
  return `reminder:${reminderId}`;
}
