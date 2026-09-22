import type { CareerScoreBreakdown } from "@/lib/career-score";

export type WeeklyBriefData = {
  userName: string | null;
  targetRole: string | null;
  timeline: string | null;
  score: CareerScoreBreakdown;
  previousScore: number | null;
  topJobMatches: {
    title: string;
    company: string;
    matchPercent: number;
    reasoning: string;
    url: string;
  }[];
  pendingNudges: { contactName: string; suggestedMessage: string }[];
  blockerPatterns: { pattern: string; detail: string }[];
  skillGaps: { skillName: string; prevalence: number }[];
  activity: {
    jobsScanned: number;
    matchesFound: number;
    skillGapsFound: number;
    nudgesDrafted: number;
    achievementsLogged: number;
  };
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function weeklyBriefSubject(weekOf: string): string {
  return `Your Career Brief — Week of ${weekOf}`;
}

export function buildWeeklyBriefHtml(data: WeeklyBriefData): string {
  const delta =
    data.previousScore != null
      ? data.score.overall - data.previousScore
      : null;
  const deltaText =
    delta == null
      ? ""
      : delta === 0
        ? " (no change)"
        : delta > 0
          ? ` (up ${delta})`
          : ` (down ${Math.abs(delta)})`;

  const actOn: string[] = [];
  for (const m of data.topJobMatches) {
    actOn.push(`
      <div style="margin-bottom:16px;padding:12px;border:1px solid #e5e5e5;border-radius:8px;">
        <div style="font-weight:600;">${esc(m.title)} — ${esc(m.company)} (${m.matchPercent}% match)</div>
        <div style="color:#555;font-size:14px;margin-top:4px;">${esc(m.reasoning)}</div>
        <a href="${esc(m.url)}" style="font-size:13px;color:#2563eb;">View job</a>
      </div>`);
  }
  for (const n of data.pendingNudges) {
    actOn.push(`
      <div style="margin-bottom:16px;padding:12px;border:1px solid #e5e5e5;border-radius:8px;">
        <div style="font-weight:600;">Reconnect with ${esc(n.contactName)}</div>
        <div style="color:#555;font-size:14px;margin-top:4px;font-style:italic;">"${esc(n.suggestedMessage)}"</div>
      </div>`);
  }

  const fyi: string[] = [];
  for (const p of data.blockerPatterns) {
    fyi.push(
      `<li><strong>${esc(p.pattern)}.</strong> ${esc(p.detail)}</li>`
    );
  }
  if (data.skillGaps.length > 0) {
    const top = data.skillGaps
      .slice(0, 3)
      .map((g) => `${esc(g.skillName)} (${g.prevalence}% of postings)`)
      .join(", ");
    fyi.push(`<li>Top skill gaps: ${top}</li>`);
  }

  return `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#111;">
  <div style="border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:20px;">
    <div style="font-size:14px;color:#555;">
      🎯 YOUR GOAL: ${esc(data.targetRole ?? "not set")}${data.timeline ? ` · ${esc(data.timeline)} left` : ""}
    </div>
    <div style="font-size:20px;font-weight:700;margin-top:4px;">
      Career Score: ${data.score.overall}/100${deltaText}
    </div>
  </div>

  ${
    actOn.length > 0
      ? `<h2 style="font-size:16px;">🔴 ACT ON THESE</h2>${actOn.join("")}`
      : ""
  }

  ${
    fyi.length > 0
      ? `<h2 style="font-size:16px;">🟡 FYI</h2><ul style="font-size:14px;color:#333;">${fyi.join("")}</ul>`
      : ""
  }

  <h2 style="font-size:16px;">📊 CAREER HEALTH BREAKDOWN</h2>
  <table style="font-size:14px;width:100%;">
    <tr><td>Career Velocity</td><td style="text-align:right;">${data.score.velocity}/100</td></tr>
    <tr><td>Market Fit</td><td style="text-align:right;">${data.score.marketFit}/100</td></tr>
    <tr><td>Network Strength</td><td style="text-align:right;">${data.score.network}/100</td></tr>
    <tr><td>Skill Readiness</td><td style="text-align:right;">${data.score.skillReadiness}/100</td></tr>
    <tr><td>Timeline Status</td><td style="text-align:right;">${data.score.timelineStatus}/100</td></tr>
  </table>

  <h2 style="font-size:16px;">✅ AGENT ACTIVITY THIS WEEK</h2>
  <ul style="font-size:14px;color:#333;">
    <li>${data.activity.jobsScanned} jobs scanned</li>
    <li>${data.activity.matchesFound} job matches on file</li>
    <li>${data.activity.skillGapsFound} skill gaps identified</li>
    <li>${data.activity.nudgesDrafted} network nudges drafted</li>
    <li>${data.activity.achievementsLogged} achievements logged</li>
  </ul>

  <p style="font-size:13px;color:#888;margin-top:24px;">
    See you next week.<br />— Your Launchpad Agent
  </p>
</div>`;
}
