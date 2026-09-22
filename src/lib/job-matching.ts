import { createGroqClient, GROQ_MODEL } from "@/lib/groq";
import type { AdzunaJob } from "@/lib/adzuna";

export type UserProfileForMatching = {
  target_role: string | null;
  current_job_title: string | null;
  years_experience: number | null;
  skills_list: string[] | null;
  target_companies: string[] | null;
};

export type JobMatchScore = {
  match_percent: number;
  reasoning: string;
};

const SYSTEM_PROMPT = `You score how well a job posting fits a candidate's profile.

Return ONLY a JSON object: {"match_percent": <0-100 integer>, "reasoning": "<1-2 sentence explanation>"}.

Base the score on: role/title alignment, seniority fit given years of experience,
skills overlap, and whether the company is one of the candidate's target companies.
Be honest — most postings should NOT score above 90 unless the fit is excellent.`;

export async function scoreJobMatch(
  profile: UserProfileForMatching,
  job: AdzunaJob
): Promise<JobMatchScore> {
  const groq = createGroqClient();

  const profileSummary = [
    `Target role: ${profile.target_role ?? "unspecified"}`,
    `Current role: ${profile.current_job_title ?? "unspecified"}`,
    `Years of experience: ${profile.years_experience ?? "unspecified"}`,
    `Skills: ${(profile.skills_list ?? []).join(", ") || "none listed"}`,
    `Target companies: ${(profile.target_companies ?? []).join(", ") || "none listed"}`,
  ].join("\n");

  const jobSummary = [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location}`,
    `Description: ${job.description.slice(0, 2000)}`,
  ].join("\n");

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `CANDIDATE PROFILE:\n${profileSummary}\n\nJOB POSTING:\n${jobSummary}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<JobMatchScore>;

  return {
    match_percent: Math.max(0, Math.min(100, Math.round(parsed.match_percent ?? 0))),
    reasoning: parsed.reasoning ?? "",
  };
}
