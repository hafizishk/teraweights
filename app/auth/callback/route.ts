import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isStaff, type Role } from "@/lib/types";

/**
 * Completes sign-in from the emailed link.
 *
 * Supabase sends one of two shapes depending on the project's auth flow:
 * `?code=` for PKCE, or `?token_hash=&type=` for the older confirmation link.
 * Both are handled so a stock project works without custom SMTP, which editing
 * the email template would otherwise require.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;

  const supabase = await createClient();

  let message: string | null = null;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    message = error?.message ?? null;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    message = error?.message ?? null;
  } else {
    message = "That sign-in link is missing its token.";
  }

  if (message) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", message);
    return NextResponse.redirect(url);
  }

  if (next) return NextResponse.redirect(new URL(next, origin));

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destination = "/app";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: Role }>();
    if (isStaff(profile?.role)) destination = "/admin";
  }

  return NextResponse.redirect(new URL(destination, origin));
}
