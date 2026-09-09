import type { ClassSlug } from "@/lib/types";

/** Class badge colours — brief section 10. */
const classStyles: Record<ClassSlug, string> = {
  energise_east: "bg-brand text-paper",
  energise_west: "bg-west text-paper",
  prime: "bg-prime text-ink",
  fitness_engine: "border border-paper text-paper",
};

const classLabels: Record<ClassSlug, string> = {
  energise_east: "East",
  energise_west: "West",
  prime: "PRIME",
  fitness_engine: "Fitness Engine",
};

export function ClassBadge({ slug, className = "" }: { slug: ClassSlug; className?: string }) {
  return (
    <span
      className={`display inline-flex h-6 items-center rounded px-2 text-sm leading-none tracking-wide ${classStyles[slug]} ${className}`}
    >
      {classLabels[slug]}
    </span>
  );
}

export function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded bg-ink-3 px-2 text-xs font-medium text-paper ${className}`}
    >
      {children}
    </span>
  );
}
