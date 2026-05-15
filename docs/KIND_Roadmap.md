# KIND AI Platform — Master Roadmap
**Launch date: 31 May 2026 · Last updated: 15 May 2026 · Days remaining: 16**

> Single source of truth for everything — what's built, what's not, who builds what, targets, KPIs, and vision.
>
> **Goal 1 — Lead Gen live 31 May 2026**
> **Goal 2 — FIGSY launch June 2026**
> **Goal 3 — VA + Chatbot July 2026**
> **Goal 4 — K.I.N.D runs on K.I.N.D (internal agents)**
> **Goal 5 — African market expansion 2027+**

---

## FULL STATUS AUDIT — 15 May 2026

### ✅ BUILT (code complete, on branch `claude/ai-business-roadmap-U3OWJ`)

#### Core Platform
| What | Notes |
|------|-------|
| Monorepo — portal, admin, API, DB, shared | Turborepo, TypeScript throughout |
| Supabase auth — signup, login, email confirm, onboarding | All 3 bugs fixed (invalid token, company_name, empty URL) |
| Full DB schema — 13 tables + RLS policies | leads, clients, icps, subscriptions, credits, order_forms, figsy_* (4 tables), opt_out_blocklist, paystack_events |
| CSV export with correct auth | Fetch + blob, no window.open |
| Admin dashboard — MRR, TTFL, client health, churn risk | TTFL computed from leads data, not DB column |

#### Lead Gen (100% complete)
| What | Notes |
|------|-------|
| AI ICP pre-fill from website | Claude scrapes site → suggests fields, client confirms in 60s |
| Apollo search auto-fires on ICP save | No manual "Run" button |
| Pre-consented leads delivered first | `apollo_only_consented: true` → same-hour delivery |
| Lead scoring — Claude haiku 0–100 per lead | Score + written reasoning stored per lead |
| POPIA consent email | Sends from Resend, `consent_sent_at` tracked |
| POPIA consent callback page (`/consent`) | Public page — lead clicks email link, NOT a 404 anymore |
| Lead filtering, opt-out blocklist, AI email draft | Full pipeline management |
| Usage counter per client per billing period | Feeds billing + overage tracking |
| CRM integration — HubSpot + Pipedrive | Push on `consent_given`, settings UI, test connection |
| First leads email — top 5 leads inline | Scores, pipeline value, auto-sent on first batch |
| Weekly Monday leads digest | Top 10 leads + stats, sent via cron |

#### FIGSY Phase 1 (100% complete)
| What | Notes |
|------|-------|
| Campaign CRUD — create, activate, pause, archive | Full lifecycle |
| AI 3-step email sequences per lead | Claude haiku writes personalised initial + 2 follow-ups |
| `reply_to` header on all FIGSY emails | Set to `FIGSY_REPLY_TO` env var (falls back to hello@get-kind.com) |
| Step 2 + Step 3 send-due queue | `next_send_at` stored; `POST /figsy/send-due` processes due emails |
| Reply classification | interested / not_interested / opt_out / out_of_office / other |
| Opt-out auto-suppression | Shared blocklist with Lead Gen |
| Campaign dashboard — sent, replied, reply rate, interested % | Live stats |
| Auto-enroll consented leads (S5) | No manual activation — fires when consented lead arrives |
| Subscription gate | Can't activate campaign without FIGSY plan |
| CRM deal push on "interested" reply (F2-2) | Creates Deal in HubSpot or Pipedrive |
| POPIA consent gate removed | All scored leads enrolled automatically — no manual consent step needed |
| Day 1 outreach batch (`sendDay1OutreachBatch`) | Lead Gen Pro: Claude-generated personalised Day 1 email sent automatically |
| FIGSY email generation humanised | SA voice, specific observations, no AI tells, SA first name sign-off |
| Domain warming cap | `FIGSY_DAILY_SEND_LIMIT` env var — limits daily sends to protect domain reputation |
| Unified reply inbox | Portal page + `GET /figsy/replies/all` API endpoint — all replies across campaigns |
| F2-3: AI reply suggestions | `POST /figsy/replies/:id/suggest` — Claude drafts follow-up for interested replies; portal UI with editable textarea + copy button |

