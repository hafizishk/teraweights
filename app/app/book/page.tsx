import { Placeholder } from "@/components/ui/Placeholder";

export const metadata = { title: "Book" };

export default function BookPage() {
  return (
    <Placeholder
      title="Book"
      session={2}
      items={["Filter: All · East · West · PRIME · Fitness Engine", "Week strip", "Session rows with spots left", "Session detail sheet"]}
    />
  );
}
