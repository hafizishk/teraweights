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
    return (
      <p className="rounded-lg border border-dashed border-ink-3 px-4 py-8 text-center text-sm text-muted">
        Results are visible to Energisers who took part.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Division" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {chips.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setDivision(key)}
            aria-pressed={key === division}
            className={`display shrink-0 rounded-full border px-3 py-1.5 text-base leading-none tracking-wide ${
              key === division ? "border-brand bg-brand text-paper" : "border-ink-3 text-muted hover:text-paper"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <ol className="flex flex-col gap-1">
        {shown.map((r) => {
          const me = r.member_id === meId;
          return (
            <li
              key={r.id}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 ${
                me ? "border border-brand bg-brand/10" : "border border-transparent"
              }`}
            >
              <span className="display w-8 text-xl leading-none text-muted">{r.rank ?? "–"}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={`truncate text-sm ${me ? "font-semibold" : ""}`}>
                  {r.display_name}
                  {me ? " (you)" : ""}
                </span>
                {division === "all" ? (
                  <span className="text-xs capitalize text-muted">{r.division}</span>
                ) : null}
              </span>
              <span className="display text-xl leading-none">{formatMmSs(r.total_seconds)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
