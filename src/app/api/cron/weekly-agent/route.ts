import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAgentCycleForUser } from "@/lib/agent-cycle";

export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: users, error } = await admin
    .from("users")
    .select("id")
    .eq("onboarded", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];
  for (const u of users ?? []) {
    const result = await runAgentCycleForUser(admin, u.id);
    results.push(result);
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    usersProcessed: results.length,
    results,
  });
}
