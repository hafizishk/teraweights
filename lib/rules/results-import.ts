import { parseMmSs } from "@/lib/format";

/**
 * Results CSV import (brief section 9): parse, then match each row to a member
 * so the admin sees what will happen before confirming. Pure — the matching
 * candidates are passed in, not queried.
 *
 * Expected header, in any order and any case:
 *   name, email, division, time, splits
 * `time` is mm:ss. `splits` is optional, formatted "1km run 5:12; sled 2:40".
 */

export type ResultRow = {
  /** 1-based row number in the file, for error messages. */
  line: number;
  displayName: string;
  email: string | null;
  division: Division;
  totalSeconds: number;
  splits: Split[] | null;
};

export type Split = { station: string; seconds: number };

export const DIVISIONS = ["open", "doubles", "relay", "family"] as const;
export type Division = (typeof DIVISIONS)[number];

export type ParsedResults = {
  rows: ResultRow[];
  errors: { line: number; message: string }[];
};

export type Candidate = { id: string; email: string | null; fullName: string | null; registrationId?: string | null };

export type MatchedRow = ResultRow & {
  memberId: string | null;
  registrationId: string | null;
  matchedOn: "email" | "name" | null;
};

/** Splits one CSV line, honouring double quotes and doubled quotes inside them. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(field.trim());
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field.trim());
  return out;
}

function parseSplits(value: string): Split[] | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const out: Split[] = [];
  for (const part of trimmed.split(";")) {
    const piece = part.trim();
    if (!piece) continue;
    const m = /^(.*?)\s+(\d{1,3}:[0-5]\d)$/.exec(piece);
    if (!m) return null;
    const seconds = parseMmSs(m[2]);
    if (seconds === null) return null;
    out.push({ station: m[1].trim(), seconds });
  }
  return out.length > 0 ? out : null;
}

/** Parses the whole file. Bad rows are collected rather than aborting. */
export function parseResultsCsv(text: string): ParsedResults {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { rows: [], errors: [{ line: 0, message: "The file is empty." }] };

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const at = (name: string) => header.indexOf(name);
  const nameAt = at("name");
  const timeAt = at("time");
  if (nameAt === -1 || timeAt === -1) {
    return { rows: [], errors: [{ line: 1, message: "The header needs at least a name and a time column." }] };
  }
  const emailAt = at("email");
  const divisionAt = at("division");
  const splitsAt = at("splits");

  const rows: ResultRow[] = [];
  const errors: ParsedResults["errors"] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = i + 1;
    const cells = splitCsvLine(lines[i]);
    const displayName = (cells[nameAt] ?? "").trim();
    if (!displayName) {
      errors.push({ line, message: "No name." });
      continue;
    }

    const totalSeconds = parseMmSs(cells[timeAt] ?? "");
    if (totalSeconds === null) {
      errors.push({ line, message: `"${cells[timeAt] ?? ""}" is not a mm:ss time.` });
      continue;
    }

    const rawDivision = (divisionAt === -1 ? "" : (cells[divisionAt] ?? "")).trim().toLowerCase();
    const division = (DIVISIONS as readonly string[]).includes(rawDivision) ? (rawDivision as Division) : "open";
    if (rawDivision && division !== rawDivision) {
      errors.push({ line, message: `Unknown division "${rawDivision}".` });
      continue;
    }

    let splits: Split[] | null = null;
    if (splitsAt !== -1 && (cells[splitsAt] ?? "").trim()) {
      splits = parseSplits(cells[splitsAt]);
      if (splits === null) {
        errors.push({ line, message: "Splits must read like \"1km run 5:12; sled 2:40\"." });
        continue;
      }
    }

    const email = emailAt === -1 ? null : (cells[emailAt] ?? "").trim().toLowerCase() || null;
    rows.push({ line, displayName, email, division, totalSeconds, splits });
  }

  return { rows, errors };
}

function normaliseName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Attaches a member to each row. Email wins; a unique full-name match is the
 * fallback, because paper sign-up sheets rarely carry an address. An ambiguous
 * name stays unmatched rather than guessing.
 */
export function matchResults(rows: ResultRow[], candidates: Candidate[]): MatchedRow[] {
  const byEmail = new Map<string, Candidate>();
  const byName = new Map<string, Candidate[]>();

  for (const c of candidates) {
    if (c.email) byEmail.set(c.email.toLowerCase(), c);
    if (c.fullName) {
      const key = normaliseName(c.fullName);
      byName.set(key, [...(byName.get(key) ?? []), c]);
    }
  }

  return rows.map((row) => {
    const viaEmail = row.email ? byEmail.get(row.email) : undefined;
    if (viaEmail) {
      return { ...row, memberId: viaEmail.id, registrationId: viaEmail.registrationId ?? null, matchedOn: "email" };
    }
    const named = byName.get(normaliseName(row.displayName)) ?? [];
    if (named.length === 1) {
      return { ...row, memberId: named[0].id, registrationId: named[0].registrationId ?? null, matchedOn: "name" };
    }
    return { ...row, memberId: null, registrationId: null, matchedOn: null };
  });
}

/**
 * Ranks within each division by time, fastest first. Equal times share a rank,
 * and the next rank skips, the way a results sheet reads.
 */
export function rankResults(rows: MatchedRow[]): (MatchedRow & { rank: number })[] {
  const out: (MatchedRow & { rank: number })[] = [];

  for (const division of DIVISIONS) {
    const inDivision = rows
      .filter((r) => r.division === division)
      .sort((a, b) => a.totalSeconds - b.totalSeconds || a.line - b.line);

    let rank = 0;
    let previous: number | null = null;
    inDivision.forEach((row, index) => {
      if (previous === null || row.totalSeconds !== previous) rank = index + 1;
      previous = row.totalSeconds;
      out.push({ ...row, rank });
    });
  }

  return out.sort((a, b) => a.line - b.line);
}
