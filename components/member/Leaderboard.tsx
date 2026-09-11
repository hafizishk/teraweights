"use client";

import { useMemo, useState } from "react";
import { formatMmSs } from "@/lib/format";
import type { LeaderboardRow } from "@/lib/queries/events";

const DIVISIONS: { key: LeaderboardRow["division"] | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "doubles", label: "Doubles" },
  { key: "relay", label: "Relay" },
  { key: "family", label: "Family" },
];

const ORDER: Record<LeaderboardRow["division"], number> = { open: 0, doubles: 1, relay: 2, family: 3 };

/** A results sheet: rank, name, time, one hairline per row. Your own row is marked in red. */
export function Leaderboard({ rows, meId }: { rows: LeaderboardRow[]; meId: string }) {
  const present = new Set(rows.map((r) => r.division));
  const chips = DIVISIONS.filter((d) => d.key === "all" || present.has(d.key));
  const [division, setDivision] = useState<(typeof DIVISIONS)[number]["key"]>("all");

  const shown = useMemo(() => {
    const list = division === "all" ? rows : rows.filter((r) => r.division === division);
    return [...list].sort((a, b) =>
      division === "all"
        ? ORDER[a.division] - ORDER[b.division] || a.total_seconds - b.total_seconds
        : a.total_seconds - b.total_seconds,
    );
  }, [rows, division]);

  if (rows.length === 0) {
    return <p className="rule py-8 text-sm text-muted">Results are visible to Energisers who took part.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Division" className="-mx-4 flex gap-5 overflow-x-auto border-b border-ink-3 px-4">
        {chips.map(({ key, label }) => {
          const active = key === division;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setDivision(key)}
              aria-pressed={active}
              className={`display -mb-px shrink-0 border-b-2 pb-2 text-lg leading-none tracking-wide ${
                active ? "border-brand text-paper" : "border-transparent text-muted hover:text-paper"
              }`}
            >
              {label}
            </button>
          );
        })}
      </nav>

      <ol>
        {shown.map((r) => {
          const me = r.member_id === meId;
          return (
            <li
              key={r.id}
              className={`rule flex items-center gap-3 py-2.5 ${me ? "border-l-2 border-l-brand pl-3" : ""}`}
            >
              <span className="display tnum w-8 text-xl leading-none text-muted">{r.rank ?? "–"}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={`truncate text-sm ${me ? "font-semibold" : ""}`}>
                  {r.display_name}
                  {me ? " (you)" : ""}
                </span>
                {division === "all" ? <span className="eyebrow capitalize">{r.division}</span> : null}
              </span>
              <span className="display tnum text-[22px] leading-none">{formatMmSs(r.total_seconds)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
