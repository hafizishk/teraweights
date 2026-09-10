export type Role = "member" | "coach" | "admin";
export type Zone = "east" | "west";
export type ClassSlug = "energise_east" | "energise_west" | "prime" | "fitness_engine";

export type PreferredTime = "morning" | "evening" | "either";

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
  created_at: string;
};

export function isStaff(role: Role | null | undefined): boolean {
  return role === "coach" || role === "admin";
}