#### Billing & Onboarding
| What | Notes |
|------|-------|
| Paystack credit bundle checkout | One-time purchase: 20/40/100 credits |
| Terms acceptance checkbox on billing | Must tick before purchase enabled |
| Documents page | Shows acceptance record tied to subscription date — NO manual signing |
| Onboarding banner | Trial days left + subscribe CTA only |
| Direct-pay path on onboarding | Two-button flow: "Start free trial" vs "Pay now" — no friction for buyers ready to purchase |
| Zero-credits warning emails | Day 1/4/7 escalation cron endpoint (`POST /internal/ae/zero-credits`) |

#### Email Sequences (all sent via Resend from `hello@get-kind.com`)
| Sequence | Trigger | Goes to |
|----------|---------|---------|
| Welcome | Signup | Client |
| First leads ready (top 5 inline) | First ICP run | Client |
| Weekly Monday digest | Cron — every Monday | Client |
| Trial nurture day 1/3/5/7/10 | Cron — daily | Client (trial only) |
| Trial expiry day 10/12/14 | Cron — daily | Client (trialing) |
| POPIA consent request | Manual "Send consent" button | Lead |
| FIGSY step 1/2/3 outreach | Auto-enroll / send-due cron | Lead |
| At-risk client alert | Cron — daily | **You** (`FOUNDER_EMAIL`) |
| Check-in draft | Manual API call | **You** (`FOUNDER_EMAIL`) |
| Weekly founder digest (CRO) | Cron — every Monday | **You** (`FOUNDER_EMAIL`) |
| CMO prospect list | Manual API call | **You** (`FOUNDER_EMAIL`) |

> **FOUNDER_EMAIL must be set in Railway.** All internal agent emails go there. If it is not set, those emails go nowhere.

#### Internal Agents (Goal 4 — all built)
| Agent | Endpoint | What it does |
|-------|----------|-------------|
| AE: at-risk alerts | `POST /internal/ae/at-risk` | Flags clients with no ICP or no leads after 3 days |
| AE: check-in draft | `POST /internal/ae/checkin-draft` | Claude drafts personalised check-in email |
| AE: trial expiry | `POST /internal/ae/trial-expiry` | Sends day 10/12/14 expiry emails |
| AE: trial nurture | `POST /internal/ae/nurture` | Sends day 1/3/5/7/10 contextual onboarding emails |
| CRO: dashboard | `GET /internal/cro/dashboard` | MRR, churn, TTFL, trial counts |
| CRO: weekly digest | `POST /internal/cro/weekly-digest` | Claude writes + emails founder weekly summary |
| CRO: churn risk | `GET /internal/cro/churn-risk` | Risk score 0–100 per client |
| CMO: brand voice | `GET/POST /internal/cmo/brand-voice` | K.I.N.D's own ICP, tone, pillars |
| CMO: LinkedIn posts | `POST /internal/cmo/linkedin-posts` | Claude generates 3 branded posts |
| CMO: prospect finder | `POST /internal/cmo/prospect` | Apollo search with KIND's own ICP → emails you |

#### Website
| What | Notes |
|------|-------|
| Homepage — hero, AI agent, FIGSY scroll scene, video, stats | Redesigned |
| About, pricing, support, use-cases | White rebrand |
| YouTube demo video | Updated to Y4mI7s5H99s |
| Homepage: team narrative, FIGSY character, POPIA trust strip, speed claim, anti-Alta pricing strip | Full content refresh |
| trust.html — Trust & Security page | POPIA, data handling, security practices |
| partners.html — Partner Programme page | Static partner programme page |
| dpa.html — Data Processing Agreement page | POPIA-compliant DPA for clients |
| vs-hiring-an-sdr.html, vs-prospecting-manually.html, vs-apollo.html | Competitive comparison pages |
| FIGSY animated video (12-scene HTML) + character image | FIGSY explainer — HTML animation + character asset |
| Nav links: Trust & Security + Partners | Added across all pages |

#### Portal
| What | Notes |
|------|-------|
| FIGSY upgrade wall | Upsell page for non-FIGSY subscribers — shows feature list and upgrade CTA |
| Onboarding checklist | 4-step progress tracker on dashboard home |
| Support widget | Integrated into dashboard layout — AI-powered Ask K.I.N.D chat bubble |

