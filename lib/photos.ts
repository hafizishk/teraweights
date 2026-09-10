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
