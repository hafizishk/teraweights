import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { DuotonePhoto } from "@/components/member/DuotonePhoto";
import { TZ, formatEventDate, formatSgd } from "@/lib/format";
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

function statusFor(
  event: EventRow,
  registration: MyRegistration | undefined,
  past: boolean,
): { text: string; tone: string } {
  if (past) return { text: "Results →", tone: "text-brand" };
  if (registration?.status === "waitlisted") return { text: "Waitlisted", tone: "text-muted" };
  if (registration) return { text: "Registered", tone: "text-paper" };
  if (!event.registration_open) return { text: "Closed", tone: "text-muted" };
  return { text: "Register →", tone: "text-brand" };
}

/**
 * One event. The next one up is `featured` and gets the page's single photo;
 * everything else is a ruled row with the date set large, like a fixture list.
 */
export function EventCard({
  event,
  registration,
  registeredCount,
  past = false,
  featured = false,
}: {
  event: EventRow;
  registration?: MyRegistration;
  registeredCount?: number;
  past?: boolean;
  featured?: boolean;
}) {
  const href = past ? `/app/events/${event.slug}/results` : `/app/events/${event.slug}`;
  const status = statusFor(event, registration, past);
  const date = new Date(`${event.event_date}T00:00:00+08:00`);

  if (featured) {
    return (
      <Link href={href} className="-mx-4 block">
        <DuotonePhoto src={photoForEvent(event.type, event.cover_url)} className="h-[260px]" priority>
          <div className="flex flex-col gap-2 p-4">
            <span className={`eyebrow ${event.type === "parox" ? "text-prime" : "text-paper/80"}`}>
              {typeLabel(event.type)} · {formatEventDate(event.event_date)}
              {registeredCount ? ` · ${registeredCount} registered` : ""}
            </span>
            <h2 className="text-[36px] leading-[0.92]">{event.name}</h2>
            {event.partner_line ? <p className="text-sm text-paper/80">{event.partner_line}</p> : null}
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-sm text-paper/85">{priceLabel(event)}</span>
              <span className={`display text-lg leading-none tracking-wide ${status.tone}`}>{status.text}</span>
            </div>
          </div>
        </DuotonePhoto>
      </Link>
    );
  }

  return (
    <Link href={href} className="rule flex items-center gap-4 py-3">
      <span className="flex w-11 shrink-0 flex-col items-center">
        <span className="display tnum text-[28px] leading-none">{formatInTimeZone(date, TZ, "d")}</span>
        <span className="eyebrow uppercase">{formatInTimeZone(date, TZ, "MMM")}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`eyebrow ${event.type === "parox" && !past ? "text-prime" : ""}`}>
          {typeLabel(event.type)}
          {!past && registeredCount ? ` · ${registeredCount} registered` : ""}
        </span>
        <span className="display truncate text-[20px] leading-none">{event.name}</span>
        <span className="truncate text-[13px] text-muted">
          {past ? (event.venue_name ?? "") : (event.partner_line ?? priceLabel(event))}
        </span>
      </span>
      <span className={`display shrink-0 text-base leading-none tracking-wide ${status.tone}`}>{status.text}</span>
    </Link>
  );
}
