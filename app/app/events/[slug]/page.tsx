import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/onboarding";
import { getEventBySlug, getMyRegistrations, getRegistrationCounts, getSlots } from "@/lib/queries/events";
import { EventDetail } from "@/components/member/EventDetail";
import { sgtDate } from "@/lib/week";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const event = await getEventBySlug(supabase, slug);
  return { title: event?.name ?? "Event" };
}

export default async function MemberEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await requireOnboarded(supabase, user!.id);

  const event = await getEventBySlug(supabase, slug);
  if (!event) notFound();

  const [slots, registrations, counts] = await Promise.all([
    getSlots(supabase, event.id),
    getMyRegistrations(supabase, user!.id),
    getRegistrationCounts(supabase, [event.id]),
  ]);

  const isPast = event.event_date < sgtDate(new Date());

  return (
    <div className="flex flex-col gap-4">
      <Link href="/app/events" className="text-sm text-muted underline-offset-4 hover:underline">
        ← Events
      </Link>
      <EventDetail
        event={event}
        slots={slots}
        registration={registrations.get(event.id) ?? null}
        registeredCount={counts.get(event.id) ?? 0}
        mode="member"
      />
      {isPast ? (
        <Link href={`/app/events/${event.slug}/results`} className="display text-lg text-brand">
          View results →
        </Link>
      ) : null}
    </div>
  );
}
