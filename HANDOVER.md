# KIND Platform — Full Status & Action Plan
**Last updated: 18 May 2026**

---

## PLATFORM OVERVIEW

| Component | URL | Hosting | Deploy Branch |
|-----------|-----|---------|--------------|
| Portal (client dashboard) | app.get-kind.com | Vercel | `main` |
| Website (marketing) | get-kind.com | Vercel | `main` |
| Admin (internal ops) | admin.get-kind.com | Vercel | `main` |
| API (backend) | kindapi-production-e64c.up.railway.app | Railway | `main` |
| Database | — | Supabase | — |

---

## WHAT YOU NEED TO DO (Requires Your Access)

### TODAY — Vercel has a deployment queued waiting for limit reset:
| # | Action | Where |
|---|--------|--------|
| 1 | **Verify Vercel deployed** — check all 3 projects show latest commit `361ad32` | vercel.com dashboard |
| 2 | **Run demo SQL migration** if not already done | Supabase → SQL Editor → paste below |
| 3 | **Smoke test full signup flow** | get-kind.com → sign up → dashboard → ICP |
| 4 | **Test Demo Environments** | admin.get-kind.com → Demo Envs → create one |

#### Demo columns SQL (run in Supabase SQL Editor if not done):
```sql
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_demo            BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS demo_prospect_name TEXT,
  ADD COLUMN IF NOT EXISTS demo_created_by    TEXT,
  ADD COLUMN IF NOT EXISTS demo_expires_at    TIMESTAMPTZ;
```

#### RLS SQL (already run — for reference):
```sql
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icps    ENABLE ROW LEVEL SECURITY;
```

---

## FULL SMOKE TEST CHECKLIST

Run this top to bottom after Vercel deploys:

**Signup & Onboarding**
- [ ] go to get-kind.com → click Sign Up → redirects to app.get-kind.com/login
- [ ] Fill in email + password → click Sign Up → no email confirmation → lands on /onboard
- [ ] Fill company name, industry, country, website → click "Start free trial"
- [ ] Dashboard loads — shows greeting with company name, stat cards, credit balance

**Lead Generation (ICP)**
- [ ] Dashboard → Lead Gen → ICP Settings
- [ ] Click "New ICP" → select seniority + geography → name hint "✨ Use: C-Suite · South Africa" appears
- [ ] Click the hint → name fills in automatically
- [ ] Click "Save & Find Leads" → saves, leads start loading
- [ ] Leads appear in the leads table with scores

**Locked Product Screens**
- [ ] Dashboard → FIGSY — locked screen shows "Book a demo" button → links to cal.com/get-kind/demo
- [ ] Dashboard → Virtual Assistant — locked screen shows "Book a demo" button
- [ ] Dashboard → Chatbot Agent — locked screen shows "Book a demo" button

**General**
- [ ] Sidebar bottom shows green dot "All systems operational"
- [ ] Sign out → redirects to /login
- [ ] Sign back in → dashboard loads correctly (no empty loop)

**Admin Portal**
- [ ] Go to admin.get-kind.com → see Dashboard with KPIs, MRR, TTFL
- [ ] Clients page → shows all clients
- [ ] Demo Envs → create a demo (fills prospect name, company, industry, country, expiry, your name)
- [ ] Demo creates successfully → leads count shows "running…" then fills in
- [ ] Click "Open Demo" → portal opens in new tab, logged in as that demo client
- [ ] Verify portal shows demo company name, all 4 products active, leads visible

---

## EVERYTHING THAT WAS BUILT (Full Audit)

### Infrastructure & Plumbing
- ✅ Railway API running at `kindapi-production-e64c.up.railway.app`
- ✅ Supabase SSR middleware — JWT refresh on every portal request
- ✅ CORS configured — get-kind.com and app.get-kind.com can call Railway
- ✅ All three Vercel projects deploy from `main` branch
- ✅ RLS enabled on `clients` and `icps` tables
- ✅ Admin proxy route in admin portal — forwards to Railway with admin key (GET, POST, PATCH, DELETE)

### Authentication & Signup
- ✅ Portal login page handles both signup and login modes
- ✅ Signup calls Railway `/auth/signup` → auto-confirms email → returns magic link → user lands in dashboard
- ✅ Login uses Supabase `signInWithPassword` → checks for company profile → redirects to /onboard if missing
- ✅ Website get-kind.com signup button redirects to portal login (no broken form)
- ✅ No email confirmation required — frictionless signup

