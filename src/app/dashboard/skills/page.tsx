import {
  getUserAndProfile,
  getSkillGaps,
  getJobMatches,
} from "@/lib/dashboard-data";
import { detectSkillGaps } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export default async function SkillsPage() {
  const { supabase, user } = await getUserAndProfile();
  if (!user) return null;

  const [skillGaps, jobMatches] = await Promise.all([
    getSkillGaps(supabase, user.id),
    getJobMatches(supabase, user.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Skill Gaps</h1>
          <p className="mt-1 text-muted-foreground">
            What your target role actually asks for, compared to what you
            list today.
          </p>
        </div>
        <form action={detectSkillGaps}>
          <Button type="submit">Detect skill gaps</Button>
        </form>
      </div>

      {skillGaps.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
          <p className="max-w-md text-muted-foreground">
            {jobMatches.length
              ? "No gaps detected — your listed skills already cover what these postings mention, or the postings didn't have enough detail to tell."
              : "Scan for jobs first, then click “Detect skill gaps” to compare your skills against what those postings ask for."}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {skillGaps.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between rounded-md border p-3 text-sm"
            >
              <div>
                <span className="font-medium">{g.skill_name}</span>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  You: {g.user_level} · Required: {g.required_level}
                </p>
              </div>
              <Badge variant="secondary">{g.prevalence}% of postings</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
