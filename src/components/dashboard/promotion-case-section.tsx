"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  createPromotionCase,
  updatePromotionCaseStatus,
} from "@/app/dashboard/actions";

type PromotionCaseRow = {
  id: string;
  company: string;
  target_role: string;
  readiness_score: number;
  strengths: string[];
  gaps: string[];
  timeline_recommendation: string;
  email_template: string;
  status: string;
};

export function PromotionCaseSection({
  initialCases,
}: {
  initialCases: PromotionCaseRow[];
}) {
  const [cases, setCases] = useState(initialCases);
  const [company, setCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [timeline, setTimeline] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createPromotionCase({
          company,
          targetRole,
          timeline,
          internalJobDescription: jobDescription,
        });
        setCases((prev) => [result as PromotionCaseRow, ...prev]);
        setCompany("");
        setTargetRole("");
        setTimeline("");
        setJobDescription("");
        setShowForm(false);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to build promotion case"
        );
      }
    });
  }

  function markSent(caseId: string) {
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, status: "sent" } : c))
    );
    startTransition(async () => {
      try {
        await updatePromotionCaseStatus(caseId, "sent");
      } catch {
        // best-effort; leave optimistic state
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          Promotion Cases {cases.length ? `(${cases.length})` : ""}
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? "Cancel" : "Build my promotion case"}
        </Button>
      </div>

      {showForm && (
        <Card className="mt-3">
          <CardContent className="space-y-3 pt-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="promo-company">Company</Label>
                <Input
                  id="promo-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Mercari"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promo-role">Target role</Label>
                <Input
                  id="promo-role"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Engineering Manager"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promo-timeline">Timeline</Label>
              <Input
                id="promo-timeline"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="6 months"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promo-jd">Internal job description</Label>
              <Textarea
                id="promo-jd"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the internal EM job description here"
                rows={6}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Building…" : "Generate"}
            </Button>
          </CardContent>
        </Card>
      )}

      {cases.length === 0 && !showForm ? (
        <p className="mt-2 text-sm text-muted-foreground">
          None yet. Click &quot;Build my promotion case&quot; to generate a
          readiness assessment and manager email.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {cases.map((c) => (
            <li key={c.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {c.target_role} at {c.company}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  Readiness: {c.readiness_score}/100 · {c.status}
                </span>
              </div>

              {c.strengths.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-green-700">
                    Strengths
                  </div>
                  <ul className="list-disc pl-4 text-xs text-muted-foreground">
                    {c.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {c.gaps.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-yellow-700">
                    Gaps
                  </div>
                  <ul className="list-disc pl-4 text-xs text-muted-foreground">
                    {c.gaps.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}

              {c.timeline_recommendation && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium">Timeline:</span>{" "}
                  {c.timeline_recommendation}
                </p>
              )}

              {c.email_template && (
                <div className="mt-2 whitespace-pre-wrap rounded bg-muted p-2 text-xs">
                  {c.email_template}
                </div>
              )}

              {c.status === "draft" && (
                <Button
                  size="sm"
                  className="mt-2"
                  disabled={isPending}
                  onClick={() => markSent(c.id)}
                >
                  Mark as sent
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
