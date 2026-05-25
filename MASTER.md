# K.I.N.D — MASTER DOCUMENT
**Single source of truth. Last updated: 25 May 2026 (evening)**
**Business: UK registration pending (Companies House) · Platform: Africa-first, world-ready**

> Everything in one place. Status, roadmap, GTM, company registration, expansion, compliance, SOPs, cashflow.
> Updated every morning after the 04:00 SAST automated audit. Also updated after major changes.

---

## TABLE OF CONTENTS

1. [Current Status — What's Live](#1-current-status--whats-live)
2. [What Founder Needs To Do](#2-what-founder-needs-to-do)
3. [What Claude Does Automatically](#3-what-claude-does-automatically)
4. [What Claude Has Built — Full History](#4-what-claude-has-built--full-history)
5. [Post-Launch Roadmap — Full Detail](#5-post-launch-roadmap--full-detail)
6. [What's Built — Feature Inventory](#6-whats-built--feature-inventory)
7. [Blocked Features — Needs Credentials Only](#7-blocked-features--needs-credentials-only)
8. [Will Not Build Yet](#8-will-not-build-yet)
9. [Go-To-Market Strategy](#9-go-to-market-strategy)
10. [Market Expansion — US, UK & Africa](#10-market-expansion--us-uk--africa)
11. [Compliance — Full Audit](#11-compliance--full-audit)
12. [Security Audit Results](#12-security-audit-results)
13. [Agent Naming](#13-agent-naming)
14. [Pricing Model](#14-pricing-model)
15. [Revenue Targets & KPIs](#15-revenue-targets--kpis)
16. [Cashflow Model](#16-cashflow-model)
17. [Client Flow — All Paths](#17-client-flow--all-paths)
18. [Operations SOP](#18-operations-sop)
19. [Tech Stack & Infrastructure](#19-tech-stack--infrastructure)
20. [Smoke Test Checklist](#20-smoke-test-checklist)
21. [Product Vision — 1, 3, 5 Years](#21-product-vision--1-3-5-years)
22. [Competitive Audit — Alta AI SDR](#22-competitive-audit--alta-ai-sdr)
23. [Key Decisions Locked](#23-key-decisions-locked)
24. [UK Company Registration](#24-uk-company-registration)
25. [Daily Audit — How It Works](#25-daily-audit--how-it-works)

---

## 1. CURRENT STATUS — WHAT'S LIVE

*Last updated: 25 May 2026 (evening)*

### Platform & Infrastructure

| Item | Status | Notes |
|---|---|---|
| Website — `get-kind.com` | ✅ Live | Full rewrite 20 May — new positioning, FIGSY Reasoning Loop, POPIA trust |
| Client Portal — `app.get-kind.com` | ✅ Live | Vercel — kind-portal project |
| Admin Dashboard — `admin.get-kind.com` | ✅ Live | Vercel — kind-admin-h5q6 project |
| Railway API | ✅ Running | kindapi-production-e64c.up.railway.app |
| Supabase — all tables + RLS | ✅ Live | All schema + migrations run |
| Supabase auth — no email confirmation | ✅ Live | Signup → instant dashboard |
| TypeScript build | ✅ Clean | All errors fixed |
| Cron jobs — 12 jobs | ✅ Running | node-cron in API — starts on boot |
| RLS on all tables | ✅ Fixed | Re-enabled 18 May |

### Features & Tools

| Item | Status | Notes |
|---|---|---|
| Demo Environments | ✅ Live | Admin → Demo Envs — full sales demo tool |
| AI ICP Suggest | ✅ Live | "Suggest ICP with AI" → Claude fills form from company profile |
| ICP Website Scan | ✅ Live | "Scan website" button in ICP form — calls /icps/prefill |
| FIGSY generateSequenceWithMemory | ✅ Live | Self-improving sequences using campaign history |
| FIGSY auto-replenish alert | ✅ Live | Daily cron 05:00 UTC |
| Milla morning brief | ✅ Live | Daily cron 07:30 UTC to all active clients |
| Milla anomaly detection | ✅ Live | Daily cron 08:30 UTC |
| K.I.N.D self-outreach (FIGSY dogfooding) | ✅ Live | Monday cron 06:00 UTC — needs FIGSY_KIND_CLIENT_ID env var |
| /stats/platform public endpoint | ✅ Live | Live platform stats |
| Campaign intent prompt | ✅ Built | Feature flagged — `FEATURE_CAMPAIGN_INTENT=true` to activate |
| Conversational ICP builder | ✅ Built | Feature flagged — `FEATURE_ICP_BUILDER=true` to activate |
| Web Speech API voice input | ✅ Built | On both above — mic button, Chrome/Safari/Edge |
| Partners page rewrite | ✅ Live | ClickUp/Smartsheet model — standard pricing, commission-based |
| Pricing page rewrite | ✅ Live | Start/Scale/Dominate + partner callout |
| Founder name removed from public pages | ✅ Done | "Founder" only — terms.html unchanged |
| Admin cohort analytics | ✅ Live | /admin/cohorts — signup month, activation, conversion, churn |
| Portal Analytics page | ✅ Live | /dashboard/analytics — 6-month trends, ICP breakdown, score dist |
| Stripe USD/GBP billing | ✅ Code complete | Billing page auto-activates when `STRIPE_SECRET_KEY` is set |
| Dark mode (full system) | ✅ Live | DarkModeToggle in all layouts, FOUC prevention |
| Portal V2 design | ✅ Built | Feature flagged — `FEATURE_PORTAL_V2=true` to activate |

### Schema & Database — All Migrations Run ✅

| Migration | Status | What it did |
|---|---|---|
| `20260525_fix_subscriptions_schema.sql` | ✅ Run | Dropped `amount_usd` (phantom column), set `amount_zar DEFAULT 0 NOT NULL` |
| `20260525_add_icps_apollo_consent.sql` | ✅ Run | Added `apollo_only_consented` to icps table |
| `20260525_fix_leads_status_and_figsy_memory.sql` | ✅ Run | `ALTER TYPE lead_status ADD VALUE 'contacted'`, added `last_winning_angle` to figsy_memory |
| `20260525_add_missing_clients_columns.sql` | ✅ Run | Added 11 clients columns: auto_topup, calendar, figsy_credits_remaining |
| `supabase/MASTER_SCHEMA.sql` | ⚠️ Run ASAP | Master idempotent SQL — covers ALL tables, ALL columns — run once to eliminate all remaining schema drift |

### Outstanding Actions

| Item | Status | Priority |
|---|---|---|
| Run `supabase/MASTER_SCHEMA.sql` | ⚠️ MUST RUN | 🔴 CRITICAL — single paste that fixes everything |
| `RESEND_API_KEY` in Railway env | ⚠️ CHECK | 🔴 CRITICAL — all emails are silent without this |
| Paystack KYC | ⏳ Pending | 🔴 CRITICAL — zero live payments without this |
| Google Workspace | ⏳ Pending | 🟡 HIGH — no professional inbox |
| Calendar booking link | ⏳ Pending | 🟡 HIGH — "Book a Demo" buttons all broken |
| `FIGSY_KIND_CLIENT_ID` in Railway | ⏳ Pending | 🟡 HIGH — self-outreach does nothing without this |
| `ANTHROPIC_API_KEY` in Railway | ⚠️ Confirm set | 🟡 HIGH — AI ICP + Milla + all AI silent without this |
| `ADMIN_SECRET_KEY` in Railway | ⚠️ Confirm set | 🟡 HIGH — admin endpoints unprotected without this |
| Resend upgrade to paid plan | ⏳ Pending | 🔵 MEDIUM — required for FIGSY inbound reply routing |
| UK company registration | ⏳ Pending | 🔵 MEDIUM — needed for credibility + GBP billing |
| Stripe credentials | ⏳ Pending | 🟢 WHEN READY — USD/GBP billing activates immediately |
| G2 / Capterra / Product Hunt | ⏳ Pending | ⚪ LAUNCH DAY |

---

## 2. WHAT FOUNDER NEEDS TO DO

### 🔴 CRITICAL — Do Right Now

| # | Task | Where | Why it's blocking |
|---|---|---|---|
| 1 | **Run `supabase/MASTER_SCHEMA.sql`** | Supabase → SQL Editor | Paste entire file, run once — eliminates all schema drift permanently. ICP saves, FIGSY, Milla all have silent column errors without this. |
| 2 | **Check `RESEND_API_KEY`** | Railway → KIND API → Variables | If missing, zero emails send — no welcome email, no nurture, no POPIA consent, no leads digest. Literally nothing. |
| 3 | **Complete Paystack KYC** | dashboard.paystack.com → Settings → Compliance | Can't take a single live payment until this is done. |
| 4 | **Check Railway deploy logs** | railway.app → KIND API → Deployments | "Nothing deployed" — check if build is failing silently. Should auto-deploy on every push to `main`. |

### 🟡 HIGH — Do This Week

| # | Task | Where | Why |
|---|---|---|---|
| 5 | **Set up Google Workspace** | workspace.google.com | Get hello@get-kind.com inbox live. All sales comms, DKIM/SPF for email deliverability. |
| 6 | **Confirm `ANTHROPIC_API_KEY` in Railway** | Railway → Variables | AI ICP builder, Milla, lead scoring — all use this. Silent failure if missing. |
| 7 | **Confirm `ADMIN_SECRET_KEY` in Railway** | Railway → Variables | All /internal/ endpoints hit this. Crons and admin actions fail silently without it. |
| 8 | **Set `FIGSY_KIND_CLIENT_ID` in Railway** | Railway → Variables | Self-outreach cron runs Monday 06:00 UTC but does nothing without this. Create a demo/production client row in Supabase, copy the UUID. |
| 9 | **Create calendar booking link** | calendly.com or cal.com (free) | Share the URL with Claude — "Book a Demo" wired site-wide in 5 minutes. |

### 🔵 MEDIUM — Do This Month

| # | Task | Where | Why |
|---|---|---|---|
| 10 | **Upgrade Resend to paid plan** | resend.com → Billing | FIGSY reply routing (inbound webhook) requires paid plan. Without this, you can send emails but never receive replies inside the platform. |
| 11 | **Register UK company** | companieshouse.gov.uk — £50, same day | Credibility, GBP billing, proper invoicing. See Section 24. |
| 12 | **Add Stripe credentials** | Railway → Variables | Activates USD/GBP billing page instantly. See env var list below. |

### 🟢 WHEN READY — Activates Built Features

| # | Task | Env vars to add to Railway |
|---|---|---|
| 13 | **Stripe USD/GBP** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_LEADGEN_20`, `STRIPE_PRICE_LEADGEN_100`, `STRIPE_PRICE_FIGSY_20`, `STRIPE_PRICE_FIGSY_100` |
| 14 | **Google Calendar OAuth** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| 15 | **Vapi.ai Voice** | `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ASSISTANT_ID`, `VAPI_WEBHOOK_SECRET` |
| 16 | **WhatsApp Business API** | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` |
| 17 | **Update FOUNDER_EMAIL** | Change to `hello@get-kind.com` after Google Workspace is live |
| 18 | **Campaign intent prompt (go live)** | `FEATURE_CAMPAIGN_INTENT=true` in Railway |
| 19 | **ICP builder (go live)** | `FEATURE_ICP_BUILDER=true` in Railway |
| 20 | **Portal V2 design** | `FEATURE_PORTAL_V2=true` in Railway |

### ⚡ INSTANT — Say the word, Claude does it in 5 minutes

| # | Task | What Claude needs |
|---|---|---|
| 21 | Wire "Book a Demo" buttons site-wide | Your Calendly/Cal.com URL |
| 22 | Add UK company number to footer + terms | Company number from Companies House cert |
| 23 | Fix any new error | Share screenshot |

### Once Live (not urgent)

| # | Task | When |
|---|---|---|
| 24 | G2, Capterra, Product Hunt listings | Launch day |
| 25 | Upload Vida image | apps/website/vida.png via GitHub |
| 26 | SOC 2 Type II | Q1 2027 |

### Google Workspace Setup (step by step)

1. workspace.google.com → Get started → Business Starter plan → enter domain `get-kind.com`
2. Add MX records Google gives you to your DNS (at your domain registrar)
3. Add TXT verification record → click Verify in Google
4. Create mailbox: **hello@get-kind.com**
5. Forward or alias **privacy@kind.ai** → hello@get-kind.com (referenced in Privacy Policy)
6. Google Admin → Gmail → Authenticate email → Enable DKIM → add TXT record to DNS
7. Add SPF: `v=spf1 include:_spf.google.com ~all` (merge with existing SPF)
8. Add DMARC: TXT on `_dmarc.get-kind.com` → `v=DMARC1; p=none; rua=mailto:hello@get-kind.com`
9. Update `FOUNDER_EMAIL` in Railway to `hello@get-kind.com`

> FIGSY sends from **Resend** (replies@get-kind.com) — keep separate to protect domain reputation.

---

## 3. WHAT CLAUDE DOES AUTOMATICALLY

### Daily Automated Audit (04:00 + 16:00 SAST)

Every morning at 04:00 SAST and every afternoon at 16:00 SAST, GitHub Actions runs `scripts/audit.ts` and opens a GitHub Issue with:

- ✅ or 🔴 status badge
- Full audit output (any CRITICAL/HIGH/MEDIUM/LOW findings)
- Pending action items checklist (always included, prioritised)
- Triggered reason (Scheduled / Push / Manual)

**Audit checks:**
| Rule | What it catches |
|---|---|
| SCHEMA-001 | `amount_usd` reference (banned column — use `amount_zar`) |
| ERR-001 | Empty catch blocks |
| ERR-002 | `.single()` instead of `.maybeSingle()` |
| ERR-003 | `.catch(console.error)` fire-and-forget |
| ERR-004 | Supabase call without `await` |
| ERR-005 | `String(err)` produces `[object Object]` |
| ERR-006 | `await import()` inside route handler |
| ERR-007 | `JSON.stringify(err)` on error objects |
| ERR-008 | Supabase insert/update without checking `error` |
| SEC-001 | Hardcoded secrets or API keys |
| SEC-002 | Direct `req.body` access without Zod parse |
| SEC-003 | `SUPABASE_SERVICE_ROLE_KEY` in portal/website code |
| MAINT-001 | Unresolved TODO/FIXME/HACK comments |
| MAINT-002 | `process.exit()` in server code |
| ROUTE-001 | Specific route defined AFTER wildcard `/:id` route |
| TYPE-001 | `as any` cast in route handlers |
| API-001 | `res.json()` without `success` field |
| SCHEMA-DRIFT | Banned column references in routes/lib |

Audit exit: 0 = clean or warnings only. 1 = CRITICAL/HIGH found → GitHub Actions job fails → visible in repo.

### 12 Cron Jobs (API — auto-starts on Railway boot)

| Schedule (UTC) | Job | Purpose |
|---|---|---|
| `0 5 * * *` | FIGSY auto-replenish | Alerts campaigns running low on credits |
| `0 6 * * *` | AE nurture | Trial nurture emails (Days 1/3/5/7/10) |
| `15 6 * * *` | AE at-risk | Flags clients with no ICP after 3 days |
| `0 7 * * *` | AE trial expiry | Expiry warning emails (Days 10/12/14) |
| `15 7 * * *` | AE zero credits | Zero credits warning |
| `30 7 * * *` | Milla morning brief | Daily digest to all active clients |
| `0 8 * * *` | FIGSY performance check | Auto-pauses campaigns <1% reply rate after 20+ emails |
| `30 8 * * *` | Milla anomaly detection | Flags unusual patterns |
| `0 */2 * * *` | FIGSY send due | Sends due emails for all clients |
| `0 7 * * 1` | Weekly leads digest | Monday leads summary to all clients |
| `0 6 * * 1` | CMO self-outreach | K.I.N.D finds its own clients using FIGSY |
| `0 16 * * 5` | CRO weekly digest | Friday founder summary — Claude writes it |

---

## 4. WHAT CLAUDE HAS BUILT — FULL HISTORY

| Task | Date | Status |
|---|---|---|
| Demo Environments — full sales demo tool in admin | 17 May | ✅ |
| AI ICP Suggest — "Suggest ICP with AI" → Claude fills form | 17 May | ✅ |
| Credit management — admin grant/refund credits + history | 18 May | ✅ |
| Company registration + VAT number fields in portal + admin | 18 May | ✅ |
| RLS fixed on credit_transactions | 18 May | ✅ |
| KPIs dashboard | 18 May | ✅ |
| Referral flow — ?ref= persistence, /clients/referrals, credit audit trail | 18 May | ✅ |
| FIGSY agent memory — figsy_memory table, refresh endpoint, cron | 19 May | ✅ |
| FIGSY weekly digest upgrade — FIGSY stats in Monday email | 19 May | ✅ |
| FIGSY escalation alerts — auto-pauses campaigns <1% reply rate | 19 May | ✅ |
| FIGSY identity card in portal | 19 May | ✅ |
| Full homepage rewrite — new positioning | 20 May | ✅ |
| Pricing page — Start/Scale/Dominate | 20 May | ✅ |
| About page — Founder Belief, Dogfooding, AI Revenue Team | 20 May | ✅ |
| Demo page — AI Revenue Team framing | 20 May | ✅ |
| Partners page — ClickUp/Smartsheet model, pricing policy fixed | 20–24 May | ✅ |
| generateSequenceWithMemory — FIGSY self-improvement | 20 May | ✅ |
| Milla morning brief + anomaly detection crons | 20 May | ✅ |
| FIGSY auto-replenish cron | 20 May | ✅ |
| K.I.N.D self-outreach (CMO cron) | 20 May | ✅ |
| /stats/platform public endpoint | 20 May | ✅ |
| 12 cron jobs total | 20 May | ✅ |
| Founder name removed from all public pages | 20 May | ✅ |
| Campaign intent prompt — feature flagged | 24 May | ✅ |
| Conversational ICP builder — feature flagged | 24 May | ✅ |
| Web Speech API voice input — on both above | 24 May | ✅ |
| ICP website scan — "Scan website" button in ICP form | 24 May | ✅ |
| Admin cohort analytics — /admin/cohorts | 24 May | ✅ |
| Portal analytics page — /dashboard/analytics | 24 May | ✅ |
| Stripe billing confirmed fully wired | 24 May | ✅ |
| **Removed duplicate `/builder/chat` handler** — dynamic import bug causing AI ICP failures | 25 May | ✅ |
| **`[object Object]` error fix** — AI fills ICP form, all type normalization fixed | 25 May | ✅ |
| **`toStringArray()` normalizer** — AI can return string or array, both handled | 25 May | ✅ |
| **ZodError serialization fix** — proper `.message` joining, no more `[object Object]` | 25 May | ✅ |
| **`safeIcpInsert` / `safeIcpUpdate`** — graceful fallback when DB column missing | 25 May | ✅ |
| **FIGSY `last_winning_angle` retry** — graceful fallback if column not in live DB | 25 May | ✅ |
| **FIGSY `contacted` status fallback** — falls back to `scored` if enum not updated yet | 25 May | ✅ |
| **`supabase/MASTER_SCHEMA.sql`** — single 700-line idempotent SQL, all tables, all columns | 25 May | ✅ |
| **4× migration SQL files** — individual migrations for each schema fix | 25 May | ✅ |
| **Audit upgraded — 04:00 + 16:00 SAST** — was single 04:00 run | 25 May | ✅ |
| **Audit always creates GitHub Issue** — was only on failure | 25 May | ✅ |
| **8 new audit rules** — ERR-005 through TYPE-001, route ordering, type safety | 25 May | ✅ |
| **Pending items checklist in every audit Issue** — founder to-do always in every report | 25 May | ✅ |

---

## 5. POST-LAUNCH ROADMAP — FULL DETAIL

### Immediate (Phase 1 — May 2026)

| Item | Owner | Status |
|---|---|---|
| Platform fully live | Claude | ✅ Done |
| All schema drift fixed | Claude | ✅ Done (run MASTER_SCHEMA.sql to complete) |
| Demo Environments | Claude | ✅ Done |
| AI ICP Suggest | Claude | ✅ Done |
| Credit management in admin | Claude | ✅ Done |
| Paystack KYC → live key | Founder | ⏳ Pending |
| Google Workspace | Founder | ⏳ Pending |
| RESEND_API_KEY confirmed in Railway | Founder | ⏳ Confirm |
| First 5 paying clients | Founder | ⏳ Pending |
| FIGSY campaigns live (own GTM) | Both | ⏳ Pending |

### Month 1–2 (June 2026)

| Item | Owner | Notes |
|---|---|---|
| Milla + Vida full launch | Both | Built and waiting |
| Voice agent activation | Founder | Vapi.ai account + Twilio SA number |
| WhatsApp activation | Founder | Meta Business API (3–7 day approval) |
| Google Calendar activation | Founder | Google Cloud OAuth |
| Stripe activation | Founder | USD/GBP billing |
| Pan-African presence: 3 countries | Both | Apollo data covers all |

### Month 3–6 (July–Oct 2026)

| Item | Notes |
|---|---|
| pgvector upgrade for Milla | At 50+ clients — upgrade from FTS |
| Recurring subscription model | Credit bundles → monthly plans |
| US/UK Phase 2 marketing | After 5 SA clients |
| Africa expansion: Nigeria, Kenya, Ghana, Egypt | Apollo data works well |

### Month 6–12 (Nov 2026 – May 2027)

| Item | Notes |
|---|---|
| Multi-channel FIGSY | Email + WhatsApp + Voice |
| ICP self-improvement | After 3+ months live data — feeds figsy_memory |
| Pipeline forecasting | AI predicts close probability |
| Meeting notetaker | Auto-join calls, transcribe, action items |
| SOC 2 Type II | Q1 2027 — external auditor |

---

## 6. WHAT'S BUILT — FEATURE INVENTORY

### Core Platform

| Item | Notes |
|---|---|
| Monorepo — portal, admin, API, DB, shared | Turborepo, TypeScript throughout |
| Supabase auth — signup, login, **no email confirmation** | Direct to /onboard on signup |
| Full DB schema — all tables + RLS | Complete, all tables protected |
| Supabase SSR middleware — JWT refresh | Every portal request |
| CORS allowlist | Only known origins |

### Lead Generation

| Item | Notes |
|---|---|
| ICP builder — all criteria | Industries, job titles, seniority, size, geography, tech stack, keywords |
| **AI ICP Suggest** | "Suggest ICP with AI" → Claude Haiku fills form from company profile |
| ICP auto-name hint | Suggests "C-Suite · South Africa · Fintech" from selected criteria |
| ICP prefill from website URL | Scrapes site → localStorage → pre-fills form |
| Apollo.io integration | Real leads from API |
| Lead scoring | Claude Haiku 0–100 + reasoning |
| Leads table | Search, filter by status/score/ICP, bulk actions, CSV export |
| Opt-out/blocklist | Checked before EVERY lead insert |
| POPIA consent email + callback | Fully built |
| First leads email (top 5 inline) | Auto-sent on first batch |
| Weekly Monday leads digest | Cron |

### FIGSY — AI SDR

| Item | Notes |
|---|---|
| Campaign CRUD | Create, activate, pause, clone, delete |
| Day 1 outreach | Auto-fires when ICP leads are inserted |
| 3-step email sequences | Humanised — no AI tells |
| Reply classification | 5 categories, AI draft follow-up |
| Unified reply inbox | Portal page |
| Opt-out auto-suppression | Shared blocklist with Lead Gen |
| CRM deal push on "interested" | HubSpot + Pipedrive |
| Locked screen | Upgrade + Book a Demo CTAs |
| **Agent identity card** | Named agent UI — live stats, last active, status |
| **Campaign memory** | `figsy_memory` table — avg reply rate, total sent, learns per client |
| **Escalation alerts** | Daily cron auto-pauses campaigns <1% reply rate after 20+ emails |
| **Weekly outreach digest** | Monday email includes FIGSY stats |
| **`paused_low_performance` status** | Campaign status when auto-paused |

### Virtual Assistant (Milla) — Launches July 2026

| Item | Notes |
|---|---|
| Document upload + RAG chat | FTS now, pgvector at 50+ clients |
| Source attribution | Answers cite which doc |
| Locked screen | Upgrade + Book a Demo CTAs |

### Chatbot Agent (Vida) — Launches July 2026

| Item | Notes |
|---|---|
| Config, conversations, embed code | Full |
| vida-widget.js | Self-contained embeddable JS |
| Locked screen | Upgrade + Book a Demo CTAs |

### Billing

| Item | Notes |
|---|---|
| Paystack (ZAR topups) | Test key now — **live after KYC** |
| Stripe (USD subscriptions) | Built, needs credentials |
| Credit balance in sidebar + dashboard | Live |
| Auto top-up settings | Live (needs `auto_topup_*` columns — covered in MASTER_SCHEMA.sql) |
| Trial expired overlay | Live |

### Settings

| Item | Notes |
|---|---|
| Company name, industry, country, website, phone | Live |
| Company registration no. + VAT number | Live — 18 May |
| CRM integration — HubSpot, Pipedrive | Live |
| Google Calendar connect | Built, needs credentials |

### Admin Portal

| Item | Notes |
|---|---|
| Dashboard — KPIs, MRR, TTFL, client pipeline | Live |
| Clients list | All clients, subs, T&Cs |
| Client detail — subscriptions, credit balance, grant/refund, transaction history | Live |
| Demo Environments — create/open/extend/expire | Live |
| Cohort analytics — /admin/cohorts | Live |
| Roadmap — Phase 1–4 milestone tracking | Live |
| Launch checklist — 13 sections, 60+ items | Live |
| CMO tools — LinkedIn post generator, prospect finder | Live |

### Internal Founder Agents

| Agent | Endpoint | What it does |
|---|---|---|
| AE: at-risk alerts | POST /internal/ae/at-risk | Flags clients with no ICP/leads after 3 days |
| AE: trial nurture | POST /internal/ae/nurture | Day 1/3/5/7/10 onboarding emails |
| AE: trial expiry | POST /internal/ae/trial-expiry | Day 10/12/14 expiry emails |
| CRO: weekly digest | POST /internal/cro/weekly-digest | Claude writes + emails founder weekly summary |
| CRO: churn risk | GET /internal/cro/churn-risk | Risk score 0–100 per client |
| CMO: LinkedIn posts | POST /internal/cmo/linkedin-posts | 3 branded posts |
| CMO: prospect finder | POST /internal/cmo/prospect | Apollo search with K.I.N.D's own ICP |

### Partner Programme

| Item | Notes |
|---|---|
| Apply, validate referral code, admin list/approve | Live |
| Client referral page /dashboard/referral | 100 credits both ways |
| partners.html | 20% recurring commission |

### Website (get-kind.com) — 16+ pages

All comparison pages, trust, DPA, DPA-US, pricing, support, about, use-cases, figsy-video. ✅

---

## 7. BLOCKED FEATURES — NEEDS CREDENTIALS ONLY

| Feature | What to do | Env vars needed |
|---|---|---|
| **Paystack live payments** | Complete KYC → get `sk_live_` key | `PAYSTACK_SECRET_KEY` (live) |
| **All emails (welcome, nurture, consent)** | Confirm `RESEND_API_KEY` in Railway | `RESEND_API_KEY` |
| **Stripe USD/GBP billing** | Create Stripe account + 4 price IDs | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, 4× `STRIPE_PRICE_*` |
| **Voice calls (Vapi.ai)** | Vapi account + Twilio +27 number | `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ASSISTANT_ID`, `VAPI_WEBHOOK_SECRET` |
| **WhatsApp** | Meta Business API approval | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` |
| **Google Calendar** | Google Cloud project + OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| **Resend inbound routing** | Upgrade Resend to paid | Then configure webhook to `/figsy/replies/inbound` |
| **Milla + Vida** | Nothing — waiting for July 2026 launch date | — |
| **FIGSY self-outreach** | Set UUID of your own client record | `FIGSY_KIND_CLIENT_ID` |

---

## 8. WILL NOT BUILD YET

| Item | Why | Revisit when |
|---|---|---|
| LinkedIn automation | ToS risk, wrong channel | Never |
| 50+ data sources | Apollo covers the market | 50+ clients |
| SOC 2 Type II | Expensive, overkill pre-enterprise | Q1 2027 |
| ICP self-improvement | Needs 3+ months live data | 6 months post-launch |
| Built-in CRM | HubSpot/Pipedrive covers it | Year 2 |
| African language support | Phase B | After WhatsApp live |
| pgvector for Milla | FTS works now | 50+ clients |
| Pipeline forecasting | Needs live data | Year 2 |
| Multi-year contracts | Anti-positioning | Never |

---

## 9. GO-TO-MARKET STRATEGY

### Core GTM Principle

K.I.N.D sells itself using K.I.N.D. FIGSY finds and contacts our own prospects. Every client we close is proof the product works. Every cold email FIGSY sends on our behalf is a live demo.

---

### Phase 1 — First 5 Clients (May–June 2026)

**Goal:** Prove product-market fit. Get 5 paying clients. Make them successful.

**Target ICP (our own):**
- Founder, CEO, MD, Sales Director, Head of Growth
- 5–50 employee B2B companies
- Industries: Professional services, Fintech, Logistics, Tech, Consulting, SaaS, Marketing agencies
- Geographies: South Africa (primary), Nigeria, Kenya
- Pain: Founder is the entire sales team. No time to prospect. Follow-ups fall through cracks.

**Channels — in priority order:**

| Channel | Approach | Owner |
|---|---|---|
| **FIGSY self-outreach** | K.I.N.D finds its own clients using FIGSY. Monday cron runs Apollo search, auto-enrols prospects | Automated (needs `FIGSY_KIND_CLIENT_ID` set) |
| **Founder's personal network** | Direct outreach to known contacts who fit ICP. Personal message — "I built something, want to see it?" | Founder |
| **LinkedIn organic** | CMO cron generates 3 branded posts weekly. Founder posts. No automation — ToS risk. | Founder posts |
| **Demo Environments** | Any warm lead gets a live demo in Admin → Demo Envs. Real leads, real platform. | Founder |
| **Referral programme** | Every signed client gets a referral link (100 credits both ways). Ask on day 3 of onboarding. | Automated |

**First 5 client playbook:**
1. Set `FIGSY_KIND_CLIENT_ID` in Railway → self-outreach kicks in Monday
2. Post 3x per week on LinkedIn — use CMO cron for drafts, personalise before posting
3. Reach out personally to 10 warm contacts this week
4. Every interested response → 30-min discovery call (script in Section 18)
5. Every discovery call → live demo using Demo Environments
6. Close → Paystack (after KYC) or manual invoice
7. Day 1–3: onboarding call, ICP together, first leads running
8. Day 3: ask for referral

**Conversion target:** 40% trial → paid. 5 clients from ~200 outreach touches.

---

### Phase 2 — First 20 Clients (June–July 2026)

**Trigger:** After 5 paying clients

**Add these channels:**
- Stripe activation → unlock USD/GBP clients (UK, US)
- G2 / Capterra / Product Hunt → listing drives inbound
- Content: comparison pages → SEO via vs-apollo, vs-outreach etc (already live)
- Partner programme → referral partners start sending leads
- WhatsApp → follow up warm leads on WhatsApp after email (after Meta approval)

**FIGSY outreach volume:**
- Phase 1: 50–100 emails/day
- Phase 2: 200–300/day (consider separate sending subdomain: outreach.get-kind.com)
- Phase 3: 500+/day (multiple inboxes + warmup tool)

---

### Phase 3 — First 60 Clients (Aug–Oct 2026)

**Trigger:** After 20 paying clients

- Voice (Vapi.ai) → FIGSY calls the most interested leads after 2 email touches
- Pan-African expansion → Nigeria, Kenya, Ghana outreach
- Agency partner programme → agencies managing K.I.N.D for their clients
- Recurring subscription model → transition from credit bundles to monthly plans

---

### Messaging — What Actually Works

**Cold email subject lines (from KIND_BRAND):**
- "FIGSY found your details. I thought it was only fair to tell you."
- "First leads in under 10 minutes — or your money back."
- "You are not buying software. You are hiring a team."
- "Break the human ceiling — your pipeline shouldn't be limited by your hours."

**What to avoid:**
- "Revolutionary" or "game-changing"
- "AI-powered" — show the outcome instead
- Excessive exclamation marks
- Corporate jargon

**What works:**
- Specific numbers (250M contacts, 8% reply rate, <2hr TTFL)
- Concrete outcomes ("books meetings for you")
- Short sentences. Active voice.
- Honest about what it does and doesn't do

---

### Launch Day Checklist (when you're ready to go public)

| # | Action |
|---|---|
| 1 | Paystack KYC complete → live key in Railway |
| 2 | `RESEND_API_KEY` confirmed in Railway |
| 3 | Google Workspace live → hello@get-kind.com receiving mail |
| 4 | Calendar booking link live → "Book a Demo" buttons working |
| 5 | `FIGSY_KIND_CLIENT_ID` set → self-outreach running |
| 6 | Resend paid → inbound routing live → FIGSY replies working |
| 7 | Run `supabase/MASTER_SCHEMA.sql` → all schema drift eliminated |
| 8 | Run smoke test (Section 20) end-to-end |
| 9 | Post on LinkedIn: founder story + product launch |
| 10 | Submit to G2, Capterra, Product Hunt |
| 11 | First FIGSY batch: 50 emails, monitor reply rate |
| 12 | First 3 discovery calls booked |

---

## 10. MARKET EXPANSION — US, UK & AFRICA

> **Trigger for US/UK Phase 2: after 5 paying clients**

### Already Built for US/UK

- USD pricing front and centre ✅
- Stripe USD/GBP billing code ✅ (needs credentials)
- GDPR, CAN-SPAM, CCPA compliance ✅
- DPA (dpa.html) + DPA-US addendum (dpa-us.html) ✅
- 5 comparison pages ✅
- "Africa-first. World-ready." framing ✅

### Phase 2 — Dual Market (after client 5)

- Activate Stripe USD/GBP
- Add GBP pricing examples to website
- Add US/UK support note
- Positioning: "Started in Cape Town. Serving businesses in SA, the US, and the UK."

### Pan-African (Year 1 — 2027)

- Nigeria, Kenya, Ghana, Egypt
- Apollo data covers all these markets
- POPIA + local data laws mapping needed per country

---

## 11. COMPLIANCE — FULL AUDIT

| Framework | Status | Where |
|---|---|---|
| **POPIA** (South Africa) | ✅ Complete | Consent flow, opt-out blocklist, data sovereignty, DPA |
| **GDPR** (EU/UK) | ✅ Complete | trust.html — Articles 6(1)(f), 17, 13/14. DPA covers SCCs |
| **CAN-SPAM** (US) | ✅ Complete | trust.html |
| **DPA** published | ✅ Complete | dpa.html — 10 sections |
| **CCPA** (California) | ✅ Complete | trust.html + dpa.html + dpa-us.html |
| **US state laws** (VCDPA, CPA, etc.) | ✅ Complete | dpa-us.html Section 1 catch-all |
| **SOC 2 Type II** | ❌ Deferred | Q1 2027 |

---

## 12. SECURITY AUDIT RESULTS

Full audit completed 18 May 2026. All tables and routes checked.

| Area | Status | Detail |
|---|---|---|
| RLS — all client data tables | ✅ Protected | clients, icps, leads, subscriptions, figsy tables, milla, vida |
| **credit_transactions** | ✅ Fixed 18 May | Was missing RLS — fixed. |
| API auth — all user routes | ✅ Protected | requireAuth middleware on every router |
| API auth — admin routes | ✅ Protected | requireAdminKey on all admin endpoints |
| JWT refresh | ✅ Working | Supabase SSR runs on every portal request |
| CORS | ✅ Strict | Allowlist: get-kind.com, app.get-kind.com, admin.get-kind.com |
| Subscription gating | ✅ Defense-in-depth | Frontend locked screens + backend 403 checks |
| Demo isolation | ✅ Secure | Demo clients are real rows under same RLS as paying clients |
| Opt-out blocklist | ✅ Enforced | Checked before every lead insert |
| Daily automated audit | ✅ New | Scans for 17 security/reliability rules every morning and afternoon |

---

## 13. AGENT NAMING

| Agent | Named after | Role | Status |
|---|---|---|---|
| **FIGSY** | The founder | AI SDR — outbound email, follow-up, meeting booking | ✅ Live |
| **Milla** | Founder's daughter | Virtual Assistant — trained on your business | July 2026 |
| **Vida** | Founder's daughter | Chatbot Agent — website + WhatsApp inbound qualifier | July 2026 |

---

## 14. PRICING MODEL

### Credit Bundles (current model)

| Product | Credits | Price USD | Price ZAR |
|---|---|---|---|
| K.I.N.D AI — Lead Gen Pro | 20 | $20 | R380 |
| K.I.N.D AI — Lead Gen Pro | 40 | $40 | R760 |
| K.I.N.D AI — Lead Gen Pro | 100 | $100 | R1,900 |
| FIGSY Advanced | 20 | $60 | R1,140 |
| FIGSY Advanced | 40 | $120 | R2,280 |
| FIGSY Advanced | 100 | $300 | R5,700 |

**Pricing is locked. Never changed. Never increased or decreased.**

**Phase 2 billing evolution:** Credit bundles → recurring monthly subscription model once value is proven.

---

## 15. REVENUE TARGETS & KPIs

### Month-by-Month MRR Targets

| Month | Target MRR (USD) | New Clients | Cumulative |
|---|---|---|---|
| May 2026 (launch) | $2,500 | 5 | 5 |
| Jun–Jul 2026 | $8,000 | 15 | 20 |
| Months 5–6 | $26,000 | 40 | 60 |
| Months 7–12 | $100,000 | 140+ | 200+ |

### Core KPIs (check every Monday)

| KPI | Target | Red Flag |
|---|---|---|
| TTFL (Time to First Lead) | < 2 hours | > 4 hours |
| Trial → Paid conversion | > 40% | < 25% |
| Month 1 churn | < 5% | > 10% |
| FIGSY reply rate | > 8% | < 3% |
| ICP built within 24h of signup | > 80% | < 60% |
| At-risk clients (no ICP after 3 days) | 0 | > 2 |

---

## 16. CASHFLOW MODEL

### Fixed Monthly Tech Costs

| Service | Plan | Cost/mo |
|---|---|---|
| Supabase | Pro (af-south-1 required) | $25 |
| Vercel | Pro | $20 |
| Railway | Usage-based | $10–20 |
| Apollo.io | Professional (24,000 credits/mo) | $99 |
| Google Workspace | Business Starter (hello@get-kind.com) | $12–18 |
| Resend | Free → Pro at scale | $0–20 |
| Domain | Annual | ~$1 |
| **Total floor (excl. Claude Code)** | | **$167–203/mo** |

**Variable costs per lead:** ~$0.009

**Break-even: 2 clients.**

---

## 17. CLIENT FLOW — ALL PATHS

1. **Self-service trial** — signup → no email confirmation → /onboard → dashboard → 14-day trial → pay
2. **AE-assisted** — same as above, AE helps with order form + payment
3. **Pay day 1** — signup → skip trial → pay immediately
4. **Trial expired** — overlay → pay to regain access
5. **Upgrade** — active client adds FIGSY bundle (manual admin action to cancel old sub)
6. **FIGSY add-on** — manual process, AE activates via admin
7. **Sales demo** — Admin → Demo Envs → create demo → open portal as prospect

---

## 18. OPERATIONS SOP

### Phase 1: Qualification
- B2B company, has a sales function, use case maps to a K.I.N.D product
- Disqualify: B2C only, under 6 months old with no revenue, requires custom dev

### Phase 2: Discovery Call (30–45 min)
1. How do you currently find and qualify new clients?
2. Where does your pipeline break down most?
3. Have you tried outbound before? What happened?
4. What markets and job titles are you targeting?
5. What's your budget for sales infrastructure this year?

### Phase 3: Demo
- Use Demo Environments in admin portal — real leads, real platform, no risk to live data
- Go to admin.get-kind.com → Demo Envs → create → Open Demo

### Phase 4: Proposal (within 24h)
Executive summary, recommended products, pricing, timeline, next steps.

### Phase 5: Payment
Client → Billing → selects plan → Paystack → webhook fires → subscription active.

### Phase 6: Onboarding (Days 1–5)
- Day 1: confirm record + subscription, send welcome email
- Day 2–3: 60-min onboarding call — portal walkthrough, build ICP together
- Day 3–5: first leads appear, confirm client can see pipeline

### Weekly Cadence

| Day | Action |
|---|---|
| Monday | Review all active client pipelines — flag 0 new leads |
| Wednesday | Check opt-out blocklist for new entries |
| Friday | Review usage metrics — flag low engagement; CRO digest arrives |

---

## 19. TECH STACK & INFRASTRUCTURE

| Layer | Technology | Notes |
|---|---|---|
| Portal (client-facing) | Next.js 14, TypeScript, Tailwind | apps/portal — Vercel (kind-portal) |
| Admin (internal) | Next.js 14, TypeScript, Tailwind | apps/admin — Vercel (kind-admin-h5q6) |
| API | Express, TypeScript | apps/api — Railway |
| Database | Supabase (PostgreSQL, af-south-1 Cape Town) | RLS on all tables |
| Auth | Supabase Auth | Email + password, no email confirmation |
| AI | Anthropic Claude (Haiku + Sonnet) | Haiku for volume, Sonnet for quality |
| Lead data | Apollo.io API | Pre-consented contacts first |
| Email sending | Resend | replies@get-kind.com (FIGSY), hello@get-kind.com (Workspace) |
| Payments | Paystack (ZAR — live after KYC) + Stripe (USD/GBP — Phase 2) | Credit bundles |
| Website | Static HTML | apps/website — Vercel (kind-admin) |

### Railway API URL
`https://kindapi-production-e64c.up.railway.app`

### Railway Env Vars — Current State

```
# ✅ Should be set
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY               ← confirm this is set — AI features silent without it
APOLLO_API_KEY
RESEND_API_KEY                  ← CRITICAL: confirm this is set — ALL emails silent without it
PAYSTACK_SECRET_KEY             ← test key now — update to live key after KYC
PAYSTACK_WEBHOOK_SECRET
ADMIN_SECRET_KEY                ← confirm this is set — admin endpoints unprotected without it
FOUNDER_EMAIL                   ← update to hello@get-kind.com after Workspace
FIGSY_REPLY_TO=replies@get-kind.com
FIGSY_DAILY_SEND_LIMIT=20
PORTAL_URL=https://app.get-kind.com
FIGSY_KIND_CLIENT_ID            ← MISSING: set to your client UUID for self-outreach

# ⏳ Add when ready
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_LEADGEN_20=
STRIPE_PRICE_LEADGEN_100=
STRIPE_PRICE_FIGSY_20=
STRIPE_PRICE_FIGSY_100=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://kindapi-production-e64c.up.railway.app/calendar/callback
VAPI_API_KEY=
VAPI_PHONE_NUMBER_ID=
VAPI_ASSISTANT_ID=
VAPI_WEBHOOK_SECRET=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=

# ⏳ Feature flags (add when ready to go live)
FEATURE_CAMPAIGN_INTENT=true
FEATURE_ICP_BUILDER=true
FEATURE_PORTAL_V2=true
```

---

## 20. SMOKE TEST CHECKLIST

| Step | Action | Pass condition |
|---|---|---|
| 1 | Sign up at get-kind.com | Redirects to app.get-kind.com/login |
| 2 | Fill email + password → Sign Up | **No confirmation email** — lands directly on /onboard |
| 3 | Fill company name, industry, country → Start free trial | Dashboard loads with company name |
| 4 | Build ICP — click "Suggest ICP with AI" | Claude fills form fields automatically (needs `ANTHROPIC_API_KEY`) |
| 5 | Adjust and click Save & Find Leads | Leads appear within minutes with scores — **no `[object Object]` error** |
| 6 | Send POPIA consent to one lead | Email arrives (needs `RESEND_API_KEY`), status → consent_sent |
| 7 | Export leads as CSV | File downloads with correct columns |
| 8 | Go to Billing → buy credits | Paystack opens, returns, balance updates (live after KYC) |
| 9 | Check FIGSY / VA / Chatbot screens | Locked screens show Upgrade + Book a Demo |
| 10 | Sidebar bottom | Green dot "All systems operational" |
| 11 | Admin → Demo Envs → create demo | Leads appear → Open Demo → portal opens as demo client |
| 12 | Admin → Clients → pick client → grant 50 credits | Balance updates, transaction recorded |
| 13 | Sign out → sign back in | Dashboard loads, no empty loop |
| 14 | Receive welcome email after step 2 | Arrives from Resend (needs `RESEND_API_KEY`) |

---

## 21. PRODUCT VISION — 1, 3, 5 YEARS

### Year 1 (by May 2027) — $40,000 MRR
- 150+ paying clients (SA, UK, US, Nigeria, Kenya)
- Lead Gen + FIGSY proven and reliable
- Milla (VA) + Vida (Chatbot) live for 30+ clients
- K.I.N.D's own outbound running entirely on FIGSY

### Year 2 (2027) — $120,000 MRR / 450 clients
- Built-in CRM, multi-channel FIGSY, pan-African launch
- Recurring subscription model primary

### Year 3 (2028) — $300,000 MRR / 1,000 clients
- Proprietary dataset, predictive ICP, SOC 2 Type II

### Year 5 (2030) — Market Leader
- 5,000+ clients, 10+ countries, IPO-ready

---

## 22. COMPETITIVE AUDIT — ALTA AI SDR

### Their gaps (our weapons)

- Zero Africa presence
- USD-only, quarterly billing, non-refundable, no trial
- No POPIA/NDPR compliance
- No WhatsApp-native strategy
- No ZAR billing

### What we've done from this audit

| # | Item | Status |
|---|---|---|
| 1–9 | Team narrative, agents, compliance, comparison pages, DPA, partners | ✅ Done |
| 10 | G2/Capterra/Product Hunt | Launch day |
| 11 | Voice agent (FIGSY calls) | Month 2 |
| 12 | WhatsApp channel | Month 2 |
| 13 | African language support | Phase B |
| 14 | SOC 2 Type II | Q1 2027 |
| 15 | ICP self-improvement | 6 months post-launch |

---

## 23. KEY DECISIONS LOCKED

| Decision | Outcome |
|---|---|
| Core metric | TTFL — target < 2 hours from signup |
| Billing model | Credit bundles now → recurring subscriptions Phase 2 |
| **Pricing** | **Locked. Never changed. Never increased or decreased.** |
| Agent naming | FIGSY (founder) · Milla (daughter) · Vida (daughter) |
| Founder name on public pages | "Founder" only — no real name — terms.html unchanged |
| Market expansion trigger | After 5 paying clients |
| Compliance | POPIA + GDPR + CAN-SPAM + CCPA |
| Milla + Vida launch | July 2026 |
| Payment processor | Paystack (ZAR) → Stripe (USD/GBP) at Phase 2 |
| AI provider | Anthropic Claude — Haiku for volume, Sonnet for quality |
| Data source | Apollo.io |
| Hosting | Supabase af-south-1 + Railway + Vercel |
| LinkedIn automation | Will not build — ToS risk |
| SOC 2 | Q1 2027 |
| Business registration | UK — Companies House |
| No email confirmation | Removed — signup is instant |
| CRM | HubSpot + Pipedrive push only. Built-in CRM Year 2. |
| Multi-year contracts | Will not offer |
| Error handling policy | Every error must return a readable string — never `[object Object]` |

---

## 24. UK COMPANY REGISTRATION

### Why Register in the UK
- Credibility with UK and international clients
- Enables Stripe GBP billing (Stripe UK)
- Required for proper invoicing in GBP
- Simpler structure than SA PTY for international contracts

### Business Structure
**Private Limited Company (Ltd)** — standard for UK tech startups

### Step-by-Step Registration (same day, £50)

**Option A — Register directly (slowest, cheapest)**
1. Go to: https://www.gov.uk/limited-company-formation/register-your-company
2. Choose: **Private limited company**
3. Company name: `KIND AI Ltd` or `K.I.N.D Ltd` (check availability first at https://find-and-update.company-information.service.gov.uk/)
4. Registered office address: must be a UK address — use a registered address service (e.g. 1st Formations, £39/yr)
5. Director: your full legal name, date of birth, nationality, usual residential address (not public)
6. Shareholder: yourself, 100 shares at £1 each
7. SIC code: **62012** — Business and domestic software development
8. Pay £50 online
9. Certificate of Incorporation arrives by email same day

**Option B — Use a formation agent (easiest, ~£50–80)**
- 1st Formations: https://www.1stformations.co.uk — £52.99 includes registered address
- Rapid Formations: https://www.rapidformations.co.uk — similar pricing
- Recommended if you don't have a UK address

**After Incorporation — tell Claude the company number and Claude will:**
- Update terms.html with the registered company number
- Update website footer across all pages
- Update about.html legal section

### Annual Requirements (UK Ltd)

| Requirement | Deadline | Cost |
|---|---|---|
| Confirmation Statement | Annually (anniversary of incorporation) | £34 online |
| Annual Accounts | 9 months after year-end | £0 (yourself) or ~£300 (accountant) |
| Corporation Tax return | 12 months after year-end | Pay only if profitable |
| VAT registration | When turnover hits £90k/yr | Free |

---

## 25. DAILY AUDIT — HOW IT WORKS

### Schedule
- **04:00 SAST** (02:00 UTC) — morning audit
- **16:00 SAST** (14:00 UTC) — afternoon audit
- **Every push to `main`** — also triggers
- **Manual** — GitHub Actions → KIND System Audit → Run workflow

### What Happens Each Run
1. Checks out codebase
2. Runs `npx tsx scripts/audit.ts`
3. Saves full output as artifact (`audit-{run_id}.txt`) — kept 90 days
4. Creates a GitHub Issue titled `✅ KIND Audit — 2026-05-25 04:00 SAST` or `🔴 KIND Audit — ...`
5. Issue body contains:
   - Full audit output (up to 7,000 characters)
   - **Pending Action Items checklist** (🔴 Must Do / 🟡 High / 🔵 Medium / ⚪ Launch Day)
6. Closes any existing open audit issue for the same date + time slot (no duplicates)
7. Labels: `audit` + `automated` always. `bug` added if CRITICAL/HIGH found.
8. Job fails (red ✗ in GitHub) if CRITICAL or HIGH issues found

### Finding Severities
| Severity | Meaning | Job result |
|---|---|---|
| CRITICAL | Platform-breaking — schema drift, hardcoded secrets, service role key exposed | ❌ Job fails |
| HIGH | Errors swallowed, wrong patterns, will cause silent failures | ❌ Job fails |
| MEDIUM | Sub-optimal patterns, unvalidated inputs | ✅ Job passes with warning |
| LOW | Code quality, TODOs, minor issues | ✅ Job passes with warning |

### Viewing Audit Reports
- Go to github.com/jacquesvieiraza-blip/KIND → Issues → filter label: `audit`
- Or GitHub Actions → KIND System Audit → latest run → artifacts → `audit-{id}.txt`

---

*Owner: K.I.N.D founding team*
*Last updated: 25 May 2026 (evening — full rebuild post all schema fixes)*
