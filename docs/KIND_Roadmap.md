# KIND AI Platform — Master Roadmap
**Launch date: 31 May 2026 · Updated: 13 May 2026 · Days remaining: 18**

> Single source of truth. Two goals, in order:
> **Goal 1 — Fully functional Lead Gen live by 31 May 2026**
> **Goal 2 — FIGSY launch (immediately after Lead Gen is stable)**

---

## #1 Priority — Speed Pipeline (Time to First Lead)

> The core business metric: how fast can we put a real, scored, contactable lead in front of a client from the moment they sign up?
> **Target: < 2 hours. Every time. Every plan.**

This is non-negotiable and drives retention, word of mouth, and conversion from trial to paid.

### The Build (in order)

| # | Task | What it does |
|---|------|-------------|
| S1 | **ICP auto-trigger on save** | The moment a client saves their ICP, the lead search fires automatically — no manual "Run ICP" button |
| S2 | **AI ICP pre-fill on onboarding** | Claude scrapes the client's website and pre-populates ICP fields — client confirms in < 60 seconds |
| S3 | **Pre-consented contacts first** | Apollo `apollo_only_consented` contacts are scored and delivered in the same hour — no consent email wait |
| S4 | **"First leads ready" push email** | Auto-notify client the moment their first leads land — don't make them log in to discover it |
| S5 | **FIGSY auto-start on lead delivery** | For FIGSY plans, outreach begins automatically when the first consented lead arrives |
| S6 | **TTFL metric on admin dashboard** | Track `signup_at → first scored lead` per client. Target < 2 hours. Flag anything > 4 hours |

### Client journey — target state
| Time | Event |
|------|-------|
| Hour 0 | Signup, email confirmed |
| Hour 0–1 | Onboarding — AI pre-fills ICP from their website, client confirms in 60s |
| Hour 1 | ICP saved → search fires automatically |
| Hour 1–2 | Pre-consented leads scored and delivered, client notified by email |
| Hour 1–2 | FIGSY sends first outreach (FIGSY plans only) |
| Hour 24–48 | More leads arrive as consent replies come in |
| Day 3–7 | Replies detected, FIGSY follows up |
| Day 7–14 | First meetings booked |

---

## Confirmed Pricing Model (locked 11 May 2026)

Usage-based pricing. Clients pay per lead, with a monthly minimum. More usage = lower rate.

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

### FIGSY Add-on (upgrade from Leads Only)
- $150/mo flat — adds FIGSY AI outreach to existing Leads Only plan

### VA + Chatbot (flat subscription)
| Product | Starter | Pro |
|---------|---------|-----|
| Virtual Assistant | $200/mo | $500/mo |
| AI Chatbot Agent | $200/mo | $400/mo |

**ZAR billing:** USD price × 19 at date of invoice.

**Phase 2 (10+ clients):** Introduce overage tracking. Starter includes 100 leads, $1 each after. Advanced includes 200 leads, $0.80 each after.

---

## Infrastructure Status (as of 12 May 2026)

| Service | Status | Notes |
|---------|--------|-------|
| Supabase — schema + storage bucket | ✅ Done | `agreement-templates` bucket created |
| Railway — API deployed | ✅ Done | `https://kindapi-production.up.railway.app` |
| Vercel — Portal | ✅ Live | `https://kind-portal.vercel.app` |
| Vercel — Admin | ⏳ Tomorrow | Needs redeploy after `SUPABASE_SERVICE_ROLE_KEY` added |
| Paystack — plans created | ⏳ Tomorrow | 8 plans to create (see Step 5 below) |
| Paystack — webhook set | ⏳ Tomorrow | URL: `https://kindapi-production.up.railway.app/webhooks/paystack` |
| Netlify — landing page | ⏳ Tomorrow | Needs Formspree ID + deploy |
| 5 PDFs uploaded to Terms Library | ⏳ Pending | Admin must be live first |
| First client created | ⏳ Pending | All above must be done first |

---

## Tomorrow Morning — Action List (12 May 2026)

Do these in order:

### 1. Admin portal redeploy (5 min)
- Vercel → kind-admin-h5q6 → Deployments → Redeploy
- Confirm it loads without error at `https://kind-admin-h5q6.vercel.app`

### 2. Netlify landing page (10 min)
- Sign up at formspree.io → New Form → name "KIND Enquiries" → copy form ID
- Tell Claude the form ID → Claude updates `apps/landing/index.html`
- Drag `apps/landing/` folder to netlify.com/drop → live instantly
- Also update the existing Netlify waitlist page pricing (currently shows old $500/$1,500 prices)

### 3. Paystack — create 8 subscription plans (15 min)
Log into paystack.com → Products → Plans → Create Plan for each:

| Plan name | ZAR amount | Interval |
|-----------|-----------|----------|
| KIND Lead Gen Starter | R1,900 | Monthly |
| KIND Lead Gen Advanced | R3,781 | Monthly |
| KIND Lead Gen + FIGSY Starter | R5,700 | Monthly |
| KIND Lead Gen + FIGSY Advanced | R13,281 | Monthly |
| KIND VA Starter | R3,800 | Monthly |
| KIND VA Pro | R9,500 | Monthly |
| KIND Chatbot Starter | R3,800 | Monthly |
| KIND Chatbot Pro | R7,600 | Monthly |

