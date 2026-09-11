import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCoaches } from "@/lib/queries/admin";
import { getOpenHours, getPtSessionsBetween } from "@/lib/queries/pt";
import { getPackageDefinitions } from "@/lib/queries/admin";
import { PageHeader, StatCard } from "@/components/admin/PageHeader";
import { Table, Th, Td, Tr, EmptyRow } from "@/components/admin/Table";
import { ActionButton } from "@/components/admin/ActionButton";
import { OpenHoursForm, PtNoteForm } from "@/components/admin/PtForms";
import { Avatar } from "@/components/ui/Avatar";
import { adminCancelPtSession, removeOpenHours } from "@/lib/actions/pt";
import { formatDayTime, formatSgd, formatTime, shortVenue } from "@/lib/format";
import { isStaff, type Profile } from "@/lib/types";

export const metadata = { title: "Personal training" };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function hhmm(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const d = new Date(Date.UTC(2026, 0, 5, h - 8, m));
  return formatTime(d);
}

/**
 * The PT diary (scope change, direction A). Admins see every coach; a coach
 * sees their own sessions and edits their own hours.
 */
export default async function AdminPtPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle<Profile>();
  if (!profile || !isStaff(profile.role)) return null;
  const isAdmin = profile.role === "admin";
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const to = new Date(now.getTime() + 21 * 86_400_000).toISOString();

  const [sessions, hours, coaches, venuesRes, defs] = await Promise.all([
    getPtSessionsBetween(supabase, from, to),
    getOpenHours(supabase, isAdmin ? undefined : profile.id),
    isAdmin ? getCoaches(supabase) : Promise.resolve([]),
    supabase.from("venues").select("id, name").order("name"),
    isAdmin ? getPackageDefinitions(supabase) : Promise.resolve([]),
  ]);

  const mine = isAdmin ? sessions : sessions.filter((s) => s.coach_id === profile.id);
  const upcoming = mine.filter((s) => s.status === "booked" && new Date(s.starts_at).getTime() > now.getTime());
  const recent = mine.filter((s) => s.status !== "cancelled" && new Date(s.starts_at).getTime() <= now.getTime()).reverse();
  const unnoted = recent.filter((s) => !s.coach_note).length;
  const clients = new Set(mine.filter((s) => s.status !== "cancelled").map((s) => s.member_id)).size;
  const venues = ((venuesRes.data ?? []) as { id: string; name: string }[]).map((v) => ({ id: v.id, name: v.name }));
  const coachOptions = coaches.map((c) => ({ id: c.id, name: c.full_name ?? c.email ?? "Coach" }));
  const coachName = new Map(coaches.map((c) => [c.id, c.full_name ?? "Coach"]));
  const ptPacks = defs.filter((d) => d.kind === "pt");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Personal training"
        sub={isAdmin ? "Who is on a PT pack, what is booked, and where the coaches have gaps." : "Your PT diary and open hours."}
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Active PT clients" value={clients} hint="in the last week and next three" />
        <StatCard label="Booked ahead" value={upcoming.length} />
        <StatCard label="Notes to write" value={unnoted} hint={unnoted > 0 ? "sessions without a coach note" : "all caught up"} />
        {isAdmin ? (
          <StatCard label="PT packs on sale" value={ptPacks.length} hint={ptPacks.map((p) => `${p.name} ${formatSgd(p.price_sgd)}`).join(" · ") || undefined} />
        ) : (
          <StatCard label="Open windows" value={hours.length} />
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl">Booked</h2>
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Member</Th>
              {isAdmin ? <Th>Coach</Th> : null}
              <Th>Venue</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {upcoming.length === 0 ? (
              <EmptyRow colSpan={isAdmin ? 5 : 4}>Nothing booked in the next three weeks.</EmptyRow>
            ) : (
              upcoming.map((s) => (
                <Tr key={s.id}>
                  <Td className="whitespace-nowrap">{formatDayTime(s.starts_at)}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={s.member_name ?? "?"} src={s.member_avatar} size={28} />
                      {isAdmin ? (
                        <Link href={`/admin/members/${s.member_id}`} className="underline-offset-4 hover:underline">
                          {s.member_name}
                        </Link>
                      ) : (
                        <span>{s.member_name}</span>
                      )}
                    </div>
                  </Td>
                  {isAdmin ? <Td className="text-muted">{s.coach_name}</Td> : null}
                  <Td className="text-muted">{s.venue_name ? shortVenue(s.venue_name) : "—"}</Td>
                  <Td className="text-right">
                    {isAdmin ? (
                      <ActionButton action={adminCancelPtSession.bind(null, s.id)} confirm="Cancel and return the session?" variant="danger">
                        Cancel
                      </ActionButton>
                    ) : null}
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl">Recent, and what you wrote</h2>
        <p className="text-sm text-muted">The note is what the member reads on their PT page afterwards. Two lines is plenty.</p>
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Member</Th>
              <Th>Session and note</Th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <EmptyRow colSpan={3}>No PT in the last week.</EmptyRow>
            ) : (
              recent.map((s) => (
                <Tr key={s.id}>
                  <Td className="whitespace-nowrap align-top">{formatDayTime(s.starts_at)}</Td>
                  <Td className="align-top">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.member_name ?? "?"} src={s.member_avatar} size={28} />
                      <span>{s.member_name}</span>
                    </div>
                  </Td>
                  <Td>
                    <PtNoteForm id={s.id} title={s.title} note={s.coach_note} status={s.status} />
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl">Open hours</h2>
          <p className="text-sm text-muted">Members book PT only inside these. Class times are blocked automatically.</p>
        </div>
        <Table>
          <thead>
            <tr>
              {isAdmin ? <Th>Coach</Th> : null}
              <Th>Day</Th>
              <Th>Hours</Th>
              <Th>Slot</Th>
              <Th>Venue</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {hours.length === 0 ? (
              <EmptyRow colSpan={isAdmin ? 6 : 5}>No open hours yet, so nobody can book PT. Add some below.</EmptyRow>
            ) : (
              hours.map((h) => (
                <Tr key={h.id}>
                  {isAdmin ? <Td>{coachName.get(h.coach_id) ?? "Coach"}</Td> : null}
                  <Td>{WEEKDAYS[h.weekday - 1]}</Td>
                  <Td className="whitespace-nowrap">
                    {hhmm(h.start_time)} – {hhmm(h.end_time)}
                  </Td>
                  <Td className="text-muted">{h.slot_minutes} min</Td>
                  <Td className="text-muted">{h.venue_name ? shortVenue(h.venue_name) : "Agree on the day"}</Td>
                  <Td className="text-right">
                    <ActionButton action={removeOpenHours.bind(null, h.id)} confirm="Remove these hours?" variant="danger">
                      Remove
                    </ActionButton>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
        <div className="rounded-lg border border-ink-3 bg-ink-2 p-5">
          <OpenHoursForm coaches={coachOptions} venues={venues} fixedCoachId={isAdmin ? undefined : profile.id} />
        </div>
      </section>

      {isAdmin ? (
        <p className="text-xs text-muted">
          PT packs are packages of kind &quot;PT pack&quot;. Edit prices and validity under{" "}
          <Link href="/admin/packages" className="text-brand underline-offset-4 hover:underline">
            Packages
          </Link>
          . Assign one to a member from their page, the same as any package.
        </p>
      ) : null}
    </div>
  );
}
