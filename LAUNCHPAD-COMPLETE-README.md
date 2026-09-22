# Launchpad — Complete Product & Build Specification

**For:** Ravi building for Vandana  
**Timeline:** 13 weeks (evenings + weekends, 9-5 day job)  
**Cost to launch:** ₹800 (domain, later) + ₹0/month infra (everything free-tier)  
**AI Stack:** Groq (default, free tier) + Claude API (resume parsing + optional quality upgrade)  
**Status:** Pre-development spec — everything defined before coding starts

---

## Part 1: Product Vision

### What is Launchpad?

A career agent that automates your career progression by watching real signals (job market, company news, your own achievements & behavior) and nudging you weekly with a personalized brief — no dashboards to check constantly. It's like having a career mentor that works while you sleep.

**Not:** a job board, a resume builder, a LinkedIn alternative, or a chatbot.

**Is:** an autonomous agent that:
- Scans job markets for *your* goals automatically
- Notices skill gaps before you do
- Generates AI resume bullets tailored to each job you apply to
- Builds internal promotion cases with readiness scores
- Generates personalized weekly career health digest
- Prepares interview guides for each role you apply to
- Learns from your choices (which jobs you save/dismiss) to get smarter
- Notices behavior patterns and flags blockers

**Why it's different:** 
- **Environment-aware** (reads real signals, not just forms)
- **AI-heavy** (AI touches every signal — scoring, analysis, generation, learning)
- **Agentic** (proactively notices patterns without being asked)
- **Continuous tracking** (Friday logs capture achievements weekly, not once-per-resume-update)

---

## Part 2: Core Features (Complete Feature Set, No Phases)

### A. Onboarding (One-time, 15 minutes)

**Step 1: Who are you?**
- Name, current role/company, years of experience, city

**Step 2: Where do you want to go?**
- Target role (e.g., "Engineering Manager")
- Target companies (pick 5)
- Timeline (e.g., "18 months")
- Salary expectation range (optional)

**Step 3: What are you building?**
- Skills currently learning
- Certifications pursuing (optional)
- Side projects (optional)

**Step 4: Your network (optional)**
- 5 people to stay in touch with (name + LinkedIn URL)

**Step 4b: Upload your resume (optional but recommended)**
- Resume upload (PDF or plaintext)
- Claude API parses → extracts achievements
- Stored in achievements table for promotion case + resume bullets

**Step 5: Preferences**
- Brief frequency: daily / weekly (default: weekly)
- Brief time: morning / evening
- Email address
- Tone preference: Direct / Encouraging

---

### B. The Dashboard (What They See When They Log In)

```
┌─────────────────────────────────────────────────────────┐
│  👋 Good morning/evening, Vandana                      │
│                                                         │
│  Career Score: 74/100  ↑3 from last week               │
│  Career Health: 71/100 (⬆️ Improving)                   │
│  Goal: Engineering Manager · 18 months left            │
│                                                         │
│  🔴 NEEDS YOUR ATTENTION (2)                            │
│  🟡 FYI (3)                                             │
│  ✅ AGENT WORKING (5)                                   │
│                                                         │
│  [View Full Weekly Brief] [Career Health] [View Friday Logs]
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  RECENT JOB MATCHES                                     │
│  ─────────────────────────────────────────────────────  │
│  1. Senior EM — Zepto, Bangalore                       │
│     Match: 89% | [View] [Save] [Dismiss]              │
│  2. EM — Razorpay, Bangalore                          │
│     Match: 87% | [View] [Save] [Dismiss]              │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  YOUR NETWORK                                           │
│  ─────────────────────────────────────────────────────  │
│  Rohan — 6 weeks | [Draft outreach]                   │
│  Priya — 2 weeks | [Mark contacted]                   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  QUICK ACTIONS                                          │
│  ─────────────────────────────────────────────────────  │
│  [Friday Log] [Build Promotion Case] [View Resume Bullets]
│  [Interview Prep] [Career Health] [View Blockers]      │
└─────────────────────────────────────────────────────────┘
```