After creating each plan, copy the `PLN_xxx` code into Railway → Variables.

### 4. Paystack — set webhook (2 min)
- Paystack → Settings → API Keys & Webhooks → Webhooks
- Add URL: `https://kindapi-production.up.railway.app/webhooks/paystack`
- Events: `charge.success`, `subscription.create`, `subscription.disable`, `invoice.update`

### 5. Upload 5 PDFs to Terms Library (5 min)
- Go to `https://kind-admin-h5q6.vercel.app/terms-library`
- Upload all 5 agreement PDFs (MSA, POPIA Process, Chatbot SLA, Order Form T&Cs, Privacy Policy)

### 6. Create first client (5 min)
- Supabase → Authentication → Users → Invite user → enter client email
- They receive a "Set password" email → they log in → portal is live for them

---

## What is built (code complete)

| Area | Status |
|------|--------|
| Monorepo scaffold — portal, admin, API, DB, shared | ✅ |
| Supabase auth — login, onboard | ✅ |
| Full DB schema — all 10 tables + RLS | ✅ |
| Paystack billing — subscribe, verify, webhook | ✅ |
| Admin dashboard — MRR, clients, progress | ✅ |
| Admin — clients list + client detail | ✅ |
| Admin — order form builder + send | ✅ |
| Admin — Terms Library PDF uploader | ✅ |
| Portal — dashboard home with stats | ✅ |
| Portal — Lead Gen page with pipeline, filters, scoring | ✅ |
| Portal — ICP Builder | ✅ |
| Portal — Documents page (order form signing, T&C viewer) | ✅ |
| Portal — Billing page with usage-based pricing | ✅ |
| Portal — Billing confirm (Paystack return handler) | ✅ |
| Portal — Onboarding banner (3-tier gate) | ✅ |
| Portal — Settings page | ✅ |
| Portal — /terms and /privacy legal pages | ✅ |
| API — ICP routes (CRUD + activate) | ✅ |
| API — Leads routes (stats, filters, opt-out, AI email draft, CSV export) | ✅ |
| API — Order form routes (get, sign with IP) | ✅ |
| API — Subscription routes (initiate, verify) | ✅ |
| Landing page HTML (Netlify) | ✅ Needs Formspree ID |
| SOP document | ✅ `docs/KIND_SOP.md` |
| Deployment guide | ✅ `docs/DEPLOYMENT_GUIDE.md` |

---

## GOAL 1 — Lead Gen fully live by 31 May

### Remaining build tasks

| # | Task | Priority | Notes |
|---|------|----------|-------|
| L1 | Wire Apollo API to ICP builder | Must have | Client activates ICP → system pulls matching leads from Apollo |
| L2 | POPIA consent email send | Must have | "Send consent" button actually sends an email via Resend/Sendgrid |
| L3 | Lead scoring automation | Must have | Auto-score leads against ICP when they arrive, not manual |
| L4 | Usage counter per client | Must have | Track leads delivered per month for billing |
| L5 | Overage billing trigger | Post-launch | When count exceeds 100, trigger Paystack charge per lead |
| L6 | CRM sync (HubSpot) | Nice to have | Ship after launch if not done |

---

## GOAL 2 — FIGSY (starts when Lead Gen is live and stable)

FIGSY is a **standalone AI SDR/BDR agent** — not just a Lead Gen add-on. It can be sold independently to any B2B company doing outbound sales.

### FIGSY trigger
Start building when: infrastructure is fully live + at least one test of the full Lead Gen flow (ICP → leads → consent → export) has been completed successfully.

### FIGSY Phase 1 — MVP

| # | Task | Notes |
|---|------|-------|
| F1-1 | FIGSY portal page (`/dashboard/figsy`) | Entry point, campaign list |
| F1-2 | Campaign creation | Name, select leads from pipeline or upload CSV |
| F1-3 | AI email sequence builder | Claude generates personalised initial + 2 follow-ups per lead |
| F1-4 | Reply detection | Monitor inbox, classify: interested / not interested / opt-out / OOO |
| F1-5 | Opt-out handler | Auto-block on opt-out reply, shared with Lead Gen blocklist |
| F1-6 | Campaign dashboard | Sent, opened, replied, interested, booked |
| F1-7 | DB tables | `figsy_campaigns`, `figsy_sequences`, `figsy_replies` |
| F1-8 | API routes | Campaign CRUD, sequence management, reply ingestion |
| F1-9 | FIGSY billing integration | Wire to usage-based pricing ($3/lead Starter, $2/lead Advanced) |

### FIGSY Phase 2 — Full automation (June+)

| # | Task |
|---|------|
| F2-1 | Calendar integration (Google Calendar first) |
| F2-2 | CRM push — booked meetings to HubSpot/Pipedrive |
| F2-3 | Full AI reply automation — handles back-and-forth |
| F2-4 | Animated explainer video |

---

