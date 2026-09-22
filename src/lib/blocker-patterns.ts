export type BlockerPattern = {
  pattern: string;
  detail: string;
};

const MIN_INTERACTIONS = 5;
const MIN_PER_GROUP = 3;
const THRESHOLD = 60;

function isRemote(location: string): boolean {
  return /remote/i.test(location);
}

export function detectBlockerPatterns(
  interactions: { action: string; location: string }[]
): BlockerPattern[] {
  if (interactions.length < MIN_INTERACTIONS) return [];

  const dismissed = interactions.filter((i) => i.action === "dismiss");
  const saved = interactions.filter(
    (i) => i.action === "save" || i.action === "apply"
  );

  const patterns: BlockerPattern[] = [];

  if (dismissed.length >= MIN_PER_GROUP && saved.length >= 2) {
    const dismissedRemotePct =
      (dismissed.filter((i) => isRemote(i.location)).length /
        dismissed.length) *
      100;
    const savedOnsitePct =
      (saved.filter((i) => !isRemote(i.location)).length / saved.length) *
      100;

    if (dismissedRemotePct >= THRESHOLD && savedOnsitePct >= THRESHOLD) {
      patterns.push({
        pattern: "Remote Role Aversion",
        detail: `${Math.round(dismissedRemotePct)}% of your dismissals are remote roles, and ${Math.round(
          savedOnsitePct
        )}% of your saves are onsite roles. You seem to prefer onsite work.`,
      });
    }

    const dismissedOnsitePct =
      (dismissed.filter((i) => !isRemote(i.location)).length /
        dismissed.length) *
      100;
    const savedRemotePct =
      (saved.filter((i) => isRemote(i.location)).length / saved.length) * 100;

    if (dismissedOnsitePct >= THRESHOLD && savedRemotePct >= THRESHOLD) {
      patterns.push({
        pattern: "Onsite Role Aversion",
        detail: `${Math.round(dismissedOnsitePct)}% of your dismissals are onsite roles, and ${Math.round(
          savedRemotePct
        )}% of your saves are remote roles. You seem to prefer remote work.`,
      });
    }
  }

  return patterns;
}
