"use client";

import { useMemo, useState } from "react";
import { ActionButton } from "@/components/admin/ActionButton";
import { controlClass } from "@/components/admin/Field";
import { Table, Th, Td, Tr, EmptyRow } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { setRegistrationPayment, setRegistrationStatus } from "@/lib/actions/events";
import { formatDayTime } from "@/lib/format";
import type { EventRegistrationRow } from "@/lib/queries/admin";

const statusLabels: Record<EventRegistrationRow["status"], string> = {
  registered: "Registered",
  waitlisted: "Waitlisted",
  cancelled: "Cancelled",
  attended: "Attended",
};

const paymentLabels: Record<EventRegistrationRow["payment_status"], string> = {
  "n/a": "—",
  pending: "Pending",
  paid: "Paid",
};

/** Registrations for one event: filter, status and payment actions, CSV export. */
export function RegistrationsTable({
  slug,
  registrations,
  canExport = true,
}: {
  slug: string;
  registrations: EventRegistrationRow[];
  /** The CSV export is admin-only; the route refuses anyone else. */
  canExport?: boolean;
}) {
  const [term, setTerm] = useState("");

  const rows = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return registrations;
    return registrations.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q),
    );
  }, [registrations, term]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Name or email"
          aria-label="Filter registrations"
          className={`${controlClass} max-w-sm`}
        />
        <span className="text-xs text-muted">
          {rows.length} of {registrations.length}
        </span>
        {canExport ? (
          <a
            href={`/api/admin/registrations?event=${encodeURIComponent(slug)}`}
            download
            className="ml-auto inline-flex h-10 items-center whitespace-nowrap rounded-md border border-ink-3 px-4 text-xs text-paper transition-colors hover:border-muted"
          >
            Export CSV
          </a>
        ) : null}
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Phone</Th>
            <Th>Wave</Th>
            <Th>Status</Th>
            <Th>Payment</Th>
            <Th>Type</Th>
            <Th>Registered</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={9}>
              {registrations.length === 0 ? "Nobody has registered yet." : "Nobody matches that filter."}
            </EmptyRow>
          ) : (
            rows.map((r) => (
              <Tr key={r.id}>
                <Td>{r.name}</Td>
                <Td className="text-muted">{r.email ?? "—"}</Td>
                <Td className="text-muted">{r.phone ?? "—"}</Td>
                <Td>{r.slot_label ?? "—"}</Td>
                <Td>
                  <Badge className={r.status === "cancelled" ? "text-muted" : ""}>{statusLabels[r.status]}</Badge>
                </Td>
                <Td>
                  <span className={r.payment_status === "pending" ? "text-brand" : "text-paper"}>
                    {paymentLabels[r.payment_status]}
                  </span>
                </Td>
                <Td className="text-muted">{r.member_id ? "Member" : "Guest"}</Td>
                <Td className="text-muted">{formatDayTime(r.created_at)}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    {r.status !== "attended" ? (
                      <ActionButton action={() => setRegistrationStatus(r.id, "attended")}>Attended</ActionButton>
                    ) : null}
                    {r.status !== "cancelled" ? (
                      <ActionButton
                        action={() => setRegistrationStatus(r.id, "cancelled")}
                        confirm="Cancel it?"
                        variant="danger"
                      >
                        Cancel
                      </ActionButton>
                    ) : (
                      <ActionButton action={() => setRegistrationStatus(r.id, "registered")}>Reinstate</ActionButton>
                    )}
                    {r.payment_status !== "n/a" ? (
                      <ActionButton action={() => setRegistrationPayment(r.id, r.payment_status !== "paid")}>
                        {r.payment_status === "paid" ? "Mark unpaid" : "Mark paid"}
                      </ActionButton>
                    ) : null}
                  </div>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
