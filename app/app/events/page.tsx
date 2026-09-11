import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/onboarding";
import { getEvents, getMyRegistrations, getRegistrationCounts } from "@/lib/queries/events";
import { EventCard } from "@/components/member/EventCard";
import { sgtDate } from "@/lib/week";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;
  await requireOnboarded(supabase, uid);
  const today = sgtDate(new Date());

  const [events, registrations] = await Promise.all([getEvents(supabase), getMyRegistrations(supabase, uid)]);
  const upcoming = events.filter((e) => e.event_date >= today);
  const past = events.filter((e) => e.event_date < today).reverse();
  const counts = await getRegistrationCounts(
    supabase,
    upcoming.map((e) => e.id),
  );

  const [next, ...rest] = upcoming;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-[34px] leading-none">Events</h1>
        <p className="text-sm text-muted">PA.ROX, Kampung Grind and Friends &amp; Family. Bring someone.</p>
      </div>

      {next ? (
        <EventCard event={next} registration={registrations.get(next.id)} registeredCount={counts.get(next.id)} featured />
      ) : (
        <p className="rule py-8 text-sm text-muted">Nothing on the calendar yet. Watch this space.</p>
      )}

      {rest.length > 0 ? (
        <section>
          <h2 className="pb-1 text-xl">Coming up</h2>
          {rest.map((e) => (
            <EventCard key={e.id} event={e} registration={registrations.get(e.id)} registeredCount={counts.get(e.id)} />
          ))}
        </section>
      ) : null}

      {past.length > 0 ? (
        <section>
          <h2 className="pb-1 text-xl">Past</h2>
          {past.map((e) => (
            <EventCard key={e.id} event={e} past />
          ))}
        </section>
      ) : null}
    </div>
  );
}
