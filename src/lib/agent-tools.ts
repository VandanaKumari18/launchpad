import type { SupabaseClient } from "@supabase/supabase-js";
import { searchJobs } from "@/lib/adzuna";
import { scoreJobMatch } from "@/lib/job-matching";
import { analyzeSkillGaps } from "@/lib/skill-gaps";
import { draftOutreachMessage } from "@/lib/network-nudges";
import { computeCareerScore } from "@/lib/career-score";
import { detectBlockerPatterns } from "@/lib/blocker-patterns";
import { createResendClient, BRIEF_FROM_ADDRESS } from "@/lib/resend";
import { buildWeeklyBriefHtml, weeklyBriefSubject } from "@/lib/weekly-brief";

const RENUDGE_AFTER_DAYS = 14;

type Profile = {
  name: string | null;
  email: string | null;
  target_role: string | null;
  current_job_title: string | null;
  timeline: string | null;
  years_experience: number | null;
  skills_list: unknown;
  target_companies: unknown;
  network_contacts: unknown;
  tone_preference: string | null;
  city: string | null;
};

export type ToolResult = { summary: string; data: Record<string, unknown> };

function isNudgeDue(existing?: {
  status: string;
  last_contacted: string | null;
}): boolean {
  if (!existing) return true;
  if (existing.status === "pending") return false;
  if (!existing.last_contacted) return true;
  const daysSince =
    (Date.now() - new Date(existing.last_contacted).getTime()) / 86_400_000;
  return daysSince >= RENUDGE_AFTER_DAYS;
}

