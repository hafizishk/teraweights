import { Placeholder } from "@/components/ui/Placeholder";

export const metadata = { title: "Members" };

export default function AdminMembersPage() {
  return (
    <Placeholder
      title="Members"
      session={5}
      items={["Table with search", "Assign package · record payment", "Adjust credits", "Assign coach · change role"]}
    />
  );
}
