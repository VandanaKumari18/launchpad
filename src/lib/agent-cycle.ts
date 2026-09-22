import type { SupabaseClient } from "@supabase/supabase-js";
import { createGroqClient, GROQ_MODEL } from "@/lib/groq";
import {
  getAgentState,
  toolScanJobs,
  toolDraftNudges,
  toolAnalyzeSkillGaps,
  toolSendWeeklyBrief,
} from "@/lib/agent-tools";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "groq-sdk/resources/chat/completions";

const MAX_STEPS = 6;

const TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "scan_jobs",
      description:
        "Search the job market for the user's target role and score every posting against their profile. Call this if it's been a while since the last scan, or there's no job data on file yet. Skip it if a scan already ran recently this cycle and nothing has changed.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_network_nudges",
      description:
        "Draft AI reconnect messages for network contacts who are new or overdue (14+ days since last contact). Call this if the state summary shows overdue contacts. Skip it if there are none.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_skill_gaps",
      description:
        "Compare the user's skills against scanned job postings to find gaps. Only useful if job postings have been scanned (call scan_jobs first if none exist yet, or skip this if there's nothing to compare against).",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "send_weekly_brief",
      description:
        "Compute the current career score and email the user the full weekly brief (top job matches, pending nudges, skill gaps, activity summary). This should normally be the LAST action of the cycle, called once, after any scanning/drafting/analysis you decided to do.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

const SYSTEM_PROMPT = `You are the autonomous agent behind Launchpad, a career-progress product. You run
periodically (weekly, on a schedule) for one user at a time with no human telling you what to do.

You will be given a snapshot of this user's current state. Decide which of the available tools are
actually warranted this cycle, based on that state — you are not required to call all of them, and
you should not call one that clearly has nothing to do (e.g. skip draft_network_nudges if no contacts
are overdue). Call tools in whatever order makes sense, reading the state to inform your choices.
send_weekly_brief should normally be your last call, once, after you've done any scanning/drafting/
analysis you decided was needed. Do not call the same tool twice in one cycle. When you have nothing
more to do, stop calling tools and give a one-sentence summary of what you did and why.`;

export type AgentCycleResult = {
  userId: string;
  jobsScanned: number;
  nudgesDrafted: number;
  skillGapsFound: number;
  score: number;
  briefSent: boolean;
  toolsCalled: { name: string; result: string }[];
  agentSummary: string;
  error?: string;
};

/**
 * The agent's decision loop for one user: the LLM is given the user's current
 * state and a toolset, and DECIDES which actions are warranted this cycle and
 * in what order — this file does not hardcode "always do A then B then C".
 * Each tool call has a real side effect (writes to the DB, calls external
 * APIs, sends an email) and its result is fed back to the model before it
 * decides what to do next.
 */
export async function runAgentCycleForUser(
  admin: SupabaseClient,
  userId: string
): Promise<AgentCycleResult> {
  const { data: profile } = await admin
    .from("users")
    .select(
      "name, email, target_role, current_job_title, timeline, years_experience, skills_list, target_companies, network_contacts, tone_preference, city, onboarded"
    )
    .eq("id", userId)
    .single();

  if (!profile?.onboarded || !profile.email) {
    return {
      userId,
      jobsScanned: 0,
      nudgesDrafted: 0,
      skillGapsFound: 0,
      score: 0,
      briefSent: false,
      toolsCalled: [],
      agentSummary: "",
      error: "Profile not onboarded",
    };
  }

  const stateSummary = await getAgentState(admin, userId, profile);
  const groq = createGroqClient();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Current state for this user:\n\n${stateSummary}` },
  ];

  const totals = { jobsScanned: 0, nudgesDrafted: 0, skillGapsFound: 0 };
  const toolsCalled: { name: string; result: string }[] = [];
  let score = 0;
  let briefSent = false;
  const calledAlready = new Set<string>();

  for (let step = 0; step < MAX_STEPS; step++) {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    });

    const message = completion.choices[0]?.message;
    if (!message) break;

    messages.push({
      role: "assistant",
      content: message.content ?? "",
      tool_calls: message.tool_calls,
    });

    if (!message.tool_calls || message.tool_calls.length === 0) {
      if (message.content) {
        toolsCalled.push({ name: "(reasoning)", result: message.content });
      }
      break;
    }

    for (const call of message.tool_calls) {
      const name = call.function.name;
      let toolResultText: string;

      if (calledAlready.has(name)) {
        toolResultText = `Already called this cycle — skipping duplicate call.`;
      } else {
        calledAlready.add(name);
        try {
          switch (name) {
            case "scan_jobs": {
              const r = await toolScanJobs(admin, userId, profile);
              totals.jobsScanned = (r.data.jobsScanned as number) ?? 0;
              toolResultText = r.summary;
              break;
            }
            case "draft_network_nudges": {
              const r = await toolDraftNudges(admin, userId, profile);
              totals.nudgesDrafted = (r.data.nudgesDrafted as number) ?? 0;
              toolResultText = r.summary;
              break;
            }
            case "analyze_skill_gaps": {
              const r = await toolAnalyzeSkillGaps(admin, userId, profile);
              totals.skillGapsFound = (r.data.skillGapsFound as number) ?? 0;
              toolResultText = r.summary;
              break;
            }
            case "send_weekly_brief": {
              const r = await toolSendWeeklyBrief(admin, userId, profile, totals);
              briefSent = (r.data.briefSent as boolean) ?? false;
              score = (r.data.score as number) ?? 0;
              toolResultText = r.summary;
              break;
            }
            default:
              toolResultText = `Unknown tool: ${name}`;
          }
        } catch (error) {
          toolResultText = `Tool failed: ${
            error instanceof Error ? error.message : "unknown error"
          }`;
          console.error(`[agent-cycle] tool ${name} failed for ${userId}`, error);
        }
        toolsCalled.push({ name, result: toolResultText });
      }

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: toolResultText,
      });
    }
  }

  const agentSummary =
    [...toolsCalled].reverse().find((t) => t.name === "(reasoning)")?.result ??
    (toolsCalled.length > 0
      ? `Ran: ${toolsCalled.map((t) => t.name).join(", ")}.`
      : "Decided no action was needed this cycle.");

  return {
    userId,
    jobsScanned: totals.jobsScanned,
    nudgesDrafted: totals.nudgesDrafted,
    skillGapsFound: totals.skillGapsFound,
    score,
    briefSent,
    toolsCalled: toolsCalled.filter((t) => t.name !== "(reasoning)"),
    agentSummary,
  };
}
