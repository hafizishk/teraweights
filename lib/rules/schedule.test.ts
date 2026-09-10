import { describe, expect, it } from "vitest";
import { bulkSpecError, describeWeekdays, planSessions, type BulkSpec } from "./schedule";

const base: BulkSpec = {
  weekdays: [2, 4],
  time: "20:00",
  durationMinutes: 60,
  from: "2026-10-01",
  to: "2026-10-14",
};

describe("planSessions", () => {
  it("lands on every chosen weekday in the range", () => {
    const plan = planSessions(base);
    expect(plan).toHaveLength(4);
    expect(plan.map((p) => p.startsAt.toISOString())).toEqual([
      "2026-10-01T12:00:00.000Z", // Thu 1 Oct, 8pm SGT
      "2026-10-06T12:00:00.000Z", // Tue 6 Oct
      "2026-10-08T12:00:00.000Z", // Thu 8 Oct
      "2026-10-13T12:00:00.000Z", // Tue 13 Oct
    ]);
  });

  it("includes both end dates", () => {
    const plan = planSessions({ ...base, weekdays: [4], from: "2026-10-01", to: "2026-10-01" });
    expect(plan).toHaveLength(1);
  });

  it("adds the duration to each start", () => {
    const [first] = planSessions({ ...base, durationMinutes: 45 });
    expect(first.endsAt.getTime() - first.startsAt.getTime()).toBe(45 * 60_000);
  });

  it("returns nothing for a reversed range", () => {
    expect(planSessions({ ...base, from: "2026-10-14", to: "2026-10-01" })).toEqual([]);
  });

  it("treats the time as Singapore local", () => {
    const [first] = planSessions({ ...base, weekdays: [4], time: "07:30", to: "2026-10-01" });
    expect(first.startsAt.toISOString()).toBe("2026-09-30T23:30:00.000Z");
  });
});

describe("bulkSpecError", () => {
  it("accepts a sound spec", () => {
    expect(bulkSpecError(base)).toBeNull();
  });

  it("rejects an empty weekday list", () => {
    expect(bulkSpecError({ ...base, weekdays: [] })).toMatch(/weekday/i);
  });

  it("rejects a malformed time", () => {
    expect(bulkSpecError({ ...base, time: "8pm" })).toMatch(/HH:mm/);
  });

  it("rejects a range with none of the chosen days", () => {
    expect(bulkSpecError({ ...base, weekdays: [7], from: "2026-10-01", to: "2026-10-02" })).toMatch(
      /contains none/i,
    );
  });

  it("refuses to create more than the cap", () => {
    expect(bulkSpecError({ ...base, weekdays: [1, 2, 3, 4, 5, 6, 7], from: "2026-01-01", to: "2026-12-31" })).toMatch(
      /Narrow the range/,
    );
  });
});

describe("describeWeekdays", () => {
  it("joins two days with and", () => {
    expect(describeWeekdays([2, 4])).toBe("Tue and Thu");
  });

  it("sorts and de-duplicates", () => {
    expect(describeWeekdays([5, 1, 3, 1])).toBe("Mon, Wed and Fri");
  });
});
