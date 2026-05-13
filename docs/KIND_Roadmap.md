# KIND AI Platform — Master Roadmap
**Launch date: 31 May 2026 · Updated: 13 May 2026 · Days remaining: 18**

> Single source of truth. Five goals, in order:
> **Goal 1 — Lead Gen fully live by 31 May 2026**
> **Goal 2 — FIGSY launch (immediately after Lead Gen is stable)**
> **Goal 3 — VA + Chatbot Agent (June/July 2026)**
> **Goal 4 — K.I.N.D runs on K.I.N.D — internal AE, CRO, CMO agents**
> **Goal 5 — Platform expansion — African markets (2027)**

---

## #1 Priority — Speed Pipeline (Time to First Lead)

> The core business metric: how fast can we put a real, scored, contactable lead in front of a client from the moment they sign up?
> **Target: < 2 hours. Every time. Every plan.**

This drives retention, word of mouth, and trial → paid conversion. Non-negotiable.

### The 6 Speed Tasks (built before smoke test)

| # | Task | What it does | Status |
|---|------|-------------|--------|
| S1 | **ICP auto-trigger on save** | ICP saved → lead search fires automatically. No manual "Run ICP" button | ✅ Done |
| S2 | **AI ICP pre-fill on onboarding** | Claude scrapes client's website → pre-populates ICP fields. Client confirms in < 60s | ✅ Done |
| S3 | **Pre-consented contacts first** | Apollo `apollo_only_consented` leads scored and delivered same hour — no consent wait | ✅ Done |
| S4 | **"First leads ready" push email** | Auto-notify client the moment first leads land — don't make them log in to discover it | ✅ Done |
| S5 | **FIGSY auto-start on lead delivery** | Outreach begins automatically when first consented lead arrives — no manual activation | ✅ Done |
| S6 | **TTFL metric on admin dashboard** | Track `signup_at → first scored lead` per client. Target < 2 hours. Flag > 4 hours | ✅ Done |

### Client Journey — Target State

| Time | Event |
|------|-------|
| Hour 0 | Signup, email confirmed |
| Hour 0–1 | Onboarding — AI pre-fills ICP from website, client confirms in 60s |
| Hour 1 | ICP saved → search fires automatically |
| Hour 1–2 | Pre-consented leads scored and delivered, client notified by email |
| Hour 1–2 | FIGSY sends first outreach (FIGSY plans only) |
| Hour 24–48 | More leads arrive as consent replies come in |
| Day 3–7 | Replies detected, FIGSY follows up |
| Day 7–14 | First meetings booked |

---

## What Must Be Built Before Smoke Test

> Nothing below smoke test until every item here is done. In order.

### Config — Manual Steps (no code)

| # | Task | Where | Done? |
|---|------|-------|-------|
| C1 | Set Supabase Site URL to `https://app.get-kind.com` | Supabase → Auth → URL Configuration | ⏳ |
| C2 | Add `https://app.get-kind.com/auth/callback` to Redirect URLs | Supabase → Auth → URL Configuration | ⏳ |
| C3 | Create 8 Paystack subscription plans (see pricing table) | paystack.com → Products → Plans | ⏳ |
| C4 | Set Paystack webhook URL to Railway API | Paystack → Settings → Webhooks | ⏳ |
| C5 | Confirm all Railway env vars present | Railway → Variables | ⏳ |

### Code — Build Tasks

