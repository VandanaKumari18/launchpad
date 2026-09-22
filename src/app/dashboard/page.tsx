import Link from "next/link";
import {
  getUserAndProfile,
  getAchievements,
  getJobMatches,
  getJobInteractions,
  getSkillGaps,
  getNetworkNudges,
  getBriefs,
  computeScoreForProfile,
  computeBlockers,
} from "@/lib/dashboard-data";
import { CareerScoreCard } from "@/components/dashboard/career-score-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Info,
  CheckCircle2,
  Briefcase,
  Users,
  Trophy,
  TrendingUp,
  Sparkles,
  Mail,
} from "lucide-react";

export default async function DashboardOverviewPage() {
  const { supabase, user, profile } = await getUserAndProfile();
  if (!user || !profile) return null;

  const [achievements, jobMatches, jobInteractions, skillGaps, networkNudges, briefs] =
    await Promise.all([
      getAchievements(supabase, user.id),
      getJobMatches(supabase, user.id),
      getJobInteractions(supabase, user.id),
      getSkillGaps(supabase, user.id),
      getNetworkNudges(supabase, user.id),
      getBriefs(supabase, user.id),
    ]);

  const scoreBreakdown = computeScoreForProfile(
    profile,
    achievements.length,
    jobMatches
  );
  const blockerPatterns = computeBlockers(jobInteractions);

  const actedJobIds = new Set(jobInteractions.map((i) => i.job_id));
  const unactedStrongMatches = jobMatches.filter(
    (m) => (m.match_percent ?? 0) >= 60 && !actedJobIds.has(m.job_id)
  );
  const pendingNudges = networkNudges.filter((n) => n.status === "pending");

  const needsAttention = unactedStrongMatches.length + pendingNudges.length;
  const fyi = blockerPatterns.length + (skillGaps.length > 0 ? 1 : 0);
  const agentWorking =
    jobMatches.length +
    achievements.length +
    networkNudges.length +
    skillGaps.length;

  const topMatches = jobMatches.slice(0, 3);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {greeting()}, {profile.name ?? "there"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Goal: {profile.target_role ?? "not set"} ·{" "}
          {profile.timeline ?? "no timeline set"}
        </p>
      </div>

      <CareerScoreCard
        breakdown={scoreBreakdown}
        previousScore={briefs[0]?.score ?? null}
      />

      <div className="grid grid-cols-3 gap-3">
        <StatPill
          icon={<AlertCircle className="h-4 w-4" />}
          label="Needs attention"
          count={needsAttention}
          tone="red"
        />
        <StatPill
          icon={<Info className="h-4 w-4" />}
          label="FYI"
          count={fyi}
          tone="yellow"
        />
        <StatPill
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Agent working"
          count={agentWorking}
          tone="green"
        />
      </div>

      <div>
        <h2 className="text-lg font-medium">Quick actions</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <QuickAction href="/dashboard/achievements" icon={Trophy} label="Friday Log" />
          <QuickAction href="/dashboard/jobs" icon={Briefcase} label="Scan for Jobs" />
          <QuickAction href="/dashboard/network" icon={Users} label="Draft Outreach" />
          <QuickAction href="/dashboard/promotion" icon={TrendingUp} label="Promotion Case" />
          <QuickAction href="/dashboard/skills" icon={Sparkles} label="Skill Gaps" />
          <QuickAction href="/dashboard/briefs" icon={Mail} label="Weekly Brief" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent job matches</h2>
          <Link
            href="/dashboard/jobs"
            className="text-sm text-muted-foreground underline"
          >
            View all →
          </Link>
        </div>
        {topMatches.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No matches yet.{" "}
            <Link href="/dashboard/jobs" className="underline">
              Scan for jobs
            </Link>{" "}
            to get started.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {topMatches.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <span className="font-medium">
                  {m.jobs?.title} — {m.jobs?.company}
                </span>
                <Badge variant="secondary">{m.match_percent}% match</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Your network</h2>
          <Link
            href="/dashboard/network"
            className="text-sm text-muted-foreground underline"
          >
            View all →
          </Link>
        </div>
        {networkNudges.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No contacts drafted yet.{" "}
            <Link href="/dashboard/network" className="underline">
              Draft outreach
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {networkNudges.slice(0, 3).map((n) => (
              <li
                key={n.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <span className="font-medium">{n.contact_name}</span>
                <Badge variant={n.status === "pending" ? "default" : "secondary"}>
                  {n.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function StatPill({
  icon,
  label,
  count,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  tone: "red" | "yellow" | "green";
}) {
  const toneClasses = {
    red: "border-red-600/30 bg-red-600/5 text-red-700",
    yellow: "border-yellow-600/30 bg-yellow-600/5 text-yellow-700",
    green: "border-green-600/30 bg-green-600/5 text-green-700",
  }[tone];

  return (
    <Card className={toneClasses}>
      <CardContent className="flex items-center gap-2 py-4">
        {icon}
        <div>
          <div className="text-lg font-semibold leading-none">{count}</div>
          <div className="text-xs">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-2 rounded-md border p-4 text-center text-sm hover:bg-muted"
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
