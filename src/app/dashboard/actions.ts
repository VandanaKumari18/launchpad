"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchJobs } from "@/lib/adzuna";
import { scoreJobMatch } from "@/lib/job-matching";
import { computeCareerScore } from "@/lib/career-score";
import { createGroqClient, GROQ_MODEL } from "@/lib/groq";
import { analyzeSkillGaps } from "@/lib/skill-gaps";
import { draftOutreachMessage } from "@/lib/network-nudges";
import { detectBlockerPatterns } from "@/lib/blocker-patterns";
import { createResendClient, BRIEF_FROM_ADDRESS } from "@/lib/resend";
import {
  buildWeeklyBriefHtml,
  weeklyBriefSubject,
} from "@/lib/weekly-brief";
import { generateResumeBullets } from "@/lib/resume-bullets";
import { generatePromotionCase } from "@/lib/promotion-case";
import { generateInterviewQuestions } from "@/lib/interview-prep";
import { parseFridayLogAchievements } from "@/lib/friday-log";
import { runAgentCycleForUser, type AgentCycleResult } from "@/lib/agent-cycle";
import {
  buildOutreachTargets,
  draftColdOutreachMessages,
} from "@/lib/cold-outreach";
import { revalidatePath } from "next/cache";

export async function findJobMatches() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select(
      "target_role, current_job_title, years_experience, skills_list, target_companies, city"
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.target_role) {
    throw new Error("Set a target role in onboarding before scanning for jobs");
  }

  const jobs = await searchJobs({
    what: profile.target_role,
    where: profile.city ?? "bangalore",
    resultsPerPage: 10,
  });

  const admin = createAdminClient();

  for (const job of jobs) {
    const { data: jobRow, error: jobError } = await admin
      .from("jobs")
      .upsert(
        {
          external_id: job.external_id,
          title: job.title,
          company: job.company,
          location: job.location,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          description: job.description,
          url: job.url,
          posted_date: job.posted_date,
        },
        { onConflict: "external_id" }
      )
      .select("id")
      .single();

    if (jobError || !jobRow) {
      console.error("Failed to upsert job", jobError);
      continue;
    }

    try {
      const score = await scoreJobMatch(profile, job);
      await supabase.from("job_matches").upsert(
        {
          user_id: user.id,
          job_id: jobRow.id,
          match_percent: score.match_percent,
          reasoning: score.reasoning,
          computed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,job_id" }
      );
    } catch (error) {
      console.error("Failed to score job match", error);
    }
  }

  revalidatePath("/dashboard");
}

