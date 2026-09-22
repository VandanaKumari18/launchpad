import { createGroqClient, GROQ_MODEL } from "@/lib/groq";

export type GeneratedBullet = {
  bullet_text: string;
  category: "leadership" | "technical" | "impact";
};

const SYSTEM_PROMPT = `You write tailored resume bullets for a candidate applying to a specific job.

Return ONLY JSON: {"bullets": [...]}. Each item:
- bullet_text: one resume bullet (max 30 words), written in past tense, action-verb-first,
  quantified where the source achievements support it. Do not invent numbers not present
  in the achievements.
- category: one of "leadership", "technical", "impact"

Generate 3-5 bullets, drawing only from the candidate's real achievements below, rewritten
to emphasize what this specific job asks for.`;

export async function generateResumeBullets(
  achievements: { title: string; description: string }[],
  jobTitle: string,
  jobDescription: string
): Promise<GeneratedBullet[]> {
  const groq = createGroqClient();

  const achievementsText = achievements
    .map((a) => `- ${a.title}: ${a.description}`)
    .join("\n");

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Candidate's achievements:\n${achievementsText || "none logged"}\n\nTarget job: ${jobTitle}\n${jobDescription.slice(0, 2000)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { bullets?: GeneratedBullet[] };
  return parsed.bullets ?? [];
}
