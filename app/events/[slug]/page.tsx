import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEventBySlug, getRegistrationCounts, getSlots } from "@/lib/queries/events";
import { EventDetail } from "@/components/member/EventDetail";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const event = await getEventBySlug(supabase, slug);
  return { title: event?.name ?? "Event" };
}

/**
 * Public event page for guests (brief section 2): register with name, email
 * and phone, no account. Signed-in members are sent to their own version.
 */
export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(`/app/events/${slug}`);

  const event = await getEventBySlug(supabase, slug);
  if (!event || !event.is_public) notFound();

  const [slots, counts] = await Promise.all([getSlots(supabase, event.id), getRegistrationCounts(supabase, [event.id])]);

  return (
    <EventDetail
      event={event}
      slots={slots}
      registration={null}
      registeredCount={counts.get(event.id) ?? 0}
      mode="guest"
    />
  );
}
