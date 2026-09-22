"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { runMyAgentCycle } from "@/app/dashboard/actions";
import type { AgentCycleResult } from "@/lib/agent-cycle";
import { Bot, Loader2 } from "lucide-react";

export function AgentCycleCard() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AgentCycleResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRun() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await runMyAgentCycle();
        setResult(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Agent cycle failed");
      }
    });
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">
              This runs automatically every Monday morning
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Scans jobs, drafts overdue outreach, refreshes skill gaps,
              recomputes your score, and emails your weekly brief — no
              clicks required. Run it now to see this week&apos;s cycle.
            </p>
            {result && !error && (
              <p className="mt-2 text-sm">
                <span className="font-medium text-primary">Done:</span>{" "}
                {result.jobsScanned} jobs scanned · {result.nudgesDrafted}{" "}
                nudges drafted · {result.skillGapsFound} skill gaps found ·
                score {result.score}/100
                {result.briefSent ? " · brief emailed" : ""}
              </p>
            )}
            {error && (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>
        <Button onClick={handleRun} disabled={isPending} className="shrink-0">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running cycle…
            </>
          ) : (
            "Run agent cycle now"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
