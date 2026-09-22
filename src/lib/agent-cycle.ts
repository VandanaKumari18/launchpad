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

export type AgentCycleResult = {
  userId: string;
  jobsScanned: number;
  nudgesDrafted: number;
  skillGapsFound: number;
  score: number;
  briefSent: boolean;
  error?: string;
};

/**
 * The full autonomous cycle for one user: scan jobs, score them, draft
 * overdue network nudges, refresh skill gaps, compute the career score,
 * and email the weekly brief. Everything a human would otherwise trigger
 * by clicking five separate buttons over the course of a week.
 *
 * Runs on the admin (service-role) client since it has no user session —
 * it's invoked by the cron route for every onboarded user, not by a
 * logged-in visitor.
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
      error: "Profile not onboarded",
    };
  }

  let jobsScanned = 0;

  // 1. Scan + score jobs, if a target role is set.
  if (profile.target_role) {
    try {
      const jobs = await searchJobs({
        what: profile.target_role,
        where: profile.city ?? "bangalore",
        resultsPerPage: 10,
      });

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
          const score = await scoreJobMatch(profile, job);
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
          console.error(`[agent-cycle] scoreJobMatch failed for ${userId}`, error);
        }
      }
    } catch (error) {
      console.error(`[agent-cycle] job scan failed for ${userId}`, error);
    }
  }

  // 2. Draft outreach for contacts who are new or overdue.
  let nudgesDrafted = 0;
  const contacts: { name: string; linkedin_url?: string }[] = Array.isArray(
    profile.network_contacts
  )
    ? profile.network_contacts
    : [];

  if (contacts.length > 0) {
    const { data: existingNudges } = await admin
      .from("network_nudges")
      .select("contact_name, status, last_contacted")
      .eq("user_id", userId);

    const existingByName = new Map(
      (existingNudges ?? []).map((n) => [n.contact_name, n])
    );

    for (const contact of contacts) {
      if (!contact.name) continue;
      const existing = existingByName.get(contact.name);
      const isDue = isNudgeDue(existing);
      if (!isDue) continue;

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
      } catch (error) {
        console.error(`[agent-cycle] draftOutreachMessage failed for ${userId}`, error);
      }
    }
  }

  // 3. Refresh skill gaps against whatever jobs are on file.
  let skillGapsFound = 0;
  try {
    const { data: jobMatchRows } = await admin
      .from("job_matches")
      .select("jobs(description)")
      .eq("user_id", userId);

    const descriptions = (jobMatchRows ?? [])
      .map(
        (m) => (m.jobs as unknown as { description: string } | null)?.description
      )
      .filter((d): d is string => Boolean(d));

    if (descriptions.length > 0) {
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
      skillGapsFound = gaps.length;
    }
  } catch (error) {
    console.error(`[agent-cycle] skill gap analysis failed for ${userId}`, error);
  }

  // 4. Compute the career score from everything now on file.
  const [{ data: achievements }, { data: jobMatches }, { data: jobInteractions }] =
    await Promise.all([
      admin.from("achievements").select("id").eq("user_id", userId),
      admin.from("job_matches").select("*, jobs(*)").eq("user_id", userId),
      admin
        .from("job_interactions")
        .select("action, jobs(location)")
        .eq("user_id", userId),
    ]);

  const avgMatch = jobMatches?.length
    ? jobMatches.reduce((sum, m) => sum + (m.match_percent ?? 0), 0) /
      jobMatches.length
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

  // 5. Send the weekly brief and archive the score.
  let briefSent = false;
  try {
    const { data: pendingNudges } = await admin
      .from("network_nudges")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending");

    const { data: skillGaps } = await admin
      .from("skill_gaps")
      .select("*")
      .eq("user_id", userId)
      .order("prevalence", { ascending: false });

    const { data: lastBrief } = await admin
      .from("briefs")
      .select("score")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

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
        jobsScanned,
        matchesFound: jobMatches?.length ?? 0,
        skillGapsFound,
        nudgesDrafted,
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

    if (!sendError) {
      await admin.from("briefs").insert({
        user_id: userId,
        week_of: weekOf,
        score: score.overall,
        email_html: html,
        sent_at: new Date().toISOString(),
      });
      briefSent = true;
    }
  } catch (error) {
    console.error(`[agent-cycle] weekly brief failed for ${userId}`, error);
  }

  return {
    userId,
    jobsScanned,
    nudgesDrafted,
    skillGapsFound,
    score: score.overall,
    briefSent,
  };
}

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
