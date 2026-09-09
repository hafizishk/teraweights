/**
 * Waitlist — brief section 7: at capacity, new bookings are waitlisted with no
 * deduction. On a cancellation the earliest waitlisted booking is promoted and
 * its entitlement resolved then.
 */

export type Capacity = {
  capacity: number;
  bookedCount: number;
};

export function spotsLeft({ capacity, bookedCount }: Capacity): number {
  return Math.max(0, capacity - bookedCount);
}

export function isFull(c: Capacity): boolean {
  return spotsLeft(c) === 0;
}

/** "3 left" · "1 left" · "Full — waitlist" (brief section 8). */
export function spotsLabel(c: Capacity): string {
  const left = spotsLeft(c);
  if (left === 0) return "Full — waitlist";
  return `${left} left`;
}

/** The booking to promote when a seat frees up: earliest joiner first. */
export function nextToPromote<T extends { id: string; created_at: string }>(
  waitlisted: T[],
): T | null {
  if (waitlisted.length === 0) return null;
  return [...waitlisted].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0];
}
