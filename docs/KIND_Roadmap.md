# KIND AI Platform — Master Roadmap
**Launch date: 31 May 2026 · Updated: 11 May 2026 · Days remaining: 20**

> Single source of truth. Two goals, in order:
> **Goal 1 — Fully functional Lead Gen live by 31 May 2026**
> **Goal 2 — FIGSY launch (immediately after Lead Gen is stable)**

---

## What is already built

| Area | Status | Notes |
|------|--------|-------|
| Monorepo scaffold — portal, admin, API, DB, shared | ✅ Built | |
| Supabase auth — login + onboard | ✅ Built | |
| Paystack billing — subscribe + webhook | ✅ Built | Plan codes need setting in env vars |
| Admin dashboard — MRR, client count, progress | ✅ Built | |
| Portal dashboard home — stat cards, product grid | ✅ Built | |
| Settings page — business profile edit | ✅ Built | |
| Billing page — plan selection + Paystack redirect | ✅ Built | |
| Admin roadmap page | ✅ Built | Needs updating once FIGSY + pricing is confirmed |
| Portal roadmap page | ✅ Built | Needs updating once FIGSY + pricing is confirmed |
| Shared types, constants, DB client package | ✅ Built | Needs Consulting removed, FIGSY added |
| DB schema — `clients` table only | ⚠️ Partial | 5 more tables needed before anything else works |
| Lead Gen page | ❌ Stub | Shows "Week 2 Build" placeholder |
| Virtual Assistant page | ❌ Stub | Shows placeholder |
| Chatbot Agent page | ❌ Stub | Shows placeholder |
| FIGSY | ❌ Not started | Does not exist anywhere in the codebase |

---

## GOAL 1 — Fully functional Lead Gen by 31 May

### What "fully functional" means for launch day

Lead Gen is done when a paying client can:
1. Build an ICP (define who they want to reach)
2. See a lead pipeline with scores
3. Send POPIA consent requests and track responses
4. Export consented leads as CSV
5. See their stats (total leads, avg score, consented count, exported count)
6. Block a lead permanently if they opt out

These 6 things are the definition of done. Everything below is grouped by whether it is **required for 31 May** or **post-launch**.

---

### STEP 1 — Infrastructure (must be done first, blocks everything)

| # | Task | Who | Notes |
|---|------|-----|-------|
| S1-1 | Complete DB schema — write all missing tables | Code | `subscriptions`, `icps`, `leads`, `opt_out_blocklist`, `assistant_messages`, `chatbot_configs`, `usage_metrics`. File: `packages/db/src/schema.sql` |
| S1-2 | Run Supabase migrations | You | Paste schema into Supabase SQL editor and run |
| S1-3 | Set Vercel env vars — portal | You | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` |
| S1-4 | Set Vercel env vars — admin | You | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| S1-5 | Set Railway env vars — API | You | All from `apps/api/.env.example` including all Paystack plan codes |
| S1-6 | Configure Paystack webhook URL | You | Point to `https://api.yourdomain.com/webhooks/paystack` in Paystack dashboard |
| S1-7 | Test auth flow end-to-end | You | Sign up → onboard → dashboard → billing |

---

### STEP 2 — Remove Consulting (clean up before building)

| # | Task | File |
|---|------|------|
| S2-1 | Remove `consulting` from `PRODUCTS` constant | `packages/shared/src/constants/index.ts` |
| S2-2 | Remove `consulting` from `ProductType` | `packages/shared/src/types/index.ts` |
| S2-3 | Remove Consulting card from portal dashboard | `apps/portal/src/app/(dashboard)/dashboard/page.tsx` |
| S2-4 | Remove Consulting from billing page | `apps/portal/src/app/(dashboard)/dashboard/billing/page.tsx` |
| S2-5 | Remove Consulting from admin product catalog | `apps/admin/src/app/page.tsx` |
| S2-6 | Remove Consulting from portal + admin roadmap pages | Both roadmap pages |

---

### STEP 3 — Lead Gen core (required for 31 May — build in this order)

#### S3-A: API routes

| # | Task | File | Notes |
|---|------|------|-------|
| S3-A1 | ICP routes — GET /icps, POST /icps, PATCH /icps/:id, DELETE /icps/:id | `apps/api/src/routes/icps.ts` | Full CRUD |
| S3-A2 | Extend leads routes — GET with filters, POST (create lead), PATCH status/consent, GET stats | `apps/api/src/routes/leads.ts` | Stats endpoint already exists; extend it |
| S3-A3 | Opt-out blocklist route — POST /leads/optout (add to blocklist), GET /leads/optout | `apps/api/src/routes/leads.ts` | Permanent block, cross-client |
| S3-A4 | Register ICP router in API index | `apps/api/src/index.ts` | |

#### S3-B: Lead Gen portal pages (required for launch)

