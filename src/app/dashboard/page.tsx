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

  return (
    <main className="mx-auto max-w-xl py-10">
      <h1 className="text-2xl font-semibold">
        Welcome, {profile.name ?? user.email}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Goal: {profile.target_role ?? "not set"} · {profile.timeline ?? "no timeline set"}
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        This is a placeholder. Job matching, career score, and the weekly
        brief land in later phases of the build.
      </p>
    </main>
  );
}
