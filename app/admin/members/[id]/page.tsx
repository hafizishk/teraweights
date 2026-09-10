import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCreditAdjustments,
  getMember,
  getMemberBookings,
  getPackageDefinitions,
  getStaff,
} from "@/lib/queries/admin";
import { getMemberPackages } from "@/lib/queries/packages";
import { recordPayment, setRole } from "@/lib/actions/members";
import { ActionButton } from "@/components/admin/ActionButton";
import { AdjustCreditsForm } from "@/components/admin/AdjustCreditsForm";
import { AssignPackageForm } from "@/components/admin/AssignPackageForm";
import { CoachPicker, type AssignedCoach } from "@/components/admin/CoachPicker";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, Th, Td, Tr, EmptyRow } from "@/components/admin/Table";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, ClassBadge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { describePackage } from "@/lib/rules/package-copy";
import { formatDate, formatDayTime } from "@/lib/format";
import type { BookingStatus, Role } from "@/lib/types";

export const metadata = { title: "Member" };

const ROLES: Role[] = ["member", "coach", "admin"];
const roleLabels: Record<Role, string> = { member: "Member", coach: "Coach", admin: "Admin" };
const zoneLabels: Record<string, string> = { east: "East", west: "West" };
const statusLabels: Record<BookingStatus, string> = {
  booked: "Booked",
  waitlisted: "Waitlisted",
  cancelled: "Cancelled",
  attended: "Attended",
  no_show: "No show",
};

const BOOKING_ROWS = 12;

