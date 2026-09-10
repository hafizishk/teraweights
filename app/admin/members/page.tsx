import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/queries/admin";
import { MemberSearch } from "@/components/admin/MemberSearch";
import { PageHeader } from "@/components/admin/PageHeader";
import { Table, Th, Td, Tr, EmptyRow } from "@/components/admin/Table";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Members" };

const zoneLabels: Record<string, string> = { east: "East", west: "West" };

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();

  const supabase = await createClient();
  const members = await getMembers(supabase, term);

  return (
    <>
      <PageHeader
        title="Members"
        sub={
          term
            ? `${members.length} ${members.length === 1 ? "match" : "matches"} for “${term}”`
            : `${members.length} ${members.length === 1 ? "Energiser" : "Energisers"}`
        }
      />

      <MemberSearch initial={term} />

      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Phone</Th>
            <Th>Zone</Th>
            <Th>Role</Th>
            <Th>Joined</Th>
          </tr>
        </thead>
        <tbody>
          {members.length === 0 ? (
            <EmptyRow colSpan={6}>
              {term ? "No Energiser matches that search." : "No Energisers yet."}
            </EmptyRow>
          ) : (
            members.map((m) => (
              <Tr key={m.id}>
                <Td>
                  <Link
                    href={`/admin/members/${m.id}`}
                    className="flex items-center gap-2 text-paper underline-offset-4 hover:underline"
                  >
                    <Avatar name={m.full_name} src={m.avatar_url} size={28} />
                    <span>{m.full_name ?? "Energiser"}</span>
                  </Link>
                </Td>
                <Td className="text-muted">{m.email ?? "—"}</Td>
                <Td className="text-muted">{m.phone ?? "—"}</Td>
                <Td>{m.zone_pref ? zoneLabels[m.zone_pref] : "—"}</Td>
                <Td>
                  <Badge>{m.role}</Badge>
                </Td>
                <Td className="text-muted">{formatDate(m.created_at)}</Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}
