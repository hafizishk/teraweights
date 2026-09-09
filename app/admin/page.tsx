import { Placeholder } from "@/components/ui/Placeholder";

export const metadata = { title: "Dashboard" };

export default function AdminDashboardPage() {
  return (
    <Placeholder
      title="Dashboard"
      session={5}
      items={["Today's sessions: booked / capacity, coach", "Pending payments", "Next 3 events with registration counts"]}
    />
  );
}
