# KIND AI Platform — Master Roadmap
**Launch date: 31 May 2026 · Today: 11 May 2026 · Days remaining: 20**

> This document is the single source of truth for everything that needs to happen before launch and beyond.
> Items are ordered by priority. Decide which to action next from here.

---

## Current state (what is already built)

| Area | Status |
|------|--------|
| Monorepo scaffold — portal, admin, API, DB, shared packages | ✅ Done |
| Supabase auth — login + onboard flow | ✅ Done |
| Paystack billing integration — subscribe + webhook handler | ✅ Done |
| Admin operations dashboard (MRR, client count, progress bar) | ✅ Done |
| Dashboard home page — stat cards + product grid | ✅ Done |
| Settings page — business profile edit | ✅ Done |
| Billing page — plan selection + Paystack redirect | ✅ Done |
| Shared types, constants, DB client package | ✅ Done |
| Admin roadmap page (`/roadmap`) — 4-phase business milestones | ✅ Done |
| Portal roadmap page (`/dashboard/roadmap`) — product feature roadmap | ✅ Done |
| DB clients table | ✅ Done |

---

## P0 — Deploy blockers (do these first, nothing works without them)

These are infrastructure tasks that block everything else from being testable or live.

| # | Task | Notes |
|---|------|-------|
| P0-1 | Run Supabase schema migrations | Tables missing: `subscriptions`, `icps`, `leads`, `assistant_messages`, `chatbot_configs`, `usage_metrics`. Schema file is at `packages/db/src/schema.sql` — it currently only has the `clients` table. |
| P0-2 | Set Vercel environment variables — portal | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` |
| P0-3 | Set Vercel environment variables — admin | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| P0-4 | Set Railway environment variables — API | All vars from `apps/api/.env.example` including Paystack keys and plan codes |
| P0-5 | Test auth flow end-to-end | Sign up → onboard → dashboard → billing |
| P0-6 | Upload compliance PDFs to Supabase storage or public folder | T&C, Privacy Policy, POPIA Notice — referenced in portal footer |
| P0-7 | Configure Paystack webhook URL in Paystack dashboard | Must point to `https://api.yourdomain.com/webhooks/paystack` |

---

## P1 — This week (highest business impact, pre-launch)

### P1-1 — Standalone HTML lead-capture landing page
**Priority: #1 highest. Do this before anything else in the product.**

- Single HTML file, no framework dependency — deployable anywhere instantly
- Target: Lead Gen + FIGSY interest registrations
- Form captures: name, email, company, country, "which product interests you" (Lead Gen / FIGSY / Both)
- On submit: sends email notification to `jacqueskind01@gmail.com`
- Goal: **100 sign-ups before 31 May 2026**
- Must go live within days, not weeks
- This is the top-of-funnel for everything else

### P1-2 — Remove AI Consulting from all surfaces
- Remove from `packages/shared/src/constants/index.ts` (PRODUCTS constant)
- Remove from `packages/shared/src/types/index.ts` (ProductType)
- Remove from portal billing page
- Remove from admin product catalog
- Remove from portal roadmap page
- Remove from admin roadmap page
- Remove from dashboard ProductCard grid
- **Reason:** Product is being dropped. Not building further on it.

---

## P2 — FIGSY (new centrepiece product — build before launch)

FIGSY is an AI SDR/BDR agent — KIND's own version of "Katie" from Alta HQ (altahq.com).
It takes a lead list, runs personalised AI outreach, handles replies, and books meetings directly into calendar.

**Reference product:** https://www.altahq.com (Katie — AI SDR agent)
**Design reference:** Visily design (Google Drive link from NB.docx)

### FIGSY Pricing (as defined in NB.docx)

| Tier | What | Price |
|------|------|-------|
| Lead Gen Only — Starter | 100 leads, basic ICP | $500/mo |
| Lead Gen Only — Advanced | 500 leads, Apollo search, CRM sync | $1,200/mo |
| Lead Gen Only — Enterprise | Unlimited, dedicated support | Custom |
| KIND + FIGSY Bundle — Starter | Lead Gen Starter + FIGSY Starter | $700/mo |
| KIND + FIGSY Bundle — Advanced | Lead Gen Advanced + FIGSY Pro | $1,500/mo |
| KIND + FIGSY Bundle — Enterprise | Full stack | Custom |
| FIGSY Add-on (existing clients) — Starter | FIGSY Starter added to existing subscription | +$300/mo |
| FIGSY Add-on (existing clients) — Enterprise | FIGSY Enterprise added to existing subscription | +$800/mo |