/** Builds a compact snapshot of the user's current state for the agent to reason over. */
export async function getAgentState(
  admin: SupabaseClient,
  userId: string,
  profile: Profile
): Promise<string> {
  const [
    { data: jobMatches },
    { data: nudges },
    { data: skillGaps },
    { data: achievements },
    { data: lastBrief },
  ] = await Promise.all([
    admin
      .from("job_matches")
      .select("computed_at")
      .eq("user_id", userId)
      .order("computed_at", { ascending: false })
      .limit(1),
    admin
      .from("network_nudges")
      .select("contact_name, status, last_contacted")
      .eq("user_id", userId),
    admin.from("skill_gaps").select("id").eq("user_id", userId),
    admin
      .from("achievements")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
    admin
      .from("briefs")
      .select("score, sent_at")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const contacts: { name: string }[] = Array.isArray(profile.network_contacts)
    ? profile.network_contacts
    : [];
  const existingByName = new Map(
    (nudges ?? []).map((n) => [n.contact_name, n])
  );
  const overdue = contacts.filter(
    (c) => c.name && isNudgeDue(existingByName.get(c.name))
  );

  const lastScan = jobMatches?.[0]?.computed_at;
  const daysSinceLastScan = lastScan
    ? Math.floor((Date.now() - new Date(lastScan).getTime()) / 86_400_000)
    : null;

  const lastAchievement = achievements?.[0]?.created_at;
  const daysSinceLastAchievement = lastAchievement
    ? Math.floor((Date.now() - new Date(lastAchievement).getTime()) / 86_400_000)
    : null;

  return `User: ${profile.name ?? "unknown"}
Target role: ${profile.target_role ?? "not set"}, city: ${profile.city ?? "not set"}
Days since last job scan: ${daysSinceLastScan ?? "never scanned"}
Network contacts overdue for outreach (14+ days or never contacted): ${overdue.map((c) => c.name).join(", ") || "none"}
Pending (undrafted-or-unsent) nudges already on file: ${(nudges ?? []).filter((n) => n.status === "pending").length}
Skill gaps currently on file: ${skillGaps?.length ?? 0}
Achievements logged: ${achievements ? "at least 1" : "0"}, days since most recent: ${daysSinceLastAchievement ?? "none logged"}
Last weekly brief: ${lastBrief ? `sent ${lastBrief.sent_at}, score ${lastBrief.score}/100` : "never sent"}`;
}

export async function toolScanJobs(
  admin: SupabaseClient,
  userId: string,
  profile: Profile
): Promise<ToolResult> {
  if (!profile.target_role) {
    return {
      summary: "Skipped: no target role set on the profile.",
      data: { jobsScanned: 0 },
    };
  }

  const jobs = await searchJobs({
    what: profile.target_role,
    where: profile.city ?? "bangalore",
    resultsPerPage: 10,
  });

  let jobsScanned = 0;
  for (const job of jobs) {
    const { data: jobRow } = await admin
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
    if (!jobRow) continue;

    try {
      const score = await scoreJobMatch(
        {
          target_role: profile.target_role,
          current_job_title: profile.current_job_title,
          years_experience: profile.years_experience,
          skills_list: Array.isArray(profile.skills_list)
            ? (profile.skills_list as string[])
            : null,
          target_companies: Array.isArray(profile.target_companies)
            ? (profile.target_companies as string[])
            : null,
        },
        job
      );
      await admin.from("job_matches").upsert(
        {
          user_id: userId,
          job_id: jobRow.id,
          match_percent: score.match_percent,
          reasoning: score.reasoning,
          computed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,job_id" }
      );
      jobsScanned += 1;
    } catch (error) {
      console.error(`[agent-tools] scoreJobMatch failed for ${userId}`, error);
    }
  }

  return {
    summary: `Scanned the market for "${profile.target_role}" and scored ${jobsScanned} postings.`,
    data: { jobsScanned },
  };
}

export async function toolDraftNudges(
  admin: SupabaseClient,
  userId: string,
  profile: Profile
): Promise<ToolResult> {
  const contacts: { name: string; linkedin_url?: string }[] = Array.isArray(
    profile.network_contacts
  )
    ? profile.network_contacts
    : [];
  if (contacts.length === 0) {
    return { summary: "Skipped: no network contacts on file.", data: { nudgesDrafted: 0 } };
  }

  const { data: existingNudges } = await admin
    .from("network_nudges")
    .select("contact_name, status, last_contacted")
    .eq("user_id", userId);
  const existingByName = new Map((existingNudges ?? []).map((n) => [n.contact_name, n]));

  let nudgesDrafted = 0;
  const names: string[] = [];
  for (const contact of contacts) {
    if (!contact.name || !isNudgeDue(existingByName.get(contact.name))) continue;
    try {
      const message = await draftOutreachMessage({
        contactName: contact.name,
        userName: profile.name ?? null,
        targetRole: profile.target_role ?? null,
        timeline: profile.timeline ?? null,
        tonePreference: profile.tone_preference ?? null,
      });
      await admin.from("network_nudges").upsert(
        {
          user_id: userId,
          contact_name: contact.name,
          contact_url: contact.linkedin_url ?? null,
          suggested_message: message,
          status: "pending",
        },
        { onConflict: "user_id,contact_name" }
      );
      nudgesDrafted += 1;
      names.push(contact.name);
    } catch (error) {
      console.error(`[agent-tools] draftOutreachMessage failed for ${userId}`, error);
    }
  }

  return {
    summary:
      nudgesDrafted > 0
        ? `Drafted outreach for ${nudgesDrafted} overdue contact(s): ${names.join(", ")}.`
        : "No contacts were currently overdue — nothing drafted.",
    data: { nudgesDrafted },
  };
}

export async function toolAnalyzeSkillGaps(
  admin: SupabaseClient,
  userId: string,
  profile: Profile
): Promise<ToolResult> {
  const { data: jobMatchRows } = await admin
    .from("job_matches")
    .select("jobs(description)")
    .eq("user_id", userId);

  const descriptions = (jobMatchRows ?? [])
    .map((m) => (m.jobs as unknown as { description: string } | null)?.description)
    .filter((d): d is string => Boolean(d));

  if (descriptions.length === 0) {
    return {
      summary: "Skipped: no scanned job descriptions on file to compare skills against.",
      data: { skillGapsFound: 0 },
    };
  }

  const gaps = await analyzeSkillGaps(
    Array.isArray(profile.skills_list) ? profile.skills_list : [],
    descriptions
  );

  await admin.from("skill_gaps").delete().eq("user_id", userId);
  if (gaps.length > 0) {
    await admin.from("skill_gaps").insert(
      gaps.map((g) => ({
        user_id: userId,
        skill_name: g.skill_name,
        user_level: g.user_level,
        required_level: g.required_level,
        prevalence: g.prevalence,
      }))
    );
  }

  return {
    summary:
      gaps.length > 0
        ? `Found ${gaps.length} skill gap(s): ${gaps.map((g) => g.skill_name).join(", ")}.`
        : "Compared skills against scanned postings — no meaningful gaps found.",
    data: { skillGapsFound: gaps.length },
  };
}

export async function toolSendWeeklyBrief(
  admin: SupabaseClient,
  userId: string,
  profile: Profile,
  activityTotals: {
    jobsScanned: number;
    nudgesDrafted: number;
    skillGapsFound: number;
  }
): Promise<ToolResult> {
  if (!profile.email) {
    return { summary: "Skipped: no email on file.", data: { briefSent: false, score: 0 } };
  }

  const contacts: unknown[] = Array.isArray(profile.network_contacts)
    ? profile.network_contacts
    : [];

  const [
    { data: achievements },
    { data: jobMatches },
    { data: jobInteractions },
    { data: pendingNudges },
    { data: skillGaps },
    { data: lastBrief },
  ] = await Promise.all([
    admin.from("achievements").select("id").eq("user_id", userId),
    admin.from("job_matches").select("*, jobs(*)").eq("user_id", userId),
    admin.from("job_interactions").select("action, jobs(location)").eq("user_id", userId),
    admin.from("network_nudges").select("*").eq("user_id", userId).eq("status", "pending"),
    admin
      .from("skill_gaps")
      .select("*")
      .eq("user_id", userId)
      .order("prevalence", { ascending: false }),
    admin
      .from("briefs")
      .select("score")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const avgMatch = jobMatches?.length
    ? jobMatches.reduce((sum, m) => sum + (m.match_percent ?? 0), 0) / jobMatches.length
    : null;

  const score = computeCareerScore({
    achievementCount: achievements?.length ?? 0,
    avgJobMatchPercent: avgMatch,
    networkContactCount: contacts.length,
    skillsCount: Array.isArray(profile.skills_list) ? profile.skills_list.length : 0,
    hasTimeline: Boolean(profile.timeline),
    hasYearsExperience: profile.years_experience != null,
  });

  const blockerPatterns = detectBlockerPatterns(
    (jobInteractions ?? []).map((i) => ({
      action: i.action,
      location: (i.jobs as unknown as { location: string } | null)?.location ?? "",
    }))
  );

  const weekOf = new Date().toISOString().slice(0, 10);
  const html = buildWeeklyBriefHtml({
    userName: profile.name ?? null,
    targetRole: profile.target_role ?? null,
    timeline: profile.timeline ?? null,
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
      jobsScanned: activityTotals.jobsScanned,
      matchesFound: jobMatches?.length ?? 0,
      skillGapsFound: activityTotals.skillGapsFound,
      nudgesDrafted: activityTotals.nudgesDrafted,
      achievementsLogged: achievements?.length ?? 0,
    },
  });

  const resend = createResendClient();
  const { error: sendError } = await resend.emails.send({
    from: BRIEF_FROM_ADDRESS,
    to: profile.email,
    subject: weeklyBriefSubject(weekOf),
    html,
  });

  if (sendError) {
    return {
      summary: `Failed to send: ${sendError.message}`,
      data: { briefSent: false, score: score.overall },
    };
  }

  await admin.from("briefs").insert({
    user_id: userId,
    week_of: weekOf,
    score: score.overall,
    email_html: html,
    sent_at: new Date().toISOString(),
  });

  return {
    summary: `Sent the weekly brief. Career score: ${score.overall}/100.`,
    data: { briefSent: true, score: score.overall },
  };
}
