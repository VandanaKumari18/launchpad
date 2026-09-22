import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  Target,
  TrendingUp,
  Users,
  FileText,
  Sparkles,
  Mail,
  Brain,
} from "lucide-react";

const FEATURES = [
  {
    icon: Target,
    title: "Job matching that scores fit",
    description:
      "Scans the market for your target role and scores every posting against your real skills and experience — not keyword matching.",
  },
  {
    icon: TrendingUp,
    title: "Career score, explained",
    description:
      "One number that tracks velocity, market fit, network strength, skills, and timeline — with a tap-to-explain that tells you exactly what to do next.",
  },
  {
    icon: FileText,
    title: "Resume bullets, written for the job",
    description:
      "Every time you apply, get 3-5 tailored bullets pulled from your real achievements — never invented.",
  },
  {
    icon: Sparkles,
    title: "Skill gaps, before they cost you",
    description:
      "Compares what target-role postings actually ask for against what you list, so you know what to learn next.",
  },
  {
    icon: Users,
    title: "Network nudges",
    description:
      "AI-drafted reconnect messages for the people in your corner, so relationships don't go cold while you're heads-down building.",
  },
  {
    icon: Mail,
    title: "One weekly brief",
    description:
      "Everything above, delivered to your inbox once a week. No dashboard to babysit.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Tell us where you're going",
    description:
      "A 15-minute onboarding: your current role, your target role, your timeline, and (optionally) your resume.",
  },
  {
    step: "2",
    title: "The agent gets to work",
    description:
      "It scans jobs, scores your fit, tracks your weekly wins, and watches for patterns in what you save and dismiss.",
  },
  {
    step: "3",
    title: "Act on a weekly brief",
    description:
      "One email: what needs your attention, what's just FYI, and what the agent already handled.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("onboarded")
      .eq("id", user.id)
      .maybeSingle();

    redirect(profile?.onboarded ? "/dashboard" : "/onboarding");
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          <span className="text-lg font-semibold">Launchpad</span>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          Sign in
        </Button>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Your career agent that works while you sleep.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Launchpad watches the job market, your achievements, and your
            behavior — then nudges you weekly with a personalized brief. No
            dashboards to check constantly.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
              Get started free
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Not a job board. Not a resume builder. Not a chatbot.
          </p>
        </section>

        <section className="border-y bg-muted/30 py-16">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-center text-2xl font-semibold">
              How it works
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.step} className="text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold">
                    {s.step}
                  </div>
                  <h3 className="mt-4 font-medium">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {s.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center text-2xl font-semibold">
            What the agent actually does
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-lg border p-5">
                <f.icon className="h-6 w-6" />
                <h3 className="mt-3 font-medium">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <Brain className="mx-auto h-8 w-8" />
            <h2 className="mt-4 text-2xl font-semibold">
              Environment-aware. Agentic. Continuous.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Every signal is read by AI — scoring, analysis, generation,
              learning — and it notices patterns in your behavior without
              being asked. Friday logs capture your wins weekly, not just
              once per resume update.
            </p>
            <Button
              size="lg"
              className="mt-8"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Continue with Google
            </Button>
          </div>
        </section>
      </main>

      <footer className="px-6 py-8 text-center text-sm text-muted-foreground">
        Launchpad — built for engineers navigating their next move.
      </footer>
    </div>
  );
}