#### Admin
| What | Notes |
|------|-------|
| CMO Tools page (`/cmo`) | LinkedIn post generator (3 branded posts via Claude) + prospect finder (Apollo search) — live results in UI |

---

### ⏳ WHAT YOU NEED TO DO (manual — no code)

#### Before smoke test (blocks everything):

| # | Task | Where | Why it matters |
|---|------|-------|----------------|
| **C1** | Set Supabase Site URL → `https://app.get-kind.com` | Supabase → Auth → URL Configuration | Auth emails and callbacks will fail without this |
| **C2** | Add `https://app.get-kind.com/auth/callback` to Redirect URLs | Same place | Login redirect breaks without this |
| **C3** | Add `FOUNDER_EMAIL=your@email.com` to Railway env vars | Railway → Variables | ALL internal agent emails go here. Not set = emails go nowhere |
| **C4** | Confirm all Railway env vars exist (list below) | Railway → Variables | API crashes on missing keys |
| **C5** | Set Paystack webhook → `https://kindapi-production.up.railway.app/webhooks/paystack` | Paystack → Settings → Webhooks | Payments won't confirm |

> **Note on Paystack plans:** The current billing model is **credit bundles** (one-time purchase, not recurring subscriptions). Clients buy 20/40/100 credits. You do NOT need to create the 8 subscription plans right now. The credit bundle system is already wired. Subscription plans can be added later for enterprise/volume clients.

#### After smoke test passes:

| # | Task | Where |
|---|------|-------|
| **C6** | Run DB migrations 002, 003, 004 in Supabase SQL editor (in order) | Supabase → SQL Editor |
| **C7** | Set up FIGSY inbound email in Resend dashboard (see FIGSY section below) | resend.com → Inbound |
| **C8** | Add Railway cron jobs (see cron table below) | Railway → Cron |
| **C9** | Merge branch `claude/ai-business-roadmap-U3OWJ` → `main` | GitHub |

#### Railway env vars to confirm:
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
APOLLO_API_KEY
RESEND_API_KEY
PAYSTACK_SECRET_KEY
PAYSTACK_WEBHOOK_SECRET
ADMIN_SECRET_KEY
FOUNDER_EMAIL=your@email.com          ← ADD THIS
FIGSY_REPLY_TO=hello@get-kind.com     ← ADD THIS (update when inbound email set up)
PORTAL_URL=https://app.get-kind.com
```

#### Railway cron jobs (set up after merge):
| Cron schedule | Endpoint | Purpose |
|---------------|----------|---------|
| `0 8 * * *` (daily 8am) | `POST /internal/ae/nurture` | Trial nurture emails |
| `0 8 * * *` (daily 8am) | `POST /internal/ae/at-risk` | At-risk client alerts |
| `0 8 * * *` (daily 8am) | `POST /internal/ae/trial-expiry` | Trial expiry emails |
| `0 8 * * *` (daily 8am) | `POST /figsy/send-due` | FIGSY step 2 + 3 emails |
| `0 7 * * 1` (Monday 7am) | `POST /internal/digest/weekly` | Weekly leads digest to clients |
| `0 7 * * 1` (Monday 7am) | `POST /internal/cro/weekly-digest` | Weekly founder digest to you |

All cron endpoints need header: `x-admin-key: {your ADMIN_SECRET_KEY}`

#### FIGSY inbound email setup (required for reply detection to work):
1. Go to resend.com → Inbound
2. Add `hello@get-kind.com` as an inbound address (or create `replies@get-kind.com`)
3. Set webhook URL to: `https://kindapi-production.up.railway.app/figsy/replies/inbound`
4. Update Railway env var `FIGSY_REPLY_TO` to match the address you chose
5. **Without this, FIGSY can send emails but can never detect replies**

---

### 🔨 WHAT I CAN BUILD (no dependencies on you)

| Item | What | Priority |
|------|------|----------|
| Lead bulk consent send | Select multiple leads → send consent emails to all in one click | Medium |
| Client-facing KPI dashboard | Clients see their own pipeline metrics, reply rates, meetings booked | Medium |
| Lead bulk actions | Archive, re-score, or export selected leads in bulk | Medium |
| FIGSY campaign cloning | Duplicate a campaign with all settings pre-filled | Low |
| Admin: CMO theme input | Allow specifying a theme / product update when generating LinkedIn posts | Low |
| Referral program | Client refers another → both get free credits | Low |

