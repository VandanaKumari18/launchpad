"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { runMyAgentCycle } from "@/app/dashboard/actions";
import type { AgentCycleResult } from "@/lib/agent-cycle";
import { Bot, Briefcase, Loader2, Mail, Sparkles, Users, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TOOL_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  scan_jobs: {
    label: "Scanned the job market",
    icon: Briefcase,
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  draft_network_nudges: {
    label: "Drafted network outreach",
    icon: Users,
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  analyze_skill_gaps: {
    label: "Analyzed skill gaps",
    icon: Sparkles,
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  send_weekly_brief: {
    label: "Sent the weekly brief",
    icon: Mail,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
};

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
      <CardContent className="flex flex-col gap-4 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">
                This runs automatically every Monday morning
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                An LLM reads your current state — last scan, overdue
                contacts, skill gaps, last brief — and decides for itself
                which of its tools are worth running this cycle. It isn&apos;t
                a fixed checklist. Run it now to watch it reason live.
              </p>
              {error && (
                <p className="mt-2 text-sm text-destructive">{error}</p>
              )}
            </div>
          </div>
          <Button onClick={handleRun} disabled={isPending} className="shrink-0">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Agent is deciding…
              </>
            ) : (
              "Run agent cycle now"
            )}
          </Button>
        </div>

        {result && !error && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              Agent decision log
            </div>

            {result.toolsCalled.length > 0 ? (
              <ul className="mt-2.5 space-y-2">
                {result.toolsCalled.map((t, i) => {
                  const meta = TOOL_META[t.name] ?? {
                    label: t.name,
                    icon: Bot,
                    color: "bg-muted text-muted-foreground",
                  };
                  const Icon = meta.icon;
                  return (
                    <li key={i} className="flex items-start gap-2.5">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${meta.color}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">{meta.label}.</span>{" "}
                        <span className="text-muted-foreground">
                          {t.result}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                The agent decided none of its tools were needed this cycle.
              </p>
            )}

            <p className="mt-3 text-sm italic text-muted-foreground">
              &quot;{result.agentSummary}&quot;
            </p>

            <p className="mt-3 text-sm">
              <span className="font-medium text-primary">Totals:</span>{" "}
              {result.jobsScanned} jobs scanned · {result.nudgesDrafted}{" "}
              nudges drafted · {result.skillGapsFound} skill gaps found ·
              score {result.score}/100
              {result.briefSent ? " · brief emailed" : ""}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
