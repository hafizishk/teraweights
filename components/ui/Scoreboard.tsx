/**
 * A row of big numbers with small labels, ruled above and below. No boxes:
 * the numerals are the graphic. Used for the community pulse on Home and the
 * personal stats on My PA.ROX so the two never drift apart.
 */
export type ScoreboardItem = { value: string | number; label: string; accent?: boolean };

export function Scoreboard({ items }: { items: ScoreboardItem[] }) {
  return (
    <div
      className="rule grid border-b border-ink-3"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((it, i) => (
        <div key={i} className={`flex flex-col gap-1.5 py-3 ${i > 0 ? "border-l border-ink-3 pl-3" : ""}`}>
          <span className={`display tnum text-[34px] leading-none ${it.accent ? "text-prime" : ""}`}>{it.value}</span>
          <span className="eyebrow">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
