import Image from "next/image";

/**
 * A photo with a light brand wash: grayscale, a little red laid over it, and
 * a fade at the bottom so type can sit on it. Deliberately restrained. The
 * photo should still look like a photo, and the red is a tint, not a poster
 * filter. Real photography from the client will do the rest.
 */
export function DuotonePhoto({
  src,
  fadeTo = "ink",
  className = "",
  sizes = "480px",
  priority = false,
  children,
}: {
  src: string;
  fadeTo?: "ink" | "card" | "none";
  className?: string;
  sizes?: string;
  priority?: boolean;
  children?: React.ReactNode;
}) {
  const fade =
    fadeTo === "ink"
      ? "bg-gradient-to-b from-ink/10 via-ink/30 to-ink"
      : fadeTo === "card"
        ? "bg-gradient-to-b from-ink-2/10 via-ink-2/40 to-ink-2"
        : "";

  return (
    <div className={`relative overflow-hidden bg-ink-2 ${className}`}>
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover grayscale contrast-110 brightness-[0.85]"
      />
      <div aria-hidden className="absolute inset-0 bg-brand opacity-45 mix-blend-multiply" />
      {fade ? <div aria-hidden className={`absolute inset-0 ${fade}`} /> : null}
      {children ? <div className="relative flex h-full flex-col justify-end">{children}</div> : null}
    </div>
  );
}
