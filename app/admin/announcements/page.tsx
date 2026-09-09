import { Placeholder } from "@/components/ui/Placeholder";

export const metadata = { title: "Announcements" };

export default function AdminAnnouncementsPage() {
  return <Placeholder title="Announcements" session={5} items={["List", "New: title, body, audience", "Publish toggle"]} />;
}
