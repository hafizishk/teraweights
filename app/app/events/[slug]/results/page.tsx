import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/onboarding";
import { getEventBySlug, getLeaderboard } from "@/lib/queries/events";
import { Leaderboard } from "@/components/member/Leaderboard";
import { typeLabel } from "@/components/member/EventCard";
import { formatEventDate } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const event = await getEventBySlug(supabase, slug);
  return { title: event ? `${event.name} results` : "Results" };
}

export default async function EventResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await requireOnboarded(supabase, user!.id);

  const event = await getEventBySlug(supabase, slug);
  if (!event) notFound();

  const rows = await getLeaderboard(supabase, event.id);
  const mine = rows.find((r) => r.member_id === user!.id);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/app/events" className="text-sm text-muted underline-offset-4 hover:underline">
        ← Events
      </Link>
      <div className="flex flex-col gap-1">
        <span className={`text-xs uppercase tracking-widest ${event.type === "parox" ? "text-prime" : "text-muted"}`}>
          {typeLabel(event.type)} · {formatEventDate(event.event_date)}
        </span>
        <h1 className="text-3xl leading-[0.95]">{event.name}</h1>
        <p className="text-sm text-muted">Results</p>
      </div>

      {mine ? (
        <Link href={`/app/parox/${event.slug}`} className="display text-lg text-brand">
          Your splits →
        </Link>
      ) : null}

      <Leaderboard rows={rows} meId={user!.id} />
    </div>
  );
}
