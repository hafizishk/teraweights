import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isStaff, type Role } from "@/lib/types";

/**
 * Refreshes the Supabase session cookie and gates routes by role.
 *   /app/*   → any authenticated user
 *   /admin/* → coach or admin
 * RLS remains the real guard; this only shapes navigation.
 */
export async function updateSession(request: NextRequest) {
  // A sign-in link can land on any path: Supabase falls back to the project's
  // Site URL when a redirect target isn't allowlisted, and older emails carry
  // whatever target they were sent with. Funnel the token to /auth/callback
  // wherever it arrives, so the link works either way.
  const { pathname, searchParams } = request.nextUrl;
  const hasAuthToken =
    searchParams.has("code") || (searchParams.has("token_hash") && searchParams.has("type"));

  if (hasAuthToken && pathname !== "/auth/callback") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() validates the JWT with Supabase Auth; do not use getSession() here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const wantsApp = pathname === "/app" || pathname.startsWith("/app/");
  const wantsAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const wantsLogin = pathname === "/login";

  if (!user && (wantsApp || wantsAdmin)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && wantsLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && wantsAdmin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: Role }>();

    if (!isStaff(profile?.role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/app";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