| # | Task | Notes | Status |
|---|------|-------|--------|
| B1 | **Deploy auth fixes to Railway** | Token verification fixed, `company_name` bug fixed, empty URL fix — code done | ✅ Code done → redeploy |
| B2 | **Apollo API → ICP builder** | ICP activated → Apollo search → leads stored in DB | ✅ Done |
| B3 | **Lead scoring automation** | Claude auto-scores leads 0–100 on arrival — no manual step | ✅ Done |
| B4 | **POPIA consent email** | "Send consent" fires real Resend email, tracks `consent_sent_at` | ✅ Done |
| B5 | **Usage counter per client** | Count leads delivered this billing period — needed for billing + overages | ✅ Done |
| B6 | **ICP auto-trigger on save** (S1) | No manual Run button — fires on ICP save | ✅ Done |
| B7 | **Pre-consented contacts first** (S3) | Deliver Apollo pre-consented leads in same hour | ✅ Done |
| B8 | **"First leads ready" email** (S4) | Push email to client on first lead delivery — now includes top 5 leads inline | ✅ Done |
| B9 | **AI ICP pre-fill from website** (S2) | Claude scrapes website → suggests ICP fields on onboarding | ✅ Done |
| B10 | **TTFL metric on admin dashboard** (S6) | `signup_at → first lead` per client, flag slow pipelines | ✅ Done |
| B11 | **Merge branch to main** | Merges `claude/ai-business-roadmap-U3OWJ` → main → deploys all fixes + website changes to production | ⏳ After smoke test |

### The Smoke Test — 9 Steps

Once all above complete, run through in order:

| Step | Action | Pass condition |
|------|--------|---------------|
| 1 | Sign up at `app.get-kind.com` | Confirmation email arrives |
| 2 | Confirm email, land on portal | Dashboard loads, onboarding banner shows |
| 3 | Complete business profile | Saved, no "Invalid token" error |
| 4 | Build ICP and save | Auto-fires lead search immediately |
| 5 | View leads pipeline | Leads appear within 2 hours, scores visible |
| 6 | Send POPIA consent to a lead | Email sent, `consent_sent_at` updates |
| 7 | Export leads as CSV | CSV downloads correctly |
| 8 | Subscribe to a plan | Paystack checkout → returns → subscription active |
| 9 | Check admin dashboard | Client visible, TTFL metric showing |

---

## What Is Built (code complete as of 13 May 2026)

| Area | Status | Notes |
|------|--------|-------|
| Monorepo scaffold — portal, admin, API, DB, shared | ✅ | |
| Supabase auth — login, onboard | ✅ | |
| Auth bug — Invalid token on onboarding | ✅ Fixed | Was using wrong Supabase client |
| Auth bug — `company_name` undefined on onboard | ✅ Fixed | Destructuring error |
| Auth bug — empty website URL failing Zod validation | ✅ Fixed | `emptyToUndefined` transform |
| CSV export — auth header not sent | ✅ Fixed | Replaced `window.open` with fetch + blob |
| Full DB schema — all 10 tables + RLS | ✅ | |
| Paystack billing — subscribe, verify, webhook (code) | ✅ | Plans not yet created in Paystack dashboard |
| Admin dashboard — MRR, clients, progress tracker | ✅ | |
| Admin — clients list + client detail | ✅ | |
| Admin — order form builder + send | ✅ | |
| Admin — Terms Library PDF uploader | ✅ | |
| Portal — dashboard home with stats | ✅ | |
| Portal — Lead Gen page with pipeline, filters, scoring | ✅ | |
| Portal — ICP Builder | ✅ | |
| Portal — Documents page (order form signing, T&C viewer) | ✅ | |
| Portal — Billing page with usage-based pricing | ✅ | |
| Portal — Billing confirm (Paystack return handler) | ✅ | |
| Portal — Onboarding banner (3-tier gate) | ✅ | |
| Portal — Settings page | ✅ | |
| Portal — /terms and /privacy legal pages | ✅ | |
| API — ICP routes (CRUD + activate) | ✅ | |
| API — Leads routes (stats, filters, opt-out, AI draft, CSV export) | ✅ | |
| API — Order form routes (get, sign with IP) | ✅ | |
| API — Subscription routes (initiate, verify) | ✅ | |
| Website — homepage (split hero, AI agent, dots, FIGSY scroll scene, video, stats) | ✅ | Redesigned 13 May |
| Website — about, pricing, support, use-cases | ✅ | Rebranded white theme 13 May |
| Website — YouTube demo video embedded | ✅ | |
| SOP document | ✅ | `docs/KIND_SOP.md` |
| Deployment guide | ✅ | `docs/DEPLOYMENT_GUIDE.md` |

