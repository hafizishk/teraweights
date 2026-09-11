import type { SupabaseClient } from "@supabase/supabase-js";
import { STAFF_ROLES, type BookingStatus, type ClassSlug, type PreferredTime, type Role, type Zone } from "@/lib/types";

/**
 * Reads for the admin portal. Every one runs as the signed-in staff member, so
 * RLS decides what comes back: an admin sees everything, a coach sees their own
 * sessions and the members in them.
 */

export type RosterEntry = {
  booking_id: string;
  member_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: BookingStatus;
  entitlement: "membership" | "credit" | "fe_credit" | null;
  credits_used: number;
  checked_in_at: string | null;
  created_at: string;
};

type RosterJoin = {
  id: string;
  member_id: string;
  status: BookingStatus;
  entitlement: RosterEntry["entitlement"];
  credits_used: number;
  checked_in_at: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null; phone: string | null; avatar_url: string | null } | null;
};

/** Everyone on a session, booked first then waitlisted, each in join order. */
export async function getRoster(supabase: SupabaseClient, sessionId: string): Promise<RosterEntry[]> {
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, member_id, status, entitlement, credits_used, checked_in_at, created_at, " +
        "profiles!bookings_member_id_fkey(full_name, email, phone, avatar_url)",
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const order: Record<string, number> = { booked: 0, attended: 0, no_show: 0, waitlisted: 1, cancelled: 2 };

  return ((data ?? []) as unknown as RosterJoin[])
    .map((r) => ({
      booking_id: r.id,
      member_id: r.member_id,
      name: r.profiles?.full_name ?? "Energiser",
      email: r.profiles?.email ?? null,
      phone: r.profiles?.phone ?? null,
      avatar_url: r.profiles?.avatar_url ?? null,
      status: r.status,
      entitlement: r.entitlement,
      credits_used: r.credits_used,
      checked_in_at: r.checked_in_at,
      created_at: r.created_at,
    }))
    .sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3) || a.created_at.localeCompare(b.created_at));
}

export type RosterCounts = { booked: number; waitlisted: number; attended: number; no_show: number };

export async function getRosterCounts(supabase: SupabaseClient, sessionId: string): Promise<RosterCounts> {
  const { data } = await supabase.rpc("session_roster_counts", { p_session_id: sessionId });
  const row = (data as RosterCounts[] | null)?.[0];
  return row ?? { booked: 0, waitlisted: 0, attended: 0, no_show: 0 };
}

/** The session's check-in secret. Admins and the session's own coach only. */
export async function getSessionSecret(supabase: SupabaseClient, sessionId: string): Promise<string | null> {
  const { data } = await supabase.rpc("session_qr_secret", { p_session_id: sessionId });
  return (data as string | null) ?? null;
}

export type MemberRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  zone_pref: Zone | null;
  avatar_url: string | null;
  weekly_target: number;
  preferred_time: PreferredTime | null;
  onboarded_at: string | null;
  staff_title: string | null;
  bio: string | null;
  created_at: string;
};

const MEMBER_COLUMNS =
  "id, full_name, email, phone, role, zone_pref, avatar_url, weekly_target, preferred_time, onboarded_at, staff_title, bio, created_at";

/** All profiles, newest first, optionally filtered by a name or email fragment. */
export async function getMembers(supabase: SupabaseClient, search?: string): Promise<MemberRow[]> {
  let query = supabase.from("profiles").select(MEMBER_COLUMNS).order("full_name", { ascending: true });

  const term = (search ?? "").trim();
  if (term) {
    const safe = term.replace(/[%,()]/g, " ");
    query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
  }

  const { data } = await query;
  return (data ?? []) as MemberRow[];
}

export async function getMember(supabase: SupabaseClient, id: string): Promise<MemberRow | null> {
  const { data } = await supabase.from("profiles").select(MEMBER_COLUMNS).eq("id", id).maybeSingle();
  return (data as MemberRow) ?? null;
}

