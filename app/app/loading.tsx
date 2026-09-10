/** Skeleton shown while a member screen loads its data. */
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy aria-label="Loading">
      <div className="-mx-4 -mt-4 h-[300px] bg-ink-2" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-20 rounded-lg bg-ink-2" />
        <div className="h-20 rounded-lg bg-ink-2" />
        <div className="h-20 rounded-lg bg-ink-2" />
      </div>
      <div className="h-6 w-40 rounded bg-ink-2" />
      <div className="h-[84px] rounded-lg bg-ink-2" />
      <div className="h-[84px] rounded-lg bg-ink-2" />
      <div className="h-[84px] rounded-lg bg-ink-2" />
    </div>
  );
}
