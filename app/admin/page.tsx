import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionsBetween, getSessionCounts } from "@/lib/queries/sessions";
import { getPendingPayments } from "@/lib/queries/admin";
import { getEvents } from "@/lib/queries/events";
import { PageHeader, StatCard } from "@/components/admin/PageHeader";
import { Table, Th, Td, Tr, EmptyRow } from "@/components/admin/Table";
import { ClassBadge } from "@/components/ui/Badge";
import { formatDate, formatEventDate, formatTime, shortVenue } from "@/lib/format";
import { sgtDate, sgtMidnight } from "@/lib/week";
import { isStaff, type Profile } from "@/lib/types";

export const metadata = { title: "Dashboard" };

/**
 * Admin dashboard, and the coach's "Today" (brief section 9). A coach sees the
 * same table filtered to sessions they run, and none of the money.
 */
export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .maybeSingle<Profile>();
  if (!profile || !isStaff(profile.role)) return null;

  const isAdmin = profile.role === "admin";
  const today = sgtDate(new Date());
  const dayStart = sgtMidnight(today);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [allToday, counts, payments, events] = await Promise.all([
    getSessionsBetween(supabase, dayStart.toISOString(), dayEnd.toISOString()),
    getSessionCounts(supabase, dayStart.toISOString(), dayEnd.toISOString()),
    isAdmin ? getPendingPayments(supabase) : Promise.resolve([]),
    isAdmin ? getEvents(supabase) : Promise.resolve([]),
  ]);

  const sessions = isAdmin ? allToday : allToday.filter((s) => s.coach_id === profile.id);
  const booked = sessions.reduce((n, s) => n + (counts.get(s.id)?.booked ?? 0), 0);
  const upcoming = events.filter((e) => e.event_date >= today).slice(0, 3);

  const registrationCounts = new Map<string, number>();
  if (upcoming.length > 0) {
    const { data } = await supabase
      .from("event_registrations")
      .select("event_id")
      .in("event_id", upcoming.map((e) => e.id))
      .neq("status", "cancelled");
    for (const row of (data ?? []) as { event_id: string }[]) {
      registrationCounts.set(row.event_id, (registrationCounts.get(row.event_id) ?? 0) + 1);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={isAdmin ? "Dashboard" : "Today"} sub={formatDate(dayStart)} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Sessions today" value={sessions.length} />
        <StatCard label="Booked today" value={booked} hint="across every session" />
        {isAdmin ? (
          <StatCard
            label="Pending payments"
            value={payments.length}
            hint={payments.length > 0 ? "packages waiting to be marked paid" : "nothing outstanding"}
          />
        ) : (
          <StatCard label="Your sessions" value={sessions.length} hint="scheduled for today" />
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl">Today&apos;s sessions</h2>
        <Table>
          <thead>
            <tr>
              <Th>Time</Th>
              <Th>Class</Th>
              <Th>Venue</Th>
              <Th>Coach</Th>
              <Th>Booked</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <EmptyRow colSpan={6}>
                {isAdmin ? "Nothing scheduled today." : "You have no sessions today."}
              </EmptyRow>
            ) : (
              sessions.map((s) => {
                const count = counts.get(s.id) ?? { booked: 0, waitlisted: 0 };
                return (
                  <Tr key={s.id}>
                    <Td className="whitespace-nowrap">{formatTime(s.starts_at)}</Td>
                    <Td>
                      <ClassBadge slug={s.class_slug} />
                    </Td>
                    <Td>{shortVenue(s.venue_name)}</Td>
                    <Td className="text-muted">{s.coach_name ?? "Unassigned"}</Td>
                    <Td>
                      {count.booked}/{s.capacity}
                      {count.waitlisted > 0 ? (
                        <span className="ml-2 text-xs text-muted">+{count.waitlisted} waiting</span>
                      ) : null}
                    </Td>
                    <Td className="text-right">
                      <Link
                        href={`/admin/schedule/${s.id}`}
                        className="text-xs text-brand underline-offset-4 hover:underline"
                      >
                        Roster
                      </Link>
                    </Td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </Table>
      </section>

      {isAdmin ? (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-xl">Pending payments</h2>
            <Table>
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th>Package</Th>
                  <Th>Assigned</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <EmptyRow colSpan={4}>Every package is paid up.</EmptyRow>
                ) : (
                  payments.map((p) => (
                    <Tr key={p.id}>
                      <Td>{p.member_name}</Td>
                      <Td>{p.package_name}</Td>
                      <Td className="text-muted">{formatDate(p.purchased_at)}</Td>
                      <Td className="text-right">
                        <Link
                          href={`/admin/members/${p.member_id}`}
                          className="text-xs text-brand underline-offset-4 hover:underline"
                        >
                          Record payment
                        </Link>
                      </Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </Table>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl">Next events</h2>
            <Table>
              <thead>
                <tr>
                  <Th>Event</Th>
                  <Th>Date</Th>
                  <Th>Registered</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {upcoming.length === 0 ? (
                  <EmptyRow colSpan={4}>Nothing on the calendar.</EmptyRow>
                ) : (
                  upcoming.map((e) => (
                    <Tr key={e.id}>
                      <Td>{e.name}</Td>
                      <Td className="text-muted">{formatEventDate(e.event_date)}</Td>
                      <Td>{registrationCounts.get(e.id) ?? 0}</Td>
                      <Td className="text-right">
                        <Link
                          href={`/admin/events/${e.slug}`}
                          className="text-xs text-brand underline-offset-4 hover:underline"
                        >
                          Open
                        </Link>
                      </Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </Table>
          </section>
        </>
      ) : null}
    </div>
  );
}
