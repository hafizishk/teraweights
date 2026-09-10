import Image from "next/image";

/**
 * Photo under the brand duotone: grayscale image, red multiply, fade to the
 * surface colour at the bottom so text sits on it. Any photo reads on-brand.
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
      ? "bg-gradient-to-b from-ink/15 via-ink/35 to-ink"
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
        className="object-cover grayscale contrast-125 brightness-[0.72]"
      />
      <div aria-hidden className="absolute inset-0 bg-brand opacity-80 mix-blend-multiply" />
      {fade ? <div aria-hidden className={`absolute inset-0 ${fade}`} /> : null}
      {children ? <div className="relative flex h-full flex-col justify-end">{children}</div> : null}
    </div>
  );
}
