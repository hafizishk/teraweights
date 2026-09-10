import { createClient } from "@/lib/supabase/server";
import { getActivePackages, getMemberPackages } from "@/lib/queries/packages";
import { trialEligibility } from "@/lib/rules/trial";
import { getMyBookings, getSessionCounts, getSessionsBetween } from "@/lib/queries/sessions";
import { buildSessionView } from "@/lib/view/session-view";
import { weekOf } from "@/lib/week";
import { BookWeek } from "@/components/member/BookWeek";
import type { ClassSlug } from "@/lib/types";

export const metadata = { title: "Book" };

const FILTERS: { key: string; label: string; slug: ClassSlug | null }[] = [
  { key: "all", label: "All", slug: null },
  { key: "east", label: "East", slug: "energise_east" },
  { key: "west", label: "West", slug: "energise_west" },
  { key: "prime", label: "PRIME", slug: "prime" },
  { key: "fe", label: "Fitness Engine", slug: "fitness_engine" },
];

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string; f?: string; s?: string }>;
}) {
  const { w, f, s } = await searchParams;
  const offset = Number.isFinite(Number(w)) ? Number(w) : 0;
  const filterKey = FILTERS.some((x) => x.key === f) ? f! : "all";
  const filterSlug = FILTERS.find((x) => x.key === filterKey)!.slug;

  const now = new Date();
  const week = weekOf(now, offset);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [sessions, counts, packages, allPackages] = await Promise.all([
    getSessionsBetween(supabase, week.startIso, week.endIso),
    getSessionCounts(supabase, week.startIso, week.endIso),
    getActivePackages(supabase, user!.id),
    getMemberPackages(supabase, user!.id),
  ]);
  const trial = trialEligibility(allPackages, now);

  const bookings = await getMyBookings(
    supabase,
    user!.id,
    sessions.map((x) => x.id),
  );

  const views = sessions
    .filter((x) => !filterSlug || x.class_slug === filterSlug)
    .map((x) => buildSessionView(x, counts.get(x.id), bookings.get(x.id), packages, now));

  return (
    <BookWeek
      views={views}
      week={week}
      offset={offset}
      filters={FILTERS.map(({ key, label }) => ({ key, label }))}
      filterKey={filterKey}
      openSessionId={s ?? null}
      trialEligible={trial.eligible}
    />
  );
}