> FIGSY Starter and FIGSY Pro need to be fully defined (feature scope per tier).

### P2 tasks

| # | Task | Phase |
|---|------|-------|
| P2-1 | Define FIGSY Starter vs Pro tier features clearly | Planning |
| P2-2 | Add FIGSY to shared constants and types | Code |
| P2-3 | Add FIGSY pricing to billing page | Code |
| P2-4 | FIGSY campaign creation UI — upload/select lead list, name campaign | Phase 1 MVP |
| P2-5 | FIGSY AI email sequence builder — AI generates personalised outreach per lead profile | Phase 1 MVP |
| P2-6 | FIGSY reply detection — monitor for responses, classify (interested / not interested / opt-out) | Phase 1 MVP |
| P2-7 | FIGSY opt-out handler — permanent blocklist, cross-client, never generates that lead again | Phase 1 MVP |
| P2-8 | FIGSY campaign dashboard — sent/opened/replied/booked metrics | Phase 1 MVP |
| P2-9 | FIGSY calendar integration — book meetings directly into client's calendar | Phase 2 |
| P2-10 | FIGSY CRM push — push booked meetings and engaged leads to client CRM | Phase 2 |
| P2-11 | FIGSY full AI reply automation — AI handles back-and-forth, escalates when needed | Phase 2 |
| P2-12 | Animated explainer video — how FIGSY works (for website + landing page) | Marketing |
| P2-13 | FIGSY portal page (`/dashboard/figsy`) | Code |

---

## P3 — Lead Gen upgrades (major rethink from NB.docx)

The current lead gen product needs significant upgrades before it's sellable at the new price points.

| # | Task | Detail |
|---|------|--------|
| P3-1 | CRM sync — connect to client's existing CRM | Scrape client CRM first to check if lead already exists. Client **only pays for leads that are new to their CRM**. |
| P3-2 | Apollo consent filter | Only surface leads who have already opted in or consented on Apollo. Use Apollo's existing consent layer — don't wait for KIND's own consent flow for quick wins. |
| P3-3 | Opt-out blocklist (permanent, cross-client) | If a lead replies asking to not be contacted, flag and permanently block across ALL clients. Never generate that lead again unless they explicitly opt back in. Data is **kept** (not deleted) — used as blocklist. |
| P3-4 | Stronger ICP builder | More signals, better targeting. Current ICP is too basic. |
| P3-5 | AI-personalised outreach emails | When drafting outreach emails, generate based on that specific lead's profile. Personal, not templated. |
| P3-6 | Pipeline revenue tracking | Visibility on what leads in the pipeline are worth — expected revenue per lead/campaign. |
| P3-7 | GDPR + POPIA strict process | Formalise the compliance layer around contacting leads. Document the process clearly in the product. |
| P3-8 | ICP builder page (`/dashboard/leads/icp`) | Full form: industry, job titles, company size, geography, tech stack signals |
| P3-9 | Lead pipeline table | Sortable, filterable by status/score. Columns: name, company, title, score, status, POPIA consent, actions |
| P3-10 | POPIA consent workflow in lead table | Send consent, track response, mark consented/rejected |
| P3-11 | Lead stats cards wired to real API data | Currently shows "-" placeholders |
| P3-12 | CSV export | Download consented leads as CSV |

---

## P4 — Outstanding portal features (Week 2 & 3 stubs — unbuilt)

These are the placeholder pages that currently show "builds in Week 2/3" messages.

