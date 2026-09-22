import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarded) {
    redirect("/onboarding");
  }

  const { data: achievements } = await supabase
    .from("achievements")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-xl py-10">
      <h1 className="text-2xl font-semibold">
        Welcome, {profile.name ?? user.email}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Goal: {profile.target_role ?? "not set"} · {profile.timeline ?? "no timeline set"}
      </p>

      <h2 className="mt-8 text-lg font-medium">
        Achievements {achievements?.length ? `(${achievements.length})` : ""}
      </h2>
      {!achievements?.length ? (
        <p className="mt-2 text-sm text-muted-foreground">
          None yet. Upload a resume during onboarding or fill a Friday log to
          start building this list.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {achievements.map((a) => (
            <li key={a.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{a.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {a.category} · {a.source}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{a.description}</p>
              {a.impact_metric && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Impact: {a.impact_metric}
                  {a.impact_number !== null ? ` (${a.impact_number})` : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        This is a placeholder. Job matching, career score, and the weekly
        brief land in later phases of the build.
      </p>
    </main>
  );
}
