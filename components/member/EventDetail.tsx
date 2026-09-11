import { DuotonePhoto } from "@/components/member/DuotonePhoto";
import { RegisterForm } from "@/components/member/RegisterForm";
import { priceLabel, typeLabel } from "@/components/member/EventCard";
import { formatEventDate } from "@/lib/format";
import { photoForEvent } from "@/lib/photos";
import type { EventRow, MyRegistration, SlotRow } from "@/lib/queries/events";

export function EventDetail({
  event,
  slots,
  registration,
  registeredCount,
  mode,
}: {
  event: EventRow;
  slots: SlotRow[];
  registration: MyRegistration | null;
  registeredCount: number;
  mode: "member" | "guest";
}) {
  return (
    <div className="flex flex-col gap-5">
      <section className="-mx-4 -mt-4">
        <DuotonePhoto src={photoForEvent(event.type, event.cover_url)} className="h-[260px]" priority>
          <div className="flex flex-col gap-2 p-4">
            <span className={`eyebrow ${event.type === "parox" ? "text-prime" : "text-paper/80"}`}>
              {typeLabel(event.type)} · {formatEventDate(event.event_date)}
            </span>
            <h1 className="text-[40px] leading-[0.9]">{event.name}</h1>
            {event.partner_line ? <p className="text-sm text-paper/85">{event.partner_line}</p> : null}
          </div>
        </DuotonePhoto>
      </section>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Entry</dt>
          <dd>{priceLabel(event)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Venue</dt>
          <dd className="text-right">
            {event.venue_map_url ? (
              <a href={event.venue_map_url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                {event.venue_name}
              </a>
            ) : (
              event.venue_name
            )}
            {event.venue_address && event.venue_address !== "TBC" ? (
              <span className="block text-xs text-muted">{event.venue_address}</span>
            ) : null}
          </dd>
        </div>
        {registeredCount > 0 ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Going</dt>
            <dd>{registeredCount} registered</dd>
          </div>
        ) : null}
      </dl>

      {event.description ? <p className="text-sm leading-relaxed text-muted">{event.description}</p> : null}

      <RegisterForm
        eventId={event.id}
        slug={event.slug}
        slots={slots}
        mode={mode}
        registration={registration}
        registrationOpen={event.registration_open}
        requiresAccount={event.requires_account}
        priceLabel={priceLabel(event)}
      />
    </div>
  );
}
