import { Placeholder } from "@/components/ui/Placeholder";

export const metadata = { title: "Events" };

export default function EventsPage() {
  return (
    <Placeholder
      title="Events"
      session={3}
      items={["Upcoming events", "Event detail with slot picker", "Guest registration", "Past events: view results"]}
    />
  );
}
