import { formatMmSs } from "@/lib/format";
import { maxSplit } from "@/lib/rules/results";

/** Station splits as a bar list (brief section 8). Square-ended bars; the longest fills the line. */
export function SplitsBars({ splits }: { splits: { station: string; seconds: number }[] }) {
  const max = maxSplit(splits) || 1;
  return (
    <ol>
      {splits.map((s, i) => (
        <li key={`${s.station}-${i}`} className="rule flex flex-col gap-1.5 py-2.5">
          <div className="flex items-baseline justify-between text-sm">
            <span>{s.station}</span>
            <span className="display tnum text-lg leading-none">{formatMmSs(s.seconds)}</span>
          </div>
          <div className="h-1.5 w-full bg-ink-3">
            <div className="h-full bg-brand" style={{ width: `${Math.max(3, (s.seconds / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
