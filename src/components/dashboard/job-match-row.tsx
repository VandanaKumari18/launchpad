"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  recordJobInteraction,
  generateBulletsForJob,
  generateInterviewPrepForJob,
} from "@/app/dashboard/actions";

type Bullet = { bullet_text: string; category: string };
type Question = { question: string; sample_answer: string };

type JobMatchRowProps = {
  jobId: string;
  title: string;
  company: string;
  location: string;
  url: string;
  matchPercent: number;
  reasoning: string;
  initialAction?: string | null;
  initialBullets?: Bullet[];
  initialQuestions?: Question[];
};

export function JobMatchRow({
  jobId,
  title,
  company,
  location,
  url,
  matchPercent,
  reasoning,
  initialAction,
  initialBullets,
  initialQuestions,
}: JobMatchRowProps) {
  const [action, setAction] = useState(initialAction ?? null);
  const [isPending, startTransition] = useTransition();
  const [bullets, setBullets] = useState<Bullet[]>(initialBullets ?? []);
  const [isGenerating, startGenerating] = useTransition();
  const [bulletError, setBulletError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>(
    initialQuestions ?? []
  );
  const [isPrepping, startPrepping] = useTransition();
  const [prepError, setPrepError] = useState<string | null>(null);

  function act(next: "save" | "dismiss" | "apply") {
    setAction(next);
    startTransition(async () => {
      try {
        await recordJobInteraction(jobId, next);
      } catch {
        setAction(initialAction ?? null);
      }
    });
  }

  function handleGenerateBullets() {
    setBulletError(null);
    startGenerating(async () => {
      try {
        const result = await generateBulletsForJob(jobId);
        setBullets(result);
      } catch (e) {
        setBulletError(
          e instanceof Error ? e.message : "Failed to generate bullets"
        );
      }
    });
  }

  function handleGenerateQuestions() {
    setPrepError(null);
    startPrepping(async () => {
      try {
        const result = await generateInterviewPrepForJob(jobId);
        setQuestions(result);
      } catch (e) {
        setPrepError(
          e instanceof Error ? e.message : "Failed to generate questions"
        );
      }
    });
  }

  return (
    <li className="rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="font-medium underline"
        >
          {title} — {company}
        </a>
        <span className="shrink-0 text-xs text-muted-foreground">
          Match: {matchPercent}%
        </span>
      </div>
      <p className="mt-1 text-muted-foreground">{location}</p>
      <p className="mt-1 text-xs text-muted-foreground">{reasoning}</p>
      <div className="mt-2 flex items-center gap-2">
        <Button
          size="sm"
          variant={action === "save" ? "default" : "outline"}
          disabled={isPending}
          onClick={() => act("save")}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant={action === "apply" ? "default" : "outline"}
          disabled={isPending}
          onClick={() => act("apply")}
        >
          Applied
        </Button>
        <Button
          size="sm"
          variant={action === "dismiss" ? "default" : "outline"}
          disabled={isPending}
          onClick={() => act("dismiss")}
        >
          Dismiss
        </Button>
      </div>

      {action === "apply" && (
        <div className="mt-3 border-t pt-3">
          {bullets.length === 0 ? (
            <Button
              size="sm"
              variant="outline"
              disabled={isGenerating}
              onClick={handleGenerateBullets}
            >
              {isGenerating ? "Writing…" : "Generate resume bullets"}
            </Button>
          ) : (
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {bullets.map((b, i) => (
                <li key={i}>
                  {b.bullet_text}{" "}
                  <span className="text-muted-foreground/60">
                    ({b.category})
                  </span>
                </li>
              ))}
            </ul>
          )}
          {bulletError && (
            <p className="mt-1 text-xs text-destructive">{bulletError}</p>
          )}

          <div className="mt-3 border-t pt-3">
            {questions.length === 0 ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isPrepping}
                onClick={handleGenerateQuestions}
              >
                {isPrepping ? "Preparing…" : "Interview prep"}
              </Button>
            ) : (
              <ul className="space-y-2">
                {questions.map((q, i) => (
                  <li key={i} className="text-xs">
                    <div className="font-medium text-foreground">
                      {q.question}
                    </div>
                    {q.sample_answer && (
                      <p className="mt-0.5 text-muted-foreground">
                        {q.sample_answer}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {prepError && (
              <p className="mt-1 text-xs text-destructive">{prepError}</p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
