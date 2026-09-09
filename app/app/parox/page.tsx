import { Placeholder } from "@/components/ui/Placeholder";

export const metadata = { title: "My PA.ROX" };

export default function ParoxPage() {
  return (
    <Placeholder
      title="My PA.ROX"
      session={3}
      items={["Streak · sessions this month · events completed", "PB card", "History with deltas", "Station splits"]}
    />
  );
}
