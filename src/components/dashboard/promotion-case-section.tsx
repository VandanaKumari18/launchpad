"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createPromotionCase,
  updatePromotionCaseStatus,
} from "@/app/dashboard/actions";

type KeyAchievement = { title: string; description: string };

type PromotionCaseDocument = {
  executive_summary: string;
  role_and_scope: string;
  key_achievements: KeyAchievement[];
  leadership_and_mentorship: string;
  technical_depth: string;
};

type PromotionCaseRow = {
  id: string;
  company: string;
  target_role: string;
  readiness_score: number;
  strengths: string[];
  gaps: string[];
  timeline_recommendation: string;
  email_template: string;
  evaluation_period_end: string | null;
  detailed_document: PromotionCaseDocument | null;
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
  const [evaluationPeriodEnd, setEvaluationPeriodEnd] = useState("");
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
          evaluationPeriodEnd: evaluationPeriodEnd || undefined,
        });
        setCases((prev) => [result as PromotionCaseRow, ...prev]);
        setCompany("");
        setTargetRole("");
        setTimeline("");
        setEvaluationPeriodEnd("");
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
            <div className="grid grid-cols-2 gap-3">
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
                <Label htmlFor="promo-eval-end">
                  Evaluation period ends (optional)
                </Label>
                <Input
                  id="promo-eval-end"
                  type="date"
                  value={evaluationPeriodEnd}
                  onChange={(e) => setEvaluationPeriodEnd(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave the evaluation date blank to use every achievement and
              Friday log on file. Set it to pull only the evidence logged up
              to that date — useful when your review period has a fixed
              cutoff.
            </p>
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
              {isPending ? "Writing your case… this can take a minute" : "Generate"}
            </Button>
          </CardContent>
        </Card>
      )}

      {cases.length === 0 && !showForm ? (
        <p className="mt-2 text-sm text-muted-foreground">
          None yet. Click &quot;Build my promotion case&quot; to generate a
          full readiness document from your logged achievements and Friday
          logs, plus a manager email.
        </p>
      ) : (
        <div className="mt-3 space-y-6">
          {cases.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-6 text-sm leading-relaxed">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {c.target_role} at {c.company}
                    </h3>
                    {c.evaluation_period_end && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Evidence through {c.evaluation_period_end}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-sm">
                      Readiness: {c.readiness_score}/100
                    </Badge>
                    <Badge variant="outline">{c.status}</Badge>
                  </div>
                </div>

                {c.detailed_document?.executive_summary && (
                  <p className="mt-4 text-base font-medium text-foreground">
                    {c.detailed_document.executive_summary}
                  </p>
                )}

                {c.detailed_document?.role_and_scope && (
                  <Section title="Role & Scope">
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {c.detailed_document.role_and_scope}
                    </p>
                  </Section>
                )}

                {c.detailed_document?.key_achievements &&
                  c.detailed_document.key_achievements.length > 0 && (
                    <Section
                      title={`Key Achievements (${c.detailed_document.key_achievements.length})`}
                    >
                      <ol className="list-decimal space-y-3 pl-5">
                        {c.detailed_document.key_achievements.map((a, i) => (
                          <li key={i}>
                            {a.title && (
                              <span className="font-medium text-foreground">
                                {a.title}:{" "}
                              </span>
                            )}
                            <span className="text-muted-foreground">
                              {a.description}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </Section>
                  )}

                {c.detailed_document?.leadership_and_mentorship && (
                  <Section title="Leadership & Mentorship">
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {c.detailed_document.leadership_and_mentorship}
                    </p>
                  </Section>
                )}

                {c.detailed_document?.technical_depth && (
                  <Section title="Technical Depth">
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {c.detailed_document.technical_depth}
                    </p>
                  </Section>
                )}

                <div className="mt-6 grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
                  {c.strengths.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-green-700">
                        Strengths
                      </div>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-muted-foreground">
                        {c.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {c.gaps.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
                        Gaps
                      </div>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-muted-foreground">
                        {c.gaps.map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {c.timeline_recommendation && (
                  <p className="mt-4 text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Recommended timeline:
                    </span>{" "}
                    {c.timeline_recommendation}
                  </p>
                )}

                {c.email_template && (
                  <Section title="Email to your manager">
                    <div className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-muted-foreground">
                      {c.email_template}
                    </div>
                  </Section>
                )}

                {c.status === "draft" && (
                  <Button
                    size="sm"
                    className="mt-5"
                    disabled={isPending}
                    onClick={() => markSent(c.id)}
                  >
                    Mark as sent
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-primary">
        {title}
      </h4>
      <div className="mt-2">{children}</div>
    </div>
  );
}
