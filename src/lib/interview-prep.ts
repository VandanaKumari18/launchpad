import { createGroqClient, GROQ_MODEL } from "@/lib/groq";

export type InterviewQuestion = {
  question: string;
  sample_answer: string;
};

const SYSTEM_PROMPT = `You prepare a candidate for an interview for a specific job.

Return ONLY JSON: {"questions": [...]}. Each item:
- question: a realistic interview question for this role (behavioral, technical, or
  situational — mix them)
- sample_answer: a draft answer using the candidate's real achievements where one fits
  (STAR-style: situation, action, result). If no achievement fits a question, write
  sample_answer as an empty string and the candidate can prepare a hypothetical themselves.

Generate exactly 4 questions: at least one behavioral, one technical/role-specific, and
one about handling a difficult situation. Do not invent achievements not given.`;

export async function generateInterviewQuestions(
  achievements: { title: string; description: string }[],
  jobTitle: string,
  jobDescription: string
): Promise<InterviewQuestion[]> {
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
        content: `Candidate's achievements:\n${achievementsText || "none logged"}\n\nJob: ${jobTitle}\n${jobDescription.slice(0, 2000)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { questions?: InterviewQuestion[] };
  return parsed.questions ?? [];
}
