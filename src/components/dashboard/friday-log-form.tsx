"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { submitFridayLog } from "@/app/dashboard/actions";

type ParsedAchievement = {
  title: string;
  description: string;
  category: string;
};

export function FridayLogForm() {
  const [achievement, setAchievement] = useState("");
  const [leadership, setLeadership] = useState("");
  const [impact, setImpact] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParsedAchievement[] | null>(null);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const parsed = await submitFridayLog({
          achievement,
          leadership,
          impact,
        });
        setResult(parsed);
        setAchievement("");
        setLeadership("");
        setImpact("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save log");
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-1.5">
          <Label htmlFor="fl-achievement">What did you ship this week?</Label>
          <Textarea
            id="fl-achievement"
            value={achievement}
            onChange={(e) => setAchievement(e.target.value)}
            placeholder="e.g. Cache layer for payment system"
            rows={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fl-leadership">Did you lead/mentor anyone?</Label>
          <Textarea
            id="fl-leadership"
            value={leadership}
            onChange={(e) => setLeadership(e.target.value)}
            placeholder="e.g. Reviewed code with Arjun"
            rows={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fl-impact">Any impact metrics?</Label>
          <Textarea
            id="fl-impact"
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
            placeholder="e.g. 40% latency reduction"
            rows={2}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Analyzing…" : "Save & Analyze"}
        </Button>

        {result && (
          <div className="mt-2 rounded-md border p-3">
            {result.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing specific enough to extract this week — that&apos;s
                fine, try again next Friday.
              </p>
            ) : (
              <>
                <p className="text-sm font-medium">Extracted:</p>
                <ul className="mt-1 list-disc pl-4 text-sm text-muted-foreground">
                  {result.map((a, i) => (
                    <li key={i}>
                      {a.title} ({a.category})
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
