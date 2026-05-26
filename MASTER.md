# K.I.N.D — MASTER DOCUMENT
**Single source of truth. Last updated: 26 May 2026 (evening)**
**Business: UK registration pending (Companies House) · Platform: Africa-first, world-ready**

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

---

## 1. CURRENT STATUS — WHAT'S LIVE

*Last updated: 26 May 2026 (evening)*

| Item | Status | Notes |
|---|---|---|
| Website — `get-kind.com` | ✅ Live | Full rewrite 20 May — new positioning, FIGSY Reasoning Loop, POPIA trust, Start/Scale/Dominate |
| Client Portal — `app.get-kind.com` | ✅ Live | Vercel — kind-portal project |
| Admin Dashboard — `admin.get-kind.com` | ✅ Live | Vercel — kind-admin-h5q6 project |
| Railway API | ✅ Running | kindapi-production-e64c.up.railway.app |
| Supabase — all tables + RLS | ✅ Live | All schema + migrations run |
| Supabase auth — no email confirmation | ✅ Live | Signup → instant dashboard |
| TypeScript build | ✅ Clean | All errors fixed |
| Cron jobs — 16 jobs | ✅ Running | node-cron in API — starts on boot (staggered — no conflicts) |
| RLS on all tables | ✅ Fixed | Re-enabled 18 May |
| Demo Environments | ✅ Live | Admin → Demo Envs — full sales demo tool |
| AI ICP Suggest | ✅ Live | "Suggest ICP with AI" → Claude fills form from company profile |
| ICP Website Scan | ✅ Live | "Scan website" button in ICP form — calls /icps/prefill, pre-fills from URL |
| FIGSY generateSequenceWithMemory | ✅ Live | Self-improving sequences using campaign history |
| FIGSY auto-replenish alert | ✅ Live | Daily cron 05:00 UTC |
| Milla morning brief | ✅ Live | Daily cron 07:30 UTC to all active clients |
| Milla anomaly detection | ✅ Live | Daily cron 08:30 UTC |
| K.I.N.D self-outreach (FIGSY dogfooding) | ✅ Live | Monday cron 06:00 UTC — needs FIGSY_KIND_CLIENT_ID env var |
| /stats/platform public endpoint | ✅ Live | Live platform stats |
| Campaign intent prompt | ✅ Built | Feature flagged — FEATURE_CAMPAIGN_INTENT=true to activate |
| Conversational ICP builder | ✅ Built | Feature flagged — FEATURE_ICP_BUILDER=true to activate |
| Web Speech API voice input | ✅ Built | On both above — mic button, Chrome/Safari/Edge |
| Partners page rewrite | ✅ Live | ClickUp/Smartsheet model — standard pricing, commission-based |
| Pricing page rewrite | ✅ Live | Start/Scale/Dominate + partner callout |
| Founder name removed from public pages | ✅ Done | "Founder" only — terms.html unchanged |
| Admin cohort analytics | ✅ Live | /admin/cohorts — signup month, activation, conversion, churn per cohort |
| Portal Analytics page | ✅ Live | /dashboard/analytics — 6-month trends, ICP breakdown, score dist, top industries |
| Stripe USD/GBP billing | ✅ Code complete | Billing page auto-activates when `STRIPE_SECRET_KEY` is set in Railway |
| Paystack webhook | ✅ Set | TEST key — live payments blocked until KYC |
| Lead drip system | ✅ Live | `delivered_at` on leads, daily_drip_rate per client, 08:10 UTC cron |
| Credits deduct at delivery | ✅ Live | 1 credit per lead when daily drip delivers it — NOT at insertion |
| Lead overspend fix | ✅ Live | maxLeads cap + leads_per_run client setting respected |
| Apollo fallback search | ✅ Live | 3-pass fallback: full → remove consent filter → remove size filter |
| Low credit warning | ✅ Live | Daily 07:40 UTC — emails clients with 1–4 credits remaining (max 1/24h) |
| Subscription lapse check | ✅ Live | Daily 09:00 UTC — marks active subs past period end as `lapsed`, emails client |
| Milla (virtual_assistant) access gate | ✅ Fixed | React hooks violation fixed — no more crash on load |
| Vida (chatbot) access gate | ✅ Fixed | `active` only — removed trialing (must have paid subscription) |
| FIGSY trial expiry gate | ✅ Fixed | Backend rejects trialing campaigns with expired current_period_end |
| Cancel subscription | ✅ Live | `POST /subscriptions/:id/cancel` — Paystack disable + DB update |
| Recurring billing webhooks | ✅ Live | subscription.create saves paystack_subscription_code, charge.success handles renewals |
| Admin credit grant cap | ✅ Live | Hard cap 500 credits per grant — prevents accidental large grants |
| FIGSY trialing gate removed | ✅ Fixed | FIGSY page now requires `active` only (no trialing) |
| Credit pricing aligned | ✅ Fixed | 2 tiers: Kind AI 20/$20, 100/$100 · FIGSY 20/$60, 100/$300 |
| Paystack KYC | ⏳ Pending | **Must complete — cannot take live payments** |
| Google Workspace | ⏳ Pending | **Must set up — no professional email inbox** |
| Calendar booking link | ⏳ Pending | Share Calendly/Cal.com URL — Claude will wire into site + portal in 5 mins |
| FIGSY_KIND_CLIENT_ID env var | ⏳ Pending | Self-outreach runs but does nothing without this |
| Resend inbound routing | ⏳ Pending | Needs paid Resend plan — required before FIGSY campaigns |
| Google Calendar OAuth | ⏳ Pending | Code done — needs credentials |
| Vapi.ai Voice | ⏳ Pending | Code done — needs account |
| WhatsApp Business API | ⏳ Pending | Code done — Meta 3–7 day approval |
| G2 / Capterra / Product Hunt | ⏳ Pending | Launch day listings |
| UK company registration | ⏳ Pending | companieshouse.gov.uk — £50, same day — see Section 23 |
| Run credit_transactions RLS migration | ✅ Done | Already applied — confirmed by user 24 May |
| Portal V2 design (SidebarV2, mission control) | ✅ Built | Feature flagged — `FEATURE_PORTAL_V2=true` to activate |
| Dark mode (full system) | ✅ Live | DarkModeToggle in all layouts, FOUC prevention |
| **Signup hotfix** — `amount_zar` NOT NULL | ✅ Fixed | All new signups now work — 25 May |
| **Full schema drift fix** — `amount_usd` removed | ✅ Fixed | MRR calculations restored — 25 May |
| **Daily 04:00 AM automated audit** | ✅ Live | `.github/workflows/daily-audit.yml` — opens GitHub Issue on failure |
| Run `20260525_fix_subscriptions_schema.sql` | ⏳ MUST RUN | Supabase SQL Editor — makes schema drift permanent fix on DB level |
| **Delete test chatbot/VA subscriptions** | ✅ Done 26 May | SQL: `DELETE FROM subscriptions WHERE product IN ('chatbot','virtual_assistant') AND status='active' AND client_id='187bfb91-1224-4c29-90ea-4c2bdaff0ed1';` |
| FIGSY inbound webhook fix | ✅ Fixed 26 May | `/replies/inbound` moved before `requireAuth` — was always returning 401 to Resend. Protected by `RESEND_WEBHOOK_SECRET` header. |
| Bulk export row cap | ✅ Fixed 26 May | `/leads/bulk-export` now caps at 5,000 rows + `X-Export-Truncated` header |
| Widget rate limiting | ✅ Fixed 26 May | Public `/vida/widget/:clientId/session/:sessionId/message` — 20 req/IP/min in-memory limiter |
| Founder morning brief | ✅ Built 26 May | Daily 07:05 SAST — platform health, FIGSY 24h, revenue, alerts. Sends to `FOUNDER_EMAIL`. |
| Admin scalability page | ✅ Built 26 May | `/scalability` in admin — stage tracker, hire checklist, infra triggers |
| HubSpot full sync | ✅ Built 26 May | `lib/hubspot.ts` — signup→contact, payment→deal closed, FIGSY reply→timeline. No-op if `HUBSPOT_API_KEY` unset. |
| Admin HubSpot pipeline page | ✅ Built 26 May | `/hubspot` in admin — Kanban by stage, shows "Connect HubSpot" guide if key absent |
| Competitor ICP seed configs | ✅ Built 26 May | `supabase/seeds/competitor_icps.sql` — 4 configs: Lemlist/Instantly/Clay/Apollo users in ZA/NG/KE/GH/EG. Ready to run when Apollo upgraded. |
| Apollo free plan handling | ✅ Fixed 26 May | Clean 402/429 errors when credits exhausted or rate limited. Safe to use free plan (50 credits/mo) until paid upgrade. |
| **Apollo `APOLLO_API_KEY` in Railway** | ✅ Done | Free plan active. 50 contacts/month — enough for demos + KIND's own outreach now. |
| **Confirm RESEND_API_KEY in Railway** | ⏳ BLOCKER | Zero emails send without this. Welcome, POPIA, digest, brief — all dead. |
| **Check Railway deploy logs** | ⏳ ACTION | Confirm green build after all code changes — railway.app → KIND API → Deployments |
| **Run `MASTER_SCHEMA.sql`** | ⏳ MUST RUN | Supabase SQL Editor → paste full file → eliminates all schema drift permanently |
| **Run `20260526_drip_and_controls.sql`** | ⏳ MUST RUN | Supabase SQL Editor — adds `delivered_at` to leads + `daily_drip_rate` to clients |
| **HubSpot account + API key** | ⏳ Pending | app.hubspot.com (free) → Settings → Private Apps → "KIND AI" → add `HUBSPOT_API_KEY` to Railway |
| **Register Resend webhook** | ⏳ Pending | Resend dashboard → Webhooks → `https://kindapi-production-e64c.up.railway.app/figsy/replies/inbound` + set `RESEND_WEBHOOK_SECRET` in Railway |
| **Paystack plan codes** | ⏳ Pending | Create plans in Paystack dashboard → add `PAYSTACK_PLAN_VA_MONTHLY` etc to Railway |

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

