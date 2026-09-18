import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/queries/sessions";
import { getMyPtSessions } from "@/lib/queries/pt";
import { buildIcs, type CalendarEvent } from "@/lib/rules/calendar";
import { firstName } from "@/lib/format";

/**
 * GET /api/calendar?kind=session|pt|event&id=...&slot=...
 *
 * An .ics for something the signed-in member has booked. Reads run under
 * their RLS, so a member can only fetch calendars for things they can see.
 * Apple devices open the file straight into Calendar; Android members get a
 * Google Calendar link from the sheet instead and never hit this route.
 */
const EVENT_HOURS = 2;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const kind = searchParams.get("kind");
  const id = searchParams.get("id");
  const slotId = searchParams.get("slot");
  if (!kind || !id) return new NextResponse("Missing kind or id", { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Sign in first", { status: 401 });

  let ev: CalendarEvent | null = null;

  if (kind === "session") {
    const s = await getSession(supabase, id);
    if (s) {
      ev = {
        uid: `session-${s.id}@teraweights`,
        title: `${s.class_name} · Teraweights`,
        description: s.coach_name ? `Coach: ${s.coach_name}` : null,
        location: s.venue_name,
        start: s.starts_at,
        end: s.ends_at,
        url: `${origin}/app/book?s=${s.id}`,
      };
    }
  } else if (kind === "pt") {
    const mine = await getMyPtSessions(supabase, user.id);
    const s = mine.find((x) => x.id === id);
    if (s) {
      ev = {
        uid: `pt-${s.id}@teraweights`,
        title: `PT with ${firstName(s.coach_name)} · Teraweights`,
        description: s.title,
        location: s.venue_name ?? "Agree with your coach",
        start: s.starts_at,
        end: s.ends_at,
        url: `${origin}/app/pt`,
      };
    }
  } else if (kind === "event") {
    const { data: e } = await supabase
      .from("events")
      .select("id, slug, name, event_date, partner_line, venues(name)")
      .eq("id", id)
      .maybeSingle<{ id: string; slug: string; name: string; event_date: string; partner_line: string | null; venues: { name: string } | null }>();
    if (e) {
      const { data: slot } = slotId
        ? await supabase.from("event_slots").select("label, starts_at").eq("id", slotId).maybeSingle<{ label: string; starts_at: string }>()
        : { data: null };
      const base = {
        uid: `event-${e.id}${slot ? `-${slotId}` : ""}@teraweights`,
        title: `${e.name} · Teraweights`,
        description: [slot?.label, e.partner_line].filter(Boolean).join("\n") || null,
        location: e.venues?.name ?? null,
        url: `${origin}/app/events/${e.slug}`,
      };
      ev = slot
        ? { ...base, start: slot.starts_at, end: new Date(new Date(slot.starts_at).getTime() + EVENT_HOURS * 3_600_000).toISOString() }
        : { ...base, start: e.event_date, allDay: true };
    }
  } else {
    return new NextResponse("Unknown kind", { status: 400 });
  }

  if (!ev) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(buildIcs(ev), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="teraweights-${kind}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
