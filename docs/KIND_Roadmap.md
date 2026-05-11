# KIND Product Roadmap
**Target launch: 31 May 2026**
**Last updated: 11 May 2026**

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| ✅ | Built and in codebase |
| 🔧 | Built but not yet deployed / activated |
| ⏳ | Partially built — needs completion |
| ❌ | Not started |

---

## PRIORITY 0 — Launch Blocker (Do Today)

These are blocking everything. Nothing in the portal works correctly until these are done.

| # | Task | Status | Notes |
|---|------|--------|-------|
| P0-1 | Run Supabase migration: Week 3 tables (client_messages, client_documents, lead_topups) | 🔧 | SQL written — needs to be run in Supabase SQL Editor |
| P0-2 | Run Supabase migration 004: order_forms + terms_documents tables | 🔧 | SQL at `packages/db/src/migrations/004_order_forms.sql` |
| P0-3 | Vercel kind-portal: add `API_URL=https://kindapi-production.up.railway.app`, remove `NEXT_PUBLIC_API_URL` | 🔧 | Fixes "Unexpected token" / "Failed to fetch" errors permanently |
| P0-4 | Vercel kind-admin: add `SUPABASE_SERVICE_ROLE_KEY`, confirm `ADMIN_SECRET` and `API_URL` | 🔧 | Fixes admin dashboard showing 0 clients |
| P0-5 | Redeploy kind-portal on Vercel | 🔧 | After P0-3 |
| P0-6 | Redeploy kind-admin on Vercel | 🔧 | After P0-4 |
| P0-7 | Redeploy Railway API | 🔧 | Picks up CORS fix, website validation fix, order-forms routes |
| P0-8 | Upload 5 T&C PDFs to Terms Library in admin portal | 🔧 | Go to kind-admin → Terms Library → upload each PDF with correct type |
| P0-9 | Full flow test: settings save → ICP → messages → order form → sign | 🔧 | After all above |

---

## PRIORITY 1 — Immediate (This Week)

### 1A — Lead-Capture Landing Page (Highest business priority)

Goal: get 100 interest sign-ups before 31 May. This needs to go live as soon as possible.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1-1 | Build standalone HTML lead-capture landing page | ❌ | Lead Gen + FIGSY focus. Interest form → sends to jacqueskind01@gmail.com |
| 1-2 | Host the landing page | ❌ | Options: Vercel static, Netlify, or GitHub Pages — decide and deploy |
| 1-3 | Write copy: lead gen + FIGSY value props | ❌ | Based on what the products actually do |
| 1-4 | Add animated/visual section explaining FIGSY | ❌ | Can be CSS animation initially; proper video later |

### 1B — Remove AI Consulting

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1-5 | Remove Consulting from portal product cards | ❌ | Dashboard page, sidebar, any mentions |
| 1-6 | Remove Consulting from subscription/pricing options | ❌ | API and portal |
| 1-7 | Remove Consulting from SOP and any docs | ❌ | Update `docs/KIND_SOP.md` |

---

## PRIORITY 2 — Pre-Launch Core (This Week / Next Week)

### 2A — FIGSY: Define the Product

FIGSY is KIND's AI SDR/BDR meeting-booking agent. Reference: Alta HQ's "Katie" (altahq.com).

**FIGSY Starter** should include:
- Personalised outreach email sequences (AI-generated per lead profile)
- Automated follow-up (3-touch sequence)
- Reply handling — detects interest, flags hot leads
- Calendar booking link injection
- 200 contacts/month
- Email channel only

**FIGSY Pro** should include:
- Everything in Starter
- Multi-channel: email + LinkedIn touch
- AI reply handling with natural responses (not just detection)
- Direct calendar integration (Google/Outlook) — books meetings automatically
- Opt-out management and blocklist
- CRM sync (push booked meetings back to client CRM)
- Reporting: open rate, reply rate, meetings booked, pipeline value
- 1,000 contacts/month

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2-1 | Finalise FIGSY Starter vs Pro feature definitions | ❌ | Use above as starting point — confirm with you |
| 2-2 | Define FIGSY pricing tiers (confirm USD amounts) | ❌ | Proposed: Starter $200/mo add-on, Pro $500/mo add-on; Bundle pricing as per NB doc |
| 2-3 | Design FIGSY in portal (what does the client dashboard look like) | ❌ | Reference: Visily design you created |