### 🔴 CRITICAL — Do In This Order (Platform Is Blocked Without These)

| # | Task | Where | Why |
|---|---|---|---|
| ~~1~~ | ~~Apollo API key~~ | ✅ **Done** — `APOLLO_API_KEY` confirmed in Railway. Free plan (50 contacts/mo) active. **Apollo upgrade path: Monthly $99/mo after client 1 pays → Annual $49/mo when MRR covers $588 upfront.** | — |
| 2 | **Confirm RESEND_API_KEY in Railway** | railway.app → KIND API → Variables | Zero emails without this — welcome, POPIA, digest, morning brief all dead |
| 3 | **Check Railway deploy logs** | railway.app → KIND API → Deployments | Confirm green build after all recent code pushes |
| 4 | **Run `MASTER_SCHEMA.sql`** | Supabase → SQL Editor → paste + Run | Eliminates all schema drift permanently — one paste, done forever |
| 5 | **Run `20260526_drip_and_controls.sql`** | Supabase → SQL Editor | Adds `delivered_at` to leads, `daily_drip_rate` to clients — drip system needs this |
| 6 | **Run `20260525_fix_subscriptions_schema.sql`** | Supabase → SQL Editor | Schema drift fix — drops phantom `amount_usd`, sets `amount_zar DEFAULT 0` |
| 7 | **Complete Paystack KYC** | dashboard.paystack.com → Settings → Compliance | Cannot take a single live ZAR payment without this |

