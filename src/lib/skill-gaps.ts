import { createGroqClient, GROQ_MODEL } from "@/lib/groq";

export type SkillGap = {
  skill_name: string;
  user_level: string;
  required_level: string;
  prevalence: number;
};

const SYSTEM_PROMPT = `You analyze job postings to find skill gaps for a candidate.

Return ONLY JSON: {"gaps": [...]}. Each item:
- skill_name: the skill (e.g. "System Design")
- user_level: candidate's current level for this skill - "none", "beginner", "intermediate", or "advanced" - based on their listed skills
- required_level: typical level required across the postings - "beginner", "intermediate", or "advanced"
- prevalence: integer 0-100, percentage of the given postings that mention this skill

Only include skills that are a GAP: required_level is higher than user_level, or the skill
doesn't appear in the candidate's list at all but appears in multiple postings.
Return at most 5 gaps, ordered by prevalence descending.`;

export async function analyzeSkillGaps(
  userSkills: string[],
  jobDescriptions: string[]
): Promise<SkillGap[]> {
  const groq = createGroqClient();
  const postingsText = jobDescriptions
    .map((d, i) => `--- Posting ${i + 1} ---\n${d.slice(0, 1500)}`)
    .join("\n\n");

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Candidate's current skills: ${
          userSkills.join(", ") || "none listed"
        }\n\n${postingsText}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { gaps?: SkillGap[] };
  return parsed.gaps ?? [];
}
