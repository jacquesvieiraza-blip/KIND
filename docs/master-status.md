# K.I.N.D — Master Status Document
*Last updated: 15 May 2026*

> **Full roadmap:** `docs/KIND_Roadmap.md` — single source of truth for build status, KPIs, revenue targets, product vision, and market expansion plan.

---

## CONFIRMED PRODUCT DIRECTION — NEXT BUILD PHASE

*All decisions confirmed. Do not build until infrastructure is live.*

---

### Product naming
- **K.I.N.D AI** — Lead Gen Pro (the engine that finds and emails leads)
- **FIGSY** — Lead Gen Advanced (the adaptive AI SDR, powered by FIGSY)
- VA and Chatbot — coming soon, waitlist only, no prices shown on website

---

### Pricing model — credit bundles (replacing current $1/lead model)

| Plan | Credits | Price |
|------|---------|-------|
| K.I.N.D AI (Lead Gen Pro) | 20 | $20 |
| K.I.N.D AI (Lead Gen Pro) | 40 | $40 |
| K.I.N.D AI (Lead Gen Pro) | 100 | $100 |
| FIGSY Advanced | 20 | $60 |
| FIGSY Advanced | 40 | $120 |
| FIGSY Advanced | 100 | $300 |

**Rules:**
- Credits purchased in bundles of 20 via dropdown top-up (UI like Manus)
- 1 credit consumed when a prospect sends a **positive reply** (interested/wants to chat)
- No credit consumed for no-reply or negative reply
- No refunds on spent credits
- Cancel or downgrade anytime — no credits refunded on downgrade
- 3 AI-regenerated ICP suggestions per month included on both plans
- Unlimited ICP regenerations on FIGSY Advanced

---

### Lead qualification — 3-sequence outreach

**Sequence:**
- Email 1 (Day 1): Personalised intro — who they are, problem K.I.N.D solves for their situation
- Email 2 (Day 4): Different angle — social proof, result, or a question
- Email 3 (Day 9): Final short note — "worth a quick chat?"

**Outcomes:**
- No response to all 3 → opt-out, recorded in blocklist, no credit used
- Any negative reply → opt-out, blocklist, no credit used
- Any positive reply → qualified lead, 1 credit consumed, client notified instantly

**Unsubscribe link in every email** — POPIA/GDPR requirement. Click = instant opt-out + blocklist.

**Reply inbox — how it works in practice:**
- Every outreach email has a tracked reply-to tied to that lead and client campaign
- Replies come back into K.I.N.D centrally — not to the client's personal inbox
- Claude classifies the reply: positive / negative / ambiguous
- Ambiguous → flagged for review
- Positive → credit consumed, lead flips to "qualified", client notified (email + in-app), full thread visible in client dashboard
- Admin portal shows all reply activity across all clients
- Client never misses a positive reply — system catches and pushes it to them

---

### Outreach engine — confirmed stack
- **Apollo** — lead sourcing (already built)
- **Claude** — personalised email writing (already built)
- **Resend** — sending and reply tracking
- **No Manus** — everything stays in-house

---

### ICP learning and adaptation
- System tracks every email sent and every response per client campaign
- Builds data on: which industries, titles, company sizes, and email angles convert
- Monthly AI review per client:
  - Suggests refined ICP based on what's working
  - Adapts email copy angles toward higher-converting approaches
- 3 ICP regeneration suggestions/month on K.I.N.D AI plan
- Unlimited on FIGSY Advanced
- ICP bot either suggests a refined version or asks 3 prompting questions to guide the client

---

### FIGSY — adaptive SDR behaviour
- Learning system — gets smarter with every campaign
- Reads its own results (reply rates, positive rates, opt-outs) and adjusts
- Handles the full outreach cycle up to positive reply
- On positive reply: hands off cleanly to client's sales rep
- No human SDR adapts this systematically — this is the product advantage

---

### Client portal upgrades — confirmed scope

**Usage dashboard:**
- Credits remaining / credits used this month
- Total emails sent / open rate / reply rate / positive reply rate
- Qualified leads this month vs last month
- ROI metric: emails sent per qualified lead

**Permissions:**
- Account owner (full access — billing, ICP, settings)
- Team member (view leads, cannot change billing or ICP)
- Read-only (view pipeline only)

**Notifications:**
- New qualified lead → instant email + in-app notification
- Credits running low (under 20% remaining) → email prompt to top up
- ICP regeneration ready → email
- Trial expiring → already built, keep

**Invoice and billing:**
- Billing history with downloadable invoices
- Current credit balance
- Top-up button (dropdown, bundles of 20)
- Upgrade / downgrade plan

