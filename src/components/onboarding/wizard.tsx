"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { completeOnboarding } from "@/app/onboarding/actions";

const STEPS = [
  "Who are you?",
  "Where do you want to go?",
  "What are you building?",
  "Your network",
  "Your resume",
  "Preferences",
];

export function OnboardingWizard({ defaultEmail }: { defaultEmail: string }) {
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isLast = step === STEPS.length - 1;

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await completeOnboarding(formData);
      } catch (e) {
        // redirect() throws internally, identified by a "NEXT_REDIRECT" digest
        // (not e.message) — rethrow so Next's router can still perform the
        // navigation instead of swallowing it as a real error.
        if (
          e &&
          typeof e === "object" &&
          "digest" in e &&
          typeof e.digest === "string" &&
          e.digest.startsWith("NEXT_REDIRECT")
        ) {
          throw e;
        }
        setError(
          e instanceof Error ? e.message : "Failed to save onboarding data"
        );
      }
    });
  }

  return (
    <div className="mx-auto max-w-xl py-10">
      <div className="mb-6">
        <Progress value={((step + 1) / STEPS.length) * 100} />
        <p className="mt-2 text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={handleSubmit} className="space-y-4">
            {/* Step 1: Who are you? */}
            <div className={step === 0 ? "space-y-4" : "hidden"}>
              <Field label="Name" name="name" required={step === 0} />
              <Field label="Current role" name="current_role" placeholder="Senior Software Engineer" />
              <Field label="Current company" name="current_company" placeholder="Mercari" />
              <Field label="Years of experience" name="years_experience" type="number" />
              <Field label="City" name="city" placeholder="Bangalore" />
            </div>

            {/* Step 2: Where do you want to go? */}
            <div className={step === 1 ? "space-y-4" : "hidden"}>
              <Field label="Target role" name="target_role" placeholder="Engineering Manager" />
              <div className="space-y-1.5">
                <Label htmlFor="target_companies">Target companies (comma-separated, up to 5)</Label>
                <Textarea id="target_companies" name="target_companies" placeholder="Zepto, Razorpay, Mercari, Stripe, Flipkart" />
              </div>
              <Field label="Timeline" name="timeline" placeholder="18 months" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Salary min (₹L, optional)" name="salary_min" type="number" />
                <Field label="Salary max (₹L, optional)" name="salary_max" type="number" />
              </div>
            </div>

            {/* Step 3: What are you building? */}
            <div className={step === 2 ? "space-y-4" : "hidden"}>
              <div className="space-y-1.5">
                <Label htmlFor="skills_learning">Skills currently learning</Label>
                <Textarea id="skills_learning" name="skills_learning" placeholder="System Design, Kubernetes" />
              </div>
              <Field label="Certifications pursuing (optional)" name="certifications" />
              <div className="space-y-1.5">
                <Label htmlFor="side_projects">Side projects (optional)</Label>
                <Textarea id="side_projects" name="side_projects" />
              </div>
            </div>

            {/* Step 4: Your network */}
            <div className={step === 3 ? "space-y-4" : "hidden"}>
              <p className="text-sm text-muted-foreground">
                Up to 5 people to stay in touch with (optional).
              </p>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <Input name={`network_name_${i}`} placeholder={`Contact ${i} name`} />
                  <Input name={`network_url_${i}`} placeholder="LinkedIn URL" />
                </div>
              ))}
            </div>

            {/* Step 5: Resume upload */}
            <div className={step === 4 ? "space-y-4" : "hidden"}>
              <div className="space-y-1.5">
                <Label htmlFor="resume">Upload your resume (PDF, optional)</Label>
                <Input id="resume" name="resume" type="file" accept=".pdf,.txt" />
                <p className="text-xs text-muted-foreground">
                  We&apos;ll extract your achievements from this later.
                </p>
              </div>
            </div>

            {/* Step 6: Preferences */}
            <div className={step === 5 ? "space-y-6" : "hidden"}>
              <Field label="Email" name="email" type="email" defaultValue={defaultEmail} required={step === 5} />

              <div className="space-y-2">
                <Label>Brief frequency</Label>
                <RadioGroup name="brief_frequency" defaultValue="weekly">
                  <RadioOption value="weekly" label="Weekly" />
                  <RadioOption value="daily" label="Daily" />
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Brief time</Label>
                <RadioGroup name="brief_time" defaultValue="morning">
                  <RadioOption value="morning" label="Morning" />
                  <RadioOption value="evening" label="Evening" />
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Tone preference</Label>
                <RadioGroup name="tone_preference" defaultValue="Encouraging">
                  <RadioOption value="Direct" label="Direct" />
                  <RadioOption value="Encouraging" label="Encouraging" />
                </RadioGroup>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={back} disabled={step === 0 || isPending}>
                Back
              </Button>
              {isLast ? (
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : "Finish"}
                </Button>
              ) : (
                <Button type="button" onClick={next}>
                  Next
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
      />
    </div>
  );
}

function RadioOption({ value, label }: { value: string; label: string }) {
  const id = `radio-${value}`;
  return (
    <div className="flex items-center space-x-2">
      <RadioGroupItem value={value} id={id} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );
}
