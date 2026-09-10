import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionSecret } from "@/lib/queries/admin";
import { getSession } from "@/lib/queries/sessions";
import { checkinPath, checkinState, checkinToken, windowIndex, CHECKIN_WINDOW_SECONDS } from "@/lib/rules/checkin";
import { isStaff, type Role } from "@/lib/types";

/**
 * The current check-in link for a session, for the roster's rotating QR.
 *
 * A server action cannot be polled on a timer without a re-render, and the
 * secret must not reach the browser, so this route hands back only the
 * short-lived token the QR would encode anyway. `session_qr_secret()` limits
 * it to admins and the session's own coach.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("s");
  if (!sessionId) return NextResponse.json({ error: "Missing session." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: Role }>();
  if (!isStaff(profile?.role)) return NextResponse.json({ error: "Staff only." }, { status: 403 });

  const session = await getSession(supabase, sessionId);
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

  const secret = await getSessionSecret(supabase, sessionId);
  if (!secret) return NextResponse.json({ error: "You do not coach this session." }, { status: 403 });

  const now = new Date();
  const token = checkinToken(secret, sessionId, windowIndex(now));
  const url = new URL(checkinPath(sessionId, token), request.nextUrl.origin).toString();
  const secondsLeft = CHECKIN_WINDOW_SECONDS - Math.floor((now.getTime() / 1000) % CHECKIN_WINDOW_SECONDS);

  return NextResponse.json(
    { url, secondsLeft, state: checkinState(session, now) },
    { headers: { "cache-control": "no-store" } },
  );
}
