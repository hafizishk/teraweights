import { describe, expect, it } from "vitest";
import { chronological, formatDelta, maxSplit, personalBest, withDeltas, type ResultRow } from "./results";

/** Aisyah's seeded results: 48:12 → 44:37 → 41:05. */
const JUL25: ResultRow = { eventId: "e5", eventSlug: "parox-jul-2025", eventName: "PA.ROX July 2025", eventType: "parox", eventDate: "2025-07-12", division: "open", totalSeconds: 2892, rank: 6, splits: [] };
const APR26: ResultRow = { eventId: "e6", eventSlug: "parox-apr-2026", eventName: "PA.ROX April 2026", eventType: "parox", eventDate: "2026-04-11", division: "open", totalSeconds: 2677, rank: 6, splits: [] };
const AUG26: ResultRow = { eventId: "e4", eventSlug: "kampung-grind-aug-2026", eventName: "Kampung Grind (August)", eventType: "kampung_grind", eventDate: "2026-08-22", division: "open", totalSeconds: 2465, rank: 4, splits: null };

describe("chronological", () => {
  it("sorts oldest first regardless of input order", () => {
    expect(chronological([AUG26, JUL25, APR26]).map((r) => r.eventSlug)).toEqual([
      "parox-jul-2025",
      "parox-apr-2026",
      "kampung-grind-aug-2026",
    ]);
  });
});

describe("personalBest", () => {
  it("is Aisyah's 41:05 from Kampung Grind (demo script step 4)", () => {
    expect(personalBest([JUL25, APR26, AUG26])?.totalSeconds).toBe(2465);
  });

  it("ignores community events", () => {
    const walk: ResultRow = { ...AUG26, eventId: "x", eventType: "community", totalSeconds: 100 };
    expect(personalBest([JUL25, walk])?.eventId).toBe("e5");
  });

  it("is null with no races", () => {
    expect(personalBest([])).toBeNull();
  });
});

describe("withDeltas", () => {
  it("computes improvement edition to edition and flags the PB", () => {
    const rows = withDeltas([AUG26, JUL25, APR26]);
    expect(rows.map((r) => r.deltaSeconds)).toEqual([null, -215, -212]);
    expect(rows.map((r) => r.isPersonalBest)).toEqual([false, false, true]);
  });
});

describe("formatDelta", () => {
  it("formats faster, slower and level", () => {
    expect(formatDelta(-215)).toBe("−3:35");
    expect(formatDelta(65)).toBe("+1:05");
    expect(formatDelta(0)).toBe("±0:00");
  });
});

describe("maxSplit", () => {
  it("finds the longest station", () => {
    expect(maxSplit([{ seconds: 300 }, { seconds: 420 }, { seconds: 90 }])).toBe(420);
    expect(maxSplit([])).toBe(0);
  });
});
