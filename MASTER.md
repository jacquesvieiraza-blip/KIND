# K.I.N.D — MASTER DOCUMENT
**Single source of truth. Last updated: 26 May 2026 (evening — post-audit session)**
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

*Updated: 26 May 2026 evening*

### ✅ DONE — Complete
| # | Task | Done |
|---|---|---|
| 1 | Apollo API key in Railway | ✅ |
| 2 | RESEND_API_KEY in Railway | ✅ |
| 3 | Railway green build | ✅ |
| 4–6 | All SQL migrations applied | ✅ |
| 7 | Stripe account + 6 prices + keys in Railway | ✅ |
| 7b | NEXT_PUBLIC Stripe vars in Vercel | ✅ |
| 8 | UK company registration | ✅ In progress today |
| 9 | HubSpot account + API key in Railway | ✅ |
| 10 | Resend inbound webhook + secret in Railway | ✅ |
| 11 | FIGSY_KIND_CLIENT_ID in Railway | ✅ |
| 12 | Calendly link created + wired site-wide | ✅ |
| Drip migration applied in Supabase | ✅ |
| ICP cascade delete applied in Supabase | ✅ |

### 🔴 DO TODAY — Launch Blockers
| # | Task | Time | How |
|---|---|---|---|
| A | **Stripe webhook secret** | 2 min | Stripe → Developers → Webhooks → Add endpoint: `https://kindapi-production-e64c.up.railway.app/stripe/webhook` → Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` → Copy secret → Railway as `STRIPE_WEBHOOK_SECRET` |
| B | **Upgrade Resend to paid** | 2 min | resend.com/billing → Pro ($20/mo) |
| C | **Fix 4 Stripe prices** | 10 min | Old prices had volume discounts. Archive + recreate: Lead Gen 40cr=$40, Lead Gen 100cr=$100, FIGSY 40cr=$120, FIGSY 100cr=$300. Update 4 Railway env vars. |
| D | **Give me UK Companies House number** | 1 min | When approved — I wire it into footer + legal pages |

### 🟡 THIS WEEK
| # | Task | Time | Notes |
|---|---|---|---|
| E | Wise business account | 15 min | business.wise.com — needs UK company number |
| F | Link Wise to Stripe | 5 min | Stripe → Settings → Bank accounts |
| G | LinkedIn 3× per week | Daily | Admin → CMO Tools → copy draft → personalise + post |
| H | 10 warm personal outreach messages | This week | LinkedIn/WhatsApp — "I built something, want to see it?" |
| I | 3 discovery calls booked | This week | Admin → Sales Playbook for script |

### 🟢 WHEN READY — Not Blocking
| # | Task | Notes |
|---|---|---|
| 14 | Google Workspace | After first client or hire. Gmail fine for now. |
| 15 | Apollo upgrade | After client 1 pays → $99/mo → annual at scale |
| 16 | Flutterwave (Phase 2) | After 5 clients — add `FLUTTERWAVE_SECRET_KEY` to Railway |
| 17 | Vapi.ai voice | Add `VAPI_API_KEY` to Railway |
| 18 | WhatsApp Business API | Meta 3–7 day approval |
| 19 | Google Calendar OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| 20 | G2, Capterra, Product Hunt | Launch day listings |
| 21 | SOC 2 Type II | Q1 2027 |

### ❌ REMOVED — Not Applicable
| Item | Why |
|---|---|
| Paystack KYC | UK-based founder can't complete — Stripe handles payments instead |
| Paystack plan codes | Paystack removed from payment stack |

### Google Workspace Setup (step by step)
1. workspace.google.com → Get started → Business Starter plan → enter domain get-kind.com
2. Add the MX records Google gives you to your DNS (at your domain registrar)
3. Add the TXT verification record → click Verify in Google
4. Create mailbox: **hello@get-kind.com**
5. Forward or alias **privacy@kind.ai** → hello@get-kind.com (referenced in Privacy Policy)
6. Google Admin → Gmail → Authenticate email → Enable DKIM → add TXT record to DNS
7. Add SPF record: `v=spf1 include:_spf.google.com ~all` (merge with existing SPF)
8. Add DMARC: TXT record on `_dmarc.get-kind.com` → `v=DMARC1; p=none; rua=mailto:hello@get-kind.com`
9. Update `FOUNDER_EMAIL` in Railway to hello@get-kind.com

**Important:** FIGSY sends from **Resend** (replies@get-kind.com) — keep separate to protect domain reputation.

---

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
*Full detail in: `docs/art-of-possible.md` (also readable at admin → Docs → Art of Possible)*

| # | Product | URL | Category | Key Lesson | Status | Date |
|---|---------|-----|----------|------------|--------|------|
| 1 | Apex | apex.host | Autonomous AI founder assistant | "Acts, doesn't just respond" — copy framing + digital twin positioning | 🟡 Actions pending | 26 May 2026 |
| 2 | ClickUp | clickup.com | Project management SaaS | Dark premium design + partner model | ✅ Built | May 2026 |
| 3 | Lemlist | lemlist.com | Email outreach platform | Sequence engine + reply handling | ✅ Built | May 2026 |
| 4 | Instantly | instantly.ai | Cold email at scale | Volume-based campaign engine + auto-pause | ✅ Built | May 2026 |
| 5 | Clay | clay.com | Data enrichment + ICP | Multi-source enrichment fallback logic | ✅ Built | May 2026 |

### What We've Built From Studying These Products

**From ClickUp:**
- Dark premium website design (apps/website/index.html)
- Partner/referral programme modelled on ClickUp/Smartsheet
- 3-tier pricing max (Start / Scale / Dominate) — not their sprawl

**From Lemlist:**
- FIGSY 3-step sequence engine (Day 1 / Day 4 / Day 9)
- Reply classification + pause on reply
- Campaign-level KPIs: open rate, reply rate, interested %
- `{{firstName}}` / `{{company}}` personalisation variables

**From Instantly:**
- Campaign auto-pause on <1% reply rate (daily cron)
- `FIGSY_DAILY_SEND_LIMIT` env var (domain warming cap)
- Volume-based thinking — 20 to 500+ emails/day

**From Clay:**
- Apollo 3-pass fallback search (full ICP → remove consent filter → remove size filter)
- ICP as layered filter system (industry + title + size + seniority)
- Multi-source enrichment planning (Apollo primary + fallback)

### Top Lessons Still To Act On (from Apex)
1. **Rewrite copy to emphasise action** — "FIGSY finds the lead, writes the email, handles the reply, books the meeting — you just show up." (Claude can do this now)
2. **Surface autonomy controls** — "You're in control. Expand KIND's autonomy as you get comfortable." Add to portal onboarding.
3. **Founder as product demo** — Post real KIND outputs on LinkedIn. You ARE the use case.
4. **Reframe Milla** — "Your AI Chief of Staff — trained on your documents, your tone, your business."

### Gaps They Have That We Own
- No African market focus (we own ZA/NG/KE/GH)
- High friction products (Apex = self-hosted, Clay = power-user tool) vs KIND's signup-and-go
- No lead generation in Apex or Instantly — they send to leads you source. KIND sources AND sends.
- Lemlist/Instantly: you still write the emails. FIGSY writes AND handles replies.
- Clay: $149–800/mo just for enrichment. KIND includes enrichment + outreach + management.
- Apex: waitlist only. We're live now.
- Price: Apex ~$500–1,000+/mo, Clay $149–800+/mo vs KIND from $20

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
*Owner: K.I.N.D founding team*
*Last updated: 26 May 2026 (evening)*
