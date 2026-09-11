import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/onboarding";
import { getMemberPackages } from "@/lib/queries/packages";
import { activePtPack, getMyPtSessions, getPtCoaches } from "@/lib/queries/pt";
import { getPackageDefinitions } from "@/lib/queries/admin";
import { daysToRenew, describeHours } from "@/lib/rules/pt";
import { CANCELLATION_CUTOFF_HOURS } from "@/lib/rules/cancellation";
import { Avatar } from "@/components/ui/Avatar";
import { Scoreboard } from "@/components/ui/Scoreboard";
import { DuotonePhoto } from "@/components/member/DuotonePhoto";
import { PtCancelButton } from "@/components/member/PtCancelButton";
import { formatDay, formatDayTime, formatSgd, formatTime, shortVenue } from "@/lib/format";
import { photoForClass } from "@/lib/photos";

export const metadata = { title: "Personal training" };

/**
 * PT home (scope change, direction A). With a pack: next session, the
 * scoreboard, book, the coach's focus and past notes. Without one: the packs
 * and the coaches who take PT.
 */
export default async function PtPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;
  await requireOnboarded(supabase, uid);
  const now = new Date();

  const [packages, sessions, coaches, defs, { data: assignment }] = await Promise.all([
    getMemberPackages(supabase, uid),
    getMyPtSessions(supabase, uid),
    getPtCoaches(supabase),
    getPackageDefinitions(supabase, { activeOnly: true }),
    supabase
      .from("coach_assignments")
      .select("notes, created_at, coach:profiles!coach_assignments_coach_id_fkey(full_name)")
      .eq("member_id", uid)
      .limit(1)
      .maybeSingle<{ notes: string | null; created_at: string; coach: { full_name: string | null } | null }>(),
  ]);

  const pack = activePtPack(packages, now);
  const upcoming = sessions.filter((s) => s.status === "booked" && new Date(s.starts_at).getTime() > now.getTime()).reverse();
  const past = sessions.filter((s) => s.status === "attended" || s.status === "no_show" || (s.status === "booked" && new Date(s.starts_at).getTime() <= now.getTime()));
  const next = upcoming[0] ?? null;
  const ptPacks = defs.filter((d) => d.kind === "pt");
  const left = pack?.credits_remaining ?? 0;
  const done = past.filter((s) => s.status === "attended").length;

  if (!pack) {
    return (
      <div className="flex flex-col gap-5">
        <div className="-mx-4 -mt-4">
          <DuotonePhoto src={photoForClass("prime")} fadeTo="ink" priority className="h-[220px]">
            <div className="flex h-full flex-col justify-end gap-1.5 px-4 pb-4">
              <span className="eyebrow text-paper/80">Personal training</span>
              <h1 className="text-[40px] leading-[0.95]">One coach, one hour, your goal</h1>
            </div>
          </DuotonePhoto>
        </div>
        <p className="text-[16px] leading-relaxed text-paper/90">
          Buy a pack, then book sessions straight into a coach&apos;s open hours. No back and forth.
        </p>

        <section className="flex flex-col">
          <p className="eyebrow pb-1">PT packs</p>
          {ptPacks.length === 0 ? (
            <p className="rule py-6 text-center text-sm text-muted">No PT packs on sale right now.</p>
          ) : (
            ptPacks.map((p) => (
              <div key={p.id} className="rule flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="display text-[22px] leading-none">{p.name}</span>
                  <span className="text-xs text-muted">
                    {p.credits} sessions · {p.validity_days} days
                    {p.credits ? ` · ${formatSgd(p.price_sgd / p.credits)} a session` : ""}
                  </span>
                </div>
                <span className="display tnum text-[22px]">{formatSgd(p.price_sgd)}</span>
              </div>
            ))
          )}
          <p className="rule pt-3 text-xs text-muted">Buying in the app arrives with payments. Until then, ask at a session and we set it up on the spot.</p>
        </section>

        <section className="flex flex-col">
          <p className="eyebrow pb-1">Coaches taking PT</p>
          {coaches.length === 0 ? (
            <p className="rule py-6 text-center text-sm text-muted">No open hours yet.</p>
          ) : (
            coaches.map((c) => (
              <Link key={c.id} href={`/app/coaches/${c.id}`} className="rule flex items-center gap-3 py-3">
                <Avatar name={c.full_name ?? "Coach"} src={c.avatar_url} size={40} />
                <div className="flex flex-1 flex-col">
                  <span className="display text-[20px] leading-none">{c.full_name}</span>
                  <span className="eyebrow">{c.staff_title ?? "Coach"} · {describeHours(c.hours)}</span>
                </div>
                <span className="text-muted">›</span>
              </Link>
            ))
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="-mx-4 -mt-4">
        <DuotonePhoto src={photoForClass("prime")} fadeTo="ink" priority className="h-[220px]">
          <div className="flex h-full flex-col justify-end gap-1.5 px-4 pb-4">
            <span className="eyebrow text-paper/80">Personal training</span>
            {next ? (
              <>
                <h1 className="text-[40px] leading-[0.95]">
                  {formatDay(next.starts_at)}
                  <br />
                  {formatTime(next.starts_at)}
                </h1>
                <p className="text-[15px] text-paper/90">
                  {next.venue_name ? `${shortVenue(next.venue_name)} · ` : ""}
                  {next.coach_name}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-[40px] leading-[0.95]">Nothing booked</h1>
                <p className="text-[15px] text-paper/90">{left} sessions waiting on your pack.</p>
              </>
            )}
          </div>
        </DuotonePhoto>
      </div>

      <Scoreboard
        items={[
          { value: left, label: "PT sessions left" },
          { value: done, label: "done this block" },
          { value: daysToRenew(pack.expires_at, now), label: "days to renew", accent: daysToRenew(pack.expires_at, now) <= 14 },
        ]}
      />

      {left > 0 ? (
        <Link href="/app/pt/book" className="display flex h-12 items-center justify-center rounded-md bg-brand text-lg tracking-wide text-paper">
          Book a PT session
        </Link>
      ) : (
        <p className="rule pt-3 text-sm text-muted">No sessions left on this pack. Renew below to keep booking.</p>
      )}

      {upcoming.length > 0 ? (
        <section className="flex flex-col">
          <p className="eyebrow pb-1">Booked</p>
          {upcoming.map((s) => {
            const late = now.getTime() > new Date(s.starts_at).getTime() - CANCELLATION_CUTOFF_HOURS * 3_600_000;
            return (
              <div key={s.id} className="rule flex items-center gap-3 py-3">
                <span className="display tnum w-[88px] text-[22px] leading-none">{formatTime(s.starts_at)}</span>
                <div className="flex flex-1 flex-col">
                  <span className="text-[15px]">{formatDay(s.starts_at)} · {s.coach_name}</span>
                  <span className="eyebrow">{s.venue_name ? shortVenue(s.venue_name) : "Venue TBC"}</span>
                </div>
                <PtCancelButton id={s.id} late={late} />
              </div>
            );
          })}
        </section>
      ) : null}

      {assignment?.notes ? (
        <section className="rule pt-4">
          <p className="eyebrow pb-2">Coach&apos;s focus this block</p>
          <div className="flex flex-col gap-2 border-l-2 border-brand pl-3">
            <p className="text-[16px] leading-relaxed">{assignment.notes}</p>
            <span className="eyebrow">{assignment.coach?.full_name ?? "Coach"}</span>
          </div>
        </section>
      ) : null}

      <section className="flex flex-col">
        <p className="eyebrow pb-1">Past PT sessions</p>
        {past.length === 0 ? (
          <p className="rule py-6 text-center text-sm text-muted">Your first session is the assessment. Book it above.</p>
        ) : (
          past.map((s) => (
            <div key={s.id} className="rule flex items-start gap-3 py-3">
              <span className="display tnum w-[88px] shrink-0 text-[20px] leading-none">{formatDay(s.starts_at)}</span>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[15px]">{s.title ?? (s.status === "no_show" ? "Missed" : "PT session")}</span>
                {s.coach_note ? <span className="text-xs text-muted">{s.coach_note}</span> : null}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="rule flex items-center justify-between pt-4">
        <div className="flex flex-col">
          <span className="display text-[20px] leading-none">{pack.package_name}</span>
          <span className="eyebrow">Expires {formatDayTime(pack.expires_at).split(" · ")[0]} · renews with one tap once payments are in</span>
        </div>
        <Link href="/app#packages" className="display text-lg text-brand">
          Packs →
        </Link>
      </section>
    </div>
  );
}
