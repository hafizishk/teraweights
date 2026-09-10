import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEventBySlug, getSlots } from "@/lib/queries/events";
import { getEventRegistrations } from "@/lib/queries/admin";
import { EventForm, type VenueOption } from "@/components/admin/EventForm";
import { PageHeader, StatCard } from "@/components/admin/PageHeader";
import { RegistrationsTable } from "@/components/admin/RegistrationsTable";
import { ResultsImport } from "@/components/admin/ResultsImport";
import { SlotsEditor } from "@/components/admin/SlotsEditor";
import { CardTitle } from "@/components/ui/Card";
import { formatEventDate } from "@/lib/format";
import type { Role } from "@/lib/types";

export const metadata = { title: "Event" };

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 flex flex-col gap-4 rounded-lg border border-ink-3 bg-ink-2 p-4">
      <div className="flex flex-col gap-1">
        <CardTitle className="display">{title}</CardTitle>
        {sub ? <p className="text-sm text-muted">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default async function AdminEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .maybeSingle<{ role: Role }>();
  const isAdmin = me?.role === "admin";

  const event = await getEventBySlug(supabase, slug);
  if (!event) notFound();

  const [slots, registrations, { data: venues }, { data: venueRow }] = await Promise.all([
    getSlots(supabase, event.id),
    getEventRegistrations(supabase, event.id),
    supabase.from("venues").select("id, name").order("name"),
    supabase.from("events").select("venue_id").eq("id", event.id).maybeSingle<{ venue_id: string | null }>(),
  ]);

  const live = registrations.filter((r) => r.status !== "cancelled");
  const attended = registrations.filter((r) => r.status === "attended").length;
  const pendingPayment = registrations.filter((r) => r.payment_status === "pending").length;

  return (
    <>
      <PageHeader
        title={event.name}
        sub={`${formatEventDate(event.event_date)}${event.venue_name ? ` · ${event.venue_name}` : ""}`}
        back={{ href: "/admin/events", label: "All events" }}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Registered" value={live.length} hint={`${registrations.length} rows in total`} />
        <StatCard label="Attended" value={attended} />
        <StatCard label="Payment pending" value={pendingPayment} />
      </div>

      {isAdmin ? (
        <>
          <Section title="Details">
            <EventForm venues={(venues ?? []) as VenueOption[]} event={event} venueId={venueRow?.venue_id ?? null} />
          </Section>

          <Section title="Waves" sub="Start times and capacity. Times are Singapore.">
            <SlotsEditor eventId={event.id} eventDate={event.event_date} slots={slots} />
          </Section>
        </>
      ) : null}

      <Section title="Registrations">
        <RegistrationsTable slug={event.slug} registrations={registrations} canExport={isAdmin} />
      </Section>

      {isAdmin ? (
        <Section title="Import results" sub="Upload the timing sheet, check the matches, then confirm.">
          <ResultsImport eventId={event.id} />
        </Section>
      ) : null}
    </>
  );
}