/** Everyone who can reach /admin, for the staff directory and coach pickers. */
export async function getStaff(supabase: SupabaseClient): Promise<MemberRow[]> {
  const { data } = await supabase
    .from("profiles")
    .select(MEMBER_COLUMNS)
    .in("role", STAFF_ROLES)
    .order("full_name", { ascending: true });
  return (data ?? []) as MemberRow[];
}

/** Only those who run sessions, for "assign coach" and the session coach picker. */
export async function getCoaches(supabase: SupabaseClient): Promise<MemberRow[]> {
  const { data } = await supabase
    .from("profiles")
    .select(MEMBER_COLUMNS)
    .in("role", ["coach", "admin"])
    .order("full_name", { ascending: true });
  return (data ?? []) as MemberRow[];
}

export type AllowlistRow = { email: string; role: Role; created_at: string };

/**
 * Staff invited by email who have not signed in yet. handle_new_user() reads
 * this table on first sign-in and stamps the role onto the new profile.
 */
export async function getStaffInvites(supabase: SupabaseClient): Promise<AllowlistRow[]> {
  const [{ data: allowed }, { data: existing }] = await Promise.all([
    supabase.from("admin_allowlist").select("email, role, created_at").order("created_at", { ascending: false }),
    supabase.from("profiles").select("email"),
  ]);

  const claimed = new Set(
    ((existing ?? []) as { email: string | null }[]).map((p) => (p.email ?? "").toLowerCase()).filter(Boolean),
  );
  return ((allowed ?? []) as AllowlistRow[]).filter((a) => !claimed.has(a.email.toLowerCase()));
}

export type MemberBooking = {
  id: string;
  status: BookingStatus;
  entitlement: "membership" | "credit" | "fe_credit" | null;
  credits_used: number;
  checked_in_at: string | null;
  session_id: string;
  starts_at: string;
  class_slug: ClassSlug;
  venue_name: string;
};

type MemberBookingJoin = {
  id: string;
  status: BookingStatus;
  entitlement: MemberBooking["entitlement"];
  credits_used: number;
  checked_in_at: string | null;
  session_id: string;
  sessions: {
    starts_at: string;
    class_types: { slug: ClassSlug } | null;
    venues: { name: string } | null;
  } | null;
};

/** A member's booking history, newest session first. */
export async function getMemberBookings(
  supabase: SupabaseClient,
  memberId: string,
  limit = 40,
): Promise<MemberBooking[]> {
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, status, entitlement, credits_used, checked_in_at, session_id, " +
        "sessions(starts_at, class_types(slug), venues(name))",
    )
    .eq("member_id", memberId)
    .limit(limit);

  return ((data ?? []) as unknown as MemberBookingJoin[])
    .map((b) => ({
      id: b.id,
      status: b.status,
      entitlement: b.entitlement,
      credits_used: b.credits_used,
      checked_in_at: b.checked_in_at,
      session_id: b.session_id,
      starts_at: b.sessions?.starts_at ?? "",
      class_slug: b.sessions?.class_types?.slug ?? "energise_east",
      venue_name: b.sessions?.venues?.name ?? "",
    }))
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
}

export type AdjustmentRow = {
  id: string;
  delta: number;
  kind: "credit" | "fe_credit";
  reason: string;
  created_at: string;
  by_name: string | null;
};

export async function getCreditAdjustments(
  supabase: SupabaseClient,
  memberId: string,
): Promise<AdjustmentRow[]> {
  const { data } = await supabase
    .from("credit_adjustments")
    .select("id, delta, kind, reason, created_at, profiles!credit_adjustments_created_by_fkey(full_name)")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as unknown as (Omit<AdjustmentRow, "by_name"> & {
    profiles: { full_name: string | null } | null;
  })[]).map(({ profiles, ...rest }) => ({ ...rest, by_name: profiles?.full_name ?? null }));
}