---

### ❌ BLOCKED (needs external credentials from you)

| Item | Blocked by | What it enables |
|------|-----------|-----------------|
| F2-1: Google Calendar integration | Google OAuth credentials | FIGSY books meetings directly into CLIENT's Google Calendar. Lead says "interested" → FIGSY sends booking link. NOT your calendar — the client connects theirs. |
| F2-4: LinkedIn outreach | LinkedIn API access | FIGSY sends via LinkedIn DM as well as email |
| F2-4: WhatsApp outreach | Twilio or WhatsApp Business API | FIGSY sends via WhatsApp |
| VA + Chatbot | Confirm: Supabase pgvector or Pinecone for vector search | Determines which DB approach to use for knowledge base |
| L5: Overage billing | Need credit system settled first | Charge when usage exceeds plan limit |

---

### 📋 SMOKE TEST — 9 steps (do after C1–C5 done)

| Step | Action | Pass condition |
|------|--------|---------------|
| 1 | Sign up at `app.get-kind.com` | Confirmation email arrives in your inbox |
| 2 | Click confirm link, land on portal | Dashboard loads, trial banner shows |
| 3 | Complete business profile | Saves with no "Invalid token" error |
| 4 | Build ICP, click Save | Lead search fires automatically (no Run button) |
| 5 | Check leads pipeline | Leads appear within 2 hours, all with scores |
| 6 | Send POPIA consent to one lead | Email arrives in lead's inbox, status updates to `consent_sent` |
| 7 | Export leads as CSV | File downloads correctly |
| 8 | Go to Billing, tick terms, buy 20 credits | Paystack checkout opens, returns, credits show |
| 9 | Check admin dashboard at admin.get-kind.com | Client visible, TTFL showing, leads count correct |

---

## FIGSY — COMPLETE STATUS

### What Google Calendar (F2-1) is for:
When a lead replies "interested" to a FIGSY email, FIGSY needs to book a meeting. F2-1 lets the **client** connect their Google Calendar to K.I.N.D. Then when a lead is interested, FIGSY automatically sends them a booking link (like Calendly but built-in). **This is for your clients' calendars, not yours.**

### FIGSY Phase 1 — All built ✅
### FIGSY Phase 2 — Status:

| # | Task | Status | Notes |
|---|------|--------|-------|
| F2-1 | Google Calendar integration | ❌ Needs credentials | Client connects their Google Calendar → FIGSY books meetings |
| F2-2 | CRM deal push on interested reply | ✅ Done | HubSpot + Pipedrive deal created automatically |
| F2-3 | AI reply suggestion drafts | ✅ Done | `POST /figsy/replies/:id/suggest` + portal UI with editable textarea + copy |
| F2-4 | LinkedIn + WhatsApp channels | ❌ Needs APIs | Multi-channel outreach |
| F2-5 | FIGSY explainer video | ⏳ Marketing task | Not code |

---

## BILLING MODEL — CLARITY

**Current model: Credit bundles (one-time purchases)**

Clients buy credits. 1 credit = 1 lead reply via FIGSY. No recurring subscription.

| Product | Credits | Price USD | Price ZAR |
|---------|---------|-----------|-----------|
| K.I.N.D AI (Lead Gen) | 20 | $20 | R380 |
| K.I.N.D AI (Lead Gen) | 40 | $40 | R760 |
| K.I.N.D AI (Lead Gen) | 75 | $75 | R1,425 |
| K.I.N.D AI (Lead Gen) | 100 | $100 | R1,900 |
| K.I.N.D AI (Lead Gen) | 200 | $180 | R3,420 |
| K.I.N.D AI (Lead Gen) | 500 | $400 | R7,600 |
| FIGSY (outreach bundle) | 20 | $60 | R1,140 |
| FIGSY (outreach bundle) | 40 | $120 | R2,280 |
| FIGSY (outreach bundle) | 75 | $200 | R3,800 |
| FIGSY (outreach bundle) | 100 | $300 | R5,700 |
| FIGSY (outreach bundle) | 200 | $500 | R9,500 |
| FIGSY (outreach bundle) | 500 | $1,100 | R20,900 |