---

## Infrastructure Status (as of 13 May 2026)

| Service | Status | Notes |
|---------|--------|-------|
| Supabase — schema + storage bucket | ✅ | |
| Railway — API deployed | ✅ | `https://kindapi-production.up.railway.app` |
| Vercel — Portal | ✅ | `https://app.get-kind.com` |
| Vercel — Website | ✅ | `https://get-kind.com` |
| Supabase — auth URLs configured | ⏳ | Site URL + callback URL |
| Paystack — 8 plans created | ⏳ | Copy PLN_ codes to Railway vars |
| Paystack — webhook set | ⏳ | `https://kindapi-production.up.railway.app/webhooks/paystack` |
| 5 PDFs uploaded to Terms Library | ⏳ | |
| Branch `claude/ai-business-roadmap-U3OWJ` merged to main | ⏳ | After smoke test passes — this deploys everything to get-kind.com |

---

## Confirmed Pricing Model (locked 11 May 2026)

### Leads Only
| Volume | Rate | Monthly minimum |
|--------|------|----------------|
| 0–100 leads/mo | $1.00/lead | $100/mo |
| 101–500 leads/mo | $1.00/lead | — |
| 500+ leads/mo | $0.80/lead | — |

### Leads + FIGSY
| Volume | Rate | Monthly minimum |
|--------|------|----------------|
| 0–100 leads/mo | $3.00/lead | $300/mo |
| 101–500 leads/mo | $2.00/lead | — |
| 500+ leads/mo | $1.20/lead | — |

### FIGSY Add-on
- $150/mo flat — adds FIGSY outreach to existing Leads Only plan

### VA + Chatbot
| Product | Starter | Pro |
|---------|---------|-----|
| Virtual Assistant | $200/mo | $500/mo |
| AI Chatbot Agent | $200/mo | $400/mo |

**ZAR billing:** USD × 19 at invoice date.

### Paystack Plans to Create (8 plans)

| Plan name | ZAR | Interval |
|-----------|-----|----------|
| KIND Lead Gen Starter | R1,900 | Monthly |
| KIND Lead Gen Advanced | R3,781 | Monthly |
| KIND Lead Gen + FIGSY Starter | R5,700 | Monthly |
| KIND Lead Gen + FIGSY Advanced | R13,281 | Monthly |
| KIND VA Starter | R3,800 | Monthly |
| KIND VA Pro | R9,500 | Monthly |
| KIND Chatbot Starter | R3,800 | Monthly |
| KIND Chatbot Pro | R7,600 | Monthly |

---

## Lead Gen Only vs Lead Gen + FIGSY — Internal Process Comparison

> Internal reference. Not client-facing. Use this to explain the product, train staff, and spec new features.

### Step-by-step from signup to outcome

| Step | Lead Gen Only ($1/lead) | Lead Gen + FIGSY ($3/lead) |
|------|------------------------|---------------------------|
| **1. Signup & payment** | Client signs up, pays via Paystack | Same |
| **2. Onboarding** | Fills company profile (name, industry, country, website) | Same |
| **3. ICP setup** | Claude scrapes their website → pre-fills ICP fields. Client confirms in 60s | Same |
| **4. ICP saved** | Apollo search fires automatically — no manual Run button | Same |
| **5. Apollo results** | Pre-consented contacts prioritised (`apollo_only_consented: true`) | Same |
| **6. Lead scoring** | Claude haiku scores every lead 0–100 against ICP. Reasoning stored per lead | Same |
| **7. Client notified** | "Your first leads are ready" email sent automatically with lead count | Same |
| **8. Lead delivery — client's options** | **3 options:** | **Same 3 options, but FIGSY also runs automatically** |
| | ① Export CSV — download scored leads, email themselves | ① Export CSV |
| | ② CRM sync — push to HubSpot or Pipedrive via API key in Settings *(to build)* | ② CRM sync *(to build)* |
| | ③ Auto email digest — K.I.N.D emails client a leads report (top scores, stats, pipeline value) every time a new batch lands *(to build)* | ③ Auto email digest *(to build)* |
| **9. Outreach** | ❌ Client does their own emailing from their own tool | ✅ FIGSY auto-enrolls every consented lead into active campaign |
| **10. Email sequences** | ❌ Client writes manually | ✅ Claude writes personalised 3-step sequence per lead — sent automatically |
| **11. Follow-ups** | ❌ Client chases manually | ✅ Step 2 at Day 4, Step 3 at Day 9 — fully automatic |
| **12. Reply handling** | ❌ Client manages their own inbox | ✅ Replies classified: interested / not now / opt-out / OOO |
| **13. Opt-outs** | Manual block button in portal per lead | ✅ Auto-suppressed instantly — shared blocklist, cross-platform |
| **14. Interested leads** | Client has to discover this themselves | ✅ Surfaced in FIGSY campaign dashboard — reply rate, interested % |
| **15. Ongoing batches** | ICP re-runs on schedule — new leads added to pipeline | Same, plus FIGSY auto-enrolls new arrivals |

