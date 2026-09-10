import { describe, expect, it } from "vitest";
import { attendanceStreakWeeks, sessionsThisMonth, sessionsThisWeek } from "./streak";

/** Aisyah's seeded attendance: Tue/Thu 8pm East, 23 Jul → 8 Sep 2026 (SGT). */
const AISYAH = [
  "2026-07-23", "2026-07-28", "2026-07-30",
  "2026-08-04", "2026-08-06", "2026-08-11", "2026-08-13",
  "2026-08-18", "2026-08-20", "2026-08-25", "2026-08-27",
  "2026-09-01", "2026-09-03", "2026-09-08",
].map((d) => `${d}T12:00:00Z`); // 8pm SGT

const WED_9_SEP = new Date("2026-09-09T04:00:00Z");

describe("attendanceStreakWeeks", () => {
  it("counts Aisyah's 8 consecutive weeks", () => {
    expect(attendanceStreakWeeks(AISYAH, WED_9_SEP)).toBe(8);
  });

  it("is not broken by a new week that has not had a session yet", () => {
    const mon14Sep = new Date("2026-09-14T01:00:00Z"); // Mon 9am SGT, nothing attended yet
    expect(attendanceStreakWeeks(AISYAH, mon14Sep)).toBe(8);
  });

  it("breaks after a full week with no attendance", () => {
    const mon21Sep = new Date("2026-09-21T01:00:00Z");
    expect(attendanceStreakWeeks(AISYAH, mon21Sep)).toBe(0);
  });

  it("only counts the unbroken run", () => {
    const gappy = ["2026-08-04", "2026-08-25", "2026-09-01", "2026-09-08"].map((d) => `${d}T12:00:00Z`);
    expect(attendanceStreakWeeks(gappy, WED_9_SEP)).toBe(3);
  });

  it("handles Sunday sessions that are Saturday in UTC", () => {
    // Sun 6 Sep 7:30am SGT is Sat 5 Sep 23:30 UTC; it belongs to the week of Mon 31 Aug.
    const sundays = ["2026-09-05T23:30:00Z", "2026-09-12T23:30:00Z"];
    expect(attendanceStreakWeeks(sundays, new Date("2026-09-14T04:00:00Z"))).toBe(2);
  });

  it("is zero with nothing attended", () => {
    expect(attendanceStreakWeeks([], WED_9_SEP)).toBe(0);
  });
});

describe("sessionsThisMonth", () => {
  it("counts September for Aisyah", () => {
    expect(sessionsThisMonth(AISYAH, WED_9_SEP)).toBe(3);
  });

  it("uses the Singapore month boundary", () => {
    // 31 Aug 11pm SGT is 31 Aug 15:00 UTC; 1 Sep 1am SGT is 31 Aug 17:00 UTC.
    expect(sessionsThisMonth(["2026-08-31T15:00:00Z", "2026-08-31T17:00:00Z"], WED_9_SEP)).toBe(1);
  });
});

describe("sessionsThisWeek", () => {
  it("counts the current Singapore week only", () => {
    // Week of Mon 7 Sep: Aisyah attended Tue 8 Sep.
    expect(sessionsThisWeek(AISYAH, WED_9_SEP)).toBe(1);
    // Week of Mon 31 Aug: Tue 1 and Thu 3 Sep.
    expect(sessionsThisWeek(AISYAH, new Date("2026-09-04T04:00:00Z"))).toBe(2);
  });
});