**Languages:** Phase 2/3 — not now

---

### Website redesign — ClickUp style
- Dark, premium, animated
- Hero with product demo or animated screenshot
- "How it works" showing actual UI
- Social proof — logos, numbers, client quotes
- Feature sections with scroll animation
- Strong CTA contrast throughout
- **Build first in next phase** — before infrastructure, as the visual foundation
- Note: hero product screenshots will need updating once platform is fully live with real data

---

### Still open
- VA/Chatbot cards — remove prices entirely or keep $750/$499 with waitlist? *(decision pending)*
- Register jacquesfigsy.com for FIGSY personal outreach sending domain

---

*You are the CEO. The agents run everything else.*

### ICP for K.I.N.D outreach
- **Company size:** 1–200 employees (SMB to mid-market, no enterprise)
- **Title:** Founder, Owner, MD, CEO, Director
- **Pain point:** Too busy running the business to do consistent outreach — pipeline is empty or inconsistent
- **Sector:** Any
- **Geography:** Any (English-speaking first — UK, SA, Nigeria, Kenya, Australia, US)
- **Sending domain:** jacquesfigsy.com *(to register — do not use Gmail)*

---

### Agent roster

| Agent | Type | What it does |
|-------|------|-------------|
| FIGSY | Async — always on | Finds leads, writes personalised emails, follows up, books meetings |
| AE | Async + on-demand | Preps prospect briefs, sends proposals, chases to close |
| Solutions Engineer | On-demand | Handles technical pre-sales questions, scopes integrations |
| Customer Success | Async — always on | Monitors client health, flags churn risk, sends check-ins |
| Support | Async — always on | Handles hello@get-kind.com, resolves queries, escalates only what it can't solve |
| CMO | Weekly async report | Pipeline health, conversion tracking, content suggestions |
| CRO | On-demand | Diagnoses funnel drop-offs, recommends fixes |
| CTO | On-demand | That's Claude Code |

---

### Agent detail

**1 — FIGSY (Outreach)**
- Source: Apollo (same stack as client product)
- Finds SMB/mid-market founders globally matching K.I.N.D ICP
- Writes a unique personalised email per lead — role, company, industry
- Sends from jacquesfigsy.com
- Follows up twice with fresh angles
- Books meetings into your calendar
- You show up. That's it.

**2 — AE (Sales closer)**
- Triggered when FIGSY books a meeting
- Pre-call: pulls company data, identifies pain points, prepares a 1-page brief
- Post-call: sends follow-up email, proposal, and chases until closed or dead
- Escalates to you only for pricing decisions or unusual requests

**3 — Solutions Engineer**
- On-demand — triggered before or after technical prospect conversations
- Answers: "how does K.I.N.D integrate with X", "can it do Y", scopes custom requirements
- Feeds answers to AE for inclusion in proposals

**4 — Customer Success**
- Reads Supabase daily — monitors all active and trial client accounts
- Flags and acts on:
  - No ICP run in 7+ days → sends a check-in email
  - Trial expiring in 3 days → sends upgrade nudge
  - Order form not signed → reminds client
  - Low lead volume → suggests ICP refinement
- Escalates churn risk accounts to you with full context

**5 — Support**
- Monitors hello@get-kind.com continuously
- Reads query → checks knowledge base and FAQ → resolves if possible
- If resolved: replies directly from hello@get-kind.com
- If not: escalates to you with full thread summary and suggested response
- Target: resolve 80% of queries without you touching them

**6 — CMO**
- Runs every Monday morning, delivers a report to your inbox
- Covers: pipeline metrics, trial-to-paid conversion, what prospects are asking, suggested content
- On-demand for campaign ideas, positioning, or messaging questions

**7 — CRO**
- On-demand
- Input: a metric, a funnel stage, or a problem ("signups are up but trials aren't converting")
- Output: diagnosis + recommended fix with priority order

**8 — CTO**
- On-demand (Claude Code)
- Architecture, code, infrastructure, debugging

---

### Data sources the agents use
| Source | What it contains |
|--------|-----------------|
| Supabase | All client data — subscriptions, leads, ICPs, order forms |
| hello@get-kind.com | Client support queries, inbound leads |
| Apollo | Lead sourcing for FIGSY outreach |
| K.I.N.D admin portal | Content, order forms, terms library |

---

### Your day (once agents are running)
1. Morning: review overnight agent activity — meetings booked, support escalations, CS flags
2. Take the meetings FIGSY booked
3. Make the decisions agents escalated
4. That's largely it

---

### Build order for agent stack
*(After K.I.N.D platform infrastructure is live)*

