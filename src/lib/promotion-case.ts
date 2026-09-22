import { createGroqClient, GROQ_MODEL } from "@/lib/groq";

export type KeyAchievement = {
  title: string;
  description: string;
};

export type PromotionCaseDocument = {
  executive_summary: string;
  role_and_scope: string;
  key_achievements: KeyAchievement[];
  leadership_and_mentorship: string;
  technical_depth: string;
};

export type PromotionCase = {
  readiness_score: number;
  strengths: string[];
  gaps: string[];
  timeline_recommendation: string;
  email_template: string;
  document: PromotionCaseDocument;
};

const SYSTEM_PROMPT = `You write a comprehensive, evidence-based internal promotion case for a candidate,
using their full history of logged achievements and weekly self-reports (Friday logs) up to their
evaluation period end date. This is the actual document they will bring into a promotion or
performance review conversation — treat it like a real self-review packet, not a summary.

Use EVERY piece of evidence given that is relevant. Do not pad with generic statements not backed
by the achievements/logs. Do not invent facts, metrics, or events not present in the source data.
If the evidence is thin for a section, say so honestly rather than filling with filler.

Return ONLY a JSON object of this exact shape:
{
  "readiness_score": <0-100 integer, honest - most candidates are not 90+>,
  "document": {
    "executive_summary": "<2-3 sentence framing of the case: who they are, what they've done, why now>",
    "role_and_scope": "<1-2 paragraphs describing the scope of what they actually owned and how it grew over the period - team size, systems owned, decisions they drove>",
    "key_achievements": [
      {"title": "<short title>", "description": "<2-4 sentences: situation, action, measurable result, and why it matters for this specific target role, with real numbers from the evidence>"}
      ... one object per achievement worth including, 6-10 of them if the evidence supports it
    ],
    "leadership_and_mentorship": "<1-2 paragraphs synthesizing all leadership/mentorship evidence across the logs - specific people, specific outcomes>",
    "technical_depth": "<1-2 paragraphs synthesizing technical evidence - architecture decisions, systems designed, complexity handled>"
  },
  "strengths": [<3-6 short strings, each one a specific strength tied to evidence>],
  "gaps": [<1-4 short strings naming what's genuinely missing for THIS specific target role, based on comparing the evidence against the internal job description>],
  "timeline_recommendation": "<1-2 sentences: a realistic timeframe and the reasoning>",
  "email_template": "<a full, detailed email to the candidate's manager requesting to discuss the promotion. Multiple paragraphs: opening ask, a summary of scope/impact, 2-3 specific achievements with numbers, and a closing ask for a meeting. Professional but warm tone. No subject line.>"
}`;

export async function generatePromotionCase(params: {
  achievements: { title: string; description: string; impact_metric: string | null; impact_number: number | null; category: string; created_at: string }[];
  fridayLogs: { week_of: string; achievement: string | null; leadership: string | null; impact: string | null }[];
  currentRole: string | null;
  company: string;
  targetRole: string;
  timeline: string;
  evaluationPeriodEnd: string | null;
  internalJobDescription: string;
}): Promise<PromotionCase> {
  const groq = createGroqClient();

  const achievementsText = params.achievements
    .map((a) => {
      const impact = a.impact_metric
        ? ` [Impact: ${a.impact_metric}${a.impact_number !== null ? ` = ${a.impact_number}` : ""}]`
        : "";
      return `- (${a.category}, logged ${a.created_at.slice(0, 10)}) ${a.title}: ${a.description}${impact}`;
    })
    .join("\n");

  const fridayLogsText = params.fridayLogs
    .map((f) => {
      const parts = [
        f.achievement && `Shipped: ${f.achievement}`,
        f.leadership && `Led/mentored: ${f.leadership}`,
        f.impact && `Impact: ${f.impact}`,
      ].filter(Boolean);
      return parts.length ? `- Week of ${f.week_of}: ${parts.join(" | ")}` : null;
    })
    .filter(Boolean)
    .join("\n");

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: `Current role: ${params.currentRole ?? "unspecified"}
Target: ${params.targetRole} at ${params.company}
Desired timeline: ${params.timeline}
Evaluation period end: ${params.evaluationPeriodEnd ?? "not specified — use all evidence given"}

=== LOGGED ACHIEVEMENTS (structured, extracted from resume + weekly logs) ===
${achievementsText || "none logged"}

=== RAW WEEKLY FRIDAY LOGS (self-reported, in the candidate's own words) ===
${fridayLogsText || "none logged"}

=== INTERNAL ROLE DESCRIPTION ===
${params.internalJobDescription.slice(0, 3000)}`,
    },
  ];

  // gpt-oss models spend part of the token budget on hidden reasoning before
  // writing the JSON answer. With a large schema like this, a request can
  // occasionally come back with a syntactically valid but empty document if
  // that reasoning eats the budget. Retry once before giving up.
  let parsed: Partial<PromotionCase> = {};
  for (let attempt = 0; attempt < 2; attempt++) {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      response_format: { type: "json_object" },
      max_tokens: 8000,
      messages,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    try {
      parsed = JSON.parse(raw) as Partial<PromotionCase>;
    } catch {
      parsed = {};
    }

    const hasContent =
      (parsed.document?.key_achievements?.length ?? 0) > 0 &&
      Boolean(parsed.document?.executive_summary);
    if (hasContent) break;
  }

  const rawAchievements = parsed.document?.key_achievements ?? [];
  const key_achievements: KeyAchievement[] = rawAchievements.map((a) =>
    typeof a === "string" ? { title: "", description: a } : a
  );

  return {
    readiness_score: Math.max(
      0,
      Math.min(100, Math.round(parsed.readiness_score ?? 0))
    ),
    strengths: parsed.strengths ?? [],
    gaps: parsed.gaps ?? [],
    timeline_recommendation: parsed.timeline_recommendation ?? "",
    email_template: parsed.email_template ?? "",
    document: {
      executive_summary: parsed.document?.executive_summary ?? "",
      role_and_scope: parsed.document?.role_and_scope ?? "",
      key_achievements,
      leadership_and_mentorship: parsed.document?.leadership_and_mentorship ?? "",
      technical_depth: parsed.document?.technical_depth ?? "",
    },
  };
}
