/* eslint-disable @next/next/no-img-element */
/**
 * Avatar: the member's photo when they have one, otherwise initials. One
 * neutral colour for everyone; the photo is the personality, not the fill.
 */
export type Person = { name: string; src?: string | null };

export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Avatar({
  name,
  src,
  size = 28,
  ring = true,
  className = "",
}: {
  name: string | null | undefined;
  src?: string | null;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const label = name ?? "Energiser";
  const ringClass = ring ? "border-2 border-ink" : "";

  if (src) {
    return (
      <img
        src={src}
        alt={label}
        title={label}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${ringClass} ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-label={label}
      title={label}
      className={`display inline-flex shrink-0 items-center justify-center rounded-full bg-ink-3 leading-none text-paper ${ringClass} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initialsOf(name)}
    </span>
  );
}

/** Overlapping row of avatars, first `max` shown. */
export function AvatarRow({ people, max = 4, size = 28 }: { people: Person[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  if (shown.length === 0) return null;
  return (
    <span className="flex">
      {shown.map((p, i) => (
        <Avatar key={`${p.name}-${i}`} name={p.name} src={p.src} size={size} className={i > 0 ? "-ml-2" : ""} />
      ))}
    </span>
  );
}