---

### C. Friday Log (Weekly Achievement Tracker)

Every Friday, user spends 2-3 minutes filling:

```
┌──────────────────────────────────────────────────────────┐
│ FRIDAY LOG — This Week's Wins                            │
│                                                          │
│ What did you ship this week?                            │
│ [textarea — e.g., "Cache layer for payment system"]    │
│                                                          │
│ Did you lead/mentor anyone?                             │
│ [textarea — e.g., "Reviewed code with Arjun"]          │
│                                                          │
│ Any impact metrics?                                     │
│ [textarea — e.g., "40% latency reduction"]             │
│                                                          │
│ [Save & Analyze]                                        │
│                                                          │
│ ✅ Agent is parsing your achievements...               │
│                                                          │
│ Extracted:                                              │
│ • Achievement: Shipped cache layer                      │
│ • Leadership: Code review with Arjun                    │
│ • Impact: 40% latency improvement                       │
│                                                          │
│ [Confirm & Save] [Edit] [Skip this week]               │
└──────────────────────────────────────────────────────────┘
```

On save:
1. Groq parses free-text → extracts structured achievements
2. Stores in achievements table with source='friday_log'
3. Influences promotion case + career health + interview prep

---

### D. The Weekly Brief Email (The Core Product)

```
Subject: Your Career Brief — Week of Sep 21 🎯

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 YOUR GOAL: Engineering Manager · 18 months left
Career Score: 74/100 (↑3 from last week)
Career Health: 71/100 ⬆️ Improving
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 ACT ON THESE

1. Senior EM — Zepto, Bangalore
   Match: 89% | Posted: 2 days ago | ₹48-62L
   
   Why it fits:
   ✅ Distributed systems (you have intermediate)
   ✅ Java/Go stack (your current)
   ✅ Team size 8-12 (matches your experience)
   
   What could improve:
   → System Design in 8/10 EM roles (your top gap)
   
   [View Job] [Save] [Dismiss]

2. Rohan hasn't heard from you in 6 weeks
   
   AI-drafted message:
   "Hey Rohan! How's Stripe treating you? I'm eyeing an EM
   move in the next 18 months — would love your take on
   the market + any advice. Coffee this week?"
   
   [Send This] [Edit] [Skip]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟡 FYI

Market trend: EM roles in Bangalore up 23% this quarter
Zepto posted 2 new EM roles (growth signal)
System Design appeared in 8/10 EM roles (skill gap)

Blocker pattern detected:
You tend to dismiss remote roles (70% of dismissals).
You prefer onsite (80% of saves).
Agent adjusted scoring for you. This is helping but
limits your options. [Override this preference]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CAREER HEALTH BREAKDOWN

Career Velocity:    ⬆️ Good (3 EM matches, 2 achievements this week)
Skill Readiness:    🟡 78% (System Design is top gap)
Network Strength:   🟡 65% (3/5 contacts overdue)
Market Fit:         ✅ 89% (strong match quality)
Timeline Status:    ✅ On track (18 months realistic)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ AGENT ACTIVITY THIS WEEK

→ 47 jobs scanned
→ 3 new matches found
→ 4 skill gaps identified
→ 1 blocker pattern detected
→ 3 network nudges generated
→ 5 resume bullets generated (for applied roles)
→ Career health computed: 71/100

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

See you next Monday.
— Your Launchpad Agent
```

---

### E. Resume Bullet Generator

When user applies to a job:

```
Dashboard → View applied roles → Zepto EM
↓
[Generate resume bullets for this role]
↓
Agent (Groq) analyzes:
- Your achievements (from resume + Friday logs)
- Zepto EM job requirements
- Your target role
↓
Generates 3-5 tailored bullets:

"Led microservices migration for 3-person team,
achieving 40% p99 latency reduction and 5x
deployment frequency improvement"

"Architected distributed cache layer handling 10K+ req/sec,
improving system reliability from 99.5% to 99.95%"

"Mentored 2 junior engineers to mid-level, establishing
team's code review culture and knowledge-sharing practices"

[Edit] [Copy all] [Export PDF] [Save to my bullets library]
```

