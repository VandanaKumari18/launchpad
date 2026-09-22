import { createGroqClient, GROQ_MODEL } from "@/lib/groq";

export async function draftOutreachMessage(params: {
  contactName: string;
  userName: string | null;
  targetRole: string | null;
  timeline: string | null;
  tonePreference: string | null;
}): Promise<string> {
  const groq = createGroqClient();

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: "system",
        content: `You draft a short, casual outreach message (2-3 sentences) for the user to
send a professional contact they haven't spoken to in a while. Tone: ${
          params.tonePreference ?? "Encouraging"
        }. It should reconnect naturally, briefly mention the user's career goal, and end with a
soft ask (coffee, call, or advice). No markdown, no subject line, no signature.`,
      },
      {
        role: "user",
        content: `Contact's first name: ${params.contactName}
User's name: ${params.userName ?? "the user"}
User's target role: ${params.targetRole ?? "a new role"}
Timeline: ${params.timeline ?? "unspecified"}`,
      },
    ],
  });

  return (
    completion.choices[0]?.message?.content ??
    `Hey ${params.contactName}! It's been a while — would love to catch up sometime.`
  );
}