> The 8 Paystack subscription plans listed in previous versions are NOT needed for the credit bundle model. Ignore them for now. Add recurring subscriptions later once you have 10+ clients and want to offer monthly minimums.

---

## AI / LLM STRATEGY

| Task | Current Model | Rationale | Alternative to Consider |
|------|--------------|-----------|------------------------|
| Lead scoring | Claude Haiku 4.5 | Fast, cheap, 100s of leads | Keep Haiku — cost-efficient |
| FIGSY sequence generation | Claude Haiku 4.5 | Personalised but formulaic | Keep Haiku |
| Reply classification | Claude Haiku 4.5 | Simple classification | Keep Haiku — overkill to use Sonnet |
| ICP pre-fill from website | Claude Sonnet 4.6 | Needs reasoning + web context | Keep Sonnet |
| Check-in email drafts | Claude Haiku 4.5 | Short copy | Keep Haiku |
| CRO/founder digest | Claude Haiku 4.5 | Structured narrative | Consider Sonnet for better quality |
| LinkedIn post generation | Claude Haiku 4.5 | Creative copy | Consider Sonnet for higher quality |
| Ask K.I.N.D support widget | Claude Haiku 4.5 | FAQ answering | Keep Haiku — fast + cheap for support |
| VA product (future) | Claude Sonnet 4.6 | Complex multi-turn reasoning | Sonnet or Opus for enterprise |

**Cost guidance:** Haiku ≈ 25x cheaper than Sonnet. Use Haiku for anything formulaic or high-volume. Use Sonnet for anything requiring nuanced reasoning or that clients interact with directly.

**Future options to explore:**
- **Prompt caching** on Anthropic API — cache system prompts for scoring/classification to cut costs 60–80%
- **Batch API** for overnight lead scoring runs — 50% cheaper, 24h turnaround acceptable for non-urgent scoring
- **Open-source models** (Llama 3, Mistral) via Together AI for very high-volume cheap tasks — worth benchmarking at 500+ clients

---

## REVENUE TARGETS & KPIs

### Month-by-Month MRR Targets (Year 1)

| Month | Target MRR (USD) | Target MRR (ZAR) | New Clients | Cumulative Clients |
|-------|-----------------|-----------------|-------------|-------------------|
| May 2026 (launch) | $500 | R9,500 | 5 | 5 |
| Jun 2026 | $2,000 | R38,000 | 10 | 15 |
| Jul 2026 | $5,000 | R95,000 | 15 | 30 |
| Aug 2026 | $9,000 | R171,000 | 15 | 45 |
| Sep 2026 | $13,000 | R247,000 | 15 | 60 |
| Oct 2026 | $18,000 | R342,000 | 15 | 75 |
| Nov 2026 | $22,000 | R418,000 | 15 | 90 |
| Dec 2026 | $26,000 | R494,000 | 10 | 100 |

**Year 1 target: $26,000 MRR / 100 active clients by Dec 2026**

### Year 2–3 Targets

| Period | MRR Target | Clients | Key Milestone |
|--------|-----------|---------|---------------|
| Q1 2027 | $40,000 | 150 | FIGSY Phase 2 live (calendar + multi-channel) |
| Q2 2027 | $60,000 | 220 | VA + Chatbot fully adopted |
| Q3 2027 | $85,000 | 310 | First Nigerian/Kenyan clients |
| Q4 2027 | $120,000 | 450 | Series A readiness |
| End 2028 | $300,000 | 1,000 | Pan-African expansion underway |
| End 2029 | $700,000 | 2,500 | Market leader — SA + 3 other markets |

### Core KPIs (track weekly)

| KPI | Target | Red Flag |
|-----|--------|---------|
| TTFL (Time to First Lead) | < 2 hours | > 4 hours |
| Trial → Paid conversion | > 40% | < 25% |
| Month 1 churn | < 5% | > 10% |
| Leads per client per month | 100+ | < 50 |
| FIGSY reply rate | > 8% | < 3% |
| FIGSY interested rate | > 2% | < 0.5% |
| NPS (when we add it) | > 50 | < 30 |
| Credits consumed per client | > 50/mo | < 20/mo (churn signal) |
| ICP built within 24h of signup | > 80% | < 60% |
| At-risk clients (no ICP after 3 days) | 0 | > 2 |

