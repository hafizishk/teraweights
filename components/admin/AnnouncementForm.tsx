"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toaster";
import { Field, Input, Select, Textarea, controlClass } from "@/components/admin/Field";
import { Table, Th, Td, Tr, EmptyRow } from "@/components/admin/Table";
import { ActionButton } from "@/components/admin/ActionButton";
import { PostImageUpload } from "@/components/admin/PostImageUpload";
import {
  deleteAnnouncement,
  saveAnnouncement,
  setAnnouncementArchived,
  setAnnouncementPublished,
} from "@/lib/actions/announcements";
import { CATEGORY_LABELS, type PostCategory, type PostRow } from "@/lib/queries/posts";
import { formatDate } from "@/lib/format";
import type { ActionResult } from "@/lib/actions/bookings";

export type Audience = "all" | "east" | "west" | "prime";

export const AUDIENCE_LABELS: Record<Audience, string> = {
  all: "Everyone",
  east: "East",
  west: "West",
  prime: "PRIME",
};

const AUDIENCES: Audience[] = ["all", "east", "west", "prime"];
const CATEGORIES: PostCategory[] = ["announcement", "news", "recipe", "photos"];
const NEW = "new";

/** Remounted on selection change so the inputs pick up the new defaults. */
function PostFields({ post }: { post: PostRow | null }) {
  const [cover, setCover] = useState<string | null>(post?.cover_url ?? null);
  const [images, setImages] = useState<string[]>(post?.images ?? []);

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="id" value={post?.id ?? ""} />
      <input type="hidden" name="cover_url" value={cover ?? ""} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
        <Field label="Title">
          <Input name="title" defaultValue={post?.title ?? ""} required placeholder="Wet weather plan" />
        </Field>
        <Field label="Category">
          <Select name="category" defaultValue={post?.category ?? "announcement"}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Audience">
          <Select name="audience" defaultValue={post?.audience ?? "all"}>
            {AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {AUDIENCE_LABELS[a]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Body" hint="A blank line starts a new paragraph. A line beginning with # is a heading.">
        <Textarea name="body" defaultValue={post?.body ?? ""} required className="min-h-40" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-muted">Cover photo</span>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="aspect-[16/9] w-full rounded-md object-cover" />
          ) : (
            <div className="flex aspect-[16/9] items-center justify-center rounded-md border border-dashed border-ink-3 text-xs text-muted">
              No cover. The feed shows the title alone.
            </div>
          )}
          <div className="flex gap-2">
            <PostImageUpload label={cover ? "Replace cover" : "Upload cover"} onUploaded={(urls) => setCover(urls[0] ?? null)} />
            {cover ? (
              <button type="button" onClick={() => setCover(null)} className="text-xs text-muted underline underline-offset-4">
                Remove
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-muted">Gallery</span>
          {images.length === 0 ? (
            <div className="flex aspect-[16/9] items-center justify-center rounded-md border border-dashed border-ink-3 text-xs text-muted">
              No extra photos yet.
            </div>
          ) : (
            <ul className="grid grid-cols-4 gap-2">
              {images.map((url) => (
                <li key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="aspect-square w-full rounded-md object-cover" />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                    className="absolute right-1 top-1 rounded bg-ink/80 px-1.5 text-xs text-paper"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div>
            <PostImageUpload label="Add photos" multiple onUploaded={(urls) => setImages((prev) => [...prev, ...urls].slice(0, 24))} />
          </div>
        </div>
      </div>

      {post ? null : (
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-ink-3 bg-ink px-3 py-2 text-sm">
          <input type="checkbox" name="publish" className="h-4 w-4 accent-[#b11226]" />
          <span>Publish now</span>
        </label>
      )}
    </div>
  );
}

function stateOf(p: PostRow): { label: string; tone: string } {
  if (p.archived_at) return { label: "Archived", tone: "text-muted" };
  if (p.published_at) return { label: `Published ${formatDate(p.published_at)}`, tone: "text-paper" };
  return { label: "Draft", tone: "text-muted" };
}

/**
 * Composer above the list of everything written so far. Admins see drafts
 * and archived posts as well as the live feed.
 */
export function AnnouncementForm({ posts }: { posts: PostRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<string>(NEW);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveAnnouncement, null);

  useEffect(() => {
    if (!state) return;
    toast.show(state.ok ? state.message : state.error, state.ok ? "ok" : "error");
    if (state.ok) {
      setSelected(NEW);
      router.refresh();
    }
  }, [state, toast, router]);

  const current = posts.find((a) => a.id === selected) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{current ? "Edit post" : "New post"}</CardTitle>
          <select
            aria-label="Post to edit"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className={`${controlClass} w-auto`}
          >
            <option value={NEW}>New post</option>
            {posts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>

        <form action={action} className="flex flex-col gap-4">
          <PostFields key={selected} post={current} />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={pending} className="w-auto">
              {current ? "Save" : "Create"}
            </Button>
            {current ? (
              <button type="button" onClick={() => setSelected(NEW)} className="text-sm text-muted underline-offset-4 hover:underline">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </Card>

      <Table>
        <thead>
          <tr>
            <Th>Post</Th>
            <Th>Category</Th>
            <Th>Audience</Th>
            <Th>Author</Th>
            <Th>State</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {posts.length === 0 ? (
            <EmptyRow colSpan={6}>Nothing written yet. The first post lands on every Energiser&apos;s Home.</EmptyRow>
          ) : (
            posts.map((p) => {
              const st = stateOf(p);
              return (
                <Tr key={p.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      {p.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.cover_url} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
                      ) : (
                        <span className="h-10 w-16 shrink-0 rounded border border-dashed border-ink-3" />
                      )}
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{p.title}</span>
                        <span className="text-xs text-muted">/{p.slug}</span>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge>{CATEGORY_LABELS[p.category]}</Badge>
                  </Td>
                  <Td>
                    <Badge>{AUDIENCE_LABELS[p.audience]}</Badge>
                  </Td>
                  <Td className="text-muted">{p.author_name ?? "—"}</Td>
                  <Td className={`whitespace-nowrap ${st.tone}`}>{st.label}</Td>
                  <Td className="whitespace-nowrap">
                    <span className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(p.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex h-8 items-center rounded-md border border-ink-3 px-3 text-xs text-paper hover:border-muted"
                      >
                        Edit
                      </button>
                      {p.archived_at ? (
                        <ActionButton action={setAnnouncementArchived.bind(null, p.id, false)}>Restore</ActionButton>
                      ) : p.published_at ? (
                        <>
                          <ActionButton action={setAnnouncementPublished.bind(null, p.id, false)}>Unpublish</ActionButton>
                          <ActionButton action={setAnnouncementArchived.bind(null, p.id, true)} confirm="Archive this post?" variant="danger">
                            Archive
                          </ActionButton>
                        </>
                      ) : (
                        <>
                          <ActionButton action={setAnnouncementPublished.bind(null, p.id, true)} variant="primary">
                            Publish
                          </ActionButton>
                          <ActionButton action={deleteAnnouncement.bind(null, p.id)} confirm="Delete this draft?" variant="danger">
                            Delete
                          </ActionButton>
                        </>
                      )}
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
