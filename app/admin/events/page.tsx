import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEvents, getRegistrationCounts } from "@/lib/queries/events";
import { EventForm, type VenueOption } from "@/components/admin/EventForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, Th, Td, Tr, EmptyRow } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { CardTitle } from "@/components/ui/Card";
import { formatEventDate, formatSgd } from "@/lib/format";
import type { Role } from "@/lib/types";

export const metadata = { title: "Events" };

const typeLabels: Record<string, string> = {
  parox: "PA.ROX",
  kampung_grind: "Kampung Grind",
  community: "Community",
};

export default async function AdminEventsPage() {
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

  const events = await getEvents(supabase);
  const [counts, { data: venues }] = await Promise.all([
    getRegistrationCounts(
      supabase,
      events.map((e) => e.id),
    ),
    supabase.from("venues").select("id, name").order("name"),
  ]);

  return (
    <>
      <PageHeader title="Events" sub={`${events.length} ${events.length === 1 ? "event" : "events"}`} />

      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Type</Th>
            <Th>Date</Th>
            <Th>Visibility</Th>
            <Th>Registration</Th>
            <Th>Price</Th>
            <Th>Registered</Th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <EmptyRow colSpan={7}>No events yet. Create the first one below.</EmptyRow>
          ) : (
            events.map((e) => (
              <Tr key={e.id}>
                <Td>
                  <Link href={`/admin/events/${e.slug}`} className="text-paper underline-offset-4 hover:underline">
                    {e.name}
                  </Link>
                </Td>
                <Td>
                  <Badge className={e.type === "parox" ? "bg-prime text-ink" : ""}>{typeLabels[e.type] ?? e.type}</Badge>
                </Td>
                <Td className="text-muted">{formatEventDate(e.event_date)}</Td>
                <Td className="text-muted">{e.is_public ? "Public" : "Private"}</Td>
                <Td className={e.registration_open ? "text-paper" : "text-muted"}>
                  {e.registration_open ? "Open" : "Closed"}
                </Td>
                <Td>{e.is_free ? "Free" : e.price_sgd === null ? "—" : formatSgd(e.price_sgd)}</Td>
                <Td>{counts.get(e.id) ?? 0}</Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>

      {isAdmin ? (
        <section className="mt-8 flex flex-col gap-4 rounded-lg border border-ink-3 bg-ink-2 p-4">
          <CardTitle className="display">New event</CardTitle>
          <EventForm venues={(venues ?? []) as VenueOption[]} />
        </section>
      ) : null}
    </>
  );
}
