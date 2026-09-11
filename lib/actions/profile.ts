"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/bookings";
import type { PreferredTime, Zone } from "@/lib/types";

const ZONES = new Set(["east", "west"]);
const TIMES = new Set(["morning", "evening", "either"]);

function refresh() {
  revalidatePath("/app");
  revalidatePath("/app/book");
  revalidatePath("/app/profile");
  revalidatePath("/app/account");
}

/** First sign-in: zone, days per week, preferred time. */
export async function completeOnboarding(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const zone = String(formData.get("zone") ?? "");
  const target = Number(formData.get("weekly_target") ?? 0);
  const time = String(formData.get("preferred_time") ?? "");

  const update: Record<string, unknown> = { onboarded_at: new Date().toISOString() };
  if (ZONES.has(zone)) update.zone_pref = zone as Zone;
  if (Number.isInteger(target) && target >= 1 && target <= 7) update.weekly_target = target;
  if (TIMES.has(time)) update.preferred_time = time as PreferredTime;

  await supabase.from("profiles").update(update).eq("id", user.id);
  refresh();
  redirect("/app");
}

export async function updateProfile(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const zone = String(formData.get("zone_pref") ?? "");
  const target = Number(formData.get("weekly_target") ?? 0);
  const time = String(formData.get("preferred_time") ?? "");
  const share = formData.get("share_attendance") === "on";

  if (fullName.length < 2) return { ok: false, error: "Tell us your name." };

  const update: Record<string, unknown> = {
    full_name: fullName,
    phone: phone || null,
    share_attendance: share,
  };
  if (ZONES.has(zone)) update.zone_pref = zone;
  if (Number.isInteger(target) && target >= 1 && target <= 7) update.weekly_target = target;
  if (TIMES.has(time)) update.preferred_time = time;

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return { ok: false, error: "Could not save. Try again." };

  refresh();
  return { ok: true, message: "Saved." };
}

/** Called after the browser has uploaded the file to avatars/<uid>/... */
export async function setAvatar(url: string | null): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  if (url && !url.includes(`/avatars/${user.id}/`)) {
    return { ok: false, error: "That photo isn't yours." };
  }

  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return { ok: false, error: "Could not save your photo." };

  refresh();
  return { ok: true, message: url ? "Photo updated." : "Photo removed." };
}
