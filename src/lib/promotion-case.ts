import { createGroqClient, GROQ_MODEL } from "@/lib/groq";

export type PromotionCase = {
  readiness_score: number;
  strengths: string[];
  gaps: string[];
  timeline_recommendation: string;
  email_template: string;
};

const SYSTEM_PROMPT = `You build an internal promotion case for a candidate targeting a specific
internal role. Return ONLY JSON:
{
  "readiness_score": <0-100 integer>,
  "strengths": [<3-5 short strings, each grounded in a real achievement>],
  "gaps": [<1-3 short strings naming what's missing for this specific role>],
  "timeline_recommendation": "<1 sentence: how many weeks/months, and why>",
  "email_template": "<a short email to the candidate's manager requesting to discuss the promotion, referencing 2-3 real achievements, professional but warm tone, no subject line>"
}

Base everything on the achievements and internal role description given. Do not invent
achievements. Be honest in the readiness score — most candidates are not at 90+.`;

export async function generatePromotionCase(params: {
  achievements: { title: string; description: string }[];
  currentRole: string | null;
  company: string;
  targetRole: string;
  timeline: string;
  internalJobDescription: string;
}): Promise<PromotionCase> {
  const groq = createGroqClient();

  const achievementsText = params.achievements
    .map((a) => `- ${a.title}: ${a.description}`)
    .join("\n");

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Current role: ${params.currentRole ?? "unspecified"}
Target: ${params.targetRole} at ${params.company}
Desired timeline: ${params.timeline}

Candidate's achievements:
${achievementsText || "none logged"}

Internal role description:
${params.internalJobDescription.slice(0, 3000)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<PromotionCase>;

  return {
    readiness_score: Math.max(
      0,
      Math.min(100, Math.round(parsed.readiness_score ?? 0))
    ),
    strengths: parsed.strengths ?? [],
    gaps: parsed.gaps ?? [],
    timeline_recommendation: parsed.timeline_recommendation ?? "",
    email_template: parsed.email_template ?? "",
  };
}
