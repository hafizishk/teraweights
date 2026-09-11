import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/onboarding";
import { getCoaches } from "@/lib/queries/coaches";
import { CoachCard } from "@/components/member/CoachCard";

export const metadata = { title: "Coaches" };

/** Who runs the sessions (scope change), with a tap through to their diary. */
export default async function CoachesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await requireOnboarded(supabase, user!.id);

  const coaches = await getCoaches(supabase);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl">Coaches</h1>
        <p className="text-sm text-muted">The people on the whistle.</p>
      </div>

      {coaches.length === 0 ? (
        <p className="rule py-8 text-center text-sm text-muted">No coaches listed yet.</p>
      ) : (
        <div className="flex flex-col">
          {coaches.map((c) => (
            <CoachCard key={c.id} coach={c} />
          ))}
        </div>
      )}
    </div>
  );
}