export async function explainCareerScore(): Promise<{
  breakdown: ReturnType<typeof computeCareerScore>;
  explanation: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("users")
    .select(
      "target_role, timeline, years_experience, skills_list, network_contacts, tone_preference"
    )
    .eq("id", user.id)
    .single();

  const { data: achievements } = await supabase
    .from("achievements")
    .select("title")
    .eq("user_id", user.id);

  const { data: jobMatches } = await supabase
    .from("job_matches")
    .select("match_percent")
    .eq("user_id", user.id);

  const avgMatch = jobMatches?.length
    ? jobMatches.reduce((sum, m) => sum + (m.match_percent ?? 0), 0) /
      jobMatches.length
    : null;

  const breakdown = computeCareerScore({
    achievementCount: achievements?.length ?? 0,
    avgJobMatchPercent: avgMatch,
    networkContactCount: Array.isArray(profile?.network_contacts)
      ? profile.network_contacts.length
      : 0,
    skillsCount: Array.isArray(profile?.skills_list)
      ? profile.skills_list.length
      : 0,
    hasTimeline: Boolean(profile?.timeline),
    hasYearsExperience: profile?.years_experience != null,
  });

  const tone = profile?.tone_preference ?? "Encouraging";
  const groq = createGroqClient();
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a career agent writing a short (2-3 sentence) explanation of a user's
career score for their dashboard. Tone: ${tone}. Be specific, reference the actual numbers
given, and name one concrete next action. Do not use markdown.`,
      },
      {
        role: "user",
        content: `Target role: ${profile?.target_role ?? "unspecified"}
Overall score: ${breakdown.overall}/100
Career velocity: ${breakdown.velocity}/100 (based on ${achievements?.length ?? 0} logged achievements)
Market fit: ${breakdown.marketFit}/100 (average match % across ${jobMatches?.length ?? 0} scanned jobs)
Network strength: ${breakdown.network}/100 (${Array.isArray(profile?.network_contacts) ? profile.network_contacts.length : 0}/5 contacts added)
Skill readiness: ${breakdown.skillReadiness}/100
Timeline status: ${breakdown.timelineStatus}/100`,
      },
    ],
  });

  const explanation =
    completion.choices[0]?.message?.content ??
    "No explanation available right now.";

  return { breakdown, explanation };
}

export async function recordJobInteraction(
  jobId: string,
  action: "save" | "dismiss" | "apply"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("job_interactions").insert({
    user_id: user.id,
    job_id: jobId,
    action,
  });

  if (error) throw new Error(`Failed to record interaction: ${error.message}`);

  revalidatePath("/dashboard");
}

export async function detectSkillGaps() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("users")
    .select("skills_list")
    .eq("id", user.id)
    .single();

  const { data: jobMatches } = await supabase
    .from("job_matches")
    .select("jobs(description)")
    .eq("user_id", user.id);

  const descriptions = (jobMatches ?? [])
    .map(
      (m) => (m.jobs as unknown as { description: string } | null)?.description
    )
    .filter((d): d is string => Boolean(d));

  if (descriptions.length === 0) {
    throw new Error("Scan for jobs first so there's data to analyze");
  }

  const gaps = await analyzeSkillGaps(
    Array.isArray(profile?.skills_list) ? profile.skills_list : [],
    descriptions
  );

  await supabase.from("skill_gaps").delete().eq("user_id", user.id);

  if (gaps.length > 0) {
    await supabase.from("skill_gaps").insert(
      gaps.map((g) => ({
        user_id: user.id,
        skill_name: g.skill_name,
        user_level: g.user_level,
        required_level: g.required_level,
        prevalence: g.prevalence,
      }))
    );
  }

  revalidatePath("/dashboard");
}

type NetworkContact = { name: string; linkedin_url?: string };

export async function addNetworkContact(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = formData.get("name")?.toString().trim();
  if (!name) throw new Error("Name is required");
  const linkedinUrl = formData.get("linkedin_url")?.toString().trim();

  const { data: profile } = await supabase
    .from("users")
    .select("network_contacts")
    .eq("id", user.id)
    .single();

  const contacts: NetworkContact[] = Array.isArray(profile?.network_contacts)
    ? profile.network_contacts
    : [];

  if (contacts.some((c) => c.name === name)) {
    throw new Error(`${name} is already in your network`);
  }

  const updated: NetworkContact[] = [
    ...contacts,
    { name, linkedin_url: linkedinUrl || undefined },
  ];

  const { error } = await supabase
    .from("users")
    .update({ network_contacts: updated })
    .eq("id", user.id);
  if (error) throw new Error(`Failed to add contact: ${error.message}`);

  revalidatePath("/dashboard");
  return updated;
}

export async function removeNetworkContact(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("users")
    .select("network_contacts")
    .eq("id", user.id)
    .single();

  const contacts: NetworkContact[] = Array.isArray(profile?.network_contacts)
    ? profile.network_contacts
    : [];

  const updated = contacts.filter((c) => c.name !== name);

  const { error } = await supabase
    .from("users")
    .update({ network_contacts: updated })
    .eq("id", user.id);
  if (error) throw new Error(`Failed to remove contact: ${error.message}`);

  revalidatePath("/dashboard");
  return updated;
}

export async function generateNetworkNudges() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("users")
    .select("name, target_role, timeline, tone_preference, network_contacts")
    .eq("id", user.id)
    .single();

  const contacts: NetworkContact[] = Array.isArray(profile?.network_contacts)
    ? profile.network_contacts
    : [];

  if (contacts.length === 0) {
    throw new Error("Add network contacts in onboarding first");
  }

  const { data: existing } = await supabase
    .from("network_nudges")
    .select("contact_name")
    .eq("user_id", user.id);
  const existingNames = new Set((existing ?? []).map((n) => n.contact_name));

  const newContacts = contacts.filter(
    (c) => c.name && !existingNames.has(c.name)
  );

  for (const contact of newContacts) {
    try {
      const message = await draftOutreachMessage({
        contactName: contact.name,
        userName: profile?.name ?? null,
        targetRole: profile?.target_role ?? null,
        timeline: profile?.timeline ?? null,
        tonePreference: profile?.tone_preference ?? null,
      });

      await supabase.from("network_nudges").insert({
        user_id: user.id,
        contact_name: contact.name,
        contact_url: contact.linkedin_url ?? null,
        suggested_message: message,
        status: "pending",
      });
    } catch (error) {
      console.error("Failed to draft outreach message", error);
    }
  }

  revalidatePath("/dashboard");
}

export async function updateNudgeStatus(
  nudgeId: string,
  status: "sent" | "skipped"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const update: Record<string, unknown> = { status };
  if (status === "sent") {
    update.last_contacted = new Date().toISOString().slice(0, 10);
    update.days_since = 0;
  }

  const { error } = await supabase
    .from("network_nudges")
    .update(update)
    .eq("id", nudgeId)
    .eq("user_id", user.id);

  if (error) throw new Error(`Failed to update nudge: ${error.message}`);

  revalidatePath("/dashboard");
}

export async function sendWeeklyBrief() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("users")
    .select(
      "name, target_role, timeline, years_experience, skills_list, network_contacts"
    )
    .eq("id", user.id)
    .single();

  const { data: achievements } = await supabase
    .from("achievements")
    .select("id")
    .eq("user_id", user.id);

  const { data: jobMatches } = await supabase
    .from("job_matches")
    .select("*, jobs(*)")
    .eq("user_id", user.id)
    .order("match_percent", { ascending: false });

  const { data: skillGaps } = await supabase
    .from("skill_gaps")
    .select("*")
    .eq("user_id", user.id)
    .order("prevalence", { ascending: false });

  const { data: pendingNudges } = await supabase
    .from("network_nudges")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending");

  const { data: jobInteractions } = await supabase
    .from("job_interactions")
    .select("action, jobs(location)")
    .eq("user_id", user.id);

  const avgMatch = jobMatches?.length
    ? jobMatches.reduce((sum, m) => sum + (m.match_percent ?? 0), 0) /
      jobMatches.length
    : null;

  const score = computeCareerScore({
    achievementCount: achievements?.length ?? 0,
    avgJobMatchPercent: avgMatch,
    networkContactCount: Array.isArray(profile?.network_contacts)
      ? profile.network_contacts.length
      : 0,
    skillsCount: Array.isArray(profile?.skills_list)
      ? profile.skills_list.length
      : 0,
    hasTimeline: Boolean(profile?.timeline),
    hasYearsExperience: profile?.years_experience != null,
  });

  const { data: lastBrief } = await supabase
    .from("briefs")
    .select("score")
    .eq("user_id", user.id)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const blockerPatterns = detectBlockerPatterns(
    (jobInteractions ?? []).map((i) => ({
      action: i.action,
      location:
        (i.jobs as unknown as { location: string } | null)?.location ?? "",
    }))
  );

  const weekOf = new Date().toISOString().slice(0, 10);

  const html = buildWeeklyBriefHtml({
    userName: profile?.name ?? null,
    targetRole: profile?.target_role ?? null,
    timeline: profile?.timeline ?? null,
    score,
    previousScore: lastBrief?.score ?? null,
    topJobMatches: (jobMatches ?? []).slice(0, 2).map((m) => ({
      title: m.jobs?.title ?? "Untitled role",
      company: m.jobs?.company ?? "Unknown",
      matchPercent: m.match_percent ?? 0,
      reasoning: m.reasoning ?? "",
      url: m.jobs?.url ?? "#",
    })),
    pendingNudges: (pendingNudges ?? []).slice(0, 2).map((n) => ({
      contactName: n.contact_name,
      suggestedMessage: n.suggested_message ?? "",
    })),
    blockerPatterns,
    skillGaps: (skillGaps ?? []).map((g) => ({
      skillName: g.skill_name,
      prevalence: g.prevalence ?? 0,
    })),
    activity: {
      jobsScanned: jobMatches?.length ?? 0,
      matchesFound: jobMatches?.length ?? 0,
      skillGapsFound: skillGaps?.length ?? 0,
      nudgesDrafted: pendingNudges?.length ?? 0,
      achievementsLogged: achievements?.length ?? 0,
    },
  });

  const resend = createResendClient();
  const { error: sendError } = await resend.emails.send({
    from: BRIEF_FROM_ADDRESS,
    to: user.email,
    subject: weeklyBriefSubject(weekOf),
    html,
  });

  if (sendError) {
    throw new Error(`Failed to send email: ${sendError.message}`);
  }

  await supabase.from("briefs").insert({
    user_id: user.id,
    week_of: weekOf,
    score: score.overall,
    email_html: html,
    sent_at: new Date().toISOString(),
  });

  revalidatePath("/dashboard");
}

export async function generateBulletsForJob(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: job } = await supabase
    .from("jobs")
    .select("title, description")
    .eq("id", jobId)
    .single();

  if (!job) throw new Error("Job not found");

  const { data: achievements } = await supabase
    .from("achievements")
    .select("title, description")
    .eq("user_id", user.id);

  const bullets = await generateResumeBullets(
    achievements ?? [],
    job.title,
    job.description ?? ""
  );

  if (bullets.length > 0) {
    await supabase.from("resume_bullets").insert(
      bullets.map((b) => ({
        user_id: user.id,
        job_id: jobId,
        bullet_text: b.bullet_text,
        category: b.category,
      }))
    );
  }

  revalidatePath("/dashboard");
  return bullets;
}

export async function generateOutreachSuggestionsForJob(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("outreach_suggestions")
    .select("targets, messages")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();
  if (existing) return existing;

  const { data: job } = await supabase
    .from("jobs")
    .select("title, company")
    .eq("id", jobId)
    .single();
  if (!job) throw new Error("Job not found");

  const { data: profile } = await supabase
    .from("users")
    .select("name, target_role, tone_preference")
    .eq("id", user.id)
    .single();

  const targets = buildOutreachTargets(job.title, job.company);
  const messages = await draftColdOutreachMessages({
    userName: profile?.name ?? null,
    targetRole: profile?.target_role ?? null,
    jobTitle: job.title,
    company: job.company,
    tonePreference: profile?.tone_preference ?? null,
  });

  await supabase.from("outreach_suggestions").upsert(
    {
      user_id: user.id,
      job_id: jobId,
      targets,
      messages,
    },
    { onConflict: "user_id,job_id" }
  );

  revalidatePath("/dashboard");
  return { targets, messages };
}

export async function createPromotionCase(params: {
  company: string;
  targetRole: string;
  timeline: string;
  internalJobDescription: string;
  evaluationPeriodEnd?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!params.company || !params.targetRole || !params.internalJobDescription) {
    throw new Error("Company, target role, and job description are required");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("current_job_title")
    .eq("id", user.id)
    .single();

  const cutoff = params.evaluationPeriodEnd
    ? `${params.evaluationPeriodEnd}T23:59:59Z`
    : null;

  let achievementsQuery = supabase
    .from("achievements")
    .select("title, description, impact_metric, impact_number, category, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (cutoff) achievementsQuery = achievementsQuery.lte("created_at", cutoff);
  const { data: achievements } = await achievementsQuery;

  let fridayLogsQuery = supabase
    .from("friday_logs")
    .select("week_of, achievement, leadership, impact")
    .eq("user_id", user.id)
    .order("week_of", { ascending: true });
  if (params.evaluationPeriodEnd)
    fridayLogsQuery = fridayLogsQuery.lte("week_of", params.evaluationPeriodEnd);
  const { data: fridayLogs } = await fridayLogsQuery;

  if (!achievements?.length && !fridayLogs?.length) {
    throw new Error(
      "No achievements or Friday logs on file yet — log some evidence first"
    );
  }

  const result = await generatePromotionCase({
    achievements: achievements ?? [],
    fridayLogs: fridayLogs ?? [],
    currentRole: profile?.current_job_title ?? null,
    company: params.company,
    targetRole: params.targetRole,
    timeline: params.timeline,
    evaluationPeriodEnd: params.evaluationPeriodEnd ?? null,
    internalJobDescription: params.internalJobDescription,
  });

  const { data: inserted, error } = await supabase
    .from("promotion_cases")
    .insert({
      user_id: user.id,
      company: params.company,
      target_role: params.targetRole,
      readiness_score: result.readiness_score,
      strengths: result.strengths,
      gaps: result.gaps,
      timeline_recommendation: result.timeline_recommendation,
      email_template: result.email_template,
      evaluation_period_end: params.evaluationPeriodEnd || null,
      detailed_document: result.document,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save promotion case: ${error.message}`);

  revalidatePath("/dashboard");
  return inserted;
}

