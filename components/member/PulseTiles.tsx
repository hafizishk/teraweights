import { Card } from "@/components/ui/Card";

function Tile({ value, label, accent = false }: { value: number | string; label: string; accent?: boolean }) {
  return (
    <Card className={`flex flex-col gap-0.5 px-3.5 py-3 ${accent ? "border-prime/40" : ""}`}>
      <span className={`display text-[28px] leading-none ${accent ? "text-prime" : ""}`}>{value}</span>
      <span className="text-xs leading-snug text-muted">{label}</span>
    </Card>
  );
}

export function PulseTiles({
  trainedThisWeek,
  sessionsLeftThisWeek,
  daysToEvent,
  eventShortName,
}: {
  trainedThisWeek: number;
  sessionsLeftThisWeek: number;
  daysToEvent: number | null;
  eventShortName: string | null;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Tile value={trainedThisWeek} label="Energisers trained this week" />
      <Tile value={sessionsLeftThisWeek} label="sessions left this week" />
      {daysToEvent !== null && eventShortName ? (
        <Tile
          value={daysToEvent === 0 ? "Today" : daysToEvent}
          label={daysToEvent === 0 ? eventShortName : `days to ${eventShortName}`}
          accent
        />
      ) : (
        <Tile value="—" label="no event scheduled" />
      )}
    </div>
  );
}
