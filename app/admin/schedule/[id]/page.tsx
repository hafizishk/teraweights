import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/queries/sessions";
import { getRoster, getRosterCounts, getStaff } from "@/lib/queries/admin";
import { PageHeader, StatCard } from "@/components/admin/PageHeader";
import { Table, Th, Td, Tr, EmptyRow } from "@/components/admin/Table";
import { ActionButton } from "@/components/admin/ActionButton";
import { QrButton } from "@/components/admin/QrButton";
import { SessionSettingsForm } from "@/components/admin/SessionSettingsForm";
import { Avatar } from "@/components/ui/Avatar";
import { ClassBadge } from "@/components/ui/Badge";
import { setAttendance } from "@/lib/actions/roster";
import { cancelSession } from "@/lib/actions/schedule";
import { formatDayTime, formatTime, shortVenue } from "@/lib/format";
import type { Option } from "@/components/admin/NewSessionForm";
import { isStaff, type Profile } from "@/lib/types";

export const metadata = { title: "Roster" };

const ENTITLEMENT_LABEL: Record<string, string> = {
  membership: "Membership",
  credit: "1 credit",
  fe_credit: "1 FE pass",
};

/**
 * Session roster (brief section 9): who is booked, who is waiting, manual
 * attendance, the rotating check-in QR, and cancelling the session.
 */
export default async function RosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const session = await getSession(supabase, id);
  if (!session) notFound();
  if (!isAdmin && session.coach_id !== profile.id) notFound();

  const [roster, counts, staff] = await Promise.all([
    getRoster(supabase, id),
    getRosterCounts(supabase, id),
    isAdmin ? getStaff(supabase) : Promise.resolve([]),
  ]);

  const coaches: Option[] = staff.map((s) => ({ id: s.id, name: s.full_name ?? s.email ?? "Coach" }));
  const booked = roster.filter((r) => r.status !== "waitlisted" && r.status !== "cancelled");
  const waiting = roster.filter((r) => r.status === "waitlisted");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={session.class_name}
        sub={`${formatDayTime(session.starts_at)} – ${formatTime(session.ends_at)} · ${shortVenue(session.venue_name)}`}
        back={{ href: "/admin/schedule", label: "Schedule" }}
      >
        <QrButton sessionId={id} />
        {isAdmin && session.status === "scheduled" ? (
          <ActionButton
            action={cancelSession.bind(null, id)}
            confirm="Cancel and refund everyone?"
            variant="danger"
            className="h-10 px-4 text-sm"
          >
            Cancel session
          </ActionButton>
        ) : null}
      </PageHeader>

      {session.status === "cancelled" ? (
        <p className="rounded-lg border border-brand/40 bg-brand/10 px-4 py-3 text-sm">
          This session is cancelled. Everyone booked has had their credit returned.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Booked" value={`${counts.booked + counts.attended + counts.no_show}/${session.capacity}`} />
        <StatCard label="Checked in" value={counts.attended} />
        <StatCard label="No-show" value={counts.no_show} />
        <StatCard label="Waitlist" value={counts.waitlisted} />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl">Booked</h2>
          <span className="text-sm text-muted">
            <ClassBadge slug={session.class_slug} />
          </span>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Member</Th>
              <Th>Paid with</Th>
              <Th>Checked in</Th>
              <Th className="text-right">Attendance</Th>
            </tr>
          </thead>
          <tbody>
            {booked.length === 0 ? (
              <EmptyRow colSpan={4}>Nobody has booked this session yet.</EmptyRow>
            ) : (
              booked.map((r) => (
                <Tr key={r.booking_id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={r.name} src={r.avatar_url} size={28} />
                      <div className="flex flex-col">
                        {isAdmin ? (
                          <Link
                            href={`/admin/members/${r.member_id}`}
                            className="underline-offset-4 hover:underline"
                          >
                            {r.name}
                          </Link>
                        ) : (
                          <span>{r.name}</span>
                        )}
                        <span className="text-xs text-muted">{r.email}</span>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-muted">
                    {r.entitlement ? ENTITLEMENT_LABEL[r.entitlement] : "—"}
                    {r.credits_used > 0 ? <span className="ml-2 text-xs">({r.credits_used} used)</span> : null}
                  </Td>
                  <Td>
                    {r.status === "attended" ? (
                      <span className="text-brand">
                        {r.checked_in_at ? formatTime(r.checked_in_at) : "Yes"}
                      </span>
                    ) : r.status === "no_show" ? (
                      <span className="text-muted">No-show</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      {r.status === "attended" ? (
                        <ActionButton action={setAttendance.bind(null, r.booking_id, "booked", id)}>
                          Undo
                        </ActionButton>
                      ) : (
                        <ActionButton
                          action={setAttendance.bind(null, r.booking_id, "attended", id)}
                          variant="primary"
                        >
                          Attended
                        </ActionButton>
                      )}
                      {r.status === "no_show" ? null : (
                        <ActionButton action={setAttendance.bind(null, r.booking_id, "no_show", id)}>
                          No-show
                        </ActionButton>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl">Waitlist</h2>
        <Table>
          <thead>
            <tr>
              <Th>Member</Th>
              <Th>Joined</Th>
            </tr>
          </thead>
          <tbody>
            {waiting.length === 0 ? (
              <EmptyRow colSpan={2}>Nobody is waiting.</EmptyRow>
            ) : (
              waiting.map((r, i) => (
                <Tr key={r.booking_id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="display w-5 text-muted">{i + 1}</span>
                      <Avatar name={r.name} src={r.avatar_url} size={28} />
                      <span>{r.name}</span>
                    </div>
                  </Td>
                  <Td className="text-muted">{formatDayTime(r.created_at)}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
        <p className="text-xs text-muted">
          A waitlisted member is promoted automatically when someone cancels, provided their package covers it.
        </p>
      </section>

      {isAdmin ? (
        <section className="flex flex-col gap-4 rounded-lg border border-ink-3 bg-ink-2 p-5">
          <h2 className="text-xl">Session settings</h2>
          <SessionSettingsForm
            sessionId={id}
            coaches={coaches}
            coachId={session.coach_id}
            capacity={session.capacity}
            notes={session.notes}
          />
        </section>
      ) : null}
    </div>
  );
}