| # | Task | File | Notes |
|---|------|------|-------|
| S3-B1 | Lead stats cards — wire to real `/leads/stats` API | `apps/portal/src/app/(dashboard)/dashboard/leads/page.tsx` | Replace "-" placeholders with real data |
| S3-B2 | ICP builder form | `apps/portal/src/app/(dashboard)/dashboard/leads/icp/page.tsx` | Fields: industry, job titles, company size, geography, seniority level, tech stack |
| S3-B3 | Lead pipeline table | `apps/portal/src/app/(dashboard)/dashboard/leads/page.tsx` | Sortable/filterable. Columns: name, company, title, score, status, POPIA consent status, actions |
| S3-B4 | POPIA consent action in table | Same page | "Send consent" button → marks lead as `consent_sent`. "Mark consented" → `consent_given`. |
| S3-B5 | Opt-out action in table | Same page | "Block lead" button → calls opt-out API, removes lead from all future pipelines |
| S3-B6 | CSV export button | Same page | Exports only `consent_given` leads |
| S3-B7 | Lead score display | Same page | Score badge (0–100), colour-coded: 80+ green, 50–79 amber, below 50 red |
| S3-B8 | Apollo consent filter toggle | Leads/ICP page | Toggle: "Only show leads who have already consented on Apollo." Default ON. |

---

### STEP 4 — Lead Gen upgrades (required for 31 May — NB.docx requirements)

These are the specific upgrades from the NB.docx brief that make Lead Gen sellable at the new price points.

| # | Task | Priority | Notes |
|---|------|----------|-------|
| S4-1 | Apollo consent filter active | **Must have** | Use Apollo's existing consent layer. Only surface already-opted-in leads. Do not wait for KIND's own POPIA flow as the gating mechanism. |
| S4-2 | Opt-out blocklist — permanent, cross-client | **Must have** | If any lead asks not to be contacted: flag, block, never surface again for any client. Data kept, used as blocklist. |
| S4-3 | AI-personalised outreach email generator | **Must have** | When client clicks "Draft outreach" on a lead, Claude generates a personalised email based on that lead's profile (name, company, title, signals). Not a template. |
| S4-4 | CRM sync — new leads only | **Target** | Connect to client's existing CRM (HubSpot first, Pipedrive second). Scrape CRM before delivering lead. Client only pays for leads that don't already exist in their CRM. Complex — attempt before launch, ship after if needed. |
| S4-5 | Pipeline revenue tracking | **Target** | Each lead has an estimated deal value. Pipeline view shows expected revenue. Attempt before launch, ship after if needed. |
| S4-6 | Stronger ICP signals | **Post-launch** | Add more ICP fields: funding stage, hiring signals, tech stack. Post-launch enhancement. |
| S4-7 | GDPR + POPIA compliance layer in Lead Gen | **Must have** | Show compliance notice before any outreach is sent. Document the process in the UI. |

---

### STEP 5 — Lead-capture landing page (run in parallel with Steps 3–4)

This is the marketing top-of-funnel. It runs in parallel — does not block product build.

| # | Task | Notes |
|---|------|-------|
| S5-1 | Build standalone HTML lead-capture page | Single file, no framework. Deploys to Netlify Drop or Vercel in minutes. |
| S5-2 | Form fields | Name, email, company, country, "which product" (Lead Gen / FIGSY / Both) |
| S5-3 | On submit: email to jacqueskind01@gmail.com | Use Formspree or similar — no backend needed |
| S5-4 | Deploy and share the link | This is the #1 marketing asset before launch |
| S5-5 | Goal | 100 sign-ups before 31 May. Start immediately. |

---

## GOAL 2 — FIGSY launch (after Lead Gen is stable)

FIGSY is an AI SDR/BDR agent. It takes a lead list → runs personalised AI outreach → handles replies → books meetings.
Reference product: Alta HQ / Katie (altahq.com)

FIGSY **depends on Lead Gen being functional** — it consumes leads from the Lead Gen pipeline. Build Lead Gen first.

### FIGSY pricing (from NB.docx)

| Tier | Includes | Price |
|------|----------|-------|
| Lead Gen Only — Starter | 100 leads/mo, basic ICP | $500/mo |
| Lead Gen Only — Advanced | 500 leads/mo, Apollo search, CRM sync | $1,200/mo |
| Lead Gen Only — Enterprise | Unlimited, dedicated support | Custom |
| KIND + FIGSY Bundle — Starter | Lead Gen Starter + FIGSY Starter | $700/mo |
| KIND + FIGSY Bundle — Advanced | Lead Gen Advanced + FIGSY Pro | $1,500/mo |
| KIND + FIGSY Bundle — Enterprise | Full stack | Custom |
| FIGSY Add-on — Starter | Add FIGSY to existing subscription | +$300/mo |
| FIGSY Add-on — Enterprise | Add FIGSY to existing subscription | +$800/mo |

> ⚠️ FIGSY Starter vs Pro feature scope still needs to be defined before building.

### FIGSY Phase 1 — MVP (build immediately after Lead Gen ships)

