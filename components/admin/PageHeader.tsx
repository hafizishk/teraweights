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
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        {back ? (
          <Link href={back.href} className="text-xs text-muted underline-offset-4 hover:underline">
            ← {back.label}
          </Link>
        ) : null}
        <h1 className="text-3xl leading-none">{title}</h1>
        {sub ? <p className="text-sm text-muted">{sub}</p> : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </header>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-ink-3 bg-ink-2 px-4 py-3">
      <span className="text-xs uppercase tracking-widest text-muted">{label}</span>
      <span className="display text-3xl leading-none">{value}</span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}