### The one-line difference
- **Lead Gen Only** — K.I.N.D finds and scores the right people. Client does the talking.
- **Lead Gen + FIGSY** — K.I.N.D finds, scores, and FIGSY does the talking. Client just books the meeting.

### Lead delivery options to build (D-series tasks)

| # | Task | Plan | Notes |
|---|------|------|-------|
| D1 | **CRM sync — HubSpot** | Lead Gen + FIGSY | Client pastes HubSpot API key in Settings. Leads push on consent_given. | ✅ Done |
| D2 | **CRM sync — Pipedrive** | Lead Gen + FIGSY | Same as D1, Pipedrive API | ✅ Done |
| D3 | **Integrations settings page** | Both | Portal settings tab — paste CRM API key, pick CRM, test connection, toggle sync | ✅ Done |
| D4 | **Auto email digest — on first batch** | Both | First leads email now includes top 5 leads inline with scores and pipeline value | ✅ Done |
| D5 | **Auto email digest — weekly** | Both | Every Monday via `POST /internal/digest/weekly` — top 10 leads, stats, pipeline value | ✅ Done |

---

## GOAL 1 — Lead Gen Remaining Build Tasks

| # | Task | Priority | Notes |
|---|------|----------|-------|
| L1 | Apollo API → ICP builder | Must have | = B2 above |
| L2 | POPIA consent email | Must have | = B4 above |
| L3 | Lead scoring automation | Must have | = B3 above |
| L4 | Usage counter per client | Must have | = B5 above |
| L5 | Overage billing trigger | Post-launch | When count > 100, trigger Paystack charge |
| L6 | CRM sync (HubSpot/Pipedrive) | Nice to have | After launch |

---

## GOAL 2 — FIGSY (starts when Lead Gen smoke test passes)

FIGSY is a **standalone AI SDR/BDR agent** — sold independently or bundled with Lead Gen.

### FIGSY Phase 1 — MVP

| # | Task | Notes |
|---|------|-------|
| F1-1 | FIGSY portal page (`/dashboard/figsy`) | Entry point, campaign list | ✅ Done |
| F1-2 | Campaign creation | Name, select leads or upload CSV | ✅ Done |
| F1-3 | AI email sequence builder | Claude writes personalised initial + 2 follow-ups per lead | ✅ Done |
| F1-4 | Reply detection | Classify replies: interested / not interested / opt-out / OOO | ✅ Done |
| F1-5 | Opt-out handler | Auto-block, shared with Lead Gen blocklist | ✅ Done |
| F1-6 | Campaign dashboard | Sent, replied, reply rate, interested % | ✅ Done |
| F1-7 | DB tables | `figsy_campaigns`, `figsy_enrollments`, `figsy_sent_emails`, `figsy_replies` | ✅ Done |
| F1-8 | API routes | Campaign CRUD, enroll, preview sequence, send-due, reply webhook | ✅ Done |
| F1-9 | Billing integration | $3/lead Starter, $2/lead Advanced | ✅ Done — gates campaign activation behind active FIGSY subscription |
| F1-10 | **FIGSY auto-start on lead delivery (S5)** | Auto-trigger outreach when consented lead hits pipeline — no manual activation | ✅ Done |

