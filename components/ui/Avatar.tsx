/** Initials avatar. Colour is derived from the name so it is stable across renders. */
const PALETTE = ["#2b6cb0", "#b11226", "#3a3a3a", "#f2c230"];
const INK_ON = new Set(["#f2c230"]);

export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function colourFor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function Avatar({
  name,
  size = 28,
  ring = true,
  className = "",
}: {
  name: string | null | undefined;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const label = name ?? "Energiser";
  const bg = colourFor(label);
  return (
    <span
      aria-label={label}
      title={label}
      className={`display inline-flex shrink-0 items-center justify-center rounded-full leading-none ${
        ring ? "border-2 border-ink-2" : ""
      } ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        color: INK_ON.has(bg) ? "#0b0b0b" : "#f4f1ec",
        fontSize: Math.round(size * 0.4),
      }}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Overlapping row of avatars, first `max` shown. */
export function AvatarRow({ names, max = 4, size = 28 }: { names: string[]; max?: number; size?: number }) {
  const shown = names.slice(0, max);
  if (shown.length === 0) return null;
  return (
    <span className="flex">
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={size} className={i > 0 ? "-ml-2" : ""} />
      ))}
    </span>
  );
}