### Onboarding (`/onboard`)
- ✅ Company name, industry, country, website, phone
- ✅ "Pre-fill ICP from website" button — scrapes site, saves suggestions to localStorage
- ✅ ICP suggestions applied automatically when user creates first ICP
- ✅ "Start free trial" creates client row + trialing subscription
- ✅ "Pay now — skip trial" goes straight to billing
- ✅ Referred users tracked via `?ref=` param — both get 100 credits on first ICP run

### Dashboard (`/dashboard`)
- ✅ Reads from Supabase directly (authenticated client, RLS-safe — no admin key needed)
- ✅ Shows greeting, company name, stat cards (leads, score, consented, pipeline value, credits)
- ✅ Onboarding checklist (company name → ICP → leads → FIGSY campaign)
- ✅ Trial/payment banner based on subscription status
- ✅ Product cards for all 4 products with lock states
- ✅ Referral banner with unique referral link
- ✅ No empty dashboard loop — fixed

### AI Lead Generation
- ✅ Apollo.io integration — searches people by ICP criteria
- ✅ ICP builder — industries, job titles, seniority, company size, geographies, tech stack, keywords
- ✅ ICP auto-name suggestion — fills "✨ C-Suite · South Africa · Fintech" from selected criteria
- ✅ ICP validation — clicking Save with empty name shows error + scrolls to name field
- ✅ ICP prefill from website URL
- ✅ Opt-out/blocklist check before inserting leads
- ✅ Lead scoring (AI scores 0–100)
- ✅ Leads table — search, filter by status/score/ICP/Apollo consented
- ✅ Lead actions — send consent email, mark status, AI email draft, block lead
- ✅ Bulk actions — export CSV, send bulk consent, mark as
- ✅ CSV export (full and bulk-selected)
- ✅ POPIA compliance notice on leads page

### FIGSY — AI SDR
- ✅ Campaign management — create, activate, pause, clone, delete
- ✅ Day 1 outreach auto-fires when ICP leads are inserted (if no active campaign, sends batch)
- ✅ FIGSY auto-enroll — new leads auto-enrolled into active campaign
- ✅ Replies inbox with AI draft follow-up
- ✅ Locked screen for non-subscribers → "Upgrade" + "Book a demo" CTA

### Virtual Assistant (Milla)
- ✅ Document management — upload training docs (txt, pdf, url)
- ✅ Chat interface — RAG-based answers with source citations
- ✅ Locked screen → "Upgrade" + "Book a demo" CTA

### Chatbot Agent (Vida)
- ✅ Configure bot — name, greeting, system prompt, colours, email/phone collection
- ✅ Conversations view — sessions, hot leads, transcripts
- ✅ Embed tab — one-line JS widget code for website
- ✅ Locked screen → "Upgrade" + "Book a demo" CTA

### Billing
- ✅ Paystack integration for ZAR topups
- ✅ Stripe integration for USD subscriptions
- ✅ Credit balance shown in sidebar and dashboard
- ✅ Low credits notice in layout
- ✅ Trial expired overlay

### Admin Portal (admin.get-kind.com)
- ✅ Dashboard — total clients, MRR (USD + ZAR), active subs, past due, avg TTFL
- ✅ KPI progress bars — MRR and client targets for May–Dec 2026
- ✅ Monthly targets roadmap table with RAG status
- ✅ Client pipeline health table — TTFL, leads total, leads this month, status per client
- ✅ Product catalog with pricing
- ✅ Clients page — all clients, subscription status, active products, T&Cs accepted
- ✅ **Demo Environments** (new) — full demo management for sales team
- ✅ CMO Tools, Roadmap, Terms Library, Launch checklist pages

### Demo Environments (new)
- ✅ Create demo: prospect name, company name, industry, country, website, expiry date, created by
- ✅ Creates real Supabase user + client + all 4 products active
- ✅ Auto-builds ICP from industry + country, runs against Apollo — real leads, real scores
- ✅ "Open Demo" generates magic link, opens portal as demo client in new tab
- ✅ Extend expiry date per demo
- ✅ Expire immediately
- ✅ Shows leads count (updates as ICP job runs), active/expiring/expired status
- ✅ Tracks which sales team member created each demo

