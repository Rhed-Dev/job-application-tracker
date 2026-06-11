import { describe, expect, it } from "vitest";
import { averageDaysInStage, daysInStage } from "@/lib/analytics";
import type { Status } from "@/lib/constants";

const day = (n: number) => new Date(Date.UTC(2026, 0, 1 + n)); // Jan 1 + n days
const event = (toStatus: Status, onDay: number) => ({ toStatus, at: day(onDay) });

describe("daysInStage", () => {
  it("returns an empty object for no events", () => {
    expect(daysInStage([], day(10))).toEqual({});
  });

  it("measures a single open stage up to `now`", () => {
    const result = daysInStage([event("SAVED", 0)], day(4));
    expect(result.SAVED).toBe(4);
  });

  it("splits time across a chain of transitions", () => {
    const events = [event("SAVED", 0), event("APPLIED", 3), event("INTERVIEWING", 10)];
    const result = daysInStage(events, day(12));
    expect(result.SAVED).toBe(3); // day 0 → 3
    expect(result.APPLIED).toBe(7); // day 3 → 10
    expect(result.INTERVIEWING).toBe(2); // day 10 → now (12)
  });

  it("sorts events before computing, regardless of input order", () => {
    const shuffled = [event("INTERVIEWING", 10), event("SAVED", 0), event("APPLIED", 3)];
    expect(daysInStage(shuffled, day(12))).toEqual(
      daysInStage([event("SAVED", 0), event("APPLIED", 3), event("INTERVIEWING", 10)], day(12)),
    );
  });

  it("accumulates time for revisited stages (multiple interview loops)", () => {
    const events = [
      event("APPLIED", 0),
      event("INTERVIEWING", 2),
      event("APPLIED", 5), // back to applied (e.g. new team)
      event("INTERVIEWING", 6),
    ];
    const result = daysInStage(events, day(10));
    expect(result.APPLIED).toBe(2 + 1); // 0→2 and 5→6
    expect(result.INTERVIEWING).toBe(3 + 4); // 2→5 and 6→10
  });

  it("never returns negative durations for out-of-order clocks", () => {
    const result = daysInStage([event("SAVED", 5)], day(3)); // now before the event
    expect(result.SAVED).toBe(0);
  });
});

describe("averageDaysInStage", () => {
  it("averages only across applications that visited the stage", () => {
    const perApp = [
      { SAVED: 2, APPLIED: 10 },
      { SAVED: 4 },
      { APPLIED: 20 },
    ] as Partial<Record<Status, number>>[];
    const rows = averageDaysInStage(perApp);
    const saved = rows.find((r) => r.status === "SAVED");
    const applied = rows.find((r) => r.status === "APPLIED");
    expect(saved).toEqual({ status: "SAVED", avgDays: 3, samples: 2 });
    expect(applied).toEqual({ status: "APPLIED", avgDays: 15, samples: 2 });
  });

  it("returns an empty list for no data", () => {
    expect(averageDaysInStage([])).toEqual([]);
  });
});
