"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CareerScoreBreakdown } from "@/lib/career-score";
import { explainCareerScore } from "@/app/dashboard/actions";

const LABELS: Record<keyof Omit<CareerScoreBreakdown, "overall">, string> = {
  velocity: "Career Velocity",
  marketFit: "Market Fit",
  network: "Network Strength",
  skillReadiness: "Skill Readiness",
  timelineStatus: "Timeline Status",
};

export function CareerScoreCard({
  breakdown,
  previousScore,
}: {
  breakdown: CareerScoreBreakdown;
  previousScore?: number | null;
}) {
  const delta =
    previousScore != null ? breakdown.overall - previousScore : null;
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExplain() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await explainCareerScore();
        setExplanation(result.explanation);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to explain score");
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-medium">Career Score</h2>
          <span className="text-3xl font-semibold">
            {breakdown.overall}/100
            {delta != null && delta !== 0 && (
              <span
                className={
                  "ml-2 text-base font-normal " +
                  (delta > 0 ? "text-green-600" : "text-red-600")
                }
              >
                {delta > 0 ? `↑${delta}` : `↓${Math.abs(delta)}`}
              </span>
            )}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((key) => (
            <div key={key} className="flex justify-between">
              <dt className="text-muted-foreground">{LABELS[key]}</dt>
              <dd>{breakdown[key]}/100</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4">
          {explanation ? (
            <p className="text-sm text-muted-foreground">{explanation}</p>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExplain}
              disabled={isPending}
            >
              {isPending ? "Thinking…" : "Why this score?"}
            </Button>
          )}
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
