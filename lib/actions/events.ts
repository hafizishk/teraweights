"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireEventStaff, readableError } from "@/lib/actions/guard";
import type { ActionResult } from "@/lib/actions/bookings";

function readable(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  if (/already registered/i.test(message)) return message;
  if (/needs an account|Pick a slot|closed|required/i.test(message)) return message;
  if (/violates|permission denied|JWT/i.test(message)) return fallback;
  return message;
}

function refresh(slug: string) {
  revalidatePath("/app");
  revalidatePath("/app/events");
  revalidatePath(`/app/events/${slug}`);
  revalidatePath(`/events/${slug}`);
}

type Registered = { status: string; payment_status: string };

function successMessage(r: Registered | undefined): string {
  if (r?.status === "waitlisted") return "That wave is full. You're on the waitlist.";
  if (r?.payment_status === "pending") return "Registered. We'll confirm payment details with you.";
  return "Registered. See you there.";
}

/** A signed-in member registers for a slot. */
export async function registerForEvent(eventId: string, slug: string, slotId: string | null): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data, error } = await supabase.rpc("register_for_event", {
    p_event_id: eventId,
    p_slot_id: slotId,
  });
  if (error) return { ok: false, error: readable(error.message, "Could not register.") };

  refresh(slug);
  return { ok: true, message: successMessage((data as Registered[] | null)?.[0]) };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A guest registers for a public event with name, email and phone.
 * Runs with the service role (the one sanctioned use besides CSV import), so
 * auth.uid() is null inside register_for_event and the guest rules apply.
 */
export async function registerGuest(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const eventId = String(formData.get("eventId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const slotId = String(formData.get("slotId") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!eventId || !slug) return { ok: false, error: "Something went wrong. Reload and try again." };
  if (name.length < 2) return { ok: false, error: "Tell us your name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (phone.length < 8) return { ok: false, error: "Enter a phone number we can reach you on." };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("register_for_event", {
    p_event_id: eventId,
    p_slot_id: slotId,
    p_guest_name: name,
    p_guest_email: email,
    p_guest_phone: phone,
  });
  if (error) return { ok: false, error: readable(error.message, "Could not register.") };

  refresh(slug);
  return { ok: true, message: successMessage((data as Registered[] | null)?.[0]) };
}

export async function cancelEventRegistration(registrationId: string, slug: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { error } = await supabase.rpc("cancel_event_registration", { p_registration_id: registrationId });
  if (error) return { ok: false, error: readable(error.message, "Could not cancel.") };

  refresh(slug);
  return { ok: true, message: "Registration cancelled." };
}

// ---------------------------------------------------------------------------
// Admin: events, slots and registrations (brief section 9).
// ---------------------------------------------------------------------------

const EVENT_TYPES = ["parox", "kampung_grind", "community"];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function adminRefresh(slug?: string) {
  revalidatePath("/admin/events");
  revalidatePath("/app/events");
  if (slug) {
    revalidatePath(`/app/events/${slug}`);
    revalidatePath(`/events/${slug}`);
  }
}

/**
 * Create or update an event. On create the slug is derived from the name, and
 * a collision gets a short suffix rather than an error the admin has to solve
 * by inventing a different name.
 */
export async function saveEvent(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const eventDate = String(formData.get("event_date") ?? "");
  const isFree = formData.get("is_free") === "on";
  const price = String(formData.get("price_sgd") ?? "").trim();

  if (!name) return { ok: false, error: "Give the event a name." };
  if (!EVENT_TYPES.includes(type)) return { ok: false, error: "Pick an event type." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return { ok: false, error: "Pick a date." };

  const fields = {
    name,
    type,
    event_date: eventDate,
    description: String(formData.get("description") ?? "").trim() || null,
    cover_url: String(formData.get("cover_url") ?? "").trim() || null,
    venue_id: String(formData.get("venue_id") ?? "") || null,
    is_free: isFree,
    price_sgd: isFree || !price ? null : Number(price),
    is_public: formData.get("is_public") === "on",
    requires_account: formData.get("requires_account") === "on",
    registration_open: formData.get("registration_open") === "on",
    partner_line: String(formData.get("partner_line") ?? "").trim() || null,
  };

  if (id) {
    const { data, error } = await guard.supabase
      .from("events")
      .update(fields)
      .eq("id", id)
      .select("slug")
      .maybeSingle<{ slug: string }>();
    if (error) return { ok: false, error: readableError(error.message, "Could not save that event.") };
    adminRefresh(data?.slug);
    return { ok: true, message: "Event saved." };
  }

  let slug = slugify(name) || "event";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await guard.supabase
      .from("events")
      .insert({ ...fields, slug })
      .select("slug")
      .maybeSingle<{ slug: string }>();
    if (!error) {
      adminRefresh(data?.slug);
      return { ok: true, message: "Event created." };
    }
    if (error.code !== "23505") {
      return { ok: false, error: readableError(error.message, "Could not create that event.") };
    }
    slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return { ok: false, error: "Could not find a free URL for that name. Try a different one." };
}

/** Create or update one wave. */
export async function saveSlot(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const id = String(formData.get("id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const capacity = Number(formData.get("capacity") ?? 0);

  if (!eventId) return { ok: false, error: "Missing event." };
  if (!label) return { ok: false, error: "Give the wave a label." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Pick a date." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { ok: false, error: "Enter a time as HH:mm." };
  if (!Number.isFinite(capacity) || capacity < 1) return { ok: false, error: "Capacity must be at least 1." };

  const fields = {
    event_id: eventId,
    label,
    starts_at: new Date(`${date}T${time}:00+08:00`).toISOString(),
    capacity,
  };

  const { error } = id
    ? await guard.supabase.from("event_slots").update(fields).eq("id", id)
    : await guard.supabase.from("event_slots").insert(fields);
  if (error) return { ok: false, error: readableError(error.message, "Could not save that wave.") };

  adminRefresh();
  return { ok: true, message: id ? "Wave saved." : "Wave added." };
}

export async function deleteSlot(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { count } = await guard.supabase
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("slot_id", id)
    .neq("status", "cancelled");
  if ((count ?? 0) > 0) {
    return { ok: false, error: `${count} people are registered for that wave. Move them first.` };
  }

  const { error } = await guard.supabase.from("event_slots").delete().eq("id", id);
  if (error) return { ok: false, error: readableError(error.message, "Could not delete that wave.") };

  adminRefresh();
  return { ok: true, message: "Wave deleted." };
}

/** Mark a registration attended, or cancel it on someone's behalf. */
export async function setRegistrationStatus(
  id: string,
  status: "registered" | "waitlisted" | "cancelled" | "attended",
): Promise<ActionResult> {
  const guard = await requireEventStaff();
  if (!guard.ok) return guard;

  const { error } = await guard.supabase.from("event_registrations").update({ status }).eq("id", id);
  if (error) return { ok: false, error: readableError(error.message, "Could not update that registration.") };

  adminRefresh();
  return { ok: true, message: "Registration updated." };
}

/** Records a PayNow payment against an event registration. */
export async function setRegistrationPayment(id: string, paid: boolean): Promise<ActionResult> {
  const guard = await requireEventStaff();
  if (!guard.ok) return guard;

  const { error } = await guard.supabase
    .from("event_registrations")
    .update({ payment_status: paid ? "paid" : "pending" })
    .eq("id", id);
  if (error) return { ok: false, error: readableError(error.message, "Could not update that payment.") };

  adminRefresh();
  return { ok: true, message: paid ? "Payment recorded." : "Marked unpaid." };
}
