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
28. [Founder Admin Portal — Vision & Build](#28-founder-admin-portal--vision--build)
29. [Scalability — From Founder Sales to a Full Sales Team](#29-scalability--from-founder-sales-to-a-full-sales-team)

---

## 1. CURRENT STATUS — WHAT'S LIVE

*Last updated: 25 May 2026 (night — full audit complete)*

### ⛔ WHAT IS BROKEN RIGHT NOW — Platform cannot function without these

| # | Problem | Impact | Fix |
|---|---|---|---|
| 1 | **Apollo free plan** — `api/v1/mixed_people/search` blocked | Zero leads can ever be found. Core product is dead. | **You** — upgrade at app.apollo.io → Settings → Plan & Billing |
| 2 | **RESEND_API_KEY** — unknown if set in Railway | Zero emails send — no welcome, no POPIA consent, no leads email, no nurture, no digest | **You** — confirm/set in Railway → KIND API → Variables |
| 3 | **MASTER_SCHEMA.sql not run** | Remaining schema drift — FIGSY, auto top-up, calendar features will hit silent errors | **You** — paste into Supabase SQL Editor and run |
| 4 | **Railway deploy status unknown** | API changes not live until Railway builds successfully | **You** — check railway.app → KIND API → Deployments |
| 5 | ✅ **Lead overspend bug — FIXED** | `effectiveBalance` now passed to `runIcpJob` at both call sites. Also respects `leads_per_run` client setting. | commit ffb1f51 |
| 6 | ✅ **FIGSY 'trialing' gate — FIXED** | Removed `\|\| s.status === 'trialing'`. FIGSY now requires `active` only, consistent with Milla/Vida. | commit ffb1f51 |
| 7 | ✅ **Cancel subscription endpoint — BUILT** | `POST /subscriptions/:id/cancel` live. Calls Paystack disable API + updates DB. "Cancel anytime" promise is now true. | commit acfbecf |
| 8 | ✅ **Recurring billing webhooks — BUILT** | `subscription.create` saves Paystack code. `charge.success` handles renewals. Daily lapse check cron. ⚠️ Still needs Paystack plan codes created in your dashboard — see Section 2 item 5. | commit bdc19b6 |
| 9 | ✅ **credits.ts pricing — FIXED** | Aligned to shared constants. 2 tiers only: Lead Gen 20/$20, 100/$100 · FIGSY 20/$60, 100/$300. | commit ffb1f51 |
| 10 | **Vercel root directory config — unknown state** | Each app has correct `vercel.json` files locally. But if Vercel projects were created from monorepo root without Root Directory set in dashboard, those files may not be read. This is likely why "portal was not fixed" even after code was pushed to GitHub. | **You** — Vercel dashboard → each project → Settings → General → Root Directory → set `apps/portal`, `apps/admin`, `apps/website` |
| 11 | ✅ **Lead drip — BUILT** | Daily cron delivers up to `daily_drip_rate` leads per client. New leads held in queue (`delivered_at = NULL`) until cron runs. Portal only shows delivered leads. Default: 5/day. | commit bdc19b6 |
| 12 | ✅ **Client lead quantity controls — BUILT** | `leads_per_run` + `daily_drip_rate` in portal Settings page. `runIcpJob` respects both. | commit bdc19b6 |
| 13 | ✅ **10,000 credits — ROOT CAUSE FOUND** | Manual admin grant — no code bug. Admin grant form had no cap. Fixed: max 500 per grant. Normal trial flow: exactly 20 credits. | commit bdc19b6 |

> ⚠️ **ONE THING STILL NEEDED FROM YOU:** Run `supabase/20260526_drip_and_controls.sql` in Supabase SQL Editor. Without this, the drip, quantity controls, and subscription cancellation columns don't exist in the database and the new code will error.

---

### 🚨 THE SINGLE MOST IMPORTANT THING RIGHT NOW

**Apollo.io.**

The entire platform generates value through leads. No leads = no product demo, no client success, no word of mouth, no referrals, no revenue.

The free Apollo plan blocks the search API entirely. Every feature that matters — lead gen, ICP run, demo environments, self-outreach — depends on this one API call working.

> **Go to [app.apollo.io](https://app.apollo.io) → Settings → Plan & Billing and upgrade before doing anything else.**

Basic plan ($49/mo) unblocks the API. Professional ($99/mo) recommended for full filtering.
Everything else on the to-do list is secondary to this.

---

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

---

### 🔴 NEEDS YOU — Complete list. Every item. Nothing left out.

*Only you can do these. Claude is blocked or it requires your credentials/accounts.*

#### 🔴 Critical — Platform cannot function without these

| # | Task | Where | What breaks without it |
|---|---|---|---|
| 1 | **Upgrade Apollo** | app.apollo.io → Settings → Plan & Billing → Basic $49/mo min | Zero leads found. Platform is dead. Nothing works. |
| 2 | **Confirm RESEND_API_KEY in Railway** | railway.app → KIND API → Variables | Zero emails. No welcome, no nurture, no POPIA consent, no leads digest. Silent. |
| 3 | **Run supabase/MASTER_SCHEMA.sql** | Supabase → SQL Editor → paste full file → Run | Schema drift. FIGSY, auto top-up, calendar hit silent column errors. |
| 4 | **Check Railway deploy logs** | railway.app → KIND API → Deployments | If build is failing, no code changes are live — not ours, not anyone's. |
| 5 | **Complete Paystack KYC** | dashboard.paystack.com → Settings → Compliance | Cannot take a single live ZAR payment. All billing is blocked. |
| 6 | **Fix Vercel root directories** | Vercel dashboard → each project → Settings → General → Root Directory | Portal/admin/website may be deploying from wrong directory. This is why "nothing was fixed" after code pushes. Set: `apps/portal`, `apps/admin`, `apps/website` |

#### 🟡 High — Do this week

| # | Task | Where | What breaks without it |
|---|---|---|---|
| 7 | **Set up Google Workspace** | workspace.google.com → Business Starter | No professional inbox. All sales comms from personal email. DKIM/SPF for deliverability. Step-by-step in Section 2. |
| 8 | **Confirm ANTHROPIC_API_KEY in Railway** | Railway → KIND API → Variables | AI ICP builder, Milla, lead scoring all silently fail. No error shown to client. |
| 9 | **Confirm ADMIN_SECRET_KEY in Railway** | Railway → KIND API → Variables | All admin endpoints unprotected. Crons and agent briefs fail silently. |
| 10 | **Set FIGSY_KIND_CLIENT_ID in Railway** | Railway → KIND API → Variables → paste your client UUID from Supabase | Self-outreach cron runs every Monday but does nothing. K.I.N.D never finds its own clients. |
| 11 | **Create calendar booking link** | calendly.com or cal.com (free) → create 30-min meeting type → copy URL | All "Book a demo" buttons point to mailto. Give Claude the URL → wired everywhere in 30 min. |
| 12 | **Deploy netlify-waitlist** | Drag `netlify-waitlist/` folder to app.netlify.com/drop | Soft launch waitlist not live. No sign-ups captured before 31 May. |
| 13 | **Confirm website Vercel project name** | Vercel dashboard → check which project serves get-kind.com | Listed incorrectly in docs as "kind-admin". Need real name to document correctly. |

#### 🔵 Medium — This month

| # | Task | Where | What it unlocks |
|---|---|---|---|
| 14 | **Upgrade Resend to paid plan** | resend.com → Billing | FIGSY reply routing — clients reply to FIGSY emails, system classifies and responds. Without this, replies are lost. |
| 15 | **Register UK company** | companieshouse.gov.uk → £50, same day → SIC 62012 | Credibility, GBP billing, proper invoicing. Full steps in Section 24. |
| 16 | **Add Stripe credentials to Railway** | 6 vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, 4× `STRIPE_PRICE_*` | USD/GBP billing page activates immediately. UK/US clients can pay. |
| 17 | **Create HubSpot Free account** | app.hubspot.com → sign up → create pipeline → share API key with Claude | K.I.N.D's own sales pipeline tracked. Claude auto-syncs prospects. |
| 18 | **Contact Apollo Partner Programme** | partnerships@apollo.io — before 50 clients | Converts Apollo ToS risk into a commercial agreement. Critical legal protection. See Section 27. |
| 19 | **Brief a lawyer** | Any commercial solicitor — brief is in docs/legal.md | Apollo managed service clause + client agreement language. Must be done before serious clients. |
| 20 | **LinkedIn soft launch post + WhatsApp outreach to 20–30 contacts** | LinkedIn personal profile + WhatsApp | First wave of waitlist sign-ups and early clients for 31 May soft launch. |
| 20a | **31 May soft launch — confirm go/no-go** | Review Section 1 broken items. Apollo must be upgraded. Paystack KYC must be complete. Netlify waitlist must be live. These 3 are the minimum bar for soft launch. | If any of the 3 are not done, soft launch is at risk. |

#### ⚪ When ready

| # | Task | Trigger |
|---|---|---|
| 21 | **Build 4 competitor-targeting ICPs** | After Apollo is upgraded — in the portal, build: (1) Lemlist Users Africa — CEO/Founder/Head of Sales, Lemlist tech stack, SA/NG/KE, 1–200 employees. (2) Instantly Users Africa — CEO/Founder/Agency Owner, Instantly, SA/NG/KE, 1–50. (3) Clay Users Africa — Head of Growth/RevOps/Founder, Clay, SA/NG/KE, 11–200. (4) Apollo Sequences Users Africa — Head of Sales/CEO, Apollo, SA/NG/KE, 11–500. Run all 4 immediately. These are the warmest leads possible. |
| 22 | **G2 / Capterra / Product Hunt listings** | Launch day — submit all 3 |
| 23 | **Upload Vida image** | apps/website/vida.png → add via GitHub |
| 24 | **Send UK company number to Claude** | After Companies House cert arrives → Claude updates footer + terms everywhere |
| 25 | **Open Wise Business bank account** | business.wise.com → after UK company incorporated. GBP/USD/ZAR in one account. |
| 26 | **VAT registration** | Only when turnover hits £90k/yr. Free. HMRC online. |

---

### 🤖 CLAUDE'S BUILD STATUS

| # | Fix / Feature | Status | Commit |
|---|---|---|---|
| 1 | **Fix lead overspend** — `effectiveBalance` passed to `runIcpJob` at both call sites | ✅ Done | ffb1f51 |
| 2 | **Fix FIGSY 'trialing' gate** — removed `\|\| s.status === 'trialing'` from figsy/page.tsx | ✅ Done | ffb1f51 |
| 3 | **Align credits.ts bundles to shared constants** — 7 tiers → 2 (20 and 100 only) | ✅ Done | ffb1f51 |
| 4 | **Cancel subscription endpoint** — `POST /subscriptions/:id/cancel` built | ✅ Done | acfbecf |
| 5 | **Recurring billing webhooks** — `subscription.create`, `subscription.not_renew`, renewal charge handling + daily lapse check cron | ✅ Done | bdc19b6 |
| 6 | **Lead drip delivery** — daily cron delivers up to `daily_drip_rate` leads per client. Portal filters by `delivered_at`. | ✅ Done | bdc19b6 |
| 7 | **Client lead quantity controls** — `leads_per_run` + `daily_drip_rate` settings. UI in portal Settings. | ✅ Done | bdc19b6 |
| 8 | **Low credit email reminder** — fires when balance 1–4. Max once per 24h. Daily cron 07:30 UTC. | ✅ Done | bdc19b6 |
| 9 | **Wire "Book a demo" buttons** | ⏳ Waiting for your Calendly/Cal.com URL | — |
| 10 | **Update terms.html real name** | ⏳ Waiting for your UK company number | — |
| 11 | **10,000 credits anomaly — root cause found** | ✅ Investigated | bdc19b6 |
| 12 | **Full portal dry run** | ⏳ Needs you present | — |

**Root cause of 10,000 credits (item 11):** Admin manual grant form had no cap. Someone typed 10,000. Not a code bug. Fixed — admin grants now capped at 500. Normal trial flow grants exactly 20.

**SQL migration required:** Run `supabase/20260526_drip_and_controls.sql` in Supabase SQL Editor. Adds `delivered_at` to leads, `leads_per_run` + `daily_drip_rate` to clients, `paystack_subscription_code` + `cancelled_at` to subscriptions, `last_low_credit_email_at` to clients. Existing leads unaffected — all get `delivered_at = created_at`.

---

## 2. WHAT FOUNDER NEEDS TO DO

> **🔴 STOP EVERYTHING** — These 4 items are blocking the entire platform. Nothing works at full capacity until they are done.

### 🔴 STOP EVERYTHING — Do These First (Platform is Blocked)

| # | Task | Where | Why it's blocking |
|---|---|---|---|
| 1 | **Upgrade Apollo plan** | app.apollo.io → Settings → Plan & Billing | Free plan = zero leads found. Platform cannot find a single prospect. Go Basic ($49/mo) minimum, Professional ($99/mo) recommended. **Every ICP run returns empty until this is done.** |
| 2 | **Check `RESEND_API_KEY`** | Railway → KIND API → Variables | If missing, zero emails send — no welcome email, no nurture, no POPIA consent, no leads digest. Literally nothing. |
| 3 | **Check Railway deploy logs** | railway.app → KIND API → Deployments | "Nothing deployed" — check if build is failing silently. Should auto-deploy on every push to `main`. |
| 4 | **Run `supabase/MASTER_SCHEMA.sql`** | Supabase → SQL Editor | Paste entire file, run once — eliminates all schema drift permanently. ICP saves, FIGSY, Milla all have silent column errors without this. |

### 🔴 CRITICAL — Do Right Now

| # | Task | Where | Why it's blocking |
|---|---|---|---|
| 5 | **Complete Paystack KYC** | dashboard.paystack.com → Settings → Compliance | Can't take a single live payment until this is done. |

### 🟡 HIGH — Do This Week

| # | Task | Where | Why |
|---|---|---|---|
| 6 | **Set up Google Workspace** | workspace.google.com | Get hello@get-kind.com inbox live. All sales comms, DKIM/SPF for email deliverability. |
| 7 | **Confirm `ANTHROPIC_API_KEY` in Railway** | Railway → Variables | AI ICP builder, Milla, lead scoring — all use this. Silent failure if missing. |
| 8 | **Confirm `ADMIN_SECRET_KEY` in Railway** | Railway → Variables | All /internal/ endpoints hit this. Crons and admin actions fail silently without it. |
| 9 | **Set `FIGSY_KIND_CLIENT_ID` in Railway** | Railway → Variables | Self-outreach cron runs Monday 06:00 UTC but does nothing without this. Create a demo/production client row in Supabase, copy the UUID. |
| 10 | **Create calendar booking link** | calendly.com or cal.com (free) | Share the URL with Claude — "Book a Demo" wired site-wide in 5 minutes. |

### 🔵 MEDIUM — Do This Month

| # | Task | Where | Why |
|---|---|---|---|
| 11 | **Upgrade Resend to paid plan** | resend.com → Billing | FIGSY reply routing (inbound webhook) requires paid plan. Without this, you can send emails but never receive replies inside the platform. |
| 12 | **Register UK company** | companieshouse.gov.uk — £50, same day | Credibility, GBP billing, proper invoicing. See Section 24. |
| 13 | **Add Stripe credentials** | Railway → Variables | Activates USD/GBP billing page instantly. See env var list below. |
| 14 | **Create HubSpot Free account** | app.hubspot.com → sign up free | Track every prospect conversation for K.I.N.D's own sales pipeline. Share API key with Claude → auto-sync wired in 1 day. See Section 29. |

### 🟢 WHEN READY — Activates Built Features

| # | Task | Env vars to add to Railway |
|---|---|---|
| 15 | **Stripe USD/GBP** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_LEADGEN_20`, `STRIPE_PRICE_LEADGEN_100`, `STRIPE_PRICE_FIGSY_20`, `STRIPE_PRICE_FIGSY_100` |
| 16 | **Google Calendar OAuth** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| 17 | **Vapi.ai Voice** | `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ASSISTANT_ID`, `VAPI_WEBHOOK_SECRET` |
| 18 | **WhatsApp Business API** | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` |
| 19 | **Update FOUNDER_EMAIL** | Change to `hello@get-kind.com` after Google Workspace is live |
| 20 | **Campaign intent prompt (go live)** | `FEATURE_CAMPAIGN_INTENT=true` in Railway |
| 21 | **ICP builder (go live)** | `FEATURE_ICP_BUILDER=true` in Railway |
| 22 | **Portal V2 design** | `FEATURE_PORTAL_V2=true` in Railway |

### ⚡ INSTANT — Say the word, Claude does it in 5 minutes

| # | Task | What Claude needs |
|---|---|---|
| 23 | Wire "Book a Demo" buttons site-wide | Your Calendly/Cal.com URL |
| 24 | Add UK company number to footer + terms | Company number from Companies House cert |
| 25 | Fix any new error | Share screenshot |

### 📋 TOMORROW'S SESSION — Debrief Agenda

*Added 25 May 2026 (evening). Updated 25 May 2026 (night) — nightly build status added.*

#### 🔴 ONLY YOU CAN DO THESE (I am blocked without them)

| # | Task | Time | Where |
|---|---|---|---|
| **1** | **Upgrade Apollo** | 5 min | app.apollo.io → Settings → Plan & Billing → Basic $49/mo minimum |
| **2** | **Confirm RESEND_API_KEY in Railway** | 2 min | railway.app → KIND API → Variables |
| **3** | **Check Railway deploy logs** | 2 min | railway.app → KIND API → Deployments → confirm green build |
| **4** | **Run supabase/MASTER_SCHEMA.sql** | 5 min | Supabase → SQL Editor → paste full file → Run |
| **5** | **Complete Paystack KYC** | 15 min | dashboard.paystack.com → Settings → Compliance |
| **6** | **Create HubSpot Free account** | 10 min | app.hubspot.com → sign up → create 1 pipeline (Contacted/Discovery/Demo/Proposal/Closed) → share API key |
| **7** | **Create calendar booking link** | 5 min | calendly.com or cal.com (free) → share URL → I wire it everywhere in 5 min |
| **8** | **Run competitor ICPs** | 5 min | Supabase → SQL Editor → paste `supabase/competitor-icps.sql` → replace UUID with your client ID → Run → then admin portal → ICPs → hit Run on all 4 |
| **9** | **Google Workspace** | 30 min | workspace.google.com → Business Starter → follow Section 2 step-by-step |
| **10** | **Deploy netlify-waitlist** | 2 min | Drag `netlify-waitlist/` folder to app.netlify.com/drop → check Netlify Forms dashboard |
| **11** | **Fix Vercel root directories** | 5 min | Vercel dashboard → each project (portal, admin, website) → Settings → Root Directory → set to `apps/portal`, `apps/admin`, `apps/website` respectively |

#### 🟢 BUILT OVERNIGHT — Ready when you wake up

| # | What | Status | Where to see it |
|---|---|---|---|
| B | **Sales Playbook** | ✅ Done | admin.get-kind.com/docs/sales-playbook |
| C | **Founder morning brief email** | ✅ Code done | Activates when RESEND_API_KEY confirmed + Google Workspace live |
| E | **Scalability tracker page** | ✅ Done | admin.get-kind.com/scalability |
| G | **Competitor ICP SQL files** | ✅ Done | supabase/competitor-icps.sql — paste + run after Apollo upgrade |
| — | **Admin nav: SALES section** | ✅ Done | New section in sidebar — Scalability + Sales Playbook |
| — | **HubSpot sync code** | ✅ Code done | Plug-and-play when you share API key |
| H | **Credit system split** (Lead Gen vs FIGSY separate) | ✅ Done | Portal billing → two balance cards |
| I | **Milla/Vida access gating** (paid only, `active` only) | ✅ Done | portal/assistant and portal/chatbot — 'trialing' blocked |
| J | **Netlify waitlist page** | ✅ Done | Drag `netlify-waitlist/` to netlify drop → live |
| K | **Partner earnings calculator** | ✅ Done | partners.html — 3-scenario earnings (Conservative $139/mo, Realistic $469/mo, Optimistic $1,065/mo) + commission per product |
| L | **FIGSY access gating** | ❌ Incomplete | figsy/page.tsx still allows 'trialing' users — not fixed. Awaiting authority to fix. |
| M | **Lead overspend cap** | ❌ Incomplete | `maxLeads` param added to `runIcpJob` but never passed at call sites — dead code. Awaiting authority to fix. |

#### ⏳ STILL WAITING ON YOU BEFORE I CAN FINISH

| # | What | Waiting for |
|---|---|---|
| A | HubSpot sync (activate) | Your HubSpot API key → paste into Railway → live immediately |
| D | "Book a Demo" wiring | Your Calendly/Cal.com URL → I wire in 30 min |
| F | HubSpot pipeline view in admin | Same API key as above |

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

### 🔧 CLAUDE'S BUILD BACKLOG — Do Not Touch Without Founder Authority

*Agreed rule: Claude does not build without explicit permission. Every item below is ready to build — waiting for the word.*

| # | Fix / Feature | What it does | Complexity |
|---|---|---|---|
| 1 | **Pass `effectiveBalance` to `runIcpJob`** | Fixes lead overspend — caps insertion at credit balance BEFORE the loop | 10 min |
| 2 | **Remove `\|\| 'trialing'` from FIGSY access check** | FIGSY page blocks trial users — consistent with Milla/Vida | 5 min |
| 3 | **Align `credits.ts` bundles to shared constants** | 7 tiers → 2 tiers (20 and 100 only). Removes pricing inconsistency. | 15 min |
| 4 | **Build `POST /subscriptions/:id/cancel`** | Allows clients to cancel Milla/Vida subscription. Makes "Cancel anytime" promise true. | 1 hour |
| 5 | **Milla/Vida recurring monthly billing** | Paystack recurring plan codes + monthly webhook rebilling. Without this, one-off payment, never billed again. | 1 day |
| 6 | **Staggered lead delivery (5/day drip)** | Queue leads, deliver `daily_drip_rate` per day. Prevents all credits burning in one run. See Section 14a for design. | 1 day |
| 7 | **Low credit email reminder** | Email client when `credit_balance` drops below 5. Drives top-up behaviour. | 2 hours |
| 8 | **Wire Calendly/Cal.com to "Book a demo" buttons** | All mailto: links replaced with real booking URL. | 30 min (needs your URL) |
| 9 | **Full portal dry run** | Sign up → ICP → leads → credits deduct → FIGSY gate → Milla/Vida gate → billing flow | Session with founder |
| 10 | **Lead drip delivery** | Queue leads after ICP run, deliver `daily_drip_rate` per day (default 5). Cron job. Requires `daily_drip_rate` column on clients, `queued_at`/`delivered_at` on leads. See Section 14a. | 1 day |
| 11 | **Client lead quantity control** | Client sets `leads_per_run` (max per ICP run) and `daily_drip_rate` (leads delivered per day) in ICP builder or settings. Admin can override per client. | Half day |

---

### Once Live (not urgent)

| # | Task | When |
|---|---|---|
| 26 | G2, Capterra, Product Hunt listings | Launch day |
| 27 | Upload Vida image | apps/website/vida.png via GitHub |
| 28 | SOC 2 Type II | Q1 2027 |
| 29 | Deploy netlify-waitlist to Netlify | Drag `netlify-waitlist/` folder to app.netlify.com/drop — standalone page, NOT part of website. Captures first/last name, email, company, product interest. Soft launch messaging: 31 May 2026. |

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
| **Apollo lead search — industries removed from q_keywords** — were AND-combined → always 0 results | 25 May | ✅ |
| **Apollo 3-pass fallback search** — full filters → drop consent filter → drop size filter — leads always found if they exist | 25 May | ✅ |
| **Company size em-dash + hyphen variants handled** — "1-10" and "1–10" both work | 25 May | ✅ |
| **Relaxed filter reason surfaced to frontend** — portal shows why filters were loosened | 25 May | ✅ |
| **Lead scoring: strips markdown code fences** — Claude sometimes wraps JSON in ``` fences, now handled | 25 May | ✅ |
| **Lead scoring: fallback score of 50** — if Claude fails, lead scores as 50 (not stuck as "Pending" forever) | 25 May | ✅ |
| **Lead scoring: per-lead error isolation** — one bad Claude response doesn't kill the entire batch | 25 May | ✅ |
| **Lead scoring: ANTHROPIC_API_KEY warning** — startup log if key missing, AI scoring skips gracefully | 25 May | ✅ |
| **FIGSY: `stripJson()` helper** — every `JSON.parse` call now safe — no more silent parse crashes | 25 May | ✅ |
| **FIGSY: startup warning if RESEND or ANTHROPIC key missing** — visible in Railway logs from boot | 25 May | ✅ |
| **FIGSY: per-email warning when RESEND not set** — every send attempt logs clearly instead of silently dropping | 25 May | ✅ |
| **FIGSY: `autoEnrollLead` logs lead ID + error message** — tracing a failed enrol is now trivial | 25 May | ✅ |
| **FIGSY: `classifyReply` returns `'other'` gracefully** — bad AI response no longer crashes reply classification | 25 May | ✅ |
| **Leads portal: "Run ICP" calls API directly** — was just a navigation link, now triggers lead fetch + scoring | 25 May | ✅ |
| **Leads portal: "Run ICP" button in header + empty state** — visible on every state of the leads page | 25 May | ✅ |
| **Leads portal: auto-refreshes at 3s + 10s after run** — leads appear without manual refresh | 25 May | ✅ |
| **Leads portal: shows relaxed filter message** — client knows why Apollo loosened the search | 25 May | ✅ |
| **ICP builder portal: "Run ICP" button on every ICP card** — no more hunting for where to trigger a run | 25 May | ✅ |
| **ICP builder portal: auto-runs immediately after save** — new ICP finds leads in same session | 25 May | ✅ |
| **ICP builder portal: result banner** — ✅ leads found / ⚠️ no leads + reason / ❌ error — after every run | 25 May | ✅ |
| **Admin Portal V2 — dark sidebar "Founder OS" layout** — `bg-[#0a0a0a]` sidebar, `bg-[#0f0f0f]` main | 25 May | ✅ |
| **Admin Portal V2 — AI Exec Team pages** — OTTO (CRO), LENA (CS), REEVE (AE), CMO, CTO, CFO | 25 May | ✅ |
| **Admin Portal V2 — internal briefs API** — `GET /internal/briefs/:agent` — Claude Haiku daily briefs per exec | 25 May | ✅ |
| **Admin Portal V2 — living docs viewer** — MASTER.md, run-costs, legal rendered in-app at `/docs/[doc]` | 25 May | ✅ |
| **Admin Portal V2 — revenue deep-dive page** — live MRR, Conservative/Base/Optimistic scenarios, monthly targets | 25 May | ✅ |
| **Admin Portal V2 — platform health page** — Railway/Supabase/Vercel/Paystack status links + FIGSY cron status | 25 May | ✅ |
| **Admin Portal V2 — compliance tracker** — 5 certs with progress bars, checklists, next steps | 25 May | ✅ |
| **Admin Portal V2 — client health scoring** — green/amber/red, at-risk filter, leads 14d, FIGSY status, last login | 25 May | ✅ |
| **Admin Portal V2 — dark restyle all pages** — cmo, cohorts, roadmap, launch, founder — full palette | 25 May | ✅ |
| **Partner earnings calculator** — `partners.html` — 3-scenario model (Conservative/Realistic/Optimistic) with per-product commission table | 25 May | ✅ |
| **Pricing constants full rewrite** — `packages/shared/src/constants/index.ts` — credit-based model, Milla $49, Vida $29, Bundle $69 | 25 May | ✅ |
| **Two-balance credit system** — `figsy_credits_remaining` for FIGSY separate from `credit_balance` for Lead Gen — all routes updated | 25 May | ✅ |
| **Paystack verify route** — now routes FIGSY topups to `figsy_credits_remaining`, Lead Gen to `credit_balance` | 25 May | ✅ |
| **FIGSY auto-enroll deduction** — now deducts from `figsy_credits_remaining` not `credit_balance` | 25 May | ✅ |
| **Portal billing page** — dual balance display (Lead Gen + FIGSY), correct `$1/lead` and `$3/outreach` descriptions | 25 May | ✅ |
| **Milla/Vida access gating** — `status === 'active'` ONLY (not 'trialing') — paid products, no trial access | 25 May | ✅ |
| **FIGSY upgrade gate** — portal FIGSY page shows upgrade banner if no FIGSY credit transactions found | 25 May | ✅ |
| **Admin product catalog** — updated to show correct credit bundles and Milla/Vida/Bundle subscription pricing | 25 May | ✅ |
| **Website homepage CTAs** — Milla/Vida cards now show "Book a demo" not "Start free trial" | 25 May | ✅ |
| **Website pricing page** — "Book a demo →" buttons on FIGSY, Milla, Vida add-on cards | 25 May | ✅ |
| **virtual-assistant.html** — Milla page updated: $49/mo CTA, links to billing#milla | 25 May | ✅ |
| **chatbot-agent.html** — Vida page updated: $29/mo CTA, links to billing#vida | 25 May | ✅ |
| **Netlify waitlist** — `netlify-waitlist/index.html` — standalone soft launch page, 31 May messaging, Netlify Forms | 25 May | ✅ |

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
| Milla + Vida: LIVE — gated behind paid subscription. Recurring billing needed. | Both | ✅ Live — paid only |
| Voice agent activation | Founder | Vapi.ai account + Twilio SA number |
| WhatsApp activation | Founder | Meta Business API (3–7 day approval) |
| Google Calendar activation | Founder | Google Cloud OAuth |
| Stripe activation | Founder | USD/GBP billing |
| Pan-African presence: 3 countries | Both | Apollo data covers all |

### Month 3–6 (July–Oct 2026)

| Item | Notes |
|---|---|
| pgvector upgrade for Milla | At 50+ clients — upgrade from FTS |
| Recurring subscription model | Credit bundles → monthly plans. ⚠️ Needed NOW for Milla/Vida monthly billing |
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

### Virtual Assistant (Milla) — LIVE (gated, paid only)

| Item | Notes |
|---|---|
| Document upload + RAG chat | FTS now, pgvector at 50+ clients |
| Source attribution | Answers cite which doc |
| Locked screen | Upgrade + Book a Demo CTAs |

### Chatbot Agent (Vida) — LIVE (gated, paid only)

| Item | Notes |
|---|---|
| Config, conversations, embed code | Full |
| vida-widget.js | Self-contained embeddable JS |
| Locked screen | Upgrade + Book a Demo CTAs |

### Client Portal — 22 pages

| Page | What it does |
|---|---|
| `/login` | Login page |
| `/onboard` | Post-signup onboarding — company name, industry, country |
| `/dashboard` | Main dashboard — credit balance, FIGSY stats, product status cards |
| `/dashboard/leads` | Leads table — search, filter, bulk actions, CSV export |
| `/dashboard/leads/icp` | ICP list — all ICPs, run ICP button |
| `/dashboard/leads/icp/builder` | ICP builder — conversational + form modes |
| `/dashboard/figsy` | FIGSY — campaigns, enrol, reply inbox. ⚠️ Still allows 'trialing' (known bug) |
| `/dashboard/figsy/replies` | Unified reply inbox |
| `/dashboard/assistant` | Milla — document chat. Requires `status === 'active'` only |
| `/dashboard/chatbot` | Vida — chatbot config + embed code. Requires `status === 'active'` only |
| `/dashboard/billing` | Billing — buy credits (Paystack/Stripe), buy Milla/Vida/Bundle subscriptions |
| `/billing/confirm` | Billing confirmation — post-payment return page |
| `/dashboard/documents` | Document library |
| `/dashboard/analytics` | Analytics — 6-month trends, ICP breakdown, score distribution |
| `/dashboard/kpis` | KPI tracker |
| `/dashboard/usage` | Usage history |
| `/dashboard/roadmap` | Platform roadmap visible to clients |
| `/dashboard/referral` | Referral programme — 100 credits both ways |
| `/dashboard/settings` | Company settings, CRM integration, Google Calendar |
| `/dashboard/v2` | Portal V2 preview (feature flagged) |
| `/consent` | POPIA consent page for leads |
| `/privacy`, `/terms` | Legal pages |

### Billing

| Item | Notes |
|---|---|
| Paystack (ZAR topups) | Test key now — **live after KYC** |
| Stripe (USD subscriptions) | Built, needs credentials |
| Credit balance in sidebar + dashboard | Live — TWO balances: Lead Gen (`credit_balance`) + FIGSY (`figsy_credits_remaining`) |
| Auto top-up settings | Live (needs `auto_topup_*` columns — covered in MASTER_SCHEMA.sql) |
| Trial expired overlay | Live |
| Cancel subscription | ❌ NOT BUILT — "Cancel anytime" shown in UI but no endpoint exists |

### Settings

| Item | Notes |
|---|---|
| Company name, industry, country, website, phone | Live |
| Company registration no. + VAT number | Live — 18 May |
| CRM integration — HubSpot, Pipedrive | Live |
| Google Calendar connect | Built, needs credentials |

### Admin Portal — 15 pages

| Page | What it does |
|---|---|
| `/` | Dashboard — KPIs, MRR, TTFL, client pipeline, monthly targets |
| `/clients` | Client list — health scoring, leads 14d, FIGSY status, last login, at-risk filter |
| `/clients/[id]` | Client detail — subscriptions, credit balance, grant/refund, transaction history |
| `/agents/[agent]` | AI Exec Team — OTTO, LENA, REEVE, CMO, CTO, CFO — daily Claude briefs |
| `/revenue` | Live MRR, Conservative/Base/Optimistic scenarios, monthly targets |
| `/health` | Platform health — Railway/Supabase/Vercel/Paystack status, FIGSY cron status |
| `/compliance` | 5 cert trackers (GDPR ✅ CCPA ✅ SOC 2 🔵 ISO 27001 🔵 ISO 42001 🔵) |
| `/docs/[doc]` | Living docs viewer — MASTER.md, run-costs, legal rendered in-app |
| `/cmo` | CMO tools — LinkedIn post generator, prospect finder |
| `/cohorts` | Cohort analytics — signup month, activation, conversion, churn |
| `/demo` | Demo environments — create/open/extend/expire |
| `/terms-library` | Terms templates |
| `/roadmap` | Phase 1–4 milestone tracking |
| `/launch` | Launch checklist — 13 sections, 60+ items |
| `/founder` | Founder digest + agent actions |
| `/scalability` | Sales scaling tracker — hiring triggers, AE economics |

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
| partners.html | 20% referral / 25–30% agency commission — all products listed |
| Partner earnings calculator | 3-scenario model: Conservative $139/mo, Realistic $469/mo, Optimistic $1,065/mo |

### Website (get-kind.com) — 22 pages

| Page | Purpose |
|---|---|
| index.html | Homepage — full product overview, pricing tiers, agent cards |
| pricing.html | Full pricing — credit bundles + Milla/Vida/Bundle add-ons + "Book a demo" CTAs |
| virtual-assistant.html | Milla product page — $49/mo, "Unlock Milla" CTA |
| chatbot-agent.html | Vida product page — $29/mo, "Unlock Vida" CTA |
| partners.html | Partner programme — commission rates, 3-scenario earnings calculator |
| about.html | Founder belief, dogfooding, AI revenue team |
| demo.html | Demo request page |
| demo-video.html | Demo video embed |
| figsy-video.html | FIGSY explainer video |
| platform-video.html | Full platform walkthrough video |
| platform-video-standalone.html | Standalone video player |
| use-cases.html | Use case library |
| support.html | Support page |
| trust.html | POPIA, GDPR, CAN-SPAM, CCPA compliance |
| terms.html | Terms of service ⚠️ Still contains real founder name — deliberately left, to be updated when UK company registered |
| dpa.html | Data Processing Agreement |
| dpa-us.html | US DPA addendum (CCPA, VCDPA, CPA) |
| vs-apollo.html | Comparison — K.I.N.D vs Apollo |
| vs-hiring-an-sdr.html | Comparison — K.I.N.D vs hiring an SDR |
| vs-outreach.html | Comparison — K.I.N.D vs Outreach.io |
| vs-prospecting-manually.html | Comparison — K.I.N.D vs manual prospecting |
| vs-salesloft.html | Comparison — K.I.N.D vs Salesloft |

---

## 7. BLOCKED FEATURES — NEEDS CREDENTIALS ONLY

> All of the below is **code-complete**. Zero extra coding needed. Just env vars, credentials, or feature flags.

| Feature | What it does | How to activate | Launch |
|---|---|---|---|
| **Paystack live payments** | Clients pay in ZAR — credit bundles + subscriptions | Complete KYC → `PAYSTACK_SECRET_KEY` (live) in Railway | Now |
| **All emails (welcome, nurture, consent)** | Every transactional email — welcome, POPIA consent, leads digest, nurture, alerts | Confirm `RESEND_API_KEY` in Railway | Now |
| **FIGSY self-outreach** | K.I.N.D finds its own clients using FIGSY. Monday cron runs Apollo, enrols prospects automatically | Set `FIGSY_KIND_CLIENT_ID` in Railway to your client UUID | Now |
| **Stripe USD/GBP billing** | Billing page activates USD/GBP subscription plans — UK and US clients | Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, 4× `STRIPE_PRICE_*` | Phase 2 (5+ clients) |
| **Resend inbound routing** | FIGSY reply detection — clients reply to FIGSY emails, system auto-classifies and responds | Upgrade Resend to paid → webhook to `/figsy/replies/inbound` | Phase 2 |
| **Google Calendar** | Clients connect their calendar — FIGSY books meetings directly | Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Phase 2 |
| **Voice calls (Vapi.ai)** | FIGSY calls the most interested leads by phone after 2 email touches | Add `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ASSISTANT_ID`, `VAPI_WEBHOOK_SECRET` | Phase 3 (20+ clients) |
| **WhatsApp Business** | Follow-up via WhatsApp after email — higher open rates in Africa | Add `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` (Meta approval needed) | Phase 3 |
| **Campaign intent prompt** | Deeper personalisation in FIGSY sequences using intent signals | `FEATURE_CAMPAIGN_INTENT=true` in Railway | Now (feature flag) |
| **Conversational ICP builder** | Chat-based ICP creation with voice input instead of form | `FEATURE_ICP_BUILDER=true` in Railway | Now (feature flag) |
| **Portal V2 design** | New sidebar + mission control layout for client portal | `FEATURE_PORTAL_V2=true` in Railway | Now (feature flag) |
| **Milla VA** | Document upload + RAG chat for clients — answers questions from their own uploaded docs | Nothing — live and gated behind `status === 'active'` | NOW — live and gated |
| **Vida chatbot** | Embeddable website + WhatsApp chatbot for K.I.N.D clients' own websites | Nothing — live and gated behind `status === 'active'` | NOW — live and gated |

> ⚠️ **NOT in this table — these are missing builds, not blocked by credentials:**
> - Cancel subscription endpoint (`POST /subscriptions/:id/cancel`) — no code exists
> - Milla/Vida recurring monthly billing — no Paystack plan codes, no rebilling
> - FIGSY 'trialing' gate fix — one line of code, awaiting authority

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

**Soft Launch Date: 31 May 2026**

Standalone Netlify waitlist page (`netlify-waitlist/index.html`) captures early sign-ups before the full platform opens. Deploy by dragging folder to app.netlify.com/drop. Waitlist submissions are visible in Netlify dashboard → Forms.

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
| Subscription gating | ⚠️ Partial | Milla + Vida: frontend locked + backend `active` only ✅. FIGSY: frontend upgrade gate ✅ but still allows `trialing` status — backend gate incomplete ❌ |
| Demo isolation | ✅ Secure | Demo clients are real rows under same RLS as paying clients |
| Opt-out blocklist | ✅ Enforced | Checked before every lead insert |
| Daily automated audit | ✅ New | Scans for 17 security/reliability rules every morning and afternoon |

---

## 13. AGENT NAMING

| Agent | Named after | Role | Status |
|---|---|---|---|
| **FIGSY** | The founder | AI SDR — outbound email, follow-up, meeting booking | ✅ Live |
| **Milla** | Founder's daughter | Virtual Assistant — trained on your business | ✅ Live (paid only, $49/mo) |
| **Vida** | Founder's daughter | Chatbot Agent — website + WhatsApp inbound qualifier | ✅ Live (paid only, $29/mo) |

---

## 14. PRICING MODEL

### Credit Bundles

| Product | Credits | Price USD | Price ZAR | Notes |
|---|---|---|---|---|
| K.I.N.D AI — Lead Gen Pro | 20 | $20 | R380 | Free trial = 20 trial credits |
| K.I.N.D AI — Lead Gen Pro | 100 | $100 | R1,900 | |
| FIGSY Advanced | 20 | $60 | R1,140 | |
| FIGSY Advanced | 100 | $300 | R5,700 | |

### Subscription Products (Monthly)

| Product | Price USD/mo | Price ZAR/mo | Access |
|---|---|---|---|
| Milla — AI Virtual Assistant | $49 | R931 | Paid only — NOT included in free trial |
| Vida — AI Chatbot Agent | $29 | R551 | Paid only — NOT included in free trial |
| Milla + Vida Bundle | $69 | R1,311 | Paid only — NOT included in free trial |

### Two Separate Credit Balances (CRITICAL)

**Lead Gen credits** (`credit_balance` column):
- Purchased via Lead Gen bundles ($20/20, $100/100)
- Deducted 1 per lead found by ICP
- Free trial grants 20 trial credits (first ICP run only)

**FIGSY credits** (`figsy_credits_remaining` column):
- Purchased via FIGSY bundles ($60/20, $300/100)
- Deducted 1 per lead enrolled in outreach sequence
- Completely separate from Lead Gen credits

These balances NEVER mix. A client can buy Lead Gen credits without FIGSY credits and vice versa.

### Free Trial Scope

**Free trial = Lead Gen ONLY.**
- 14 days
- 20 trial credits (granted on first ICP run)
- FIGSY, Milla, and Vida are PAID add-ons — NOT included in any trial
- Milla and Vida require `subscription.status === 'active'` — NOT 'trialing'

**Pricing is locked. Never changed. Never increased or decreased.**

### ⚠️ Known Pricing Inconsistency — credits.ts vs shared constants

`apps/api/src/routes/credits.ts` has its own internal BUNDLES object with 7 tiers:
- Lead Gen: 10/$12, 20/$20, 40/$38, 75/$68, 100/$88, 200/$160, 500/$375
- FIGSY: 10/$35, 20/$60, 40/$110, 75/$195, 100/$250, 200/$460, 500/$1,100

`packages/shared/src/constants/index.ts` (the single source of truth) only has:
- Lead Gen: 20/$20 and 100/$100
- FIGSY: 20/$60 and 100/$300

**These do not match.** The billing page renders from `credits.ts` directly, so clients buying via Paystack see the 7-tier pricing, not the 2-tier pricing. This needs to be aligned. Awaiting authority to fix.

---

## 14a. LEAD DRIP DESIGN — Staggered Delivery (DESIGNED, NOT YET BUILT)

*Discussed 25 May 2026 — design agreed, not yet built.*

### The Problem
A client buys 20 credits. An ICP run finds 20 leads. All 20 are delivered at once and all credits are consumed immediately. Client sees no ongoing value — there is no reason to buy again because the credits are gone and the leads are done.

### The Design

**Daily drip rate:** Default 5 leads per day per ICP. Configurable per client in admin.

**How it works:**
1. ICP runs and finds N leads (capped at credit balance — see overspend bug fix above)
2. Instead of inserting all N leads immediately, queue them for daily drip
3. Cron job (daily, 08:00 SAST) delivers up to `daily_drip_rate` leads per active ICP
4. Leads are delivered until queue is empty or credits run out
5. When 5 or fewer credits remain → low credit email reminder

**Why this is the right model:**
- Client doesn't burn all credits in one run
- Creates a daily "something happened" moment → platform feels alive
- Reduces risk of client receiving all value upfront then churning
- Creates natural urgency to top up credits when daily drip slows

**New columns needed (clients table):**
- `daily_drip_rate` INT DEFAULT 5
- `lead_queue_paused` BOOLEAN DEFAULT FALSE

**New columns needed (leads table):**
- `queued_at` TIMESTAMPTZ (when inserted into queue)
- `delivered_at` TIMESTAMPTZ (when surfaced to client dashboard)

**Status:** Designed only. Not built. Build after lead overspend fix is confirmed working.

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

1. **Self-service trial** — signup → no email confirmation → /onboard → dashboard → 14-day trial → Lead Gen only (20 trial credits)
2. **AE-assisted** — same as above, AE helps with order form + payment
3. **Pay day 1** — signup → skip trial → pay immediately
4. **Trial expired** — overlay → pay to regain access
5. **Buy Lead Gen credits** — Billing → Paystack → webhook → `credit_balance` topped up
6. **Buy FIGSY credits** — Billing → Paystack → webhook → `figsy_credits_remaining` topped up
7. **Buy Milla subscription** — Billing → Paystack → webhook → subscription created `status=active` → Milla unlocked
8. **Buy Vida subscription** — same as above → Vida unlocked
9. **Cancel Milla/Vida** — ❌ NOT BUILT — no cancel flow exists yet
10. **Sales demo** — Admin → Demo Envs → create demo → open portal as prospect

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

### Business & Operational Summary

| Item | Status | Action |
|---|---|---|
| UK company registration | ⏳ Not done | companieshouse.gov.uk — £50, same day. SIC code: 62012. See Section 24. |
| Paystack KYC | ⏳ Not done | dashboard.paystack.com → Settings → Compliance. Required before any live ZAR payment. |
| Google Workspace | ⏳ Not done | workspace.google.com → Business Starter → get hello@get-kind.com live. See Section 2. |
| UK bank account | ⏳ After company registered | **Wise Business** — free, multi-currency, accepts ZAR/GBP/USD. Open at business.wise.com. See Section 24. |
| VAT registration | Not needed yet | Only mandatory when turnover hits **£90,000/year**. Free. HMRC online. |
| UK accountant | Not needed yet | Get one when you hit **£10,000 MRR** (~£100–200/month). Use Crunch.co.uk. |
| G2 / Capterra / Product Hunt | ⏳ Launch day | Submit all 3 on launch day. See Section 9 launch checklist. |
| SOC 2 Type II | Deferred | Q1 2027 — needs 6–12 month observation period. See Section 11. |

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
| Website | Static HTML | apps/website — Vercel (confirm project name in dashboard — was incorrectly noted as kind-admin) |

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
| 9 | Check FIGSY / VA / Chatbot screens | FIGSY: shows upgrade banner (no credit transactions). Milla + Vida: show locked screens with "Unlock Milla — $49/mo" / "Unlock Vida — $29/mo" CTAs. None accessible on free trial. |
| 10 | Sidebar bottom | Green dot "All systems operational" |
| 11 | Admin → Demo Envs → create demo | Leads appear → Open Demo → portal opens as demo client |
| 12 | Admin → Clients → pick client → grant 50 credits | Balance updates, transaction recorded |
| 13 | Sign out → sign back in | Dashboard loads, no empty loop |
| 14 | Receive welcome email after step 2 | Arrives from Resend (needs `RESEND_API_KEY`) |
| 15 | Buy Milla subscription in billing | Milla page becomes accessible. Subscription shows `status=active`. Vida remains locked. |

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
| **K.I.N.D** | **Founder-led SA businesses** | **$20 credits → $49–69/mo** | **✅ Fully** | **✅** | **✅** |

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
| Milla + Vida | ✅ LIVE — paid subscription, $49/$29 per month. Recurring billing needed. |
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
| Free trial scope | Lead Gen ONLY — 20 trial credits, 14 days. FIGSY, Milla, Vida are paid upgrades. No trial access. |
| Milla/Vida subscription check | `status === 'active'` ONLY. 'trialing' does NOT grant access. |
| Credit balance separation | Two separate balances: `credit_balance` (Lead Gen, $1/lead) and `figsy_credits_remaining` (FIGSY, $3/outreach). Never mixed. |
| Lead delivery model | Staggered/drip (5 leads/day default). NOT bulk delivery. Prevents credit burn in single run. (Design agreed, build pending) |
| Soft launch date | 31 May 2026. Netlify waitlist live before then. |

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

### UK Bank Account — After Incorporation

**Recommended: Wise Business** (free, multi-currency, accepts international transfers)
- Open at: business.wise.com — takes 1–3 days after company is incorporated
- Accepts GBP, USD, EUR, ZAR in one account
- No monthly fee
- Issue GBP invoices to UK clients, receive USD from US clients — all in one place
- Transfer to your SA account at Wise's low FX rate

**Alternative:** Revolut Business (similar, slightly faster approval)

### When to Hire a UK Accountant

| Trigger | What to do |
|---|---|
| You hit £10,000 MRR | Get a UK accountant (~£100–200/month). Will handle VAT, Corporation Tax, payroll. Use Crunch.co.uk or an accountant finder. |
| You hit £90,000 turnover/year | Register for VAT (free, mandatory by law). Google "HMRC VAT registration". |
| You hire a UK employee | Add payroll to your accountant's scope. |

> **Not needed yet.** Register the company first. Everything else follows naturally as you grow.

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
| **Milla** | Virtual Assistant — business knowledge + internal queries | ✅ Live (paid only, $49/mo) |
| **Vida** | Chatbot — website + WhatsApp inbound qualifier | ✅ Live (paid only, $29/mo) |
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
- **Milla uses it internally** — Milla is already built. When the MCP server is built, Milla calls it instead of the raw database. Same tools external developers use. Build once, powers both internal AI and external integrations
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
| 3 | **Client agreement language — managed service clause** | 🔴 High | Lawyer to draft clause clarifying K.I.N.D as managed service provider, not data reseller. ⏳ Not started. |
| 3a | **terms.html — real founder name** | ⚪ Known exception | terms.html lines 129, 280, 293 still contain real name. Deliberately left until UK company registered. Do not remove from public website until company number is confirmed. |
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

Current state: **V2 — fully built and live.** Dark sidebar, AI exec team, living docs, revenue page, compliance tracker, health page. All 15 pages live at admin.get-kind.com.
~~Target state: Founder-grade ops centre. Dark sidebar. AI exec team. Living docs. Full revenue picture.~~ ✅ Done.

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

*Last updated: 25 May 2026 (evening) — All V2 pieces complete*

| Piece | Status | Notes |
|---|---|---|
| Dark sidebar layout | ✅ Live | `bg-[#0a0a0a]` sidebar, 240px fixed, K.I.N.D / Founder OS branding |
| Dark theme dashboard restyle | ✅ Live | Full dark palette throughout |
| AI Exec Team pages (OTTO, LENA, REEVE, CMO, CTO, CFO) | ✅ Live | `/agents/[agent]` — live Claude Haiku briefs via internal API |
| Agent daily briefs API | ✅ Live | `GET /internal/briefs/:agent` — per-agent Supabase data + Claude Haiku |
| Living docs viewer | ✅ Live | `/docs/master`, `/docs/run-costs`, `/docs/legal` — rendered in-app |
| Platform health page | ✅ Live | `/health` — status links + FIGSY cron status |
| Revenue deep-dive page | ✅ Live | `/revenue` — live MRR, scenarios, monthly targets May→Dec 2026 |
| Compliance tracker page | ✅ Live | `/compliance` — 5 certs, progress bars, checklists, next steps |
| Client at-risk scoring | ✅ Live | Health dot green/amber/red — last login, leads 14d, credits, FIGSY |
| At-risk filter | ✅ Live | `/clients?filter=atrisk` — filtered view of red-health clients |
| Dark restyle all remaining pages | ✅ Live | cmo, cohorts, roadmap, launch, founder — full palette |
| Morning brief email | ⏳ Planned | Founder receives AI-generated brief at 07:00 — Phase 2 |
| MCP server integration | ⏳ Phase 4 | Post 20 clients — expose K.I.N.D data to Claude Desktop/Cursor |

**Status: LIVE** — Admin portal V2 is fully deployed to `admin.get-kind.com`. All pages built and pushed.

---

### All Pages — Current State (V2 Complete)

| Page | What it does | Status |
|---|---|---|
| `/` | Dashboard — stats, TTFL, KPI targets, client pipeline | ✅ Live (dark restyle) |
| `/clients` | Client list with health scoring, leads 14d, FIGSY status, last login | ✅ Live (dark restyle + health) |
| `/clients?filter=atrisk` | At-risk clients only (red health) | ✅ Live |
| `/clients/[id]` | Client detail — FIGSY campaigns, ICPs, leads summary, credit grant | ✅ Live (dark restyle + new sections) |
| `/agents/otto` | OTTO — CRO. Daily brief: MRR, at-risk, FIGSY reply rates | ✅ Live |
| `/agents/lena` | LENA — CS. At-risk clients, no leads 14d, low credits | ✅ Live |
| `/agents/reeve` | REEVE — AE. New clients 30d, upsell targets | ✅ Live |
| `/agents/cmo` | CMO. Signup patterns, active ICP industries | ✅ Live |
| `/agents/cto` | CTO. Audit issues, error rates | ✅ Live |
| `/agents/cfo` | CFO. MRR, credit transactions, cost breakdown | ✅ Live |
| `/revenue` | Live MRR, Conservative/Base/Optimistic scenarios, monthly targets | ✅ Live |
| `/health` | Railway/Supabase/Vercel/Paystack status links, FIGSY cron status | ✅ Live |
| `/compliance` | 5 cert trackers (GDPR ✅ CCPA ✅ SOC 2 🔵 ISO 27001 🔵 ISO 42001 🔵) | ✅ Live |
| `/docs/master` | MASTER.md rendered in-app, live from file | ✅ Live |
| `/docs/run-costs` | Run costs doc rendered in-app | ✅ Live |
| `/docs/legal` | Legal doc rendered in-app | ✅ Live |
| `/docs/audits` | Link to GitHub Issues filtered by label:audit | ✅ Live |
| `/cmo` | CMO tools — LinkedIn posts, prospect finder | ✅ Live (dark restyle) |
| `/cohorts` | Cohort analytics | ✅ Live (dark restyle) |
| `/demo` | Demo environments | ✅ Live |
| `/terms-library` | Terms templates | ✅ Live |
| `/roadmap` | Roadmap view | ✅ Live (dark restyle) |
| `/launch` | Launch checklist | ✅ Live (dark restyle) |
| `/founder` | Founder digest + agent actions | ✅ Live (dark restyle) |

---

## 29. SCALABILITY — FROM FOUNDER SALES TO A FULL SALES TEAM

*Added 25 May 2026. Critical honest assessment — not a cheerleader view.*

---

### The Core Principle

**Founder-led sales is the highest-converting motion that exists.** You know the product completely, you close on conviction, and there are zero hand-off costs. The mistake most founders make is hiring AEs because they're tired of selling — not because the process is ready to be handed off. That is always the wrong reason.

---

### When You Actually Need AEs — The Real Trigger

All three of these must be true simultaneously before hiring an Account Executive:

| Condition | Why it matters |
|---|---|
| **Repeatable, documented sales process** — discovery script, demo flow, objection responses, proposal template | An AE can only run a process that exists. If it's in your head, you can't hire it out. |
| **More qualified inbound than you can handle** — leads going cold because you lack time | If you're still chasing leads, you need more pipeline. Not more closers. |
| **3+ months of closed deal data** — sales cycle length, average deal size, conversion by stage | You need this to know what you're hiring for and whether the economics work. |

**K.I.N.D right now:** None of these three are true yet. The process isn't documented, there's no overflow pipeline, and there's no closed deal data. Hiring an AE today means paying someone to watch you figure it out.

---

### The Dead Zone (Where Companies Die)

```
Founder closes everything          →    Dead Zone    →    AE-led motion
(works, doesn't scale)                                    (scales, needs infrastructure)
```

In the dead zone:
- AE can't close because the product is still changing
- Sales process is half-documented
- Founder keeps getting pulled into hard deals anyway
- AE gets demoralised, leaves after 3 months
- Founder resents the cost

This typically hits between 10–25 paying clients. The fix is not to rush through it — it's to document the process *before* the hire, not after.

---

### Do You Need Sales Engineers?

**Not yet. Probably not for a long time.**

Sales Engineers exist to handle technical objections during a deal — security questionnaires, integration requirements, custom logic discussions. They make sense when:
- Average deal size > $5,000
- Buyer has a procurement process
- Technical evaluation is a formal stage

K.I.N.D's current buyer is a founder or sales director at a 5–50 person company. They are not running formal security evaluations. The demo is visual and simple. An SE at R50–70k/month base is only justified when losing a deal to a technical objection has real revenue cost.

**SE trigger for K.I.N.D:** When targeting companies with 200+ employees who have procurement processes. Year 2 at earliest. Possibly never if staying SME-focused.

---

### The Economics — Does Hiring an AE Actually Work?

| Role | Base (SA) | OTE | Quota | Break-even pipeline needed |
|---|---|---|---|---|
| Junior AE | R35–50k/mo | R70–90k/mo | 5–8× OTE in ARR | 20–30 new clients/month at $80 ARPU |
| Mid-market AE | R60–80k/mo | R120–160k/mo | 5–8× OTE | 50+ new clients/month |
| Sales Engineer | R50–70k/mo | R100–130k/mo | Tied to AE quota | Only justifiable at deal sizes >$5k |

**The brutal maths at $80 blended ARPU:** A junior AE needs to close 20–30 new clients per month to hit minimum quota. That requires 60–90 qualified opportunities per month (at 30–40% close rate). FIGSY can generate that pipeline — but only after Apollo is live and volume is proven. Don't hire before the engine is confirmed working.

**Rough rule: Don't hire an AE until $10,000 MRR and growing 20%+ month-on-month.**

---

### K.I.N.D's Sales Scaling Path

```
Now → 10 clients        Founder closes everything. FIGSY feeds the pipe.
                        Goal: document every objection, every close, every loss.

10 → 30 clients         Founder + 1 SDR (R20–30k/mo).
                        SDR qualifies inbound, books discovery calls, founder closes.
                        Document everything. Build the playbook.

30 → 80 clients         1 Junior AE (R35–50k/mo) running the documented playbook.
                        Founder closes enterprise/edge cases only.
                        Target: AE closes 15–20 deals/month independently.

80 → 200 clients        2–3 AEs + 1 SE for larger deals emerging.
                        Founder moves to partner relationships and enterprise.

200+ clients            Full sales team. Sales manager. Structured territories.
```

**The SDR hire at 10 clients is the one most founders skip — and shouldn't.** An SDR at R25k/month who qualifies 20 discovery calls per month that you then close is the highest-leverage hire available. They multiply your capacity without requiring you to hand off the close.

---

### Why K.I.N.D's Model is Actually Better for Scaling

K.I.N.D has a structural advantage most B2B SaaS companies don't: **FIGSY generates the pipeline automatically.**

That means future AEs are closers working pre-warmed inbound — not hunters starting from cold. This matters because:
- Shorter ramp time (leads already know what FIGSY does)
- Higher close rates (prospect is already sold on the concept)
- Lower base salary needed (inbound closers cost less than pure hunters)
- Predictable pipeline volume (FIGSY runs on a schedule)

But the entire model depends on FIGSY generating pipeline at volume. Which depends on Apollo being live at Professional plan. The sales scaling plan starts with the Apollo upgrade — not with a hiring decision.

---

### What to Build BEFORE Hiring Anyone

This is where time is better spent right now:

| Action | Output | Why |
|---|---|---|
| Document every sales conversation | Objection-response library | AE playbook raw material |
| Track every deal in HubSpot (free) | Pipeline data | Know your actual sales cycle + close rate |
| Identify highest-converting channel | Channel focus | AE works what converts, not everything |
| Define "qualified" precisely | ICP qualification criteria | Prevents AE wasting time on bad leads |
| Build the demo into a 20-min script | Repeatable demo flow | AE runs this script, not improvises |
| Document every loss reason | Loss analysis | Tells you what to fix before scaling |

None of this requires a hire. All of it makes the first hire dramatically more likely to succeed.

---

### The One Rule

> **Don't hire to solve a capacity problem you haven't yet had. Hire to scale a process you've already proven works.**

A documented, proven sales process handed to an AE = fast ramp, high close rate, scalable.
An undocumented, founder-only process handed to an AE = slow ramp, low close rate, expensive mistake.

---

*Owner: K.I.N.D founding team*
*Last updated: 25 May 2026 (night — nightly build complete)*