### FIGSY Phase 2 — Full Automation (June+)

| # | Task |
|---|------|
| F2-1 | Calendar integration (Google Calendar first) |
| F2-2 | CRM push — booked meetings to HubSpot/Pipedrive |
| F2-3 | Full AI reply automation — handles multi-turn back-and-forth |
| F2-4 | LinkedIn + WhatsApp outreach channels |
| F2-5 | Animated explainer video |

---

## GOAL 3 — The Agent Suite (June/July 2026)

> K.I.N.D is not just lead gen software. It is an **AI agent platform**. Each product is a specialist agent with one job. Together they cover the entire revenue cycle — no humans in the loop until the meeting is booked.

### The Full Agent Stack

| Agent | Job | When |
|-------|-----|------|
| **Lead Gen** | Finds, scores, and delivers the right people | Live 31 May |
| **FIGSY** | Reaches out, follows up, and books the meeting | June |
| **Virtual Assistant (VA)** | Knows your business — answers questions, drafts proposals, handles client comms | July |
| **Chatbot Agent** | Handles inbound on your website and WhatsApp — qualifies, captures, responds 24/7 | July |

**The full cycle:** Stranger lands on site → Chatbot captures and qualifies them → Lead Gen scores them → FIGSY reaches out → VA manages the relationship. Start to booked meeting. Fully automated.

---

### GOAL 3A — Virtual Assistant

Claude trained on the client's business — products, pricing, FAQs, processes, tone of voice. Acts as a smart internal assistant and client-facing responder.

