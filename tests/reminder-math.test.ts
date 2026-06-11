import { describe, expect, it } from "vitest";
import {
  DEFAULT_REMINDER_HOUR,
  computeRemindAt,
  delayMs,
  isOverdue,
  reminderJobId,
} from "@/lib/reminder-math";

// 08:30 local time — before the default 9:00 send hour.
const MORNING = new Date(2026, 5, 12, 8, 30, 0, 0);
// 15:00 local time — after it.
const AFTERNOON = new Date(2026, 5, 12, 15, 0, 0, 0);

describe("computeRemindAt", () => {
  it("schedules N days out at the default hour (9:00 local)", () => {
    const result = computeRemindAt(AFTERNOON, 5);
    expect(result.getDate()).toBe(17);
    expect(result.getHours()).toBe(DEFAULT_REMINDER_HOUR);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it("supports a custom send hour", () => {
    const result = computeRemindAt(AFTERNOON, 3, 18);
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(18);
  });

  it("rolls across month boundaries", () => {
    const result = computeRemindAt(new Date(2026, 5, 29, 10, 0), 5);
    expect(result.getMonth()).toBe(6); // July
    expect(result.getDate()).toBe(4);
  });

  it("fires same-day reminders later today when the hour is still ahead", () => {
    const result = computeRemindAt(MORNING, 0);
    expect(result.getDate()).toBe(MORNING.getDate());
    expect(result.getHours()).toBe(DEFAULT_REMINDER_HOUR);
    expect(result.getTime()).toBeGreaterThan(MORNING.getTime());
  });

  it("never schedules into the past — clamps to `from` instead", () => {
    // “In 0 days” at 15:00 would land at 9:00 the same morning; the helper
    // returns `from` so the job fires immediately rather than silently never.
    const result = computeRemindAt(AFTERNOON, 0);
    expect(result.getTime()).toBe(AFTERNOON.getTime());
  });

  it("floors fractional day counts", () => {
    expect(computeRemindAt(AFTERNOON, 2.9).getDate()).toBe(14);
  });

  it("rejects negative and non-finite day counts", () => {
    expect(() => computeRemindAt(AFTERNOON, -1)).toThrow(RangeError);
    expect(() => computeRemindAt(AFTERNOON, Number.NaN)).toThrow(RangeError);
    expect(() => computeRemindAt(AFTERNOON, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("delayMs", () => {
  it("returns the exact millisecond gap for future reminders", () => {
    const remindAt = new Date(AFTERNOON.getTime() + 90_000);
    expect(delayMs(remindAt, AFTERNOON)).toBe(90_000);
  });

  it("clamps overdue reminders to zero so BullMQ runs them immediately", () => {
    const past = new Date(AFTERNOON.getTime() - 90_000);
    expect(delayMs(past, AFTERNOON)).toBe(0);
  });
});

describe("isOverdue", () => {
  it("is inclusive at the boundary", () => {
    expect(isOverdue(AFTERNOON, AFTERNOON)).toBe(true);
    expect(isOverdue(new Date(AFTERNOON.getTime() + 1), AFTERNOON)).toBe(false);
  });
});

describe("reminderJobId", () => {
  it("is deterministic so re-enqueueing is idempotent", () => {
    expect(reminderJobId("abc123")).toBe("reminder:abc123");
    expect(reminderJobId("abc123")).toBe(reminderJobId("abc123"));
  });
});