### 🟡 HIGH — Do This Week

| # | Task | Where | Notes |
|---|---|---|---|
| 8 | **Create HubSpot account** | app.hubspot.com (free CRM) → Settings → Private Apps → create "KIND AI" → add `HUBSPOT_API_KEY` to Railway | HubSpot sync is fully built — wires itself the moment key is set |
| 9 | **Register Resend inbound webhook** | Resend dashboard → Webhooks | URL: `https://kindapi-production-e64c.up.railway.app/figsy/replies/inbound` · Add `RESEND_WEBHOOK_SECRET` to Railway — same string |
| 10 | **Create Paystack subscription plans** | Paystack dashboard → Plans | Create VA/Chatbot/FIGSY monthly+annual plans → add plan codes to Railway as `PAYSTACK_PLAN_VA_MONTHLY` etc |
| 11 | **Add FIGSY_KIND_CLIENT_ID to Railway** | Railway → KIND API → Variables | Your own client UUID — self-outreach cron runs but does nothing without it |
| 12 | **Create calendar booking link** | calendly.com or cal.com (free) → share URL | Claude will wire every "Book a Demo" button in 5 mins |
| 13 | **Set up Google Workspace** | workspace.google.com → Business Starter | hello@get-kind.com inbox — step-by-step in Section 2 below |
| 14 | **Register UK company** | companieshouse.gov.uk — £50 same day | Full step-by-step in Section 23 |
| 15 | **Upgrade Resend to paid plan** | resend.com → Billing | Free plan = 100 emails/day — blocks FIGSY at scale |

### 🟢 WHEN READY — Activates Built Features

| # | Task | Env vars to add to Railway |
|---|---|---|
| 16 | **Stripe USD/GBP** — billing page auto-shows when key is set | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_LEADGEN_20`, `STRIPE_PRICE_LEADGEN_100`, `STRIPE_PRICE_FIGSY_20`, `STRIPE_PRICE_FIGSY_100` |
| 17 | Google Calendar OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| 18 | Vapi.ai Voice | `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ASSISTANT_ID`, `VAPI_WEBHOOK_SECRET` |
| 19 | WhatsApp Business API | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` |
| 20 | Wise Business bank account | business.wise.com — after UK company registered | Free, multi-currency |
| 21 | Update FOUNDER_EMAIL in Railway | Change to `hello@get-kind.com` after Workspace is live | Morning brief + all system emails |
| 22 | Campaign intent prompt (go live) | `FEATURE_CAMPAIGN_INTENT=true` in Railway | — |
| 23 | ICP builder (go live) | `FEATURE_ICP_BUILDER=true` in Railway | — |

### ⚡ INSTANT — Takes 5 Minutes
| Task | What Claude needs |
|---|---|
| Wire "Book a Demo" buttons site-wide | Your Calendly/Cal.com URL |
| Wire company number into site + legal docs | Your UK Companies House number (after registration) |

### Once Live (not urgent)
| # | Task | When |
|---|---|---|
| 24 | G2, Capterra, Product Hunt listings | Launch day |
| 25 | Upload new Vida image | apps/website/vida.png via GitHub |
| 26 | SOC 2 Type II | Q1 2027 |
| 27 | Answer 5 sales questions | When you have 20 min — becomes the AE playbook |

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

*Owner: K.I.N.D founding team*
*Last updated: 26 May 2026 (evening)*