export type PackageDefinition = {
  id: string;
  name: string;
  description: string | null;
  kind: "membership" | "credits" | "dropin" | "pt";
  tier: "energise" | "pro" | null;
  variant: "weekday" | "weekend" | "west" | null;
  term_months: number | null;
  validity_days: number;
  credits: number | null;
  price_sgd: number;
  price_per_month: number | null;
  allowed_class_types: string[];
  fe_credits_included: number;
  cashback_eligible: boolean;
  perks: string[];
  is_active: boolean;
  is_trial: boolean;
};

export async function getPackageDefinitions(
  supabase: SupabaseClient,
  { activeOnly = false } = {},
): Promise<PackageDefinition[]> {
  let query = supabase.from("packages").select("*").order("kind").order("price_sgd");
  if (activeOnly) query = query.eq("is_active", true);
  const { data } = await query;
  return ((data ?? []) as PackageDefinition[]).map((p) => ({
    ...p,
    price_sgd: Number(p.price_sgd),
    price_per_month: p.price_per_month === null ? null : Number(p.price_per_month),
  }));
}

export type EventRegistrationRow = {
  id: string;
  member_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  status: "registered" | "waitlisted" | "cancelled" | "attended";
  payment_status: "n/a" | "pending" | "paid";
  slot_id: string | null;
  slot_label: string | null;
  created_at: string;
};

type RegistrationJoin = {
  id: string;
  member_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  status: EventRegistrationRow["status"];
  payment_status: EventRegistrationRow["payment_status"];
  slot_id: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null;
  event_slots: { label: string } | null;
};

/** Everyone registered for an event, members and guests together. */
export async function getEventRegistrations(
  supabase: SupabaseClient,
  eventId: string,
): Promise<EventRegistrationRow[]> {
  const { data } = await supabase
    .from("event_registrations")
    .select(
      "id, member_id, guest_name, guest_email, guest_phone, status, payment_status, slot_id, created_at, " +
        "profiles(full_name, email, phone), event_slots(label)",
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  return ((data ?? []) as unknown as RegistrationJoin[]).map((r) => ({
    id: r.id,
    member_id: r.member_id,
    name: r.profiles?.full_name ?? r.guest_name ?? "Guest",
    email: r.profiles?.email ?? r.guest_email,
    phone: r.profiles?.phone ?? r.guest_phone,
    status: r.status,
    payment_status: r.payment_status,
    slot_id: r.slot_id,
    slot_label: r.event_slots?.label ?? null,
    created_at: r.created_at,
  }));
}

export type PendingPayment = {
  id: string;
  member_id: string;
  member_name: string;
  package_name: string;
  purchased_at: string;
};

export async function getPendingPayments(supabase: SupabaseClient): Promise<PendingPayment[]> {
  const { data } = await supabase
    .from("member_packages")
    .select("id, member_id, purchased_at, packages(name), profiles(full_name)")
    .eq("payment_status", "pending")
    .order("purchased_at", { ascending: false });

  return ((data ?? []) as unknown as {
    id: string;
    member_id: string;
    purchased_at: string;
    packages: { name: string } | null;
    profiles: { full_name: string | null } | null;
  }[]).map((r) => ({
    id: r.id,
    member_id: r.member_id,
    member_name: r.profiles?.full_name ?? "Energiser",
    package_name: r.packages?.name ?? "Package",
    purchased_at: r.purchased_at,
  }));
}

/** Members and guests who could own a result row, for CSV matching. */
export async function getResultCandidates(
  supabase: SupabaseClient,
  eventId: string,
): Promise<{ id: string; email: string | null; fullName: string | null; registrationId: string | null }[]> {
  const [registrations, { data: profiles }] = await Promise.all([
    getEventRegistrations(supabase, eventId),
    supabase.from("profiles").select("id, full_name, email"),
  ]);

  const byMember = new Map<string, string>();
  for (const r of registrations) if (r.member_id) byMember.set(r.member_id, r.id);

  return ((profiles ?? []) as { id: string; full_name: string | null; email: string | null }[]).map((p) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    registrationId: byMember.get(p.id) ?? null,
  }));
}
