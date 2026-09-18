import { createClient } from "@/lib/supabase/server";
import { assertOnboarded } from "@/lib/onboarding";
import { getActivePackages, getMemberPackages } from "@/lib/queries/packages";
import { trialEligibility } from "@/lib/rules/trial";
import { getMyBookingsBetween, getSessionCounts, getSessionsBetween } from "@/lib/queries/sessions";
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const week = weekOf(now, offset);

  const [{ data: profile }, sessions, counts, packages, allPackages, bookings] = await Promise.all([
    supabase.from("profiles").select("zone_pref, onboarded_at").eq("id", user!.id).maybeSingle<{ zone_pref: string | null; onboarded_at: string | null }>(),
    getSessionsBetween(supabase, week.startIso, week.endIso),
    getSessionCounts(supabase, week.startIso, week.endIso),
    getActivePackages(supabase, user!.id),
    getMemberPackages(supabase, user!.id),
    getMyBookingsBetween(supabase, user!.id, week.startIso, week.endIso),
  ]);
  assertOnboarded(profile);
  const trial = trialEligibility(allPackages, now);

  // No filter chosen: default to the member's zone (onboarding answer).
  let filterKey = FILTERS.some((x) => x.key === f) ? f! : "";
  if (!filterKey) {
    filterKey = profile?.zone_pref === "west" ? "west" : profile?.zone_pref === "east" ? "east" : "all";
  }
  const filterSlug = FILTERS.find((x) => x.key === filterKey)!.slug;

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
