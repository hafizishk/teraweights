import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionsBetween, getSessionCounts } from "@/lib/queries/sessions";
import { getCoaches } from "@/lib/queries/admin";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, Th, Td, Tr, EmptyRow } from "@/components/admin/Table";
import { ClassBadge } from "@/components/ui/Badge";
import { BulkCreateForm, NewSessionForm, type Option } from "@/components/admin/NewSessionForm";
import { formatDay, formatTime, shortVenue } from "@/lib/format";
import { weekOf } from "@/lib/week";
import { isStaff, type Profile } from "@/lib/types";

export const metadata = { title: "Schedule" };

/** Sessions by week, plus the two create forms (brief section 9). */
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const { w } = await searchParams;
  const offset = Number.isFinite(Number(w)) ? Number(w) : 0;
  const week = weekOf(new Date(), offset);

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

  const [all, counts, staff, { data: classTypes }, { data: venues }] = await Promise.all([
    getSessionsBetween(supabase, week.startIso, week.endIso),
    getSessionCounts(supabase, week.startIso, week.endIso),
    isAdmin ? getCoaches(supabase) : Promise.resolve([]),
    isAdmin ? supabase.from("class_types").select("id, name").order("name") : Promise.resolve({ data: [] }),
    isAdmin ? supabase.from("venues").select("id, name").order("name") : Promise.resolve({ data: [] }),
  ]);

  const sessions = isAdmin ? all : all.filter((s) => s.coach_id === profile.id);
  const coaches: Option[] = staff.map((s) => ({ id: s.id, name: s.full_name ?? s.email ?? "Coach" }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Schedule" sub={week.label}>
        <Link
          href={`/admin/schedule?w=${offset - 1}`}
          className="inline-flex h-8 items-center rounded-md border border-ink-3 px-3 text-xs hover:border-muted"
        >
          ← Previous
        </Link>
        <Link
          href="/admin/schedule"
          className="inline-flex h-8 items-center rounded-md border border-ink-3 px-3 text-xs hover:border-muted"
        >
          This week
        </Link>
        <Link
          href={`/admin/schedule?w=${offset + 1}`}
          className="inline-flex h-8 items-center rounded-md border border-ink-3 px-3 text-xs hover:border-muted"
        >
          Next →
        </Link>
      </PageHeader>

      <Table>
        <thead>
          <tr>
            <Th>Day</Th>
            <Th>Time</Th>
            <Th>Class</Th>
            <Th>Venue</Th>
            <Th>Coach</Th>
            <Th>Booked</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {sessions.length === 0 ? (
            <EmptyRow colSpan={8}>
              {isAdmin ? "No sessions this week. Create some below." : "You have no sessions this week."}
            </EmptyRow>
          ) : (
            sessions.map((s) => {
              const count = counts.get(s.id) ?? { booked: 0, waitlisted: 0 };
              return (
                <Tr key={s.id} className={s.status === "cancelled" ? "opacity-50" : ""}>
                  <Td className="whitespace-nowrap">{formatDay(s.starts_at)}</Td>
                  <Td className="whitespace-nowrap">{formatTime(s.starts_at)}</Td>
                  <Td>
                    <ClassBadge slug={s.class_slug} />
                  </Td>
                  <Td>{shortVenue(s.venue_name)}</Td>
                  <Td className="text-muted">{s.coach_name ?? "Unassigned"}</Td>
                  <Td>
                    {count.booked}/{s.capacity}
                    {count.waitlisted > 0 ? (
                      <span className="ml-2 text-xs text-muted">+{count.waitlisted}</span>
                    ) : null}
                  </Td>
                  <Td className="text-muted">{s.status === "scheduled" ? "—" : s.status}</Td>
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

      {isAdmin ? (
        <>
          <section className="flex flex-col gap-4 rounded-lg border border-ink-3 bg-ink-2 p-5">
            <h2 className="text-xl">New session</h2>
            <NewSessionForm
              classTypes={(classTypes ?? []) as Option[]}
              venues={(venues ?? []) as Option[]}
              coaches={coaches}
            />
          </section>

          <section className="flex flex-col gap-4 rounded-lg border border-ink-3 bg-ink-2 p-5">
            <h2 className="text-xl">Bulk create</h2>
            <p className="text-sm text-muted">
              A month of Tuesdays and Thursdays in one go. Nothing is written until you press the button.
            </p>
            <BulkCreateForm
              classTypes={(classTypes ?? []) as Option[]}
              venues={(venues ?? []) as Option[]}
              coaches={coaches}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}
