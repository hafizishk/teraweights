"use client";

import { useState } from "react";
import { Select } from "@/components/admin/Field";
import { ActionButton } from "@/components/admin/ActionButton";
import { Avatar } from "@/components/ui/Avatar";
import { assignCoach, removeCoach } from "@/lib/actions/members";
import type { MemberRow } from "@/lib/queries/admin";

export type AssignedCoach = { id: string; name: string; avatar_url?: string | null };

/** Current coaches, each removable, plus a picker for the rest of the staff. */
export function CoachPicker({
  memberId,
  assigned,
  staff,
}: {
  memberId: string;
  assigned: AssignedCoach[];
  staff: MemberRow[];
}) {
  const taken = new Set(assigned.map((c) => c.id));
  const available = staff.filter((s) => !taken.has(s.id));

  const [choice, setChoice] = useState("");
  const selected = available.some((s) => s.id === choice) ? choice : (available[0]?.id ?? "");

  return (
    <div className="flex flex-col gap-4">
      {assigned.length === 0 ? (
        <p className="text-sm text-muted">No coach assigned yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {assigned.map((coach) => (
            <li
              key={coach.id}
              className="flex items-center justify-between gap-3 rounded-md border border-ink-3 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm">
                <Avatar name={coach.name} src={coach.avatar_url} size={24} />
                {coach.name}
              </span>
              <ActionButton
                action={() => removeCoach(memberId, coach.id)}
                confirm="Remove?"
                variant="danger"
              >
                Remove
              </ActionButton>
            </li>
          ))}
        </ul>
      )}

      {available.length === 0 ? (
        <p className="text-sm text-muted">Every coach is already assigned.</p>
      ) : (
        <div className="flex items-end gap-2">
          <Select
            aria-label="Coach to assign"
            value={selected}
            onChange={(e) => setChoice(e.target.value)}
            className="max-w-xs"
          >
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name ?? s.email ?? "Staff"} ({s.role})
              </option>
            ))}
          </Select>
          <ActionButton action={() => assignCoach(memberId, selected)} variant="primary" className="h-10">
            Assign coach
          </ActionButton>
        </div>
      )}
    </div>
  );
}
