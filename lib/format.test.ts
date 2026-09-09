import { describe, expect, it } from "vitest";
import { formatDay, formatDayTime, formatMmSs, formatSgd, formatTime, parseMmSs } from "./format";

describe("formatSgd", () => {
  it("shows whole dollars without cents", () => {
    expect(formatSgd(58)).toBe("S$58");
    expect(formatSgd("260.00")).toBe("S$260");
  });
  it("keeps cents when present", () => {
    expect(formatSgd(19.5)).toBe("S$19.50");
  });
});

describe("mm:ss", () => {
  it("formats seconds", () => {
    expect(formatMmSs(2892)).toBe("48:12");
    expect(formatMmSs(2465)).toBe("41:05");
    expect(formatMmSs(3725)).toBe("62:05");
  });
  it("parses and round-trips", () => {
    expect(parseMmSs("48:12")).toBe(2892);
    expect(parseMmSs(" 41:05 ")).toBe(2465);
    expect(parseMmSs("48:75")).toBeNull();
    expect(parseMmSs("abc")).toBeNull();
  });
});

describe("Singapore time display", () => {
  const thu = "2026-09-10T12:00:00Z"; // 8pm SGT
  it("renders in Asia/Singapore", () => {
    expect(formatDay(thu)).toBe("Thu 10 Sep");
    expect(formatTime(thu)).toBe("8:00pm");
    expect(formatDayTime(thu)).toBe("Thu 10 Sep · 8:00pm");
  });
  it("handles early mornings that are the previous day in UTC", () => {
    expect(formatDayTime("2026-09-18T23:30:00Z")).toBe("Sat 19 Sep · 7:30am");
  });
});