---

### F. Promotion Case Generator

```
Dashboard → Promotion tab → [Build my promotion case]
↓
Select: Company (Mercari), Timeline (6 months)
Paste: Mercari's internal EM job description
↓
Agent combines:
- Your achievements (from resume + Friday logs)
- Internal EM requirements
- Your current vs target role
↓
Generates:

READINESS: 75/100

Strengths:
✅ Technical depth (cache system, distributed systems)
✅ Mentorship track record (2 engineers in 3 months)
✅ Leadership signal (led design reviews)

Gaps:
🟡 Org communication (no cross-team initiatives)
🟡 Hiring/recruiting (no hiring in your record)

Timeline: 6-8 weeks
Reason: One more high-impact project + hiring would seal it

EMAIL TO MANAGER:

"I'd like to discuss an EM opportunity at Mercari.
Over 2 years, I've built strong technical depth and
leadership track record:
- Shipped high-impact systems (cache, microservices)
- Mentored 2 engineers (one promoted to senior)
- Led design reviews
- Building broad EM skills

I'm ready for the next step. Can we discuss?"

[Copy template] [Mark as sent] [Save as draft]
```

---

### G. Career Health Digest

```
Dashboard → Career Health tab
↓
Shows holistic score with breakdown:

Career Velocity:    78/100 ⬆️
Reason: 3 EM roles matched this week, shipped 2 projects

Skill Readiness:    62/100 🟡
Gap: System Design (required in 8/10 roles, you're intermediate)
Action: 3-4 weeks of focused prep brings this to 85%

Network Strength:   40/100 🔴
Status: 3/5 contacts overdue (>30 days)
Action: Send messages to Rohan, Priya, others (30 min)

Market Fit:         89/100 ✅
Signal: Average match quality 89%, multiple strong options

Timeline Status:    85/100 ✅
Reason: 18-month plan is realistic, market has options

OVERALL: 71/100 ⬆️ (improving, good trajectory)

Next week projection:
If you: send network messages + start System Design prep
Expected: 76/100 (+5)
```

---

### H. Interview Prep Guide

When user applies to Zepto EM role:

```
Dashboard → Applied Roles → Zepto EM
↓
[Interview Prep Guide]
↓
Agent (Groq) generates custom questions + sample answers:

Question 1: "Tell us about a time you led a team through
a difficult project"

Your answer (AI-generated from achievements):
"At Mercari, I led a critical microservices migration
for my 3-person team. The challenge: 2-week deadline,
complex project, team hadn't done migrations before.

I broke it into 5 phases (risk mitigation), paired junior
engineers with me (knowledge transfer), held daily standups
(alignment), rolled out in stages (reduced blast radius).

Result: Shipped on time, 40% latency reduction, 5x deployment
speed. Both engineers leveled up; one later promoted to senior."

[Edit this answer] [Practice with AI mock interviewer]

Question 2: "System design: Design a high-traffic cache"
[Your cache layer project is perfect here — review it]

Question 3: "How do you build team culture?"
[Code review culture at Mercari — your evidence]

Question 4: "Handle underperforming team member?"
[You don't have this in your record — prepare hypothetical]

[Download PDF cheat sheet] [Practice with mock interviewer]
[Schedule mock interview time]
```

---

### I. Blocker Pattern Detection

Agent learns from your behavior:

```
Pattern 1: Remote Role Aversion
- 70% of dismissals are remote roles
- 80% of saves are onsite roles
→ Agent deprioritizes remote roles by 15%
→ Brief shows: "I noticed you prefer onsite — adjusted scoring"
[Override this]

Pattern 2: Seed-stage Company Preference (emerging)
- 60% of saves are seed/series-A
- 40% of dismissals are Fortune 500s
→ Agent explains the pattern
→ Brief shows: "You seem to prefer startup environments"
[Keep learning] [Remove this pattern]

Pattern 3: No negative blockers detected
(You're not avoiding high-salary roles, target companies, etc)
```

