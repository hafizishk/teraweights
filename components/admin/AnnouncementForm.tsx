"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/admin/ActionButton";
import { Field, Input, Select, Textarea, controlClass } from "@/components/admin/Field";
import { Table, Th, Td, Tr, EmptyRow } from "@/components/admin/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toaster";
import {
  deleteAnnouncement,
  saveAnnouncement,
  setAnnouncementPublished,
} from "@/lib/actions/announcements";
import type { ActionResult } from "@/lib/actions/bookings";
import { formatDate } from "@/lib/format";

export type Audience = "all" | "east" | "west" | "prime";

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  published_at: string | null;
  created_at: string;
  author: string | null;
};

export const AUDIENCE_LABELS: Record<Audience, string> = {
  all: "Everyone",
  east: "East",
  west: "West",
  prime: "PRIME",
};

const AUDIENCES: Audience[] = ["all", "east", "west", "prime"];

const NEW = "new";

/** Remounted on selection change so the inputs pick up the new defaults. */
function AnnouncementFields({ announcement }: { announcement: AnnouncementRow | null }) {
  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="id" value={announcement?.id ?? ""} />

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field label="Title">
          <Input name="title" defaultValue={announcement?.title ?? ""} required placeholder="Wet weather plan" />
        </Field>
        <Field label="Audience">
          <Select name="audience" defaultValue={announcement?.audience ?? "all"}>
            {AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {AUDIENCE_LABELS[a]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Body" hint="Keep it short. It shows on Home.">
        <Textarea name="body" defaultValue={announcement?.body ?? ""} required className="min-h-32" />
      </Field>

      {announcement ? null : (
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-ink-3 bg-ink px-3 py-2 text-sm">
          <input type="checkbox" name="publish" className="h-4 w-4 accent-[#b11226]" />
          <span>Publish now</span>
        </label>
      )}
    </div>
  );
}

/**
 * New / edit form above the list of everything written so far. Admins see
 * drafts as well as published rows.
 */
export function AnnouncementForm({ announcements }: { announcements: AnnouncementRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<string>(NEW);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveAnnouncement, null);

  useEffect(() => {
    if (!state) return;
    toast.show(state.ok ? state.message : state.error, state.ok ? "ok" : "error");
    if (state.ok) router.refresh();
  }, [state, toast, router]);

  const current = announcements.find((a) => a.id === selected) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{current ? "Edit announcement" : "New announcement"}</CardTitle>
          <select
            aria-label="Announcement to edit"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className={`${controlClass} w-auto`}
          >
            <option value={NEW}>New announcement</option>
            {announcements.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>

        <form action={action} className="flex flex-col gap-4">
          <AnnouncementFields key={selected} announcement={current} />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={pending} className="w-auto">
              {current ? "Save" : "Create"}
            </Button>
            {current ? (
              <button
                type="button"
                onClick={() => setSelected(NEW)}
                className="text-sm text-muted underline-offset-4 hover:underline"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </Card>

      <Table>
        <thead>
          <tr>
            <Th>Title</Th>
            <Th>Audience</Th>
            <Th>Author</Th>
            <Th>State</Th>
            <Th>Created</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {announcements.length === 0 ? (
            <EmptyRow colSpan={6}>Nothing written yet. Your first announcement goes above.</EmptyRow>
          ) : (
            announcements.map((a) => {
              const publishedAt = a.published_at;
              return (
                <Tr key={a.id} className={a.id === selected ? "bg-ink-2" : ""}>
                  <Td>
                    <span className="text-paper">{a.title}</span>
                    <span className="block max-w-xs truncate text-xs text-muted">{a.body}</span>
                  </Td>
                  <Td>
                    <Badge>{AUDIENCE_LABELS[a.audience]}</Badge>
                  </Td>
                  <Td className="text-muted">{a.author ?? "—"}</Td>
                  <Td>
                    {publishedAt ? (
                      <span className="text-paper">Published {formatDate(publishedAt)}</span>
                    ) : (
                      <span className="text-muted">Draft</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{formatDate(a.created_at)}</Td>
                  <Td className="whitespace-nowrap">
                    <span className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelected(a.id)}
                        className="inline-flex h-8 items-center whitespace-nowrap rounded-md border border-ink-3 px-3 text-xs text-paper transition-colors hover:border-muted"
                      >
                        Edit
                      </button>
                      <ActionButton
                        action={() => setAnnouncementPublished(a.id, publishedAt === null)}
                        variant={publishedAt ? "quiet" : "primary"}
                      >
                        {publishedAt ? "Unpublish" : "Publish"}
                      </ActionButton>
                      <ActionButton
                        action={() => deleteAnnouncement(a.id)}
                        variant="danger"
                        confirm="Delete it?"
                      >
                        Delete
                      </ActionButton>
                    </span>
                  </Td>
                </Tr>
              );
            })
          )}
        </tbody>
      </Table>
    </div>
  );
}
