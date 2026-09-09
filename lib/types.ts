export type Role = "member" | "coach" | "admin";
export type Zone = "east" | "west";
export type ClassSlug = "energise_east" | "energise_west" | "prime" | "fitness_engine";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: Role;
  zone_pref: Zone | null;
  created_at: string;
};

export function isStaff(role: Role | null | undefined): boolean {
  return role === "coach" || role === "admin";
}