### Weekly Founder Dashboard (what to check every Monday)
1. New signups last 7 days
2. Trial → paid conversions last 7 days
3. At-risk clients (no ICP, no leads)
4. MRR vs monthly target
5. FIGSY: reply rate + interested % across all campaigns
6. TTFL: any client > 4 hours flagged

---

## PRODUCT VISION — 1 YEAR

**By May 2027:**
- 150+ paying clients across SA + Nigeria + Kenya
- Lead Gen + FIGSY the core product — proven, reliable, fast
- VA live for 30+ clients (document Q&A, proposal drafting, client comms)
- Chatbot live for 20+ clients (website inbound, WhatsApp qualification)
- FIGSY Phase 2: Google Calendar booking, LinkedIn outreach, multi-channel
- Built-in CRM (basic) — clients stop needing HubSpot for K.I.N.D workflows
- K.I.N.D's own outbound running entirely on FIGSY — best demo possible
- Revenue: $40,000 MRR

**Products to add in Year 1 (post-launch):**
| Product | What | When |
|---------|------|------|
| FIGSY Calendar (F2-1) | Books meetings into client's Google/Outlook calendar | June 2026 |
| FIGSY LinkedIn (F2-4) | Multi-channel: email + LinkedIn DM | June 2026 |
| VA Starter | AI trained on client's business — answers questions, drafts proposals | July 2026 |
| Chatbot | Inbound qualifier for website + WhatsApp | July 2026 |
| KPI Dashboard (client-facing) | Clients see their own pipeline metrics, reply rates, meetings booked | August 2026 |
| Referral program | Client refers another → both get free credits | August 2026 |
| Zapier integration | Connect K.I.N.D to any tool via Zapier | September 2026 |
| Ask K.I.N.D support widget | AI-powered live support in the portal | May 2026 (building now) |

---

## PRODUCT VISION — 5 YEARS

### Year 2 (2027) — The Platform Shift
K.I.N.D becomes the full B2B revenue OS:
- Built-in CRM — clients stop needing Salesforce or HubSpot
- Pipeline forecasting — AI predicts close probability from lead score + FIGSY engagement
- Multi-channel FIGSY — email, LinkedIn, WhatsApp, voice notes
- K.I.N.D handles the entire journey from stranger to signed contract
- **Pan-African launch**: Nigeria, Kenya, Ghana, Egypt
- Revenue: $120,000 MRR / 450 clients

### Year 3 (2028) — Data Advantage
- Proprietary dataset: leads scored and converted across thousands of companies and industries across Africa
- Predictive ICP — K.I.N.D tells you who to target before you ask
- Industry benchmarks — "Companies like yours convert at 3.2% via FIGSY — you're at 1.8%"
- White-label offering — agencies resell K.I.N.D under their brand
- Revenue: $300,000 MRR / 1,000 clients

### Year 4 (2029) — The Network Effect
- K.I.N.D sits between buyers and sellers across thousands of African companies
- Warm B2B introductions — K.I.N.D knows who wants to buy and who wants to sell
- Marketplace dynamics — deals happen on the platform
- First institutional funding or strategic acquisition interest
- Revenue: $700,000 MRR / 2,500 clients

### Year 5 (2030) — Market Leader
- Dominant B2B revenue OS across Africa
- 5,000+ clients, 10+ countries
- IPO-ready on JSE or acquisition by global CRM/AI player at $100M+ valuation
- K.I.N.D used by the majority of growth-stage African B2B companies
- The Salesforce of Africa — AI-native from day one

