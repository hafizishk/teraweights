import { Placeholder } from "@/components/ui/Placeholder";

export const metadata = { title: "Events" };

export default function AdminEventsPage() {
  return (
    <Placeholder
      title="Events"
      session={5}
      items={["Table", "Slots and capacity", "Registrations with CSV export", "Import results CSV"]}
    />
  );
}
