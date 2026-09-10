import { describe, expect, it } from "vitest";
import { matchResults, parseResultsCsv, rankResults, splitCsvLine } from "./results-import";

const csv = [
  "name,email,division,time,splits",
  "Aisyah Rahman,aisyah@example.com,open,41:05,1km run 5:12; sled 2:40",
  "Marcus Tan,,open,39:58,",
  '"Tan, Wei Lin",weilin@example.com,doubles,44:20,',
].join("\n");

describe("splitCsvLine", () => {
  it("keeps commas inside quotes", () => {
    expect(splitCsvLine('"Tan, Wei Lin",x')).toEqual(["Tan, Wei Lin", "x"]);
  });

  it("unescapes doubled quotes", () => {
    expect(splitCsvLine('"She said ""go""",b')).toEqual(['She said "go"', "b"]);
  });
});

describe("parseResultsCsv", () => {
  it("reads every well-formed row", () => {
    const { rows, errors } = parseResultsCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);
    expect(rows[0].totalSeconds).toBe(2465);
    expect(rows[0].splits).toEqual([
      { station: "1km run", seconds: 312 },
      { station: "sled", seconds: 160 },
    ]);
    expect(rows[2].displayName).toBe("Tan, Wei Lin");
  });

  it("defaults a missing division to open", () => {
    const { rows } = parseResultsCsv("name,time\nAisyah Rahman,41:05");
    expect(rows[0].division).toBe("open");
  });

  it("collects bad rows without losing good ones", () => {
    const { rows, errors } = parseResultsCsv("name,time\nAisyah Rahman,41:05\nMarcus Tan,forty minutes");
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([{ line: 3, message: '"forty minutes" is not a mm:ss time.' }]);
  });

  it("rejects a header with no time column", () => {
    const { errors } = parseResultsCsv("name,email\nAisyah,a@b.c");
    expect(errors[0].message).toMatch(/name and a time/);
  });
});

describe("matchResults", () => {
  const candidates = [
    { id: "m1", email: "aisyah@example.com", fullName: "Aisyah Rahman", registrationId: "r1" },
    { id: "m2", email: "marcus@example.com", fullName: "Marcus Tan" },
    { id: "m3", email: "other@example.com", fullName: "Marcus Tan" },
  ];

  it("matches on email first", () => {
    const { rows } = parseResultsCsv(csv);
    const [first] = matchResults(rows, candidates);
    expect(first.memberId).toBe("m1");
    expect(first.matchedOn).toBe("email");
    expect(first.registrationId).toBe("r1");
  });

  it("leaves an ambiguous name unmatched", () => {
    const { rows } = parseResultsCsv(csv);
    const marcus = matchResults(rows, candidates)[1];
    expect(marcus.memberId).toBeNull();
    expect(marcus.matchedOn).toBeNull();
  });

  it("matches a unique name when no email is given", () => {
    const { rows } = parseResultsCsv("name,time\nMarcus Tan,39:58");
    const [row] = matchResults(rows, [candidates[1]]);
    expect(row.memberId).toBe("m2");
    expect(row.matchedOn).toBe("name");
  });
});

describe("rankResults", () => {
  it("ranks within each division, fastest first", () => {
    const { rows } = parseResultsCsv(csv);
    const ranked = rankResults(matchResults(rows, []));
    expect(ranked.find((r) => r.displayName === "Marcus Tan")!.rank).toBe(1);
    expect(ranked.find((r) => r.displayName === "Aisyah Rahman")!.rank).toBe(2);
    expect(ranked.find((r) => r.division === "doubles")!.rank).toBe(1);
  });

  it("shares a rank on equal times and skips the next", () => {
    const { rows } = parseResultsCsv("name,time\nA,40:00\nB,40:00\nC,41:00");
    const ranked = rankResults(matchResults(rows, []));
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });
});