### System Health
- ✅ Sidebar shows live API status — green "All systems operational" / amber "Service disruption"
- ✅ Polls Railway `/health` with 5s timeout

### Website (get-kind.com)
- ✅ Signup redirects to portal (no broken form)
- ✅ Comparison pages: vs-outreach, vs-salesloft, vs-hiring-an-sdr, vs-prospecting
- ✅ Trust & Security page
- ✅ Partners page
- ✅ Pricing page (USD, credit-bundle model)
- ✅ About page with agent characters (FIGSY, Milla, Vida)
- ✅ DPA (Data Processing Agreement) page
- ✅ GDPR + CAN-SPAM compliance sections

---

## WHAT I (CLAUDE) CAN DO — READY TO BUILD

| # | Task | Notes |
|---|------|-------|
| 1 | **Paystack end-to-end test** | Step through topup, verify credits update in dashboard |
| 2 | **FIGSY campaign end-to-end test** | Create campaign → leads enrolled → Day 1 email fires |
| 3 | **Referral flow verification** | Sign up with ref code → verify both accounts get 100 credits |
| 4 | **First-leads email test** | Trigger first ICP run → verify email fires with top 5 leads |
| 5 | **Add more sales team names** to Demo Envs dropdown | Currently: Jacques, Sales Engineer, Other |
| 6 | **KPIs page in portal** | `/dashboard/kpis` — client-facing pipeline metrics |
| 7 | **Usage page in portal** | `/dashboard/usage` — credit usage history |
| 8 | **Fix any new errors** | Share a screenshot and I'll fix immediately |

---

## KEY ENVIRONMENT VARIABLES

### Vercel — Portal (`app.get-kind.com`):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL=https://kindapi-production-e64c.up.railway.app
```

### Vercel — Admin (`admin.get-kind.com`):
```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_SECRET_KEY
```

### Railway — API:
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
APOLLO_API_KEY
ADMIN_SECRET_KEY
OPENAI_API_KEY
RESEND_API_KEY
PORTAL_URL=https://app.get-kind.com
PAYSTACK_SECRET_KEY
STRIPE_SECRET_KEY
```

---

## KEY FILES

```
apps/portal/src/app/(auth)/login/page.tsx                     signup + login
apps/portal/src/app/(auth)/onboard/page.tsx                   onboarding form + ICP prefill
apps/portal/src/app/(dashboard)/dashboard/page.tsx            main dashboard
apps/portal/src/app/(dashboard)/layout.tsx                    sidebar, trial overlay, credits
apps/portal/src/app/(dashboard)/dashboard/leads/page.tsx      leads table + bulk actions
apps/portal/src/app/(dashboard)/dashboard/leads/icp/page.tsx  ICP builder
apps/portal/src/app/(dashboard)/dashboard/figsy/page.tsx      FIGSY campaigns
apps/portal/src/app/(dashboard)/dashboard/assistant/page.tsx  Milla VA
apps/portal/src/app/(dashboard)/dashboard/chatbot/page.tsx    Vida chatbot
apps/portal/src/app/(dashboard)/dashboard/billing/page.tsx    billing + topup
apps/portal/src/middleware.ts                                  JWT refresh
apps/portal/src/lib/api.ts                                     API helper (error handling fixed)
apps/portal/src/components/layout/Sidebar.tsx                  sidebar + system health

apps/admin/src/app/page.tsx                                    admin dashboard + KPIs
apps/admin/src/app/clients/page.tsx                            all clients
apps/admin/src/app/demo/page.tsx                               demo environments (new)
apps/admin/src/components/AdminNav.tsx                         admin nav

apps/api/src/routes/auth.ts                                    signup, onboard
apps/api/src/routes/icps.ts                                    ICP CRUD + Apollo search
apps/api/src/routes/leads.ts                                   leads CRUD + scoring
apps/api/src/routes/figsy.ts                                   FIGSY campaigns
apps/api/src/routes/admin.ts                                   admin endpoints + demo env API

supabase/migrations/20260518_enable_rls.sql                    ✅ run
supabase/migrations/20260518_demo_environments.sql             ✅ run (if you ran it)
```