### 2B — FIGSY: Build Phase 1 (MVP)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2-4 | DB schema: figsy_campaigns, figsy_contacts, figsy_sequences, figsy_replies | ❌ | Campaign → contacts → sequence steps → reply tracking |
| 2-5 | AI email generation: generate personalised outreach per lead profile | ❌ | Uses lead's name, company, industry, role from lead record |
| 2-6 | Sequence engine: schedule and send multi-touch email sequences | ❌ | Step 1 → wait → Step 2 → wait → Step 3 |
| 2-7 | Reply detection: classify replies (interested / not interested / opt-out / bounce) | ❌ | AI classification on inbound reply |
| 2-8 | Opt-out handling: flag contact, add to blocklist, never contact again | ❌ | Permanent across all clients |
| 2-9 | Meetings booked tracking: client logs meeting outcome against a contact | ❌ | Manual initially; auto-booking in Phase 2 |
| 2-10 | FIGSY dashboard in client portal: campaigns, contacts, sequence status, meetings booked | ❌ | |
| 2-11 | FIGSY dashboard in admin portal: see all campaigns across clients | ❌ | |

### 2C — FIGSY: Build Phase 2 (Full Automation)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2-12 | Direct calendar integration (Google Calendar / Outlook) | ❌ | OAuth flow, availability check, auto-book |
| 2-13 | CRM sync: push booked meetings back to client's CRM | ❌ | Needs CRM connector (see Lead Gen CRM work) |
| 2-14 | AI reply handling: generate natural responses to interested leads | ❌ | Move from detection to active reply |
| 2-15 | FIGSY animated explainer video | ❌ | Show how the agent works end-to-end |

---

## PRIORITY 3 — Lead Generation Upgrades

### 3A — CRM Integration

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3-1 | CRM connector framework: support HubSpot, Salesforce, Pipedrive (most common in SA/Africa) | ❌ | OAuth or API key connection per client |
| 3-2 | Pre-delivery deduplication: before delivering a lead, check if contact exists in client's CRM | ❌ | Client only pays for net-new leads |
| 3-3 | CRM sync: push delivered leads into client's CRM | ❌ | |

### 3B — Consent & Compliance Layer

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3-4 | Apollo consent filter: surface only leads who have consented on Apollo | ❌ | Quick wins — don't wait for KIND's own consent collection |
| 3-5 | Opt-out blocklist: permanent cross-client blocklist of people who've asked not to be contacted | ✅ (partial) | Currently per-client via consent_log; needs to become global |
| 3-6 | Opt-out triggered by FIGSY reply: auto-add to blocklist when reply says "unsubscribe" / "stop" | ❌ | Tied to 2-8 |
| 3-7 | GDPR compliance: add GDPR lawful basis tracking to lead records | ❌ | Legitimate interest, consent, etc. |
| 3-8 | US privacy law: CAN-SPAM compliance for email outreach | ❌ | Physical address in footer, opt-out mechanism |

### 3C — ICP & Lead Quality

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3-9 | Strengthen ICP form: add more signal fields (tech stack, funding stage, headcount growth, recent hiring) | ❌ | More precise targeting = better leads |
| 3-10 | ICP scoring: score each lead against ICP fields (not just binary match) | ⏳ | Basic scoring exists; needs to use more fields |

### 3D — Outreach & Pipeline

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3-11 | AI-personalised email drafts: generate outreach email per lead using their profile data | ❌ | Per lead, not one template blast |
| 3-12 | Pipeline revenue tracking: attach expected deal value to a lead, roll up to client pipeline view | ❌ | Client sees total pipeline value, not just lead count |

---

## PRIORITY 4 — Compliance & Legal Documents

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4-1 | Add GDPR clauses to MSA and POPIA Compliant Process document | ❌ | Update the actual PDF agreements |
| 4-2 | Add US privacy law (CAN-SPAM, CCPA basics) to T&C documents | ❌ | |
| 4-3 | Add data hosting disclosure to privacy policy (Supabase / Railway / Vercel — where data lives) | ❌ | Required for GDPR and trust |
| 4-4 | Update Terms Library in admin portal with revised document versions | ❌ | After 4-1 and 4-2 |

---

## PRIORITY 5 — Portal & Platform (Outstanding Fixes)

