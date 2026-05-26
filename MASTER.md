# K.I.N.D — MASTER DOCUMENT
**Single source of truth. Last updated: 26 May 2026 (evening — full competitive audit + vision session)**
**Business: UK registration IN PROGRESS (Companies House) · Platform: Africa-first, world-ready**
**Auto-status: Admin → /status updates 3× daily (07:05, 12:00, 19:00 SAST)**

> Everything in one place. Status, roadmap, GTM, company registration, expansion, compliance, SOPs, cashflow.

---

## TABLE OF CONTENTS

1. [Current Status — What's Live](#1-current-status--whats-live)
2. [What Founder Needs To Do](#2-what-founder-needs-to-do)
3. [What Claude Can Do](#3-what-claude-can-do)
4. [Post-Launch Roadmap — Full Detail](#4-post-launch-roadmap--full-detail)
5. [What's Built](#5-whats-built)
6. [Blocked Features — Needs Credentials Only](#6-blocked-features--needs-credentials-only)
7. [Will Not Build Yet](#7-will-not-build-yet)
8. [Market Expansion — US, UK & Africa](#8-market-expansion--us-uk--africa)
9. [Compliance — Full Audit](#9-compliance--full-audit)
10. [Security Audit Results](#10-security-audit-results)
11. [Agent Naming](#11-agent-naming)
12. [Pricing Model](#12-pricing-model)
13. [Revenue Targets & KPIs](#13-revenue-targets--kpis)
14. [Cashflow Model](#14-cashflow-model)
15. [Client Flow — All Paths](#15-client-flow--all-paths)
16. [Operations SOP](#16-operations-sop)
17. [Tech Stack & Infrastructure](#17-tech-stack--infrastructure)
18. [Smoke Test Checklist](#18-smoke-test-checklist)
19. [Product Vision — 1, 3, 5 Years](#19-product-vision--1-3-5-years)
20. [Alta AI SDR — Competitive Audit](#20-alta-ai-sdr--competitive-audit)
21. [Key Decisions Locked](#21-key-decisions-locked)
22. [Go-To-Market Strategy](#22-go-to-market-strategy)
23. [UK Company Registration](#23-uk-company-registration)
24. [Art of Possible — Products We Study](#24-art-of-possible--products-we-study)
25. [Compliance Certifications Roadmap](#25-compliance-certifications-roadmap)
26. [Competitor Targeting Strategy](#26-competitor-targeting-strategy)
27. [AI Learning Capability — Built, Planned, Vision](#27-ai-learning-capability--built-planned-vision)
28. [ClickUp Brain — What We Studied, What We Adopted, What's Next](#28-clickup-brain--what-we-studied-what-we-adopted-whats-next)
29. [Full Competitive Landscape — Every Player, Every Layer](#29-full-competitive-landscape--every-player-every-layer)
30. [The Unbuilt Future — What K.I.N.D Could Become](#30-the-unbuilt-future--what-kind-could-become)

---

## 1. CURRENT STATUS — WHAT'S LIVE

*Last updated: 26 May 2026 (evening — post full audit session)*
*Auto-status page: Admin → /status (updates 07:05, 12:00, 19:00 SAST)*

### Infrastructure
| Item | Status | Notes |
|---|---|---|
| Website — `get-kind.com` | ✅ Live | 22 pages, all CTAs wired to Calendly |
| Client Portal — `app.get-kind.com` | ✅ Live | 21 pages, TypeScript clean |
| Admin Dashboard — `admin.get-kind.com` | ✅ Live | 18 pages, TypeScript clean |
| Railway API | ✅ Running | kindapi-production-e64c.up.railway.app — 25 routes |
| Supabase — 19 migrations, all RLS | ✅ Live | Clean, no schema drift |
| TypeScript build — all apps | ✅ Clean | API, Portal, Admin all error-free |
| Cron jobs — 16 jobs, no conflicts | ✅ Running | All staggered, no two fire at same minute |

### Payments
| Item | Status | Notes |
|---|---|---|
| Stripe account | ✅ Live | Keys in Railway |
| Stripe 6 prices created | ✅ Live | Lead Gen 20/40/100cr, FIGSY 20/40/100cr |
| Stripe portal billing | ✅ Live | NEXT_PUBLIC vars in Vercel |
| **Stripe webhook secret** | ⏳ TODO | Add `STRIPE_WEBHOOK_SECRET` to Railway — payments confirmed but not activated without it |
| Flutterwave | ✅ Built | Dormant until `FLUTTERWAVE_SECRET_KEY` added (Phase 2) |
| Paystack | ✅ Legacy | Webhook compat only — not primary |

### Integrations
| Item | Status | Notes |
|---|---|---|
| Resend API key | ✅ Live | Emails working |
| Resend inbound webhook | ✅ Live | FIGSY replies processing via `RESEND_WEBHOOK_SECRET` |
| **Resend paid plan** | ⏳ TODO | Free = 100 emails/day — blocks FIGSY sequences at scale |
| HubSpot | ✅ Live | `HUBSPOT_API_KEY` in Railway — syncing signups, payments, replies |
| Apollo | ✅ Live | Free plan (50 contacts/month) — enough for demos + own outreach |
| Calendly | ✅ Live | Wired across all 20 website pages + portal FIGSY page |
| FIGSY_KIND_CLIENT_ID | ✅ Live | Self-outreach fires Monday 06:00 UTC |

### Features
| Item | Status | Notes |
|---|---|---|
| Lead drip system | ✅ Live | `delivered_at`, `daily_drip_rate`, 08:10 UTC cron |
| ICP cascade delete | ✅ Live | Leads set NULL on ICP delete — no orphaned rows |
| 3-tier Stripe billing (20/40/100cr) | ✅ Live | Flat $1/$3 per credit — no volume discounts |
| Flat pricing enforced | ✅ Done | $1/lead, $3/FIGSY — annual plans only for discounts |
| Competitor ICP seeds | ✅ Ready | 4 configs in supabase/seeds/ — fire when Apollo upgraded |
| Sales playbook | ✅ Live | Admin → Sales Playbook (full discovery script, objections, demo flow) |
| HubSpot pipeline view | ✅ Live | Admin → HubSpot |
| Admin status page | ✅ Built | Auto-updates 3× daily — 07:05, 12:00, 19:00 SAST |
| 3× daily MASTER.md status updates | ✅ Built | Cron writes to platform_status table → admin reads it |

### Known Technical Debt
| Issue | Severity | Plan |
|---|---|---|
| Duplicate /leads/consent/bulk routes | Medium | Deprecate one post-launch |
| Credit deduction race condition | Medium | Add DB transaction at 100+ concurrent clients |
| Exchange rate hardcoded R19/$ | Medium | Update monthly or add rate fetch at 50+ clients |
| Stripe 40cr and 100cr prices need recreating | 🔴 HIGH | Old prices had volume discounts — archive + recreate at flat rate, update 4 Railway vars |

### ⚠️ Known Technical Debt (audit findings — log for later)
| Issue | Severity | Notes |
|---|---|---|
| Duplicate /leads/consent/bulk and /leads/bulk-consent routes | Medium | Same functionality, different param names. Pick one and deprecate other |
| Credit deduction race condition in /leads/drip | Medium | High concurrency could overdraw. Acceptable for current scale — add DB transaction when you have 100+ concurrent clients |
| ICP delete doesn't cascade leads | High | Deleting an ICP orphans its leads. Add `ON DELETE SET NULL` to icp_id FK in schema |
| Exchange rate hardcoded at R19/$ in credits.ts | Medium | Update monthly or add daily rate fetch when you have 50+ paying clients |
| Paystack plan codes env vars empty | High | Recurring billing code is ready but **needs plan codes from Paystack dashboard** — see Section 6 |

---

## 2. WHAT FOUNDER NEEDS TO DO

*Updated: 26 May 2026 evening — full 5-day plan including WhatsApp application*

---

### ✅ ALL DONE TO DATE
| Task | Done |
|---|---|
| Apollo API key in Railway | ✅ |
| RESEND_API_KEY in Railway | ✅ |
| Railway green build | ✅ |
| All SQL migrations applied | ✅ |
| Stripe account + 6 prices + keys in Railway | ✅ |
| NEXT_PUBLIC Stripe vars in Vercel | ✅ |
| UK company registration submitted | ✅ In progress — awaiting Companies House |
| HubSpot account + API key in Railway | ✅ |
| Resend inbound webhook + secret in Railway | ✅ |
| FIGSY_KIND_CLIENT_ID in Railway | ✅ |
| Calendly link created + wired site-wide | ✅ |
| Drip migration applied in Supabase | ✅ |
| ICP cascade delete migration applied | ✅ |

---

## 📅 5-DAY PLAN — 26–31 MAY 2026

---

### TONIGHT — 26 May (Tuesday)
**Read MASTER.md on GitHub. Make notes. Come back tomorrow ready.**

**You — 15 minutes max (clear the launch blockers before bed)**

| # | Task | Time | Exact steps |
|---|---|---|---|
| 1 | **Stripe webhook secret** | 2 min | Stripe → Developers → Webhooks → Add endpoint → URL: `https://kindapi-production-e64c.up.railway.app/stripe/webhook` → Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` → Copy signing secret → Railway → `STRIPE_WEBHOOK_SECRET` |
| 2 | **Upgrade Resend to paid** | 2 min | resend.com/billing → Pro ($20/mo) — free plan = 100 emails/day ceiling, FIGSY hits this immediately |
| 3 | **Fix 4 Stripe prices** | 10 min | Stripe → Products → archive old 40cr + 100cr prices (Lead Gen + FIGSY). Recreate flat: Lead Gen 40cr=$40, 100cr=$100, FIGSY 40cr=$120, 100cr=$300. Copy 4 new price IDs → Railway: `STRIPE_PRICE_LEADGEN_40`, `STRIPE_PRICE_LEADGEN_100`, `STRIPE_PRICE_FIGSY_40`, `STRIPE_PRICE_FIGSY_100` |

**If #1–3 not done tonight, do them first thing tomorrow before the smoke test.**

---

### DAY 1 — 27 May (Wednesday)
## SMOKE TEST + WHATSAPP APPLICATION + OUTREACH START

**Three parallel tracks. This is your most important day.**

---

#### TRACK 1: LAUNCH BLOCKERS (first, 5 min)

Before anything else — confirm these are done:

| Check | Where |
|---|---|
| `STRIPE_WEBHOOK_SECRET` set | Railway → KIND API → Variables |
| Resend is on paid plan | resend.com/billing → shows "Pro" |
| 4 Stripe prices are flat rate | Stripe → Products → check 40cr + 100cr prices |
| `supabase/migrations/20260526_platform_status.sql` run | Supabase → SQL Editor |

If any are missing — do them now before continuing.

---

#### TRACK 2: WHATSAPP BUSINESS API APPLICATION (morning — 20 min to apply, 3–7 days to approve)

**Start this first. It runs in the background while everything else happens. The clock starts when you apply.**

**⚠️ CRITICAL REQUIREMENTS — read before you start:**

| Requirement | Detail |
|---|---|
| **Dedicated phone number** | Must be a number NOT currently registered to any WhatsApp account (personal or business). Once you assign it to the Business API, it cannot be used for regular WhatsApp. Get a new SIM or use a number you don't use on WhatsApp. A +27 South African number is recommended for local clients. |
| **Meta Business Manager account** | Must exist first. Go to business.facebook.com — create one if you haven't already. Use the business name "KIND AI" or "K.I.N.D". |
| **Business verification documents** | Meta will ask for proof of business. Prepare one of: UK company registration number (when it arrives) OR bank statement showing business name OR utility bill with business name/address. |
| **Display name** | Must match or be clearly related to your business name. Use "KIND AI" — will be reviewed and approved by Meta. |
| **IMPORTANT — what WhatsApp Business API can and cannot do** | ✅ CAN: Vida inbound chatbot, client notifications (credits, campaign alerts), warm follow-ups to opted-in contacts. ❌ CANNOT: Cold outreach to new prospects. WhatsApp has strict anti-spam policies — using it for cold email-style sequences will get the account banned. FIGSY uses email for cold outreach. WhatsApp is for inbound and existing client comms only. |

**Step-by-step application (20 minutes):**

| Step | Action |
|---|---|
| 1 | Go to **developers.facebook.com** → Log in with your Facebook/Meta account |
| 2 | Click **My Apps** → **Create App** |
| 3 | Select app type: **Business** → Next |
| 4 | App name: `KIND AI` → Enter your business email → Create App |
| 5 | In the app dashboard → **Add a Product** → Find **WhatsApp** → Click Set Up |
| 6 | Click **Start using the API** |
| 7 | Under **Step 1: Add phone number** → Add a Phone Number |
| 8 | Enter the dedicated number you set aside → Verify via SMS or call |
| 9 | Set display name: `KIND AI` → Set category: `Business Services` |
| 10 | **Business Verification**: Settings → Business Settings → Security Centre → Start Verification |
| 11 | Upload business document (company reg / bank statement) → Submit |
| 12 | Wait for approval email from Meta (3–7 business days) |

**When approved, you get 3 things → all go into Railway:**
```
WHATSAPP_TOKEN=            ← permanent system user token from Meta
WHATSAPP_PHONE_NUMBER_ID=  ← shown in WhatsApp setup dashboard
WHATSAPP_VERIFY_TOKEN=     ← you choose this string yourself (e.g. kind_webhook_2026)
```

**The code is already written. Once these 3 vars are in Railway, Vida's WhatsApp integration goes live.**

---

#### TRACK 3: SMOKE TEST (morning — 45–60 min)

**Do every step yourself, as a real paying client. No shortcuts.**

| Step | What you do | What must happen | If it fails |
|---|---|---|---|
| 1 | go to get-kind.com → click Sign Up | Lands on app.get-kind.com/login | Tell me — routing |
| 2 | Email + password → Sign Up | Goes straight to /onboard — NO confirmation email | Tell me — auth |
| 3 | Company name, industry, country → Start free trial | Dashboard loads with company name in sidebar | Tell me — onboard |
| 4 | Leads → Build ICP → "Suggest ICP with AI" | Claude fills form fields within 5 seconds | Tell me — AI suggest |
| 5 | Save & Find Leads | Real leads with scores (0–100) within 2 minutes | Tell me — Apollo |
| 6 | Select one lead → Send POPIA consent | Status changes to `consent_sent`, email sent | Tell me — Resend/consent |
| 7 | Leads table → Export CSV | File downloads, correct columns | Tell me — export |
| 8 | Billing → buy smallest credit pack | Stripe opens → pay → returns → credit balance updates | Tell me — Stripe webhook |
| 9 | Portal → FIGSY | Locked screen: Upgrade + Book a Demo | Tell me — gate |
| 10 | Portal → Milla | Locked screen | Tell me — gate |
| 11 | Portal → Vida | Locked screen | Tell me — gate |
| 12 | Sidebar bottom | Green pulsing dot "All systems operational" | Tell me — health |
| 13 | Admin → Demo Envs → Create Demo | Leads populate → Open Demo → portal opens as demo client | Tell me — demo env |
| 14 | Admin → Clients → your account → Grant 50 credits | Balance updates, transaction in history | Tell me — admin grant |
| 15 | Sign out → sign back in | Dashboard loads clean, no loop | Tell me — session |

**Report format:** "Step [N] failed — [what happened]" + screenshot. I fix and redeploy. You retest that step only.

---

#### TRACK 4: OUTREACH (afternoon — 1–2 hours)

**Run this regardless of smoke test status. Don't wait for 100% pass.**

**10 warm personal messages — LinkedIn or WhatsApp personal**

Who: people who know you, know you're building, would be curious. Ex-colleagues. Business contacts. Anyone who's asked "how's the startup going?" B2B founders or sales leaders go first.

**Message template (make it sound like you, not a pitch):**
> *"Hey [name] — finally launched the thing I've been building. It's an AI SDR for B2B — finds the leads, writes the emails, handles the replies. Fully managed, no setup needed. Got 5 minutes? Happy to show you a quick demo or just send a link."*

Target: 10 sent. Aim for 3 replies. Anyone who says yes → book immediately.

**LinkedIn post #1**
Admin → CMO Tools → copy the drafted post → change the first line to your voice → post now.

---

**Claude — running all of Day 1:**
- Fix every smoke test issue in real time as you report them
- AI reply categorisation (hot / warm / cold / wrong person / OOO)
- Unified reply inbox (Unibox) — first pass
- Deliverability dashboard — first pass
- Homepage hero rewrite

---

### DAY 2 — 28 May (Thursday) — FIXES + MOMENTUM

**You**

| Task | Notes |
|---|---|
| **Report remaining smoke test issues** | Screenshot + step number. I fix while you move on. |
| **WhatsApp: check Meta Business Verification status** | business.facebook.com → Security Centre → check if docs submitted successfully |
| **Follow up on Day 1 outreach** | Check replies. Anyone who said yes/maybe → book the call immediately. Don't let it go cold. |
| **5 more outreach messages** | Second wave — slightly cooler contacts. People you haven't spoken to in a while who run B2B companies. |
| **Book first discovery call** | If anyone said yes on Day 1 — calendar it. Calendly link is live. |

**If a call is booked:** Admin → Sales Playbook → read the discovery script before you go in.

**Claude — Day 2**
- All smoke test fixes deployed
- Waterfall enrichment (Apollo → PDL → Hunter fallback)
- Email score pre-send check
- Technical debt: duplicate route cleanup

---

### DAY 3 — 29 May (Friday) — FIRST CALLS + PIPELINE

**You**

| Task | Notes |
|---|---|
| **Run discovery call(s)** | Sales Playbook script. Goal: understand their lead gen pain. Book a demo follow-up. Listen — don't pitch on call 1. |
| **Follow up on non-replies** | 2 days no reply → one follow-up: *"Did this land? Happy to send a loom instead."* |
| **LinkedIn post #2** | Admin → CMO Tools |
| **UK Companies House number** | If it arrives → paste to me → footer + legal updated in 10 min |
| **WhatsApp: check application progress** | Look for approval email from Meta. If no response after 5 business days, resubmit documents. |

**Claude — Day 3**
- Adaptive send volume (auto-reduce per domain if health dips)
- Proposal template (ready for first prospect close to signing)
- Technical debt: credit race condition wrapper

---

### DAY 4 — 30 May (Saturday) — REVIEW + PREP

**You (30 min)**

| Task | Notes |
|---|---|
| **Count the week** | Messages sent. Replies. Calls booked. Calls done. Any yes? |
| **Admin → /status** | Check platform snapshot — any anomalies? |
| **Check FIGSY self-outreach** | Admin → your client → FIGSY campaigns → did Monday self-outreach fire? What's the reply rate? |
| **3 LinkedIn comments** | Comment on 3 posts from potential prospects or sector leaders. Presence, not pitching. |
| **Prep for Monday calls** | If calls booked for next week — one sentence of prep per person. |

**Claude — Day 4**
- Cron job log review — any silent failures?
- Week 2 outreach batch prep (5 more names + refined messages)
- Build queue overflow

---

### DAY 5 — 31 May (Sunday) — REST + MONDAY SETUP

**You**

| Task | Notes |
|---|---|
| **Rest** | Don't build. |
| **Write 10 names for Week 2** | Just a list on paper — who are you messaging Monday morning? |
| **Optional: re-read MASTER.md** | Make notes for the session Monday. |

**Claude — Sunday**
- Build queue
- Week 2 FIGSY campaign refinement based on what's resonating in your outreach
- Any outstanding fixes

---

## BY END OF 31 MAY — TARGETS

| Target | Done? |
|---|---|
| Platform blockers cleared (Stripe webhook, Resend, prices) | — |
| Supabase platform_status migration applied | — |
| Smoke test: all 15 steps passing | — |
| WhatsApp Business API application submitted | — |
| 15+ outreach messages sent | — |
| 3+ replies received | — |
| 1+ discovery call booked | — |
| LinkedIn: 2 posts + 3 comments | — |
| FIGSY self-outreach running (auto-fires Mondays) | ✅ Live |
| All smoke test fixes deployed | — |

**WhatsApp expected live date: ~5–6 June** (3–7 business days from Day 1 application)

---

## MY BUILD QUEUE — NEXT 5 DAYS (Claude)

| # | What | Why | Day |
|---|---|---|---|
| 1 | **Fix all smoke test issues** | Blocking launch | Day 1–2 real-time |
| 2 | **AI reply categorisation** | hot / warm / cold / wrong person / OOO — each routes differently | Day 1 |
| 3 | **Unified reply inbox (Unibox)** | All campaign replies across all clients in one admin view | Day 1–2 |
| 4 | **Deliverability dashboard** | Spam rate, inbox %, DNS health per domain — in Platform Health | Day 1–2 |
| 5 | **Homepage hero rewrite** | Sharper copy for cold visitors | Day 1 |
| 6 | **Waterfall enrichment** | Apollo → PDL → Hunter — 20–40% more leads per ICP | Day 2–3 |
| 7 | **Email score pre-send** | Score sequence quality before it fires | Day 3 |
| 8 | **Adaptive send volume** | Auto-reduce per mailbox if domain health dips | Day 3–4 |
| 9 | **Technical debt — duplicate routes** | Clean before scale | Day 4 |
| 10 | **Technical debt — credit race condition** | DB transaction wrapper for credit deduction | Day 4 |
| 11 | **Proposal template** | Ready when first prospect is close | Day 3 on demand |
| 12 | **Week 2 outreach refinement** | Sharpen FIGSY campaign based on what's resonating | Day 4–5 |

---

## WHAT'S NOT ON MY LIST (and why)

| Item | Why not now | When |
|---|---|---|
| Email warmup infrastructure | Need to decide on provider first (Lemwarm, Mailreach, or self-hosted pool) — ask me and we'll pick one together | Phase 2 |
| WhatsApp code changes | Already built — waiting for your 3 env vars from Meta | When Meta approves |
| LinkedIn automation | ToS risk — always off the table | Never |
| Milla + Vida launch | July — after first 5 clients | July 2026 |
| MCP server | Phase 3 | 20+ clients |
| Conditional sequence branching | Phase 2 | Core loop proven |
| Mobile app | Year 2 | — |
| Revenue forecasting | Needs live data | Year 2 |

---

## QUICK REFERENCE — EVERY LINK YOU NEED

| What | URL |
|---|---|
| Website | get-kind.com |
| Client Portal | app.get-kind.com |
| Admin | admin.get-kind.com |
| API | kindapi-production-e64c.up.railway.app |
| Supabase | supabase.com → kind project |
| Railway | railway.app → KIND API |
| Vercel | vercel.com → kind-portal + kind-admin |
| Stripe | dashboard.stripe.com |
| Resend | resend.com |
| Apollo | app.apollo.io |
| HubSpot | app.hubspot.com |
| Calendly | calendly.com/jacques-vieiraza/30min |
| Sales Playbook | admin.get-kind.com/docs/sales-playbook |
| Admin Status | admin.get-kind.com/status |
| Demo Envs | admin.get-kind.com/demo |
| Meta Developers | developers.facebook.com |
| Meta Business Manager | business.facebook.com |

---

*Updated: 26 May 2026 evening — WhatsApp application added, full 5-day plan*

---

## 📅 5-DAY PLAN — 26–31 MAY 2026

---

### TONIGHT — 26 May (Tuesday)
**Read MASTER.md on GitHub. Make notes. Come back tomorrow ready.**

**You — 15 minutes max (clear the launch blockers before bed)**

| # | Task | Time | Exact steps |
|---|---|---|---|
| 1 | **Stripe webhook secret** | 2 min | Stripe → Developers → Webhooks → Add endpoint → URL: `https://kindapi-production-e64c.up.railway.app/stripe/webhook` → Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` → Copy signing secret → Railway → `STRIPE_WEBHOOK_SECRET` |
| 2 | **Upgrade Resend to paid** | 2 min | resend.com/billing → Pro ($20/mo) — free plan = 100 emails/day ceiling, FIGSY hits this immediately |
| 3 | **Fix 4 Stripe prices** | 10 min | Stripe → Products → archive old 40cr + 100cr prices (Lead Gen + FIGSY). Recreate flat: Lead Gen 40cr=$40, 100cr=$100, FIGSY 40cr=$120, 100cr=$300. Copy 4 new price IDs → Railway: `STRIPE_PRICE_LEADGEN_40`, `STRIPE_PRICE_LEADGEN_100`, `STRIPE_PRICE_FIGSY_40`, `STRIPE_PRICE_FIGSY_100` |

**If #1–3 not done tonight, do them first thing tomorrow morning before the smoke test.**

**Claude — tonight**
- Homepage hero rewrite (new punchy copy, Apex framing)
- AI reply categorisation prep
- Smoke test issue log template ready

---

### DAY 1 — 27 May (Wednesday) — SMOKE TEST + OUTREACH START

**This is the most important day. Two things and nothing else.**

---

#### PART 1: SMOKE TEST (morning — 45–60 min)

**Before you start:** Confirm #1–3 from last night are done. Check Railway has `STRIPE_WEBHOOK_SECRET` set.

**Also do first (2 min):**
- Supabase → SQL Editor → run `supabase/migrations/20260526_platform_status.sql`

**Run every step yourself, as a real paying client:**

| Step | What you do | What must happen | If it fails |
|---|---|---|---|
| 1 | Go to get-kind.com → click Sign Up | Lands on app.get-kind.com/login | Tell me — routing issue |
| 2 | Enter email + password → Sign Up | Goes straight to /onboard — NO confirmation email | Tell me — auth config |
| 3 | Fill company name, industry, country → Start free trial | Dashboard loads with your company name in the sidebar | Tell me — onboard flow |
| 4 | Go to Leads → Build ICP → click "Suggest ICP with AI" | Claude fills the form fields automatically within 5 seconds | Tell me — AI ICP suggest |
| 5 | Adjust ICP → Save & Find Leads | Real leads appear with scores (0–100) within 2 minutes | Tell me — Apollo search |
| 6 | Select one lead → Send POPIA consent | Confirmation shows, lead status changes to `consent_sent` | Tell me — Resend or consent route |
| 7 | Leads table → Export CSV | File downloads, opens in Excel, correct columns | Tell me — export route |
| 8 | Sidebar → Billing → buy smallest credit pack | Stripe checkout opens. Pay. Returns to portal. Credit balance updates. | Tell me — Stripe webhook |
| 9 | Portal → FIGSY page | Shows locked screen with "Upgrade" and "Book a Demo" buttons | Tell me — subscription gate |
| 10 | Portal → Milla page | Shows locked screen | Tell me — subscription gate |
| 11 | Portal → Vida page | Shows locked screen | Tell me — subscription gate |
| 12 | Sidebar bottom | Green pulsing dot — "All systems operational" | Tell me — health check |
| 13 | Admin → Demo Envs → Create Demo | Leads populate → click Open Demo → portal opens as demo client in new tab | Tell me — demo env creation |
| 14 | Admin → Clients → find your test account → Grant 50 credits | Balance updates on client record, transaction appears in history | Tell me — admin grant |
| 15 | Sign out → sign back in | Dashboard loads cleanly — no redirect loop, no blank screen | Tell me — session handling |

**How to report:** Screenshot + which step number. I fix and redeploy within minutes. Re-run that step only.

---

#### PART 2: OUTREACH (afternoon — 1–2 hours)

**Start this regardless of smoke test results. Run them in parallel.**

**10 warm personal messages — LinkedIn or WhatsApp**

Who to message: people who already know you, know you're building something, would be curious. Ex-colleagues. Business contacts. Friends who run B2B companies. Anyone who's asked "how's the startup going?"

**The message (adapt the tone to how you talk to each person):**
> *"Hey [name] — been building something for the past few months and finally launched. It's an AI SDR for B2B companies — finds the leads, writes the emails, handles the replies. Managed for you, no setup. 5 minutes to show you? Happy to do a quick call or just send a link."*

**Do NOT send a deck. Do NOT send a pitch. Send a message that sounds like you.**

Target: 10 messages sent by end of day. Aim for 3 responses.

**LinkedIn post #1**
- Admin → CMO Tools → copy today's drafted post
- Read it. Change the first line to sound like your voice.
- Post it. No scheduling. Post it now.

---

**Claude — running Day 1**
- Fix every smoke test issue as you report them. Real-time.
- Build: unified reply inbox (Unibox) — first pass
- Build: deliverability dashboard — first pass
- Build: AI reply categorisation (hot / warm / cold / wrong person / OOO)

---

### DAY 2 — 28 May (Thursday) — FIXES + MOMENTUM

**You**

| Task | Notes |
|---|---|
| **Report any remaining smoke test issues** | Anything still broken from yesterday — send me the screenshot |
| **Follow up on Day 1 outreach** | Check replies. Respond to anyone who engaged. If someone said "yes" or "maybe" — book a call immediately. Don't let it go cold. |
| **Send 5 more outreach messages** | Second wave — slightly cooler contacts. People you haven't spoken to in a while but who run B2B businesses. |
| **Book first discovery call** | If anyone said yes from Day 1 — get it in the calendar. Calendly link is live and wired. |
| **Apply Supabase migration if missed** | `supabase/migrations/20260526_platform_status.sql` — if not done Day 1 |

**If a call is booked:** Admin → Sales Playbook — read the discovery script before you go in. It has the exact questions and the demo flow.

**Claude — Day 2**
- All remaining smoke test fixes deployed
- Build: waterfall enrichment (Apollo → PDL → Hunter fallback)
- Build: email score pre-send check (score sequence quality before it fires)
- Technical debt: duplicate route cleanup

---

### DAY 3 — 29 May (Friday) — FIRST CALLS + PIPELINE

**You**

| Task | Notes |
|---|---|
| **Run discovery call(s) booked** | Use Sales Playbook script. Goal: understand their current lead gen. Book a demo follow-up. Do NOT pitch on the first call. Listen. |
| **Follow up on all outreach** | Anyone who hasn't replied after 2 days — one follow-up message: *"Did this land? Happy to send a quick loom instead."* |
| **LinkedIn post #2** | Admin → CMO Tools → second post of the week |
| **UK Companies House number** | If approved — paste it to me, I wire it into footer + legal pages in 10 minutes |
| **Review the week so far** | What's working in outreach? What response are you getting? Tell me and I'll sharpen the FIGSY campaign targeting accordingly. |

**Claude — Day 3**
- Build: adaptive send volume (auto-reduce per mailbox if domain health dips)
- Build: homepage hero rewrite deployed
- Prepare: proposal template for first prospect who's close to signing
- Technical debt: credit race condition wrapper

---

### DAY 4 — 30 May (Saturday) — REVIEW + PREP

**You (30 min)**

| Task | Notes |
|---|---|
| **Count the week** | Outreach messages sent. Replies received. Calls booked. Calls done. Any "yes"? |
| **Check admin dashboard** | Admin → /status — what's the platform showing? Any anomalies? |
| **Check FIGSY self-outreach** | Admin → Clients → your own client → FIGSY campaigns — did Monday's self-outreach fire? What's the reply rate? |
| **Write 3 LinkedIn comments** | Find 3 posts from potential prospects or sector leaders. Leave a comment. This is presence-building, not pitching. |
| **Prep for Monday calls** | If any discovery calls are booked for next week — re-read the Sales Playbook and prep one sentence about their specific business before the call. |

**Claude — Day 4**
- Any build items that need deploying
- Review cron job logs for any silent failures
- Prepare: week 2 outreach batch (5 more names + messages) so Monday starts immediately

---

### DAY 5 — 31 May (Sunday) — REST + MONDAY SETUP

**You**

| Task | Notes |
|---|---|
| **Rest** | You've had a big week. Don't build on a Sunday unless you want to. |
| **Optional: read MASTER.md again** | See if anything from your notes this week needs updating. Come back with a list. |
| **Write 10 names for Week 2 outreach** | Just a list on paper — who are the 10 people you'll message Monday morning? |

**Claude — Sunday**
- Build queue items
- Week 2 outreach FIGSY campaign refined (based on Day 3 feedback on what's resonating)
- Any outstanding fixes

---

## BY END OF DAY 31 MAY — WHAT WE NEED TO HAVE

| Target | Status |
|---|---|
| Smoke test: all 15 steps passing | — |
| Platform blockers cleared (Stripe webhook, Resend, prices) | — |
| 15+ outreach messages sent | — |
| 3+ replies received | — |
| 1+ discovery call booked | — |
| LinkedIn: 2 posts + 3 comments done | — |
| FIGSY self-outreach running (auto-fires Monday) | ✅ Already live |
| All smoke test issues fixed and redeployed | — |

---

## MY BUILD QUEUE — NEXT 5 DAYS (Claude)

In priority order. Working through these in parallel with your smoke test and outreach.

| # | What | Why | Target day |
|---|---|---|---|
| 1 | **Fix all smoke test issues** | Blocking launch | Day 1–2 as you report them |
| 2 | **AI reply categorisation** | Extend auto-pause: hot/warm/cold/wrong person/OOO — each routes differently | Day 1 |
| 3 | **Unified reply inbox (Unibox)** | Admin view of all campaign replies across all clients | Day 1–2 |
| 4 | **Deliverability dashboard** | Spam rate, inbox %, DNS health per sending domain — in Platform Health | Day 2 |
| 5 | **Homepage hero rewrite** | Sharper copy for cold visitors — Apex-inspired framing | Day 1 |
| 6 | **Waterfall enrichment** | Apollo → PDL → Hunter fallback — 20–40% more leads from same ICP | Day 2–3 |
| 7 | **Email score pre-send** | Score sequence before it fires — flag weak emails before they go out | Day 3 |
| 8 | **Adaptive send volume** | Auto-reduce per mailbox if domain health dips (Woodpecker model) | Day 3–4 |
| 9 | **Technical debt — duplicate routes** | Deprecate `/leads/consent/bulk` vs `/leads/bulk-consent` | Day 4 |
| 10 | **Technical debt — credit race condition** | Wrap credit deduction in DB transaction | Day 4 |
| 11 | **Proposal template** | Ready for first prospect close to signing | Day 3 (on demand) |
| 12 | **Week 2 outreach refinement** | Refine FIGSY campaign based on what's resonating in your personal outreach | Day 4–5 |

---

## WHAT'S NOT ON MY LIST (and why)

| Item | Why not now |
|---|---|
| Email warmup infrastructure | Requires a third-party warmup pool service — needs a decision on which one (Lemwarm, Mailreach, etc.) before I can build the integration. Ask me and we'll decide together. |
| LinkedIn automation | ToS risk — always off the table |
| Milla + Vida launch | July — not touching these until after first 5 clients |
| MCP server | Phase 3 — after 20+ clients |
| Conditional sequence branching | Phase 2 — after core loop proven |
| Mobile app | Year 2 |
| Revenue forecasting | Needs live data — Year 2 |

---

## QUICK REFERENCE — EVERY LINK YOU NEED

| What | URL |
|---|---|
| Website | get-kind.com |
| Client Portal | app.get-kind.com |
| Admin | admin.get-kind.com |
| API | kindapi-production-e64c.up.railway.app |
| Supabase | supabase.com → kind project |
| Railway | railway.app → KIND API |
| Vercel | vercel.com → kind-portal, kind-admin |
| Stripe | dashboard.stripe.com |
| Resend | resend.com |
| Apollo | app.apollo.io |
| HubSpot | app.hubspot.com |
| Calendly | calendly.com/jacques-vieiraza/30min |
| Sales Playbook | admin.get-kind.com/docs/sales-playbook |
| Admin Status | admin.get-kind.com/status |
| Demo Envs | admin.get-kind.com/demo |


## 3. WHAT CLAUDE CAN DO

### Built — Complete History
| Task | Date |
|---|---|
| Demo Environments — full sales demo tool in admin | 17 May |
| AI ICP Suggest — "Suggest ICP with AI" → Claude fills form | 17 May |
| Credit management — admin grant/refund credits per client + history | 18 May |
| Company registration + VAT number fields in portal + admin | 18 May |
| RLS fixed on credit_transactions | 18 May |
| KPIs dashboard | 18 May |
| Referral flow — ?ref= persistence, /clients/referrals, credit audit trail | 18 May |
| FIGSY agent memory — figsy_memory table, refresh endpoint, cron | 19 May |
| FIGSY weekly digest upgrade — FIGSY stats in Monday email | 19 May |
| FIGSY escalation alerts — auto-pauses campaigns <1% reply rate | 19 May |
| FIGSY identity card in portal | 19 May |
| Full homepage rewrite — new positioning | 20 May |
| Pricing page — Start/Scale/Dominate | 20 May |
| About page — Founder Belief, Dogfooding, AI Revenue Team sections | 20 May |
| Demo page — AI Revenue Team framing | 20 May |
| Partners page — ClickUp/Smartsheet model, pricing policy fixed | 20–24 May |
| generateSequenceWithMemory — FIGSY self-improvement | 20 May |
| Milla morning brief + anomaly detection crons | 20 May |
| FIGSY auto-replenish cron | 20 May |
| K.I.N.D self-outreach (CMO cron) | 20 May |
| /stats/platform public endpoint | 20 May |
| 12 cron jobs total | 20 May |
| Founder name removed from all public pages | 20 May |
| Campaign intent prompt — feature flagged | 24 May |
| Conversational ICP builder — feature flagged | 24 May |
| Web Speech API voice input — on both above | 24 May |
| MASTER.md updated — added GTM strategy + UK registration | 24 May |
| ICP website scan — "Scan website" button in portal ICP form | 24 May |
| Admin cohort analytics — /admin/cohorts, monthly grouping, activation/conversion/churn | 24 May |
| Portal analytics page — /dashboard/analytics, 6-month trends, ICP breakdown, score distribution | 24 May |
| Stripe billing confirmed fully wired — activates on STRIPE_SECRET_KEY env var | 24 May |
| MASTER.md full update — reflects all 24 May builds | 24 May |
| Lead drip system — delivered_at column, daily_drip_rate per client, 08:10 UTC cron | 26 May |
| Credits deduct at delivery — /leads/drip deducts 1 credit per lead on deliver | 26 May |
| Lead overspend fix — maxLeads cap, leads_per_run respected | 26 May |
| Apollo fallback search — 3-pass: full → remove consent → remove size | 26 May |
| Low credit warning — /ae/low-credits daily 07:40 UTC | 26 May |
| Subscription lapse check — /subscriptions/check-lapsed daily 09:00 UTC | 26 May |
| Milla hooks crash fixed — full page rewrite, all hooks before conditional returns | 26 May |
| Milla access gate — trialing removed, active-only | 26 May |
| Vida access gate — trialing removed, active-only | 26 May |
| FIGSY trial expiry gate — backend rejects expired trialing subs | 26 May |
| Cancel subscription — POST /subscriptions/:id/cancel | 26 May |
| Recurring billing webhooks improved — sub.create saves code, charge.success handles renewals | 26 May |
| Admin credit grant cap — 500 credit max per manual grant | 26 May |
| Credit pricing aligned — 2 tiers only, matches constants | 26 May |
| Cron stagger — no two jobs fire at same time (08:10, 07:40 for new jobs) | 26 May |
| Stats endpoint resilience — Promise.allSettled prevents blank stats panel | 26 May |
| sub.clients null guard — prevents crash in trial expiry handler | 26 May |
| Full system audit — 45 issues found, 14 fixed this session | 26 May |
| FIGSY inbound webhook fix — moved before requireAuth, RESEND_WEBHOOK_SECRET header check | 26 May |
| Bulk export row cap — 5,000 rows max + X-Export-Truncated header | 26 May |
| Widget rate limiting — 20 req/IP/min in-memory, no new package dep | 26 May |
| TypeScript unused import + PromiseLike error fixes in icps.ts | 26 May |
| Founder morning brief — POST /internal/founder-brief, daily 07:05 SAST dark HTML email | 26 May |
| Admin scalability page — /scalability: stage tracker, hire checklist, infra triggers | 26 May |
| HubSpot full sync — lib/hubspot.ts: signup→contact, payment→deal closed, FIGSY reply→timeline, pipeline view | 26 May |
| Admin HubSpot pipeline page — /hubspot: Kanban by stage, setup guide if key absent | 26 May |
| Competitor ICP seed configs — supabase/seeds/competitor_icps.sql: Lemlist/Instantly/Clay/Apollo users in Africa | 26 May |
| Cron stagger — morning brief at 05:05 UTC, no conflict with auto-replenish at 05:00 | 26 May |

### Ready Now (say the word)
| Task | Time |
|---|---|
| **Wire "Book a Demo" buttons** | **5 mins** — share your Calendly/Cal.com URL |
| **Sales playbook skeleton** | 2 hours — discovery script, objection log, demo flow, proposal template |
| Paystack end-to-end test after live key | 30 mins |
| Stripe end-to-end test after credentials | 1 hour |
| GBP pricing on website after Stripe | 30 mins |
| Fix any error — share screenshot | Ready |

---

## 4. POST-LAUNCH ROADMAP — FULL DETAIL

### Immediate (Phase 1 — May 2026)
| Item | Owner | Status |
|---|---|---|
| Platform fully live | Claude | ✅ Done |
| Demo Environments | Claude | ✅ Done |
| AI ICP Suggest | Claude | ✅ Done |
| Credit management in admin | Claude | ✅ Done |
| Paystack KYC → live key | Jacques | ⏳ Pending |
| Google Workspace | Jacques | ⏳ Pending |
| First 5 paying clients | Jacques | ⏳ Pending |
| FIGSY campaigns live (own GTM) | Both | ⏳ Pending |

### Month 1–2 (June 2026)
| Item | Owner | Notes |
|---|---|---|
| Milla + Vida full launch | Both | Built and waiting |
| Voice agent activation | Jacques | Vapi.ai account + Twilio SA number |
| WhatsApp activation | Jacques | Meta Business API (3–7 day approval) |
| Google Calendar activation | Jacques | Google Cloud OAuth |
| Stripe activation | Jacques | USD/GBP billing |
| Pan-African presence: 3 countries | Both | Apollo data covers all |
| Admin cohort analytics | Claude | ✅ Done — /admin/cohorts |

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
| Meeting notetaker | Auto-join calls, transcribe, action items — VA product extension |
| SOC 2 Type II | Q1 2027 — external auditor |

---

## 5. WHAT'S BUILT

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
| **Agent identity card** | Named agent UI in portal — live stats, last active, status |
| **Campaign memory** | `figsy_memory` table — avg reply rate, total sent, learns per client |
| **Escalation alerts** | Daily cron auto-pauses campaigns <1% reply rate after 20+ emails |
| **Weekly outreach digest** | Monday email now includes FIGSY stats (sent, reply rate, interested, campaigns) |
| **`paused_low_performance` status** | Campaign status when auto-paused — shown as "Auto-paused" in portal |

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
| Auto top-up settings | Live |
| Trial expired overlay | Live |

### Settings
| Item | Notes |
|---|---|
| Company name, industry, country, website, phone | Live |
| **Company registration no. + VAT number** | New — 18 May |
| CRM integration — HubSpot, Pipedrive | Live |
| Google Calendar connect | Built, needs credentials |

### Admin Portal
| Item | Notes |
|---|---|
| Dashboard — KPIs, MRR, TTFL, client pipeline | Live |
| Clients list | All clients, subs, T&Cs |
| **Client detail** — subscriptions, credit balance, grant/refund form, transaction history, company reg, VAT | New — 18 May |
| **Demo Environments** — create/open/extend/expire | New — 18 May |
| Roadmap — Phase 1–4 milestone tracking | Live |
| Launch checklist — 13 sections, 60+ items | Live |
| CMO tools — LinkedIn post generator, prospect finder | Live |

### Demo Environments
| Item | Notes |
|---|---|
| Creates real Supabase user + client + all 4 products | Live |
| Runs real Apollo ICP job → real leads, real scores | Live |
| Magic link → portal opens as demo client in new tab | Live |
| Extend / expire controls | Live |
| Tracks which AE created each demo | Live |

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

## 6. BLOCKED FEATURES — NEEDS CREDENTIALS ONLY

| Feature | What to do | Env vars needed |
|---|---|---|
| **Paystack live payments** | Complete KYC → get sk_live_ key | PAYSTACK_SECRET_KEY (live) |
| **Stripe USD/GBP billing** | Create Stripe account + 4 price IDs | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, 4× STRIPE_PRICE_* |
| **Voice calls (Vapi.ai)** | Vapi account + Twilio +27 number | VAPI_API_KEY, VAPI_PHONE_NUMBER_ID, VAPI_ASSISTANT_ID, VAPI_WEBHOOK_SECRET |
| **WhatsApp** | Meta Business API approval | WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN |
| **Google Calendar** | Google Cloud project + OAuth | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI |
| **Resend inbound routing** | Upgrade Resend to paid | Then configure webhook to /figsy/replies/inbound |
| **Milla + Vida** | Nothing — waiting for July 2026 launch date | — |

---

## 7. WILL NOT BUILD YET

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

## 8. MARKET EXPANSION — US, UK & AFRICA

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

## 9. COMPLIANCE — FULL AUDIT

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

## 10. SECURITY AUDIT RESULTS

Full audit completed 18 May 2026. All tables and routes checked.

| Area | Status | Detail |
|---|---|---|
| RLS — all client data tables | ✅ Protected | clients, icps, leads, subscriptions, figsy tables, milla, vida |
| **credit_transactions** | ✅ Fixed 18 May | Was missing RLS — any client could read others' financial history. Fixed. |
| API auth — all user routes | ✅ Protected | requireAuth middleware on every router |
| API auth — admin routes | ✅ Protected | requireAdminKey on all admin endpoints |
| JWT refresh | ✅ Working | Supabase SSR runs on every portal request |
| CORS | ✅ Strict | Allowlist: get-kind.com, app.get-kind.com, admin.get-kind.com |
| Subscription gating | ✅ Defense-in-depth | Frontend locked screens + backend 403 checks |
| Demo isolation | ✅ Secure | Demo clients are real rows under same RLS as paying clients |
| Opt-out blocklist | ✅ Enforced | Checked before every lead insert |

**Action required:** Run `supabase/migrations/20260518_credit_transactions_rls.sql` in Supabase SQL Editor.

---

## 11. AGENT NAMING

| Agent | Named after | Role | Status |
|---|---|---|---|
| **FIGSY** | The founder | AI SDR — outbound email, follow-up, meeting booking | ✅ Live |
| **Milla** | Founder's daughter | Virtual Assistant — trained on your business | July 2026 |
| **Vida** | Founder's daughter | Chatbot Agent — website + WhatsApp inbound qualifier | July 2026 |

---

## 12. PRICING MODEL

### Credit Bundles (current model)

| Product | Credits | Price USD | Price ZAR |
|---|---|---|---|
| K.I.N.D AI — Lead Gen Pro | 20 | $20 | R380 |
| K.I.N.D AI — Lead Gen Pro | 40 | $40 | R760 |
| K.I.N.D AI — Lead Gen Pro | 100 | $100 | R1,900 |
| FIGSY Advanced | 20 | $60 | R1,140 |
| FIGSY Advanced | 40 | $120 | R2,280 |
| FIGSY Advanced | 100 | $300 | R5,700 |

**Phase 2 billing evolution:** Credit bundles → recurring monthly subscription model once value is proven.

---

## 13. REVENUE TARGETS & KPIs

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

## 14. CASHFLOW MODEL

### Fixed Monthly Tech Costs

| Service | Plan | Cost/mo |
|---|---|---|
| Supabase | Pro (af-south-1 required) | $25 |
| Vercel | Pro | $20 |
| Railway | Usage-based | $10–20 |
| Apollo.io | Free now (50 credits/mo) → Monthly Basic ($99/mo) when client 1 pays → Annual ($49/mo) when MRR covers $588 upfront | $0 → $99 |
| Google Workspace | Business Starter (hello@get-kind.com) | $12–18 |
| Resend | Free → Pro at scale | $0–20 |
| Domain | Annual | ~$1 |
| **Total floor (excl. Claude Code)** | | **$167–203/mo** |

**Variable costs per lead:** ~$0.009

**Break-even: 2 clients.**

---

## 15. CLIENT FLOW — ALL PATHS

See full SOP: `docs/client-flow-sop.md`

Summary:
1. **Self-service trial** — signup → no email confirmation → /onboard → dashboard → 14-day trial → pay
2. **AE-assisted** — same as above, AE helps with order form + payment
3. **Pay day 1** — signup → skip trial → pay immediately
4. **Trial expired** — overlay → pay to regain access
5. **Upgrade** — active client adds FIGSY bundle (manual admin action to cancel old sub)
6. **FIGSY add-on** — manual process, AE activates via admin
7. **Sales demo** — Admin → Demo Envs → create demo → open portal as prospect

---

## 16. OPERATIONS SOP

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
| Friday | Review usage metrics — flag low engagement |

---

## 17. TECH STACK & INFRASTRUCTURE

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

### Railway Env Vars (all set ✅)
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
APOLLO_API_KEY
RESEND_API_KEY
PAYSTACK_SECRET_KEY          ← test key now — update to live key after KYC
PAYSTACK_WEBHOOK_SECRET
ADMIN_SECRET_KEY
FOUNDER_EMAIL                ← update to hello@get-kind.com after Workspace
FIGSY_REPLY_TO=replies@get-kind.com
FIGSY_DAILY_SEND_LIMIT=20
PORTAL_URL=https://app.get-kind.com
```

### Add urgently (unlocks built features)
```
RESEND_WEBHOOK_SECRET=          ← same string registered in Resend webhook dashboard
FIGSY_KIND_CLIENT_ID=           ← your own client UUID (find in Supabase clients table)
HUBSPOT_API_KEY=                ← from HubSpot → Settings → Private Apps → "KIND AI"
PAYSTACK_PLAN_VA_MONTHLY=       ← from Paystack Plans dashboard
PAYSTACK_PLAN_VA_ANNUAL=
PAYSTACK_PLAN_CHATBOT_MONTHLY=
PAYSTACK_PLAN_CHATBOT_ANNUAL=
PAYSTACK_PLAN_FIGSY_MONTHLY=
PAYSTACK_PLAN_FIGSY_ANNUAL=
FLUTTERWAVE_SECRET_KEY=     ← from Flutterwave dashboard → API Keys
FLUTTERWAVE_WEBHOOK_HASH=   ← set in Flutterwave webhook settings, copy same string here
```

### Add when ready
```
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
```

### Cron Jobs (16 jobs — built into API, auto-starts on boot)
| Schedule (UTC) | SAST | Endpoint | Purpose |
|---|---|---|---|
| 5 5 * * * | 07:05 | POST /internal/founder-brief | Founder morning brief email |
| 0 5 * * * | 07:00 | POST /internal/figsy/auto-replenish | Alert campaigns running low |
| 0 6 * * * | 08:00 | POST /internal/ae/nurture | Trial nurture (Days 1/3/5/7/10) |
| 15 6 * * * | 08:15 | POST /internal/ae/at-risk | At-risk client alerts |
| 0 7 * * * | 09:00 | POST /internal/ae/trial-expiry | Trial expiry emails (Days 10/12/14) |
| 15 7 * * * | 09:15 | POST /internal/ae/zero-credits | Zero credits warning |
| 30 7 * * * | 09:30 | POST /internal/milla/morning-brief-all | Milla daily digest to all clients |
| 40 7 * * * | 09:40 | POST /internal/ae/low-credits | Low credit warning (1–4 remaining) |
| 0 8 * * * | 10:00 | POST /internal/figsy/check-performance | Pause campaigns <1% reply rate |
| 10 8 * * * | 10:10 | POST /internal/leads/drip | Deliver daily leads, deduct credits |
| 30 8 * * * | 10:30 | POST /internal/milla/check-anomalies | Anomaly detection |
| 0 9 * * * | 11:00 | POST /internal/subscriptions/check-lapsed | Mark lapsed subs, email clients |
| 0 */2 * * * | every 2h | POST /internal/figsy/send-due-all | FIGSY send due emails all clients |
| 0 7 * * 1 | Mon 09:00 | POST /internal/digest/weekly | Monday leads digest to clients |
| 0 6 * * 1 | Mon 08:00 | POST /internal/cmo/self-outreach | K.I.N.D self-outreach (Monday) |
| 0 16 * * 5 | Fri 18:00 | POST /internal/cro/weekly-digest | Friday founder digest |

---

## 18. SMOKE TEST CHECKLIST

| Step | Action | Pass condition |
|---|---|---|
| 1 | Sign up at get-kind.com | Redirects to app.get-kind.com/login |
| 2 | Fill email + password → Sign Up | **No confirmation email** — lands directly on /onboard |
| 3 | Fill company name, industry, country → Start free trial | Dashboard loads with company name |
| 4 | Build ICP — click "Suggest ICP with AI" | Claude fills form fields automatically |
| 5 | Adjust and click Save & Find Leads | Leads appear within minutes with scores |
| 6 | Send POPIA consent to one lead | Email arrives, status → consent_sent |
| 7 | Export leads as CSV | File downloads with correct columns |
| 8 | Go to Billing → buy credits | Paystack opens, returns, balance updates |
| 9 | Check FIGSY / VA / Chatbot screens | Locked screens show Upgrade + Book a Demo |
| 10 | Sidebar bottom | Green dot "All systems operational" |
| 11 | Admin → Demo Envs → create demo | Leads appear → Open Demo → portal opens as demo client |
| 12 | Admin → Clients → pick client → grant 50 credits | Balance updates, transaction recorded |
| 13 | Sign out → sign back in | Dashboard loads, no empty loop |

---

## 19. PRODUCT VISION — 1, 3, 5 YEARS

> **The first-mover window in Africa is 18–24 months.** The moat being built now — the data, the brand, the client relationships — is what makes K.I.N.D unconquerable when bigger players arrive.

> **TTFL (Time to First Lead) is not just a metric. It is the competitive weapon.** Every competitor makes you wait. We deliver in under 2 hours.

> **Data accumulates from Day 1.** Every lead scored, every ICP run, every FIGSY email sent is a proprietary dataset no competitor can buy. By Year 3, that dataset is the product.

### Year 1 (by May 2027) — $40,000 MRR
- 150+ paying clients (SA, UK, US, Nigeria, Kenya)
- Lead Gen + FIGSY proven and reliable
- Milla (VA) + Vida (Chatbot) live for 30+ clients
- K.I.N.D's own outbound running entirely on FIGSY
- **Critical output:** Data. Every client run builds the dataset.

### Year 2 (2027) — $120,000 MRR / 450 clients
- **Full B2B Revenue OS** — K.I.N.D handles the entire journey from stranger to signed contract
- Built-in CRM — clients stop needing HubSpot or Salesforce
- Pipeline forecasting — AI predicts close probability from lead score + FIGSY engagement
- Multi-channel FIGSY — email, LinkedIn, WhatsApp, voice
- Pan-African launch: Nigeria, Kenya, Ghana, Egypt
- Recurring subscription model becomes primary revenue

### Year 3 (2028) — $300,000 MRR / 1,000 clients
- **Data Advantage** — proprietary dataset: leads scored + converted across thousands of African B2B companies
- Predictive ICP — K.I.N.D tells you who to target before you ask
- Industry benchmarks — "Companies like yours convert at 3.2% — you're at 1.8%"
- White-label offering for agencies
- SOC 2 Type II certified

### Year 4 (2029) — $700,000 MRR / 2,500 clients
- **The Network Effect** — K.I.N.D sits between buyers and sellers across thousands of companies
- Warm B2B introductions — K.I.N.D knows who wants to buy and who wants to sell
- Marketplace dynamics — deals happen on the platform
- **K.I.N.D becomes a B2B network, not just software**
- First institutional funding or strategic acquisition interest

### Year 5 (2030) — Market Leader
- 5,000+ clients, 10+ countries, IPO-ready on JSE
- Or acquisition by global CRM, data, or AI player at $50–100M+
- **The Salesforce of Africa — AI-native from day one**

---

## 20. ALTA AI SDR — COMPETITIVE AUDIT

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

## 21. KEY DECISIONS LOCKED

| Decision | Outcome |
|---|---|
| Core metric | TTFL — target < 2 hours from signup |
| Billing model | Credit bundles now → recurring subscriptions Phase 2 |
| Agent naming | FIGSY (founder) · Milla (daughter) · Vida (daughter) |
| Market expansion trigger | After 5 paying clients |
| Compliance | POPIA + GDPR + CAN-SPAM + CCPA |
| Milla + Vida launch | July 2026 |
| Payment processor | **Stripe (USD/GBP) — primary**. Founder is UK-based, Paystack requires SA entity. African clients pay in USD via international card. Flutterwave Phase 2 for local African payment methods (M-Pesa etc). |
| AI provider | Anthropic Claude — Haiku for volume, Sonnet for quality |
| Data source | Apollo.io |
| Hosting | Supabase af-south-1 + Railway + Vercel |
| LinkedIn automation | Will not build — ToS risk |
| SOC 2 | Q1 2027 |
| Business registration | UK — Companies House |
| No email confirmation | Removed — signup is instant |
| CRM | HubSpot + Pipedrive push only. Built-in CRM Year 2. |
| Multi-year contracts | Will not offer |

---

---

## 22. GO-TO-MARKET STRATEGY

### Core GTM Principle
K.I.N.D sells itself using K.I.N.D. FIGSY finds and contacts our own prospects. Every client we close is proof the product works. Every cold email sent by FIGSY on our behalf is a live demo.

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
|---------|----------|-------|
| **FIGSY self-outreach** | K.I.N.D finds its own clients using FIGSY. Monday cron runs Apollo search, auto-enrols prospects. | Automated (needs FIGSY_KIND_CLIENT_ID set) |
| **Founder's personal network** | Direct outreach to known contacts who fit ICP. Personal message, no pitch — "I built something, want to see it?" | Founder |
| **LinkedIn organic** | CMO cron generates 3 branded posts weekly. Founder posts. No automation — ToS risk. | Founder posts |
| **Demo Environments** | Any warm lead gets a live demo in Admin → Demo Envs. Real leads, real platform. | Founder |
| **Referral programme** | Every signed client gets a referral link (100 credits both ways). Ask for referrals on day 3 of onboarding. | Automated |

**First 5 client playbook (step by step):**
1. Activate FIGSY self-outreach (set FIGSY_KIND_CLIENT_ID in Railway)
2. Post 3x per week on LinkedIn — use CMO cron for drafts, personalise before posting
3. Reach out personally to 10 warm contacts this week
4. Every interested response → 30-min discovery call (script in Section 16)
5. Every discovery call → live demo using Demo Environments
6. Close → Paystack (after KYC) or manual invoice
7. Day 1–3: onboarding call, ICP together, first leads running
8. Day 3: ask for referral

**Conversion target:** 40% trial → paid. 5 clients from ~200 outreach touches.

---

### Phase 2 — First 20 Clients (June–July 2026)
**Trigger:** After 5 paying clients

**Add these channels:**
- **Stripe activation** → unlock USD/GBP clients (UK, US)
- **G2 / Capterra / Product Hunt** → listing drives inbound
- **Content: comparison pages** → SEO via vs-apollo, vs-outreach etc (already live)
- **Partner programme** → referral partners start sending leads
- **WhatsApp** → follow up warm leads on WhatsApp after email (after Meta approval)

**FIGSY outreach volume:**
- Phase 1: 50–100 emails/day (safe, no warmup needed)
- Phase 2: 200–300/day (consider separate sending subdomain: outreach.get-kind.com)
- Phase 3: 500+/day (multiple inboxes + warmup tool)

---

### Phase 3 — First 60 Clients (Aug–Oct 2026)
**Trigger:** After 20 paying clients

**Add these channels:**
- **Voice** (Vapi.ai) → FIGSY calls the most interested leads after 2 email touches
- **Pan-African expansion** → Nigeria, Kenya, Ghana outreach (Apollo covers all)
- **Agency partner programme** → agencies managing K.I.N.D for their clients
- **Recurring subscription model** → transition from credit bundles to monthly plans

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
- Vague promises

**What works:**
- Specific numbers (250M contacts, 8% reply rate, <2hr TTFL)
- Concrete outcomes ("books meetings for you")
- Short sentences. Active voice.
- Honest about what it does and doesn't do

---

### Launch Day Checklist (when you're ready to go public)

| # | Action |
|---|--------|
| 1 | Paystack KYC complete → live key in Railway |
| 2 | Google Workspace live → hello@get-kind.com receiving mail |
| 3 | Calendar booking link live → all "Book a Demo" buttons working |
| 4 | FIGSY_KIND_CLIENT_ID set → self-outreach running |
| 5 | Resend paid → inbound routing live → FIGSY replies working |
| 6 | Run smoke test (Section 18) end-to-end |
| 7 | Post on LinkedIn: founder story + product launch |
| 8 | Submit to G2, Capterra, Product Hunt |
| 9 | First FIGSY batch: 50 emails, monitor reply rate |
| 10 | First 3 discovery calls booked |

---

## 23. UK COMPANY REGISTRATION

### Why Register in the UK
- Credibility with UK and international clients
- Enables Stripe GBP billing (Stripe UK)
- Required for proper invoicing in GBP
- Simpler structure than SA PTY for international contracts
- References as "UK registered" in all legal docs and website footer

### Business Structure
**Private Limited Company (Ltd)** — standard for UK tech startups

### Step-by-Step Registration (same day, £50)

**Option A — Register directly (slowest, cheapest)**
1. Go to: https://www.gov.uk/limited-company-formation/register-your-company
2. Click "Use Companies House online service"
3. Choose: **Private limited company**
4. Company name: `KIND AI Ltd` or `K.I.N.D Ltd` (check availability first at https://find-and-update.company-information.service.gov.uk/)
5. Registered office address: must be a UK address — use a registered address service if needed (e.g. 1st Formations, £39/yr, provides a London address)
6. Director: your full legal name, date of birth, nationality, usual residential address (this is not public)
7. Shareholder: yourself, 100 shares at £1 each (£100 share capital)
8. SIC code: **62012** — Business and domestic software development
9. Pay £50 online — card or PayPal
10. Certificate of Incorporation arrives by email same day (usually within hours)

**Option B — Use a formation agent (easiest, ~£50–80)**
- 1st Formations: https://www.1stformations.co.uk — £52.99 includes registered address
- Rapid Formations: https://www.rapidformations.co.uk — similar pricing
- They handle all filing, provide registered address, send you the cert
- Recommended if you don't have a UK address

**After Incorporation:**
1. Note down: Company Number (e.g. 12345678) and Registered Address
2. Add company number to terms.html footer (already has placeholder)
3. Add to website footer: "K.I.N.D AI Ltd · Registered in England & Wales · No. XXXXXXXX"
4. Open a UK business bank account (Wise Business is easiest for non-UK residents — free, multi-currency)
5. Register for VAT (only required once turnover exceeds £90,000/yr — not needed now)
6. If taking GBP payments: set up Stripe UK account under the company

### What You Need Ready Before Registering
- [ ] Chosen company name (check availability first)
- [ ] UK registered address (use a service if needed — ~£39/yr)
- [ ] Your personal details (DOB, nationality, home address — not public)
- [ ] £50 payment card

### After Registration — Tell Claude
Once you have the company number, Claude will:
- Update terms.html with the registered company number
- Update website footer across all pages
- Update about.html legal section

### Annual Requirements (UK Ltd)
| Requirement | Deadline | Cost |
|-------------|----------|------|
| Confirmation Statement | Annually (anniversary of incorporation) | £34 online |
| Annual Accounts | 9 months after year-end | £0 (file yourself) or ~£300 (accountant) |
| Corporation Tax return | 12 months after year-end | Pay only if profitable |
| VAT registration | When turnover hits £90k/yr | Free |

**Note:** If you have zero UK employees and your only director is non-UK resident, you still file but tax is only due on UK-sourced income. Most early revenue will be international. Get an accountant once you hit £10k MRR.

---

## 24. ART OF POSSIBLE — PRODUCTS WE STUDY

*Products we study, what we learn, and how we respond. Not a threat list — an inspiration log.*
*Full detail in: `docs/art-of-possible.md` (also readable at Admin → Docs → Art of Possible)*

> **The one rule:** Build the foundation. Prove the loop. Then build the palace.
> **Gate:** 20+ paying clients with the core loop proven before any V2 feature is touched.

| # | Product | Category | Key Lesson | Status |
|---|---------|----------|------------|--------|
| 1 | Apex (apex.host) | Autonomous AI assistant | "Acts, doesn't just respond" — copy framing | 🟡 Actions pending |
| 2 | ClickUp | Project management SaaS | Command centre UI, multiple views, Cmd+K | ✅ Design built |
| 3 | Lemlist | Email outreach | Personalised images, template library, community | 🟡 Phase 2-3 |
| 4 | Instantly | Cold email at scale | Campaign auto-pause, domain warming cap | ✅ Built |
| 5 | Clay | Data enrichment | Multi-source fallback search | ✅ Built |
| 6 | Apollo | Lead data + sequences | Our supplier — job change alerts, sequence analytics | ✅ Integrated |

### The Three Teachers — Summary

**ClickUp → Command Centre**
Multiple views (Kanban, heatmap, timeline), Command palette Cmd+K, real-time activity feed, sidebar status bar. These are Pieces 1–5 in the Art of Possible. Build post 20 clients.

**Lemlist → Conversion Machine (6 lessons)**
1. **Personalised images** in emails — dynamically generated per prospect. Phase 3. (Piece 9)
2. **Visual sequence builder** — clients see + edit their FIGSY flow. Phase 5. (Piece 7)
3. **Template library** — pre-built sequences by ICP type. Phase 2. (Piece 10) ← low effort, high onboarding value
4. **AI icebreaker lines** — K.I.N.D already does this better (full email, not just first line) ✅
5. **Community ("Lemlist Family")** — Africa B2B content marketing. Nobody owns this space. **Start now.**
6. **Multi-channel LinkedIn** — deliberately NOT building. LinkedIn ToS risk. Decision locked.

**Apollo → Supplier + Teacher**
Apollo powers our data. They're a partial competitor (sequences vs FIGSY) but non-overlapping buyers. Lessons: job change alerts (Phase 4), sequence analytics, AI transparency. Strategic reality: K.I.N.D's moat is African B2B conversion data — unreplicable by Apollo regardless of what they build.

### The 15 Pieces — What Gets Built Post 20 Clients

| # | Piece | What it is | Build time | When |
|---|-------|-----------|-----------|------|
| 1 | Multiple views | Kanban + heatmap + timeline for leads | 2–3 days | Phase 2 |
| 2 | Command palette | Cmd+K — New ICP, Pause FIGSY, Hot leads | 1–2 days | Phase 2 |
| 3 | Real-time activity feed | Live events: email sent, reply, score, interested | 3 days | Phase 3 |
| 4 | Notification centre | Bell + red badge + slide-out panel | 3 days | Any time |
| 5 | Status bar | Sidebar bottom — FIGSY stats, credits, health | 4 hours | **First** |
| 6 | Custom lead fields | `custom_fields jsonb` per client | 4–5 days | On request |
| 7 | Visual automation builder | React Flow — triggers, actions, if/then | 2–3 weeks | Phase 5 (50+ clients) |
| 8 | ICP that learns itself | AI insight bullets from reply patterns | 2 days | Phase 4 (3mo data) |
| 9 | Personalised images | HTML-to-image per prospect in Day 1 email | 2 days | Phase 3 |
| 10 | Sequence template library | Pre-built FIGSY sequences by ICP type | 3 days | Phase 2 |
| 11 | Voice morning brief | Milla reads 90-sec audio at 7:30am | 1 day | Post Milla live |
| 12 | Benchmarks | "Your industry averages 7.1% — you're at 11%" | 2 days | Phase 4 (20+ clients) |
| 13 | White-label / Agency | Agencies manage 5–10 clients in one view | 1 week | On first request |
| 14 | **MCP server** | K.I.N.D as AI infrastructure — see below | 3–5 days | Phase 4 |
| 15 | Mobile PWA | manifest + push notifications | 2 days | Phase 3 |

### Piece 14 — MCP Server (K.I.N.D as AI Infrastructure)

**What it is:** K.I.N.D builds an MCP server. Any AI assistant (Claude or any MCP-compatible tool) can call K.I.N.D's capabilities directly without a portal login.

**Example:**
> A founder types into Claude: "Find me 20 CTOs at fintech companies in Lagos."
> Claude calls K.I.N.D MCP → runs ICP search → returns scored, POPIA-screened leads in the conversation.

**Or an agency's AI workflow:**
> Every Monday: find 50 new leads matching profile X → enroll in FIGSY sequence 3. Fully automated.

**Tools exposed:** `search_leads`, `run_icp`, `get_figsy_stats`, `enroll_lead`, `pause_campaign`, `get_credit_balance`, `get_top_leads` — all mapping to existing API endpoints. New wrapper only.

**Why strategic:**
- Anthropic MCP directory → any Claude user needing African B2B leads finds K.I.N.D first
- Developer/agency tier → higher ARPU than standard clients
- Milla uses the same MCP internally — build once, powers both
- Two revenue streams: outcomes to founders + infrastructure to builders

**Build time: 3–5 days. Trigger: 20+ clients. Say the word.**

### The Community Play — Start Now, Free

Nobody owns "B2B outreach in Africa" as a content category. One LinkedIn post or article per week:
- *"How to do cold outreach in South Africa without breaking POPIA"*
- *"Best industries for B2B sales in Nigeria right now"*
- *"Why your cold email gets no replies"*
- *"Apollo vs K.I.N.D — when to use each"*

Lemlist built their business on this. No budget needed. CMO cron already generates LinkedIn drafts. Use them.

### What's Already Built From These Products

| From | What | Status |
|------|------|--------|
| ClickUp | Dark premium website design | ✅ |
| ClickUp | 3-tier pricing max | ✅ |
| ClickUp | Partner/referral programme | ✅ |
| Lemlist | FIGSY 3-step sequence engine | ✅ |
| Lemlist | Reply classification + pause | ✅ |
| Lemlist | Campaign KPIs | ✅ |
| Lemlist | Personalisation variables | ✅ |
| Instantly | Campaign auto-pause <1% | ✅ |
| Instantly | `FIGSY_DAILY_SEND_LIMIT` | ✅ |
| Clay | Apollo 3-pass fallback search | ✅ |
| Clay | ICP as layered filter system | ✅ |

### Gaps They All Have That K.I.N.D Owns

- No African market (K.I.N.D owns ZA/NG/KE/GH — first mover, 18-24 month window)
- High friction / power-user tools vs K.I.N.D signup-and-go
- They sell tools. K.I.N.D sells results.
- No AI that learns from outcomes — K.I.N.D's figsy_memory compounds over time
- No POPIA compliance, no ZAR billing, no African contact data

### THE ACTION PLAN — How Each Piece Gets Done

*From May 25 session — "Dont build. Outline how we could do this in action."*
*Sequence locked. Nothing changes until core loop is proven for 20+ paying clients.*

| Piece | What | How | Time | Phase |
|-------|------|-----|------|-------|
| **5** | **Status bar** | `GET /clients/me/pulse` (cached 60s) + sidebar bottom component | **4 hours** | **Build first** |
| **6** | Notification centre | `notifications` table, bell icon, slide-out panel, click → navigate | 3 days | Any time |
| **1a** | Kanban view | `@dnd-kit/core` (12kb). Status → columns: `New → In Sequence → Replied → Interested → Meeting Booked → Closed` | 2–3 days | Phase 2 |
| **1b** | Score heatmap | Industries × geographies, bubble = lead count, colour = score. `recharts`. Data exists already. | 1 day | Phase 2 |
| **1c** | Timeline | Gantt per lead — when each FIGSY step fires. Data in `figsy_sent_emails`. | 2 days | Phase 3 |
| **2** | Command palette Cmd+K | `cmdk` library (7kb, Vercel/Linear/Raycast use it). Pure frontend, zero backend changes. | 1–2 days | Phase 2 |
| **3** | Real-time activity feed | Supabase realtime — `supabase.channel('activity').on('postgres_changes', ...)` — 20 lines. | 3 days | Phase 3 |
| **4** | Custom lead fields | `ALTER TABLE leads ADD COLUMN custom_fields jsonb default '{}'` + `client_lead_fields` config table | 4–5 days | On request |
| **7** | Visual automation builder | React Flow canvas. `client_automations` JSON table. Triggers → conditions → actions. | 2–3 weeks | Phase 5 |
| **8** | ICP that learns itself | SQL: leads × figsy_replies grouped by attribute → Claude Haiku writes 3–5 insight bullets → "Apply to ICP" button | 2 days | Phase 4 |
| **9** | Voice morning brief | Text already generated. Add ElevenLabs/OpenAI TTS API call → MP3 → audio player on dashboard | 1 day | Post Milla live |
| **10** | Network benchmarks | Aggregate cross-client query (min 5 clients = privacy gate). "Your industry averages 7.1% — you're at 11.4%" | 2 days | Phase 4 |
| **11** | White-label / Agency | `white_label_configs` table + `partner_id` FK + Vercel CNAME + billing multiplier | 1 week | On request |
| **12** | Mobile PWA | `manifest.json` + `next-pwa` + Web Push API + `push_subscriptions` table | 2 days | Phase 3 |
| **13** | MCP server | `@modelcontextprotocol/sdk` wrapper over existing REST API + `api_keys` table | 3–5 days | Phase 4 |

### LOOK & FEEL DIRECTION

*From May 25 — "I want this to be the best product ever." — not yet built, parked for portal V2.*

**Current state:** Clean. Functional. Dark mode works. But it feels like a tool, not a revenue command centre.

**The direction:**

**Personality per agent.** Each product section feels different — not different branding, different energy:
- FIGSY: sharp, high-frequency, outbound — intense green pulse
- Milla: calm, considered, knowledge-based — soft blue glow
- Vida: reactive, conversion-focused — sharp amber

**Live data everywhere.** Numbers count up. Progress bars fill. Reply rates update in real time. The portal should feel *alive.*

**Status bar — always visible.** Bottom of sidebar. One line: *"FIGSY sent 12 emails today · 2 replies · 847 credits · All systems operational."*

**Progressive disclosure.** Simple by default, powerful on demand. New client sees essentials. Power user accesses everything. ClickUp's model.

**Micro-interactions.** Lead scores 90+: it glows. FIGSY sends a batch: subtle pulse animation. Credits low: balance goes amber. Small moments that make the product feel considered.

### PORTAL V2 — BUILT, DORMANT

**Status: ✅ Built — activate with `FEATURE_PORTAL_V2=true` in Railway.**

Built in background during May 24-25 sessions. Hidden behind a feature flag. Not yet live for clients.

**What it includes:**
- **SidebarV2** — product switcher at the top (Lead Gen / FIGSY / Products tabs), contextual sub-nav below
- **Mission Control Dashboard** — 3-column live ops view (FIGSY outbound | Leads pipeline | Intelligence)
- **Design system tokens** — consistent spacing, colour, typography

When you're ready to show it to clients: add `FEATURE_PORTAL_V2=true` to Railway → redeploy → done.

---

## 25. COMPLIANCE CERTIFICATIONS ROADMAP

*Live tracker: Admin → Compliance*

### The 5 Certifications — What They Are and When to Get Them

| Badge | Status | Trigger | Cost (est.) | Year |
|-------|--------|---------|-------------|------|
| GDPR | ✅ Done | Built in from day 1 | £0 | 2026 |
| CCPA | ✅ Done | Built in from day 1 | £0 | 2026 |
| SOC 2 Type II | ⏳ Plan | First enterprise contract or 50+ clients | ~$50,000 | Q1 2027 |
| ISO 27001 | ⏳ Plan | Year 2 — African enterprise pipeline | ~£20,000 | 2027 |
| ISO 42001 (AI) | ⏳ Plan | Year 2 — AI governance differentiator | ~£15,000 | 2027 |

### Plain English — What Each One Means

**GDPR ✅ + CCPA ✅ — Already Done**
These aren't third-party certifications — they're regulatory compliance claims. K.I.N.D has all the policies, consent flows, and data rights built in. These badges are live on the website now — fully legitimate.

**SOC 2 Type II** — the one US enterprise buyers actually ask for. An independent accounting firm audits your security controls over 6–12 months and issues a report.
Path:
1. Run free Vanta gap assessment at vanta.com — shows exactly what's missing, no commitment
2. Fix gaps (policies, pen test, MFA everywhere) — 2–4 months
3. Observation period — operate normally for 6–12 months while Vanta collects evidence
4. CPA firm audits the evidence → issues the report
Trigger: first enterprise contract or 50+ clients. Cost: ~$50,000 Year 1 total.

**ISO 27001** — more recognised in Africa, Europe, and the Middle East than SOC 2. Opens Nigerian banks, Kenyan fintechs, and SA corporate procurement. Trigger: Year 2, African enterprise pipeline. Cost: ~£15–25,000.

**ISO 42001** — the world's first standard specifically for AI systems (published Dec 2023). Almost no companies have it yet. As an AI-native product, KIND has a natural story to tell — especially as the EU AI Act and African AI governance frameworks develop.
**Start now (free):** Create an AI Risk Register (a Google Doc listing each AI model used, what data it processes, and what decisions it influences). Costs nothing — but you can use it in enterprise conversations immediately.
Trigger: Year 2. Cost: ~£10–15,000.

### The Smart Play: Year 2 Triple Certification
Do SOC 2 + ISO 27001 + ISO 42001 simultaneously using Vanta. They share ~70% of controls. One compliance programme, three badges — ~40% cheaper than doing them separately.

### What To Do Right Now (Free, Today)
- [ ] Start AI Risk Register (Google Doc — lists all AI models, data processed, decisions made)
- [ ] Add GDPR ✅ and CCPA ✅ badges to website trust page
- [ ] Add compliance page to sales deck — shows enterprise-readiness before you have the certs

---

## 26. COMPETITOR TARGETING STRATEGY

*Competitor ICPs ready to run: `supabase/seeds/competitor_icps.sql`*
*Requires: Apollo Basic ($49/mo) minimum — free plan blocks tech stack filter*

### The Strategy
People using Lemlist, Instantly, Clay, or Smartlead in Africa are the warmest possible leads for K.I.N.D. They are already:
- Paying for outreach tools (proven budget)
- Buyers in this exact category
- Likely doing it manually and frustrated

Apollo's `technology_names` filter finds them directly.

### The 4 ICPs — Ready to Fire

**ICP 1 — Lemlist Users (Africa)**
- Titles: CEO, Founder, Co-Founder, Head of Sales, Head of Marketing
- Seniority: C-Suite, VP/Director, Manager
- Geographies: South Africa, Nigeria, Kenya, Ghana, Egypt
- Tech stack: Lemlist
- Company size: 1–200 employees
- Pitch: *"You're doing this yourself with Lemlist. We do it for you — POPIA compliant, ZAR billing, no setup."*

**ICP 2 — Instantly / Smartlead Users (Africa)**
- Titles: CEO, Founder, Agency Owner, Head of Growth
- Geographies: South Africa, Nigeria, Kenya
- Tech stack: Instantly or Smartlead
- Company size: 1–50 employees
- Pitch: *"Cold email infrastructure with no strategy is hard. FIGSY is the strategy and the sending — fully managed."*

**ICP 3 — Clay Users (Africa)**
- Titles: Head of Growth, RevOps, Founder, CEO
- Geographies: South Africa, Nigeria, Kenya
- Tech stack: Clay
- Company size: 11–200 employees
- Pitch: *"Clay is powerful but complex. K.I.N.D delivers the same enriched, personalised outreach — without needing a RevOps person to run it."*

**ICP 4 — Apollo Sequences Users (Africa)**
- Titles: Head of Sales, Sales Director, CEO, Founder
- Geographies: South Africa, Nigeria, Kenya
- Tech stack: Apollo (sequences)
- Company size: 11–500 employees
- Pitch: *"You're paying for Apollo and still managing sequences yourself. K.I.N.D wraps Apollo's data in a fully managed outreach service — you just get the meetings."*

### The Outreach Message (FIGSY Template)
> "Hi [First Name] — spotted that [Company] uses [Lemlist/Instantly/Clay]. We built K.I.N.D specifically for African businesses doing B2B outreach — fully managed, POPIA compliant, ZAR billing. FIGSY (our AI SDR) runs the whole sequence. Worth a 15-minute call?"

FIGSY reads the `tech_stack` field on the lead and references it in the opening line automatically.

### How to Activate
1. Upgrade Apollo → Basic ($49/mo) at app.apollo.io → Settings → Plan & Billing
2. Portal → ICPs → build the 4 ICPs above (or run `supabase/seeds/competitor_icps.sql` with your client_id)
3. Hit Run — leads start populating immediately
4. FIGSY campaign → enroll leads → sequences fire automatically

**Estimated pipeline from one run:** ~200 warm prospects across 4 ICPs (Africa-focused, proven buyers).

---

---

## 27. AI LEARNING CAPABILITY — BUILT, PLANNED, VISION

*This is one of K.I.N.D's core long-term moats. Every other competitor sends static sequences. K.I.N.D gets smarter with every email sent.*

---

### Level 1 — Per-Client FIGSY Memory (BUILT — 19-20 May 2026)

**What it is:** FIGSY remembers what works for each client and gets better over time.

**Where it lives:** `figsy_memory` table + `generateSequenceWithMemory()` in `apps/api/src/lib/figsy.ts`

**How it works:**
- After every reply, FIGSY updates its memory for that client:
  - `best_subject_lines` — subject lines that generated replies
  - `avg_reply_rate_30d` — rolling 30-day reply rate
  - `total_sent_all_time` — total emails sent
  - `last_winning_angle` — the angle/hook that generated the last high-response campaign
- After 20+ emails sent, all new sequences are generated using `generateSequenceWithMemory()` instead of the base `generateSequence()`
- Claude (Haiku) reads the memory context and writes sequences that replicate what worked and avoid what didn't
- Falls back to standard sequence if memory query fails

**What this means for clients:** FIGSY on Month 3 is measurably better than FIGSY on Day 1. Same client, same product, compounding improvement.

**Memory refresh:** Cron + manual endpoint (`POST /internal/figsy/refresh-memory`) recalculates the memory table from live reply data.

**Escalation logic (also built):** Daily cron auto-pauses any campaign that falls below 1% reply rate after 20+ sends. This forces a reset and prevents burning domain reputation on failing sequences.

---

### Level 2 — ICP Learning Loop (PLANNED — 6 months post-launch)

**What it is:** Monthly AI review of reply data to auto-refine the ICP criteria. FIGSY tells you who's actually responding, not who you thought would respond.

**How it works (to build):**
1. Monthly cron pulls all replies per ICP (positive, negative, neutral)
2. Claude analyses patterns: which industries/titles/company sizes are converting, which aren't
3. Generates a refined ICP recommendation
4. Emails the founder: "Based on last month, your ICP is converting best from [industry] / [title] — here's a suggested refinement."
5. Founder approves in portal → ICP updates automatically

**Why this matters:** Most B2B companies spend months refining their ICP manually from intuition. K.I.N.D does it from data — automatically. This is a feature no competitor has.

**Status:** Not built. Roadmapped for Month 6–12 (Nov 2026 – May 2027) once live reply data exists.

---

### Level 3 — Adaptive Per-Campaign Learning (PLANNED — Phase C)

**What it is:** Within-campaign adaptation. FIGSY adjusts subject lines and openers in real time based on what's working in the current batch.

**How it works (to build):**
- After Day 1 emails, scan reply rates by subject line variant
- If one subject line variant is outperforming, weight remaining sends toward it
- This is a mini A/B test that auto-resolves without the founder doing anything

**Related — A/B subject line testing (also planned):**
- Send 2 variants to first 20% of leads
- Pick winner by 48h open rate
- Send winner to remaining 80%

**Status:** Not built. Phase C roadmap item.

---

### Level 4 — Platform-Level Intelligence (Vision — Year 3, 2028)

*We park this until we have 500+ active clients. Do not build before then.*

**What it becomes:** K.I.N.D has data that no individual sales team will ever have. By 2028:

- **Proprietary dataset:** Leads scored, contacted, and converted across thousands of African B2B companies
- **Predictive ICP:** K.I.N.D tells you who to target before you ask — based on patterns from companies like yours
- **Industry benchmarks:** "Companies in your industry convert at 3.2% via FIGSY. You're at 1.8%. Here's what the top performers do differently."
- **Cross-client learning:** FIGSY learns from what's working across ALL clients in your industry — not just yours

**Why this is a moat:** Apollo sells data. Lemlist sends emails. Salesforce stores what happened. K.I.N.D learns from outcomes at scale — and that data accumulates forever.

**The compounding advantage:** Every new client makes the platform smarter for every other client in their industry. This is the network effect that makes K.I.N.D defensible at scale.

---

### The AI Learning Stack — Summary

| Level | What it does | Status | Timeline |
|-------|-------------|--------|----------|
| 1 | FIGSY learns per-client — subject lines, angles, reply rates | ✅ **BUILT** | Live since 20 May 2026 |
| 2 | ICP auto-refines from reply data — monthly AI review | ❌ Planned | Month 6–12 post-launch |
| 3 | Per-campaign adaptive sending — A/B subject lines | ❌ Planned | Phase C (Month 3+) |
| 4 | Platform learns across all clients — predictive ICP, benchmarks | 🔵 Vision | Year 3 (2028) — when 500+ clients |

---

### Connection to Competitor Positioning

Every competitor sends static, dumb sequences:
- **Lemlist:** You write the emails. Lemlist sends them.
- **Instantly:** Volume + warmup. Zero intelligence.
- **Clay:** Smart enrichment. No sequence intelligence.
- **Apollo Sequences:** Decent but you manage everything.

K.I.N.D is the only platform where the AI SDR gets measurably better the longer you use it. That is the moat. That is the selling point. That is what "FIGSY learns" means.

**Copy to use:** *"FIGSY gets smarter every month. Month 1: baseline. Month 3: it knows your best angles. Month 6: it knows your ICP better than you do."*

---

*Added: 26 May 2026*
---

## 28. CLICKUP BRAIN — WHAT WE STUDIED, WHAT WE ADOPTED, WHAT'S NEXT

*This is the "out of the box" session — May 2026. "I don't want to build now. But look at ClickUp's Brain agents and see what they have that we could use."*
*Full study: `https://clickup.com/brain/agents` and `https://clickup.com/`*

---

### What ClickUp Brain / Super Agents Actually Is

ClickUp's strategic bet: **AI agents with persistent identity, memory, and proactive triggers are the future of work management.**

Their Super Agents are not automations. Automations are: if X → do Y (deterministic, dumb). Super Agents: observe context → break goal into steps → select tools → execute → verify → escalate if uncertain. A reasoning loop. Adaptive.

**What makes them different:**

| Feature | What it means |
|---------|--------------|
| Persistent identity | Agents exist as named "people" in your workspace. They remember what happened last session, last week. |
| Memory — 3 types | Recent/Episodic (last session), Long-term (months), Preference (tone, format, how you work) |
| Proactive triggers | Fire on a schedule without anyone pressing a button. Monday morning → report sent. Friday → pipeline summary posted. |
| Escalation logic | When uncertain, the agent stops and asks instead of guessing. Doesn't run blindly. |
| 500+ skills | Research, task creation, email drafting, scheduling, standup facilitation, sprint planning, risk assessment |
| Multi-model | Clients choose GPT-5, Claude Opus, o3, Gemini depending on the task |
| Connected search | Searches ClickUp + Google Drive + GitHub + OneDrive simultaneously |

**ClickUp Brain MAX (desktop):**
- Talk-to-text AI queries — ~4× faster than typing
- Cross-tool search across all integrated apps
- Claims ~1.1 days saved per user per week

---

### The Gap This Exposed in K.I.N.D (May 2026 assessment)

| What ClickUp agents do | What K.I.N.D agents do | Gap |
|----------------------|----------------------|-----|
| Persistent identity + memory | Reset every run | ❌ |
| Proactive scheduled triggers | Human initiates everything | ❌ |
| Escalation logic (uncertain → ask) | Run blindly regardless | ❌ |
| Multi-model choice | Hard-wired to one model | ❌ |
| Meeting notetaker (joins calls, transcribes) | Not built | ❌ |

**One-line version:** ClickUp's agents are proactive, have memory, and escalate when stuck. K.I.N.D's agents were reactive, stateless, and ran blindly. Closing those three gaps is what makes K.I.N.D's AI genuinely competitive.

---

### What We Did About It — What's Built

All three core gaps were closed during the May 2026 build sessions:

| Gap | Fix | Status |
|-----|-----|--------|
| No memory | `figsy_memory` table + `generateSequenceWithMemory()` | ✅ Built — 19 May |
| Runs blindly | Escalation alerts — auto-pauses campaigns <1% reply rate after 20+ emails | ✅ Built — 19 May |
| No identity | FIGSY identity card in portal — name, avatar, live stats, "Last active X ago" | ✅ Built — 19 May |
| No proactive digest | Monday weekly digest includes FIGSY stats — sent without prompting | ✅ Built — 19 May |

**What was NOT built (parked):**
- Multi-model toggle (GPT/Claude/Gemini choice) — not a priority yet
- Meeting notetaker — "2–3 weeks for a feature clients haven't asked for yet" — park until VA matures
- Connected cross-tool search — Year 2, when Milla has meaningful document volume

---

### What K.I.N.D Should Eventually Become (The ClickUp Vision Applied)

ClickUp's Super Agents are "coworkers, not tools." They are available 24/7, they remember your context, they act without being asked, and they escalate when uncertain.

**K.I.N.D's version of this — the full agent roster:**

| Agent | ClickUp equivalent | K.I.N.D role | Status |
|-------|------------------|-------------|--------|
| FIGSY | Super Agent — outbound | AI SDR: finds leads, writes emails, handles replies, learns what works | ✅ Live |
| Milla | Brain Notetaker + Knowledge Agent | VA: answers questions, runs morning brief, drafts documents | July 2026 |
| Vida | Automation Agent — inbound | Chatbot: qualifies website visitors, WhatsApp handler | July 2026 |
| REEVE | Sales Agent | AE: books discovery calls, follows up pipeline, drafts proposals | Year 2 |
| LENA | CS Agent | Customer Success: monitors health, flags at-risk, handles check-ins | Year 2 |
| OTTO | Ops/Analytics Agent | CRO: pipeline health, revenue forecasting, anomaly alerts | Year 2 |

**Each agent (when fully built):**
- Named identity card in portal with avatar, live stats, last active timestamp
- Memory that compounds over time
- Proactive triggers — fires on schedule, not on demand
- Escalation logic — pauses and alerts when uncertain instead of running blindly

---

### The Strategic Insight From ClickUp

> *"If a traditional AI agent can run a quick data analysis, a Super Agent is the analyst — who gathers the data, runs the model, interprets the results, and delivers the report in the right format to the right stakeholder, without being explicitly told each step."*

**This is K.I.N.D's long-term product vision in one sentence.** FIGSY doesn't just send emails — it is the SDR. Milla doesn't just answer questions — it is the Chief of Staff. By Year 2, clients don't use K.I.N.D. They work *with* K.I.N.D.

**The pricing insight:** ClickUp charges $9/user/month for their AI add-on. 1,500 credits included. K.I.N.D charges per outcome ($1/lead, $3/FIGSY credit). This is better — the client pays for results, not for compute. Keep this model.

---

### Parked — Do Not Build Yet

| Item | Why parked | When |
|------|-----------|------|
| Multi-model toggle | Clients don't need this yet — they don't know what Claude vs GPT means | Year 2 |
| Meeting notetaker | No demand yet. VA product must mature first. | Month 6–12 |
| Connected cross-tool search (Google Drive + GitHub) | Milla needs real document volume first | Year 2 |
| Full persistent agent memory (episodic + long-term + preference) | `figsy_memory` is Level 1. Deep memory architecture is Year 2. | Year 2 |

---

---

### CLICKUP vs K.I.N.D — FULL DETAILED COMPARISON

*Note: ClickUp is a $1B+ general-purpose work OS. K.I.N.D is a vertical AI outbound platform. This is not a "we're behind" analysis — it is a feature map to know exactly where we differ and what to steal.*

---

#### 🧠 AI / AGENTS

| Feature | ClickUp | K.I.N.D | Gap |
|---|---|---|---|
| AI model | GPT-5, Claude Opus 4.1, o3, o1-mini (switchable) | Claude Haiku (fixed) | ⚠️ Multi-model — Year 2 |
| AI memory — episodic | ✅ Recent interactions, conversations | ❌ Not built | ❌ Year 2 |
| AI memory — long-term | ✅ Docs, past tickets, rules, naming conventions | ✅ figsy_memory (reply stats, winning angles) | ⚠️ Partial |
| AI memory — preference | ✅ Tone, format, channel preferences per person | ❌ Not built | ❌ Year 2 |
| Agent triggers — manual | ✅ @mention, DM, assign as task | ❌ N/A (different model) | — |
| Agent triggers — scheduled | ✅ Hourly / daily / weekly / monthly / custom | ⚠️ Cron (3× daily) — hardcoded | ⚠️ Phase 3 |
| Agent triggers — automated | ✅ Any workspace event via Automations | ❌ Not built | ❌ Phase 3 |
| Agent skills | ✅ 500+ prebuilt + custom | FIGSY only — sequences + reply analysis | ❌ Year 2 |
| Multi-agent orchestration | ✅ Multiple agents in parallel | ❌ Not built | ❌ Year 2 |
| Agent identity | ✅ Named workspace members, persistent | ✅ FIGSY identity card (built May '26) | ✅ Done |
| Agent escalation | ✅ Auto-pause, ask for help, route to human | ✅ Auto-pause on low performance | ✅ Done |
| AI notetaker | ✅ Joins Zoom/Teams, transcribes, creates tasks | ❌ Not built | ❌ Parked |
| Multi-model toggle | ✅ Per-task: GPT-5 vs Claude vs o3 | ❌ Fixed Haiku | ❌ Year 2 |
| AI in mobile | ✅ Brain everywhere, dictation | ❌ No mobile app | ❌ Year 2+ |

**Gap summary:** ClickUp's memory model (3 types) is far more granular. We have 1 flat table. Their scheduled triggers run independently — ours are hardcoded cron jobs. The 500+ skill library is the real moat we need to build toward.

---

#### 🖥️ CLIENT PORTAL (what clients see)

| Feature | ClickUp | K.I.N.D | Status |
|---|---|---|---|
| Dedicated client portal | ⚠️ Hacked via guest access — complex | ✅ Purpose-built (NextAuth, dashboard) | ✅ We win |
| White labeling | ❌ Enterprise only — ClickUp brand shows | ✅ Fully white-labeled | ✅ We win |
| Custom domain | ❌ Not available | ✅ Built | ✅ We win |
| Client onboarding flow | ❌ Manual per-client setup | ✅ Automated provisioning | ✅ We win |
| Campaign status view | ❌ Not purpose-built | ✅ Built | ✅ We win |
| Credit balance / usage | ❌ Not built | ✅ Built | ✅ We win |
| Lead delivery dashboard | ❌ Not built | ✅ Built | ✅ We win |
| Client self-service top-up | ❌ Not built | ✅ Stripe credit top-up | ✅ We win |
| Clean non-PM UX | ❌ Clients see full PM interface | ✅ Stripped-back, purpose-built | ✅ We win |
| Guest seat cost | ❌ Costs extra per plan | ✅ No per-client seat pricing | ✅ We win |
| File approval workflow | ❌ Not native | ❌ Not built | Both gap |
| Contract / e-sign | ❌ Not built | ❌ Not built | Both gap |
| Invoicing in portal | ❌ Not built | ❌ Not built (Stripe external) | Both gap |
| Messaging in portal | ❌ Not native | ❌ Not built | Both gap |
| Mobile client app | ❌ Guests get full ClickUp — overkill | ❌ No mobile | Both gap |
| Notification / alerts | ⚠️ Email only | ⚠️ Not built properly | Both gap |
| Real-time data refresh | ✅ Live dashboard widgets | ⚠️ Polling / page refresh | ⚠️ Phase 2 |

**Verdict:** We win the client portal category. ClickUp's is a workaround. Ours is purpose-built. The gaps: file approvals, contracts, in-portal messaging, mobile.

---

#### ⚙️ BACKEND / PLATFORM

| Feature | ClickUp | K.I.N.D | Status |
|---|---|---|---|
| Database | Proprietary cloud | Supabase (Postgres, Cape Town) | ✅ |
| API | Full REST + webhooks + Enterprise API | REST API (Express) | ✅ |
| Webhooks — outbound | ✅ Any workspace event | ✅ Stripe inbound | ⚠️ Phase 2 expand |
| Realtime | ✅ Live updates everywhere | ⚠️ Supabase realtime not wired yet | ⚠️ Phase 2 |
| File storage | ✅ Native (60MB free) | ❌ No file storage | ❌ Phase 3 |
| Multi-tenancy | ✅ Workspace isolation | ✅ Per-client RLS (Supabase) | ✅ |
| Roles / permissions | ✅ Owner, Admin, Member, Guest + custom | ⚠️ Basic — admin vs client | ⚠️ Phase 2 |
| Audit log | ✅ Enterprise | ❌ Not built | ❌ Phase 3 |
| HIPAA / SOC2 / GDPR | ✅ Enterprise | ❌ SOC2 Q1 2027 | ⚠️ Roadmapped |
| POPIA | ❌ Not SA-specific | ✅ Full POPIA compliance built | ✅ We win |
| Credit system | ❌ No credit model | ✅ Built (credit_balance, transactions) | ✅ We win |
| Background jobs | ❌ Not exposed | ✅ 16 cron jobs (Railway) | ✅ We win |
| Email sending (outbound sequences) | ❌ Notifications only | ✅ Resend + FIGSY sequences | ✅ We win |
| Sequence engine | ❌ No outbound sequences | ✅ Built (multi-step, variable days) | ✅ We win |
| Reply detection | ❌ Not built | ✅ Auto-pause on reply | ✅ We win |
| ICP management | ❌ Not built | ✅ Built (ICP cascade, attributes) | ✅ We win |
| Lead sourcing | ❌ Not built | ✅ Apollo integration | ✅ We win |
| Platform status snapshots | ❌ Not built | ✅ 3× daily (platform_status table) | ✅ We win |

---

#### 🛠️ ADMIN END

| Feature | ClickUp | K.I.N.D | Status |
|---|---|---|---|
| Admin dashboard | ✅ Full workspace analytics | ✅ Built (K.I.N.D Admin portal) | ✅ |
| Client health view | ⚠️ Task-based, not client-health | ✅ At-risk client tracking | ✅ We win |
| Revenue dashboard | ⚠️ Time billing reports only | ✅ Revenue page | ✅ We win |
| AI exec team view | ❌ Not built | ✅ /agents/otto, /lena, /reeve, /cmo, /cto, /cfo | ✅ We win |
| Cohort tracking | ❌ Not built | ✅ /cohorts | ✅ We win |
| Lead pipeline view | ❌ Not built | ✅ HubSpot integration | ✅ We win |
| Scalability modelling | ❌ Not built | ✅ /scalability | ✅ We win |
| Terms library | ❌ Not built | ✅ /terms-library | ✅ We win |
| Doc viewer (internal) | ✅ ClickUp Docs — full collaborative editor | ✅ Markdown renderer (/docs/*) | ⚠️ Theirs is richer |
| Roadmap views | ✅ Gantt, Board, multiple views | ✅ /roadmap (static) | ⚠️ Theirs is richer |
| Compliance tracking | ✅ Enterprise dashboard | ✅ /compliance page | ⚠️ Theirs is deeper |
| Scheduled report emails | ✅ Emailed on schedule | ❌ Not built | ❌ Phase 2 |
| Workload / capacity view | ✅ Full team management | ❌ N/A (no internal team yet) | N/A |
| Goals / OKR tracking | ✅ Full goal folders, progress | ❌ Not built | ❌ Phase 3 |
| Kanban for deals | ✅ Full Kanban on any list | ⚠️ HubSpot for pipeline only | ⚠️ Phase 2 (Art of Possible Piece 1) |
| Custom dashboard widgets | ✅ 100+ widget types | ⚠️ Fixed layout | ⚠️ Phase 2 |
| Public shareable dashboards | ✅ Read-only links | ❌ Not built | ❌ Phase 2 |

---

#### 📱 VIEWS / UX

| Feature | ClickUp | K.I.N.D | Status |
|---|---|---|---|
| Views | ✅ 15+ (List, Board, Gantt, Calendar, Map…) | Pages-based — no view switching | ❌ Phase 3 |
| Global search | ✅ Searches Gmail too (2026) | ❌ Not built | ❌ Phase 3 (Piece 2) |
| Command palette | ✅ Built in | ❌ Not built | ❌ Phase 3 (Piece 3) |
| Activity feed | ✅ Realtime | ❌ Not built | ❌ Phase 2 (Piece 7) |
| Mobile app | ✅ iOS + Android | ❌ None | ❌ Year 2+ |
| Dark mode | ✅ | ✅ Dark-first design | ✅ |
| Keyboard shortcuts | ✅ Full | ❌ Not built | ❌ Phase 3 |
| Team chat | ✅ Full async + AI summaries | ❌ Not built | ❌ N/A |
| Collaborative whiteboards | ✅ | ❌ Not built | ❌ N/A |
| Forms builder | ✅ Full | ❌ Not built | ❌ Phase 3 |
| Template library | ✅ 1,000+ community templates | ❌ Not built | ❌ Phase 3 (Piece 15) |

---

#### 💰 PRICING MODEL

| | ClickUp | K.I.N.D |
|---|---|---|
| Model | Per-seat / per-user / per-month | Per-client SaaS + credit consumption |
| Free tier | ✅ Free Forever (limited) | ❌ No free tier |
| Entry price | $7/user/month | ~$80/month blended ARPU |
| AI add-on | $9/user/month extra | ✅ Included |
| White label | ❌ Enterprise only (expensive) | ✅ Standard |
| African market pricing | ❌ Not localised | ✅ ZAR-aware |
| Credit / outcome model | ❌ Not applicable | ✅ Core mechanic |

---

#### 🏆 WHERE WE WIN vs ClickUp

| Win | Why it matters |
|---|---|
| Purpose-built for B2B outbound | ClickUp has zero sequence engine, zero lead delivery, zero reply handling |
| Client portal is actually clean | ClickUp guests see a PM tool — ours is a real portal |
| White label is standard | ClickUp charges enterprise rates for this |
| Credit model | No per-seat confusion — pay for what you use |
| African market + POPIA | Nobody at ClickUp is thinking about this |
| FIGSY | AI that does outbound *for* you — ClickUp's AI assists, it does not execute |

---

#### 🔴 WHERE TO STEAL FROM CLICKUP

**Steal now (Phase 2–3):**

| Feature | Why | Art of Possible |
|---|---|---|
| Command palette | Global search + quick actions | Piece 3 |
| Scheduled agent triggers (event-driven, not cron) | Our hardcoded cron is fragile — theirs fires on any event | New piece |
| 3-type memory (episodic + long-term + preference) | We have 1 flat table — major upgrade | Section 27 Level 2 |
| Activity feed (realtime) | Every action shown live | Piece 7 |
| Shareable read-only dashboards | For clients + investors | New piece |

**Steal when >20 clients:**

| Feature | Why | Art of Possible |
|---|---|---|
| Multi-model toggle | Let campaign choose Claude vs GPT per need | Piece 8 (partial) |
| Kanban view | Deals pipeline, campaign stages | Piece 1 |
| Scheduled report emails | Daily/weekly digest pushed to clients | New piece |
| File approval workflow | Client approves copy before send | New piece |

**Long term / Year 2+:**

| Feature | Why | Notes |
|---|---|---|
| Mobile app | High cost, low priority | Year 2+ |
| Meeting notetaker | Joins calls, transcribes, creates tasks | Parked (Section 28) |
| 500+ modular skill library | FIGSY vertical skills | Year 2 |
| Multi-agent orchestration | FIGSY + OTTO + LENA in parallel | Year 2 |

---

### INFOGRAPHIC TABLES — PRINT / DECK READY

*These are simplified versions of the above tables, formatted for slide decks, pitch decks, and visual use.*

---

#### INFOGRAPHIC 1 — WHERE WE WIN (6 moats)

| # | MOAT | CLICKUP | K.I.N.D |
|---|---|---|---|
| 1 | Done-for-you | ❌ Self-serve tool | ✅ We run it for you |
| 2 | Client portal | ❌ PM tool (confusing) | ✅ Purpose-built |
| 3 | White label | ❌ Enterprise only | ✅ Standard |
| 4 | Pricing | ❌ Per seat / per month | ✅ Pay per lead |
| 5 | Africa + POPIA | ❌ Not built | ✅ Day 1 |
| 6 | AI execution | ❌ AI assists | ✅ AI does |

---

#### INFOGRAPHIC 2 — AI CAPABILITIES SNAPSHOT

| Capability | ClickUp | K.I.N.D |
|---|---|---|
| AI runs campaign end-to-end | ❌ | ✅ FIGSY |
| AI memory | ✅ 3 types | ✅ 1 type (growing) |
| Agent identity | ✅ Named members | ✅ FIGSY identity card |
| Agent escalation | ✅ | ✅ Auto-pause |
| Multi-model AI | ✅ GPT-5, Claude, o3 | ❌ Haiku (Year 2) |
| Proactive triggers | ✅ Any event | ⚠️ 3× daily cron |
| 500+ skills | ✅ | ❌ (Year 2) |

---

#### INFOGRAPHIC 3 — CLIENT PORTAL SCORECARD

| Feature | ClickUp | K.I.N.D |
|---|---|---|
| Purpose-built | ❌ | ✅ |
| White-label | ❌ | ✅ |
| Lead dashboard | ❌ | ✅ |
| Campaign status | ❌ | ✅ |
| Credit top-up | ❌ | ✅ |
| Automated onboarding | ❌ | ✅ |
| Per-client seat cost | ❌ Charges extra | ✅ Free |

**Score: K.I.N.D 7 / ClickUp 0**

---

#### INFOGRAPHIC 4 — PRICING COMPARISON

| | ClickUp | K.I.N.D |
|---|---|---|
| Base | $7/user/month | ~$80/client/month |
| AI | +$9/user/month | ✅ Included |
| White label | Enterprise (~$1,200+/year) | ✅ Included |
| African pricing | ❌ | ✅ ZAR |
| Pay per result | ❌ | ✅ |

---

*Added: 26 May 2026 — full ClickUp comparison + infographic tables*

---

*Added: 26 May 2026 — "think out the box" session*
*Source: ClickUp Brain Agents (apex.host + clickup.com/brain/agents)*

---

*Owner: K.I.N.D founding team*
*Last updated: 26 May 2026 (evening)*

---

## 29. FULL COMPETITIVE LANDSCAPE — EVERY PLAYER, EVERY LAYER

*Last updated: 26 May 2026*
*Purpose: Know every competitor cold. Know where we win. Know what to steal.*

> K.I.N.D is not a tool — it is a managed AI outbound service. Most "competitors" are tools clients operate themselves. That distinction is our primary moat.

---

### HOW TO READ THIS SECTION

Competitors are grouped into 7 tiers by category. Each entry covers: what they are, full feature set, pricing, where K.I.N.D wins against them, and what is worth stealing. The master comparison table follows all entries.

---

## TIER 1 — DIRECT OUTBOUND COMPETITORS
*(These are the closest functional overlaps — email sequence + AI + lead delivery)*

---

### LEMLIST

**What they are:** The gold standard for multichannel cold outreach. Best-in-class personalisation engine. 450M+ contact database bundled on upper tiers. French company, global reach.

**Sequences & Multichannel**
- Email + LinkedIn profile view + connection request + LinkedIn message + WhatsApp + call reminder — all in one sequence
- Conditional branching: if no reply after step N, branch to path B
- AI-generated full sequences from campaign goal + value proposition
- Multi-model AI: user picks Claude, GPT, or Perplexity per campaign
- A/B testing across subject lines, body copy, CTAs

**Personalisation (their superpower)**
- Dynamic text tokens: name, company, role, custom variables per prospect
- Personalised images: prospect's name on a whiteboard, company logo on a screen, custom mockups — generated per recipient at scale
- Personalised video thumbnails: individual video links per prospect
- Landing pages that show prospect-specific content
- Image personalisation lifts open rates 5–15% vs text-only campaigns

**Deliverability**
- Lemwarm built-in (email warmup — exchanges real emails with warmed inboxes to protect sender reputation)
- Included from Email Pro tier upward
- Deliverability dashboard: spam rate, inbox placement, sender score per mailbox

**Lead Database**
- 450M+ contacts (bundled on Multichannel Expert and above)
- Email + phone + LinkedIn data included
- Waterfall email verification built in
- No separate Apollo subscription needed on top tiers

**Integrations**
- HubSpot + Salesforce native 2-way sync
- Zapier, Make, API
- MCP server launched 2025 — lets AI tools call Lemlist directly

**Agency Features**
- Multi-sender: 3–15 sending email accounts depending on plan
- Agency workspace: manage multiple client accounts under one login
- Team inbox with assignment routing
- Role management: Admin, Manager, User

**Pricing**
- Email Starter: $39/user/month
- Email Pro: $79/user/month (3 senders + Lemwarm)
- Multichannel Expert: $99/user/month (5 senders + LinkedIn + 450M DB)
- Outreach Scale: $159/user/month (15 senders)

**Where K.I.N.D wins**
- Done-for-you: Lemlist is a tool — clients run it themselves. We run it for them.
- Zero learning curve: Lemlist requires DNS setup, LinkedIn config, sequence training. Our clients never touch any of it.
- Credit model: pay per lead delivered, not per seat per month
- White-label client portal: Lemlist has no client-facing view
- African market + POPIA: no African focus, no ZAR pricing

**What to steal**
- Personalised images per lead (name/logo injected into image templates) — massive open rate lift
- Conditional sequence branching (if no reply → path B)
- Multi-model AI toggle per campaign
- Waterfall email verification (Apollo → Hunter → fallback)
- Unified reply inbox for admin (Art of Possible Piece 6)
- Template + community library (Art of Possible Piece 15)

---

### INSTANTLY.AI

**What they are:** High-volume email infrastructure. Built for agencies and teams sending millions of cold emails. Core moat: unlimited email accounts at flat rate.

**Infrastructure**
- Unlimited email account connections — no per-inbox cost
- Unlimited sending domains
- Built-in email warmup across all accounts
- Real-time domain reputation monitoring
- Unique IP rotation per campaign
- Smart inbox rotation: distributes sends across accounts to avoid spam triggers

**AI Features (2026)**
- AI Sales Agent: drop in your URL → reads your business, identifies ICP, builds prospect list, writes personalised outreach, runs follow-ups, books meetings to calendar
- AI Sequence Optimizer: ML-powered automated optimisation of send timing, subject line variants, sequence structure
- AI reply categorisation: interested / not now / wrong person / unsubscribe — auto-tags and routes

**Sequences**
- Multi-step email sequences with delays, time-zone-aware sending
- Email-only on base plans; LinkedIn + SMS + calls added at higher tiers
- Built-in B2B lead database (SuperSearch)

**CRM / Inbox**
- Unibox: unified inbox for all replies across all accounts
- Lead scoring and tagging
- Pipeline view with basic deal stages

**Reporting**
- Per-campaign: open rate, reply rate, bounce rate, unsubscribe rate
- Account-level health scoring
- Domain reputation tracking per mailbox

**Pricing**
- Growth: $37/month (10K emails, 2K contacts)
- Hypergrowth: $97/month (100K emails, 25K contacts)
- Light Speed: $358/month (500K emails)
- Real-world agency cost: $200–400/month with leads + CRM

**Where K.I.N.D wins**
- End-to-end managed: Instantly requires a human to set up, monitor, optimise daily
- Purpose-built client portal: Instantly has no client-facing view at all
- Credit model: Instantly charges flat rate regardless of results
- African market + compliance: zero African focus or POPIA handling

**What to steal**
- Unlimited inbox rotation concept for deliverability protection
- Domain reputation dashboard in Platform Health view
- AI Sequence Optimizer: auto-tune send timing and subject line variants (our Level 3 AI)
- Unibox: unified reply inbox for admin (Art of Possible Piece 6)
- Pre-send inbox placement testing

---

### SMARTLEAD.AI

**What they are:** High-scale email infrastructure for agencies. Like Instantly but with better AI agents and more explicit done-for-you infrastructure options. 100K+ businesses.

**Infrastructure**
- Unlimited mailboxes + unlimited warmups — flat rate, no per-inbox or per-seat fees
- Dynamic ESP matching: sends from Gmail-type addresses to Gmail inboxes, Outlook to Outlook
- Dedicated sending servers (SmartInfra)
- Pre-send inbox placement testing (SmartDelivery — tests whether email lands in inbox or spam before campaign launches)
- Done-for-you email infrastructure option (SmartSenders)

**AI Agents**
- SmartAgents: researches leads, writes personalised emails, updates CRM, improves deliverability — no coding
- SmartDialer: AI sales calls with full context loaded before the call
- AI reply manager: categorises hot leads → triggers next steps → syncs to CRM automatically

**Lead Data**
- SmartProspect: built-in verified B2B lead database
- Native Clay integration (enrich in Clay, push to Smartlead for sending)

**Agency Features**
- One account serves entire team — no per-seat overhead
- Sub-account management for agency clients
- White-label report exports per client

**Pricing**
- Basic: $39/month (2K active leads, 6K emails/month)
- Pro: $94/month (30K leads, 150K emails)
- Custom agency tier available

**Known weakness:** Most consistent G2/Reddit complaint — campaigns fail to send, warmup pauses unexpectedly, analytics don't load. Not enterprise-grade reliability.

**Where K.I.N.D wins**
- Reliability: Smartlead's biggest weakness is ours to exploit — our managed service owns reliability end to end
- Client portal: no client-facing view
- Outcome pricing: Smartlead charges flat rate; we charge per lead delivered
- African market + compliance

**What to steal**
- Multiple ESP matching per recipient domain for deliverability lift
- Pre-send inbox placement testing before campaign launches
- SmartSenders model: productise our own domain + inbox setup as a service
- AI reply categorisation expanded beyond auto-pause (hot/warm/cold/wrong person/out of office)

---

### REPLY.IO

**What they are:** Mid-market multichannel sales engagement. Covers email + LinkedIn + phone + social. Strong deliverability suite.

**Key Features**
- Full multichannel: email, LinkedIn, phone, WhatsApp, SMS, social in one sequence
- AI email writer + personalisation engine
- Full deliverability suite: warmup, spam monitoring, DNS health, Gmail API sending
- Unified inbox for all channel replies
- Built-in power dialer with call recording
- Agency features: sub-accounts, white-label reporting exports

**Pricing:** $60–120/user/month

**What to steal**
- LinkedIn automation as a sequence step (Art of Possible Piece 9)
- Deliverability health dashboard in Platform Health (DNS, warmup status, spam rate)
- White-label reporting export per client

---

### SALESHANDY

**What they are:** High-volume cold email for agencies and scaling teams. 852M+ B2B database, unlimited accounts, AI sequence builder. $25/month entry price.

**Key Features**
- AI Sequence Copilot: builds full multi-step sequences
- AI Variants: generates different phrasing for each email automatically
- Sequence Score: reviews setup and highlights issues before launch
- Unlimited email warmups at no extra cost
- Sender rotation across accounts
- A/Z variants for A/B testing
- Built-in CRM

**Pricing:** $25/month entry

**What to steal**
- Sequence Score concept: pre-launch quality check on sequences before they go live
- A/Z multi-variant testing (not just A/B — test 3–5 variants simultaneously)

---

### QUICKMAIL

**What they are:** Deliverability-first cold email. Best-in-class inbox protection on every plan.

**Key Features**
- Built-in warmup, throttling, and blacklist monitoring on every plan
- Auto-rotation that distributes sends across multiple accounts during active sequences
- Deliverability AI: automatically replaces weak email accounts mid-sequence
- Reword with AI: adjusts email wording to reduce spam triggers in real time
- LinkedIn integration across all tiers

**Pricing:** $49/month entry

**What to steal**
- Blacklist monitoring: alert if our sending domains appear on spam blacklists
- Auto-replacement of weak sending accounts mid-campaign

---

### KLENTY

**What they are:** AI-powered outreach combining cold email, multichannel workflows, AI research, and ICP-based targeting.

**Key Features**
- AI SDR: researches accounts across 150+ data sources, builds ICP list automatically
- Multi-channel sequences: email + LinkedIn + calls + SMS
- Deliverability insights: shows % of emails landing in Primary Tab per ESP
- ICP-based targeting built into sequence builder

**Pricing:** $60/user/month

**What to steal**
- Deliverability tab-placement metric: show clients what % of emails land in Primary vs Promotions vs Spam
- AI SDR research: pull prospect context from 150+ sources before FIGSY writes the sequence

---

### MAILSHAKE

**What they are:** The simplest cold outreach tool. Email + LinkedIn + dialer. Fastest to first campaign.

**Key Features**
- Email + LinkedIn sequences in one tool
- Built-in power dialer
- Lead Catcher: auto-filters positive replies
- Very simple UX — no learning curve
- No free trial

**Pricing:** $58/user/month

**What to steal**
- Lead Catcher concept: auto-filter and surface positive replies to client dashboard (our auto-pause is step 1 of this)

---

### WOODPECKER

**What they are:** Deliverability-first simple cold email. Inbox rotation, adaptive sending, mailbox warmup.

**Key Features**
- Inbox rotation built in
- Adaptive sending: adjusts send volume based on domain health
- Email warmup per mailbox
- Email-only — no LinkedIn, no AI

**Pricing:** $39/month

**What to steal**
- Adaptive sending: reduce volume per mailbox when health dips; increase as it improves. Apply to FIGSY campaign management.

---

## TIER 2 — DATA & ENRICHMENT LAYER
*(These are the pipes — data providers that feed the sending tools)*

---

### CLAY

**What they are:** The infrastructure layer for modern outbound. Not a sending tool — a data and workflow engine. Clay sits *before* Lemlist/Instantly/FIGSY in the stack. You enrich in Clay, then push to a sender.

**Core: Waterfall Enrichment**
- 150+ data providers connected (Apollo, Clearbit/Breeze, PDL, Hunter, ZoomInfo, LinkedIn, etc.)
- Waterfall logic: try Provider A → if no result → try B → try C
- Yields 20–40% more coverage than any single provider
- Two credit types (March 2026 split): Data Credits (enrichment lookups) + Actions (platform operations)

**Claygent — AI Research Agent**
- Autonomous web browsing: reads websites, LinkedIn profiles, news articles, job boards
- Extracts insights databases cannot: "does this company use HubSpot?", "what is this CFO writing about on LinkedIn?"
- Navigator: behaves like a real browser user — can interact with pages, scrape niche directories and marketplaces
- Generates hyper-personalised one-liners per prospect from their own content

**Sculptor — Workflow Builder**
- Natural language: "build my outbound engine" → Clay builds the workflow
- Visual GTM workflow builder connecting enrichment → AI research → personalisation → CRM push → sending tool

**Intent Signals**
- Job change alerts: prospect changed jobs → trigger sequence
- Website visitor tracking: company visited your site → trigger
- LinkedIn activity monitoring
- Funding rounds, hiring signals, tech stack changes

**Pricing (March 2026 — major cost cuts, 50–90% reduction)**
- Free: 100 Data Credits + 500 Actions/month
- Launch: $185/month — 2,500 credits + 15,000 actions
- Growth: $495/month — full waterfall, CRM sync, APIs, 40,000 actions

**Where K.I.N.D wins**
- Clay is not a client product: designed for SDRs and RevOps teams
- End-to-end stack: Clay requires Clay + sender + CRM. We are the whole thing.
- Managed service: Clay is self-serve and technically complex

**What to steal**
- Waterfall enrichment model: currently Apollo-only. Build: Apollo → PDL → Hunter
- Intent signal triggers: job change / funding / tech stack change → auto-add to campaign
- AI research per lead: write one personalised sentence from their website/LinkedIn before FIGSY sequences
- Workflow builder concept (Art of Possible Piece 5)
- Template/recipe library (Art of Possible Piece 15)

---

### APOLLO.IO *(our current supplier)*

**What they are:** Our current data source AND a direct competitor. Apollo is building the all-in-one GTM platform: data + sequences + CRM + AI + deal execution.

**Database (core moat)**
- 210 million business contacts globally
- 128 million verified emails, 144 million mobile/landline numbers
- 35 million companies across 100+ countries
- 65+ filter parameters: industry, title, company size, tech stack, funding, revenue, headcount growth
- 5.3 million new contacts added monthly; 150 million records updated monthly

**Sequences & AI (2026)**
- Multi-step email + call + task sequences
- Now available inside ChatGPT: prospect, enrich, activate sequences from a chat conversation
- Pocus acquisition: enterprise revenue intelligence — buying signals, prioritised action, intent scoring
- Contact-level website visitor intelligence: de-anonymise site traffic to individual people (not just companies)
- AI reply analysis and sentiment scoring

**Pricing**
- Free: 50 email credits/month
- Basic: $49/user/month
- Professional: $99/user/month
- Organization: $149/user/month (min 5 seats)

**Where K.I.N.D wins**
- Managed vs self-serve
- African data specialists: Apollo's African coverage (SA, Nigeria, Kenya) is thin — we can own this data layer
- No per-seat pricing
- White-label client portal
- Done-for-you compliance (POPIA, GDPR practical handling)

**What to steal**
- Intent data: "this company is actively researching outbound tools right now" — fire immediately
- Website visitor de-anonymisation: who visited kindai.co.za this week, which individual — trigger outreach
- 65-parameter ICP builder: our ICP config is basic; Apollo filters by 65 parameters
- Technology detection: target companies using specific tools
- Buying signal → auto-sequence trigger (job change, funding, tech change)
- Revenue intelligence: score and rank lead pipeline by conversion likelihood (Pocus model)

---

### ZOOMINFO

**What they are:** The enterprise B2B data standard. $1B+ revenue. The "database of record" for mid-market and enterprise sales teams.

**Key Features**
- 260M+ B2B contacts, 100M+ companies
- Intent data (proprietary + Bombora partnership)
- Website visitor tracking (company-level)
- Re-enrichment webhooks: update CRM contacts in real time as data changes
- Conversation intelligence (acquired Chorus.ai)
- Sales OS: sequences, call dialer, pipeline management all built in
- Data certification: SOC2, ISO 27001, GDPR, CCPA

**Pricing:** $15,000–100,000+/year. Enterprise only.

**Where K.I.N.D wins**
- Price: ZoomInfo is completely inaccessible to SMBs
- African coverage: near-zero
- Simplicity and managed service

**What to steal**
- Re-enrichment webhooks concept: automatically update contact data when records change (rather than static lists)
- Intent data model: aggregate signals across the web, not just first-party data

---

### COGNISM

**What they are:** GDPR-first B2B data provider. European market leader. Diamond Data — phone-verified mobile numbers for EMEA contacts.

**Key Features**
- Diamond Data: human-verified mobile numbers (not just data-matched)
- DNC (Do Not Call) list checking built in
- GDPR + CCPA compliant data collection and storage
- Strong EMEA coverage — best European contact data

**Pricing:** $10,000–30,000/year

**What to steal**
- POPIA-compliant data model: Cognism's GDPR approach should be our template for POPIA compliance
- Phone-verified contact concept: for high-value prospects, verify phone numbers before adding to campaign

---

### LUSHA

**What they are:** Contact data finder with Chrome extension, intent signals, and basic sequences.

**Key Features**
- Chrome extension for instant contact lookup from LinkedIn profiles
- Intent signals via Bombora partnership
- Email sequence automation (basic)
- CRM sync

**Pricing:** Free → $29/user/month → Enterprise

**What to steal**
- Chrome extension for on-the-spot prospect lookup (Year 2 — MCP server enables this)

---

### SEAMLESS.AI

**What they are:** AI-powered real-time contact data builder. Builds contact records on demand rather than serving a static database.

**Key Features**
- 1.8B+ verified business emails, 414M+ phone numbers
- AI builds contact data in real time (not static database lookups)
- 100+ data points per profile, continuously updated
- AI-powered outreach: always-on AI engagement running across every channel

**What to steal**
- Real-time data building concept: rather than querying a database, AI researches and builds a contact record fresh on demand

---

### PHANTOMBUSTER

**What they are:** Cloud automation tool for scraping and automating LinkedIn, Twitter/X, Instagram, Facebook, Google Maps, and more via pre-built "Phantom" scripts.

**Key Features**
- 100+ Phantoms: pre-built scripts for LinkedIn export, connection requests, message sending, post engagement, profile scraping
- Chain Phantoms into multi-step workflows
- AI LinkedIn Message Writer: GPT-generated personalised messages from scraped profile data
- Multi-platform: LinkedIn, Twitter/X, Instagram, Facebook, Google Maps, GitHub, YouTube

**Important limitation:** Violates LinkedIn ToS. Phantoms break regularly when LinkedIn updates its frontend. High ban risk.

**Pricing:** $69/month Starter → $159/month Pro → $439/month Team

**What to steal**
- Signal monitoring: scrape LinkedIn post commenters who engage with competitor content — these are warm prospects
- Google Maps scraping for local African business prospect lists (legal in most jurisdictions as public data)

---

## TIER 3 — LINKEDIN AUTOMATION
*(Specialists in LinkedIn outreach and connection automation)*

---

### WAALAXY

**What they are:** Chrome extension-based LinkedIn automation tool. Simple UI, built for individuals and small teams.

**Key Features**
- LinkedIn sequences: connection request → message → follow-up
- Email + LinkedIn combined sequences
- Pre-built templates for common outreach patterns
- Simple UI — minimal setup

**Pricing:** Free → $56/month → $112/month

**What to steal**
- Pre-built LinkedIn sequence templates for common ICP types (adapt for African market)

---

### EXPANDI

**What they are:** Cloud-based LinkedIn automation focused on safe, high-volume outreach.

**Key Features**
- Dedicated IP per account to reduce ban risk
- Smart algorithms to mimic human behaviour patterns
- 300+ connection requests per week safely
- Hyper-personalised messaging: pull prospect data into messages dynamically
- Dynamic image personalisation in LinkedIn messages

**Pricing:** $99/month

**What to steal**
- Safe automation patterns: dedicated IP, human-mimicking behaviour — apply when building our LinkedIn step (Art of Possible Piece 9)

---

### DRIPIFY

**What they are:** Cloud-based LinkedIn automation for sales teams and agencies.

**Key Features**
- Drip campaign customisation with 20+ personalisation variables
- Performance analytics per campaign
- Team management and seat-based access
- Safety algorithms to avoid LinkedIn restrictions

**Pricing:** $39/month

---

### LAGROWTH MACHINE (LGM)

**What they are:** Multichannel outreach combining LinkedIn + email + calls + voice messages + Twitter/X. Claims 3.5x more replies than single-channel.

**Key Features**
- True multichannel: LinkedIn, email, calls, voice messages, X (Twitter) — all in one sequence
- Built-in enrichment: enriches prospects from LinkedIn data before sequencing
- AI voice: voice message personalisation
- Conditional branching across all channels

**Pricing:** $50–120/user/month

**What to steal**
- Voice message personalisation: AI-generated personalised voice message as a sequence step. Unusual, high-engagement. Future.
- True multichannel sequencing model — all channels in one visual sequence builder

---

## TIER 4 — ENTERPRISE SALES ENGAGEMENT
*(Built for 50–500 person sales orgs. Expensive. Reference architecture only.)*

---

### OUTREACH.IO

**What they are:** The enterprise sales engagement standard. Deep analytics, sophisticated automation, multi-path cadences.

**Key Features**
- Kaia AI: real-time coaching during live calls, automated deal summaries, predictive risk scoring
- Sophisticated sequence branching: conditional steps, trigger-based automation, multi-path cadences
- Deal management: pipeline view, opportunity scoring, forecast roll-up
- Enterprise: multi-org support, territory management, advanced RBAC permissions
- Deep Salesforce + HubSpot bidirectional sync with custom field mapping

**Pricing:** $130–175/user/month. Enterprise contracts only.

**What to steal**
- Deal risk scoring: "this client account hasn't had contact in 14 days — flag as at-risk"
- Forecast model: MRR probability vs possible for K.I.N.D's own revenue planning
- Conditional sequence branching (Art of Possible Piece 5)

---

### SALESLOFT + CLARI

**What they are:** Enterprise sales engagement merged with revenue intelligence. Clari merger (late 2025) added $10T revenue under management.

**Key Features**
- Cadence: email, phone, LinkedIn, SMS sequences with AI suggested next action
- Conversations: call recording, transcription, keyword spotting, coaching scorecards
- Deals + Forecasting (Clari): AI deal scoring, pipeline inspection, board-level revenue forecasting
- Drift acquisition: chatbot and conversational marketing built in
- Mobile app: manage cadences, make calls, send emails from phone
- Strong Salesforce integration

**Pricing:** $75–165/user/month. Enterprise.

**What to steal**
- Call intelligence: record + transcribe + analyse client onboarding and strategy calls. Know what language works.
- Churn risk model: apply Clari-style scoring to K.I.N.D clients — "this client is likely to churn in 30 days"
- Revenue forecasting: AI-predicted MRR for next 90 days for K.I.N.D's own business

---

### CLOSE.IO

**What they are:** CRM purpose-built for outbound sales. Built-in power dialer, SMS, native sequences — no need to stack tools.

**Key Features**
- Built-in power dialer with call recording and coaching
- Native SMS sending
- Multi-step email sequences with reply detection and auto-pause built in
- Pipeline views: deal stages, activity timeline
- Designed for SDR/AE teams in high-velocity inside sales

**Pricing:** $49–145/user/month

**What to steal**
- Power dialer concept: for REEVE (Year 2) — AI SDR that can actually call prospects
- Activity timeline per client: everything that happened on this account in chronological order

---

### PIPEDRIVE

**What they are:** Visual pipeline-first CRM. Strong deal management, weaker native outbound.

**Key Features**
- Visual Kanban pipeline with AI insights
- Email integration (basic sequences)
- Activity and deal tracking
- 400+ integrations via marketplace
- AI deal health scores and next-step suggestions

**Pricing:** $15–100/user/month

**What to steal**
- Visual pipeline Kanban (Art of Possible Piece 1) — deal stage view for K.I.N.D's own HubSpot pipeline
- AI deal health score per client account

---

## TIER 5 — REVENUE INTELLIGENCE
*(Know who to target, when, and why. Intent + conversation + forecasting.)*

---

### GONG.IO

**What they are:** The conversation intelligence leader. Records and analyses every sales call, email, and meeting to improve performance and forecast revenue.

**Key Features**
- Auto-records and transcribes calls with real-time keyword tracking (competitor mentions, pricing talk, objections)
- Talk-to-listen ratio, filler word analysis, sentiment tracking
- Deal Likelihood Score: 300+ data points (conversation signals, communication cadence, stakeholder involvement, timing) → close probability
- Gong Forecast: AI predicts which deals close this quarter — 95% forecast accuracy at Upwork-level adoption
- Gong Engage: personalised outreach guided by conversation data
- 70% faster call insight processing in 2026
- Delivers 25–30% less forecast variance for teams that fully adopt

**Pricing:** Enterprise — custom, typically $100–200/user/month

**What to steal (Year 2)**
- Client conversation analysis: record + analyse all K.I.N.D client calls to identify language that converts
- Forecast variance model: apply to K.I.N.D's own MRR prediction

---

### 6SENSE

**What they are:** AI-driven account-based marketing and intent data platform. Identifies in-market buyers before they raise their hand.

**Key Features**
- Signalverse engine: processes 1+ trillion signals daily (intent data, web activity, firmographic changes)
- Assigns buying stage: Awareness / Consideration / Decision / Purchase — per account
- De-anonymises 100% anonymous web traffic to company and contact level
- AI orchestration: continuously improves targeting without human intervention
- Unified revenue operations: sales + marketing from shared intelligence

**Pricing:** $80,000–1M+/year. Enterprise only.

**What to steal**
- Buying stage model: apply to K.I.N.D prospect pipeline — tag each lead by buying stage, sequence accordingly
- Intent signal aggregation: web signals + data signals + firmographic changes combined into one score

---

### DEMANDBASE

**What they are:** Enterprise ABM platform combining account intelligence, B2B advertising, and sales tools.

**Key Features**
- Account identification + intent data (Bombora partnership)
- Firmographic and technographic intelligence
- B2B advertising targeting (serve ads to specific accounts)
- Sales intelligence: who at this account is active right now

**Pricing:** $40,000–250,000/year. Enterprise.

**What to steal**
- Technographic targeting: "target companies that use HubSpot but not an outbound tool" — add to ICP builder

---

## TIER 6 — CRM PLATFORMS
*(Relationship management and pipeline tools that include outbound features)*

---

### HUBSPOT SALES HUB *(our current CRM integration)*

**What they are:** The mid-market CRM standard. In 2026 HubSpot launched AEO (AI Engagement Orchestration) and significantly expanded its AI agents.

**Key Features (2026)**
- Prospecting Agent: monitors for job postings, funding rounds, technology adoption → identifies matching contacts → drafts personalised outreach → response rates 2x industry benchmark
- Smart Deal Progression: post-call AI analysis — updates CRM fields, drafts follow-up, surfaces action items automatically
- AI email writer: generates personalised variants per prospect based on CRM data
- Breeze Intelligence (ex-Clearbit): data enrichment built into CRM
- Sequences: multi-step email + call tasks with auto-pause on reply
- Full pipeline management + forecasting
- Free CRM tier with generous limits

**Pricing:** Free → $90/user/month → Enterprise

**Where K.I.N.D wins**
- We are the outbound execution layer that HubSpot cannot replace — HubSpot tracks deals, we generate them
- No done-for-you model; HubSpot is a tool clients operate

**What to steal**
- Smart Deal Progression: post-campaign-reply AI that suggests next steps and updates client records automatically
- Prospecting Agent trigger model: signal → identify → draft → send pipeline (this is what FIGSY should evolve into)

---

### SALESFORCE

**What they are:** The enterprise CRM. $35B+ revenue. Einstein AI is their AI layer.

**Key Features**
- Einstein AI: lead scoring, opportunity scoring, email and call recommendations
- Agentforce: autonomous agents for sales, service, marketing (launched late 2024)
- Revenue Cloud: full quote-to-cash
- Data Cloud: unified customer data platform

**Pricing:** $25–300+/user/month. Enterprise implementations cost $50K–$500K+.

**Where K.I.N.D wins**
- We are not a CRM. We are the lead generation layer that feeds any CRM.
- Salesforce is inaccessible to African SMBs at any price point

---

## TIER 7 — NICHE & EMERGING
*(Specialist tools with specific features worth knowing)*

---

### HUNTER.IO

**What they are:** Domain-based email finder + basic drip sequences. Simple, reliable.

**Key Features**
- Domain Search: find all email addresses at a company from their domain
- Email Verifier: batch verify lists
- Email Finder: first + last name + domain → email
- Campaigns: basic drip sequences (not a core strength)
- 450M+ email addresses indexed

**Pricing:** Free → $49/month → $149/month

---

### SNOV.IO

**What they are:** Email finder + drip sequences + LinkedIn automation + basic multichannel.

**Key Features**
- Email finder, verifier, and drip campaigns in one
- AI reply sentiment analysis per campaign
- Unlimited sender accounts
- LinkedIn messages as a sequence step

**Pricing:** $39/month entry

---

### BOMBORA

**What they are:** The intent data backbone used by ZoomInfo, Demandbase, Lusha, and many others.

**Key Features**
- Co-op intent data: aggregates content consumption signals from 5,000+ B2B websites
- Company Surge: shows which companies are actively researching specific topics this week
- 7,500+ topic categories
- Powers most third-party intent data products

**Strategic note:** Bombora is infrastructure, not a product. Their data flows through Apollo, ZoomInfo, Demandbase, etc. If we build intent signal triggering, we access Bombora via Apollo (which we already pay for).

---

### LAVENDER

**What they are:** AI email coaching tool. Scores emails before you send them and suggests improvements in real time.

**Key Features**
- Email Score (0–100) with specific fixes: too long, subject too salesy, opener too formal
- Personalisation Assistant: pulls prospect data and suggests personalisation angles
- Chrome extension: works inside Gmail, Outlook, Salesloft, Outreach
- Team analytics: which reps write the best emails

**Pricing:** Free → $29/user/month → $49/user/month

**What to steal**
- Email Score concept: before FIGSY launches a sequence, auto-score each email template (length, spam words, personalisation depth, CTA clarity) and flag weak ones

---

### AMPLEMARKET

**What they are:** All-in-one outbound platform with strong deliverability focus and signal-based triggers.

**Key Features**
- AI Duo: autonomous AI SDR that researches accounts, writes sequences, triggers sends
- Signal-based triggers: job change, funding, hiring, tech change → auto-sequence
- Deliverability suite with domain monitoring and warmup
- Waterfall enrichment across 40+ providers

**What to steal**
- Signal-based auto-trigger model (job change → sequence): strongly aligned with Art of Possible roadmap

---

### OVERLOOP

**What they are:** Cold email automation with full CRM built in. Good for teams that want one tool for both.

**Key Features**
- Cold email + LinkedIn automation + phone calls in one sequence
- Full pipeline and deal management built in
- No need for separate CRM
- AI email writer + personalisation engine

**Pricing:** $40–80/user/month

---

## MASTER COMPARISON TABLE

*Full landscape — all major competitors. ✅ = has it | ❌ = does not | ⚠️ = partial*

| Feature | **K.I.N.D** | ClickUp | Lemlist | Clay | Apollo | Instantly | Smartlead | Outreach | Salesloft | HubSpot | Close |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Business model** | Managed SaaS | Work OS | Outreach tool | Data infra | Data + tool | Email infra | Email infra | Enterprise | Enterprise | CRM | CRM+outbound |
| **Done-for-you** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **White-label client portal** | ✅ | ❌ Enterprise | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Pay-per-lead / outcome pricing** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **African market + POPIA** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **AI runs campaign autonomously** | ✅ FIGSY | ⚠️ assists | ⚠️ assists | ✅ data only | ⚠️ assists | ✅ AI agent | ✅ SmartAgents | ✅ Kaia | ✅ | ⚠️ assists | ❌ |
| **AI memory / learning** | ✅ basic | ✅ 3 types | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Agent identity (named)** | ✅ FIGSY | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Kaia | ✅ | ❌ | ❌ |
| **Agent escalation** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Multi-model AI** | ❌ (Year 2) | ✅ GPT-5/Claude/o3 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Sequence engine** | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Multi-channel (email+LI+call)** | ❌ email only | ❌ | ✅ | ❌ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| **Lead database** | ✅ via Apollo | ❌ | ✅ 450M | ✅ 150+ | ✅ 210M | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Waterfall enrichment** | ❌ Apollo only | ❌ | ✅ | ✅ 150+ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Intent signals** | ❌ | ❌ | ❌ | ✅ | ✅ Pocus | ❌ | ❌ | ✅ | ✅ Clari | ✅ | ❌ |
| **Email warmup** | ❌ | ❌ | ✅ Lemwarm | ❌ | ⚠️ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Deliverability dashboard** | ❌ | ❌ | ✅ | ❌ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Unified reply inbox** | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ Unibox | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Personalised images** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Conditional sequence branching** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Activity feed (realtime)** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Command palette** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Revenue / deal forecasting** | ❌ | ❌ | ❌ | ❌ | ✅ Pocus | ❌ | ❌ | ✅ | ✅ Clari | ✅ | ⚠️ |
| **Call intelligence** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ Kaia | ✅ | ❌ | ✅ |
| **Goals / OKR tracking** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Custom dashboard widgets** | ⚠️ fixed | ✅ 100+ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ⚠️ |
| **Shareable dashboards** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **MCP server** | ❌ Planned | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Mobile app** | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **POPIA / African compliance** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Entry price** | ~$80 ARPU | $7/user | $39/user | $185/mo | $49/user | $37/mo | $39/mo | $130/user | $75/user | Free | $49/user |

---

---

### INFOGRAPHIC TABLE — SIMPLIFIED MASTER (deck/pitch ready)

*Key: ✅ = yes | ❌ = no | ⚠️ = partial*

| | K.I.N.D | ClickUp | Lemlist | Apollo | Instantly | Outreach |
|---|---|---|---|---|---|---|
| Done-for-you | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| White-label client portal | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Pay per lead (outcome pricing) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Africa + POPIA | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI runs campaign autonomously | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ |
| AI memory / learning | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Lead database | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Sequence engine | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Email warmup | ❌ | ❌ | ✅ | ⚠️ | ✅ | ❌ |
| Multichannel (LI + call) | ❌ | ❌ | ✅ | ✅ | ⚠️ | ✅ |
| Revenue forecasting | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Mobile app | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **Entry price** | **~$80/mo** | **$7/user** | **$39/user** | **$49/user** | **$37/mo** | **$130/user** |

---

### INFOGRAPHIC TABLE — K.I.N.D MOATS (6 uncontested wins)

| Moat | What it means | Every competitor |
|---|---|---|
| ✅ Done-for-you | We run the campaigns. They provide tools you run yourself. | ❌ All self-serve |
| ✅ White-label portal | Our client portal carries your brand. | ❌ None have it |
| ✅ Outcome pricing | You pay per lead delivered. | ❌ All charge per seat/flat rate |
| ✅ Africa + POPIA | Built for this market from Day 1. | ❌ None focus on Africa |
| ✅ AI that executes | FIGSY is the SDR. Others have AI "assist" buttons. | ❌ None run end-to-end |
| ✅ FIGSY Memory | Gets smarter per client over time. | ❌ All send static sequences |

---

## WHERE K.I.N.D IS UNCONTESTED

These features exist in combination **nowhere else in the market**:

1. **Done-for-you managed outbound** — Every competitor is a tool the client operates. We operate it for them. This is the whole model.
2. **White-label, purpose-built client portal** — No competitor has a clean client-facing dashboard. They all assume the user *is* the client.
3. **Outcome-based pricing (pay per lead)** — Every competitor charges per seat or flat rate regardless of results. We put skin in the game.
4. **African B2B market + POPIA** — Zero competitors focus on Africa, have ZAR pricing, or handle POPIA compliance in practice.
5. **AI that runs the campaign (not assists)** — FIGSY is the SDR. It finds the lead, builds the sequence, sends it, pauses on reply, and learns from results. The rest of the market offers AI "assist" buttons.
6. **FIGSY Memory** — Our `figsy_memory` table is the only learning loop in this market that improves campaign performance per client over time. No competitor has this.

---

## PRIORITY STEAL LIST — RANKED BY IMPACT

| # | Feature | Steal from | Effort | Phase | Art of Possible |
|---|---|---|---|---|---|
| 1 | **Email warmup infrastructure** | Lemlist Lemwarm / Instantly | Medium | Phase 2 | Add new piece |
| 2 | **Unified reply inbox (Unibox)** | Instantly / Lemlist | Medium | Phase 2 | Piece 6 |
| 3 | **Deliverability dashboard** | Instantly / Smartlead / Reply.io | Small | Phase 2 | Add to Platform Health |
| 4 | **AI reply categorisation** | Smartlead / Instantly | Small | Phase 2 | Extend auto-pause |
| 5 | **Waterfall enrichment (Apollo→PDL→Hunter)** | Clay / Lemlist | Medium | Phase 2 | Add new piece |
| 6 | **Email Score pre-launch check** | Lavender / Saleshandy | Small | Phase 2 | New feature |
| 7 | **Personalised images per lead** | Lemlist | Medium | Phase 3 | Add new piece |
| 8 | **Conditional sequence branching** | Lemlist / Outreach | Medium | Phase 3 | Piece 5 |
| 9 | **Intent signal triggers** | Clay / Apollo | High | Phase 3 | Add new piece |
| 10 | **Multi-model AI toggle** | Lemlist | Small | Phase 3 | Piece 8 partial |
| 11 | **LinkedIn automation steps** | Lemlist / Reply.io / Expandi | High | Phase 3 | Piece 9 |
| 12 | **Adaptive sending (volume vs domain health)** | Woodpecker | Small | Phase 2 | Infrastructure |
| 13 | **MCP server** | Lemlist | Medium | Phase 3 | Piece 14 |
| 14 | **Template + recipe library** | Clay / Lemlist / Klenty | Small | Phase 3 | Piece 15 |
| 15 | **Pre-send inbox placement test** | Smartlead SmartDelivery | Medium | Phase 3 | New piece |
| 16 | **3-type memory model (episodic+long-term+preference)** | ClickUp Brain | High | Year 2 | Section 27 Level 2 |
| 17 | **Contact-level site visitor de-anonymisation** | Apollo Pocus | High | Year 2 | New piece |
| 18 | **Churn risk scoring** | Clari / Salesloft | High | Year 2 | Admin feature |
| 19 | **Revenue forecasting** | Clari / Gong | High | Year 2 | New section |
| 20 | **Call intelligence** | Gong / Salesloft | Very High | Year 2 | Milla feature |

---

*Added: 26 May 2026 — Full competitive audit session*
*Sources: Live web research across all major platforms, reviews, and pricing pages*

---

## 30. THE UNBUILT FUTURE — WHAT K.I.N.D COULD BECOME

*Written: 26 May 2026*
*This section is imagination, grounded in what we have already built. Not a roadmap. A north star.*

> "We are not building a lead generation tool. We are building the commercial department of every African business that cannot afford one."

---

### THE CORE INSIGHT THAT CHANGES EVERYTHING

Right now K.I.N.D replaces one function: the BDR (Business Development Rep). FIGSY finds the lead, writes the email, handles the reply. One person replaced. One salary saved.

But the BDR is just the beginning.

A growing African SMB needs:
- Someone to find and contact leads (BDR) → **FIGSY** — *built*
- Someone to run morning briefings and manage documents (Chief of Staff / VA) → **Milla** — *July 2026*
- Someone to handle inbound and qualify website visitors (Inbound SDR) → **Vida** — *July 2026*
- Someone to close the deal (Account Executive) → **REEVE** — *Year 2*
- Someone to retain and grow existing clients (Customer Success) → **LENA** — *Year 2*
- Someone to watch revenue, flag risk, forecast (CRO) → **OTTO** — *Year 2*
- Someone to manage cash, invoices, financial health (CFO agent) → *Year 3*
- Someone to manage brand, campaigns, market positioning (CMO agent) → *Year 3*

**By Year 3–4, K.I.N.D is not a sales tool. K.I.N.D is the commercial department.**

A client does not hire K.I.N.D and still employ salespeople. They hire K.I.N.D *instead* of salespeople. The pricing conversation flips: "Why are you paying 3 people R600,000/year in salaries to do what K.I.N.D does for R15,000/month?"

This is not a marginal improvement. This is category creation.

---

### 15 FUTURES — EACH ONE REAL

---

#### 1. THE AFRICAN DATA MOAT

Every campaign K.I.N.D runs adds to a dataset no one else has. Every reply, bounce, open, sequence variant, ICP that worked, industry that responded — all of it accumulates.

After 500 clients we will have the most complete picture of B2B sales behaviour in sub-Saharan Africa ever assembled. Apollo has thin African coverage. ZoomInfo barely touches the continent. No one is systematically building this.

**What this becomes:**
- The "African Apollo" — a B2B contact database built for Africa by people who operate in Africa
- Licensing deal to ZoomInfo, Apollo, Cognism who want African coverage
- Annual "State of B2B Sales in Africa" report — media, investors, consultants pay for it
- The dataset itself becomes an acqui-hire target or a standalone business

**The data accumulates from Day 1, whether we think about it or not. We should be very deliberate about capturing and structuring it from the start.**

---

#### 2. NETWORK EFFECTS — THE PLATFORM GETS SMARTER FOR EVERYONE

Today FIGSY learns per client. Figsy at Client A learns what works for Client A.

The next level: **cross-client intelligence**. With enough clients, we can aggregate without exposing individual data.

"Companies in your sector average 6.8% reply rate. You're at 11.3%. FIGSY has identified 3 sequence patterns that outperform — here they are."

"The best subject line structure for Johannesburg-based CFOs this quarter is [X]. FIGSY applied this to your campaign."

"Cold outreach to legal firms in Nigeria converts 40% better on Tuesdays between 9–11am. FIGSY has already adjusted your send schedule."

**This is a network effect that no self-serve tool can replicate.** Lemlist does not run campaigns — they cannot aggregate learning. We do. We can. Every new client makes the platform smarter for every other client. This compounds forever.

The gate: 5 clients minimum per segment before we aggregate (privacy). We have the database structure for this already in `figsy_memory`. We just need to add the cross-client layer.

---

#### 3. FROM OUTBOUND TO FULL-FUNNEL — TOUCHING EVERY COMMERCIAL MOMENT

Today K.I.N.D's value ends when a meeting is booked.

What if it didn't?

The full commercial journey K.I.N.D could own:

| Stage | Today | Future |
|---|---|---|
| Prospect identified | ✅ Apollo → FIGSY | ✅ |
| Sequence written + sent | ✅ FIGSY | ✅ |
| Reply handled | ✅ auto-pause + alert | ✅ |
| Meeting booked | ⚠️ client takes over | REEVE books it to Calendly automatically |
| Discovery call | ❌ | REEVE joins as AI notetaker, surfaces objections live |
| Proposal drafted | ❌ | REEVE drafts proposal from call transcript |
| Contract sent | ❌ | Vida sends DocuSign via HubSpot integration |
| Invoice raised | ❌ | CFO agent raises invoice in Xero/Wave |
| Onboarding | ❌ | Milla runs onboarding checklist automatically |
| Ongoing QBRs | ❌ | OTTO generates monthly business review |
| Churn risk detected | ❌ | LENA flags at 60 days no engagement |
| Upsell identified | ❌ | OTTO surfaces "Client X is ready for next tier" |

**By Year 3, K.I.N.D is the commercial layer — not a tool in the stack. It is the stack.**

---

#### 4. THE WHITE-LABEL / FRANCHISE PLAY

Marketing agencies across Africa are selling "digital marketing" but losing to AI tools. What if they could sell **AI outbound** under their own brand, powered by K.I.N.D's infrastructure?

A K.I.N.D franchise operator in Lagos:
- White-labels K.I.N.D as "GrowthOS Lagos" or their own brand
- Brings 20 local SMB clients onto the platform
- Earns a margin on every credit their clients consume
- K.I.N.D provides: FIGSY, client portal, admin portal, support docs, playbooks
- Operator provides: local relationships, cultural context, client management

**50 operators × 20 clients = 1,000 clients without building a sales team.**

The operator model is how Salesforce built a $350B company — not by selling to every SMB directly, but by building a partner ecosystem that did it for them.

We have the architecture for this already. The client portal is already white-label ready. The admin portal already has multi-client management. We need: partner tier pricing, a partner-facing onboarding kit, and a revenue-share model.

---

#### 5. THE MCP SERVER — K.I.N.D AS AI INFRASTRUCTURE

Piece 14 from the Art of Possible. The most ambitious near-term play.

Right now K.I.N.D is a product you subscribe to.

What if it was also infrastructure you called from anywhere?

`@modelcontextprotocol/sdk` wrapper around our existing API. An `api_keys` table. A developer portal. And suddenly:

- Claude can call K.I.N.D to run outbound for any AI application
- A HubSpot workflow can trigger FIGSY to reach out to a new deal that stalled
- A Zapier user connects their CRM to K.I.N.D with no code
- A developer building an AI sales tool uses K.I.N.D as the outbound execution layer
- ChatGPT plugins can initiate K.I.N.D campaigns from a conversation

**K.I.N.D becomes the Twilio of AI-powered B2B outreach.**

Twilio processes 1.4 trillion API calls per year. They started as a simple SMS API. K.I.N.D starts as an outbound API. Lemlist has already built their MCP server — we noted this in the competitive audit. We should be next.

Build time: 3–5 days (per Art of Possible estimate). Gate: 20+ paying clients first.

---

#### 6. VERTICAL INTELLIGENCE — FIGSY FOR YOUR INDUSTRY

Right now FIGSY works across all B2B verticals. One model, one approach.

The next evolution: **FIGSY Vertical Modes** — pre-trained on hundreds of campaigns in one specific industry.

"FIGSY for Property" — knows the language, the pain points, the objections, the best angles for property developers, estate agents, fund managers in Africa.

"FIGSY for Fintech" — knows how to approach CFOs about B2B payments, lending, treasury management in African markets with fragmented banking.

"FIGSY for Professional Services" — knows how to reach accountants, lawyers, consultants without sounding spammy.

**Each vertical mode is:**
- A curated set of ICPs for that vertical
- Pre-trained sequence templates proven in that vertical
- Industry-specific reply handlers and objection patterns
- A vertical-specific onboarding flow

The data for this comes automatically as we accumulate campaigns. After 50 clients in property, we have a vertical intelligence layer for property that no competitor can replicate without operating in Africa.

**This is also a pricing lever.** Vertical mode = premium tier. "FIGSY Property" costs more than standard FIGSY because it performs better.

---

#### 7. THE TALENT DISPLACEMENT CONVERSATION

The most powerful thing we can say to any African SMB founder:

> "You have 2 BDRs on R25,000/month each. That's R600,000/year in salaries, plus benefits, plus management overhead. FIGSY replaces both of them for R18,000/month — and works 24 hours a day, never takes leave, never has a bad month, and gets better over time."

This is not a sales pitch. This is arithmetic.

As unemployment pressures grow and AI displacement accelerates, the companies that stay competitive will be the ones who adopt AI commercial infrastructure first. K.I.N.D's role: be that infrastructure.

**The ethical dimension:** We are not eliminating jobs carelessly. We are enabling founders who could not afford any BDR at all to access commercial capability for the first time. Most of our clients are not replacing existing teams — they are activating growth that was impossible without a team. We are expanding the economic pie, not just redistributing it.

---

#### 8. THE REVENUE SHARE MODEL

Today: client pays per credit consumed. We make money whether they succeed or not.

The ultimate alignment: **K.I.N.D takes a percentage of revenue generated from K.I.N.D-sourced clients.**

"Deploy R20,000 this quarter. FIGSY runs the campaign. For every deal closed from a K.I.N.D-sourced lead, we take 2%."

- Zero risk for the client: they only pay on success
- Perfect alignment: K.I.N.D is incentivised to maximise client revenue, not just send more emails
- Massive upside: 2% of R5M in deals = R100,000. We earn more from one good client than 10 credit top-ups.
- This is the model that creates recurring, growing revenue tied to client success

**Gate:** We need attribution infrastructure to track which closed deals came from K.I.N.D-sourced leads. HubSpot integration gives us this pipeline visibility already. The accounting layer is the gap.

**This is Year 3+ positioning, not now. But think about it from Day 1.**

---

#### 9. GLOBAL EXPANSION — AFRICAN-BORN, GLOBALLY PROVEN

The sequence matters.

1. Prove the model in South Africa (first-mover, low competition, we understand the market)
2. Expand to Nigeria, Kenya, Ghana (same playbook, local ICP adaptation)
3. Use African success as the story: "We built this for Africa — the hardest B2B market to crack. It works everywhere else too."
4. Enter Southeast Asia: Vietnam, Philippines, Indonesia — same profile: underserved, growing, no local AI outbound player
5. Enter LATAM: Brazil, Mexico, Colombia — same profile
6. Enter Eastern Europe: Poland, Czech Republic, Romania — sophisticated but underserved by US tools

**The African origin is not a limitation. It is the differentiating story.**

"African-born AI outbound" is a narrative that Silicon Valley tools cannot claim. We built it where it was hardest. We earned it where resources were smallest. That credibility travels.

---

#### 10. THE KNOWLEDGE BUSINESS

K.I.N.D will know things about B2B sales in Africa that nobody else knows:

- Which subject line patterns get replies from Nigerian procurement managers
- Which industries in South Africa have the highest BDR conversion rates
- What time of day to send to Kenyan C-suite contacts
- Which ICPs in Africa have the shortest sales cycles
- Which pain points resonate most with African fintech founders in 2026 vs 2027

This knowledge has commercial value beyond our own clients:

**Revenue streams from the knowledge business:**
- Annual "State of African B2B Sales" report — subscription or one-time purchase ($500–2,000/copy)
- Quarterly benchmark reports per vertical — sold to investors, PE firms, consultancies
- Investor data partnerships — VCs want to know which African sectors have the best commercial traction
- Media and PR — we become the quoted authority on African B2B sales data
- Speaking and thought leadership — SAICA, GIBS, African business forums

**None of this requires building anything new. It requires structuring what we already capture.**

---

#### 11. THE AFRICAN GROWTH OS — THE FINAL FORM

Ten years from now, what does K.I.N.D look like at its fullest expression?

Not a lead generation tool. Not an AI SDR. Not even a sales platform.

**K.I.N.D is the operating system for commercial growth in Africa.**

Every African business that wants to grow installs K.I.N.D the way they install an accountant, a lawyer, a bank account — it is infrastructure, not an option.

- **FIGSY** finds new clients automatically
- **REEVE** closes deals automatically
- **LENA** keeps clients and grows accounts automatically
- **OTTO** watches the numbers and alerts the founder to what matters
- **Milla** manages the paperwork, briefings, documents, scheduling
- **Vida** handles every inbound conversation — website, WhatsApp, email
- **The CFO agent** raises invoices, chases payments, forecasts cashflow
- **The CMO agent** publishes content, manages brand, runs campaigns
- **The Data layer** benchmarks every metric against the African average for your sector

**The founder's job:** set the direction, review the output, sign the deals that need a human face.

**K.I.N.D's job:** run everything else.

---

### THE THESIS IN ONE PARAGRAPH

K.I.N.D starts as an AI SDR. It evolves into an AI commercial team. It ends as the commercial operating system of Africa. The moat is not the technology — technology is available to everyone. The moat is the data we accumulate from every campaign, the network effects that make the platform smarter with every new client, the relationships we build as the trusted commercial partner of growing African businesses, and the first-mover advantage in a continent that no one else is serious about yet. The window is 18–24 months. After that, the incumbents wake up. We need to be so deeply embedded in African commercial infrastructure by then that displacement is not worth attempting.

---

### WHAT THIS MEANS FOR DECISIONS TODAY

Every decision we make now should be evaluated against this future:

| Decision | Why it matters to the long-term vision |
|---|---|
| Build the `figsy_memory` table properly | This is the foundation of cross-client intelligence |
| White-label the client portal from Day 1 | Partner/franchise model requires this |
| Capture campaign data in structured form | African data moat requires clean, queryable data from campaign 1 |
| Build MCP server early | Infrastructure positioning starts now |
| POPIA compliance | Trust layer for African market — table stakes for the franchise model |
| African-first ICPs and sequence templates | Vertical intelligence starts with these raw inputs |
| Credit model (not per seat) | Revenue share model is the natural evolution of credit-based pricing |
| UK company | Global expansion and investor conversations require a credible holding entity |

---

*Written: 26 May 2026 — imagination session*
*This section should be reread at every major inflection point: first 10 clients, first 50, first 100, first funding round, first expansion market.*
*Nothing here is guaranteed. All of it is possible. Some of it is inevitable.*
