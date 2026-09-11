import type { ClassSlug } from "@/lib/types";

/**
 * Class marks — brief section 10. Small and solid, like a swing tag, so they
 * read as a mark beside the time rather than a button.
 */
const classStyles: Record<ClassSlug, string> = {
  energise_east: "bg-brand text-paper",
  energise_west: "bg-west text-paper",
  prime: "bg-prime text-ink",
  fitness_engine: "border border-paper/70 text-paper",
};

const classLabels: Record<ClassSlug, string> = {
  energise_east: "East",
  energise_west: "West",
  prime: "PRIME",
  fitness_engine: "FE",
};

export function ClassBadge({ slug, className = "" }: { slug: ClassSlug; className?: string }) {
  return (
    <span
      title={slug === "fitness_engine" ? "Fitness Engine" : undefined}
      className={`display inline-flex h-5 items-center whitespace-nowrap rounded-sm px-1.5 text-[12px] leading-none tracking-wide ${classStyles[slug]} ${className}`}
    >
      {classLabels[slug]}
    </span>
  );
}

/** A quiet outline tag. Pass a background class to make it solid. */
export function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex h-5 items-center whitespace-nowrap rounded-sm border border-ink-3 px-1.5 text-[11px] font-medium text-paper ${className}`}
    >
      {children}
    </span>
  );
}
