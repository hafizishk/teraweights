export type Role = "member" | "coach" | "event_assistant" | "admin";

/** Roles that may reach /admin. Order is least to most privileged. */
export const STAFF_ROLES: Role[] = ["coach", "event_assistant", "admin"];

export const ROLE_LABELS: Record<Role, string> = {
  member: "Member",
  coach: "Coach",
  event_assistant: "Event assistant",
  admin: "Admin",
};

export type Zone = "east" | "west";
export type ClassSlug = "energise_east" | "energise_west" | "prime" | "fitness_engine";

export type PreferredTime = "morning" | "evening" | "either";

export type BookingStatus = "booked" | "waitlisted" | "cancelled" | "attended" | "no_show";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: Role;
  zone_pref: Zone | null;
  share_attendance: boolean;
  avatar_url: string | null;
  weekly_target: number;
  preferred_time: PreferredTime | null;
  onboarded_at: string | null;
  staff_title: string | null;
  created_at: string;
};

export function isStaff(role: Role | null | undefined): boolean {
  return role === "coach" || role === "event_assistant" || role === "admin";
}

/** Event assistants and admins work an event's registration list. */
export function isEventStaff(role: Role | null | undefined): boolean {
  return role === "event_assistant" || role === "admin";
}