1. **FIGSY for yourself** — register jacquesfigsy.com, configure sending, set your ICP, let it run
2. **Support agent** — wire hello@get-kind.com, build knowledge base, connect to Resend
3. **Customer Success agent** — connect to Supabase, define trigger rules, automated nudges
4. **AE agent** — prospect brief builder, proposal sender, follow-up sequence
5. **CMO agent** — weekly report, pipeline metrics, content suggestions
6. **Solutions Engineer + CRO** — on-demand, lower urgency

### Dependency
- jacquesfigsy.com domain must be registered and DNS verified before FIGSY can send
- All agents depend on K.I.N.D platform being fully live (Railway deployed, Resend verified)

---

## LEGAL & FINANCIAL SETUP — UK SOLE TRADER

### Legal structure
- Operating as a **UK sole trader** under the K.I.N.D brand
- Register as self-employed with HMRC: gov.uk/register-for-self-assessment (free, 10 min)
- Trade name: K.I.N.D — include full legal name on all invoices
- VAT registration not required until turnover exceeds £90,000/year
- Incorporate as Ltd when profits consistently exceed ~£50,000/year

### Banking
- **Starling Bank** or **Tide** — free UK business account, keep separate from personal
- **Wise Business** — multi-currency account (USD, ZAR, GBP) for receiving client payments at near-spot rates

### Getting paid
- Paystack handles ZAR billing for South African clients (already built into the platform)
- Paystack also covers Nigeria and Kenya
- Wise receives USD/ZAR transfers for clients outside Paystack coverage
- All invoices issued in USD — Paystack converts to local currency on the client's end

### Tax
- Pay Income Tax + National Insurance on **profits** (revenue minus expenses)
- File Self Assessment annually — deadline 31 January
- Set aside **25–30%** of every payment received for tax
- All tech costs are deductible: Railway, Vercel, Supabase, Apollo, Resend, Claude Code, domain, home office broadband/phone

### Deductible business expenses
| Expense | Monthly cost |
|---------|-------------|
| Supabase | $25 |
| Vercel | $20 |
| Railway | $10–20 |
| Apollo | $99 |
| Resend | $0–20 |
| Domain | $1.25 |
| Claude Code | $100–200 |

### Contracts
- Order form (built into the platform) is the service agreement — signed before billing starts
- Add UK address and full legal name to the order form footer before first client signs
- Order form covers: scope, payment terms, liability, POPIA/GDPR compliance

### When to go Ltd
- Once profits consistently exceed ~£50,000/year — Corporation Tax (19–25%) is cheaper than higher-rate Income Tax
- Also required if bringing on investors or co-founders

---

## DOMAINS

| Property | URL |
|----------|-----|
| Website | get-kind.com |
| Client portal | app.get-kind.com |
| Admin portal | admin.get-kind.com |
| Email | hello@get-kind.com |
| Brand | K.I.N.D — Knowledge. Intelligence. Networks. Delivered. |

---

## WHAT'S BUILT

### Website — get-kind.com
- [x] Full homepage — hero, products, FIGSY deep-dive, how it works, pricing, CTA, footer
- [x] Signup modal — email/password, forgot password, "Book a call" link
- [x] Dropdown nav — Products, Use Cases, Resources, Company, Pricing (smooth hover, Support only under Resources)
- [x] about.html — K.I.N.D acronym, founder story, values, POPIA/GDPR/CAN-SPAM compliance
- [x] pricing.html — monthly/yearly toggle (20% off yearly), FIGSY add-on tiers, FAQ
- [x] use-cases.html — 6 verticals (B2B Sales, Financial Services, Real Estate, Professional Services, SaaS, Recruitment)
- [x] support.html — contact cards, 10-question FAQ, client portal link
- [x] All domain references updated — get-kind.com / app.get-kind.com / hello@get-kind.com
- [x] VA price updated to $750/mo — waitlist CTA (coming soon)
- [x] Chatbot price updated to $499/mo — waitlist CTA (coming soon)
- [x] Local currency billing card (removed ZAR-specific language)
- [x] Hero eyebrow "AI Consulting · South Africa" removed

