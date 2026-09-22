"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchJobs } from "@/lib/adzuna";
import { scoreJobMatch } from "@/lib/job-matching";
import { revalidatePath } from "next/cache";

export async function findJobMatches() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select(
      "target_role, current_job_title, years_experience, skills_list, target_companies, city"
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.target_role) {
    throw new Error("Set a target role in onboarding before scanning for jobs");
  }

  const jobs = await searchJobs({
    what: profile.target_role,
    where: profile.city ?? "bangalore",
    resultsPerPage: 10,
  });

  const admin = createAdminClient();

  for (const job of jobs) {
    const { data: jobRow, error: jobError } = await admin
      .from("jobs")
      .upsert(
        {
          external_id: job.external_id,
          title: job.title,
          company: job.company,
          location: job.location,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          description: job.description,
          url: job.url,
          posted_date: job.posted_date,
        },
        { onConflict: "external_id" }
      )
      .select("id")
      .single();

    if (jobError || !jobRow) {
      console.error("Failed to upsert job", jobError);
      continue;
    }

    try {
      const score = await scoreJobMatch(profile, job);
      await supabase.from("job_matches").upsert(
        {
          user_id: user.id,
          job_id: jobRow.id,
          match_percent: score.match_percent,
          reasoning: score.reasoning,
          computed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,job_id" }
      );
    } catch (error) {
      console.error("Failed to score job match", error);
    }
  }

  revalidatePath("/dashboard");
}