## Lower priority — after Lead Gen and FIGSY are live

### VA + Chatbot
| # | Task |
|---|------|
| VA-1 | Virtual Assistant — Claude-powered chat interface |
| VA-2 | API route — assistant chat with message history |
| CB-1 | Chatbot Agent — persona config + embed code |
| CB-2 | API route — chatbot config CRUD |

### Website redesign (post-launch)
| # | Task |
|---|------|
| W-1 | Products dropdown nav, Use Cases, Resources, Company pages |
| W-2 | Individual product landing pages (Lead Gen, FIGSY, VA, Chatbot) |
| W-3 | Annual pricing option (~2 months free) |
| W-4 | Use Cases section per product and industry |

### Marketing
| # | Task |
|---|------|
| M-1 | FIGSY explainer video — lead → outreach → reply → booked meeting |
| M-2 | Email nurture sequence — 5 emails for landing page sign-ups |
| M-3 | Launch week calendar — LinkedIn, email, WhatsApp broadcast |

---

## Revised execution schedule

```
12 May (tomorrow)   Infrastructure live — admin, Netlify, Paystack, PDFs, first client

13–16 May           Lead Gen wiring:
                    - Apollo API → ICP builder
                    - POPIA consent email (Resend)
                    - Lead scoring automation
                    - Usage counter per client

17–20 May           End-to-end Lead Gen test
                    Fix all issues found in testing
                    First real client runs through full flow

21–25 May           FIGSY Phase 1 build
                    - DB tables + API routes
                    - Portal page + campaign creation
                    - AI email sequences
                    - Reply detection + opt-out handler

26–29 May           FIGSY dashboard + billing integration
                    End-to-end FIGSY test

30 May              Final QA pass

31 May              LAUNCH — Lead Gen + FIGSY Phase 1 live
```

---

## Key decisions locked

| Decision | Outcome |
|----------|---------|
| Pricing model | Usage-based — $1/lead (Leads Only), $3/lead (Leads + FIGSY), min $100/$300/mo |
| FIGSY positioning | Standalone product AND bundle — not just an add-on |
| FIGSY trigger | Build starts when Lead Gen infrastructure is live and tested |
| Payment processor | Paystack (ZAR billing, USD pricing) |
| AI provider | Anthropic Claude (`claude-sonnet-4-6`) |
| Data source | Apollo.io with consent filter |
| Hosting | Supabase + Railway + Vercel + Netlify |
| Legal signature model | One Order Form signs all 5 documents (ECTA compliant) |
| Overage pricing | Phase 2 — launch flat first, add overages at 10+ clients |

---

## 5-Year Vision

> *Documented 13 May 2026 — founder's strategic direction*

### The Honest Take

K.I.N.D is not a lead gen tool. It is infrastructure. The 5-year opportunity is to become the **B2B revenue operating system for African businesses** — AI-native from day one, not retrofitted like Western incumbents.

---

### Year 1–2 — Prove the Model
The product works. Clients get leads within hours. FIGSY books meetings. Word spreads. 50–100 paying clients. Real MRR. The most important thing that happens in this phase is not revenue — it is **data**. Every ICP run, every lead scored, every email FIGSY sends is a proprietary dataset no competitor can buy.

### Year 2–3 — The Platform Shift
K.I.N.D stops being "the lead gen tool" and becomes the full B2B revenue OS:
- CRM built in — clients no longer need HubSpot
- Pipeline forecasting — AI predicts close probability from lead score + FIGSY engagement
- Multi-channel FIGSY — email, LinkedIn, WhatsApp, voice
- VA and Chatbot mature — K.I.N.D handles the entire customer journey from stranger to signed contract

### Year 3–4 — African Expansion
South Africa proves the model. Expand into Nigeria, Kenya, Egypt, Ghana. These markets are massively underserved by Western tools — Salesforce and HubSpot are too expensive and too American. K.I.N.D is built for this: local currency billing, POPIA/NDPR compliance baked in, pricing that fits. **The Salesforce of Africa — but AI-native.**

The data advantage compounds here. Lead and conversion data across industries, countries, and company sizes across the continent. No one else has that.

### Year 4–5 — The Network Effect
K.I.N.D sits between buyers and sellers across thousands of companies. It knows who is buying what, when, and why. It starts connecting clients to each other — warm B2B introductions, marketplace dynamics, partnership matching.

**K.I.N.D becomes a B2B network, not just software.** The data moat makes it defensible. The speed model makes it sticky. The African-first positioning makes it ownable.

At scale: **$50–100M ARR** with a legitimate path to acquisition by a global CRM, data, or AI player — or an IPO on the JSE as the first AI-native B2B revenue platform built on the continent.

---

### The Single Biggest Risk
Speed of execution. The first-mover window in this exact space in Africa is **18–24 months**. Salesforce, HubSpot, and well-funded startups will arrive. The moat being built right now — the data, the brand, the client relationships — is what makes K.I.N.D unconquerable when they do.

**That is why Time to First Lead is not just a metric. It is the competitive weapon.**

---

*Last updated: 13 May 2026. Update after every work session.*
