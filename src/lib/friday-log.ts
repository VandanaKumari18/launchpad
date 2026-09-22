import { createGroqClient, GROQ_MODEL } from "@/lib/groq";
import type { ParsedAchievement } from "@/lib/resume-parser";

const SYSTEM_PROMPT = `You extract structured achievements from a user's weekly self-report.

Return ONLY JSON: {"achievements": [...]}. Each item:
- title: short achievement headline (max 12 words)
- description: 1-2 sentence description
- category: one of "project", "leadership", "mentorship", "impact", "technical"
- impact_metric: short label for a measurable outcome mentioned, or null
- impact_number: the numeric value of that metric, or null
- team_size: number of people led/mentioned, or null
- confidence: 0-100, your confidence this is a real, specific achievement (not vague filler)

Extract 1-4 achievements. If the input is empty or too vague to extract anything concrete,
return {"achievements": []}. Do not invent facts not in the text.`;

export async function parseFridayLogAchievements(params: {
  achievement: string;
  leadership: string;
  impact: string;
}): Promise<ParsedAchievement[]> {
  const groq = createGroqClient();

  const text = [
    params.achievement && `What shipped: ${params.achievement}`,
    params.leadership && `Leadership/mentoring: ${params.leadership}`,
    params.impact && `Impact metrics: ${params.impact}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!text.trim()) return [];

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { achievements?: ParsedAchievement[] };
  return parsed.achievements ?? [];
}
