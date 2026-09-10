import type { ClassSlug } from "@/lib/types";

/**
 * Placeholder photography until the client sends session and race photos.
 * Files live in public/photos and are shown under the brand duotone, so any
 * replacement photo of a session or the reservoir will sit on-brand.
 */
export function photoForClass(slug: ClassSlug): string {
  return `/photos/${slug}.jpg`;
}

export const EVENT_PHOTO = "/photos/event.jpg";

export function photoForEvent(type: "parox" | "kampung_grind" | "community", coverUrl?: string | null): string {
  if (coverUrl) return coverUrl;
  if (type === "parox") return EVENT_PHOTO;
  if (type === "kampung_grind") return "/photos/fitness_engine.jpg";
  return "/photos/energise_west.jpg";
}