---

## Part 3: Achievement Data Model

### Data Sources (Continuous Tracking)

**Resume (One-time, Historical)**
- Parsed at onboarding
- Past 2-3 years of work
- Baseline achievements
- Cost: 1 Claude call (~₹0.50)

**Friday Logs (Weekly, Ongoing)**
- User fills every Friday: "What shipped? Lead? Impact?"
- Groq parses → stores as achievements
- Captures momentum, continuous learning
- Cost: Groq call (free)

**Manual Adds (Anytime)**
- User adds forgotten achievements via dashboard
- "Led on-call rotation during production incident"
- Cost: Zero

**Job Applications (Real-time)**
- System tracks when user applies to roles
- Auto-creates "applied to Zepto EM" achievement
- Signals career momentum
- Cost: Zero

**LinkedIn/GitHub (Optional v2)**
- Not in MVP, added later if users request

### Achievement Table

```sql
achievements (
  id UUID PK,
  user_id FK,
  title TEXT,
  description TEXT,
  category ENUM ('project', 'leadership', 'mentorship', 'impact', 'technical'),
  date_start DATE,
  date_end DATE (nullable for ongoing),
  source ENUM ('resume_parsed', 'friday_log', 'manual_input', 'inferred'),
  impact_metric TEXT,
  impact_number NUMERIC,
  team_size INT,
  confidence INT (0-100),
  friday_log_id UUID FK (if from Friday log),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  verified_by_user BOOLEAN DEFAULT false
)
```

---

## Part 4: Tech Stack & Infrastructure

### Frontend
- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Email template:** React Email
- **Hosting:** Vercel (free tier)

### Backend
- **API routes:** Next.js API routes
- **Database:** Supabase (PostgreSQL) — free tier
- **Auth:** Supabase Auth (Google OAuth)
- **Scheduled jobs:** Vercel Cron (free tier)
- **Email:** Resend (free tier, 3,000 emails/month)

### AI/LLM Stack
- **Default:** Groq (`llama-3.1-8b-instant`) — free tier
  - Used for: job scoring, skill gap analysis, achievement parsing, brief generation, blocker detection
  - Cost: ₹0/month
  
- **Optional/Fallback:** Claude API (Haiku for fallback, Sonnet for resume parsing)
  - Resume parsing: 1-2 calls per user (onboarding only) = ~₹0.50
  - Fallback if Groq rate-limits: negligible cost
  - Quality upgrade for weekly brief (optional, paid tier only)
  - Cost: ~₹0 MVP phase, scales with users if enabled

### External APIs (All Free Tiers)
- **Adzuna:** Job listings (free tier: 100 req/day)
- **Supabase:** Auth + DB + storage

---

## Part 5: 13-Week Build Plan (Detailed)

| Week | Feature | Focus |
|---|---|---|
| **1-2** | Auth, onboarding (5 steps), resume upload | Foundation |
| **2-3** | Parse resumes, extract achievements | Data ingestion |
| **3-4** | Job matching + Groq scoring | Core loop |
| **4-5** | Career score + tap-to-explain | Scoring |
| **5-6** | Skill gaps + blocker detection | Pattern detection |
| **6-7** | Network nudges | Automation |
| **7-8** | Weekly brief email | Core deliverable |
| **8-9** | Resume bullet generator | ⭐ Resume bullets |
| **9-10** | Promotion case generator | ⭐ Promotion |
| **10-11** | Career health digest | ⭐ Health |
| **11-12** | Interview prep guide + Friday logs | ⭐ Interview + Logs |
| **12-13** | Polish, landing page, beta testing | Launch |

---

## Part 6: Cost Breakdown

**One-time:**
- Domain: ₹800 (buy after MVP, use Vercel subdomain initially)

