"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateNudgeStatus } from "@/app/dashboard/actions";

export function NetworkNudgeRow({
  nudgeId,
  contactName,
  contactUrl,
  suggestedMessage,
  status,
}: {
  nudgeId: string;
  contactName: string;
  contactUrl: string | null;
  suggestedMessage: string;
  status: string;
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isPending, startTransition] = useTransition();

  function act(next: "sent" | "skipped") {
    setCurrentStatus(next);
    startTransition(async () => {
      try {
        await updateNudgeStatus(nudgeId, next);
      } catch {
        setCurrentStatus(status);
      }
    });
  }

  return (
    <li className="rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        {contactUrl ? (
          <a
            href={contactUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline"
          >
            {contactName}
          </a>
        ) : (
          <span className="font-medium">{contactName}</span>
        )}
        <span className="shrink-0 text-xs text-muted-foreground">
          {currentStatus}
        </span>
      </div>
      <p className="mt-1 text-muted-foreground">{suggestedMessage}</p>
      {currentStatus === "pending" && (
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" disabled={isPending} onClick={() => act("sent")}>
            Mark as sent
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => act("skipped")}
          >
            Skip
          </Button>
        </div>
      )}
    </li>
  );
}
