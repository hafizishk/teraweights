import Link from "next/link";

export function PageHeader({
  title,
  sub,
  back,
  children,
}: {
  title: string;
  sub?: string;
  back?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-ink-3 pb-4">
      <div className="flex flex-col gap-1">
        {back ? (
          <Link href={back.href} className="eyebrow underline-offset-4 hover:underline">
            ← {back.label}
          </Link>
        ) : null}
        <h1 className="text-[34px] leading-none">{title}</h1>
        {sub ? <p className="text-sm text-muted">{sub}</p> : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </header>
  );
}

/** A number and its label. Ruled, not boxed; the figure carries the weight. */
export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rule flex flex-col gap-1 pt-3">
      <span className="display tnum text-[40px] leading-none">{value}</span>
      <span className="text-sm">{label}</span>
      {hint ? <span className="eyebrow">{hint}</span> : null}
    </div>
  );
}
