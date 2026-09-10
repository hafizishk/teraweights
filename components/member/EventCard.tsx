import Link from "next/link";
import { DuotonePhoto } from "@/components/member/DuotonePhoto";
import { formatEventDate, formatSgd } from "@/lib/format";
import { photoForEvent } from "@/lib/photos";
import type { EventRow, MyRegistration } from "@/lib/queries/events";

export function priceLabel(e: Pick<EventRow, "is_free" | "price_sgd">): string {
  if (e.is_free) return "Free";
  if (e.price_sgd === null) return "Entry fee TBC";
  return formatSgd(e.price_sgd);
}

export function typeLabel(type: EventRow["type"]): string {
  return type === "parox" ? "PA.ROX" : type === "kampung_grind" ? "Kampung Grind" : "Community";
}

export function EventCard({
  event,
  registration,
  registeredCount,
  past = false,
}: {
  event: EventRow;
  registration?: MyRegistration;
  registeredCount?: number;
  past?: boolean;
}) {
  const href = past ? `/app/events/${event.slug}/results` : `/app/events/${event.slug}`;

  let status: { text: string; tone: string };
  if (past) status = { text: "View results →", tone: "text-brand" };
  else if (registration?.status === "waitlisted") status = { text: "Waitlisted", tone: "text-muted" };
  else if (registration) status = { text: "Registered ✓", tone: "text-paper" };
  else if (!event.registration_open) status = { text: "Registration closed", tone: "text-muted" };
  else status = { text: "Register →", tone: "text-brand" };

  return (
    <Link
      href={href}
      className="flex flex-col overflow-hidden rounded-lg border border-ink-3 bg-ink-2 hover:border-muted"
    >
      <DuotonePhoto src={photoForEvent(event.type, event.cover_url)} fadeTo="card" className="h-[140px]">
        <div className="flex items-end justify-between p-4">
          <span className={`text-xs uppercase tracking-widest ${event.type === "parox" ? "text-prime" : "text-paper/80"}`}>
            {typeLabel(event.type)} · {formatEventDate(event.event_date)}
          </span>
          {!past && registeredCount ? (
            <span className="text-xs text-paper/80">{registeredCount} registered</span>
          ) : null}
        </div>
      </DuotonePhoto>
      <div className="flex flex-col gap-2 px-4 pb-4">
        <h2 className="text-[22px] leading-[1.05]">{event.name}</h2>
        {event.partner_line ? <p className="text-sm text-muted">{event.partner_line}</p> : null}
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-sm">{past ? (event.venue_name ?? "") : priceLabel(event)}</span>
          <span className={`display shrink-0 whitespace-nowrap text-lg leading-none ${status.tone}`}>{status.text}</span>
        </div>
      </div>
    </Link>
  );
}