### Client Portal — app.get-kind.com
- [x] Login, signup, forgot password (email reset link)
- [x] Cross-domain auth fixed — signup on get-kind.com, session cookie set on app.get-kind.com via /auth/callback
- [x] Onboarding flow (/onboard) — company name, industry, user details
- [x] 14-day trial auto-starts on signup
- [x] Order form auto-created on signup — client can sign immediately, no admin action needed
- [x] Trial expiry hard gate — blocks dashboard when trial ends; billing and documents remain accessible
- [x] Onboarding banner — shows trial days remaining, prompts order form signature
- [x] Dashboard — leads pipeline, ICP builder, billing, documents, settings
- [x] ICP builder — Run ICP button calls Apollo, deduplicates, inserts scored leads (L1)
- [x] Lead table — status filters, AI email draft, CSV export, opt-out blocklist
- [x] Billing page — Lead Gen ($1/lead, $100/mo min), FIGSY bundle, VA, Chatbot; Paystack payment flow
- [x] Documents tab — order form signing
- [x] Welcome email via Resend fires on onboard

### Admin Portal — admin.get-kind.com
- [x] Client list
- [x] Order form builder
- [x] Terms library
- [x] Roadmap view

### API — Railway
- [x] Auth — signup creates trial subscription + order form + sends welcome email
- [x] ICP run endpoint — Apollo search with full ICP mapping, deduplication, lead insert
- [x] Subscriptions — usage-based tier handled correctly for Lead Gen and FIGSY
- [x] Apollo client — full ICP → Apollo param mapping (seniority, company size, geography, keywords)
- [x] All domain references updated to get-kind.com