| # | Task | Notes |
|---|------|-------|
| VA-1 | Knowledge base upload | Client uploads docs, URLs, FAQs. Claude ingests and indexes |
| VA-2 | VA onboarding flow in portal | Upload interface, source list, sync status |
| VA-3 | VA chat interface (`/dashboard/va`) | Clean chat UI, message history, source citations |
| VA-4 | API route — streaming chat with context | Streams responses, maintains conversation session |
| VA-5 | Persona config | Name, tone, scope limits (what it can/can't answer) |
| VA-6 | Embed snippet | One `<script>` tag — drops VA on client's own website as a chat widget |
| VA-7 | Billing integration | $200/mo Starter, $500/mo Pro via Paystack |

### GOAL 3B — Chatbot Agent

Handles inbound — website visitors and WhatsApp messages. Qualifies leads, answers questions, captures contact details. Feeds directly into the Lead Gen pipeline.

| # | Task | Notes |
|---|------|-------|
| CB-1 | Chatbot config (`/dashboard/chatbot`) | Persona name, greeting, topic scope |
| CB-2 | Knowledge base — same engine as VA, separate persona | Trained on products/services/FAQs |
| CB-3 | Web embed — JavaScript chat widget | Floating bubble, fully branded, one line of code |
| CB-4 | WhatsApp integration — Twilio or WhatsApp Business API | Same bot, WhatsApp channel |
| CB-5 | Lead capture flow | Bot collects name, email, company → pushes to Lead Gen pipeline automatically |
| CB-6 | Conversation dashboard | All chats, qualification status, captured contacts |
| CB-7 | Billing integration | $200/mo Starter, $400/mo Pro via Paystack |

**Build trigger:** Start VA + Chatbot when FIGSY Phase 1 is live and at least 3 clients are active on Lead Gen.

---

## GOAL 4 — K.I.N.D Runs on K.I.N.D (Internal AI Agent Team)

> You are building an AI agent platform for other businesses. You should be running your own business with the same agents. K.I.N.D is the first client. This is how you know it works — and it becomes the most powerful demo you have.

### The Internal Agent Desk

| Agent | Role | What it does |
|-------|------|-------------|
| **AE Agent** | Account Executive | Monitors every client — login activity, ICP status, lead volume, trial expiry. Flags at-risk accounts. Drafts check-in and conversion emails automatically |
| **CRO Agent** | Chief Revenue Officer | Watches MRR, churn signals, TTFL per client, trial → paid conversion rate. Surfaces "3 trials haven't built an ICP — they'll churn" before it happens |
| **CMO Agent** | Chief Marketing Officer | Runs K.I.N.D's own outbound. LinkedIn content, email sequences, launch campaigns. Knows the brand voice and target ICP (the businesses K.I.N.D wants as clients) |

### Build Tasks

| # | Agent | Task | Notes |
|---|-------|------|-------|
| INT-1 | AE | Client health dashboard — login recency, ICP built Y/N, leads delivered, trial days left | ✅ Admin dashboard built |
| INT-2 | AE | At-risk alert engine — flag clients with no activity > 3 days | ✅ `POST /internal/ae/at-risk` — emails founder |
| INT-3 | AE | Auto-draft check-in email when client goes cold | ✅ `POST /internal/ae/checkin-draft` — Claude drafts |
| INT-4 | AE | Trial expiry sequence — 3 emails at day 10, 12, 14 of trial | ✅ `POST /internal/ae/trial-expiry` — run daily |
| INT-5 | CRO | Revenue dashboard — MRR, churn rate, TTFL average, trial conversion % | ✅ `GET /internal/cro/dashboard` |
| INT-6 | CRO | Weekly digest — auto-generated summary of key metrics emailed to founder every Monday | ✅ `POST /internal/cro/weekly-digest` — Claude writes it |
| INT-7 | CRO | Churn prediction — flag clients whose usage is declining before they cancel | ✅ `GET /internal/cro/churn-risk` — risk score per client |
| INT-8 | CMO | Brand voice config — tone, ICP for K.I.N.D's own clients, messaging pillars | ✅ Done — `GET/POST /internal/cmo/brand-voice`, config in `lib/cmo.ts` |
| INT-9 | CMO | LinkedIn post generator — weekly content ideas + drafts based on product updates | ✅ Done — `POST /internal/cmo/linkedin-posts` — Claude generates 3 branded posts |
| INT-10 | CMO | Outbound for K.I.N.D — FIGSY runs K.I.N.D's own prospecting | ✅ Done — `POST /internal/cmo/prospect` — Apollo search + emails founder prospect list |

### The Principle
K.I.N.D eating its own cooking is the most credible thing you can show a prospect. When they ask "does it work?" the answer is: "We run our entire sales and retention operation on it. Here's our dashboard."

**Build trigger:** Start INT-1 through INT-7 (AE + CRO) immediately after Lead Gen smoke test passes — these run on top of data that already exists. CMO (INT-8 through INT-10) starts at FIGSY launch.

---

## Website Roadmap

| # | Task | When |
|---|------|------|
| W-1 | Confirm YouTube video visible on get-kind.com | This week |
| W-2 | Option B — Full Next.js + Framer Motion rebuild | At FIGSY launch |
| W-3 | Individual product landing pages (Lead Gen, FIGSY, VA, Chatbot) | With Option B |
| W-4 | Annual pricing option | With Option B |
| W-5 | Use Cases section per product and industry | With Option B |

---

## Marketing Roadmap

| # | Task | When |
|---|------|------|
| M-1 | FIGSY explainer video — lead → outreach → reply → booked meeting | FIGSY launch |
| M-2 | Email nurture sequence — 5 emails for trial signups | ✅ Done — `POST /internal/ae/nurture`, sends day 1/3/5/7/10 emails |
| M-3 | Launch week calendar — LinkedIn, email, WhatsApp broadcast | 31 May |
| M-4 | VA + Chatbot launch campaign | July |

---

## Execution Schedule

```
13–14 May   Config: Supabase auth URLs, Paystack plans + webhook, Railway vars
            Deploy auth fixes to Railway

14–17 May   Speed Pipeline + Lead Gen wiring:
            B2  Apollo API → ICP builder
            B3  Lead scoring automation
            B4  POPIA consent email
            B5  Usage counter
            B6  ICP auto-trigger on save (S1)
            B7  Pre-consented contacts first (S3)
            B8  "First leads ready" email (S4)
            B9  AI ICP pre-fill from website (S2)
            B10 TTFL metric on admin dashboard (S6)

17–19 May   Smoke test — all 9 steps must pass
            Fix anything broken

19 May      Merge branch to main → production deploy

20–25 May   FIGSY Phase 1 build (F1-1 through F1-9)

26–28 May   FIGSY auto-start (F1-10 / S5) + billing integration

29–30 May   End-to-end FIGSY test + final QA pass

31 May      LAUNCH — Lead Gen + FIGSY Phase 1 live

June        FIGSY Phase 2 (calendar, CRM push, full AI reply)
            VA + Chatbot build begins

July        VA + Chatbot live
            Website Option B rebuild
```

---

## Key Decisions Locked

| Decision | Outcome |
|----------|---------|
| Core metric | Time to First Lead (TTFL) — target < 2 hours from signup |
| Pricing model | Usage-based — $1/lead (Lead Gen), $3/lead (Lead Gen + FIGSY), min $100/$300/mo |
| Agent positioning | Four specialist agents covering full revenue cycle — not just a lead tool |
| FIGSY positioning | Standalone product AND bundle |
| FIGSY trigger | Build starts when Lead Gen smoke test passes |
| VA + Chatbot trigger | Build starts when FIGSY Phase 1 live + 3 active clients |
| Payment processor | Paystack (ZAR + USD) |
| AI provider | Anthropic Claude (`claude-sonnet-4-6`) |
| Data source | Apollo.io — pre-consented contacts delivered first |
| Hosting | Supabase + Railway + Vercel |
| Legal | One Order Form signs all 5 documents (ECTA compliant) |
| Overage pricing | Phase 2 — launch flat first, add at 10+ clients |

---

## 5-Year Vision

> *Documented 13 May 2026 — founder's strategic direction*

K.I.N.D is not a lead gen tool. It is infrastructure. The 5-year opportunity is to become the **B2B revenue operating system for African businesses** — AI-native from day one, not retrofitted like Western incumbents.

### Year 1–2 — Prove the Model
The product works. Clients get leads within hours. FIGSY books meetings. VA and Chatbot go live. 50–100 paying clients. Real MRR. The most important output of this phase is not revenue — it is **data**. Every ICP run, every lead scored, every FIGSY email sent is a proprietary dataset no competitor can buy.

### Year 2–3 — The Platform Shift
K.I.N.D becomes the full B2B revenue OS:
- CRM built in — clients stop needing HubSpot
- Pipeline forecasting — AI predicts close probability from lead score + FIGSY engagement
- Multi-channel FIGSY — email, LinkedIn, WhatsApp, voice
- K.I.N.D handles the entire customer journey from stranger to signed contract

### Year 3–4 — African Expansion
South Africa proves the model. Expand into Nigeria, Kenya, Egypt, Ghana. These markets are massively underserved — Salesforce and HubSpot are too expensive and too American. K.I.N.D is built for this: local currency billing, POPIA/NDPR compliance baked in. **The Salesforce of Africa — AI-native.**

The data advantage compounds here. Lead and conversion data across industries, countries, and company sizes across the continent. No one else will have that.

### Year 4–5 — The Network Effect
K.I.N.D sits between buyers and sellers across thousands of companies. It starts connecting clients to each other — warm B2B introductions, marketplace dynamics, partnership matching. **K.I.N.D becomes a B2B network, not just software.**

At scale: **$50–100M ARR** — legitimate path to acquisition by a global CRM, data, or AI player, or an IPO on the JSE as the first AI-native B2B revenue platform built on the continent.

### The Single Biggest Risk
Speed of execution. The first-mover window in Africa is **18–24 months**. The moat being built right now — the data, the brand, the client relationships — is what makes K.I.N.D unconquerable when bigger players arrive.

**Time to First Lead is not just a metric. It is the competitive weapon.**

---

*Last updated: 13 May 2026 (session 2). Update after every work session.*