These are built but have known issues or gaps:

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5-1 | Messages tab: confirm client_messages table is migrated and working end-to-end | 🔧 | Depends on P0-1 |
| 5-2 | Settings page: confirm saving works after P0-3 deployment | 🔧 | Fix is in codebase; needs deployment |
| 5-3 | ICP Generate button: confirm shows for draft + approved after deployment | 🔧 | Fix is in codebase; needs deployment |
| 5-4 | Admin dashboard: confirm client count shows after P0-4 | 🔧 | Needs SUPABASE_SERVICE_ROLE_KEY |
| 5-5 | Billing page in client portal: wire up Paystack payment initiation | ⏳ | Backend exists; portal billing page is placeholder |
| 5-6 | Trial countdown: confirm banner shows correct days remaining | 🔧 | Needs deployment |
| 5-7 | Order form: end-to-end test after Supabase migration 004 runs | 🔧 | |

---

## PRIORITY 6 — Website Redesign

| # | Task | Status | Notes |
|---|------|--------|-------|
| 6-1 | Navigation redesign: Products dropdown (each product → own landing page), Use Cases, Resources, Company | ❌ | Reference: myclaw.ai structure |
| 6-2 | Company dropdown: "What KIND means", team, mission — our version of OpenClaw's company section | ❌ | |
| 6-3 | Product landing pages: dedicated page per product (Lead Gen, FIGSY, Chatbot, VA) | ❌ | Each with features, use cases, pricing |
| 6-4 | Yearly pricing option with discount across all products | ❌ | Suggest 2 months free (equivalent to ~17% off) |
| 6-5 | Pricing page: all products, all tiers, monthly + annual toggle | ❌ | |
| 6-6 | Privacy page: data hosting disclosure, GDPR, POPIA, US | ❌ | Where data lives, retention periods |
| 6-7 | Content accuracy audit: every feature claim must match what the product actually does | ❌ | Don't promise what isn't built |
| 6-8 | Africa-first + global messaging: position KIND for Africa with global reach | ❌ | |

---

## PRIORITY 7 — Marketing & Content

| # | Task | Status | Notes |
|---|------|--------|-------|
| 7-1 | FIGSY animated explainer: short video showing how FIGSY finds leads, runs outreach, books meetings | ❌ | Can use tools like Lottie/CSS for web, or commission |
| 7-2 | AI people talking about KIND products: testimonial-style video content | ❌ | Tools like HeyGen, Synthesia |
| 7-3 | Marketing content calendar: LinkedIn, social posts pre-launch | ❌ | |
| 7-4 | Email sequence for interest sign-ups: nurture the 100 leads captured from landing page | ❌ | |

---

## What's Already Built (Done)

| Item | Status |
|------|--------|
| Server-side proxy (fixes NEXT_PUBLIC_ baking problem permanently) | ✅ |
| CORS multi-origin support | ✅ |
| Settings page save fix (try/catch, website Zod validation) | ✅ |
| ICP Generate button for draft + approved status | ✅ |
| ICP builder error states (saveError, submitError visible to user) | ✅ |
| Order Form system: create, send, sign with T&C viewer | ✅ |
| Three-gate dashboard banners (sign → pay → trial) | ✅ |
| Terms Library in admin portal (upload once, appears on all forms) | ✅ |
| Order Form tab on admin client detail (default tab) | ✅ |
| ECTA-compliant signing: name + checkbox + timestamp + IP | ✅ |
| Client messages (admin ↔ client portal) | ✅ |
| Admin dashboard stats with service role key | ✅ |
| Lead gen: ICP create, generate, score, POPIA consent | ✅ |
| Paystack subscription + webhook handling | ✅ |
| Lead top-up purchasing | ✅ |
| Trial subscription on onboard (14-day) | ✅ |
| Document upload/download (client + admin) | ✅ |
| Chatbot config, conversations, knowledge documents | ✅ |
| Virtual assistant (basic) | ✅ |
| Roadmap / consulting page | ✅ |
| Admin ICP review (approve / reject / review notes) | ✅ |
| Supabase RLS on all tables | ✅ |
| SOP document | ✅ |

---

## Suggested Build Order to Hit 31 May

| Week | Focus | Goal |
|------|-------|------|
| **Now (11–12 May)** | P0 deployments + landing page | System live + interest capture running |
| **13–16 May** | FIGSY definition + MVP build start | Campaigns, sequences, AI email gen |
| **17–21 May** | FIGSY MVP complete + Lead Gen upgrades | Opt-out, consent filter, pipeline tracking |
| **22–25 May** | Portal polish + billing page + compliance | Full working demo for clients |
| **26–28 May** | Website + pricing page + landing page final | Everything live and accurate |
| **29–30 May** | Testing, bug fixes, marketing push | 100 interest sign-ups target |
| **31 May** | Launch | Go live |

---

*This document is the single source of truth for the KIND build roadmap. Updated as items are completed.*
