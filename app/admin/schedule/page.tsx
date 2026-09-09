import { Placeholder } from "@/components/ui/Placeholder";

export const metadata = { title: "Schedule" };

export default function AdminSchedulePage() {
  return (
    <Placeholder
      title="Schedule"
      session={5}
      items={["Week list", "New session", "Bulk create recurring", "Session roster with check-in QR"]}
    />
  );
}
