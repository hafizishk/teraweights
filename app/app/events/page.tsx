import { createClient } from "@/lib/supabase/server";
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
  const today = sgtDate(new Date());

  const [events, registrations] = await Promise.all([getEvents(supabase), getMyRegistrations(supabase, uid)]);
  const upcoming = events.filter((e) => e.event_date >= today);
  const past = events.filter((e) => e.event_date < today).reverse();
  const counts = await getRegistrationCounts(
    supabase,
    upcoming.map((e) => e.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl">Events</h1>
        <p className="text-sm text-muted">PA.ROX, Kampung Grind and Friends &amp; Family. Bring someone.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ink-3 px-4 py-8 text-center text-sm text-muted">
            Nothing on the calendar yet. Watch this space.
          </p>
        ) : (
          upcoming.map((e) => (
            <EventCard key={e.id} event={e} registration={registrations.get(e.id)} registeredCount={counts.get(e.id)} />
          ))
        )}
      </section>

      {past.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl">Past</h2>
          {past.map((e) => (
            <EventCard key={e.id} event={e} past />
          ))}
        </section>
      ) : null}
    </div>
  );
}
