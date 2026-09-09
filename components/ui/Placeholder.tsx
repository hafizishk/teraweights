/** Session-1 placeholder for feature screens built in later sessions. */
export function Placeholder({
  title,
  session,
  items,
}: {
  title: string;
  session: number;
  items: string[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl">{title}</h1>
      <div className="heartbeat w-32" />
      <p className="text-sm text-muted">Coming in session {session}.</p>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="rounded-md border border-dashed border-ink-3 px-3 py-2 text-sm text-muted">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
