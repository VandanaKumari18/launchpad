-- Launchpad database schema
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Phase 1 (this build) actively uses: users, resumes.
-- The remaining tables are created now so later phases don't need a migration
-- step, but are otherwise unused until their phase lands.

create extension if not exists "pgcrypto";

-- ============================================================
-- Phase 1: users + resumes
-- ============================================================

create table if not exists users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text,
  city text,
  current_job_title text,
  current_company text,
  years_experience int,
  target_role text,
  target_companies jsonb default '[]',
  timeline text,
  salary_min int,
  salary_max int,
  skills_list jsonb default '[]',
  certifications text,
  side_projects text,
  network_contacts jsonb default '[]',
  brief_frequency text default 'weekly' check (brief_frequency in ('daily', 'weekly')),
  brief_time text default 'morning' check (brief_time in ('morning', 'evening')),
  tone_preference text default 'Encouraging' check (tone_preference in ('Direct', 'Encouraging')),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users enable row level security;

create policy "Users can view own row" on users
  for select using (auth.uid() = id);
create policy "Users can insert own row" on users
  for insert with check (auth.uid() = id);
create policy "Users can update own row" on users
  for update using (auth.uid() = id);

create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  file_url text,
  parsed_text text,
  created_at timestamptz not null default now()
);

alter table resumes enable row level security;

create policy "Users can view own resumes" on resumes
  for select using (auth.uid() = user_id);
create policy "Users can insert own resumes" on resumes
  for insert with check (auth.uid() = user_id);

-- Storage bucket for resume files.
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true)
on conflict (id) do nothing;

create policy "Users can upload own resume files" on storage.objects
  for insert with check (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users can read own resume files" on storage.objects
  for select using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Later phases (created now, unused until then)
-- ============================================================

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  title text,
  description text,
  category text check (category in ('project', 'leadership', 'mentorship', 'impact', 'technical')),
  date_start date,
  date_end date,
  source text check (source in ('resume_parsed', 'friday_log', 'manual_input', 'inferred')),
  impact_metric text,
  impact_number numeric,
  team_size int,
  confidence int,
  friday_log_id uuid,
  verified_by_user boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists friday_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  week_of date not null,
  achievement text,
  leadership text,
  impact text,
  parsed_achievements jsonb,
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  title text,
  company text,
  location text,
  salary_min int,
  salary_max int,
  description text,
  url text,
  posted_date date,
  scraped_at timestamptz not null default now()
);

create table if not exists job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  match_percent int check (match_percent between 0 and 100),
  reasoning text,
  computed_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create table if not exists job_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  action text check (action in ('view', 'save', 'dismiss', 'apply')),
  reason text,
  timestamp timestamptz not null default now()
);

create table if not exists skill_gaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  skill_name text,
  user_level text,
  required_level text,
  prevalence int,
  computed_at timestamptz not null default now()
);

create table if not exists network_nudges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  contact_name text,
  contact_url text,
  last_contacted date,
  days_since int,
  suggested_message text,
  status text default 'pending' check (status in ('pending', 'sent', 'skipped')),
  created_at timestamptz not null default now(),
  unique (user_id, contact_name)
);

create table if not exists promotion_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  company text,
  target_role text,
  readiness_score int,
  strengths text[],
  gaps text[],
  timeline_recommendation text,
  email_template text,
  status text default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected')),
  evaluation_period_end date,
  detailed_document jsonb,
  created_at timestamptz not null default now()
);

create table if not exists resume_bullets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  job_id uuid references jobs (id) on delete set null,
  bullet_text text,
  category text check (category in ('leadership', 'technical', 'impact')),
  used boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists interview_prep (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  job_id uuid references jobs (id) on delete set null,
  question text,
  sample_answer text,
  user_answer text,
  prepared boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists outreach_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  targets jsonb,
  messages jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create table if not exists briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  week_of date,
  score int,
  email_html text,
  sent_at timestamptz,
  opened_at timestamptz
);

alter table achievements enable row level security;
alter table friday_logs enable row level security;
alter table job_matches enable row level security;
alter table job_interactions enable row level security;
alter table skill_gaps enable row level security;
alter table network_nudges enable row level security;
alter table promotion_cases enable row level security;
alter table resume_bullets enable row level security;
alter table interview_prep enable row level security;
alter table outreach_suggestions enable row level security;
alter table briefs enable row level security;

create policy "Users manage own achievements" on achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own friday logs" on friday_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users view own job matches" on job_matches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own job interactions" on job_interactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users view own skill gaps" on skill_gaps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own network nudges" on network_nudges for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own promotion cases" on promotion_cases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own resume bullets" on resume_bullets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own interview prep" on interview_prep for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own outreach suggestions" on outreach_suggestions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users view own briefs" on briefs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- jobs table is shared reference data, not user-owned: readable by any
-- authenticated user, writes only via the service role (server-side jobs).
alter table jobs enable row level security;
create policy "Authenticated users can read jobs" on jobs
  for select using (auth.role() = 'authenticated');
