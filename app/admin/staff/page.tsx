import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaff, getStaffInvites } from "@/lib/queries/admin";
import { PageHeader, StatCard } from "@/components/admin/PageHeader";
import { Table, Th, Td, Tr, EmptyRow } from "@/components/admin/Table";
import { ActionButton } from "@/components/admin/ActionButton";
import { InviteStaffForm, StaffTitleForm } from "@/components/admin/StaffForms";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cancelInvite, removeStaff } from "@/lib/actions/staff";
import { setRole } from "@/lib/actions/members";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS, STAFF_ROLES, type Profile, type Role } from "@/lib/types";

export const metadata = { title: "Staff" };

const WHAT_THEY_SEE: Record<string, string> = {
  coach: "Their own sessions and rosters",
  event_assistant: "Event registrations only",
  admin: "Everything",
};

/**
 * Staff directory (scope change). Permissions come from the role; the job
 * title beside it is free text, so a new kind of helper never needs a
 * migration.
 */
export default async function StaffPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .maybeSingle<Profile>();
  if (me?.role !== "admin") redirect("/admin");

  const [staff, invites] = await Promise.all([getStaff(supabase), getStaffInvites(supabase)]);
  const byRole = (role: Role) => staff.filter((s) => s.role === role).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Staff" sub="Who can get into the admin portal, and how much of it they see." />

      <div className="grid gap-3 sm:grid-cols-4">
        {STAFF_ROLES.map((role) => (
          <StatCard key={role} label={ROLE_LABELS[role]} value={byRole(role)} hint={WHAT_THEY_SEE[role]} />
        ))}
        <StatCard label="Invited" value={invites.length} hint="not signed in yet" />
      </div>

      <section className="flex flex-col gap-4 rounded-lg border border-ink-3 bg-ink-2 p-5">
        <h2 className="text-xl">Add staff</h2>
        <InviteStaffForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl">The team</h2>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Title</Th>
              <Th>Role</Th>
              <Th>Sees</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <EmptyRow colSpan={5}>Nobody on staff yet.</EmptyRow>
            ) : (
              staff.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={s.full_name ?? "?"} src={s.avatar_url} size={28} />
                      <div className="flex flex-col">
                        <Link href={`/admin/members/${s.id}`} className="underline-offset-4 hover:underline">
                          {s.full_name ?? s.email}
                        </Link>
                        <span className="text-xs text-muted">{s.email}</span>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <StaffTitleForm id={s.id} title={s.staff_title} />
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      {STAFF_ROLES.map((role) =>
                        role === s.role ? (
                          <Badge key={role} className="bg-brand">
                            {ROLE_LABELS[role]}
                          </Badge>
                        ) : (
                          <ActionButton key={role} action={setRole.bind(null, s.id, role)}>
                            {ROLE_LABELS[role]}
                          </ActionButton>
                        ),
                      )}
                    </div>
                  </Td>
                  <Td className="text-muted">{WHAT_THEY_SEE[s.role]}</Td>
                  <Td className="text-right">
                    <ActionButton
                      action={removeStaff.bind(null, s.id)}
                      confirm="Remove from staff?"
                      variant="danger"
                    >
                      Remove
                    </ActionButton>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl">Invited</h2>
        <Table>
          <thead>
            <tr>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Invited</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 ? (
              <EmptyRow colSpan={4}>Nobody is waiting to sign in.</EmptyRow>
            ) : (
              invites.map((i) => (
                <Tr key={i.email}>
                  <Td>{i.email}</Td>
                  <Td className="text-muted">{ROLE_LABELS[i.role]}</Td>
                  <Td className="text-muted">{formatDate(i.created_at)}</Td>
                  <Td className="text-right">
                    <ActionButton action={cancelInvite.bind(null, i.email)} variant="danger">
                      Cancel
                    </ActionButton>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
        <p className="text-xs text-muted">
          An invited address becomes staff the first time it signs in. Until then nothing exists for them.
        </p>
      </section>
    </div>
  );
}
