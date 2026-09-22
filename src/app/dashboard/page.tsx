import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  findJobMatches,
  detectSkillGaps,
  generateNetworkNudges,
  sendWeeklyBrief,
} from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { computeCareerScore } from "@/lib/career-score";
import { CareerScoreCard } from "@/components/dashboard/career-score-card";
import { JobMatchRow } from "@/components/dashboard/job-match-row";
import { NetworkNudgeRow } from "@/components/dashboard/network-nudge-row";
import { detectBlockerPatterns } from "@/lib/blocker-patterns";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarded) {
    redirect("/onboarding");
  }

  const { data: achievements } = await supabase
    .from("achievements")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: jobMatches } = await supabase
    .from("job_matches")
    .select("*, jobs(*)")
    .eq("user_id", user.id)
    .order("match_percent", { ascending: false });

  const { data: skillGaps } = await supabase
    .from("skill_gaps")
    .select("*")
    .eq("user_id", user.id)
    .order("prevalence", { ascending: false });

  const { data: jobInteractions } = await supabase
    .from("job_interactions")
    .select("action, job_id, jobs(location)")
    .eq("user_id", user.id);

  const latestActionByJob = new Map<string, string>();
  for (const i of jobInteractions ?? []) {
    latestActionByJob.set(i.job_id, i.action);
  }

  const blockerPatterns = detectBlockerPatterns(
    (jobInteractions ?? []).map((i) => ({
      action: i.action,
      location:
        (i.jobs as unknown as { location: string } | null)?.location ?? "",
    }))
  );

  const { data: networkNudges } = await supabase
    .from("network_nudges")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: briefs } = await supabase
    .from("briefs")
    .select("*")
    .eq("user_id", user.id)
    .order("sent_at", { ascending: false });

  const avgMatch = jobMatches?.length
    ? jobMatches.reduce((sum, m) => sum + (m.match_percent ?? 0), 0) /
      jobMatches.length
    : null;

  const scoreBreakdown = computeCareerScore({
    achievementCount: achievements?.length ?? 0,
    avgJobMatchPercent: avgMatch,
    networkContactCount: Array.isArray(profile.network_contacts)
      ? profile.network_contacts.length
      : 0,
    skillsCount: Array.isArray(profile.skills_list)
      ? profile.skills_list.length
      : 0,
    hasTimeline: Boolean(profile.timeline),
    hasYearsExperience: profile.years_experience != null,
  });

  return (
    <main className="mx-auto max-w-xl py-10">
      <h1 className="text-2xl font-semibold">
        Welcome, {profile.name ?? user.email}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Goal: {profile.target_role ?? "not set"} · {profile.timeline ?? "no timeline set"}
      </p>

      <div className="mt-6">
        <CareerScoreCard
          breakdown={scoreBreakdown}
          previousScore={briefs?.[0]?.score ?? null}
        />
      </div>

      <h2 className="mt-8 text-lg font-medium">
        Achievements {achievements?.length ? `(${achievements.length})` : ""}
      </h2>
      {!achievements?.length ? (
        <p className="mt-2 text-sm text-muted-foreground">
          None yet. Upload a resume during onboarding or fill a Friday log to
          start building this list.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {achievements.map((a) => (
            <li key={a.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{a.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {a.category} · {a.source}
                </span>
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

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-medium">
          Job Matches {jobMatches?.length ? `(${jobMatches.length})` : ""}
        </h2>
        <form action={findJobMatches}>
          <Button type="submit" size="sm" variant="outline">
            Scan for jobs
          </Button>
        </form>
      </div>
      {!jobMatches?.length ? (
        <p className="mt-2 text-sm text-muted-foreground">
          None yet. Click &quot;Scan for jobs&quot; to search for roles
          matching your target role and city.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {jobMatches.map((m) => (
            <JobMatchRow
              key={m.id}
              jobId={m.job_id}
              title={m.jobs?.title ?? "Untitled role"}
              company={m.jobs?.company ?? "Unknown"}
              location={m.jobs?.location ?? ""}
              url={m.jobs?.url ?? "#"}
              matchPercent={m.match_percent ?? 0}
              reasoning={m.reasoning ?? ""}
              initialAction={latestActionByJob.get(m.job_id) ?? null}
            />
          ))}
        </ul>
      )}

      {blockerPatterns.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-medium">Patterns noticed</h2>
          <ul className="mt-3 space-y-2">
            {blockerPatterns.map((p) => (
              <li
                key={p.pattern}
                className="rounded-md border border-yellow-600/30 bg-yellow-600/5 p-3 text-sm"
              >
                <span className="font-medium">{p.pattern}.</span>{" "}
                <span className="text-muted-foreground">{p.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-medium">
          Skill Gaps {skillGaps?.length ? `(${skillGaps.length})` : ""}
        </h2>
        <form action={detectSkillGaps}>
          <Button type="submit" size="sm" variant="outline">
            Detect skill gaps
          </Button>
        </form>
      </div>
      {!skillGaps?.length ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {jobMatches?.length
            ? "No gaps detected — your listed skills already cover what these postings mention, or the postings didn't have enough detail to tell."
            : "Scan for jobs first, then click “Detect skill gaps” to compare your skills against what those postings ask for."}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {skillGaps.map((g) => (
            <li key={g.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{g.skill_name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {g.prevalence}% of postings
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                You: {g.user_level} · Required: {g.required_level}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-medium">
          Your Network {networkNudges?.length ? `(${networkNudges.length})` : ""}
        </h2>
        <form action={generateNetworkNudges}>
          <Button type="submit" size="sm" variant="outline">
            Draft outreach
          </Button>
        </form>
      </div>
      {!networkNudges?.length ? (
        <p className="mt-2 text-sm text-muted-foreground">
          None yet. Add contacts during onboarding, then click &quot;Draft
          outreach&quot; to get AI-drafted reconnect messages.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {networkNudges.map((n) => (
            <NetworkNudgeRow
              key={n.id}
              nudgeId={n.id}
              contactName={n.contact_name}
              contactUrl={n.contact_url}
              suggestedMessage={n.suggested_message ?? ""}
              status={n.status}
            />
          ))}
        </ul>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-medium">
          Weekly Brief {briefs?.length ? `(${briefs.length} sent)` : ""}
        </h2>
        <form action={sendWeeklyBrief}>
          <Button type="submit" size="sm">
            Send weekly brief now
          </Button>
        </form>
      </div>
      {!briefs?.length ? (
        <p className="mt-2 text-sm text-muted-foreground">
          None sent yet. Click &quot;Send weekly brief now&quot; to email
          yourself the full career brief.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
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
    </main>
  );
}
