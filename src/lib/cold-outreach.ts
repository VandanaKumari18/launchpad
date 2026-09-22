import { createGroqClient, GROQ_MODEL } from "@/lib/groq";

export type OutreachAudience = "peer" | "hiring_manager" | "recruiter";

export type OutreachTarget = {
  roleLabel: string;
  audience: OutreachAudience;
  searchUrl: string;
};

export type ColdOutreachMessages = {
  peer: string;
  hiring_manager: string;
  recruiter: string;
};

function linkedInSearchUrl(keywords: string): string {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}

/**
 * We can't fabricate real people or pull their names from anywhere without a
 * paid people-search API, so instead we give 5 concrete LinkedIn search
 * entry points at the target company — each one surfaces real people the
 * user can pick from — grouped into the 3 audiences a job seeker actually
 * needs to reach.
 */
export function buildOutreachTargets(
  jobTitle: string,
  company: string
): OutreachTarget[] {
  const search = (roleLabel: string) => linkedInSearchUrl(`${roleLabel} ${company}`);
  return [
    { roleLabel: jobTitle, audience: "peer", searchUrl: search(jobTitle) },
    { roleLabel: "Hiring Manager", audience: "hiring_manager", searchUrl: search("Hiring Manager") },
    { roleLabel: "Director", audience: "hiring_manager", searchUrl: search("Director") },
    { roleLabel: "Recruiter", audience: "recruiter", searchUrl: search("Recruiter") },
    { roleLabel: "Talent Acquisition", audience: "recruiter", searchUrl: search("Talent Acquisition") },
  ];
}

export async function draftColdOutreachMessages(params: {
  userName: string | null;
  targetRole: string | null;
  jobTitle: string;
  company: string;
  tonePreference: string | null;
}): Promise<ColdOutreachMessages> {
  const groq = createGroqClient();

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You write ready-to-send cold outreach messages for a job seeker targeting a
specific role at a specific company. Return ONLY a JSON object with exactly these three keys:
{"peer": "...", "hiring_manager": "...", "recruiter": "..."}

Each message: 3-5 sentences, starts with "Hi [Name],", ends with a clear ask, no subject line,
no signature. Leave "[Name]" as a literal placeholder — the user fills it in after picking a
real person from LinkedIn search results. Tone: ${params.tonePreference ?? "professional, warm"}.

- peer: to someone already working in this exact role at the company. Ask for an honest,
  informal take on the team/role, offer to buy them a coffee or hop on a 15-minute call.
- hiring_manager: to whoever would hire for this role. State interest briefly, give one
  concrete reason you're a strong fit, ask for a short conversation.
- recruiter: to a recruiter/talent acquisition person at the company. Ask whether the role is
  still open, mention you're applying, ask if they'd be willing to flag your application.`,
      },
      {
        role: "user",
        content: `Job title: ${params.jobTitle}
Company: ${params.company}
User's name: ${params.userName ?? "the user"}
User's target role: ${params.targetRole ?? params.jobTitle}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw) as Partial<ColdOutreachMessages>;
    return {
      peer: parsed.peer ?? "",
      hiring_manager: parsed.hiring_manager ?? "",
      recruiter: parsed.recruiter ?? "",
    };
  } catch {
    return { peer: "", hiring_manager: "", recruiter: "" };
  }
}
