import type { Sample } from "@/lib/rules/zones";

/**
 * The heart-rate line across the session, drawn server-side as an SVG.
 * Three quiet gridlines with their bpm on the left; no axis ticks, no dots.
 */
export function HeartRateTrace({ samples, maxHr }: { samples: Sample[]; maxHr: number }) {
  const w = 320;
  const h = 96;
  const pad = { l: 22, r: 4, t: 6, b: 4 };
  const sorted = [...samples].sort((a, b) => a[0] - b[0]);
  if (sorted.length < 2) return null;

  const t0 = sorted[0][0];
  const t1 = sorted[sorted.length - 1][0];
  const lo = Math.max(40, Math.min(...sorted.map((s) => s[1])) - 10);
  const hi = Math.min(maxHr + 10, Math.max(...sorted.map((s) => s[1])) + 10);
  const x = (t: number) => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * (w - pad.l - pad.r);
  const y = (bpm: number) => pad.t + (1 - (bpm - lo) / Math.max(1, hi - lo)) * (h - pad.t - pad.b);
  const points = sorted.map((s) => `${x(s[0]).toFixed(1)},${y(s[1]).toFixed(1)}`).join(" ");

  const grid = [0.25, 0.5, 0.75].map((f) => Math.round((lo + (hi - lo) * f) / 10) * 10);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Heart rate over the session">
      {grid.map((bpm) => (
        <g key={bpm}>
          <line x1={pad.l} x2={w - pad.r} y1={y(bpm)} y2={y(bpm)} stroke="var(--color-ink-3)" strokeWidth="1" />
          <text x={0} y={y(bpm) + 3} fill="var(--color-muted)" fontSize="8" fontFamily="var(--font-sans)">
            {bpm}
          </text>
        </g>
      ))}
      <polyline fill="none" stroke="var(--color-brand)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={points} />
    </svg>
  );
}