| # | Task | Notes |
|---|------|-------|
| F1-1 | Define FIGSY Starter vs Pro tier scope | Decision required before any code is written |
| F1-2 | Add FIGSY to shared constants and types | New `ProductType`, new `PRODUCTS` entry |
| F1-3 | Update pricing in billing page | Add all FIGSY tiers and bundle tiers |
| F1-4 | FIGSY portal page (`/dashboard/figsy`) | Top-level page, entry point |
| F1-5 | Campaign creation | Name campaign, select or upload lead list from Lead Gen pipeline |
| F1-6 | AI email sequence builder | Claude generates personalised outreach email per lead (uses lead profile: name, company, title, signals). Sequence: initial → follow-up 1 → follow-up 2 |
| F1-7 | Reply detection | Monitor inbox for responses. Classify: interested / not interested / opt-out / out-of-office |
| F1-8 | Opt-out handler | Shared with Lead Gen blocklist (S4-2). Auto-block on opt-out reply. |
| F1-9 | Campaign dashboard | Metrics per campaign: sent, opened, replied, interested, booked |
| F1-10 | DB tables for FIGSY | `figsy_campaigns`, `figsy_sequences`, `figsy_replies` |
| F1-11 | API routes for FIGSY | Campaign CRUD, sequence management, reply ingestion |

### FIGSY Phase 2 — Full automation (post-launch, June+)

| # | Task | Notes |
|---|------|-------|
| F2-1 | Calendar integration | Book meetings directly into client's calendar (Google Calendar first) |
| F2-2 | CRM push | Push booked meetings + engaged leads to client CRM |
| F2-3 | Full AI reply automation | AI handles full back-and-forth conversation, escalates to human when needed |
| F2-4 | Animated explainer video | How FIGSY works: lead → outreach → reply → booked meeting |

---

## Lower priority — do after Lead Gen and FIGSY are live

### Virtual Assistant and Chatbot (deprioritised for now)
These are stub pages in the portal. They are **not blocking Lead Gen or FIGSY**. Build after launch.

| # | Task |
|---|------|
| VA-1 | Virtual Assistant — Claude-powered chat interface |
| VA-2 | API route — assistant chat with message history |
| CB-1 | Chatbot Agent — persona config form + embed code snippet |
| CB-2 | API route — chatbot config CRUD |

### Compliance
| # | Task |
|---|------|
| C-1 | GDPR clause in Terms & Conditions |
| C-2 | CCPA + CAN-SPAM (US) coverage in Privacy Policy |
| C-3 | Hosting disclosure — where data is stored (Supabase region) |
| C-4 | POPIA compliance page |

### Website redesign (post-launch)
Reference: myclaw.ai structure

| # | Task |
|---|------|
| W-1 | Nav redesign — Products dropdown, Use Cases, Resources, Company |
| W-2 | Product landing pages — one per product (Lead Gen, FIGSY, VA, Chatbot) |
| W-3 | Yearly pricing option — ~2 months free vs monthly |
| W-4 | Company page — "what this means to KIND" framing |
| W-5 | Privacy page with full hosting disclosure |
| W-6 | Use Cases section per product and industry |

### Marketing assets
| # | Task |
|---|------|
| M-1 | FIGSY animated explainer video — lead → outreach → reply → booked |
| M-2 | AI-generated video content — people talking about KIND products |
| M-3 | Email nurture sequence — 5 emails for landing page sign-ups |
| M-4 | Launch week marketing calendar — LinkedIn, email, WhatsApp broadcast |

---

## Realistic 20-day execution plan

```
Days 1–2   (11–12 May)  S1: DB schema written in code + you run migrations
                         S2: Remove Consulting from all surfaces
                         S5: HTML lead-capture landing page → live

Days 3–5   (13–15 May)  S3-A: ICP + leads API routes built and registered
                         S3-B1: Lead stats wired to real data

Days 6–9   (16–19 May)  S3-B2–B8: Full Leads page
                         — ICP builder form
                         — Lead pipeline table with score, status, filters
                         — POPIA consent workflow
                         — Opt-out action
                         — CSV export

Days 10–12 (20–22 May)  S4-1: Apollo consent filter active
                         S4-2: Opt-out blocklist enforced
                         S4-3: AI-personalised outreach email generator
                         S4-7: GDPR/POPIA compliance notice in Lead Gen

Days 13–14 (23–24 May)  S4-4: CRM sync (HubSpot) — attempt; ship to post-launch if too complex
                         End-to-end test of all Lead Gen flows

Day 15     (25 May)      ✅ Lead Gen feature-complete

Days 16–17 (26–27 May)  F1-1: Define FIGSY tiers
                         F1-2/3: Add FIGSY to constants + billing
                         F1-10/11: FIGSY DB tables + API routes

Days 18–19 (28–29 May)  F1-4–F1-9: FIGSY portal page, campaign creation,
                         AI email sequences, reply detection, dashboard

Day 20     (30 May)      Final QA and fix pass

31 May     LAUNCH        Lead Gen live + FIGSY Phase 1 live
```

---

## Post-launch (June onwards)
- FIGSY Phase 2: calendar integration, CRM push, full AI replies, explainer video
- Lead Gen: CRM sync (if not shipped), pipeline revenue tracking, stronger ICP
- Virtual Assistant + Chatbot pages
- Website redesign (myclaw.ai structure)
- Compliance docs
- Marketing assets
- Pan-African expansion (8 countries Q3)
- Series A readiness

---

*Last updated: 11 May 2026. Update after every work session.*
