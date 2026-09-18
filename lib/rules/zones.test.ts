import { describe, expect, it } from "vitest";
import { compareLine, maxHeartRate, sessionLine, summariseSamples, zoneOf, zoneShares, type Sample } from "./zones";

describe("zones", () => {
  it("falls back to the default max when the profile has none or nonsense", () => {
    expect(maxHeartRate(null)).toBe(190);
    expect(maxHeartRate(80)).toBe(190);
    expect(maxHeartRate(184)).toBe(184);
  });

  it("bands a heart rate by share of max", () => {
    expect(zoneOf(100, 190)).toBe(0);
    expect(zoneOf(114, 190)).toBe(1); // 60%
    expect(zoneOf(133, 190)).toBe(2); // 70%
    expect(zoneOf(152, 190)).toBe(3); // 80%
    expect(zoneOf(171, 190)).toBe(4); // 90%
  });

  it("summarises samples with each covering the gap to the next", () => {
    // 10 minutes easy, 10 minutes hard, 10 minutes max, one sample a minute.
    const samples: Sample[] = [];
    for (let m = 0; m < 30; m++) samples.push([m * 60, m < 10 ? 100 : m < 20 ? 155 : 175]);
    const s = summariseSamples(samples, 190)!;
    expect(s.zoneMinutes).toEqual([10, 0, 0, 10, 10]);
    expect(s.hardMinutes).toBe(20);
    expect(s.maxBpm).toBe(175);
    expect(s.avgBpm).toBe(Math.round((100 + 155 + 175) / 3));
    expect(s.totalMinutes).toBe(30);
  });

  it("returns null for no samples and ignores order", () => {
    expect(summariseSamples([], 190)).toBeNull();
    const a = summariseSamples([[60, 150], [0, 100], [120, 170]], 190)!;
    const b = summariseSamples([[0, 100], [60, 150], [120, 170]], 190)!;
    expect(a).toEqual(b);
  });

  it("turns minutes into bar widths", () => {
    expect(zoneShares([5, 8, 18, 20, 9])).toEqual([8, 13, 30, 33, 15]);
    expect(zoneShares([0, 0, 0, 0, 0])).toEqual([0, 0, 0, 0, 0]);
  });

  it("writes the comparison and the session line", () => {
    expect(compareLine({ avgBpm: 148, hardMinutes: 29, kcal: 512 }, { avgBpm: 142, hardMinutes: 25, kcal: 471 })).toBe(
      "Avg up 6 bpm · 4 more minutes hard · 41 kcal more",
    );
    expect(compareLine({ avgBpm: 140, hardMinutes: 20, kcal: null }, { avgBpm: 140, hardMinutes: 22, kcal: 400 })).toBe(
      "Avg unchanged · 2 fewer minutes hard",
    );
    expect(compareLine({ avgBpm: 1, hardMinutes: 1, kcal: 1 }, null)).toBeNull();
    const s = summariseSamples([[0, 160], [60, 160]], 190)!;
    expect(sessionLine(s, true)).toBe("2 minutes above 80%. Your hardest session this month.");
    expect(sessionLine({ ...s, hardMinutes: 1 }, false)).toBe("1 minute above 80%.");
  });
});