### Infrastructure
- [x] A — DNS: GoDaddy records set (A @ → 216.198.79.1, CNAME www/app/admin → Vercel, Resend DNS records)
- [x] B — Vercel: get-kind.com + www (website), app.get-kind.com (portal), admin.get-kind.com (admin) — all valid. NEXT_PUBLIC_API_URL added to kind-portal.
- [x] C — Supabase: Site URL → get-kind.com, Redirect URLs → app.get-kind.com/auth/callback + app.get-kind.com/**, last_run_at SQL migration done
- [x] D — Railway: API deployed at kindapi-production-83cb.up.railway.app — all env vars set
- [x] E — Apollo: API key set in Railway
- [x] F — Paystack: Live secret key set in Railway, webhook → kindapi-production-83cb.up.railway.app/webhook/paystack
- [x] G — Resend: get-kind.com domain verified, API key set in Railway

### Business Documents
- [x] Run costs & cashflow model — docs/run-costs-and-cashflow.md
- [x] Master status document — docs/master-status.md
- [x] Client flow SOP (6 paths) — docs/client-flow-sop.md

---

## NEXT PHASES — CONFIRMED ORDER

| Phase | Name | Size | Status |
|-------|------|------|--------|
| Phase 2 | Referral Backend | Small | Not started |
| Phase 3 | Credit-Based Billing | Medium | Not started |
| Phase 4 | Portal Upgrades | Medium | Not started |
| Phase 5 | Smoke Test + Go-Live | Small | Not started |
| Phase 6 | FIGSY Outreach Engine | Large | Not started |
| Phase 7 | Founder Agent Stack | Large | Not started |

---

### Phase 2 — Referral Backend *(small, quick)*
- Store `referred_by` on client record when signup URL contains `?ref=<client_id>`
- On first ICP run by new client → credit both referrer and new client with 100 leads
- Show credit balance in portal dashboard header
- Referral banner already built in portal (frontend done)

---

### Phase 3 — Credit-Based Billing *(medium)*
Replace current subscription-based billing with credit bundles:
- Credit bundles of 20 purchased via Paystack (dropdown top-up, Manus-style)
- $1/credit for K.I.N.D AI (Lead Gen), $3/credit for FIGSY Advanced
- 1 credit consumed on positive reply only (not on lead delivery)
- Credit balance shown in dashboard header
- Outreach pauses at 0 credits; 7-day warning before suspension
- No refunds on spent credits
- Replace billing page with new credit purchase UI

---

### Phase 4 — Portal Upgrades *(medium)*
- Usage dashboard: credits remaining, emails sent, reply rate, positive reply rate, ROI metric
- Permissions: owner / team member / read-only roles
- Notifications: qualified lead alert, low credits, ICP ready, trial expiring
- Billing history with downloadable invoices
- Credit top-up flow inline in portal
- Upgrade / downgrade plan

---

### Phase 5 — Smoke Test + Go-Live *(before first real client)*
End-to-end test flow:
1. Sign up → confirm email → onboard
2. Build ICP → run ICP → leads appear
3. Sign order form (Documents tab)
4. Billing → Paystack checkout → payment confirmed
5. Credits appear in dashboard
6. Fix anything that breaks before a real client touches it

---

### Phase 6 — FIGSY Outreach Engine *(large)*
The core product — autonomous 3-sequence email outreach:
- **Day 1, Day 4, Day 9** emails sent from client's email via Resend
- Reply classification: positive / negative / no reply (Claude-powered)
- Positive reply → 1 credit consumed, lead flagged as qualified, client notified
- Negative / no reply → lead opted out after sequence ends, no credit used
- Unsubscribe link in every email (POPIA/GDPR requirement)
- Centralised reply inbox per client in portal
- ICP learning loop — monthly AI review, auto-refine ICP from reply data
- 3 ICP regenerations/month on K.I.N.D AI, unlimited on FIGSY Advanced

---

### Phase 7 — Founder Agent Stack *(for running K.I.N.D's own business)*
- Register `jacquesfigsy.com` sending domain
- FIGSY running K.I.N.D's own outbound (ICP: SMB founders, UK/SA/Nigeria/Kenya)
- Support agent monitoring `hello@get-kind.com`
- Customer success agent (trial nudges, onboarding check-ins, churn flags)
- AE agent (prospect briefs, proposal drafting, follow-up)

---

## WHAT STILL NEEDS TO BE DONE

### SECTION A — INFRASTRUCTURE (remaining)

---

**E — APOLLO** *(5 min)*

- apollo.io → Settings → Integrations → API → Create key
- Paste as `APOLLO_API_KEY` in Railway

---

**F — PAYSTACK** *(10 min)*

- paystack.com → Settings → API Keys → copy Live Secret Key
- Paste as `PAYSTACK_SECRET_KEY` in Railway
- Webhooks → Add: `https://your-railway-url.up.railway.app/webhook/paystack`

---

**G — RESEND** *(15 min)*

- resend.com → Domains → Add domain: `get-kind.com`
- Add the DNS records they provide to GoDaddy
- Wait for green verification tick
- API Keys → Create key
- Paste as `RESEND_API_KEY` in Railway

---

**B — VERCEL — Add API env var** *(5 min — after Railway is live)*

- kind-portal project → Settings → Environment Variables
- Add: `NEXT_PUBLIC_API_URL=https://your-railway-url`
- Redeploy the portal (this will fix the server-side exception error)

---

**H — UPLOAD T&CS** *(your content)*

- Admin portal → Terms Library
- Upload: MSA, POPIA policy, service terms as PDFs
- These appear inside every client's order form before they sign

---

**I — SMOKE TEST** *(before any real client)*

Run through this exact flow before giving the URL to anyone:

1. Visit get-kind.com → click Start free trial
2. Sign up with a test email
3. Confirm email → should land on app.get-kind.com/onboard
4. Complete onboard → check Supabase: `subscriptions` row + `order_forms` row both created
5. Documents tab → sign the order form
6. ICP builder → create ICP → click Run ICP → leads appear in pipeline
7. Billing → click Get started → Paystack opens in ZAR
8. If anything fails, fix before a real client touches it

---

### SECTION B — CODE (next build sessions, in recommended order)

---

**CRM CONNECTOR** *(build first — before L2)*

What: Before inserting Apollo leads, check the client's CRM (HubSpot, Salesforce, Pipedrive). If the contact already exists there, skip it — don't deliver it, don't charge for it.

Why: Protects clients from paying for leads they already have. Critical for trust.

Depends on: Nothing — can build now.

---

**L2 — POPIA CONSENT EMAIL**

What: Before a lead is moved to `approved` status and delivered to the client pipeline, send the lead a consent email via Resend. Include an opt-out link. Only promote to approved if they consent. Opt-out updates the shared blocklist immediately and permanently.

Why: Legal requirement for South African outreach. Also applies to GDPR (EU) and CAN-SPAM (US). Without this, leads are delivered without documented consent.

Depends on: Resend live (step G above).

---

**L3 — AI LEAD SCORING**

What: Claude (Haiku) scores each lead 0–100 against the client's ICP automatically on insert. Factors: job title match, seniority, company size, industry alignment, geography. Currently leads arrive with no score.

Why: Clients need to prioritise who to contact first. Score drives pipeline value.

Depends on: Anthropic API key in Railway (step D above).

Cost: ~$0.0004 per lead scored — negligible.

---

**L4 — USAGE COUNTER**

What: Track the number of leads delivered per client per billing month. Feed this count into the Paystack billing calculation. Without this, billing above the $100/mo minimum ($1/lead) cannot happen automatically.

Why: Core to the business model — $1/lead above 100 leads cannot be charged without knowing how many leads were delivered.

Depends on: L2 or L3 done first (leads need status = approved before counting).

---

**F1 — FIGSY OUTREACH ENGINE**

What: Autonomous AI SDR. Picks up each scored, approved lead. Writes a unique personalised email per lead (role, company, industry — not a template). Sends from client's domain. Reads the reply. Follows up twice with fresh angles. Books meeting when lead is ready. Client gets a notification and shows up.

Why: The highest-value product in the stack. Unlocks the Lead Gen + FIGSY bundle at $3/lead.

Depends on: L2 (consent), L3 (scoring), L4 (usage tracking) all done first.

---

**Recommended build order:**

```
CRM Connector → L2 (POPIA consent) → L3 (AI scoring) → L4 (usage billing) → F1 (FIGSY)
```

---

## CLIENT FLOW — START TO FINISH

For reference: what a client experiences once everything above is live.

1. Finds get-kind.com → clicks Start free trial
2. Signs up → confirms email → lands on app.get-kind.com/onboard
3. Completes onboarding (company name, industry)
4. Banner: "14 days left — sign your Service Agreement"
5. Documents → reads and signs order form
6. Leads → Build ICP → sets target (industry, title, size, geography)
7. Clicks Run ICP → leads appear within minutes
8. *(L2)* Leads receive consent email — approved leads surface in pipeline
9. *(L3)* Each lead has an AI score 0–100
10. *(F1)* FIGSY picks up leads and starts outreach automatically
11. Trial ends → Billing → chooses plan → Paystack processes payment
12. Live — paying client, pipeline running

---

*Document owner: K.I.N.D founding team*
*Update this document after each build session.*

---

## DOMAINS

| Property | URL |
|----------|-----|
| Website | get-kind.com |
| Client portal | app.get-kind.com |
| Admin portal | admin.get-kind.com |
| Email | hello@get-kind.com |
| Brand | K.I.N.D — Knowledge. Intelligence. Networks. Delivered. |

---

## WHAT'S BUILT

### Website — get-kind.com
- [x] Full homepage — hero, products, FIGSY deep-dive, how it works, pricing, CTA, footer
- [x] Signup modal — email/password, forgot password, "Book a call" link
- [x] Dropdown nav — Products, Use Cases, Resources, Company, Pricing
- [x] about.html — K.I.N.D acronym, founder story, values, POPIA/GDPR/CAN-SPAM compliance
- [x] pricing.html — monthly/yearly toggle (20% off yearly), FIGSY add-on tiers, FAQ
- [x] use-cases.html — 6 verticals (B2B Sales, Financial Services, Real Estate, Professional Services, SaaS, Recruitment)
- [x] support.html — contact cards, 10-question FAQ, client portal link
- [x] All domain references updated — get-kind.com / app.get-kind.com / hello@get-kind.com

### Client Portal — app.get-kind.com
- [x] Login, signup, forgot password (email reset link)
- [x] Cross-domain auth fixed — signup on get-kind.com, session cookie set on app.get-kind.com via /auth/callback
- [x] Onboarding flow (/onboard) — company name, industry, user details
- [x] 14-day trial auto-starts on signup
- [x] Order form auto-created on signup — client can sign immediately, no admin action needed
- [x] Trial expiry hard gate — blocks dashboard when trial ends; billing and documents remain accessible
- [x] Onboarding banner — shows trial days remaining, prompts order form signature
- [x] Dashboard — leads pipeline, ICP builder, billing, documents, settings
- [x] ICP builder — Run ICP button calls Apollo, deduplicates, inserts scored leads (L1)
- [x] Lead table — status filters, AI email draft, CSV export, opt-out blocklist
- [x] Billing page — Lead Gen ($1/lead, $100/mo min), FIGSY bundle, VA, Chatbot; Paystack payment flow
- [x] Documents tab — order form signing
- [x] Welcome email via Resend fires on onboard

### Admin Portal — admin.get-kind.com
- [x] Client list
- [x] Order form builder
- [x] Terms library
- [x] Roadmap view

### API — Railway
- [x] Auth — signup creates trial subscription + order form + sends welcome email
- [x] ICP run endpoint — Apollo search with full ICP mapping, deduplication, lead insert
- [x] Subscriptions — usage-based tier handled correctly for Lead Gen and FIGSY
- [x] Apollo client — full ICP → Apollo param mapping (seniority, company size, geography, keywords)
- [x] All domain references updated to get-kind.com

### Business Documents
- [x] Run costs & cashflow model — docs/run-costs-and-cashflow.md

---

## WHAT STILL NEEDS TO BE DONE

### SECTION A — INFRASTRUCTURE (you do these on each platform dashboard)

---

**A — DNS** *(your domain registrar — get-kind.com · 10 min)*

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| A | @ | 76.76.21.21 | Root domain → Vercel |
| CNAME | www | cname.vercel-dns.com | Website |
| CNAME | app | cname.vercel-dns.com | Client portal |
| CNAME | admin | cname.vercel-dns.com | Admin portal |

---

**B — VERCEL** *(15 min)*

Portal project (kind-portal):
- Add domain: `app.get-kind.com`
- Add env var: `NEXT_PUBLIC_API_URL=https://your-railway-url` (after Railway is live)
- Redeploy after adding env var

Website project (static):
- Framework: Other
- Root directory: `apps/website`
- Build command: `echo 'static'`
- Output directory: `.`
- Add domains: `get-kind.com` and `www.get-kind.com`

Admin project (kind-admin):
- Add domain: `admin.get-kind.com`

---

**C — SUPABASE** *(5 min)*

Authentication → URL Configuration:
- Site URL: `https://get-kind.com`
- Redirect URLs — ADD:
  - `https://app.get-kind.com/auth/callback`
  - `https://app.get-kind.com/**`

SQL Editor — run:
```sql
alter table public.icps add column if not exists last_run_at timestamptz;
```

---

**D — RAILWAY — Deploy the API** *(20 min)*

- New project → deploy from GitHub → jacquesvieiraza-blip/KIND
- Root directory: `apps/api`
- Build command: `yarn install && yarn build`
- Start command: `node dist/index.js`
- Generate domain (copy this URL — needed for Vercel NEXT_PUBLIC_API_URL and Paystack webhook)

Add all environment variables:

| Variable | Value | Where to get it |
|----------|-------|----------------|
| SUPABASE_URL | https://lwtadfdaoyvjmjhrfkgs.supabase.co | Supabase → Settings → API |
| SUPABASE_ANON_KEY | eyJhbGci... | Supabase → Settings → API |
| SUPABASE_SERVICE_ROLE_KEY | (secret) | Supabase → Settings → API → service_role |
| DATABASE_URL | (postgres URI) | Supabase → Settings → Database → URI |
| APOLLO_API_KEY | (from step E) | apollo.io |
| PAYSTACK_SECRET_KEY | (from step F) | paystack.com |
| PORTAL_URL | https://app.get-kind.com | Fixed |
| RESEND_API_KEY | (from step G) | resend.com |
| ANTHROPIC_API_KEY | (from console) | console.anthropic.com |

---

**E — APOLLO** *(5 min)*

- apollo.io → Settings → Integrations → API → Create key
- Paste as `APOLLO_API_KEY` in Railway

---

**F — PAYSTACK** *(10 min)*

- paystack.com → Settings → API Keys → copy Live Secret Key
- Paste as `PAYSTACK_SECRET_KEY` in Railway
- Webhooks → Add: `https://your-railway-url.up.railway.app/webhook/paystack`

---

**G — RESEND** *(15 min)*

- resend.com → Domains → Add domain: `get-kind.com`
- Add the DNS records they provide to your domain registrar
- Wait for green verification tick
- API Keys → Create key
- Paste as `RESEND_API_KEY` in Railway

---

**H — UPLOAD T&CS** *(your content)*

- Admin portal → Terms Library
- Upload: MSA, POPIA policy, service terms as PDFs
- These appear inside every client's order form before they sign

---

**I — SMOKE TEST** *(before any real client)*

Run through this exact flow before giving the URL to anyone:

1. Visit get-kind.com → click Start free trial
2. Sign up with a test email
3. Confirm email → should land on app.get-kind.com/onboard
4. Complete onboard → check Supabase: `subscriptions` row + `order_forms` row both created
5. Documents tab → sign the order form
6. ICP builder → create ICP → click Run ICP → leads appear in pipeline
7. Billing → click Get started → Paystack opens in ZAR
8. If anything fails, fix before a real client touches it

---

### SECTION B — CODE (next build sessions, in recommended order)

---

**CRM CONNECTOR** *(build first — before L2)*

What: Before inserting Apollo leads, check the client's CRM (HubSpot, Salesforce, Pipedrive). If the contact already exists there, skip it — don't deliver it, don't charge for it.

Why: Protects clients from paying for leads they already have. Critical for trust.

Depends on: Nothing — can build now.

---

**L2 — POPIA CONSENT EMAIL**

What: Before a lead is moved to `approved` status and delivered to the client pipeline, send the lead a consent email via Resend. Include an opt-out link. Only promote to approved if they consent. Opt-out updates the shared blocklist immediately and permanently.

Why: Legal requirement for South African outreach. Also applies to GDPR (EU) and CAN-SPAM (US). Without this, leads are delivered without documented consent.

Depends on: Resend live (step G above).

---

**L3 — AI LEAD SCORING**

What: Claude (Haiku) scores each lead 0–100 against the client's ICP automatically on insert. Factors: job title match, seniority, company size, industry alignment, geography. Currently leads arrive with no score.

Why: Clients need to prioritise who to contact first. Score drives pipeline value.

Depends on: Anthropic API key in Railway (step D above).

Cost: ~$0.0004 per lead scored — negligible.

---

**L4 — USAGE COUNTER**

What: Track the number of leads delivered per client per billing month. Feed this count into the Paystack billing calculation. Without this, billing above the $100/mo minimum ($1/lead) cannot happen automatically.

Why: Core to the business model — $1/lead above 100 leads cannot be charged without knowing how many leads were delivered.

Depends on: L2 or L3 done first (leads need status = approved before counting).

---

**F1 — FIGSY OUTREACH ENGINE**

What: Autonomous AI SDR. Picks up each scored, approved lead. Writes a unique personalised email per lead (role, company, industry — not a template). Sends from client's domain. Reads the reply. Follows up twice with fresh angles. Books meeting when lead is ready. Client gets a notification and shows up.

Why: The highest-value product in the stack. Unlocks the Lead Gen + FIGSY bundle at $3/lead.

Depends on: L2 (consent), L3 (scoring), L4 (usage tracking) all done first.

---

**Recommended build order:**

```
CRM Connector → L2 (POPIA consent) → L3 (AI scoring) → L4 (usage billing) → F1 (FIGSY)
```

---

## CLIENT FLOW — START TO FINISH

For reference: what a client experiences once everything above is live.

1. Finds get-kind.com → clicks Start free trial
2. Signs up → confirms email → lands on app.get-kind.com/onboard
3. Completes onboarding (company name, industry)
4. Banner: "14 days left — sign your Service Agreement"
5. Documents → reads and signs order form
6. Leads → Build ICP → sets target (industry, title, size, geography)
7. Clicks Run ICP → leads appear within minutes
8. *(L2)* Leads receive consent email — approved leads surface in pipeline
9. *(L3)* Each lead has an AI score 0–100
10. *(F1)* FIGSY picks up leads and starts outreach automatically
11. Trial ends → Billing → chooses plan → Paystack processes payment
12. Live — paying client, pipeline running

---

*Document owner: K.I.N.D founding team*
*Update this document after each build session.*

---

## MARKET EXPANSION PLAN — US & UK

> **Trigger: after 5 paying SA clients. Do not action before then.**
> Full phased plan in `docs/KIND_Roadmap.md` → section: Market Expansion

**Phase 1 — SA only (now → client 5):** Nothing changes. Prove the model.

**Phase 2 — Dual market (after client 5):**
- Pricing: USD front, ZAR secondary
- Hero: "Built in Africa. Ready for the world."
- Trust page: POPIA + GDPR + CAN-SPAM all three
- Add Stripe for USD/GBP (Paystack stays for ZAR)
- 2 new US comparison pages (`vs-outreach.html`, `vs-salesloft.html`)

**Phase 3 — Data residency (post Phase 2):** Assess per enterprise demand. SOC 2 Q1 2027.

---

## THINGS TO REMEMBER — PENDING ACTIONS

> Items Jacques needs to action or provide. Updated each session.

| # | Item | Status |
|---|---|---|
| 1 | **Drop Milla + Vida character images** into `apps/website/` as `milla.png` and `vida.png` | Pending — tomorrow |
| 2 | Set Railway env vars: FOUNDER_EMAIL, FIGSY_DAILY_SEND_LIMIT=20, FIGSY_REPLY_TO | Pending |
| 3 | Supabase: set Site URL + redirect URL for auth | Pending |
| 4 | Paystack webhook registration | Pending |
| 5 | Run DB migrations 002–005 in Supabase SQL editor | Pending |
| 6 | Resend: configure inbound routing for replies@ | Pending |
| 7 | Set up 6 Railway cron jobs | Pending |
| 8 | Merge branch `claude/ai-business-roadmap-U3OWJ` → main + deploy | Pending |
| 9 | G2 / Capterra / Product Hunt listing on launch day | Pending |
| 10 | Meta WhatsApp Business API application | Pending |
| 11 | Vapi.ai account + Twilio SA +27 number | Pending |

---

## AGENT NAMING (LOCKED)

| Agent | Named after | Role | Status |
|---|---|---|---|
| FIGSY | The founder | AI SDR — outbound, follow-up, meeting booking | Live |
| Milla | Founder's daughter | Virtual Assistant — answers questions, drafts proposals | July 2026 |
| Vida | Founder's daughter | Chatbot — website + WhatsApp inbound qualifier | July 2026 |
