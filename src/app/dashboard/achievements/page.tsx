import { getUserAndProfile, getAchievements } from "@/lib/dashboard-data";
import { FridayLogForm } from "@/components/dashboard/friday-log-form";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

export default async function AchievementsPage() {
  const { supabase, user } = await getUserAndProfile();
  if (!user) return null;

  const achievements = await getAchievements(supabase, user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Achievements</h1>
        <p className="mt-1 text-muted-foreground">
          Everything the agent knows you&apos;ve shipped — from your resume
          and your Friday logs.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-medium">Friday Log</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Two minutes, every Friday. The agent parses it into structured
          achievements automatically.
        </p>
        <div className="mt-3">
          <FridayLogForm />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium">
          Log {achievements.length ? `(${achievements.length})` : ""}
        </h2>
        {achievements.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <Trophy className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              None yet. Upload a resume during onboarding or fill a Friday
              log above.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {achievements.map((a) => (
              <li key={a.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{a.title}</span>
                  <div className="flex shrink-0 gap-1">
                    <Badge variant="secondary">{a.category}</Badge>
                    <Badge variant="outline">{a.source}</Badge>
                  </div>
                </div>
                <p className="mt-1 text-muted-foreground">{a.description}</p>
                {a.impact_metric && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Impact: {a.impact_metric}
                    {a.impact_number !== null ? ` (${a.impact_number})` : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