export async function updatePromotionCaseStatus(
  caseId: string,
  status: "sent" | "accepted" | "rejected"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("promotion_cases")
    .update({ status })
    .eq("id", caseId)
    .eq("user_id", user.id);

  if (error) throw new Error(`Failed to update case: ${error.message}`);

  revalidatePath("/dashboard");
}

export async function generateInterviewPrepForJob(jobId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: job } = await supabase
    .from("jobs")
    .select("title, description")
    .eq("id", jobId)
    .single();
  if (!job) throw new Error("Job not found");

  const { data: achievements } = await supabase
    .from("achievements")
    .select("title, description")
    .eq("user_id", user.id);

  const questions = await generateInterviewQuestions(
    achievements ?? [],
    job.title,
    job.description ?? ""
  );

  if (questions.length > 0) {
    await supabase.from("interview_prep").insert(
      questions.map((q) => ({
        user_id: user.id,
        job_id: jobId,
        question: q.question,
        sample_answer: q.sample_answer,
        prepared: false,
      }))
    );
  }

  revalidatePath("/dashboard");
  return questions;
}

export async function submitFridayLog(params: {
  achievement: string;
  leadership: string;
  impact: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const parsed = await parseFridayLogAchievements(params);

  const weekOf = new Date();
  const day = weekOf.getDay();
  const diffToFriday = (5 - day + 7) % 7;
  weekOf.setDate(weekOf.getDate() + diffToFriday);
  const weekOfStr = weekOf.toISOString().slice(0, 10);

  const { data: logRow, error: logError } = await supabase
    .from("friday_logs")
    .insert({
      user_id: user.id,
      week_of: weekOfStr,
      achievement: params.achievement,
      leadership: params.leadership,
      impact: params.impact,
      parsed_achievements: parsed,
    })
    .select("id")
    .single();

  if (logError) throw new Error(`Failed to save log: ${logError.message}`);

  if (parsed.length > 0) {
    await supabase.from("achievements").insert(
      parsed.map((a) => ({
        user_id: user.id,
        title: a.title,
        description: a.description,
        category: a.category,
        source: "friday_log",
        impact_metric: a.impact_metric,
        impact_number: a.impact_number,
        team_size: a.team_size,
        confidence: a.confidence,
        friday_log_id: logRow.id,
      }))
    );
  }

  revalidatePath("/dashboard");
  return parsed;
}

/**
 * Runs the same autonomous cycle the weekly cron runs (src/app/api/cron/
 * weekly-agent), but for the current user only and on demand — lets you
 * see the full agent loop execute without waiting for the schedule or
 * deploying anywhere.
 */
export async function runMyAgentCycle(): Promise<AgentCycleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const result = await runAgentCycleForUser(admin, user.id);

  revalidatePath("/dashboard");
  return result;
}
