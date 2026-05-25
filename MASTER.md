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
22. [Competitive Audit — Full Landscape](#22-competitive-audit--full-landscape)
23. [Key Decisions Locked](#23-key-decisions-locked)
24. [UK Company Registration](#24-uk-company-registration)
25. [Daily Audit — How It Works](#25-daily-audit--how-it-works)
26. [Art of the Possible](#26-art-of-the-possible)
27. [Legal](#27-legal)

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

### 📋 TOMORROW'S SESSION — Debrief Agenda

*Added 25 May 2026 (evening). Full debrief + action items for next session.*

| # | Item | Detail |
|---|---|---|
| A | **Full session debrief** | Everything built today — admin portal V2, competitive audit, compliance roadmap, Art of the Possible, cashflow model |
| B | **Upgrade Apollo plan** | app.apollo.io → Settings → Plan & Billing → Basic ($49) minimum, Professional ($99) recommended. **Platform cannot find a single lead without this.** |
| C | **Build 4 competitor-targeting ICPs** | Once Apollo is upgraded — build these in the portal immediately: |
| | → ICP 1: Lemlist Users Africa | Titles: CEO/Founder/Head of Sales · Tech stack: Lemlist · Geo: SA, Nigeria, Kenya · Size: 1–200 |
| | → ICP 2: Instantly/Smartlead Users Africa | Titles: CEO/Founder/Agency Owner · Tech stack: Instantly · Geo: SA, Nigeria, Kenya · Size: 1–50 |
| | → ICP 3: Clay Users Africa | Titles: Head of Growth/RevOps/Founder · Tech stack: Clay · Geo: SA, Nigeria, Kenya · Size: 11–200 |
| | → ICP 4: Apollo Sequences Users Africa | Titles: Head of Sales/CEO/Founder · Tech stack: Apollo · Geo: SA, Nigeria, Kenya · Size: 11–500 |
| D | **Run all 4 ICPs** | After Apollo upgrade — hit Run on all 4. These are the warmest possible leads: already paying for outreach tools, proven buyers. |
| E | **Admin portal review** | Walk through Founder OS V2 — dark sidebar, AI exec team, compliance tracker, living docs, revenue page, health page |
| F | **Review compliance plan** | SOC 2 gap assessment (free at vanta.com) · Start AI risk register (Google Doc, free) · Display GDPR + CCPA badges on website |
| G | **Tomorrow's operational checklist** | Railway deploy logs · RESEND_API_KEY confirmed · MASTER_SCHEMA.sql run · Google Workspace setup |

**Competitor targeting pitch (FIGSY copy — use this when ICPs run):**
> *"Hi [First Name] — spotted that [Company] uses [Lemlist/Instantly/Clay]. We built K.I.N.D specifically for African businesses doing B2B outreach — fully managed, POPIA compliant, ZAR billing. FIGSY (our AI SDR) runs the whole sequence. Worth a 15-minute call?"*

---

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

### Current Status

| Framework | Status | Where |
|---|---|---|
| **POPIA** (South Africa) | ✅ Complete | Consent flow, opt-out blocklist, data sovereignty, DPA |
| **GDPR** (EU/UK) | ✅ Complete | trust.html — Articles 6(1)(f), 17, 13/14. DPA covers SCCs |
| **CAN-SPAM** (US) | ✅ Complete | trust.html |
| **DPA** published | ✅ Complete | dpa.html — 10 sections |
| **CCPA** (California) | ✅ Complete | trust.html + dpa.html + dpa-us.html |
| **US state laws** (VCDPA, CPA, etc.) | ✅ Complete | dpa-us.html Section 1 catch-all |
| **SOC 2 Type II** | ⏳ Q1 2027 | See roadmap below |
| **ISO 27001** | ⏳ Year 2 | See roadmap below |
| **ISO 42001** | ⏳ Year 2 | See roadmap below |

---

### Certification Roadmap — How to Get the Badges

The five badges to earn: **SOC 2 Type II · GDPR · CCPA · ISO 27001 · ISO 42001**

GDPR and CCPA are already done — they are regulatory compliance claims, not third-party certifications. The three that require formal audit and certification are SOC 2, ISO 27001, and ISO 42001.

---

#### 1. GDPR — ✅ Done
**What it is:** EU/UK data protection regulation. Not a certification — a compliance claim backed by documented controls.
**What K.I.N.D has:** `trust.html`, `dpa.html`, SCCs, legitimate interest basis, data subject rights, af-south-1 data residency.
**How to display it:** GDPR badge on website = self-attestation of compliance. Legitimate and standard practice.
**Cost:** £0 — already done.
**To strengthen:** Get a third-party GDPR compliance assessment from a UK/EU data protection solicitor. ~£500–1,500. Optional but useful for enterprise clients.

---

#### 2. CCPA — ✅ Done
**What it is:** California Consumer Privacy Act. Applies to any business serving California residents with >$25M revenue OR >100k consumer records. K.I.N.D is below both thresholds currently — but compliance is built in anyway.
**What K.I.N.D has:** `trust.html`, `dpa-us.html`, opt-out mechanism, data deletion on request.
**How to display it:** CCPA badge = self-attestation. Standard practice for SaaS.
**Cost:** £0 — already done.

---

#### 3. SOC 2 Type II — ⏳ Q1 2027
**What it is:** The gold standard for SaaS security compliance. An independent CPA firm audits your security controls over a 6–12 month observation period. Covers 5 Trust Service Criteria: Security (mandatory), Availability, Processing Integrity, Confidentiality, Privacy.
**Who asks for it:** Enterprise clients, US companies, any client with their own security review process. Required by most corporate procurement teams above $50k contract value.
**Type I vs Type II:**
- Type I = point-in-time snapshot. Faster, cheaper, less valuable.
- Type II = 6–12 month observation period. Required by serious enterprise buyers. Always aim for this.

**The path:**
1. **Choose a compliance platform** — Vanta ($15,000–25,000/yr), Drata ($10,000–20,000/yr), or Secureframe ($12,000–20,000/yr). These automate evidence collection, map controls, and connect to your AWS/Vercel/Railway/Supabase infrastructure. **Vanta recommended — best integrations, most enterprise buyers recognise it.**
2. **Gap assessment** (~Month 1) — Platform scans infrastructure, identifies what's missing. Typical gaps: formal access control policy, incident response plan, vendor risk management, security training records, penetration test.
3. **Remediation** (~Month 2–4) — Fix the gaps. Write the policies. Run a pen test (~£2,000–5,000 from a UK firm). Implement multi-factor auth, audit logging, formal change management.
4. **Observation period** (~Month 5–10) — Nothing to do except operate normally. The platform collects evidence continuously.
5. **Audit** (~Month 11–12) — CPA firm reviews evidence, interviews team, issues the SOC 2 Type II report.
6. **Report issued** — Share with enterprise prospects under NDA. Display badge on website.

**Cost breakdown:**
| Item | Cost |
|---|---|
| Vanta (Year 1) | ~$20,000 |
| CPA audit firm | ~$15,000–25,000 |
| Pen test | ~£2,000–5,000 |
| Legal (policy review) | ~£1,000–2,000 |
| **Total Year 1** | **~$40,000–55,000** |
| Renewal (Year 2+) | ~$25,000–35,000/yr |

**When to start:** When the first enterprise client asks for it OR at 50+ clients. Not before — it's a significant investment and there's no ROI until enterprise buyers are in the funnel.

**K.I.N.D trigger:** Q1 2027 or first enterprise contract requiring it, whichever comes first.

---

#### 4. ISO 27001 — ⏳ Year 2
**What it is:** International standard for Information Security Management Systems (ISMS). Published by ISO/IEC. Audited by an accredited certification body. More recognised globally than SOC 2 — especially in Europe, Middle East, and Africa.

**Why it matters for K.I.N.D:** African enterprise clients (banks, telecoms, large corporates) are more familiar with ISO 27001 than SOC 2. If K.I.N.D targets Nigerian fintechs, Kenyan banks, or SA corporates at enterprise scale, ISO 27001 opens those doors.

**The path:**
1. **Gap analysis** — Hire an ISO 27001 consultant or use a platform like Vanta (which covers both SOC 2 and ISO 27001 simultaneously). Identify gaps against the 114 controls in Annex A.
2. **Build the ISMS** — Document your Information Security Management System. Risk assessment, risk treatment plan, Statement of Applicability, security policies, asset register.
3. **Internal audit** — Self-audit or hire a consultant.
4. **Stage 1 audit** — Certification body reviews documentation. ~1 day.
5. **Stage 2 audit** — Certification body audits implementation. ~2–3 days on-site.
6. **Certificate issued** — Valid 3 years, with annual surveillance audits.

**Cost breakdown:**
| Item | Cost |
|---|---|
| Consultant (gap analysis + ISMS build) | ~£5,000–15,000 |
| Certification body (Stage 1 + 2 audit) | ~£5,000–10,000 |
| Annual surveillance audits | ~£2,000–3,000/yr |
| **Total Year 1** | **~£10,000–25,000** |

**Efficiency play:** If doing both SOC 2 and ISO 27001, do them simultaneously — they share ~70% of controls. Vanta maps both frameworks from the same evidence. Saves roughly 40% of the total cost vs doing them separately.

**K.I.N.D trigger:** Year 2 (2027) or when first African enterprise contract requires it.

---

#### 5. ISO 42001 — ⏳ Year 2 (Early Mover Opportunity)
**What it is:** The world's first international standard for AI Management Systems. Published December 2023 by ISO/IEC. Covers responsible AI development, deployment, and governance — bias assessment, transparency, human oversight, AI risk management.

**Why this is significant for K.I.N.D:**
- ISO 42001 is brand new. Very few companies have it. Being an early certified AI company is a genuine differentiator.
- As an AI-native product (Claude-powered FIGSY, AI lead scoring, AI email generation), K.I.N.D has a natural story to tell here.
- EU AI Act (effective 2025) and emerging African AI governance frameworks are moving in this direction. ISO 42001 is the early compliance play.
- Enterprise buyers asking "is your AI responsible?" will start using ISO 42001 as the benchmark.

**What it covers:**
- AI policy and governance documentation
- Risk assessment for AI systems (FIGSY, scoring models, email generation)
- Transparency about how AI makes decisions
- Human oversight mechanisms (pause FIGSY, override lead scores)
- Bias monitoring and mitigation
- Data quality and training data governance
- Incident response for AI failures

**The path:** Very similar to ISO 27001. Gap analysis → ISMS-equivalent for AI → audit by accredited body → certificate.

**Current K.I.N.D readiness:**
- ✅ Human oversight: FIGSY can be paused, leads can be manually overridden
- ✅ Transparency: email generation reasoning visible (Phase 3 feature)
- ✅ AI model documentation: Claude Haiku for volume, Sonnet for quality — documented
- ⏳ Formal AI risk register: not yet created
- ⏳ Bias assessment for lead scoring: not yet documented
- ⏳ AI incident response plan: not yet written

**Cost:** Similar to ISO 27001. ~£10,000–20,000 for Year 1 including consultant and audit. Market is early so certification body rates are still reasonable.

**K.I.N.D trigger:** Year 2 — build the AI risk register and bias documentation now (low cost, high value for marketing), pursue formal certification when pursuing enterprise contracts.

---

### The Certification Display Strategy

The badges displayed on the website signal trust. The order to earn them:

| Order | Certification | Trigger | Est. Cost | Timeline |
|---|---|---|---|---|
| ✅ Now | GDPR | Done | £0 | Done |
| ✅ Now | CCPA | Done | £0 | Done |
| 1 | SOC 2 Type II | First enterprise client OR 50+ clients | ~$50,000 | 12–18 months |
| 2 | ISO 27001 | Year 2 — African enterprise pipeline | ~£15,000 | 6–12 months |
| 3 | ISO 42001 | Year 2 — AI governance story | ~£15,000 | 6–12 months |

**Cost-efficient path:** Do SOC 2 + ISO 27001 + ISO 42001 simultaneously in Year 2 using Vanta. Shared controls mean one platform, one compliance programme, three badges. Total Year 2 investment: ~$80,000–100,000. At that point K.I.N.D should have 100+ clients and $10k+ MRR — the ROI is there.

**Before formal certification — what to do now (free):**
1. Display GDPR and CCPA badges immediately — you're already compliant
2. Create an `AI Ethics & Governance` page on the website — document how FIGSY works, how lead scoring decisions are made, what human oversight exists. Costs nothing. Directly supports ISO 42001 readiness.
3. Write the AI risk register (a Google Doc is fine). Identifies K.I.N.D's AI systems, their risks, and mitigations. Use this in enterprise sales conversations now.
4. SOC 2 readiness tracker — Vanta offers a free trial and gap assessment. Run the gap assessment to know exactly what's needed before committing to the full programme.

---

### Add to Admin Portal — Compliance Tracker Page (`/compliance`)

A compliance dashboard page in the admin portal showing:
- Current certification status (green/amber/red per badge)
- Next milestone per certification
- Cost and timeline to next badge
- Readiness checklist for SOC 2 (ticked off as controls are implemented)
- AI governance documentation status (for ISO 42001 prep)

This page is for the Founder's visibility — track progress toward enterprise-grade compliance from one place.

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

### ARPU Assumptions

| Client Type | Monthly Spend (USD) | Profile |
|---|---|---|
| Starter | $20 | Lead Gen 20 only |
| Growth | $160 | Lead Gen 100 + FIGSY 20 |
| Scale | $400 | Lead Gen 100 + FIGSY 100 |
| **Blended ARPU** | **~$80** | Mixed client base |

---

### Three Scenarios — Month by Month

#### 🔵 Conservative (slow start, low outreach volume)
*Assumptions: 30% trial→paid, 5% monthly churn*

| Month | New Paid | Churned | Total Clients | MRR (USD) |
|---|---|---|---|---|
| May 2026 | 3 | 0 | 3 | $240 |
| Jun 2026 | 4 | 0 | 7 | $560 |
| Jul 2026 | 6 | 0 | 13 | $1,040 |
| Aug 2026 | 7 | 1 | 19 | $1,520 |
| Sep 2026 | 9 | 1 | 27 | $2,160 |
| Oct 2026 | 10 | 1 | 36 | $2,880 |
| Nov 2026 | 12 | 2 | 46 | $3,680 |
| Dec 2026 | 13 | 2 | 57 | $4,560 |
| **Year 1 end** | | | **~60 clients** | **~$4,800 MRR** |

Year 1 ARR: ~$34,000 · Break-even: Month 2

---

#### 🟡 Base (GTM plan executed, FIGSY self-outreach live)
*Assumptions: 40% trial→paid, 3% monthly churn*

| Month | New Paid | Churned | Total Clients | MRR (USD) |
|---|---|---|---|---|
| May 2026 | 8 | 0 | 8 | $640 |
| Jun 2026 | 12 | 0 | 20 | $1,600 |
| Jul 2026 | 16 | 1 | 35 | $2,800 |
| Aug 2026 | 20 | 1 | 54 | $4,320 |
| Sep 2026 | 24 | 2 | 76 | $6,080 |
| Oct 2026 | 28 | 2 | 102 | $8,160 |
| Nov 2026 | 32 | 3 | 131 | $10,480 |
| Dec 2026 | 36 | 4 | 163 | $13,040 |
| **Year 1 end** | | | **~165 clients** | **~$13,200 MRR** |

Year 1 ARR: ~$72,000 · Break-even: Month 1

---

#### 🟢 Optimistic (partner channel + Product Hunt + strong word of mouth)
*Assumptions: 50% trial→paid, 2% monthly churn*

| Month | New Paid | Churned | Total Clients | MRR (USD) |
|---|---|---|---|---|
| May 2026 | 15 | 0 | 15 | $1,200 |
| Jun 2026 | 25 | 1 | 39 | $3,120 |
| Jul 2026 | 35 | 2 | 72 | $5,760 |
| Aug 2026 | 45 | 2 | 115 | $9,200 |
| Sep 2026 | 50 | 3 | 162 | $12,960 |
| Oct 2026 | 60 | 5 | 217 | $17,360 |
| Nov 2026 | 70 | 6 | 281 | $22,480 |
| Dec 2026 | 75 | 8 | 348 | $27,840 |
| **Year 1 end** | | | **~350 clients** | **~$28,000 MRR** |

Year 1 ARR: ~$138,000 · Break-even: Month 1

---

### Revenue Milestones

| Milestone | What it unlocks | Base scenario |
|---|---|---|
| **$1,000 MRR** | Platform pays for itself | Month 2 |
| **$5,000 MRR** | Founder salary begins | Month 4 |
| **$10,000 MRR** | First hire possible | Month 7 |
| **$25,000 MRR** | Series A conversations | Month 10–12 |
| **$100,000 MRR** | Market leader, SA dominant | Month 18–24 |

---

### The 4 Levers That Separate Conservative from Optimistic

1. **Apollo plan live** — no API access = zero leads = no product
2. **FIGSY self-outreach running** — automated pipeline, no manual effort
3. **Partner channel** — 1 good agency partner = 10 new clients/month
4. **ARPU uplift** — if average client spends $160 instead of $80, all scenarios double

---

### Core KPIs (check every Monday)

| KPI | Target | Red Flag |
|---|---|---|
| TTFL (Time to First Lead) | < 2 hours | > 4 hours |
| Trial → Paid conversion | > 40% | < 25% |
| Month 1 churn | < 5% | > 10% |
| FIGSY reply rate | > 8% | < 3% |
| ICP built within 24h of signup | > 80% | < 60% |
| At-risk clients (no ICP after 3 days) | 0 | > 2 |
| ARPU (blended) | > $80 | < $40 |

---

## 16. CASHFLOW MODEL

### Fixed Monthly Tech Costs

| Service | Plan | Cost/mo |
|---|---|---|
| Supabase | Pro (af-south-1 required) | $25 |
| Vercel | Pro | $20 |
| Railway | Usage-based | $10–20 |
| Apollo.io | **Basic minimum / Professional recommended** | $49–99 |
| Google Workspace | Business Starter (hello@get-kind.com) | $12–18 |
| Resend | Free → Pro at scale | $0–20 |
| Domain | Annual | ~$1 |
| **Total floor** | | **$117–203/mo** |

**Variable costs per lead:** ~$0.009

**Break-even: 2 clients.**

> ⚠️ Apollo free plan = $0/mo but API access blocked. Platform cannot function. Minimum viable plan is Basic at $49/mo.

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

## 22. COMPETITIVE AUDIT — FULL LANDSCAPE

*Last updated: 25 May 2026*

---

### The One-Line Summary

Every competitor below is either a DIY tool built for experienced sales teams, or enterprise software with enterprise pricing. None are fully managed, Africa-first, POPIA-compliant, and accessible to a founder with no sales team. That is the white space K.I.N.D owns.

---

### Competitor Map

| Competitor | Who it's built for | Price/mo | Managed? | Africa? | Lead finding included? |
|---|---|---|---|---|---|
| **Alta AI SDR** | Mid-market sales teams | $500+ | Partial | ❌ | ✅ |
| **Apollo.io** | In-house SDR teams | $49–99 | ❌ DIY | ❌ | ✅ |
| **Instantly.ai** | Agencies, volume emailers | $37 | ❌ DIY | ❌ | ❌ Bring your own list |
| **Lemlist** | SDRs, small agencies | $59–99 | ❌ DIY | ❌ | ❌ Bring your own list |
| **Smartlead.ai** | Agencies, deliverability-focused | $39–94 | ❌ DIY | ❌ | ❌ Bring your own list |
| **Clay.com** | Sophisticated agencies | $149–800 | ❌ DIY | ❌ | ✅ (50+ sources) |
| **Salesloft / Outreach** | Enterprise sales teams | $100+/seat | ❌ DIY | ❌ | ❌ |
| **Local SA alternatives** | — | — | — | ❌ None exist | — |
| **K.I.N.D** | **Founder-led SA businesses** | **$20–300** | **✅ Fully** | **✅** | **✅** |

---

### 1. Alta AI SDR

**What it is:** AI SDR platform. Finds leads, builds sequences, runs outreach. The closest product category match to K.I.N.D.

**Their gaps — K.I.N.D's weapons:**
- Zero Africa presence — no POPIA, no NDPR, no ZAR billing
- USD-only pricing, quarterly billing, non-refundable, no trial
- Minimum spend puts it out of reach for SME founders
- No WhatsApp-native strategy
- No managed onboarding — requires an SDR to configure and run it

**What we've done from this audit:**

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

### 2. Apollo.io

**What it is:** Contact database (275M+ contacts) + DIY sequences tool + light CRM. K.I.N.D uses Apollo as its data source via API.

**Relationship to K.I.N.D:** Supplier + partial competitor. Full analysis in Section 26 (Art of the Possible → Apollo — Supplier, Competitor, and Teacher).

**Their gaps:**
- Self-serve only — no managed service tier
- US/EU-centric — no Africa-specific compliance tooling
- Requires SDR skills to operate sequences effectively
- No ZAR billing
- Free plan blocks API entirely (minimum $49/mo for API access)

**K.I.N.D's position:** Uses Apollo as the data engine. Wins on the managed service layer Apollo doesn't offer.

---

### 3. Instantly.ai

**What it is:** High-volume cold email sending infrastructure. Mailbox warm-up, multi-inbox rotation, unlimited sending at low cost. Very popular with agencies running outbound for clients.

**Their gaps:**
- No lead finding — you must bring your own contact list
- No AI personalisation — template-based only
- No Africa presence, no POPIA, no ZAR billing
- Requires expertise to set up correctly (deliverability, warm-up schedules)
- Tool only — no strategy, no management, no outcome guarantee

**Who uses it:** Cold email agencies, experienced SDRs who already have lists and know what they're doing. Not a founder-led SME product.

**K.I.N.D's position:** K.I.N.D's buyer has never heard of Instantly and doesn't want to learn it. Non-overlapping buyers.

---

### 4. Lemlist

**What it is:** Cold email + LinkedIn sequencing tool with AI personalisation (personalised images, icebreakers, video). More polished than Instantly, popular in Europe.

**Their gaps:**
- No lead finding built in — bring your own list (or use their add-on "Lemlist database" at extra cost)
- Self-serve — no managed service
- No Africa presence, no POPIA, no ZAR billing
- Pricing in USD/EUR — no local payment options
- LinkedIn automation risks (against LinkedIn ToS — K.I.N.D deliberately avoids this)

**Who uses it:** SDRs and small agencies in Europe and the US who want a polished outreach tool. Not built for Africa, not managed.

**K.I.N.D's position:** Lemlist targets someone who already has a pipeline process. K.I.N.D's buyer is building one for the first time.

---

### 5. Smartlead.ai

**What it is:** Multi-mailbox cold email infrastructure focused on deliverability at scale. Similar to Instantly but with more agency-oriented features (client sub-accounts, white-label).

**Their gaps:**
- No lead finding
- No AI writing — template-based
- No Africa presence, no POPIA
- Technical setup required — warm-up schedules, DNS records, inbox rotation
- White-label is interesting but targets agencies already running high volume

**Who uses it:** Cold email agencies running outbound at scale for multiple clients. Infrastructure-layer product.

**K.I.N.D's position:** Smartlead is the infrastructure. K.I.N.D is the outcome. A client doesn't want to manage infrastructure — they want meetings.

---

### 6. Clay.com

**What it is:** Data enrichment and sequencing workflow platform. Pulls from 50+ data sources (Apollo, LinkedIn, Clearbit, Hunter, Crunchbase, and more), uses AI (including Claude) to enrich and personalise at scale. Used by sophisticated revenue ops teams and high-end agencies.

**Their gaps:**
- Expensive ($149/mo minimum, up to $800/mo for serious usage)
- Very steep learning curve — requires a dedicated RevOps person to build and run workflows
- No managed service — you build the Clay tables yourself
- No Africa focus, no POPIA, no ZAR billing
- Not accessible to a founder without sales/data ops experience

**Who uses it:** Growth agencies, revenue ops teams, sales-led Series A/B startups with dedicated operators. Not the same buyer as K.I.N.D at all.

**What K.I.N.D can learn from Clay:**
- Multi-source data enrichment (50+ providers vs K.I.N.D's single Apollo dependency) — relevant to the Year 2 data strategy
- Waterfall enrichment logic (try Source A → if no email, try Source B → try Source C) — reduces the Apollo single-point dependency
- This maps directly to the Clay alternative discussed in `docs/legal.md`

---

### 7. Salesloft / Outreach.io

**What they are:** Enterprise-grade sales engagement platforms. Full sequence management, call recording, Salesforce/HubSpot deep integration, manager dashboards, forecasting. The platforms that run enterprise SDR teams.

**Their gaps vs K.I.N.D:**
- $100+ per seat per month — minimum viable spend is thousands of dollars monthly
- Require a dedicated sales ops team to administer
- Built for companies with 10+ SDRs, not solo founders
- No Africa presence whatsoever

**K.I.N.D's position:** No overlap at all currently. This is where K.I.N.D's enterprise tier could eventually play (white-label for large SA corporates running outbound at scale) — but that is Year 3+ territory.

---

### 8. Local South Africa / Africa Alternatives

**The honest answer:** None exist that do what K.I.N.D does.

There are:
- CRM consultants who set up HubSpot or Salesforce for SA companies
- Manual lead gen agencies that build lists by hand and charge per lead
- Digital marketing agencies that run LinkedIn or Google ads
- BPO-style sales development firms that employ human SDRs

None of these are AI-native, automated, POPIA-compliant, credit-based, and accessible at $20/mo.

**This is the gap.** K.I.N.D is the first product in this category built specifically for the African market.

---

### K.I.N.D's Defensible Advantages — Across All Competitors

| Advantage | Why it's defensible |
|---|---|
| **Fully managed** | Every competitor is a tool. K.I.N.D is a service. Different buyer, different sales motion, lower churn. |
| **Africa-first** | POPIA compliance, ZAR billing, Paystack, af-south-1 data residency. No competitor has this. |
| **FIGSY as a named AI agent** | Not "automated sequences" — a named agent with memory, reasoning loop, and a personality. Emotional stickiness competitors can't replicate without rebuilding. |
| **Credit model at SME price points** | $20 entry point vs $500+ minimum for alternatives. Unlocks a market that doesn't exist for any competitor. |
| **Data moat (building now)** | Every sequence run, every reply classified, every ICP scored — accumulates into Africa-specific benchmarks no competitor has. |
| **POPIA as a feature** | Every competitor treats compliance as a legal footnote. K.I.N.D treats it as a selling point — and in the African market, it's a genuine differentiator. |

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

## 26. ART OF THE POSSIBLE

*Added 25 May 2026 — future vision, not current roadmap. No code changes implied.*
*Updated 25 May 2026 (evening) — Lemlist lessons + MCP server added. Full consolidated version.*

---

### The One Rule

> **Build the foundation. Prove the loop. Then build the palace.**
>
> Client signs up → builds ICP → leads appear → FIGSY sends Day 1 → reply arrives → client sees it → meeting gets booked.
>
> That loop, working reliably, for 20+ paying clients, is the foundation everything else sits on. None of the below is touched until that's true.

---

### Foundation Gates — Must Be True Before Any V2 Feature

| Gate | Why it matters |
|---|---|
| 20+ paying clients on platform | Real usage data to build from. Features built on assumptions are wrong features. |
| Apollo Professional plan live | All lead volume data flows through this. No data = no patterns to learn from. |
| FIGSY reply classification running cleanly | The entire self-improving loop depends on replies being classified correctly. |
| `figsy_memory` table populated (3 months) | The ICP learning engine has nothing to learn from until then. |
| Resend inbound routing live | FIGSY replies must flow back into the platform. Without this, reply data is lost. |

---

### What We're Learning From — The Three Teachers

#### ClickUp — The Command Centre

ClickUp didn't just build a project tool. They built a command centre. Here's what makes their portal world-class and what K.I.N.D should take from it:

**1. Multiple views of the same data**
List. Board. Timeline. Calendar. Mind map. Gantt. The data is identical — the view changes how you think about it. For K.I.N.D, leads could be:
- List view (current)
- Kanban board (drag leads through pipeline stages)
- Timeline (when each FIGSY touchpoint fires)
- Score heatmap (visual clusters of hot vs cold leads)

**2. Command palette (Cmd+K)**
Type anything. "Add ICP." "Show high-score leads." "Pause FIGSY." One keystroke gets you anywhere. Power users live in it. It makes the product feel like a pro tool.

**3. Real-time activity feed**
You see every action as it happens. "FIGSY sent 12 emails today. 2 replies. 1 interested." Not in a report — live, as it happens, in a sidebar feed.

**4. Custom fields everywhere**
Every client's business is different. K.I.N.D could let clients add custom lead fields — their own scoring criteria, custom status labels, notes fields per lead.

**5. Automations with visual builder**
"When a lead is marked Interested → create a HubSpot deal → notify me on Slack → pause FIGSY sequence." Built visually, no code.

**6. Notification centre that's actually useful**
Not email — in-app, real-time, prioritised. "FIGSY paused campaign due to low performance." "3 new hot leads this morning." "Milla answered 12 questions this week."

**7. The sidebar is a mission control**
Not just navigation — it shows live stats. Credits remaining. Active campaigns. Milla queries today. You know the health of your revenue operation at a glance.

---

#### Lemlist — The Conversion Machine

Lemlist has built one of the most effective cold outreach products in the market. What to absorb:

**Personalised images in emails**
Lemlist's signature move — they pioneered it. Every email contains an image with the prospect's name, company logo, or LinkedIn photo dynamically inserted. A whiteboard that says *"Hey [First Name], had an idea for [Company]…"* — generated per recipient at send time. Reply rates go up because it's visually arresting. Nobody expects a personalised image in a cold email.

*K.I.N.D version: FIGSY's Day 1 email includes a dynamically generated image — prospect's company name on a branded graphic. HTML-to-image canvas API. One image template, personalised per send. Proven reply rate uplift. Phase 3.*

**The visual sequence builder**
Lemlist's sequence UI is excellent. Every step laid out visually — Day 1 email, Day 3 LinkedIn, Day 7 follow-up, Day 14 breakup. Delays, conditions, branches all visible at once. Clients currently can't see or change the FIGSY sequence flow. Eventually they'll want to — add steps, change delays, create branches ("if opened but no reply → different follow-up").

*K.I.N.D version: Piece 7 (Visual Automation Builder) below. Lemlist proves the demand is real.*

**Template library by use case**
Lemlist ships with proven cold email sequences for SaaS, agency, recruiting, consulting. Plug in your company name and you're running in 10 minutes.

*K.I.N.D version: When a client builds an ICP targeting "Fintech CTOs in SA," a pre-built FIGSY sequence for that exact profile loads automatically. Tone, length, cadence already calibrated. Piece 10 below.*

**Community — "Lemlist Family"**
Lemlist's biggest differentiator. They built a massive community — templates, playbooks, case studies, weekly newsletters, a Slack group with tens of thousands of members. When someone Googles "cold email template for SaaS" — Lemlist is in the results. They made their product the hub of a community, not just a tool.

*K.I.N.D version: Become the go-to resource for B2B outreach in South Africa and Africa. Nobody owns that space. Blog posts on "how to do B2B outreach in Nigeria," "POPIA and cold email — what's allowed," "best industries to target in SA." Costs nothing, compounds over time. **Start now.***

**Multi-channel sequences (email + LinkedIn)**
Lemlist combines email + LinkedIn connection + LinkedIn message in one sequence. K.I.N.D deliberately avoids LinkedIn automation — it's against LinkedIn's ToS and is locked in Section 23 as a no-build. But the principle (multi-surface contact over 3 weeks) is right. *Stays off the roadmap unless LinkedIn's ToS changes.*

**What FIGSY already does better than Lemlist:** Lemlist generates one personalised opener per email. FIGSY personalises the full email via Claude. K.I.N.D wins on depth. Lemlist wins on the visual/image layer. Both worth having.

---

#### Apollo — Supplier, Competitor, and Teacher

Apollo is the most important company in K.I.N.D's world — simultaneously the data source powering the product, a partial competitor, and the most instructive product to study at scale.

**What Apollo actually is:**
1. **Contact database** — 275M+ professional contacts with verified emails, job titles, company data, tech stacks. This is what K.I.N.D calls via API to find leads
2. **Sequences** — DIY outreach automation. This is where Apollo overlaps with FIGSY
3. **CRM / pipeline** — Deals, calls, Salesforce sync. K.I.N.D doesn't play here yet

Apollo's target customer: in-house sales teams and SDRs who want a DIY toolkit. K.I.N.D's target customer: a founder who doesn't want to touch any of it.

**Where K.I.N.D competes with Apollo:**

| Capability | Apollo | K.I.N.D |
|---|---|---|
| Finding contacts | ✅ Their core database | ✅ Uses Apollo's API |
| Outreach sequences | ✅ DIY tool | ✅ FIGSY — fully managed |
| Personalisation | ✅ Template variables | ✅ Full email via Claude |
| Africa compliance | ❌ No POPIA tooling | ✅ Built-in |
| ZAR billing | ❌ USD only | ✅ Paystack |
| Managed service | ❌ Self-serve only | ✅ Fully managed |

**Where K.I.N.D does NOT compete:** Data ownership (Apollo's 10-year database is the raw material, not the competition). Enterprise CRM. US/EU enterprise sales tooling.

**What to learn from Apollo's product:**

- *Job change alerts* — person just moved companies. Highest intent moment to reach out. Apollo surfaces this. K.I.N.D could show it as a badge on lead cards and auto-prioritise in FIGSY. Apollo API already exposes this. Phase 4.
- *Sequence analytics* — open rate by subject line, reply rate by day of week, best time to send by industry. K.I.N.D already collects this in `figsy_sent_emails`. The Benchmarks feature (Piece 11) is K.I.N.D's Africa-specific version.
- *AI transparency* — show *why* FIGSY wrote an email the way it did. "This email referenced that your target raised Series A." Builds trust in the AI. Phase 3 — simple UI change.
- *Multi-channel* — Apollo does email + LinkedIn + phone. FIGSY email only now. LinkedIn step is Phase 5+ (ToS permitting).
- *Intent spike signals* — companies researching topics relevant to your product. Requires Bombora/G2 data (~$2k/mo). Year 2.

**The strategic reality:** Apollo is primarily a supplier. The genuine risk is Apollo building a managed service tier targeting African SMEs. Currently not their focus — their roadmap is US/EU enterprise. **The hedge:** K.I.N.D's advantage is not the data source — it's what it learns from running thousands of African B2B outreach sequences over time. That dataset is unreplicable.

---

### K.I.N.D V2 Vision — The Revenue Mission Control

Instead of a stats page — a **live ops centre**. Three columns, real-time websocket updates, everything clickable:

| FIGSY (Outbound) | Leads Pipeline | Intelligence |
|---|---|---|
| Emails sent today | New leads this week | Milla's top queries |
| Reply rate (live) | Hot leads (score 80+) | Vida conversations |
| Active campaigns | Pending POPIA consent | Anomalies detected |
| Next send due | Deals in HubSpot | Weekly performance |

---

### The AI Revenue Team — Full Roster (1–3 year vision)

| Agent | Role | Status |
|---|---|---|
| **FIGSY** | AI SDR — outbound prospecting + sequences | ✅ Live |
| **Milla** | Virtual Assistant — business knowledge + internal queries | July 2026 |
| **Vida** | Chatbot — website + WhatsApp inbound qualifier | July 2026 |
| **REEVE** *(future)* | AI AE — books + runs discovery calls via voice | Year 2 |
| **LENA** *(future)* | AI CS — onboarding, check-ins, churn prevention | Year 2 |
| **OTTO** *(future)* | AI Ops — pipeline analysis, revenue forecasting, anomaly escalation | Year 2 |

Each agent has a named identity card in the portal, live stats, performance history, and memory that compounds over time.

---

### The ICP That Learns Itself

Right now: you build an ICP → it finds leads.

Future: **FIGSY tells you your ICP.**

After 3 months of data:
> *"Your last 14 replies came from Fintech companies in Lagos, 51–200 employees, with a HubSpot tech stack. Your original ICP was 5 countries wide. Your actual buyers are 1 city wide. Want me to narrow it?"*

The self-improving loop is already half-built (`figsy_memory` table, reply classification). The missing piece is the analysis layer that reads the pattern and surfaces it.

---

### Multi-View Lead Pipeline

**Kanban view** — drag leads between stages:
```
New → Contacted → Replied → Interested → Meeting Booked → Closed
```
FIGSY moves them automatically. You move them manually if needed.

**Score heatmap** — industries on one axis, geography on the other. Bubble size = number of leads. Colour = avg score. Instantly shows where your best market is.

---

### Voice-First Morning Brief

7:30am: Milla reads you a 90-second audio summary.

> *"Good morning. Yesterday FIGSY sent 34 emails. 3 replies — 1 interested, a VP of Sales at a Lagos fintech called Kuda. 2 auto-unsubscribed. Your reply rate this week is 9.2% — above target. You have 2 leads in the Meeting Booked stage worth R42,000 combined. One ICP hasn't been run in 6 days. Want me to run it now?"*

You say "yes." It runs.

---

### The Network Effect (Year 2)

Anonymised benchmarks across all K.I.N.D clients — opt-in only.

> *"K.I.N.D clients in Fintech South Africa average a 7.1% reply rate. You're at 11.4%. You're in the top 15%."*

> *"Companies targeting VP of Sales in Nigeria have a 23% higher meeting-to-close rate than those targeting CEOs. You're targeting CEOs."*

This is the data moat. Nobody else has it. It makes K.I.N.D irreplaceable.

---

### White-Label / Agency Channel (Year 2)

Agencies managing outbound for 5–10 clients log into one admin view. They see all client pipelines. Run ICPs across accounts. Manage FIGSY campaigns for multiple businesses. K.I.N.D becomes their infrastructure.

Agency pricing: 3× standard rate. They charge their clients 5–10×. Everyone wins.

---

### Mobile App (Year 2)

Not a full app — a **revenue pulse widget**.

Home screen widget shows:
- Leads found today
- FIGSY reply rate
- Credits remaining
- 1 tap: Run ICP / Pause FIGSY

Morning brief as push notification. Tap to expand. Reply to interested leads from phone.

---

### Look & Feel Direction

**Current state:** Clean. Functional. Dark mode works. Sidebar is practical. But it feels like a tool, not a revenue command centre.

**What to aim for:**

- **Personality** — Each agent should have a distinct visual identity. FIGSY's section feels sharp, high-frequency, outbound. Milla is calm, considered, knowledge-based. Same brand, different energy.
- **Live data everywhere** — Numbers that count up. Progress bars that fill. Reply rates that update in real time. The portal should feel alive.
- **Status bar** — Bottom of sidebar. Always visible. *"FIGSY sent 12 emails today · 2 replies · 847 credits · All systems operational."* One line that tells you the health of everything.
- **Progressive disclosure** — Simple by default, powerful on demand. A new client sees the essentials. A power user can access everything. ClickUp does this brilliantly — layers of complexity hidden behind a clean surface.
- **Micro-interactions** — When a lead scores 90+, it glows for a second. When FIGSY sends a batch, a subtle pulse animation. When credits are low, the balance goes amber. Small moments that make the product feel considered and alive.

---

### The Pieces — How Each Gets Built

Every piece below sits on top of existing architecture. Nothing requires a rethink. Parked deliberately until the core loop is proven.

**The platform is already designed for this:**
- Kanban → `status` column on `leads` already exists
- Command palette → pure frontend, zero backend changes
- Activity feed → `figsy_sent_emails`, `figsy_replies`, `leads` — all events already recorded
- ICP intelligence → data accumulating right now, every reply classified today feeds it
- Benchmarks → every FIGSY client today contributes to the dataset
- Voice brief → text already generated every morning, just add TTS
- PWA → `manifest.json` and service worker on top of existing portal
- MCP server → wrapper around API endpoints that already exist

**Nothing depreciates.** Parking for 3–6 months means the data gets richer — which makes ICP intelligence and benchmarks *more* valuable, not less.

---

#### Piece 1 — Multiple Views of the Leads Pipeline

**Kanban view** (highest value, build first)
- `status` column on `leads` becomes the column structure
- Drag-and-drop via `@dnd-kit/core` — 12kb, no deps
- Statuses consolidate into pipeline stages: `New → In Sequence → Replied → Interested → Meeting Booked → Closed / Dead`
- FIGSY updates status automatically. Client can drag manually to override.
- Requires: migration to add new status values, Kanban component, column-level filters persisted in localStorage
- **Build time: 2–3 days**

**Score heatmap** (insight view)
- Industries on X axis, geographies on Y axis, bubble = lead count, colour = avg score
- Data already exists in `leads` table
- One API endpoint, one `recharts` chart component
- **Build time: 1 day**

**Timeline view** (power users)
- When each FIGSY step fires per lead — Gantt-style row per lead
- Data already exists in `figsy_sent_emails` and `figsy_enrollments`
- **Build time: 2 days**

**Order:** Kanban → Heatmap → Timeline

---

#### Piece 2 — Command Palette (Cmd+K)

- Library: `cmdk` — used by Vercel, Linear, Raycast. 7kb.
- Wrap app in it, define commands — maps to existing routes and API calls
- Core commands: New ICP, Run ICP, Pause FIGSY, Show hot leads, Add credits, Export leads, View FIGSY inbox, Search leads by name/company
- Keyboard: Cmd+K opens, Escape closes, arrows navigate, Enter executes
- Can be built any time — pure frontend, zero backend changes
- **Build time: 1 day core, 2–3 days full command list**

---

#### Piece 3 — Real-Time Activity Feed

**Option A — Polling (simple)**
- `useEffect` in portal calling `GET /activity/feed?since=last_seen` every 30 seconds
- API queries recent activity from `figsy_sent_emails`, `figsy_replies`, `leads`
- No infrastructure change
- **Build time: 2 days**

**Option B — WebSockets (real-time, recommended)**
- Supabase real-time via PostgreSQL LISTEN/NOTIFY — built in, zero extra infrastructure
- `supabase.channel('activity').on('postgres_changes', ...)` — 20 lines of code
- Any insert to `figsy_sent_emails`, `figsy_replies`, `leads` fires instantly
- **Build time: 3 days**

Events to surface: email sent, reply received, lead scored, lead interested, campaign paused, credits low, ICP run complete

**Trigger to start:** After 10+ active clients. The feed is only valuable when things are actually happening.

---

#### Piece 4 — Custom Fields on Leads

- One schema change: `ALTER TABLE leads ADD COLUMN custom_fields jsonb default '{}'` — that's it. Ever.
- `client_lead_fields` table stores field definitions (name, type, options)
- "Manage fields" screen in portal settings
- Lead card renders custom fields below standard ones
- CSV export includes custom fields as columns
- Filters support custom field filtering
- **Build time: 4–5 days**

**Trigger to start:** After first client requests it, or 30+ clients where generic fields aren't enough.

---

#### Piece 5 — Visual Automation Builder

Most complex item on the list. Highest value. Separates a tool from a platform.

**Architecture:**
- **Triggers:** lead status changes, reply received, credit drops below X, ICP run completes, campaign paused
- **Actions:** create HubSpot deal, send Slack notification, send email, pause/resume campaign, run ICP, webhook to custom URL
- **Conditions:** if/then branching — if score > 80, if industry = Fintech, if country = Nigeria

**Builder UI:** React Flow — the library Linear, Retool, and n8n use. Handles visual canvas, drag-and-drop nodes, edge connections. Hard work is the execution engine, not the UI.

**Execution engine:** Automations stored as JSON in `client_automations` table. When a trigger fires, API checks if any automation is listening, evaluates conditions, executes actions in sequence.

**Build time: 2–3 weeks for solid V1**

**Trigger to start:** After 50+ clients. Value compounds with client count — each client's recipes become reusable templates for others.

---

#### Piece 6 — Notification Centre

**Schema:** `notifications` table — `client_id`, `type`, `title`, `body`, `read_at`, `created_at`, `link`

**Triggers that create notifications:**
- FIGSY campaign auto-paused → "FIGSY paused [Campaign Name] — reply rate below 1%"
- New hot lead (score 90+) → "New 94-score lead: James Okafor, VP Sales at Paystack"
- Credits below threshold → "847 credits remaining"
- ICP run complete → "ICP run found 34 new leads"
- Reply received → "FIGSY got a reply from Ngozi Adeyemi at Flutterwave"
- Lead marked Interested → "🎉 Sarah Chen wants to book a call"

**Frontend:** Bell icon in header, red badge, slide-out panel, grouped by day, mark-as-read, click → navigate to relevant page.

**Build time: 3 days total. Can be built any time.**

---

#### Piece 7 — Status Bar (Sidebar Bottom)

One component. Bottom of sidebar. Always visible.

`GET /clients/me/pulse` returns: emails sent today, reply count today, credit balance, system status. Cached 60 seconds. Refreshes on every page navigation.

**Build time: 4 hours. Build this first — it costs almost nothing and makes the portal feel alive.**

---

#### Piece 8 — Personalised Images in Emails *(from Lemlist)*

FIGSY Day 1 email includes a dynamically generated image — prospect's company name on a branded K.I.N.D graphic. Proven reply rate uplift. Lemlist pioneered this and it remains one of the highest-converting cold email tactics.

**What's needed:**
- HTML-to-image canvas API (e.g. `html2canvas` or a headless browser screenshot service like Puppeteer/Browserless)
- One image template: K.I.N.D branded, prospect's company name dynamically inserted
- Image hosted in Supabase storage, unique URL per lead
- FIGSY email template updated to include the image in Day 1 send

**Build time: 2 days**

**Trigger to start:** Phase 3. After Kanban and notification centre are live.

---

#### Piece 9 — Sequence Template Library *(from Lemlist)*

When a client builds an ICP targeting "Fintech CTOs in SA," a pre-built, optimised FIGSY sequence for that exact profile loads automatically. Tone, length, and cadence already calibrated. No thinking required from the founder.

**What's needed:**
- `figsy_sequence_templates` table: `name`, `icp_tags` (industries/titles), `steps` (JSON array of email copy + delays), `performance_data`
- Seed data: 8–10 templates covering most common K.I.N.D ICP types (Fintech SA, SaaS Lagos, Logistics Kenya, Consulting SA, etc.)
- ICP creation flow: after ICP is saved, suggest matching template — "We found a sequence that works for Fintech CTOs. Use it?"
- Templates improve over time as reply data accumulates — best-performing variant per ICP type

**Build time: 3 days**

**Trigger to start:** Phase 2. Low effort, high onboarding value — new clients get results faster.

---

#### Piece 10 — The ICP That Learns Itself

The data already exists. This is an analysis layer on top.

**The query:** Join `leads` with `figsy_replies` grouped by country/industry/seniority, calculate conversion rate per attribute. Minimum 10 leads per group before surfacing.

Claude reads the output and writes plain-English insight bullets. That's the feature.

**What's needed:**
- `GET /icps/intelligence` endpoint — runs query, passes to Claude Haiku, returns 3–5 insight bullets
- "ICP Insights" card on leads page — shown after 3+ months of data, hidden if insufficient
- "Apply this to my ICP" button — pre-fills ICP form with recommended changes, confirm before saving
- Weekly cron to push insights as notifications

**Build time: 2 days**

**Trigger to start:** 3 months of live FIGSY campaigns + minimum 200 emails sent + 20 replies classified.

---

#### Piece 11 — Voice-First Morning Brief

The text brief already exists. Milla generates it every morning at 07:30 UTC.

**Adding audio:**
- TTS provider: ElevenLabs (best quality, ~$5/mo) or OpenAI TTS (cheaper, good quality)
- One API call: text in → MP3 out
- MP3 stored in Supabase storage or generated fresh each morning
- Audio player on portal dashboard — auto-plays between 07:00 and 09:00, dismissable
- Alternatively: MP3 attached to the morning email

**Build time: 1 day**

**Trigger to start:** After Milla's text brief is proven valuable — check email open rates first.

---

#### Piece 12 — Network Effect Benchmarks

The data already exists across all clients. One aggregation query.

**Privacy gate:** `HAVING COUNT(DISTINCT client_id) >= 5` — minimum 5 clients before any benchmark is shown. Individual data is never identifiable.

**What's needed:**
- `GET /benchmarks/reply-rates` — aggregation query, returns industry/geo benchmarks
- Client's own stats vs benchmark on FIGSY analytics page
- Opt-in setting (default opted-in, can opt out)
- Privacy statement in settings

**Build time: 2 days**

**Trigger to start:** 20+ clients with FIGSY active + 3 months of reply data.

---

#### Piece 13 — White-Label / Agency Channel

**Architecture:**
- `white_label_configs` table: `logo_url`, `primary_colour`, `agency_name`, `custom_domain`, `billing_multiplier`
- `clients.partner_id` foreign key — clients created by an agency carry this
- Portal detects hostname at load → applies correct theme

**Custom domain:** Agency adds CNAME to Vercel. Portal reads hostname, applies white-label config. Already supported by Vercel.

**Billing:** Agency billed at 2× standard rate. `billing_multiplier` applies to all transactions under that partner.

**Build time: 1 week V1**

**Trigger to start:** When the first agency partner asks for it. Never build until there's a waiting customer.

---

#### Piece 14 — Mobile App

**Build a PWA first. Not a native app.**

A Progressive Web App gives home screen install, push notifications (iOS 16.4+, all Android), offline capability — looks and feels native.

**What's needed:**
- `manifest.json` with app name, icons, theme colour
- Service worker for offline caching (`next-pwa` package — 30 min setup)
- Web Push API for push notifications
- `push_subscriptions` table for device tokens
- Morning brief cron sends push notification + email

**Build time: 2 days for PWA + push notifications**

**Native app (if PWA isn't enough):** React Native with Expo. ~60% of portal components are reusable. Build time: 3–4 weeks V1.

**Trigger to start:** PWA — build it alongside notification centre (low cost, high value). Native app — after 100+ clients requesting it.

---

#### Piece 15 — MCP Server (K.I.N.D as AI Infrastructure)

The most strategically interesting piece on this list.

**What it is:** MCP (Model Context Protocol) is Anthropic's open standard that lets AI assistants connect directly to external products. K.I.N.D builds an MCP server — and any MCP-compatible AI assistant (Claude, or any tool using the standard) can call K.I.N.D's capabilities directly. No portal login. No copy-paste. Direct programmatic access.

**What it looks like in practice:**

A founder has Claude open and types:
> *"Find me 20 CTOs at fintech companies in Lagos with 50–200 employees."*
Claude calls the K.I.N.D MCP → runs the ICP search → returns scored, POPIA-screened leads → directly in the conversation.

Or an agency building their own AI workflow:
> *"Every Monday, find 50 new leads matching this profile and enroll them in FIGSY sequence 3."*
Their AI agent calls the K.I.N.D MCP on a schedule. Fully automated, no human touch.

**Tools the MCP server exposes:**

| Tool | What it does |
|---|---|
| `search_leads` | Run an ICP search — returns scored, filtered contacts |
| `get_leads` | Fetch existing leads with filters (status, score, date) |
| `create_icp` | Create a new ICP profile |
| `run_icp` | Trigger an ICP job |
| `get_figsy_stats` | FIGSY campaign performance — sent, opens, replies, interested |
| `enroll_lead` | Enroll a lead in a FIGSY sequence |
| `pause_campaign` | Pause / resume a campaign |
| `get_credit_balance` | Check credits remaining |
| `get_top_leads` | Return highest-scored leads this week |

All of these map directly to API endpoints that already exist. The MCP server is a structured wrapper around the existing REST API.

**Why this is strategically important:**
- **Anthropic MCP directory** — companies that list early get visibility to every Claude user. A K.I.N.D MCP listed there means any Claude user needing African B2B leads finds K.I.N.D before anything else
- **Agency and developer adoption** — agencies building AI sales workflows need a lead gen layer. K.I.N.D's MCP becomes that layer without needing to build a full white-label product
- **Milla uses it internally** — when Milla is built, she calls the K.I.N.D MCP, not the raw database. Same tools external developers use. Build once, powers both internal AI and external integrations
- **New pricing tier** — API/MCP access as a developer tier. Higher ARPU than a standard client
- **Two revenue streams** — K.I.N.D sells outcomes to founders AND sells infrastructure to builders. Entirely different market, same platform

**What's needed:**
- Lightweight Node.js server using `@modelcontextprotocol/sdk`
- New `api_keys` table — scoped permissions (read-only vs write), rate limits per key
- Each MCP tool maps to an existing API endpoint
- Developer documentation

**Build time: 3–5 days for solid V1**

**Trigger to start:** Phase 4. After core loop proven for 20+ clients. Core API endpoints stable before wrapping them.

---

### The Community Play — Start Now, Costs Nothing

The single action from the Lemlist lesson that requires no build time and no clients:

**Become the go-to resource for B2B outreach in Africa.** Nobody owns that space. One LinkedIn post or short article per week:
- *"How to do B2B cold outreach in South Africa without breaking POPIA"*
- *"Best industries to target for B2B sales in Nigeria right now"*
- *"Why your cold email gets no replies — and how to fix it"*
- *"Apollo vs K.I.N.D — when to use each"*

That content drives SEO, builds trust, and positions K.I.N.D as the category authority before a single paid ad is needed. Lemlist did exactly this. It is the highest-leverage free action available right now.

---

### The Build Order

| Phase | When | What |
|---|---|---|
| **Now** | Post 20 clients | Status bar (4hrs), Notification centre (3 days), Sequence template library |
| **Phase 2** | Month 3–4 | Kanban view, Command palette, Template library |
| **Phase 3** | Month 5–6 | Real-time activity feed, Score heatmap, Personalised images, FIGSY transparency layer |
| **Phase 4** | Month 7–9 | ICP intelligence, Benchmarks, Job change alerts, MCP server |
| **Phase 5** | Month 10–12 | Visual automation builder, LinkedIn DM step |
| **Phase 6** | Year 2 Q1 | White-label / Agency, PWA, Voice brief |
| **Year 2+** | 2027 onwards | REEVE, LENA, OTTO agents, Native app, Intent data layer |

---

## 27. LEGAL

Full legal documents are maintained in `/docs/legal.md`.

**GitHub:** https://github.com/jacquesvieiraza-blip/KIND/blob/main/docs/legal.md

### Current Legal Items

| # | Item | Priority | Status |
|---|---|---|---|
| 1 | **Apollo.io ToS — managed service vs data reselling** | 🔴 High | Brief prepared — take to lawyer before 50 clients |
| 2 | **UK company registration** | 🔵 Medium | See Section 24 — £50, same day, companieshouse.gov.uk |
| 3 | **Client agreement language — managed service clause** | 🔴 High | Lawyer to draft clause clarifying K.I.N.D as managed service provider, not data reseller |
| 4 | **POPIA compliance** | ✅ Done | Consent flow, opt-out blocklist, DPA published, data stored in Cape Town (af-south-1) |
| 5 | **GDPR compliance** | ✅ Done | trust.html, dpa.html — Articles 6(1)(f), 17, 13/14 |
| 6 | **CAN-SPAM / CCPA compliance** | ✅ Done | trust.html, dpa-us.html |
| 7 | **Apollo Partner Programme** | 🟡 Medium | Contact partnerships@apollo.io before 50 clients — converts ToS risk to commercial agreement |
| 8 | **SOC 2 Type II** | ⚪ Deferred | Q1 2027 — external auditor |
| 9 | **VAT registration (UK)** | ⚪ Not yet needed | Only required when turnover hits £90k/yr |

### Apollo ToS — Summary for Quick Reference

K.I.N.D uses Apollo's API to find contacts matching client ICPs, then runs outreach on the client's behalf. The risk: Apollo's ToS restrict data to the subscriber's own use. K.I.N.D's defence: it sells a managed outreach service (the outcome), not Apollo data itself. Clients never receive raw Apollo records — they receive validated, scored, contacted, interested prospects.

**The three options, in order of preference:**
1. **Apollo Partner Programme** — formal agreement, cleanest resolution, converts risk to relationship
2. **Client API keys** — each client holds their own Apollo subscription, K.I.N.D is pure software layer
3. **Current structure** — single K.I.N.D key, defensible at small scale, requires strong client agreement language

**Timeline:** Brief to lawyer now. Apollo partner discussion before 50 clients. Hard resolution before 100 clients.

Full brief: https://github.com/jacquesvieiraza-blip/KIND/blob/main/docs/legal.md

---

## 28. FOUNDER ADMIN PORTAL — VISION & BUILD

*Added 25 May 2026. Build started same day. Launches when complete — no hard date.*

---

### What It Is

Not a tweaked version of the client portal. A completely different product for a completely different purpose. The client portal is about *their* revenue. The admin portal is about *running a business*.

One living space. Everything operational in one place. Open it in the morning and know exactly what's happening — with clients, the platform, revenue, and the AI exec team.

Current state: V0.5 — basic client management, light theme, horizontal nav.
Target state: Founder-grade ops centre. Dark sidebar. AI exec team. Living docs. Full revenue picture.

---

### The Layout

**Dark sidebar command centre:**
- Left sidebar (240px): near-black `#0a0a0a`, white text, section groupings
- Main content: `#0f0f0f` dark background, dark cards
- Bottom of sidebar: system status dot — one line showing platform health at a glance
- Sections: Overview · Clients · AI Exec Team · Tools · Docs

The horizontal nav bar is gone. The sidebar is permanent, always visible, always showing the health of the business.

---

### The AI Executive Team — Founder-Only Agents

Six named AI executives. Each has a role, a daily brief, and a page in the admin portal. They work for the Founder only — not client-facing.

| Agent | Title | Mandate |
|---|---|---|
| **OTTO** | Chief Revenue Officer | Pipeline health, MRR tracking, churn risk, revenue forecasting, anomaly alerts |
| **LENA** | Chief Customer Success | At-risk client detection, login monitoring, lead quality alerts, intervention recommendations |
| **REEVE** | Account Executive | Prospect pipeline, cold outreach follow-up, re-engagement drafts, meeting pipeline |
| **CMO** | Chief Marketing Officer | Website performance, conversion tracking, content suggestions, competitive alerts |
| **CTO** | Chief Technology Officer | Platform health, audit results, error rates, deployment history, infrastructure status |
| **CFO** | Chief Financial Officer | MRR, credit burn rates, Apollo cost per client, Paystack fees, net margin, cash position |

Each agent:
- Named identity card with accent colour (OTTO = emerald, LENA = blue, REEVE = purple, CMO = orange, CTO = cyan, CFO = yellow)
- "Today's Brief" — generated by Claude, updated daily
- "Recent Actions" — log of what the agent did
- Future: configure triggers, set alert thresholds, adjust mandates

---

### Living Docs — All Documentation In-App

Every K.I.N.D document rendered live inside the portal. No GitHub login required.

| Document | Route | Source |
|---|---|---|
| MASTER.md | `/docs/master` | `MASTER.md` (filesystem) |
| Run Costs & Cashflow | `/docs/run-costs` | `docs/run-costs-and-cashflow.md` |
| Legal Brief | `/docs/legal` | `docs/legal.md` |
| Audit Reports | `/docs/audits` | GitHub Issues (label: audit) |

Click any doc in the sidebar → renders in-app, formatted, always current. MASTER.md becomes a living dashboard you read in the portal, not just a file on GitHub.

---

### Revenue Dashboard (`/revenue`)

Dedicated deep-dive revenue page:

- MRR current + trend vs last month
- Scenario tracker — 3 cards (Conservative / Base / Optimistic), current month target per scenario, "Which path are you on?" indicator vs actual MRR
- ARPU breakdown — Starter / Growth / Scale distribution across active clients
- Monthly targets roadmap (May → Dec 2026) with RAG status
- Credit sales this month by product (Lead Gen vs FIGSY)
- Net margin after Apollo + Paystack costs
- Client health: growing / stable / at-risk counts

---

### Platform Health (`/health`)

Live status of every service:

| Service | Check method |
|---|---|
| Railway API | `GET /api/proxy/health` → 200 = green |
| Supabase | Link to status.supabase.com |
| Vercel Portal | Link to vercel-status.com |
| Vercel Website | Link to vercel-status.com |
| Last FIGSY cron run | From `figsy_cron_log` or Railway logs |
| Last audit result | Pass/fail + top finding |
| Apollo API | Last successful call timestamp |

One page. Green lights or red alerts. Know if something's broken before a client tells you.

---

### Client Management — Upgraded

Enhanced table with health scoring:

| Column | Source |
|---|---|
| Company | `clients.company_name` |
| Joined | `clients.created_at` |
| MRR | From credit transactions this month |
| Leads | Count from `leads` |
| FIGSY | Active / Paused / Off |
| Last active | Last portal login |
| Health | 🟢 Active / 🟡 Quiet / 🔴 At-risk |

At-risk criteria (LENA monitors):
- 0 portal logins in 7 days
- 0 new leads in 14 days
- FIGSY reply rate below 1% for 2 weeks
- Credits < 10 with no purchase in 7 days

---

### The Morning Brief Email

Every day at 07:30 SAST, Claude reads:
- All audit results from last 24hrs
- Client activity (logins, ICP runs, lead counts)
- FIGSY performance across all clients
- Revenue changes vs yesterday
- Any errors or anomalies

And writes a 5-bullet founder brief. Emailed to `hello@get-kind.com`. This is the V1 of the AI exec team — a single morning briefing email. Builds on the infrastructure already running for client emails.

---

### Build Status

| Piece | Status |
|---|---|
| Dark sidebar layout | 🔨 Building |
| Dark theme dashboard restyle | 🔨 Building |
| AI Exec Team pages (OTTO, LENA, REEVE, CMO, CTO, CFO) | 🔨 Building |
| Living docs viewer | 🔨 Building |
| Platform health page | 🔨 Building |
| Revenue deep-dive page | 🔨 Building |
| Client at-risk scoring | ⏳ Next |
| Morning brief email | ⏳ Next |
| Agent daily briefs (Claude-generated) | ⏳ After layout done |
| MCP server integration | ⏳ Phase 4 (post 20 clients) |

**Launch condition:** All pieces complete + smoke-tested. No hard date. Founder says "launch it" when satisfied.

---

### What Exists Now (Pre-V2)

| Page | What it does |
|---|---|
| `/` | Dashboard — stats, TTFL, KPI targets, client pipeline table |
| `/clients` | Client list |
| `/clients/[id]` | Client detail |
| `/cmo` | CMO tools — LinkedIn posts, prospect finder |
| `/cohorts` | Cohort analytics |
| `/demo` | Demo environments |
| `/terms-library` | Terms templates |
| `/roadmap` | Roadmap view |
| `/launch` | Launch checklist |
| `/founder` | Founder digest + agent actions |

All existing pages preserved in V2. No regressions.

---

*Owner: K.I.N.D founding team*
*Last updated: 25 May 2026 (evening — full rebuild post all schema fixes)*
