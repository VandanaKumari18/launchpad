import { getUserAndProfile, getBriefs } from "@/lib/dashboard-data";
import { sendWeeklyBrief } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default async function BriefsPage() {
  const { supabase, user } = await getUserAndProfile();
  if (!user) return null;

  const briefs = await getBriefs(supabase, user.id);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Weekly Brief</h1>
          <p className="mt-1 text-muted-foreground">
            The full career brief, emailed to you — top matches, network
            nudges, and your health breakdown, in one place.
          </p>
        </div>
        <form action={sendWeeklyBrief}>
          <Button type="submit">Send weekly brief now</Button>
        </form>
      </div>

      {briefs.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <Mail className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            None sent yet. Click &quot;Send weekly brief now&quot; to email
            yourself the full career brief.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {briefs.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between rounded-md border p-3 text-sm"
            >
              <span>Week of {b.week_of}</span>
              <span className="text-muted-foreground">
                Score: {b.score}/100
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
