# K.I.N.D — MASTER DOCUMENT
**Single source of truth. Last updated: 16 May 2026**
**Launch date: 31 May 2026 · Days remaining: 15**
**Business: UK registered (Companies House) · Platform: Africa-first, world-ready**

> Everything in one place. Status, roadmap, post-launch plan, expansion, compliance, SOPs, cashflow.
> Branch: main ✅ merged 16 May 2026

---

## TABLE OF CONTENTS

1. [Current Status — What's Live](#1-current-status--whats-live)
2. [What Jacques Needs To Do](#2-what-jacques-needs-to-do)
3. [What Claude Can Do](#3-what-claude-can-do)
4. [Monday Plan](#4-monday-plan)
5. [Post-Launch Roadmap — Full Detail](#5-post-launch-roadmap--full-detail)
6. [What's Built](#6-whats-built)
7. [Blocked Features — All Details](#7-blocked-features--all-details)
8. [Will Not Build Yet](#8-will-not-build-yet)
9. [Market Expansion — US, UK & Africa](#9-market-expansion--us-uk--africa)
10. [Compliance — Full Audit](#10-compliance--full-audit)
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

---

## 1. CURRENT STATUS — WHAT'S LIVE

| Item | Status | Notes |
|---|---|---|
| Website — `get-kind.com` | ✅ Live | Vercel — kind-admin project |
| Client Portal — `app.get-kind.com` | ✅ Live | Vercel — kind-portal project |
| Admin Dashboard — `admin.get-kind.com` | ✅ Live | Vercel — kind-admin-h5q6 project |
| Railway API | ✅ Running | kindapi-production-83cb.up.railway.app |
| Railway env vars — all 14 | ✅ Set | All required vars configured |
| Supabase — 39 tables | ✅ Migrated | All schema + 9 migrations run |
| Supabase auth URLs | ✅ Configured | Site URL + redirect URL set |
| Paystack webhook | ✅ Done | Registered and active |
| TypeScript build | ✅ Clean | All 4 errors fixed |
| Phone number in leads table | ✅ Done | Shows in portal leads pipeline |
| All 5 comparison pages | ✅ Linked | Footer Compare section on every page |
| Branch merged to main | ✅ Done | PR #1 merged 16 May 2026 |
| Cron jobs (6 jobs) | ⏳ Pending | Need separate service — Claude can build |
| Resend inbound routing | ⏳ Pending | Needs paid Resend plan |
| Stripe USD/GBP billing | ⏳ Pending | Post-launch — code done, needs credentials |
| Google Calendar OAuth | ⏳ Pending | Post-launch — code done, needs credentials |
| Vapi.ai Voice | ⏳ Pending | Post-launch — code done, needs account |
| WhatsApp Business API | ⏳ Pending | Post-launch — 3–7 day Meta approval |

---

## 2. WHAT JACQUES NEEDS TO DO

### Before Launch
| # | Task | Where |
|---|---|---|
| 1 | Upload new Vida image — drag `vida.png` into `apps/website/` | github.com/jacquesvieiraza-blip/KIND → apps/website → Add file |
| 2 | Create test client + run smoke test | app.get-kind.com — Monday |
| 3 | Register company — UK (Companies House) | companieshouse.gov.uk |
| 4 | G2, Capterra, Product Hunt listings | Launch day 31 May |

### Post-Launch — Priority Order
| # | Task | Where | Trigger |
|---|---|---|---|
| 5 | Upgrade Resend → enable inbound routing | resend.com | When first FIGSY campaigns launch |
| 6 | Stripe account + 4 price IDs | stripe.com | After 5 clients (Phase 2) |
| 7 | Vapi.ai account + phone number | vapi.ai + twilio.com | Month 2 |
| 8 | Meta WhatsApp Business API application | business.facebook.com | Month 2 (3–7 day approval) |
| 9 | Google Cloud — Calendar API + OAuth | console.cloud.google.com | Month 2–3 |
| 10 | SOC 2 Type II certification | External auditor | Q1 2027 (when enterprise deal demands it) |

### Company Registration — UK (Companies House)
1. Go to **companieshouse.gov.uk**
2. Click **"Register a company"** → WebFiling service
3. Create a Companies House account
4. Choose **Private Limited Company (Ltd)**
5. Check company name availability
6. Enter registered UK address (must be UK — can be your home address)
7. Add director details (name, DOB, address)
8. Add 1 share at £1 (sole shareholder)
9. Choose SIC code — **62012** (Business/domestic software development) or **73110** (Advertising agencies)
10. Pay **£50** registration fee
11. Receive **Certificate of Incorporation** — usually same day
12. You'll get a **Company Registration Number (CRN)**

**After registration:**
- Open business bank account (Monzo Business, Tide, or Starling — same day)
- Register for Corporation Tax on HMRC within 3 months of trading
- Register for VAT if revenue exceeds £90,000/year

**Total cost: £50 · Timeline: same day to 24 hours**

---

## 3. WHAT CLAUDE CAN DO

### Ready Now (just say go)
| Task | Time |
|---|---|
| Set up cron job service for Railway | 1 hour |
| Add CCPA section to trust.html and dpa.html | 30 mins |
| Add US/UK section to vs-apollo.html | 1 hour |
| Update hero copy: "Built in Africa. Ready for the world." | 5 mins |
| Add US/UK support note to trust.html + support.html | 10 mins |
| Create DPA-US addendum page | 1 hour |
| Add GBP pricing examples to pricing.html | 30 mins (after Stripe live) |
| Fix any bugs from smoke test | Ready |
| Any copy/content changes on website | Ready |
| New pages or features | Ready |
| Push code and trigger redeploys | Always |

---

## 4. MONDAY PLAN

1. Upload new Vida image to GitHub (`apps/website/vida.png`)
2. Create test client at `app.get-kind.com`
3. Run full smoke test (see §18)
4. Fix anything that breaks
5. Decision: Resend inbound routing upgrade?
6. Decision: Stripe setup now or later?

---

## 5. POST-LAUNCH ROADMAP — FULL DETAIL

### Immediate (Week 1–2 after launch)
| Item | Owner | Notes |
|---|---|---|
| Cron job service | Claude | 6 scheduled jobs — nurture, at-risk, trial-expiry, FIGSY send-due, 2x digests |
| Resend inbound routing | Jacques | Upgrade Resend plan → replies flow into FIGSY inbox |
| First 5 clients onboarded | Jacques | Smoke test with real users, fix any issues found |
| G2 / Capterra / Product Hunt | Jacques | Launch day listings |

### Month 1–2 (June 2026)
| Item | Owner | Notes |
|---|---|---|
| Voice agent activation | Jacques | Vapi.ai account + Twilio SA +27 number → add 4 env vars |
| WhatsApp activation | Jacques | Meta Business API approval (3–7 days) → add 3 env vars |
| Google Calendar activation | Jacques | Google Cloud OAuth → add 3 env vars |
| Stripe activation | Jacques | Account + 4 price IDs → USD/GBP billing live |
| FIGSY campaigns live | Jacques | First clients running email sequences |
| CCPA + US state laws | Claude | Add to trust.html + dpa.html — ready to go |
| vs-apollo.html US/UK section | Claude | Add section for non-African buyers |

### Month 3–6 (July–October 2026)
| Item | Owner | Notes |
|---|---|---|
| Milla (VA) official launch | Both | July 2026 — built and waiting |
| Vida (Chatbot) official launch | Both | July 2026 — built and waiting |
| pgvector upgrade for Milla | Claude | At 50+ clients — upgrade from FTS to pgvector + OpenAI embeddings |
| Vida widget CDN hosting | Claude | vida-widget.js on CDN for easier client embedding |
| Recurring subscription model | Both | Phase 2 billing model — credit bundles → monthly plans |
| US/UK Phase 2 marketing | Jacques | After 5 SA clients — activate Stripe, dual market positioning |
| Africa expansion marketing | Jacques | Nigeria, Kenya, Ghana, Egypt |
| DPA-US addendum page | Claude | For US enterprise clients (CCPA + US arbitration) |

### Month 6–12 (November 2026 – May 2027)
| Item | Owner | Notes |
|---|---|---|
| Pan-African launch | Jacques | Nigeria, Kenya, Ghana, Egypt — Apollo data works well |
| African language support | Claude | After Voice + WhatsApp live — Phase B |
| Multi-channel FIGSY | Both | Email + WhatsApp + Voice working together |
| ICP self-improvement | Claude | After 3+ months live data — "Luna equivalent" |
| Pipeline forecasting | Claude | AI predicts close probability per lead |
| SOC 2 Type II | Jacques | Q1 2027 — external auditor needed |
| Built-in CRM (Year 2) | Claude | Once HubSpot/Pipedrive integrations prove insufficient |
| White-label resale | Both | Agencies resell K.I.N.D under their brand |

---

## 6. WHAT'S BUILT

### Core Platform
| Item | Notes |
|---|---|
| Monorepo — portal, admin, API, DB, shared | Turborepo, TypeScript throughout |
| Supabase auth — signup, login, email confirm, onboarding | All bugs fixed |
| Full DB schema — 39 tables + RLS + 9 migrations | Complete |
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
| Phone number column in leads table | Shows Apollo phone data |
| Day 1 outreach for Lead Gen Pro | Claude writes personalised email per lead |

### FIGSY (Complete)
| Item | Notes |
|---|---|
| Campaign CRUD — create/activate/pause/archive | Full lifecycle |
| AI 3-step email sequences per lead | Humanised — no AI tells, first name sign-off |
| Domain warming cap | `FIGSY_DAILY_SEND_LIMIT` env var |
| send-due queue — step 2 + 3 auto-send | `next_send_at` stored |
| Reply classification — 5 categories | interested / not_interested / opt_out / out_of_office / other |
| AI reply suggestions | Claude drafts follow-up for interested replies |
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
| Paystack credit bundle checkout | One-time purchase, ZAR |
| Terms acceptance checkbox on billing | Required before purchase |
| Direct-pay path on onboarding | Trial vs pay now — two buttons |
| Zero-credits warning cron | Day 1/4/7 escalation emails |
| Onboarding checklist | 4-step tracker, disappears when complete |
| 14-day free trial | Countdown overlay, no card required |

### Milla — Virtual Assistant (Built · Launches July 2026)
| Item | Notes |
|---|---|
| DB migration 008 | milla_documents, milla_chunks (FTS), milla_sessions, milla_messages |
| `apps/api/src/lib/milla.ts` | chunkText, processDocument, searchChunks (FTS), chat (Claude Sonnet) |
| Portal assistant page | Documents tab + Chat tab with source attribution |
| Vector strategy | Supabase FTS now — upgrade to pgvector at 50+ clients |

### Vida — Chatbot Agent (Built · Launches July 2026)
| Item | Notes |
|---|---|
| DB migration 009 | vida_configs, vida_sessions, vida_messages |
| `apps/api/src/lib/vida.ts` | generateVidaReply, scoreSession, notifyHotLead (Claude Haiku) |
| Portal chatbot page | Configure tab, Conversations tab, Embed tab with copy code |
| `apps/website/vida-widget.js` | Self-contained embeddable JS widget, no dependencies |

### Stripe Billing (Built · Needs credentials)
| Item | Notes |
|---|---|
| Checkout session + webhook handler | Gated by STRIPE_SECRET_KEY |
| Portal billing page | USD/GBP section hidden until Stripe configured |
| Env vars needed | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, 4× STRIPE_PRICE_* IDs |

### Voice, WhatsApp & Calendar (Built · Needs credentials)
| Item | Notes |
|---|---|
| Voice Agent (Vapi.ai) | FIGSY places calls day 4. Add 4 VAPI env vars to activate |
| WhatsApp (Vida inbound) | Vida responds to WhatsApp messages. Add 3 vars to activate |
| Google Calendar | OAuth connect, free slot detection, booking. Add 3 vars to activate |

### Internal Founder Agents (9 tools)
| Agent | Endpoint | What it does |
|---|---|---|
| AE: at-risk alerts | `POST /internal/ae/at-risk` | Flags clients with no ICP/leads after 3 days |
| AE: check-in draft | `POST /internal/ae/checkin-draft` | Claude drafts personalised check-in |
| AE: trial expiry | `POST /internal/ae/trial-expiry` | Day 10/12/14 expiry emails |
| AE: trial nurture | `POST /internal/ae/nurture` | Day 1/3/5/7/10 onboarding emails |
| AE: zero-credits | `POST /internal/ae/zero-credits` | Day 1/4/7 warning emails |
| CRO: weekly digest | `POST /internal/cro/weekly-digest` | Claude writes + emails founder weekly summary |
| CRO: churn risk | `GET /internal/cro/churn-risk` | Risk score 0–100 per client |
| CMO: LinkedIn posts | `POST /internal/cmo/linkedin-posts` | Generates 3 branded posts |
| CMO: prospect finder | `POST /internal/cmo/prospect` | Apollo search with K.I.N.D's own ICP |

### Partner Programme
| Item | Notes |
|---|---|
| DB migration 005 | partners, partner_referrals, partner_commissions tables |
| API | Apply, validate referral code, admin list/approve/commission/dashboard |
| partners.html | 20% recurring commission for 12 months, application form |
| Client referral page | `/dashboard/referral` — informal referral for existing clients |

### Website (get-kind.com) — 16 pages
| Page | Notes |
|---|---|
| index.html | Homepage — team narrative, FIGSY, trust strip, anti-Alta pricing |
| about.html | Founder story, Meet the agents (FIGSY/Milla/Vida) |
| pricing.html | USD front, ZAR secondary, "See how we compare" link |
| trust.html | POPIA + GDPR + CAN-SPAM, data sovereignty, security |
| partners.html | Partner programme, 20% commission, application form |
| dpa.html | Data Processing Agreement — 10 sections, SA law + GDPR |
| use-cases.html | Industry use cases |
| support.html | Support contact page |
| terms.html | Terms of service |
| figsy-video.html | 12-scene animated FIGSY explainer |
| vs-apollo.html | K.I.N.D vs Apollo.io (13-row comparison) |
| vs-outreach.html | K.I.N.D vs Outreach.io (8-row comparison) |
| vs-salesloft.html | K.I.N.D vs Salesloft (8-row comparison) |
| vs-prospecting-manually.html | K.I.N.D vs manual prospecting |
| vs-hiring-an-sdr.html | K.I.N.D vs hiring an SDR |
| about.html | Founder story + agent characters |

All 5 comparison pages linked in footer Compare section on every page. ✅

### Admin Dashboard (admin.get-kind.com)
| Item | Notes |
|---|---|
| Client overview | Total clients, MRR, active/trialing/past-due |
| TTFL tracking | Time to first lead per client |
| Client health | Leads, engagement, churn risk 0–100 |
| CMO tools | LinkedIn post generator + prospect finder |
| Launch checklist | 10-section interactive checklist, 50+ items |
| Roadmap page | Internal product roadmap view |

---

## 7. BLOCKED FEATURES — ALL DETAILS

### Code complete — needs credentials only

| Feature | What to do | Env vars needed |
|---|---|---|
| **Stripe USD/GBP billing** | Create Stripe account + 4 price IDs | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_LEADGEN_20, STRIPE_PRICE_LEADGEN_100, STRIPE_PRICE_FIGSY_20, STRIPE_PRICE_FIGSY_100 |
| **Voice calls (Vapi.ai)** | Create Vapi account + Twilio +44 number | VAPI_API_KEY, VAPI_PHONE_NUMBER_ID, VAPI_ASSISTANT_ID, VAPI_WEBHOOK_SECRET |
| **WhatsApp outreach** | Apply for Meta Business API | WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN |
| **Google Calendar booking** | Create Google Cloud project + OAuth credentials | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI |

### Code complete — needs paid plan upgrade

| Feature | What to do |
|---|---|
| **Resend inbound routing** | Upgrade Resend to paid plan → configure webhook to `kindapi-production-83cb.up.railway.app/figsy/replies/inbound` |

### Code complete — waiting for scheduled launch

| Feature | Launch date |
|---|---|
| **Milla (Virtual Assistant)** | July 2026 |
| **Vida (Chatbot Agent)** | July 2026 |

### Pending setup — no code needed

| Feature | What to do |
|---|---|
| **Cron jobs (6 jobs)** | Claude will build a cron service config — then deploy on Railway |

---

## 8. WILL NOT BUILD YET

| Item | Why | Revisit when |
|---|---|---|
| LinkedIn automation | ToS risk, wrong channel | Never |
| 50+ data sources | Apollo covers the market | 50+ clients |
| SOC 2 Type II | Expensive, overkill pre-enterprise | Q1 2027 |
| ICP self-improvement (Luna) | Needs 3+ months live data | 6 months post-launch |
| Built-in CRM | HubSpot/Pipedrive covers it | Year 2 |
| African language support | Phase B — after Voice + WhatsApp | After WhatsApp live |
| pgvector for Milla | FTS works now | 50+ clients |
| Pipeline forecasting | Needs live data | Year 2 |
| Multi-year contracts | Anti-positioning | Never |

---

## 9. MARKET EXPANSION — US, UK & AFRICA

> **Trigger for US/UK Phase 2: after 5 paying clients**

### What's Already Built for US/UK

| Item | Status |
|---|---|
| USD pricing front and centre | ✅ Done |
| Stripe USD/GBP billing code | ✅ Built (needs credentials) |
| GDPR compliance (Articles 6, 17, 13/14) | ✅ Done — trust.html |
| CAN-SPAM compliance | ✅ Done — trust.html |
| DPA (10 sections, covers POPIA + GDPR) | ✅ Done — dpa.html |
| vs-outreach.html | ✅ Done |
| vs-salesloft.html | ✅ Done |
| Sub-processors listed with SOC 2 + SCCs | ✅ Done |
| Data sovereignty statement | ✅ Done |

### Critical Gaps — Fix Before US/UK Sales

| Gap | Impact | Fix | Owner |
|---|---|---|---|
| CCPA not mentioned anywhere | California buyers will flag it | Add to trust.html + dpa.html | Claude — ready now |
| US state privacy laws missing | VCDPA, CPA, CTDPA, UCPA | Add catch-all to DPA | Claude — ready now |
| vs-apollo.html frames K.I.N.D as Africa-only | US/UK users think it's not for them | Add US/UK section | Claude — ready now |
| GBP pricing not shown | UK buyers see no local pricing | Add after Stripe live | Claude — after Stripe |
| No US/UK support hours | US buyers assume no support | Add async note | Claude — ready now |
| SOC 2 not certified | US enterprise needs it | External auditor | Q1 2027 |
| DPA governing law is SA-only | US enterprise needs US clause | Create DPA-US addendum page | Claude — ready now |

### Phase 1 — Launch (now → client 5)
- Nothing changes
- Current site, current positioning
- Prove the model in home market

### Phase 2 — Dual Market (after client 5)
- Activate Stripe USD/GBP
- Add CCPA to trust + DPA pages
- Fix vs-apollo.html for US/UK buyers
- Add GBP pricing examples
- Add US/UK support note
- Update hero: "Built in Africa. Ready for the world."
- Positioning: "Started in Cape Town. Serving businesses in SA, the US, and the UK."

### Phase 3 — Data Residency & Legal
- af-south-1 stays as default (fine for most US/UK)
- If enterprise demands US data hosting: provision Supabase US region
- SOC 2 Type II → Q1 2027
- DPA-US addendum for US enterprise clients

### Pan-African Expansion (Year 1 — 2027)
- Nigeria, Kenya, Ghana, Egypt
- Apollo data covers all these markets
- POPIA + local data laws mapping needed per country
- Potential: African language support in Phase B

---

## 10. COMPLIANCE — FULL AUDIT

| Framework | Status | Where |
|---|---|---|
| **POPIA** (South Africa) | ✅ Complete | Consent flow, opt-out blocklist, data sovereignty, DPA |
| **GDPR** (EU/UK) | ✅ Complete | trust.html — Articles 6(1)(f), 17, 13/14. DPA covers SCCs |
| **CAN-SPAM** (US) | ✅ Complete | trust.html — sender ID, opt-out, honest subjects |
| **DPA** published | ✅ Complete | dpa.html — 10 sections, governing law SA + GDPR acknowledgement |
| **CCPA** (California) | ❌ Missing | Add to trust.html + dpa.html — Claude can do now |
| **US state laws** (VCDPA, CPA, etc.) | ❌ Missing | Add catch-all clause to DPA |
| **SOC 2 Type II** | ❌ Deferred | Q1 2027 |
| **DPA-US addendum** | ❌ Pending | Create post Phase 2 — for US enterprise |

### Sub-processors (published in dpa.html)
| Provider | Location | Certification |
|---|---|---|
| Supabase | Cape Town af-south-1 | SOC 2 Type II |
| Resend | US (email delivery) | SOC 2 Type II + SCCs |
| Apollo | US (lead data) | DPA + SCCs |
| Anthropic | US (AI) | No data retained per API terms + SCCs |
| Paystack | Nigeria/UK (payments) | PCI DSS |

---

## 11. AGENT NAMING

| Agent | Named after | Role | Status |
|---|---|---|---|
| **FIGSY** | The founder | AI SDR — outbound email, follow-up, meeting booking | Live |
| **Milla** | Founder's daughter | Virtual Assistant — trained on your business, answers questions, drafts proposals | July 2026 |
| **Vida** | Founder's daughter | Chatbot Agent — website + WhatsApp inbound qualifier | July 2026 |

Character images: FIGSY (`ai-agent.jpg`), Milla (`milla.png`), Vida (`vida.png`) — all on `about.html`.
New Vida image to be uploaded Monday.

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

**Rules:**
- 1 credit consumed when a prospect sends a positive reply (interested/wants to chat)
- No credit consumed for no-reply or negative reply
- No refunds on spent credits
- Cancel anytime — no contracts, no quarterly lock-in
- ZAR billing via Paystack
- USD/GBP billing via Stripe (Phase 2 — after 5 clients)
- Volume discounts from 500+ leads/month
- Yearly discount: 20% off flat-rate products

**Phase 2 billing evolution:** Credit bundles → recurring monthly subscription model once the value is proven.

**Anti-Alta positioning:**
Alta AI SDR = from $1,250/mo, USD only, quarterly locked-in, no trial, no refunds.
K.I.N.D = from $20, ZAR/USD/GBP billing, no contracts, full free trial, cancel anytime.

---

## 13. REVENUE TARGETS & KPIs

### Month-by-Month MRR Targets

| Month | Target MRR (USD) | New Clients | Cumulative |
|---|---|---|---|
| May 2026 (launch) | $500 | 5 | 5 |
| Jun 2026 | $2,000 | 10 | 15 |
| Jul 2026 | $5,000 | 15 | 30 |
| Aug 2026 | $9,000 | 15 | 45 |
| Sep 2026 | $13,000 | 15 | 60 |
| Oct 2026 | $18,000 | 15 | 75 |
| Nov 2026 | $22,000 | 15 | 90 |
| Dec 2026 | $26,000 | 10 | 100 |

**Year 1 target: $26,000 MRR / 100 active clients by Dec 2026**

### Core KPIs (check every Monday)

| KPI | Target | Red Flag |
|---|---|---|
| TTFL (Time to First Lead) | < 2 hours | > 4 hours |
| Trial → Paid conversion | > 40% | < 25% |
| Month 1 churn | < 5% | > 10% |
| FIGSY reply rate | > 8% | < 3% |
| FIGSY interested rate | > 2% | < 0.5% |
| ICP built within 24h of signup | > 80% | < 60% |
| At-risk clients (no ICP after 3 days) | 0 | > 2 |

### Weekly Founder Checklist (every Monday)
1. New signups last 7 days
2. Trial → paid conversions last 7 days
3. At-risk clients (no ICP, no leads)
4. MRR vs monthly target
5. FIGSY reply rate + interested % across all campaigns
6. TTFL — any client > 4 hours flagged

---

## 14. CASHFLOW MODEL

### Fixed Monthly Tech Costs

| Service | Plan | Cost/mo |
|---|---|---|
| Supabase | Pro (af-south-1 required) | $25 |
| Vercel | Pro | $20 |
| Railway | Usage-based | $10–20 |
| Apollo.io | Professional (24,000 credits/mo) | $99 |
| Resend | Free → Pro at scale | $0–20 |
| Domain | Annual | ~$1 |
| **Total floor** | | **$155–185/mo** |

**Variable costs per lead:** ~$0.009 (sub-cent at any volume)

### Scenario A — Conservative ($150/mo avg)
| Clients | MRR | Net profit | Margin |
|---|---|---|---|
| 2 | $300 | $122 | 41% |
| 5 | $750 | $553 | 74% |
| 10 | $1,500 | $1,271 | 85% |
| 100 | $15,000 | $14,105 | 94% |

**Break-even: 2 clients.**

### Scenario B — Base Case ($220/mo blended)
| Clients | MRR | Net profit | Margin |
|---|---|---|---|
| 1 | $220 | $46 | 21% |
| 5 | $1,100 | $888 | 81% |
| 50 | $11,000 | $10,316 | 94% |
| 100 | $22,000 | $20,802 | 95% |

**Break-even: 1 client.**

---

## 15. CLIENT FLOW — ALL PATHS

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
5. AE customises order form in admin portal
6. Client signs, pays

### Path 3 — Pay on day 1 (skip trial)
1–4. Identical to Path 1
5. Client signs → pays immediately → active from day 1

### Path 4 — Trial expired, never paid
1. Overlay fires on day 14
2. "Sign Service Agreement" + "View Plans" buttons
3. Client signs → pays → active
4. If abandons: subscription stays `trialing (expired)` — no charge ever

### Path 5 — FIGSY upgrade
1. Client on Lead Gen → wants FIGSY
2. Billing → FIGSY bundle → Paystack
3. Old Lead Gen subscription cancelled manually by admin

---

## 16. OPERATIONS SOP

### Phase 1: Qualification
- [ ] B2B company (sells to other businesses)
- [ ] Has a sales function (even informal)
- [ ] Use case maps to at least one K.I.N.D product
- **Disqualify if:** B2C only, under 6 months old with no revenue, requires custom dev

### Phase 2: Discovery Call (30–45 min)
1. How do you currently find and qualify new clients?
2. Where does your pipeline break down most?
3. Have you tried outbound before? What happened?
4. What markets and job titles are you trying to reach?
5. What's your budget for sales infrastructure this year?

### Phase 3: Proposal (within 24h)
Include: executive summary, recommended products, pricing, timeline, next steps.

### Phase 4: Order Form → Signature
Admin portal → Clients → [Client] → Send Order Form → client signs in Documents tab.

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

### POPIA/GDPR Compliance — Non-Negotiable
| Source | Can Contact? |
|---|---|
| Apollo (consented = true) | Yes — immediately |
| Apollo (consented = false) | Only after KIND consent confirmed |
| On opt-out blocklist | Never — even if re-appearing in Apollo |

---

## 17. TECH STACK & INFRASTRUCTURE

| Layer | Technology | Notes |
|---|---|---|
| Portal (client-facing) | Next.js 14, TypeScript, Tailwind | `apps/portal` — Vercel (kind-portal) |
| Admin (internal) | Next.js 14, TypeScript, Tailwind | `apps/admin` — Vercel (kind-admin-h5q6) |
| API | Express, TypeScript | `apps/api` — Railway |
| Database | Supabase (PostgreSQL, af-south-1 Cape Town) | RLS on all tables |
| Auth | Supabase Auth | Email + password |
| AI | Anthropic Claude (Haiku + Sonnet) | Haiku for volume, Sonnet for quality |
| Lead data | Apollo.io API | Pre-consented contacts first |
| Email sending | Resend | `hello@get-kind.com` |
| Payments | Paystack (ZAR) + Stripe (USD/GBP — Phase 2) | Credit bundles |
| Website | Static HTML | `apps/website` — Vercel (kind-admin) |

### Vercel Projects
| Project | Root Dir | Domain |
|---|---|---|
| kind-admin | `apps/website` | `get-kind.com` |
| kind-admin-h5q6 | `apps/admin` | `admin.get-kind.com` |
| kind-portal | `apps/portal` | `app.get-kind.com` |

### Railway Env Vars (all set ✅)
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
APOLLO_API_KEY
RESEND_API_KEY
PAYSTACK_SECRET_KEY
PAYSTACK_WEBHOOK_SECRET
ADMIN_SECRET_KEY
FOUNDER_EMAIL
FIGSY_REPLY_TO=replies@get-kind.com
FIGSY_DAILY_SEND_LIMIT=20
PORTAL_URL=https://app.get-kind.com
DATABASE_URL
```

### Railway Env Vars (add when ready)
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_LEADGEN_20=
STRIPE_PRICE_LEADGEN_100=
STRIPE_PRICE_FIGSY_20=
STRIPE_PRICE_FIGSY_100=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://kindapi-production-83cb.up.railway.app/calendar/callback
VAPI_API_KEY=
VAPI_PHONE_NUMBER_ID=
VAPI_ASSISTANT_ID=
VAPI_WEBHOOK_SECRET=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
```

### Cron Jobs (6 jobs — pending setup)
| Schedule | Endpoint | Purpose |
|---|---|---|
| `0 8 * * *` | `POST /internal/ae/nurture` | Trial nurture emails (Days 1/3/5/7/10) |
| `0 8 * * *` | `POST /internal/ae/at-risk` | At-risk client alerts |
| `0 8 * * *` | `POST /internal/ae/trial-expiry` | Trial expiry emails (Days 10/12/14) |
| `0 8 * * *` | `POST /figsy/send-due` | FIGSY step 2 + 3 auto-send |
| `0 7 * * 1` | `POST /internal/digest/weekly` | Monday leads digest to clients |
| `0 7 * * 1` | `POST /internal/cro/weekly-digest` | Weekly founder digest |

All require header: `x-admin-key: {ADMIN_SECRET_KEY}`

---

## 18. SMOKE TEST CHECKLIST

Run Monday with test client.

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

## 19. PRODUCT VISION — 1, 3, 5 YEARS

### Year 1 (by May 2027) — $40,000 MRR
- 150+ paying clients (SA, UK, US, Nigeria, Kenya)
- Lead Gen + FIGSY proven and reliable
- Milla (VA) live for 30+ clients
- Vida (Chatbot) live for 20+ clients
- FIGSY Phase 2: Calendar + Voice + WhatsApp all active
- ICP self-improvement live (3+ months data)
- K.I.N.D's own outbound running entirely on FIGSY

### Year 2 (2027) — $120,000 MRR / 450 clients
- Built-in CRM — clients stop needing HubSpot
- Multi-channel FIGSY — email + WhatsApp + Voice
- Pan-African launch: Nigeria, Kenya, Ghana, Egypt fully active
- Pipeline forecasting — AI predicts close probability
- Recurring subscription model primary (credit bundles secondary)
- White-label offering for agencies

### Year 3 (2028) — $300,000 MRR / 1,000 clients
- Proprietary dataset across thousands of B2B companies
- Predictive ICP — K.I.N.D tells you who to target before you ask
- African language support (Afrikaans, Zulu, Swahili, Yoruba)
- SOC 2 Type II certified

### Year 5 (2030) — Market Leader
- 5,000+ clients, 10+ countries
- Dominant B2B revenue OS across Africa
- IPO-ready on JSE or acquisition at $100M+ valuation

---

## 20. ALTA AI SDR — COMPETITIVE AUDIT

### What Alta has
- Three named agents: Katie (SDR), Alex (voice), Luna (RevOps intelligence)
- Email + LinkedIn + SMS + voice. 50+ data sources. Self-improving.
- SOC 2 Type II, ISO 27001, GDPR, CCPA. ~$18M raised.
- G2 High Performer 4.9/5. Salesforce AppExchange.
- $1,250/mo minimum. USD only. Quarterly lock-in.

### Their gaps (our weapons)
- Zero Africa presence
- US data centres (POPIA risk)
- USD-only, quarterly billing, non-refundable, no trial
- No POPIA/NDPR compliance
- No WhatsApp-native strategy
- No African language support
- 3-business-day support response time
- No ZAR billing
- No free trial

### What we've done from this audit
| # | Item | Status |
|---|---|---|
| 1 | Team narrative on website | ✅ Done |
| 2 | FIGSY/Milla/Vida named agents with backstory | ✅ Done |
| 3 | POPIA + GDPR + CAN-SPAM on homepage + trust page | ✅ Done |
| 4 | Speed claim ("first leads in 10 min") | ✅ Done |
| 5 | Anti-Alta pricing strip | ✅ Done |
| 6 | trust.html | ✅ Done |
| 7 | partners.html + backend | ✅ Done |
| 8 | 5 comparison pages | ✅ Done |
| 9 | DPA template (dpa.html) | ✅ Done |
| 10 | G2/Capterra/Product Hunt | Launch day |
| 11 | Voice agent (FIGSY calls) | Month 2 — blocked on Vapi |
| 12 | WhatsApp channel | Month 2 — blocked on Meta |
| 13 | African language support | Phase B |
| 14 | SOC 2 Type II | Q1 2027 |
| 15 | ICP self-improvement (Luna equivalent) | 6 months post-launch |

---

## 21. KEY DECISIONS LOCKED

| Decision | Outcome |
|---|---|
| Core metric | TTFL — target < 2 hours from signup |
| Billing model | Credit bundles now. Recurring subscriptions Phase 2. |
| Agent naming | FIGSY (founder) · Milla (daughter) · Vida (daughter) |
| Market expansion trigger | After 5 paying clients |
| Compliance | POPIA + GDPR + CAN-SPAM — all three. CCPA to add for US. |
| FIGSY launch | After Lead Gen smoke test passes |
| Milla + Vida launch | July 2026 |
| Payment processor | Paystack (ZAR) → add Stripe (USD/GBP) at Phase 2 |
| AI provider | Anthropic Claude — Haiku for volume, Sonnet for quality |
| Data source | Apollo.io — pre-consented contacts first |
| Hosting | Supabase af-south-1 + Railway + Vercel |
| LinkedIn automation | Will not build — ToS risk, wrong channel |
| SOC 2 | Q1 2027 — not before first enterprise deal |
| Business registration | UK — Companies House |
| Vector DB (Milla/Vida) | Supabase FTS now → pgvector at 50+ clients |
| CRM | HubSpot + Pipedrive push only. Built-in CRM Year 2. |
| Multi-year contracts | Will not offer — "cancel anytime" is core positioning |

---

*Owner: K.I.N.D founding team*
*Last updated: 16 May 2026*
*Branch: main*
