import { ZONE_LABELS, zoneShares, type ZoneSummary } from "@/lib/rules/zones";

/** Zone bar colours: easy grey, then West blue, green, PRIME yellow, brand red. */
const ZONE_CLASSES = ["bg-ink-3", "bg-west", "bg-[#4c9a5a]", "bg-prime", "bg-brand"];

/** Three numbers and the zone bar. Used on You and on the session page. */
export function SessionMetrics({ summary, kcal, compact = false }: { summary: ZoneSummary; kcal: number | null; compact?: boolean }) {
  const shares = zoneShares(summary.zoneMinutes);
  const size = compact ? "text-[30px]" : "text-[34px]";
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3">
        <Stat value={summary.avgBpm} label="avg bpm" size={size} />
        <Stat value={summary.maxBpm} label="max bpm" size={size} />
        <Stat value={kcal ?? "—"} label="kcal" size={size} />
      </div>
      <ZoneBar shares={shares} minutes={summary.zoneMinutes} />
    </div>
  );
}

function Stat({ value, label, size }: { value: number | string; label: string; size: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`display tnum leading-none ${size}`}>{value}</span>
      <span className="eyebrow">{label}</span>
    </div>
  );
}

export function ZoneBar({ shares, minutes }: { shares: number[]; minutes: readonly number[] }) {
  return (
    <div className="flex flex-col gap-1" role="img" aria-label={ZONE_LABELS.map((l, i) => `${l} ${minutes[i]} min`).join(", ")}>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-sm">
        {shares.map((w, i) =>
          w > 0 ? <span key={i} className={`block ${ZONE_CLASSES[i]}`} style={{ width: `${w}%` }} /> : null,
        )}
      </div>
      <div className="flex justify-between text-[10px] text-muted">
        {ZONE_LABELS.map((l, i) => (
          <span key={l}>
            {l} {minutes[i]}m
          </span>
        ))}
      </div>
    </div>
  );
}
