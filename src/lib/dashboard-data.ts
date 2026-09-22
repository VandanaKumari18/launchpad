import { createClient } from "@/lib/supabase/server";
import { computeCareerScore } from "@/lib/career-score";
import { detectBlockerPatterns } from "@/lib/blocker-patterns";

export async function getUserAndProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
}

export async function getAchievements(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("achievements")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getJobMatches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("job_matches")
    .select("*, jobs(*)")
    .eq("user_id", userId)
    .order("match_percent", { ascending: false });
  return data ?? [];
}

export async function getJobInteractions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("job_interactions")
    .select("action, job_id, jobs(location)")
    .eq("user_id", userId);
  return data ?? [];
}

export async function getSkillGaps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("skill_gaps")
    .select("*")
    .eq("user_id", userId)
    .order("prevalence", { ascending: false });
  return data ?? [];
}

export async function getNetworkNudges(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("network_nudges")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getPromotionCases(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("promotion_cases")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getBriefs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("briefs")
    .select("*")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false });
  return data ?? [];
}

export async function getResumeBulletsByJob(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("resume_bullets")
    .select("job_id, bullet_text, category")
    .eq("user_id", userId);

  const byJob = new Map<string, { bullet_text: string; category: string }[]>();
  for (const b of data ?? []) {
    const list = byJob.get(b.job_id) ?? [];
    list.push({ bullet_text: b.bullet_text, category: b.category });
    byJob.set(b.job_id, list);
  }
  return byJob;
}

export async function getInterviewPrepByJob(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("interview_prep")
    .select("job_id, question, sample_answer")
    .eq("user_id", userId);

  const byJob = new Map<
    string,
    { question: string; sample_answer: string }[]
  >();
  for (const q of data ?? []) {
    const list = byJob.get(q.job_id) ?? [];
    list.push({ question: q.question, sample_answer: q.sample_answer ?? "" });
    byJob.set(q.job_id, list);
  }
  return byJob;
}

export function getLatestActionByJob(
  interactions: { action: string; job_id: string }[]
) {
  const map = new Map<string, string>();
  for (const i of interactions) {
    map.set(i.job_id, i.action);
  }
  return map;
}

type Profile = {
  network_contacts: unknown;
  skills_list: unknown;
  timeline: string | null;
  years_experience: number | null;
};

export function computeScoreForProfile(
  profile: Profile,
  achievementCount: number,
  jobMatches: { match_percent: number | null }[]
) {
  const avgMatch = jobMatches.length
    ? jobMatches.reduce((sum, m) => sum + (m.match_percent ?? 0), 0) /
      jobMatches.length
    : null;

  return computeCareerScore({
    achievementCount,
    avgJobMatchPercent: avgMatch,
    networkContactCount: Array.isArray(profile.network_contacts)
      ? profile.network_contacts.length
      : 0,
    skillsCount: Array.isArray(profile.skills_list)
      ? profile.skills_list.length
      : 0,
    hasTimeline: Boolean(profile.timeline),
    hasYearsExperience: profile.years_experience != null,
  });
}

export function computeBlockers(
  interactions: { action: string; jobs: unknown }[]
) {
  return detectBlockerPatterns(
    interactions.map((i) => ({
      action: i.action,
      location:
        (i.jobs as unknown as { location: string } | null)?.location ?? "",
    }))
  );
}