**Monthly (MVP phase, 0-100 users):**
- Supabase free tier: ₹0
- Vercel free tier: ₹0
- Resend free tier (3,000 emails/month): ₹0
- Groq free tier: ₹0
- Adzuna free API: ₹0
- **Total: ₹0/month**

**One-time (resume parsing, per user):**
- Claude API Sonnet calls: ~₹0.50/user

**After scaling (100+ users, if needed):**
- Supabase Pro: ₹1,500/month
- Vercel Pro: ₹1,000/month
- Resend: ₹50-200/month
- Claude API (if enabled): ₹100-300/month
- **Total: ₹2,650-3,000/month** (covered by 32 users at ₹299/month)

---

## Part 7: Complete Database Schema

```sql
-- Users
users (
  id UUID PK (from Supabase Auth),
  name TEXT,
  email TEXT,
  city TEXT,
  target_role TEXT,
  target_companies JSON,
  timeline TEXT,
  salary_min INT,
  salary_max INT,
  skills_list JSON,
  network_contacts JSON,
  brief_frequency ENUM,
  brief_time ENUM,
  tone_preference ENUM ('Direct', 'Encouraging'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Resumes (if uploaded)
resumes (
  id UUID PK,
  user_id FK,
  file_url TEXT (Supabase storage),
  parsed_text TEXT,
  created_at TIMESTAMP
)

-- Achievements (continuous tracking)
achievements (
  id UUID PK,
  user_id FK,
  title TEXT,
  description TEXT,
  category ENUM,
  date_start DATE,
  date_end DATE,
  source ENUM,
  impact_metric TEXT,
  impact_number NUMERIC,
  team_size INT,
  confidence INT,
  friday_log_id UUID FK,
  created_at TIMESTAMP
)

-- Friday Logs (weekly input)
friday_logs (
  id UUID PK,
  user_id FK,
  week_of DATE,
  achievement TEXT,
  leadership TEXT,
  impact TEXT,
  parsed_achievements JSON (Groq output),
  created_at TIMESTAMP
)

-- Jobs (from Adzuna)
jobs (
  id UUID PK,
  external_id TEXT (Adzuna's ID),
  title TEXT,
  company TEXT,
  location TEXT,
  salary_min INT,
  salary_max INT,
  description TEXT,
  url TEXT,
  posted_date DATE,
  scraped_at TIMESTAMP
)

-- Job Matches (scored results)
job_matches (
  id UUID PK,
  user_id FK,
  job_id FK,
  match_percent INT (0-100),
  reasoning TEXT (Groq output),
  computed_at TIMESTAMP
)

-- User-Job Interactions
job_interactions (
  id UUID PK,
  user_id FK,
  job_id FK,
  action ENUM ('view', 'save', 'dismiss', 'apply'),
  reason TEXT (optional),
  timestamp TIMESTAMP
)

-- Skill Gaps (computed weekly)
skill_gaps (
  id UUID PK,
  user_id FK,
  skill_name TEXT,
  user_level TEXT,
  required_level TEXT,
  prevalence INT,
  computed_at TIMESTAMP
)

-- Network Nudges (generated weekly)
network_nudges (
  id UUID PK,
  user_id FK,
  contact_name TEXT,
  contact_url TEXT,
  last_contacted DATE,
  days_since INT,
  suggested_message TEXT (Groq output),
  status ENUM ('pending', 'sent', 'skipped'),
  created_at TIMESTAMP
)

-- Promotion Cases (generated on demand)
promotion_cases (
  id UUID PK,
  user_id FK,
  company TEXT,
  target_role TEXT,
  readiness_score INT,
  strengths TEXT[],
  gaps TEXT[],
  timeline_recommendation TEXT,
  email_template TEXT,
  status ENUM ('draft', 'sent', 'accepted', 'rejected'),
  created_at TIMESTAMP
)

-- Resume Bullets (generated per job application)
resume_bullets (
  id UUID PK,
  user_id FK,
  job_id FK,
  bullet_text TEXT,
  category ENUM ('leadership', 'technical', 'impact'),
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP
)

-- Interview Prep (per applied role)
interview_prep (
  id UUID PK,
  user_id FK,
  job_id FK,
  question TEXT,
  sample_answer TEXT (Groq generated),
  user_answer TEXT (optional),
  prepared BOOLEAN DEFAULT false,
  created_at TIMESTAMP
)

-- Weekly Briefs (archive)
briefs (
  id UUID PK,
  user_id FK,
  week_of DATE,
  score INT,
  email_html TEXT,
  sent_at TIMESTAMP,
  opened_at TIMESTAMP (optional)
)
```

