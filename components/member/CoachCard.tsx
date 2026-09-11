import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { ClassBadge } from "@/components/ui/Badge";
import { formatDay, formatTime } from "@/lib/format";
import type { CoachRow } from "@/lib/queries/coaches";

/** A coach in the list: photo, name, title, what they run, and when next. */
export function CoachCard({ coach }: { coach: CoachRow }) {
  const next = coach.next_session;
  return (
    <Link href={`/app/coaches/${coach.id}`} className="rule flex items-center gap-4 py-4">
      <Avatar name={coach.full_name ?? "Coach"} src={coach.avatar_url} size={56} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="display text-[22px] leading-none">{coach.full_name}</span>
          {coach.staff_title ? <span className="eyebrow">{coach.staff_title}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {coach.classes.slice(0, 3).map((slug) => (
            <ClassBadge key={slug} slug={slug} />
          ))}
          {next ? (
            <span className="text-xs text-muted">
              Next {formatDay(next.starts_at)} · {formatTime(next.starts_at)}
            </span>
          ) : (
            <span className="text-xs text-muted">No sessions in the next four weeks</span>
          )}
        </div>
      </div>
      <span className="text-muted">›</span>
    </Link>
  );
}
