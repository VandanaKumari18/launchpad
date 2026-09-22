import { createGroqClient, GROQ_MODEL } from "@/lib/groq";

export async function extractResumeText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }

  return buffer.toString("utf-8");
}

export type ParsedAchievement = {
  title: string;
  description: string;
  category: "project" | "leadership" | "mentorship" | "impact" | "technical";
  impact_metric: string | null;
  impact_number: number | null;
  team_size: number | null;
  confidence: number;
};

const SYSTEM_PROMPT = `You extract career achievements from a resume's raw text.

Return ONLY a JSON object of the form {"achievements": [...]}. Each item must have:
- title: short achievement headline (max 12 words)
- description: 1-2 sentence description of what was done
- category: one of "project", "leadership", "mentorship", "impact", "technical"
- impact_metric: short label for a measurable outcome mentioned (e.g. "latency reduction"), or null if none
- impact_number: the numeric value of that metric (e.g. 40 for "40%"), or null if none
- team_size: number of people led/mentioned, or null if not stated
- confidence: your confidence 0-100 that this is a real, verifiable achievement from the text

Extract 3-10 achievements. Do not invent facts not supported by the text.`;

export async function parseAchievementsFromText(
  resumeText: string
): Promise<ParsedAchievement[]> {
  const groq = createGroqClient();

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: resumeText.slice(0, 12000) },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { achievements?: ParsedAchievement[] };
  return parsed.achievements ?? [];
}
