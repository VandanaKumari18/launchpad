"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchJobs } from "@/lib/adzuna";
import { scoreJobMatch } from "@/lib/job-matching";
import { computeCareerScore } from "@/lib/career-score";
import { createGroqClient, GROQ_MODEL } from "@/lib/groq";
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

export async function explainCareerScore(): Promise<{
  breakdown: ReturnType<typeof computeCareerScore>;
  explanation: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("users")
    .select(
      "target_role, timeline, years_experience, skills_list, network_contacts, tone_preference"
    )
    .eq("id", user.id)
    .single();

  const { data: achievements } = await supabase
    .from("achievements")
    .select("title")
    .eq("user_id", user.id);

  const { data: jobMatches } = await supabase
    .from("job_matches")
    .select("match_percent")
    .eq("user_id", user.id);

  const avgMatch = jobMatches?.length
    ? jobMatches.reduce((sum, m) => sum + (m.match_percent ?? 0), 0) /
      jobMatches.length
    : null;

  const breakdown = computeCareerScore({
    achievementCount: achievements?.length ?? 0,
    avgJobMatchPercent: avgMatch,
    networkContactCount: Array.isArray(profile?.network_contacts)
      ? profile.network_contacts.length
      : 0,
    skillsCount: Array.isArray(profile?.skills_list)
      ? profile.skills_list.length
      : 0,
    hasTimeline: Boolean(profile?.timeline),
    hasYearsExperience: profile?.years_experience != null,
  });

  const tone = profile?.tone_preference ?? "Encouraging";
  const groq = createGroqClient();
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a career agent writing a short (2-3 sentence) explanation of a user's
career score for their dashboard. Tone: ${tone}. Be specific, reference the actual numbers
given, and name one concrete next action. Do not use markdown.`,
      },
      {
        role: "user",
        content: `Target role: ${profile?.target_role ?? "unspecified"}
Overall score: ${breakdown.overall}/100
Career velocity: ${breakdown.velocity}/100 (based on ${achievements?.length ?? 0} logged achievements)
Market fit: ${breakdown.marketFit}/100 (average match % across ${jobMatches?.length ?? 0} scanned jobs)
Network strength: ${breakdown.network}/100 (${Array.isArray(profile?.network_contacts) ? profile.network_contacts.length : 0}/5 contacts added)
Skill readiness: ${breakdown.skillReadiness}/100
Timeline status: ${breakdown.timelineStatus}/100`,
      },
    ],
  });

  const explanation =
    completion.choices[0]?.message?.content ??
    "No explanation available right now.";

  return { breakdown, explanation };
}
