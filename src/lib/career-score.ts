export type CareerScoreInputs = {
  achievementCount: number;
  avgJobMatchPercent: number | null;
  networkContactCount: number;
  skillsCount: number;
  hasTimeline: boolean;
  hasYearsExperience: boolean;
};

export type CareerScoreBreakdown = {
  overall: number;
  velocity: number;
  marketFit: number;
  network: number;
  skillReadiness: number;
  timelineStatus: number;
};

const WEIGHTS = {
  velocity: 0.25,
  marketFit: 0.25,
  network: 0.2,
  skillReadiness: 0.15,
  timelineStatus: 0.15,
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeCareerScore(
  inputs: CareerScoreInputs
): CareerScoreBreakdown {
  const velocity = clamp(inputs.achievementCount * 15);
  const marketFit = clamp(inputs.avgJobMatchPercent ?? 0);
  const network = clamp((inputs.networkContactCount / 5) * 100);
  const skillReadiness = clamp(inputs.skillsCount * 25);
  const timelineStatus = clamp(
    (inputs.hasTimeline ? 60 : 20) + (inputs.hasYearsExperience ? 40 : 0)
  );

  const overall = clamp(
    velocity * WEIGHTS.velocity +
      marketFit * WEIGHTS.marketFit +
      network * WEIGHTS.network +
      skillReadiness * WEIGHTS.skillReadiness +
      timelineStatus * WEIGHTS.timelineStatus
  );

  return { overall, velocity, marketFit, network, skillReadiness, timelineStatus };
}
