# Launchpad

An autonomous career agent: scans the job market, tracks your achievements,
and sends a personalized weekly career brief. Full product spec in
[LAUNCHPAD-COMPLETE-README.md](./LAUNCHPAD-COMPLETE-README.md).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres + Auth + Storage)
- Groq (default LLM) + Anthropic Claude (resume parsing, quality upgrade)
- Resend (email), Adzuna (job listings)

## Phase 1 (this build): Auth + onboarding + resume upload

- `/login` — Google OAuth via Supabase
- `/onboarding` — 5-step wizard (basics, goals, skills, network, preferences)
  plus resume upload
- `/dashboard` — placeholder landing page after onboarding
- `supabase/schema.sql` — full DB schema (Phase 1 tables + future-phase
  tables created up front so later phases don't need migrations)

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a [Supabase](https://supabase.com) project, then in the SQL editor
   run [`supabase/schema.sql`](./supabase/schema.sql).

3. In Supabase Auth settings, enable the **Google** provider (needs a Google
   Cloud OAuth client ID/secret — see Supabase's Google guide).

4. Copy `.env.local.example` to `.env.local` and fill in your Supabase URL
   and anon key (Project Settings → API).

5. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Build plan

See Part 5 of [LAUNCHPAD-COMPLETE-README.md](./LAUNCHPAD-COMPLETE-README.md)
for the full 13-week phase breakdown.