---

## Part 8: What NOT to Build

❌ Mobile app (responsive web is enough v1)
❌ Bank/payment integration
❌ Complex admin dashboard
❌ Team/multi-user features
❌ GitHub commit history scraping (OAuth complexity)
❌ Calendar awareness
❌ Voice input for Friday log
❌ Advanced analytics
❌ White-label / white-glove service

**Scope lock:** Every "nice to have" can wait until you have 100 paying users asking for it.

---

## Part 9: Launch Strategy

### Beta (Week 13)
Send to 5 real people (Vandana + 4 friends):
- Sign up with real profile
- Use for 2 weeks
- Provide feedback

### Public (Week 14)
- Post on r/developersIndia, Twitter, LinkedIn
- Target engineers in India facing career transition

**Success metrics:**
- 50+ signups
- 10+ DAU
- Positive feedback on core features

---

## Part 10: Post-Launch Roadmap

**v1.1 (Month 2):**
- Paid tier (₹299/month) with Claude API quality upgrade
- Stripe integration
- Data export (PDF resume, JSON achievements)

**v1.2 (Month 3):**
- GitHub OAuth (optional: show contribution trends)
- Saved jobs dashboard (better UX for pipeline)
- Interview scheduling integration

**v2 (Month 6+):**
- Batch job applications
- Salary negotiation guide
- Referral network (connect users for warm intros)
- Mobile app (React Native or Flutter)

**v3:**
- Second Brain OS (original big idea, built on learnings)

---

## SETUP: Step 1 (Start Here)

### Step 1: Create GitHub Repository

You need a repo to store all code and for Claude Code to commit to.

**What to do:**
1. Go to github.com (login or create account if needed)
2. Click **"New repository"** (top right, usually)
3. Fill in:
   - **Repository name:** `launchpad` (or `career-agent`)
   - **Description:** "AI career agent using Claude Code"
   - **Private** (you can open-source later)
   - **Do NOT initialize** with README, .gitignore, or license
4. Click **"Create repository"**
5. Copy the HTTPS URL (looks like `https://github.com/yourusername/launchpad.git`)

**After you create it, share with me:**
- The repo URL, or
- Confirm you've created it

Once confirmed, we move to **Step 2: Clone locally & scaffold Next.js project.**

---

### Why This First?

- Claude Code needs a git repo to work with (it commits code changes)
- Vercel will deploy from this repo automatically
- Everything — database schemas, API routes, UI components — gets committed here
- This is your single source of truth for the product

**Do this today, takes 2 minutes.**

Ready? Go create the repo, then come back with the URL or confirmation.

---

## Next Steps After Step 1

Once repo is created, we'll:

1. **Step 2:** Clone locally, scaffold Next.js + Tailwind + shadcn/ui in VS Code
2. **Step 3:** Create Supabase project, get credentials
3. **Step 4:** Create Groq account, get API key
4. **Step 5:** Vercel setup, connect to GitHub repo, deploy
5. **Step 6:** Google OAuth setup for login
6. **Step 7:** First Claude Code prompt to build onboarding form

Each step takes 15-30 minutes. We do them one per session to keep things clear.

---

**Status:** Ready for Step 1. Go create the GitHub repo, then reply here.
