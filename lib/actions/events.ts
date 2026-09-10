"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
