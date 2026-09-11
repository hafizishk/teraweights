import { Scoreboard, type ScoreboardItem } from "@/components/ui/Scoreboard";

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
  const third: ScoreboardItem =
    daysToEvent !== null && eventShortName
      ? {
          value: daysToEvent === 0 ? "Today" : daysToEvent,
          label: daysToEvent === 0 ? eventShortName : `days to ${eventShortName}`,
          accent: true,
        }
      : { value: "—", label: "no event scheduled" };

  return (
    <Scoreboard
      items={[
        { value: trainedThisWeek, label: "Energisers trained this week" },
        { value: sessionsLeftThisWeek, label: "sessions left this week" },
        third,
      ]}
    />
  );
}
