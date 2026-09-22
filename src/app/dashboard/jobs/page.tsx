import {
  getUserAndProfile,
  getJobMatches,
  getJobInteractions,
  getResumeBulletsByJob,
  getInterviewPrepByJob,
  getOutreachSuggestionsByJob,
  getLatestActionByJob,
  computeBlockers,
} from "@/lib/dashboard-data";
import { findJobMatches } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { JobMatchRow } from "@/components/dashboard/job-match-row";
import { Briefcase } from "lucide-react";

export default async function JobsPage() {
  const { supabase, user } = await getUserAndProfile();
  if (!user) return null;

  const [
    jobMatches,
    jobInteractions,
    bulletsByJob,
    questionsByJob,
    outreachByJob,
  ] = await Promise.all([
    getJobMatches(supabase, user.id),
    getJobInteractions(supabase, user.id),
    getResumeBulletsByJob(supabase, user.id),
    getInterviewPrepByJob(supabase, user.id),
    getOutreachSuggestionsByJob(supabase, user.id),
  ]);

  const latestActionByJob = getLatestActionByJob(jobInteractions);
  const blockerPatterns = computeBlockers(jobInteractions);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Job Matches</h1>
          <p className="mt-1 text-muted-foreground">
            {jobMatches.length} scanned, sorted by fit.
          </p>
        </div>
        <form action={findJobMatches}>
          <Button type="submit">Scan for jobs</Button>
        </form>
      </div>

      {blockerPatterns.length > 0 && (
        <ul className="mt-4 space-y-2">
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
      )}

      {jobMatches.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <Briefcase className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            No job matches yet. Click &quot;Scan for jobs&quot; to search for
            roles matching your target role and city.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
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
              initialBullets={bulletsByJob.get(m.job_id) ?? []}
              initialQuestions={questionsByJob.get(m.job_id) ?? []}
              initialOutreachTargets={outreachByJob.get(m.job_id)?.targets}
              initialOutreachMessages={outreachByJob.get(m.job_id)?.messages}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