| # | Task | Current state |
|---|------|---------------|
| P4-1 | Complete DB schema | Only `clients` table exists. Need: `subscriptions`, `icps`, `leads`, `assistant_messages`, `chatbot_configs`, `usage_metrics` |
| P4-2 | API routes — ICP (CRUD) | Not built |
| P4-3 | API routes — Assistant (Claude-powered chat, message history) | Not built |
| P4-4 | API routes — Chatbot config (get/update persona, settings) | Not built |
| P4-5 | Leads page — full UI | ICP builder form + lead pipeline table + score display + POPIA consent actions + filters |
| P4-6 | Virtual Assistant page — full chat interface | Claude-powered. Currently empty placeholder. |
| P4-7 | Chatbot Agent page — configuration UI | Persona name, tone, website URL, embed code snippet, test chat preview. Currently empty placeholder. |
| P4-8 | Register new API routes in `apps/api/src/index.ts` | ICP router, assistant router, chatbot router |

---

## P5 — Compliance (global)

Business is Africa-first but global. Need full compliance documentation.

| # | Task | Detail |
|---|------|--------|
| P5-1 | GDPR compliance added to T&C documents | Europe-facing users are in scope |
| P5-2 | US privacy law coverage (CCPA + CAN-SPAM) | Needed for US-based leads and clients |
| P5-3 | Update Privacy Policy to cover data hosting location | Where is data stored? Supabase region. |
| P5-4 | Hosting disclosure page or section on website | GDPR requirement — users must know where their data is processed |
| P5-5 | POPIA-specific compliance page | South African clients need this |

---

## P6 — Website redesign

Reference structure: myclaw.ai
Reference product: OpenClaw "what this means to KIND" company section

| # | Task | Detail |
|---|------|--------|
| P6-1 | Navigation redesign with dropdowns | Products (each with own landing page), Use Cases, Resources, Company |
| P6-2 | Product landing pages | One per product: AI Lead Generation, FIGSY, Virtual Assistant, Chatbot Agent |
| P6-3 | Company page | "What this means to KIND" section — OpenClaw-style framing |
| P6-4 | Yearly pricing option across all products | With discount vs monthly (industry standard: ~2 months free) |
| P6-5 | Website content accuracy | Content must accurately reflect what products actually do — no exaggeration |
| P6-6 | FIGSY standalone landing page | Separate from main website — can be the lead capture page from P1-1 |
| P6-7 | Privacy page with hosting disclosure | Where data lives, GDPR + POPIA + CCPA coverage |
| P6-8 | Use Cases section | Specific industries and scenarios for each product |

---

## P7 — Marketing assets

| # | Task | Detail |
|---|------|--------|
| P7-1 | FIGSY animated explainer video | How FIGSY works — lead → outreach → reply → meeting booked |
| P7-2 | AI-generated video content | People talking about KIND products — for social and landing pages |
| P7-3 | Marketing calendar for launch week (31 May) | LinkedIn, email, WhatsApp broadcast |
| P7-4 | Email nurture sequence | For everyone who signs up via P1-1 landing page — 5-email sequence before launch |

---

## Suggested order of execution (next 20 days)

```
Week 1 (11–17 May)
  Day 1–2:  P0 — deploy blockers (infra + env vars)
  Day 2–3:  P1-1 — HTML lead-capture landing page (go live ASAP)
  Day 3–4:  P1-2 — remove AI Consulting from all surfaces
  Day 5–7:  P4-1 + P4-2/3/4 — DB schema + new API routes

Week 2 (18–24 May)
  Day 8–10:  P4-5 — full Leads page (ICP builder + pipeline table)
  Day 11–12: P4-6 — Virtual Assistant chat interface
  Day 13–14: P4-7 — Chatbot Agent config page
  Day 14:    P2-1/2/3 — FIGSY defined in constants + billing page

Week 3 (25–31 May) — launch sprint
  Day 15–17: P2-4/5/6/7/8 — FIGSY Phase 1 MVP
  Day 18:    P3-1/2/3 — CRM sync + consent filter + opt-out blocklist
  Day 19:    P5 — compliance docs
  Day 20:    P6-1/2 — website nav + product pages
  Launch:    31 May 2026
```

---

## Post-launch (June onwards)

- FIGSY Phase 2 — calendar integration, CRM push, full AI reply automation
- Lead Gen — stronger ICP signals, pipeline revenue tracking, AI-personalised emails
- Website — full redesign, use cases, yearly pricing
- Marketing — FIGSY video, AI content, nurture sequences
- SOC 2 readiness
- Pan-African expansion (8 countries by end of Q3)
- Mobile app
- Series A readiness

---

*Last updated: 11 May 2026. Review and update after every work session.*
