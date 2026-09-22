"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { recordJobInteraction } from "@/app/dashboard/actions";

type JobMatchRowProps = {
  jobId: string;
  title: string;
  company: string;
  location: string;
  url: string;
  matchPercent: number;
  reasoning: string;
  initialAction?: string | null;
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
}: JobMatchRowProps) {
  const [action, setAction] = useState(initialAction ?? null);
  const [isPending, startTransition] = useTransition();

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
    </li>
  );
}
