import { describe, expect, it } from "vitest";
import {
  computeFunnel,
  computeSourceStats,
  reachedRank,
  weeklyCounts,
} from "@/lib/analytics";
import type { Status } from "@/lib/constants";

const chain = (...statuses: Status[]) => statuses.map((toStatus) => ({ toStatus }));

describe("reachedRank", () => {
  it("tracks the furthest funnel stage ever reached", () => {
    expect(reachedRank(chain("SAVED"))).toBe(0);
    expect(reachedRank(chain("SAVED", "APPLIED"))).toBe(1);
    expect(reachedRank(chain("SAVED", "APPLIED", "INTERVIEWING"))).toBe(2);
    expect(reachedRank(chain("SAVED", "APPLIED", "INTERVIEWING", "OFFER"))).toBe(3);
  });

  it("does not lose progress on terminal-negative outcomes", () => {
    // Rejected after interviewing still counts as having reached interviews.
    expect(reachedRank(chain("SAVED", "APPLIED", "INTERVIEWING", "REJECTED"))).toBe(2);
    expect(reachedRank(chain("APPLIED", "GHOSTED"))).toBe(1);
  });
});

describe("computeFunnel", () => {
  it("handles an empty board without dividing by zero", () => {
    expect(computeFunnel([])).toEqual({
      applied: 0,
      interviewing: 0,
      offer: 0,
      interviewRate: 0,
      offerRate: 0,
      overallRate: 0,
    });
  });

  it("computes stage counts and conversion rates", () => {
    const apps = [
      chain("SAVED", "APPLIED"), // applied only
      chain("SAVED", "APPLIED", "INTERVIEWING"), // reached interviews
      chain("SAVED", "APPLIED", "INTERVIEWING", "REJECTED"), // interviews, then rejected
      chain("SAVED", "APPLIED", "INTERVIEWING", "OFFER"), // full funnel
      chain("SAVED"), // never applied
    ];
    const funnel = computeFunnel(apps);
    expect(funnel.applied).toBe(4);
    expect(funnel.interviewing).toBe(3);
    expect(funnel.offer).toBe(1);
    expect(funnel.interviewRate).toBeCloseTo(3 / 4);
    expect(funnel.offerRate).toBeCloseTo(1 / 3);
    expect(funnel.overallRate).toBeCloseTo(1 / 4);
  });

  it("counts skipped stages via the implied funnel rank", () => {
    // Dragging a card straight from Saved to Offer implies it passed
    // Applied and Interviewing for funnel purposes.
    const funnel = computeFunnel([chain("SAVED", "OFFER")]);
    expect(funnel).toMatchObject({ applied: 1, interviewing: 1, offer: 1 });
  });
});

describe("computeSourceStats", () => {
  it("treats interviews, offers, AND rejections as responses — but not ghosting", () => {
    const apps = [
      { source: "LINKEDIN" as const, events: chain("APPLIED", "INTERVIEWING") },
      { source: "LINKEDIN" as const, events: chain("APPLIED", "GHOSTED") },
      { source: "REFERRAL" as const, events: chain("APPLIED", "REJECTED") },
      { source: "REFERRAL" as const, events: chain("APPLIED", "OFFER") },
    ];
    const stats = computeSourceStats(apps);
    const linkedin = stats.find((s) => s.source === "LINKEDIN");
    const referral = stats.find((s) => s.source === "REFERRAL");
    expect(linkedin).toMatchObject({ total: 2, responded: 1, rate: 0.5 });
    expect(referral).toMatchObject({ total: 2, responded: 2, rate: 1 });
  });

  it("sorts sources by volume", () => {
    const apps = [
      { source: "OTHER" as const, events: chain("APPLIED") },
      { source: "LINKEDIN" as const, events: chain("APPLIED") },
      { source: "LINKEDIN" as const, events: chain("APPLIED") },
    ];
    expect(computeSourceStats(apps).map((s) => s.source)).toEqual(["LINKEDIN", "OTHER"]);
  });
});

describe("weeklyCounts", () => {
  it("buckets dates into trailing calendar weeks (Monday start)", () => {
    const now = new Date(2026, 5, 12); // Friday, June 12 2026 → week of June 8
    const dates = [
      new Date(2026, 5, 10), // this week
      new Date(2026, 5, 8), // this week (Monday boundary)
      new Date(2026, 5, 3), // last week
      new Date(2026, 0, 1), // far outside the 12-week window — ignored
    ];
    const buckets = weeklyCounts(dates, 12, now);
    expect(buckets).toHaveLength(12);
    expect(buckets[11]).toEqual({ weekStart: "2026-06-08", count: 2 });
    expect(buckets[10]).toEqual({ weekStart: "2026-06-01", count: 1 });
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(3);
  });
});