type CoachAssignmentJoin = {
  coach_id: string;
  profiles: { full_name: string | null } | null;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>{title}</CardTitle>
      {children}
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-widest text-muted">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export default async function AdminMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const member = await getMember(supabase, id);
  if (!member) notFound();

  const [packages, definitions, adjustments, bookings, staff, coachRows, refRows] = await Promise.all([
    getMemberPackages(supabase, id),
    getPackageDefinitions(supabase, { activeOnly: true }),
    getCreditAdjustments(supabase, id),
    getMemberBookings(supabase, id),
    getStaff(supabase),
    supabase
      .from("coach_assignments")
      .select("coach_id, profiles!coach_assignments_coach_id_fkey(full_name)")
      .eq("member_id", id),
    supabase.from("member_packages").select("id, payment_ref").eq("member_id", id),
  ]);

  const assigned: AssignedCoach[] = ((coachRows.data ?? []) as unknown as CoachAssignmentJoin[]).map((row) => ({
    id: row.coach_id,
    name: row.profiles?.full_name ?? "Coach",
  }));

  const refs = new Map(
    ((refRows.data ?? []) as { id: string; payment_ref: string | null }[]).map((r) => [r.id, r.payment_ref ?? ""]),
  );

  const name = member.full_name ?? "Energiser";
  const visibleBookings = bookings.slice(0, BOOKING_ROWS);

  return (
    <>
      <PageHeader title={name} back={{ href: "/admin/members", label: "Members" }} sub={member.email ?? undefined} />

      <div className="flex flex-col gap-6">
        <Card className="flex flex-wrap items-center gap-6">
          <Avatar name={member.full_name} src={member.avatar_url} size={64} />
          <Detail label="Phone" value={member.phone ?? "—"} />
          <Detail label="Zone" value={member.zone_pref ? zoneLabels[member.zone_pref] : "Not set"} />
          <Detail label="Weekly target" value={`${member.weekly_target} a week`} />
          <Detail
            label="Onboarded"
            value={member.onboarded_at ? formatDate(member.onboarded_at) : "Not yet"}
          />
          <Detail label="Joined" value={formatDate(member.created_at)} />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs uppercase tracking-widest text-muted">Role</span>
            <Badge>{roleLabels[member.role]}</Badge>
          </div>
        </Card>

        <Section title="Role">
          <div className="flex flex-wrap items-center gap-2">
            {ROLES.map((role) =>
              role === member.role ? (
                <span
                  key={role}
                  aria-current="true"
                  className="inline-flex h-8 items-center whitespace-nowrap rounded-md border border-brand bg-brand/20 px-3 text-xs text-paper"
                >
                  {roleLabels[role]} — current
                </span>
              ) : (
                <ActionButton
                  key={role}
                  action={() => setRole(id, role)}
                  confirm={`Make ${roleLabels[role].toLowerCase()}?`}
                >
                  Make {roleLabels[role].toLowerCase()}
                </ActionButton>
              ),
            )}
          </div>
        </Section>

        <Section title="Packages">
          <Table>
            <thead>
              <tr>
                <Th>Package</Th>
                <Th>What it gets them</Th>
                <Th>Expires</Th>
                <Th>Payment</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {packages.length === 0 ? (
                <EmptyRow colSpan={5}>No packages yet.</EmptyRow>
              ) : (
                packages.map((p) => (
                  <Tr key={p.id}>
                    <Td>{p.package_name}</Td>
                    <Td className="text-muted">{describePackage(p, member.weekly_target)}</Td>
                    <Td className="text-muted">{formatDate(p.expires_at)}</Td>
                    <Td>
                      {p.payment_status === "paid" ? (
                        <Badge>Paid</Badge>
                      ) : (
                        <span className="inline-flex h-6 items-center rounded bg-brand px-2 text-xs font-medium text-paper">
                          Pending
                        </span>
                      )}
                    </Td>
                    <Td className="text-right">
                      {p.payment_status === "pending" ? (
                        <ActionButton
                          action={() => recordPayment(p.id, id, refs.get(p.id) ?? "")}
                          variant="primary"
                        >
                          Record payment
                        </ActionButton>
                      ) : null}
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>

          <div className="border-t border-ink-3 pt-4">
            <h3 className="mb-3 text-xs uppercase tracking-widest text-muted">Assign a package</h3>
            <AssignPackageForm memberId={id} packages={definitions} />
          </div>
        </Section>

        <Section title="Credits">
          <AdjustCreditsForm memberId={id} packages={packages} />

          <Table>
            <thead>
              <tr>
                <Th>Change</Th>
                <Th>Kind</Th>
                <Th>Reason</Th>
                <Th>By</Th>
                <Th>When</Th>
              </tr>
            </thead>
            <tbody>
              {adjustments.length === 0 ? (
                <EmptyRow colSpan={5}>No adjustments recorded.</EmptyRow>
              ) : (
                adjustments.map((a) => (
                  <Tr key={a.id}>
                    <Td className={a.delta < 0 ? "text-brand" : ""}>
                      {a.delta > 0 ? `+${a.delta}` : a.delta}
                    </Td>
                    <Td className="text-muted">{a.kind === "fe_credit" ? "Fitness Engine" : "Credit"}</Td>
                    <Td>{a.reason}</Td>
                    <Td className="text-muted">{a.by_name ?? "—"}</Td>
                    <Td className="text-muted">{formatDayTime(a.created_at)}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </Section>

        <Section title="Coach">
          <CoachPicker memberId={id} assigned={assigned} staff={staff} />
        </Section>

        <Section title="Bookings">
          <Table>
            <thead>
              <tr>
                <Th>Session</Th>
                <Th>Class</Th>
                <Th>Venue</Th>
                <Th>Status</Th>
                <Th>Credits</Th>
              </tr>
            </thead>
            <tbody>
              {visibleBookings.length === 0 ? (
                <EmptyRow colSpan={5}>No bookings yet.</EmptyRow>
              ) : (
                visibleBookings.map((b) => (
                  <Tr key={b.id}>
                    <Td className="whitespace-nowrap">{b.starts_at ? formatDayTime(b.starts_at) : "—"}</Td>
                    <Td>
                      <ClassBadge slug={b.class_slug} />
                    </Td>
                    <Td className="text-muted">{b.venue_name || "—"}</Td>
                    <Td>{statusLabels[b.status]}</Td>
                    <Td className="text-muted">{b.credits_used}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
          {bookings.length > visibleBookings.length ? (
            <p className="text-xs text-muted">
              Showing the latest {visibleBookings.length} of {bookings.length} bookings.
            </p>
          ) : null}
        </Section>
      </div>
    </>
  );
}