### Future Products to Add (Year 2+)
| Product | What it does | Why K.I.N.D |
|---------|-------------|------------|
| Built-in CRM | Pipeline, contacts, deals — no HubSpot needed | We already have the data |
| Voice FIGSY | AI makes cold calls, leaves voicemails, detects interest | Completes the outreach stack |
| Predictive ICP | AI recommends who to target based on conversion data | Proprietary dataset advantage |
| Proposal builder | VA drafts proposals and quotes from client's templates | Extends VA product |
| Contract management | Send, sign, store contracts — ECTA compliant | High value, low competition in Africa |
| K.I.N.D Marketplace | Buy and sell B2B services between K.I.N.D clients | Network effect flywheel |
| Industry-specific agents | Fintech AE Agent, Logistics SDR Agent, etc. | Vertical SaaS premium |
| K.I.N.D Analytics | Cross-client benchmarks — "Your industry converts at X%" | Data moat |
| White-label | Agencies sell K.I.N.D under their brand | B2B2B distribution |

---

## LEAD GEN — INTERNAL PROCESS COMPARISON

### Lead Gen Only vs Lead Gen + FIGSY

| Step | Lead Gen Only ($1/lead) | Lead Gen + FIGSY ($3/lead) |
|------|------------------------|---------------------------|
| 1. Signup & payment | Client signs up, accepts terms via payment | Same |
| 2. Onboarding | Business profile + website | Same |
| 3. ICP setup | Claude pre-fills from website, client confirms in 60s | Same |
| 4. ICP saved | Apollo search fires automatically | Same |
| 5. Lead delivery | Pre-consented leads first, scored and ranked | Same |
| 6. Client notified | Email with top 5 leads inline | Same |
| 7. Outreach | ❌ Client emails manually from their own tools | ✅ FIGSY auto-sends personalised 3-step sequence |
| 8. Follow-ups | ❌ Client chases manually | ✅ Step 2 day 4, Step 3 day 9 — fully automatic |
| 9. Reply handling | ❌ Client manages own inbox | ✅ Classified: interested / opt-out / OOO / not interested |
| 10. Interested leads | Client has to discover these themselves | ✅ Surfaced in FIGSY dashboard — reply rate, interested % |
| 11. CRM | Client exports CSV, imports manually | ✅ Auto-push to HubSpot or Pipedrive on interest signal |
| 12. Meeting booking | Client arranges manually | ✅ F2-1: FIGSY sends booking link via Google Calendar (June) |
| 13. Ongoing batches | New leads added to pipeline | Same + FIGSY auto-enrolls new arrivals |

**One-line difference:** Lead Gen finds and scores. FIGSY finds, scores, and talks. You just book the meeting.

---

## TECH STACK

| Layer | Technology | Notes |
|-------|-----------|-------|
| Portal (client-facing) | Next.js 14, TypeScript, Tailwind | `apps/portal` |
| Admin (internal) | Next.js 14, TypeScript, Tailwind | `apps/admin` |
| API | Express, TypeScript | `apps/api` — deployed on Railway |
| Database | Supabase (PostgreSQL) | RLS on all tables |
| Auth | Supabase Auth | Email + password |
| AI | Anthropic Claude (Haiku + Sonnet) | Scoring, sequences, classification, pre-fill |
| Lead data | Apollo.io API | Pre-consented contacts prioritised |
| Email sending | Resend | `hello@get-kind.com` — all transactional + FIGSY |
| Payments | Paystack | ZAR + USD, credit bundles |
| Hosting | Vercel (portal + website) + Railway (API) | |
| Website | Static HTML + Tailwind | `apps/website` |

---

## KEY DECISIONS LOCKED

| Decision | Outcome |
|----------|---------|
| Core metric | TTFL — target < 2 hours from signup |
| Billing model | Credit bundles (one-time). Recurring subscriptions Phase 2. |
| Agent positioning | Four specialist agents — full revenue cycle |
| FIGSY trigger | June launch, after Lead Gen smoke test |
| VA + Chatbot trigger | July, after FIGSY Phase 1 live + 3 active clients |
| Payment processor | Paystack (ZAR + USD) |
| AI provider | Anthropic Claude — Haiku for volume, Sonnet for quality |
| Data source | Apollo.io — pre-consented contacts first |
| Hosting | Supabase + Railway + Vercel |
| Legal | Payment = acceptance under ECTA. No manual signing. |
| Inbound email | Resend inbound — configure for FIGSY reply detection |
| Vector DB (VA/CB) | TBD — Supabase pgvector (simple) vs Pinecone (scale) |

---

*Last updated: 15 May 2026. Update after every session.*
