# K.I.N.D — MASTER DOCUMENT
**Single source of truth. Last updated: 16 May 2026**
**Launch date: 31 May 2026 · Days remaining: 15**

> Everything in one place. Roadmap, status, cashflow, SOPs, client flow, expansion plan, pending actions.
> Branch: `claude/ai-business-roadmap-U3OWJ` → merge to main before launch.

---

## TABLE OF CONTENTS

1. [Things to Remember — Pending Actions](#1-things-to-remember--pending-actions)
2. [What's Built](#2-whats-built)
3. [What I Can Build Next (No Blockers)](#3-what-i-can-build-next-no-blockers)
4. [What's Blocked (Needs Your Action)](#4-whats-blocked-needs-your-action)
5. [Will Not Build Yet](#5-will-not-build-yet)
6. [Agent Naming](#6-agent-naming)
7. [Pricing Model](#7-pricing-model)
8. [Revenue Targets & KPIs](#8-revenue-targets--kpis)
9. [Cashflow Model](#9-cashflow-model)
10. [Client Flow — All Paths](#10-client-flow--all-paths)
11. [Operations SOP](#11-operations-sop)
12. [Tech Stack & Infrastructure](#12-tech-stack--infrastructure)
13. [Deployment Checklist](#13-deployment-checklist)
14. [Market Expansion Plan — US & UK](#14-market-expansion-plan--us--uk)
15. [Product Vision — 1, 3, 5 Years](#15-product-vision--1-3-5-years)
16. [Alta AI SDR — Competitive Audit](#16-alta-ai-sdr--competitive-audit)
17. [Key Decisions Locked](#17-key-decisions-locked)

---

## 1. THINGS TO REMEMBER — PENDING ACTIONS

> Updated every session. These are items only Jacques can action.

| # | Item | Where | Status |
|---|---|---|---|
| **1** | Drop `milla.png` + `vida.png` into `apps/website/` | [GitHub upload link](https://github.com/jacquesvieiraza-blip/KIND/upload/claude/ai-business-roadmap-U3OWJ/apps/website) | **Done** — wired into about.html |
| **2** | Supabase: set Site URL → `https://app.get-kind.com` | Supabase → Auth → URL Configuration | Pending |
| **3** | Supabase: add redirect URL → `https://app.get-kind.com/auth/callback` | Same as above | Pending |
| **4** | Railway env var: `FOUNDER_EMAIL=your@email.com` | Railway → Variables | Pending |
| **5** | Railway env var: `FIGSY_DAILY_SEND_LIMIT=20` | Railway → Variables | Pending |
| **6** | Railway env var: `FIGSY_REPLY_TO=replies@get-kind.com` | Railway → Variables | Pending |
| **7** | Confirm all other Railway env vars exist (see §12) | Railway → Variables | Pending |
| **8** | Paystack webhook: `kindapi-production-83cb.up.railway.app/webhooks/paystack` | Paystack → Settings → Webhooks | Pending |
| **9** | Run DB migrations 002, 003, 004, 005 in order | Supabase → SQL Editor | Pending |
| **10** | Resend: configure inbound routing → `kindapi-production-83cb.up.railway.app/figsy/replies/inbound` | resend.com → Inbound | Pending |
| **11** | Set up 6 Railway cron jobs (see §12) | Railway → Cron | Pending |
| **12** | Merge branch `claude/ai-business-roadmap-U3OWJ` → main + deploy | GitHub | Pending |
| **13** | G2, Capterra, Product Hunt — list on launch day, ask first 10 clients for reviews week 1 | External platforms | Launch day |
| **14** | Meta WhatsApp Business API application | business.facebook.com | Pending |
| **15** | Vapi.ai account + Twilio SA +27 number | vapi.ai + twilio.com | Pending |

---

## 2. WHAT'S BUILT

### Core Platform
| Item | Notes |
|---|---|
| Monorepo — portal, admin, API, DB, shared | Turborepo, TypeScript throughout |
| Supabase auth — signup, login, email confirm, onboarding | All bugs fixed |
| Full DB schema — 13 tables + RLS + 5 migrations | All tables + FIGSY, CRM, partners |
| CSV export, admin dashboard, CRM integration | HubSpot + Pipedrive |

### Lead Gen (Complete)
| Item | Notes |
|---|---|
| AI ICP pre-fill from website | Claude scrapes site → suggests fields in 60s |
| Apollo search auto-fires on ICP save | No manual button |
| POPIA consent gate removed | All scored leads enrolled automatically |
| Lead scoring — Claude Haiku 0–100 + reasoning | Per lead |
| POPIA consent email + callback page | Fully built |
| Lead filtering, opt-out blocklist, CSV export | Full pipeline management |
| Bulk lead actions | Select → export CSV, send consent, bulk status |
| CRM push — HubSpot + Pipedrive | On consent_given |
| First leads email (top 5 inline) | Auto-sent on first batch |
| Weekly Monday leads digest | Cron |
| Day 1 outreach for Lead Gen Pro | `sendDay1OutreachBatch` — Claude writes personalised email per lead |

### FIGSY (Complete)
| Item | Notes |
|---|---|
| Campaign CRUD — create/activate/pause/archive | Full lifecycle |
| AI 3-step email sequences per lead | Humanised — SA voice, specific observations, no AI tells, SA first name sign-off |
| Domain warming cap | `FIGSY_DAILY_SEND_LIMIT` env var |
| send-due queue — step 2 + 3 auto-send | `next_send_at` stored |
| Reply classification — 5 categories | interested / not_interested / opt_out / out_of_office / other |
| F2-3: AI reply suggestions | Claude drafts follow-up for interested replies |
| Unified reply inbox | Portal page + `GET /figsy/replies/all` |
| Campaign cloning | Clone button per campaign |
| KPI dashboard | Reply rate, interested %, avg score, contacts |
| Opt-out auto-suppression | Shared blocklist with Lead Gen |
| CRM deal push on "interested" reply | HubSpot + Pipedrive |
| Auto-enroll consented leads | No manual activation |
| FIGSY upgrade wall | Full upsell page for non-subscribers |

### Billing & Onboarding
| Item | Notes |
|---|---|
| Paystack credit bundle checkout | One-time purchase |
| Terms acceptance checkbox on billing | Required before purchase |
| Direct-pay path on onboarding | Trial vs pay now — two buttons |
| Zero-credits warning cron | Day 1/4/7 escalation emails |
| Onboarding checklist | 4-step tracker, disappears when complete |

### Voice, WhatsApp & Calendar (Built — needs credentials to activate)
| Item | Notes |
|---|---|
| Voice Agent (Vapi.ai) | `apps/api/src/lib/vapi.ts` + `routes/voice.ts` — FIGSY places calls on day 4. Gated: if no VAPI_API_KEY, skips gracefully |
| DB migration 006 | `figsy_calls` table — tracks all calls, status, outcome, transcript |
| WhatsApp (Vida inbound) | `apps/api/src/lib/whatsapp.ts` + `routes/whatsapp.ts` — Vida responds to inbound messages. Gated: if no WHATSAPP_TOKEN, skips |
| Google Calendar | `apps/api/src/lib/gcal.ts` + `routes/calendar.ts` — OAuth connect, free slot detection, meeting booking. Gated: if no GOOGLE_CLIENT_ID, skips |
| DB migration 007 | `calendar_bookings` table + calendar token columns on clients |
| Settings page integrations | Calendar connect button, WhatsApp status, Voice status — all with setup guidance |
| Admin Launch checklist | `admin.get-kind.com/launch` — 10-section interactive checklist, 50+ items, all steps to go live |

### Internal Agents (Founder Tooling)
| Agent | Endpoint | What it does |
|---|---|---|
| AE: at-risk alerts | `POST /internal/ae/at-risk` | Flags clients with no ICP/leads after 3 days |
| AE: check-in draft | `POST /internal/ae/checkin-draft` | Claude drafts personalised check-in |
| AE: trial expiry | `POST /internal/ae/trial-expiry` | Day 10/12/14 expiry emails |
| AE: trial nurture | `POST /internal/ae/nurture` | Day 1/3/5/7/10 onboarding emails |
| AE: zero-credits | `POST /internal/ae/zero-credits` | Day 1/4/7 warning when credits hit 0 |
| CRO: weekly digest | `POST /internal/cro/weekly-digest` | Claude writes + emails founder weekly summary |
| CRO: churn risk | `GET /internal/cro/churn-risk` | Risk score 0–100 per client |
| CMO: LinkedIn posts | `POST /internal/cmo/linkedin-posts` | Generates 3 branded posts |
| CMO: prospect finder | `POST /internal/cmo/prospect` | Apollo search with K.I.N.D's own ICP |

### Partner Programme
| Item | Notes |
|---|---|
| DB migration 005 | partners, partner_referrals, partner_commissions tables |
| API | Apply, validate referral code, admin list/approve/commission/dashboard |
| partners.html static page | 20% recurring commission, application form |
| Client referral page | `/dashboard/referral` — informal referral for existing clients |

### Website (get-kind.com)
| Page | Status |
|---|---|
| index.html | Team narrative, FIGSY character, POPIA trust strip, speed claim, anti-Alta pricing |
| about.html | Founder story, Meet the agents (FIGSY/Milla/Vida) |
| pricing.html | Anti-Alta strip, "data stays in Africa" trust line |
| trust.html | POPIA, data sovereignty, security architecture |
| partners.html | Partner programme, commission rates, application form |
| dpa.html | Data Processing Agreement (SA law, 10 sections) |
| vs-hiring-an-sdr.html | FIGSY vs human SDR cost breakdown |
| vs-prospecting-manually.html | K.I.N.D vs manual prospecting |
| vs-apollo.html | K.I.N.D vs Apollo.io — Africa-first positioning |
| figsy-video.html | 12-scene animated video with FIGSY character image |
| use-cases.html, support.html, about.html, terms.html | All updated with nav links |

### Admin (admin.get-kind.com)
| Item | Notes |
|---|---|
| CMO Tools page | LinkedIn post generator + prospect finder |
| Client dashboard | MRR, TTFL, client health, churn risk |
| Roadmap page | Internal product roadmap view |

---

## 3. WHAT I CAN BUILD NEXT (NO BLOCKERS)

| # | Item | Priority |
|---|---|---|
| 1 | Add Milla + Vida images to about page | High — waiting on images (tomorrow) |
| 2 | Bulk lead actions UI polish | Medium |
| 3 | Client KPI dashboard polish | Medium |
| 4 | US/UK comparison pages (`vs-outreach.html`, `vs-salesloft.html`) | Low — after 5 clients |
| 5 | Stripe billing for USD/GBP | Low — after 5 clients |

---

## 4. WHAT'S BLOCKED (NEEDS YOUR ACTION)

| Item | Blocked by | Code status |
|---|---|---|
| Voice agent (FIGSY calls — Day 4 follow-up) | Vapi.ai account + Twilio SA +27 number | **Built** — add 4 env vars to activate |
| WhatsApp outreach channel | Meta Business API approval (3–7 days) | **Built** — add 3 env vars to activate |
| Google Calendar booking | Google OAuth credentials | **Built** — add 3 env vars to activate |
| VA product (Milla) | Vector DB decision (Supabase pgvector vs Pinecone) + July build slot | Not built |
| Chatbot product (Vida) | Same as VA | Not built |

---

## 5. WILL NOT BUILD YET

| Item | Why |
|---|---|
| LinkedIn automation | Wrong channel for Africa, ToS risk |
| 50+ data sources | Apollo covers SA — distraction before 50 clients |
| SOC 2 Type II | Q1 2027 when first enterprise deal demands it |
| ICP self-improvement (Luna equivalent) | Needs 3+ months of live campaign data |
| Built-in CRM | Year 2 — HubSpot/Pipedrive push covers it now |
| African language support | Phase B — after Voice + WhatsApp live |

---

## 6. AGENT NAMING

| Agent | Named after | Role | Status |
|---|---|---|---|
| **FIGSY** | The founder | AI SDR — outbound email, follow-up, meeting booking | Live |
| **Milla** | Founder's daughter | Virtual Assistant — trained on your business, answers questions, drafts proposals | July 2026 |
| **Vida** | Founder's daughter | Chatbot Agent — website + WhatsApp inbound qualifier | July 2026 |

All three named on `apps/website/about.html` — Meet the agents section.
Character images: All three live on about.html. FIGSY (`ai-agent.jpg`), Milla (`milla.png`), Vida (`vida.png`).

---

## 7. PRICING MODEL

### Credit Bundles (current model)

| Product | Credits | Price USD | Price ZAR |
|---|---|---|---|
| K.I.N.D AI — Lead Gen Pro | 20 | $20 | R380 |
| K.I.N.D AI — Lead Gen Pro | 40 | $40 | R760 |
| K.I.N.D AI — Lead Gen Pro | 100 | $100 | R1,900 |
| FIGSY Advanced | 20 | $60 | R1,140 |
| FIGSY Advanced | 40 | $120 | R2,280 |
| FIGSY Advanced | 100 | $300 | R5,700 |

**Rules:**
- 1 credit consumed when a prospect sends a positive reply (interested/wants to chat)
- No credit consumed for no-reply or negative reply
- No refunds on spent credits
- Cancel anytime — no contracts, no quarterly lock-in
- ZAR billing via Paystack
- USD billing via Stripe (after 5 clients, Phase 2)

**Anti-Alta positioning:**
Alta AI SDR = from $1,250/mo, USD only, quarterly locked-in, no trial, no refunds.
K.I.N.D = from R380, ZAR billing, no contracts, full free trial, cancel anytime.

---

## 8. REVENUE TARGETS & KPIs

### Month-by-Month MRR Targets

| Month | Target MRR (USD) | Target MRR (ZAR) | New Clients | Cumulative |
|---|---|---|---|---|
| May 2026 (launch) | $500 | R9,500 | 5 | 5 |
| Jun 2026 | $2,000 | R38,000 | 10 | 15 |
| Jul 2026 | $5,000 | R95,000 | 15 | 30 |
| Aug 2026 | $9,000 | R171,000 | 15 | 45 |
| Sep 2026 | $13,000 | R247,000 | 15 | 60 |
| Oct 2026 | $18,000 | R342,000 | 15 | 75 |
| Nov 2026 | $22,000 | R418,000 | 15 | 90 |
| Dec 2026 | $26,000 | R494,000 | 10 | 100 |

**Year 1 target: $26,000 MRR / 100 active clients by Dec 2026**

### Core KPIs (track every Monday)

| KPI | Target | Red Flag |
|---|---|---|
| TTFL (Time to First Lead) | < 2 hours | > 4 hours |
| Trial → Paid conversion | > 40% | < 25% |
| Month 1 churn | < 5% | > 10% |
| FIGSY reply rate | > 8% | < 3% |
| FIGSY interested rate | > 2% | < 0.5% |
| ICP built within 24h of signup | > 80% | < 60% |
| At-risk clients (no ICP after 3 days) | 0 | > 2 |

### Weekly Founder Dashboard (check every Monday)
1. New signups last 7 days
2. Trial → paid conversions last 7 days
3. At-risk clients (no ICP, no leads)
4. MRR vs monthly target
5. FIGSY: reply rate + interested % across all campaigns
6. TTFL: any client > 4 hours flagged

---

## 9. CASHFLOW MODEL

### Fixed Monthly Tech Costs

| Service | Plan | Cost/mo |
|---|---|---|
| Supabase | Pro (af-south-1 required for POPIA) | $25 |
| Vercel | Pro (portal + website + admin) | $20 |
| Railway | Usage-based (API server) | $10–20 |
| Apollo.io | Professional (24,000 credits/mo) | $99 |
| Resend | Free → Pro at scale | $0–20 |
| Domain (get-kind.com) | Annual | $1.25 |
| **Total floor** | | **$155–185/mo** |

**Variable costs per lead:** ~$0.009 (sub-cent at any volume)
Apollo: ~$0.008 · Anthropic scoring: ~$0.0004 · FIGSY email: ~$0.01–0.02

### Scenario A — Conservative ($150/mo avg, Lead Gen only)

| Clients | MRR | Total costs | Net profit | Margin |
|---|---|---|---|---|
| 1 | $150 | $171 | **-$21** | -14% |
| 2 | $300 | $178 | **$122** | 41% |
| 5 | $750 | $197 | **$553** | 74% |
| 10 | $1,500 | $229 | **$1,271** | 85% |
| 30 | $4,500 | $356 | **$4,144** | 92% |
| 100 | $15,000 | $895 | **$14,105** | 94% |

**Break-even: 2 clients.**

### Scenario B — Base Case ($220/mo blended avg)

| Clients | MRR | Total costs | Net profit | Margin |
|---|---|---|---|---|
| 1 | $220 | $174 | **$46** | 21% |
| 5 | $1,100 | $212 | **$888** | 81% |
| 10 | $2,200 | $259 | **$1,941** | 88% |
| 50 | $11,000 | $684 | **$10,316** | 94% |
| 100 | $22,000 | $1,198 | **$20,802** | 95% |

**Break-even: 1 client.**

### Scenario C — Optimistic ($350/mo, FIGSY-heavy)

| Clients | MRR | Total costs | Net profit | Margin |
|---|---|---|---|---|
| 5 | $1,750 | $241 | **$1,509** | 86% |
| 10 | $3,500 | $317 | **$3,183** | 91% |
| 50 | $17,500 | $973 | **$16,527** | 94% |
| 100 | $35,000 | $1,775 | **$33,225** | 95% |

### Annual Revenue Trajectory (Base Case — 3 new clients/month)

| Month | Clients | MRR | Cumulative revenue |
|---|---|---|---|
| 1 | 1 | $220 | $220 |
| 3 | 7 | $1,540 | $2,640 |
| 6 | 16 | $3,520 | $11,220 |
| 9 | 25 | $5,500 | $30,360 |
| 12 | 37 | $8,140 | $62,920 |

**Year 1 ARR at month 12: ~$97,680**

---

## 10. CLIENT FLOW — ALL PATHS

### Path 1 — Self-service trial (most common)
1. get-kind.com → "Start free trial" → signup → confirm email
2. Onboard: company name, industry, country, website
3. Dashboard loads — "Sign your Service Agreement" banner
4. Documents → signs order form
5. Builds ICP → leads appear → explores for 14 days
6. Day 14: trial expires → overlay fires → "Choose a Plan"
7. Billing → Paystack → card → active

### Path 2 — AE-assisted
1–4. Identical to Path 1
5. AE customises the auto-generated order form in admin portal
6. Client signs customised agreement
7. Client pays via Billing or direct Paystack link from AE

### Path 3 — Pay on day 1 (skip trial)
1–4. Identical to Path 1
5. Client goes straight to Documents → signs → goes to Billing → pays immediately
6. Active from day 1, no trial countdown

### Path 4 — Trial expired, never paid
1. Overlay fires on day 14
2. "Sign Service Agreement" + "View Plans" buttons shown
3. Client signs → pays → active
4. If abandons: subscription stays `trialing (expired)` — no charge, ever

### Path 5 — Active client upgrades (Lead Gen → FIGSY bundle)
1. Billing → "Lead Gen + FIGSY Bundle" → Paystack → new subscription
2. ⚠️ Old Lead Gen subscription must be cancelled manually (admin action) or via trigger

### Path 6 — FIGSY add-on (manual)
1. Client emails request → AE adds add-on line to order form → client re-signs
2. Intentionally manual for now — FIGSY is higher touch

---

## 11. OPERATIONS SOP

### Phase 1: Qualification
Before booking a discovery call:
- [ ] B2B company (sells to other businesses)
- [ ] 5+ employees or R1M+ annual revenue
- [ ] Has a sales function (even informal)
- [ ] SA, Africa, or EMEA primary market
- [ ] Use case maps to at least one K.I.N.D product

**Disqualify if:** B2C only, under 6 months old with no revenue, requires custom dev

### Phase 2: Discovery Call (30–45 min)
Key questions:
1. How do you currently find and qualify new clients?
2. Where does your pipeline break down most?
3. Have you tried outbound before? What happened?
4. What markets and job titles are you trying to reach?
5. What's your budget for sales infrastructure this year?

### Phase 3: Proposal (send within 24h)
Include: executive summary, recommended product(s), pricing, timeline, next steps.

### Phase 4: Order Form → Signature
Admin portal → Clients → [Client] → Send Order Form → client signs in Documents tab.

### Phase 5: Payment
Client → Billing → selects plan → Paystack → webhook fires → subscription active.

### Phase 6: Onboarding (Days 1–5)
- Day 1: confirm client record + subscription in DB, send welcome email
- Day 2–3: 60-min onboarding call — portal walkthrough, build ICP together, explain POPIA
- Day 3–5: activate ICP, first leads appear, confirm client can see pipeline

### Weekly Cadence
| Day | Action |
|---|---|
| Monday | Review all active client pipelines — flag any with 0 new leads |
| Wednesday | Check opt-out blocklist for new entries |
| Friday | Review usage metrics — flag low engagement |

### POPIA Compliance — Non-Negotiable
| Source | Can Contact? |
|---|---|
| Apollo (consented = true) | Yes — immediately |
| Apollo (consented = false) | Only after KIND consent confirmed |
| On opt-out blocklist | Never — even if re-appearing in Apollo |

**Opt-out handling:** Lead Gen pipeline → Block → permanent, cross-client, instant.

---

## 12. TECH STACK & INFRASTRUCTURE

| Layer | Technology | Notes |
|---|---|---|
| Portal (client-facing) | Next.js 14, TypeScript, Tailwind | `apps/portal` — Vercel |
| Admin (internal) | Next.js 14, TypeScript, Tailwind | `apps/admin` — Vercel |
| API | Express, TypeScript | `apps/api` — Railway |
| Database | Supabase (PostgreSQL, af-south-1 Cape Town) | RLS on all tables |
| Auth | Supabase Auth | Email + password |
| AI | Anthropic Claude (Haiku + Sonnet) | Haiku for volume, Sonnet for quality |
| Lead data | Apollo.io API | Pre-consented contacts first |
| Email sending | Resend | `hello@get-kind.com` |
| Payments | Paystack | ZAR + USD, credit bundles |
| Website | Static HTML | `apps/website` — Vercel |
| Landing | Static HTML | `apps/landing` — Netlify |

### Railway Env Vars (all required)
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
APOLLO_API_KEY
RESEND_API_KEY
PAYSTACK_SECRET_KEY
PAYSTACK_WEBHOOK_SECRET
ADMIN_SECRET_KEY
FOUNDER_EMAIL=your@email.com
FIGSY_REPLY_TO=replies@get-kind.com
FIGSY_DAILY_SEND_LIMIT=20
PORTAL_URL=https://app.get-kind.com
# Google Calendar (add when ready)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://kindapi-production-83cb.up.railway.app/calendar/callback
# Vapi.ai Voice (add when ready)
VAPI_API_KEY=
VAPI_PHONE_NUMBER_ID=
VAPI_ASSISTANT_ID=
VAPI_WEBHOOK_SECRET=
# WhatsApp Business API (add when ready)
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
```

### Railway Cron Jobs (set up after merge)
| Schedule | Endpoint | Purpose |
|---|---|---|
| `0 8 * * *` | `POST /internal/ae/nurture` | Trial nurture emails |
| `0 8 * * *` | `POST /internal/ae/at-risk` | At-risk client alerts |
| `0 8 * * *` | `POST /internal/ae/trial-expiry` | Trial expiry emails |
| `0 8 * * *` | `POST /figsy/send-due` | FIGSY step 2 + 3 emails |
| `0 7 * * 1` | `POST /internal/digest/weekly` | Weekly leads digest to clients |
| `0 7 * * 1` | `POST /internal/cro/weekly-digest` | Weekly founder digest |

All cron endpoints require header: `x-admin-key: {ADMIN_SECRET_KEY}`

### DB Migrations (run in Supabase SQL Editor in order)
1. `packages/db/src/schema.sql` — base schema
2. `packages/db/src/migrations/001_icps_last_run_at.sql`
3. `packages/db/src/migrations/002_figsy.sql`
4. `packages/db/src/migrations/003_crm_integration.sql`
5. `packages/db/src/migrations/004_figsy_crm_deal.sql`
6. `packages/db/src/migrations/005_partners.sql`

---

## 13. DEPLOYMENT CHECKLIST

**~90 minutes end-to-end. Do in this order.**

### Before you start — collect these keys:
- Supabase Project URL + Anon Key + Service Role Key
- Paystack Secret Key + Webhook Secret
- Anthropic API Key
- Apollo API Key
- Resend API Key
- Railway API URL (after deploy)
- Vercel Portal URL (after deploy)

### Step 1 — Supabase (~10 min)
- [ ] SQL Editor → run `packages/db/src/schema.sql`
- [ ] SQL Editor → run migrations 001–005 in order
- [ ] Storage → create bucket `agreement-templates` (public)
- [ ] Auth → set Site URL: `https://app.get-kind.com`
- [ ] Auth → add redirect URL: `https://app.get-kind.com/auth/callback`

### Step 2 — Railway API (~15 min)
- [ ] New project → deploy from GitHub → root dir: `apps/api`
- [ ] Build: `npm run build` · Start: `npm start`
- [ ] Add all env vars (see §12)
- [ ] Set up 6 cron jobs (see §12)

### Step 3 — Vercel Portal (~10 min)
- [ ] Import repo → root dir: `apps/portal`
- [ ] Set: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Custom domain: `app.get-kind.com`

### Step 4 — Vercel Admin (~10 min)
- [ ] Import repo → root dir: `apps/admin`
- [ ] Set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Custom domain: `admin.get-kind.com`

### Step 5 — Vercel Website (~5 min)
- [ ] Import repo → root dir: `apps/website`
- [ ] Custom domain: `get-kind.com`

### Step 6 — Netlify Landing (~5 min)
- [ ] Drag `apps/landing/` folder into Netlify

### Step 7 — Paystack (~10 min)
- [ ] Settings → Webhooks → add: `kindapi-production-83cb.up.railway.app/webhooks/paystack`

### Step 8 — Resend (~10 min)
- [ ] Configure inbound routing for `replies@get-kind.com`
- [ ] Webhook: `kindapi-production-83cb.up.railway.app/figsy/replies/inbound`
- [ ] Update `FIGSY_REPLY_TO` in Railway to match

### Step 9 — Smoke Test (9 steps)
| Step | Action | Pass condition |
|---|---|---|
| 1 | Sign up at `app.get-kind.com` | Confirmation email arrives |
| 2 | Click confirm, land on portal | Dashboard loads, trial banner shows |
| 3 | Complete business profile | Saves without error |
| 4 | Build ICP, click Save | Lead search fires automatically |
| 5 | Check leads pipeline | Leads appear within 2 hours with scores |
| 6 | Send POPIA consent to one lead | Email arrives, status updates |
| 7 | Export leads as CSV | File downloads correctly |
| 8 | Go to Billing, tick terms, buy 20 credits | Paystack opens, returns, credits show |
| 9 | Check admin dashboard | Client visible, TTFL showing |

---

## 14. MARKET EXPANSION PLAN — US & UK

> **Trigger: after 5 paying SA clients. Do not action before then.**

### Phase 1 — SA Launch (now → client 5)
Nothing changes. Current site, current pricing, current positioning. Prove the model.

### Phase 2 — Dual Market (after client 5, ~1 day of work)
**Website:**
- Pricing: USD front, ZAR secondary — "From $20 / R380"
- Hero: "Built in Africa. Ready for the world."
- Trust page: POPIA + GDPR + CAN-SPAM — all three (compliance already in place)
- 2 new US comparison pages (`vs-outreach.html`, `vs-salesloft.html`)
- Support: add US/UK timezone note

**Billing:**
- Add Stripe for USD/GBP alongside Paystack (ZAR stays on Paystack)

**Positioning:**
> "Started in Cape Town. Serving businesses in SA, the US, and the UK."
African origin is the differentiator — not a limiter. Apollo data is excellent for US + UK.

**What never changes:** product, pricing model, FIGSY/Milla/Vida characters, all code.

### Phase 3 — Data Residency (post Phase 2, assessed per client demand)
- af-south-1 stays as default — fine for most US/UK clients
- If enterprise demands US-hosted data: provision Supabase US region
- SOC 2 Type II conversation starts here → target Q1 2027
- DPA already published at `get-kind.com/dpa`

---

## 15. PRODUCT VISION — 1, 3, 5 YEARS

### Year 1 (by May 2027)
- 150+ paying clients across SA + Nigeria + Kenya
- Lead Gen + FIGSY proven and reliable
- Milla (VA) live for 30+ clients
- Vida (Chatbot) live for 20+ clients
- FIGSY Phase 2: Google Calendar booking, multi-channel (Voice + WhatsApp)
- K.I.N.D's own outbound running entirely on FIGSY
- Revenue: $40,000 MRR

### Year 2 (2027) — Platform Shift ($120,000 MRR / 450 clients)
- Built-in CRM — clients stop needing HubSpot
- Multi-channel FIGSY — email + LinkedIn + WhatsApp + Voice
- Pan-African launch: Nigeria, Kenya, Ghana, Egypt
- Pipeline forecasting — AI predicts close probability

### Year 3 (2028) — Data Advantage ($300,000 MRR / 1,000 clients)
- Proprietary dataset across thousands of African B2B companies
- Predictive ICP — K.I.N.D tells you who to target before you ask
- White-label offering — agencies resell K.I.N.D under their brand

### Year 5 (2030) — Market Leader
- Dominant B2B revenue OS across Africa
- 5,000+ clients, 10+ countries
- IPO-ready on JSE or acquisition at $100M+ valuation

---

## 16. ALTA AI SDR — COMPETITIVE AUDIT

### What Alta has
- Three named agents: Katie (SDR), Alex (voice), Luna (RevOps intelligence)
- Email + LinkedIn + SMS + voice. 50+ data sources. Self-improving.
- SOC 2 Type II, ISO 27001, GDPR, CCPA. ~$18M raised.
- G2 High Performer 4.9/5. Salesforce AppExchange. $1,250/mo minimum.

### Their gaps (our weapons)
- Zero Africa presence
- US data centres (POPIA risk)
- USD-only quarterly billing, non-refundable, no trial
- No POPIA/NDPR compliance
- No WhatsApp-native strategy
- No African language support
- 3-business-day support response time

### What we've done from this audit
| # | Item | Status |
|---|---|---|
| 1 | Team narrative on website | Done |
| 2 | FIGSY/Milla/Vida named agents with backstory | Done |
| 3 | POPIA + data sovereignty on homepage + trust page | Done |
| 4 | Speed claim ("first leads in 10 min") | Done |
| 5 | Anti-Alta pricing strip | Done |
| 6 | trust.html | Done |
| 7 | partners.html + backend | Done |
| 8 | 3 comparison pages | Done |
| 9 | G2/Capterra/Product Hunt | Launch day |
| 10 | Voice agent (FIGSY calls) | Month 2 — blocked |
| 11 | WhatsApp channel | Month 2 — blocked |
| 12 | African language support | Phase B |
| 13 | SOC 2 Type II | Q1 2027 |
| 14 | DPA template | Done (dpa.html) |

---

## 17. KEY DECISIONS LOCKED

| Decision | Outcome |
|---|---|
| Core metric | TTFL — target < 2 hours from signup |
| Billing model | Credit bundles. Recurring subscriptions Phase 2. |
| Agent naming | FIGSY (founder) · Milla (daughter) · Vida (daughter) |
| Market expansion trigger | After 5 paying SA clients |
| US/UK compliance | POPIA + GDPR + CAN-SPAM — all three. Data residency post Phase 2. |
| FIGSY launch | June 2026, after Lead Gen smoke test |
| VA (Milla) + Chatbot (Vida) | July 2026 |
| Payment processor | Paystack (ZAR) → add Stripe (USD/GBP) at Phase 2 |
| AI provider | Anthropic Claude — Haiku for volume, Sonnet for quality |
| Data source | Apollo.io — pre-consented contacts first |
| Hosting | Supabase af-south-1 + Railway + Vercel + Netlify |
| Legal | Payment = acceptance under ECTA. No manual signing. |
| Vector DB (VA/Chatbot) | TBD — Supabase pgvector (simple) vs Pinecone (scale) |
| LinkedIn automation | Will not build — wrong channel for Africa |
| SOC 2 | Q1 2027 — not before first enterprise deal demands it |

---

*Owner: K.I.N.D founding team*
*Update this document after every session.*
*Branch: `claude/ai-business-roadmap-U3OWJ`*
