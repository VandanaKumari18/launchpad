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
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  {
    icon: TrendingUp,
    title: "Career score, explained",
    description:
      "One number that tracks velocity, market fit, network strength, skills, and timeline — with a tap-to-explain that tells you exactly what to do next.",
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    icon: FileText,
    title: "Resume bullets, written for the job",
    description:
      "Every time you apply, get 3-5 tailored bullets pulled from your real achievements — never invented.",
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  {
    icon: Sparkles,
    title: "Skill gaps, before they cost you",
    description:
      "Compares what target-role postings actually ask for against what you list, so you know what to learn next.",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    icon: Users,
    title: "Network nudges",
    description:
      "AI-drafted reconnect messages for the people in your corner, so relationships don't go cold while you're heads-down building.",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  {
    icon: Mail,
    title: "One weekly brief",
    description:
      "Everything above, delivered to your inbox once a week. No dashboard to babysit.",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
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
      "On a schedule — not a button click — it scans jobs, scores your fit, tracks your weekly wins, and watches for patterns in what you save and dismiss.",
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Rocket className="h-4.5 w-4.5" />
          </div>
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
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in oklch, var(--primary), transparent 82%), transparent), radial-gradient(ellipse 60% 40% at 85% 15%, color-mix(in oklch, var(--accent), transparent 88%), transparent)",
            }}
          />
          <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              Autonomous, not another dashboard
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
              Your career agent that works while you sleep.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Launchpad watches the job market, your achievements, and your
              behavior — then nudges you weekly with a personalized brief. No
              dashboards to check constantly.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/login" />}
              >
                Get started free
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Not a job board. Not a resume builder. Not a chatbot.
            </p>
          </div>
        </section>

        <section className="border-y bg-muted/40 py-16">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-center text-2xl font-semibold">
              How it works
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.step} className="text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30">
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
              <div
                key={f.title}
                className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${f.color}`}
                >
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-medium">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t bg-gradient-to-b from-muted/40 to-background py-16">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <Brain className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold">
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
