import { formatMmSs } from "@/lib/format";
import { maxSplit } from "@/lib/rules/results";

/** Station splits as a simple bar list (brief section 8). */
export function SplitsBars({ splits }: { splits: { station: string; seconds: number }[] }) {
  const max = maxSplit(splits) || 1;
  return (
    <ol className="flex flex-col gap-2.5">
      {splits.map((s, i) => (
        <li key={`${s.station}-${i}`} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between text-sm">
            <span>{s.station}</span>
            <span className="display text-lg leading-none">{formatMmSs(s.seconds)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-3">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, (s.seconds / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
