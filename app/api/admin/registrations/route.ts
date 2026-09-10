import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEventRegistrations } from "@/lib/queries/admin";
import { getEventBySlug } from "@/lib/queries/events";
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/format";
import type { Role } from "@/lib/types";

/** A CSV cell: quoted when it contains a comma, quote or newline. */
function cell(value: string | null): string {
  const v = value ?? "";
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * Registrations export (brief section 9). A route rather than a server action,
 * because an action cannot return a file download.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("event");
  if (!slug) return NextResponse.json({ error: "Missing event." }, { status: 400 });

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
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const event = await getEventBySlug(supabase, slug);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const rows = await getEventRegistrations(supabase, event.id);
  const header = ["name", "email", "phone", "wave", "status", "payment", "member", "registered_at"];
  const body = rows.map((r) =>
    [
      cell(r.name),
      cell(r.email),
      cell(r.phone),
      cell(r.slot_label),
      cell(r.status),
      cell(r.payment_status),
      r.member_id ? "yes" : "guest",
      cell(formatInTimeZone(new Date(r.created_at), TZ, "yyyy-MM-dd HH:mm")),
    ].join(","),
  );

  return new NextResponse([header.join(","), ...body].join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${event.slug}-registrations.csv"`,
      "cache-control": "no-store",
    },
  });
}
