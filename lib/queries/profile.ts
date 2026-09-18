import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** The signed-in user, resolved once per request. */
export const getMyUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

/**
 * The signed-in member's profile, fetched once per request. The member
 * layout and its viewport export both need it (data-theme and the status
 * bar colour), and React's cache dedupes the call between them.
 */
export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const { supabase, user } = await getMyUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  return data ?? null;
});
