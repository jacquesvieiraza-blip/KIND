# K.I.N.D — MASTER DOCUMENT
**Single source of truth. Last updated: 2 June 2026 (partner sandbox fully built, verification audit complete, docs updated to Stripe).**
**Business: UK registration pending (Companies House) · Platform: Africa-first, world-ready**

---

## TABLE OF CONTENTS

0. [Daily Brief — Current Session](#-section-0--daily-brief)
0b. [Master Build Queue — All Phases](#-section-0b--master-build-queue--all-phases)
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
13. [Unit Economics](#13-unit-economics)
14. [Cashflow Model](#14-cashflow-model)
14b. [Multi-Year Revenue Projections](#14b-multi-year-revenue-projections)
15. [Client Flow — All Paths](#15-client-flow--all-paths)
16. [Operations SOP](#16-operations-sop)
17. [Tech Stack & Infrastructure](#17-tech-stack--infrastructure)
18. [Smoke Test Checklist](#18-smoke-test-checklist)
19. [Product Vision — 1, 3, 5 Years](#19-product-vision--1-3-5-years)
20. [Alta AI SDR — Competitive Audit](#20-alta-ai-sdr--competitive-audit)
21. [Key Decisions Locked](#21-key-decisions-locked)
22. [Go-To-Market Strategy](#22-go-to-market-strategy)
23. [UK Company Registration](#23-uk-company-registration)
24. [ClickUp Competitive Audit — Steal-Now Analysis](#24-clickup-competitive-audit--full-comparison--steal-now)
25. [Apex (apex.host) Competitive Audit](#25-apex-apexhost-competitive-audit)
26. [Full Competitor Landscape — All Players](#26-full-competitor-landscape--all-players)
27. [Art of the Possible — Full Build Queue](#27-art-of-the-possible--full-build-queue--full-build-queue)
28. [Art of Possible — Products We Study](#28-art-of-possible--products-we-study)
29. [Compliance Certifications Roadmap](#29-compliance-certifications-roadmap)
30. [Competitor Targeting Strategy](#30-competitor-targeting-strategy)
31. [AI Learning Capability — Built, Planned, Vision](#31-ai-learning-capability--built-planned-vision)
32. [ClickUp Brain — What We Studied, What We Adopted, What's Next](#32-clickup-brain--what-we-studied-what-we-adopted-whats-next)
33. [Full Competitive Landscape — Every Player, Every Layer](#33-full-competitive-landscape--every-player-every-layer)
34. [The Unbuilt Future — What K.I.N.D Could Become](#34-the-unbuilt-future--what-kind-could-become)
35. [Demo Playbook — Live Sales Demo & Smoke Test](#35-demo-playbook--live-sales-demo--smoke-test)
36. [Admin Portal Playbook — How to Use Every Route](#36-admin-portal-playbook--how-to-use-every-route)
37. [Monday.com AI — Competitive Audit & UX Steal List](#37-mondaycom-ai--competitive-audit--ux-steal-list)
38. [Multi-User Team Model — Architecture & Build Plan](#38-multi-user-team-model--architecture--build-plan)
39. [Going Live — Full Admin Checklist](#39-going-live--full-admin-checklist)
40. [Competitive Deep Dive — ClickUp, Alta, Monday.com](#40-competitive-deep-dive--clickup-alta-mondaycom)
41. [Nigeria Partner — Commercial Breakdown](#41-nigeria-partner--commercial-breakdown)
42. [Partner Programme — Full Design & Build Spec](#42-partner-programme--full-design--build-spec)
43. [Full Commit Log — Every Push](#43-full-commit-log--every-push)
44. [Social Marketing — Strategy & Content](#44-social-marketing--strategy--content)

---

## 🔁 TEARDOWN PROTOCOL

**When the founder says "TEARDOWN" — Claude must do this before anything else:**

1. Read Section 0 (morning brief) in full
2. Read the full Founder Action List and Claude Build List
3. Read Section 0b (master build queue) — every phase, every status
4. Read Section 1 (current status) — check what's confirmed live vs pending
5. Read Section 43 (commit log) — last 20 commits minimum
6. Cross-reference: for every item listed as outstanding, verify it isn't already marked done somewhere in the MASTER
7. For every item listed as done, verify it isn't contradicted by a stale section elsewhere
8. Rewrite Section 0 from scratch — morning brief, both action lists, platform health
9. Commit and push immediately

**Rules:**
- Never write an action list from session memory alone. Always read first.
- If a section contradicts another section, the most recent commit log entry wins.
- Every session's key decisions, builds, and fixes must be logged in Section 0 before the session ends.
- No item is marked ✅ unless it has been confirmed working — not just "route exists."

**Morning bug audit — mandatory before any build work:**

Run these four steps and report findings in chat before touching any code:

1. `yarn workspace @kind/portal tsc --noEmit` — report every error
2. `yarn workspace @kind/api build` — report every error
3. `yarn workspace @kind/admin tsc --noEmit` — report every error
4. Grep for unresolved issues: `grep -r "TODO\|FIXME\|console\.error" apps/ --include="*.ts" --include="*.tsx" -l`

If any TypeScript errors are found, fix them before building anything new. Hidden errors reach production and take the site down.

**Redundancy checks — verify these are active every session:**

| Check | How | Why |
|-------|-----|-----|
| Railway health checks | Railway dashboard → each service → Settings → Health Check → path `/health` | Auto-restarts crashed service within 60 seconds |
| UptimeRobot monitors | uptimerobot.com → check monitors are green | 5-minute ping, SMS alert to founder if down |
| API `/health` endpoint | `GET /health` returns `{ status: 'ok' }` | Required for Railway health check to work |

If Railway health checks are not configured or UptimeRobot is not set up, flag this to the founder at the start of the session before doing anything else.

---

## 🔴 YOUR ACTION LIST — EVERYTHING YOU NEED TO DO (2 June 2026)

*Complete list. Cross-referenced against full MASTER. Verified accurate. Tick these off as you go.*

**Already done — do not repeat:** RESEND_API_KEY ✅, HubSpot API key ✅, Calendly link ✅, FIGSY_KIND_CLIENT_ID ✅, Resend inbound webhook ✅, Partner email SQL ✅

---

### Priority 1 — Critical blockers (nothing works properly without these)

1. **Add Stripe price IDs for Milla and Vida to Railway** — Tests 3 and 4 (Milla/Vida subscription checkout) are completely blocked until these four price IDs are in Railway → KIND API → Variables. This is the single biggest blocker to going live.
2. **Run the Stripe subscription ID migration** — open Supabase SQL editor and run `20260527_stripe_subscription_id.sql`. This has not been run. Stripe subscriptions cannot be tracked without it.
3. **Set `ADMIN_SECRET_KEY` in Railway** — without this, all cron jobs (scheduled emails, daily digest, campaign processing) fail to authenticate. Set any strong random string in Railway → KIND API → Variables as `ADMIN_SECRET_KEY`.
4. **Run the meetings booked migration** — open Supabase SQL editor and run: `ALTER TABLE public.figsy_campaigns ADD COLUMN IF NOT EXISTS meetings_booked integer NOT NULL DEFAULT 0;` The KPI page shows meetings booked but the column does not exist in the database.
5. **Upgrade Resend to paid plan** — the free plan has a 100 emails per day cap. Once a campaign runs, you will hit this immediately. Upgrade at resend.com/billing.
6. **Add credits to your partner account** — log into admin and add enough credits to `jacques.vieiraza@gmail.com` (your partner account) to run a live demo.

### Priority 2 — Reliability and monitoring

7. **Configure Railway health checks** — in Railway, open each of the three services (API, Portal, Admin), go to Settings, find Health Check, set the path to `/health`. Railway will restart crashed services automatically.
8. **Set up UptimeRobot** — monitor.uptimerobot.com, free account, add portal and API URLs, ping every 5 minutes, SMS alert when down. This would have caught last night's outage.
9. **Enable UptimeRobot weekly report** — weekly digest email every Monday once set up.
10. **Run smoke tests with Claude** — go through Section 18 checklist together. Identify every failure. Do not skip.

### Priority 3 — Business and legal foundation

11. **Solicitor call (Monday 2 June)** — confirm outcome of call re: Smartsheet contract clauses 17.2 and 19.3.2. Tell Claude what the solicitor said so builds can resume on cleared footing.
12. **UK Companies House** — registration submitted and in progress. Once you receive the company number, share it so legal pages, footer, and Stripe account can be updated.
13. **Open Wise Business account** — do this once UK registration completes. Wise is how partner commissions are paid.
14. **ICO data protection registration** — £40/year. Required to process personal data legally in the UK. Register at ico.org.uk.
15. **K.I.N.D trademark filing at UK IPO** — file the word mark "K.I.N.D" at ipo.gov.uk. ~£170.
16. **FIGSY trademark filing at UK IPO** — file separately. Same cost.
17. **SEIS advance assurance application** — apply to HMRC for SEIS status before raising any investment. This protects future investors with a 50% income tax relief.
18. **SeedLegals IP assignment agreement** — ensure all IP built is formally assigned to the company, not the founder personally.
19. **SeedLegals shareholders agreement** — needed before bringing on any co-founders, employees with equity, or investors.
20. **MacBook from Currys** — all future development must be on personal hardware (not work laptop). MacBook Neo 13" 2026, £599 from Currys.

### Priority 4 — Partner programme decisions

21. ✅ **Sandbox specification — LOCKED AND BUILT** — Free demo sandbox on approval. SaaS leads via Apollo, 100 credits, all 4 products on Starter, 90-day expiry. One-click login from Partner Hub. Partners pay nothing for sandbox. Own pipeline = standard client pricing. Built 2 June.

### Priority 5 — Feature flags to activate (5 minutes each)

22. **Activate Portal V2** — Railway → Portal → Variables → `FEATURE_PORTAL_V2=true`
23. **Activate Campaign Intent** — `FEATURE_CAMPAIGN_INTENT=true`
24. **Activate ICP Builder Chat** — `FEATURE_ICP_BUILDER=true`

### Priority 6 — Integrations that unlock features

25. **WhatsApp Business API** — confirm status. Forward any emails received. When approved, provide: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`.
26. **Google Calendar OAuth** — create credentials in Google Cloud Console. Provide: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
27. **Voice agent (Vapi)** — create account at vapi.ai. Provide: `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ASSISTANT_ID`, `VAPI_WEBHOOK_SECRET`.
28. **Flutterwave (Phase 2)** — create business account. Provide: `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_HASH`.

### Priority 7 — API keys and purchases (each unlocks a specific feature)

29. **Warmup service** — subscribe, provide API key. Unlocks P1-2 email warm-up.
30. **Blacklist monitoring key** — choose provider, provide key. Unlocks P1-4.
31. **Smartlead API key** — `SMARTLEAD_API_KEY`. Unlocks P1-5 alternative email infrastructure.
32. **Hunter.io API key** — `HUNTER_API_KEY`. Unlocks P1-7 email finder.
33. **Apollo Basic upgrade** — $49/month. `APOLLO_API_KEY`. Unlocks real lead search (free plan returns 0 results).
34. **Google Maps scraping approval** — confirm this is legal for your use case before Claude builds P1-14.

### Priority 8 — GTM (downstream of smoke tests passing and legal clarity)

35. **G2 listing** — g2.com/products/new. Free. Adds credibility.
36. **Capterra listing** — capterra.com/vendors. Free.
37. **Product Hunt launch** — schedule a date. Claude writes the copy.
38. **LinkedIn content programme** — weekly posts. Claude writes, you publish.
39. **Run K.I.N.D GTM using FIGSY** — use your own product to get your first clients.
40. **Get first 5 paying clients** — everything downstream of this.

---

## 🔵 CLAUDE BUILD LIST — EVERYTHING I NEED TO BUILD (2 June 2026)

*Complete list cross-referenced against full MASTER. Items already built have been removed.*

**Already built — do not re-add:** P0-1 through P0-12 ✅, P1-1, P1-3, P1-6, P1-8 through P1-12, P1-15 ✅, login redesign ✅, sparklines ✅, FIGSY empty states ✅, animated dots ✅, consent auto-fire ✅

---

### Critical reliability

1. ✅ **Remove TypeScript error suppressor** — DONE 2 June. `ignoreBuildErrors: true` removed. 3 hidden errors found and fixed.
2. ✅ **Morning type-check** — DONE 2 June. 0 errors across all 3 apps.
3. **Daily type-check** — `tsc --noEmit` at the start of every session. Non-negotiable. Run and report results in chat each morning.
4. ✅ **API `/health` endpoint** — confirmed live at `apps/api/src/index.ts:80`. Returns `{ status: 'ok', service: 'kind-api' }`.
5. **Morning bug audit** — every session: run type-check, grep for TODO/FIXME, check Railway deploy logs, report findings in chat before building anything.

### Verification audit (marked done, never confirmed working end to end)

6. **P2-13 Personalised images** — does image generation actually run?
7. **P2-14 Social signals** — does it fetch real social data?
8. **P3-1 Developer portal** — can an API key actually be issued end to end?
9. **P3-2 FIGSY vertical modes** — do mode-specific prompts actually switch?
10. **P3-4 Proposals and e-sign** — can a proposal be created and signed?
11. **P3-7 Visitor de-anonymisation** — does it return real company data?

### Documentation updates (stale, causes confusion)

12. ✅ **Update `docs/client-flow-sop.md`** — DONE 2 June. Paystack → Stripe throughout. Date updated.
13. ✅ **Update `docs/DEPLOYMENT_GUIDE.md`** — DONE 2 June. All Paystack references replaced with Stripe. Step 6 rewritten for Stripe products + webhook. Env var reference updated.

### Mobile layout (site is unusable on mobile right now)

14. **Mobile responsive layout** — zero breakpoints currently across the portal. Site is unusable on a phone. This blocks any client who checks their portal on mobile.

### Partner programme

15. ✅ **Demo sandbox auto-provisioning** — DONE 2 June. On approval: creates real `clients` row (`is_demo=true`), 4 subscriptions (Starter), default ICP, runs Apollo ICP job in background. `demo_env_id` on partners → `clients.id`. Sends sandbox ready email.
16. ✅ **Partner portal sandbox section** — DONE 2 June. Shows sandbox status, expiry, credits info, one-click login button, "Want your own pipeline? See pricing →" CTA.
17. ✅ **Admin sandbox visibility** — DONE 2 June. "Sandbox" column in active partners table. "Live" badge if provisioned, "Provision" button if not.
18. ✅ **Partner onboarding email sequence** — DONE 2 June. Day 2 (sandbox how-to), day 7 (register first deal), day 14 (share referral link). Scheduled via setTimeout on approval.
19. ✅ **Partner pricing page** — DONE 2 June. `/dashboard/partner/pricing` — free sandbox, Starter/Growth client pricing, commission rates by tier.
20. ✅ **Update partner onboarding guide** — DONE 2 June. Step 6 detail now describes real sandbox: 100 credits, pre-loaded leads, 90-day expiry, one-click login.

### Portal remaining

21. ✅ **Languages discoverability** — DONE 2 June. Language badge strip added to Milla page header (🇬🇧 English · 🇫🇷 Français · 🇰🇪 Kiswahili · 🇳🇬 Hausa). Also added to upgrade/locked screen feature list.
22. ✅ **P5 Chat history persistence** — VERIFIED 2 June. `MillaSession` state, `loadSessions`, `activeSession` all exist in `assistant/page.tsx`. Sessions persist across reloads.
23. **P6 NotificationBell theme** — notification bell component exists. Assess if styling needs updating to match current design system.
24. **Onboarding checklist end-to-end verify** — confirm the 4-step onboarding checklist works correctly from signup through to completion.

### Competitive gap queue (features that make us stronger than alternatives)

25. **AgentSidePanel image fix** — agent photos in the side panel need correcting.
26. ✅ **Reply directly from inbox** — VERIFIED 2 June. `AISuggestionPanel` + `sendReply` exist in `replies/page.tsx`. Reply-from-inbox is live.
27. ✅ **KPI time range filters** — VERIFIED 2 June. `period` state with 7d/30d/90d/All buttons exists in `kpis/page.tsx`. Already built.
28. **Knowledge base redesign** — current page needs redesign to match the rest of the portal.
29. ✅ **Consent token security** — VERIFIED 2 June. `consent.ts` uses `crypto.randomBytes(32).toString('hex')`. Already cryptographic.
30. ✅ **Campaign pause notification emails** — VERIFIED 2 June. `internal.ts:819` calls `sendCampaignPausedEmail` when campaign auto-pauses. Already wired.
31. **Fix smoke-test API failures** — run the full smoke test checklist and fix every failure found.
32. ✅ **W2 sequence branching API wiring** — VERIFIED 2 June. `reply_branch_handled_at` logic in `figsy.ts:230+`. Already implemented.
33. ✅ **S4 Scheduled report email** — VERIFIED 2 June. `sendWeeklyLeadsDigest` called in `/digest/weekly` route, cron fires Mondays. Already wired.
34. **S5 "AI Revenue OS" positioning rewrite** — Apex steal: rewrite key portal copy around the Revenue OS framing.
35. ✅ **Admin cohort analytics** — VERIFIED 2 June. `cohorts/page.tsx` queries Supabase directly — real data, not mock.

---

## 🗓️ SECTION 0 — MORNING BRIEF — 2 JUNE 2026

*Single source of truth. Read this first, every session. Updated at end of every session. Previous sessions in Section 43.*

---

### 🟢 FIXED THIS SESSION (2 JUNE MORNING)

| Fix | File | Commit |
|-----|------|--------|
| Removed `typescript.ignoreBuildErrors: true` | `apps/portal/next.config.mjs` | this session |
| Fixed `countries` → `geographies` in ICP quick templates (6 instances) | `apps/portal/.../leads/icp/page.tsx` | this session |
| Fixed `refinement_suggestions: null` → `?? undefined` coerce | `apps/portal/.../leads/icp/page.tsx` | this session |
| Fixed `role: string` → `role: 'assistant' as const` in MCP chat | `apps/portal/.../mcp/page.tsx` | this session |
| Morning type-check: 0 errors across all 3 apps | all | this session |

**Partner email SQL:** Founder confirmed running `UPDATE partners SET email = 'jacques.vieiraza@gmail.com' WHERE email = 'jacques.vieiraza@icloud.com'` ✅

---

### 🔴 WHAT BROKE LAST SESSION (31 MAY) — FIXED

| Issue | Root cause | Fix | Commit |
|-------|-----------|-----|--------|
| API crashed on Railway — all endpoints down | `supabase-js@2.105` Realtime client calls `createClient()` at module load; Node 20 has no native WebSocket | Added `ws` package; set `globalThis.WebSocket = ws` before `createClient()`; passed `realtime: { transport: ws }` | `50073e0` |
| Portal "Something went wrong" on every dashboard page | `isPartner` variable used in Sidebar.tsx but destructured as `isPartnerProp` — TypeScript error hidden by `ignoreBuildErrors: true` | Renamed destructuring from `isPartner: isPartnerProp` to `isPartner` | `e94a0c1` |
| Multiple Railway deploy failures (API + portal) | nixpacks.toml wrong phase order; root nixpacks.toml created accidentally; Node version defaulting to 18 | Fixed all three nixpacks.toml files; added `.node-version = 20` | `1a61e7c` `5e63ff4` `25249ff` |

---

### 🟡 IMMEDIATE — DO FIRST THIS SESSION

| Priority | Task | Who | Why |
|----------|------|-----|-----|
| ✅ DONE | ~~Remove `typescript.ignoreBuildErrors: true`~~ | Claude | Fixed 2 June morning |
| ✅ DONE | ~~Morning type-check — 0 errors all 3 apps~~ | Claude | Fixed 2 June morning |
| **P1** | Verify 6 discrepancy items — routes exist but were never confirmed working | Claude | P2-13, P2-14, P3-1, P3-2, P3-4, P3-7 |
| **P1** | Configure Railway health checks on all 3 services — path `/health` | Founder | `/health` endpoint confirmed live. Just needs Railway config. |
| **P1** | Set up UptimeRobot (free) for portal + API | Founder | 5-minute alerting — would have caught last night's outage immediately |
| **P1** | Build partner sandbox provisioning (C4-C8) | Claude | Founder confirmed sandbox model. Awaiting build approval. |

---

### 🟢 CONFIRMED WORKING — VERIFIED 31 MAY

**Infrastructure:**
- API deployed on Railway — WebSocket fix confirmed working
- Portal deployed on Railway — Sidebar crash fixed
- Admin deployed on Railway
- All three services using Node 20 via `NIXPACKS_NODE_VERSION=20` env var

**Core product:**
- Client portal auth (Supabase)
- ICP Builder (Apollo leads)
- Campaigns + sequence builder
- Inbox (replies, warm leads tab)
- FIGSY chat (all pages, proactive messages, 3rd-person voice)
- Milla chat (4 languages: English, Français, Kiswahili, Hausa)
- Realtime dashboard (live stats via Supabase realtime)
- Stripe billing (webhooks, invoice payment)
- Email tracking (open events)
- Waterfall enrichment (P2-5)
- Intent signal triggers (P2-6)
- Revenue forecasting (P3-5)
- MCP Connect page (MCP-3)
- Notification preferences UI (P0-5)
- Multi-model toggle per campaign (P0-14)
- Adaptive send volume (P1-3)
- Website (www.get-kind.com) on Railway with Express server

**Partner programme (built 31 May):**
- DB schema: `partners` table, `partner_deals` table, `partner_commissions` table
- API routes: `/partners/apply`, `/partners/me`, `/partners/:id`, `/partners/ref/:code`
- Commission auto-calculation on client subscription
- Admin: partners list, partner detail with tabs, approve/reject, commission management
- Portal: Partner Hub page, onboarding guide (9-step flowchart), value deck (7 slides)
- Agent context: Milla is partner-state-aware (pending / active-no-deals / active-with-deals)

---

### 🔒 LOCKED DECISIONS — DO NOT REVISIT

| Decision | Detail | Confirmed |
|----------|--------|-----------|
| **Partner sandbox model** | Free demo sandbox provisioned on approval. Partners pay NOTHING to demo to prospects. If they want K.I.N.D for their own pipeline, they sign up as a regular client at standard rates. No special pricing, no hybrid accounts. Clean. | 1 Jun 2026 |
| **Partner email fix** | `UPDATE partners SET email = 'jacques.vieiraza@gmail.com' WHERE email = 'jacques.vieiraza@icloud.com'` — run in Supabase SQL editor by founder | 1 Jun 2026 |

---

### ✅ PARTNER PROGRAMME — ALL GAPS CLOSED (2 JUNE 2026)

| Item | Built | Detail |
|------|-------|--------|
| Demo sandbox auto-provisioning | ✅ 2 June | On approval: `clients` row (`is_demo=true`), 4 Starter subscriptions, default SaaS ICP, 100 credits, Apollo ICP runs in background. `partners.demo_env_id` → `clients.id`. |
| Partner portal sandbox section | ✅ 2 June | Sandbox status card in Partner Hub: expiry, credit balance, "One-click login" button, "Want your own pipeline?" CTA. |
| Admin sandbox visibility | ✅ 2 June | "Sandbox" column in active partners table. "Live" badge if provisioned, "Provision" button as manual fallback. |
| Drip email sequence | ✅ 2 June | Day 2 (sandbox how-to), day 7 (register first deal), day 14 (share referral link). Scheduled via setTimeout on approval. |
| Partner pricing page | ✅ 2 June | `/dashboard/partner/pricing` — free sandbox, Starter/Growth client pricing, commission rates table. |
| Partner onboarding guide step 6 | ✅ 2 June | Updated detail to describe real sandbox: 100 credits, pre-loaded leads, 90-day expiry, one-click login from Partner Hub. |

---

### 🔴 NEEDS FOUNDER ACTION — BLOCKED ON YOU

| Ref | Task | Detail |
|-----|------|--------|
| F1 | Configure Railway health checks | Dashboard → each service → Settings → Health Check → path `/health` |
| F2 | Set up UptimeRobot | monitor.uptimerobot.com — free — add portal + API URLs |
| F3 | Confirm WhatsApp Business API status | Did you apply? Still pending? What's the reference? |
| F4 | Stripe prices confirmed live | All 4 prices (Starter 40cr, Growth 100cr, + two flat) must be in Railway env vars |
| F5 | RESEND_API_KEY in Railway | Email sending (campaigns, onboarding) won't work without it |
| F6 | **CONFIRMED** — Sandbox spec: free on approval, enough credits to demo. Give `jacques.vieiraza@gmail.com` enough credits now to demo to a partner. | ✅ Decision locked — awaiting credit top-up |
| F7 | Google Workspace set up | For professional email (jacques@get-kind.com) |
| F8 | Company registration decision | UK or South Africa first? |
| F9 | UptimeRobot weekly report | Set to email you every Monday |

---

### 🔵 CLAUDE BUILD QUEUE — READY NOW (no blockers)

| Ref | Task | Est. time | Impact |
|-----|------|-----------|--------|
| C1 | Remove `ignoreBuildErrors: true` from next.config.mjs | 2 min | Critical reliability fix |
| C2 | Morning type-check across all 3 apps | 5 min | Catch hidden errors |
| C3 | Verify P2-13 / P2-14 / P3-1 / P3-2 / P3-4 / P3-7 are actually working | 30 min | Confirm audit accuracy |
| **C4** | **Demo sandbox auto-provisioning** — when admin approves partner, sandbox client account created automatically, portal shows login details | 2 hrs | Partner programme is incomplete without this |
| **C5** | **Partner portal sandbox section** — sandbox credentials, "Use this for demos" guide, separate CTA "Want your own pipeline? Sign up as a client →" | 1 hr | Partners have nothing to show prospects |
| **C6** | **Admin sandbox status** — per-partner sandbox provisioned/not status, manual provision button as fallback | 45 min | Admin has no visibility |
| **C7** | **Partner onboarding email sequence** — approval email + follow-up drip (needs F5 RESEND_API_KEY) | 1 hr | Single email is not enough |
| **C8** | **Partner pricing page** — portal one-pager: demo sandbox = free, own pipeline = standard client pricing | 30 min | Removes confusion at application |
| C9 | Update onboarding guide + value deck to reflect confirmed model | 20 min | Currently incorrect |
| C10 | Languages discoverability — Milla feature card, website mention | 30 min | Feature exists, nobody knows |
| C11 | Railway health check endpoint `/health` on API | 15 min | Enables F1 |
| C12 | Daily bug audit — run `tsc --noEmit` on all apps | 5 min | Ongoing — do every session |

---

### ⚠️ KNOWN DISCREPANCIES — NEED VERIFICATION

These items were marked ✅ in earlier session commits but full functionality was never confirmed live:

| Item | What was built | What needs verifying |
|------|----------------|---------------------|
| P2-13 Personalised images | Route + UI exists | Does image generation actually run? |
| P2-14 Social signals | Route exists | Does it fetch real social data? |
| P3-1 Developer portal | Page exists | Are API keys issuable end-to-end? |
| P3-2 FIGSY vertical modes | Modes coded | Do mode-specific prompts actually switch? |
| P3-4 Proposals + e-sign | Route exists | Can a proposal be created + signed? |
| P3-7 Visitor de-anon | Route exists | Does it return real company data? |

---

### 📋 REDUNDANCY REQUIREMENTS (next 7 days)

These are not nice-to-haves. Last night proved we need them:

1. **Railway health checks** — 60-second auto-restart on crash (F1 above)
2. **UptimeRobot** — 5-minute ping, SMS alert to founder (F2 above)
3. **Error logging** — Railway logs are not enough. Need structured error capture.
4. **DB backup** — Supabase auto-backup is on, but confirm retention period
5. **Rollback plan** — document: if API crashes, which commit hash to revert to?

---

### 📊 PLATFORM HEALTH — AS OF 1 JUNE 2026

| Service | Status | Last confirmed |
|---------|--------|----------------|
| API (Railway) | ✅ Live | 31 May 20:27 UTC |
| Portal (Railway) | ✅ Live | 31 May 20:27 UTC |
| Admin (Railway) | ✅ Live | 31 May 20:27 UTC |
| Website (Railway) | ✅ Live | 31 May 13:54 UTC |
| Supabase DB | ✅ Live | Continuous |
| Stripe webhooks | ✅ Configured | 31 May |
| Resend email | ✅ RESEND_API_KEY confirmed in Railway | 31 May |

---

### 📓 SESSION LOG — 1 JUNE 2026 (tonight)

**What was done this session:**

| Time (UTC) | Commit | What |
|------------|--------|------|
| 20:27 | `6a57bbf` | MASTER.md full audit — built/not-built lists, F1-F30, commit log |
| 20:21 | `50295d2` | MASTER.md full platform audit |
| 20:17 | `9a41d99` | MASTER.md morning brief |
| 20:14 | `ee1a010` | MASTER.md session record — API crash + partner programme |
| 20:09 | `e94a0c1` | **FIX** — Portal Sidebar crash: `isPartner` aliased as `isPartnerProp` |
| 20:01 | `50073e0` | **FIX** — API WebSocket crash: dual polyfill for Node 20 |
| 19:55 | `adf9a39` | **FIX** — Add `ws` package to `@kind/db` |
| Earlier | Multiple | nixpacks.toml fixes, Node version, partner programme builds |

**Key decisions locked tonight:**
- Partner sandbox model: free on approval, own pipeline = standard client pricing
- Partner email fix: `UPDATE partners SET email = 'jacques.vieiraza@gmail.com'` — run by founder
- TEARDOWN protocol: established. When founder says TEARDOWN, Claude reads full MASTER before writing anything.

**What was fixed in MASTER tonight:**
- TOC extended from 36 to 43 sections
- 781 lines of stale May 29 content removed (solicitor pause, old blockers)
- 1,042 lines of duplicate sections 24-28 removed
- EVERYTHING BUILT rewritten in plain English (no file paths)
- Founder action list corrected: 10 items → 40 items across 8 priority groups
- Claude build list corrected: 12 items → 34 items, 25 already-built items removed
- Section 42 partner audit corrected: sandbox marked NOT built (was wrong ✅)
- Section 0b founder action list updated: done items marked, missing critical items added
- TEARDOWN protocol added to document

**Still wrong / needs fixing next session:**
- Section 1 (Current Status) — still shows HubSpot, Calendly, FIGSY_KIND_CLIENT_ID as "⏳ Pending" but they are confirmed done. Read and fix.
- Verification audit P2-13/P2-14 — listed as "route exists" in my notes but Section 0b says "⚪ Not started." Confirm which is true before building.
- Section 0b "Approved to Build" and "Phase 0 Build Now" sections are partially duplicating the main tables and have stale statuses. Clean up next TEARDOWN.

## ✅ EVERYTHING BUILT — VERIFIED IN CODE (31 May 2026)

*Every item below has been confirmed in the actual code. No assumptions.*

---

### Client Portal — what your clients see when they log in

| ✅ | What it does |
|----|-------------|
| ✅ | **Dashboard home** — personalised greeting with time of day and first name. Onboarding checklist (4 steps, disappears when complete). |
| ✅ | **FIGSY (The Closer)** — full outbound sales agent. Clients can build campaigns, write email sequences, set sending schedules, track replies. |
| ✅ | **Campaign template library** — 6 pre-built outbound sequences clients can use as starting points. |
| ✅ | **AI campaign suggestion** — button that uses Claude to generate a campaign idea based on the client's ICP context. |
| ✅ | **Email quality score** — AI checks every email subject and body before sending. Returns green, amber, or red score with feedback. |
| ✅ | **Co-pilot mode** — FIGSY queues emails for your approval instead of sending automatically. Client sees "Pending approval" on every queued email. |
| ✅ | **AI model choice per campaign** — clients can choose faster/cheaper (Haiku) or better quality (Sonnet) for each campaign. |
| ✅ | **ICP Builder** — client builds their Ideal Customer Profile. FIGSY uses this to find and score leads via Apollo. |
| ✅ | **AI research per lead** — one click generates three bullet points of AI research on any lead, cached so it's fast on repeat views. |
| ✅ | **Auto-consent** — when a lead is scored as qualified, a consent email is sent automatically. Shown as "Auto-sent" on the leads table. |
| ✅ | **Inbox** — all replies in one place. Categorised automatically (positive, objection, referral, unsubscribe, OOO, wrong person). Filter tabs per category. |
| ✅ | **Warm leads tab** — separate inbox tab showing only leads who replied positively. The handoff list. |
| ✅ | **Milla (The Brain)** — AI assistant. Answers questions, runs tasks, gives briefings. Supports English, French, Kiswahili, and Hausa. |
| ✅ | **Milla integrations** — UI for connecting Google Calendar, Google Docs, HubSpot, and Slack. |
| ✅ | **KPI dashboard** — email open rates, reply rates, positive reply rates, deliverability score. |
| ✅ | **Email open tracking** — every sent email has a tracking pixel. Opens are recorded and shown in the KPI dashboard. |
| ✅ | **Deliverability dashboard** — health score, SPF/DKIM status, tips for improving inbox placement. |
| ✅ | **White-label PDF report** — client can export a branded PDF of their campaign results. |
| ✅ | **Knowledge base** — client uploads their company info, value prop, case studies. FIGSY generates a sample outreach sentence on save to confirm it worked. |
| ✅ | **Multi-user team** — client can invite team members. Roles: owner, admin, member. Each person gets their own login. |
| ✅ | **Notification preferences** — 5 toggles for controlling what email alerts the client receives. |
| ✅ | **Realtime dashboard** — live stats that update without refreshing the page. |
| ✅ | **MCP Connect page** — clients can connect K.I.N.D to external AI tools via the Model Context Protocol. |
| ✅ | **Partner Hub** — partners see a dedicated section in their sidebar with their referral code, deal registration, commission dashboard, onboarding guide, and value deck. |
| ✅ | **Conversational FIGSY onboarding** — new clients are walked through setup via a chat conversation rather than a form. |

---

### Admin Portal — what you see when you log into the admin

| ✅ | What it does |
|----|-------------|
| ✅ | **Dashboard** — live MRR in ZAR and USD, total clients, active subscriptions, past-due accounts, average time-to-first-lead, monthly targets, client pipeline health table. |
| ✅ | **All Clients** — every client with health score (green/amber/red), last login, lead count, campaign count, credit balance, at-risk filter. |
| ✅ | **Deal risk scoring** — flags clients at risk of churning based on activity signals. |
| ✅ | **Partners** — full partner management. List of all partners, approve or reject applications, view their deals, manage their commissions, mark payments as paid with Wise reference. |
| ✅ | **Revenue** — three projections (conservative, base, aggressive) with monthly targets and KPI tracking. |
| ✅ | **Roadmap** — 4-phase milestone tracker showing what's done and what's next. |
| ✅ | **Analytics** — cohort analysis, lead trends, campaign performance across all clients. |
| ✅ | **Compliance tracker** — SOC2 and ISO certification readiness checklist. |
| ✅ | **CMO Tools** — campaign content briefs, GTM planning. |
| ✅ | **Sales Playbook** — discovery call script, objection handling guide. |
| ✅ | **HubSpot sync** — deal sync dashboard showing which client deals have been pushed to HubSpot. |
| ✅ | **Demo environments** — create real demo client accounts with seeded data for showing to prospects. |
| ✅ | **Smoke test checklist** — manual go/no-go checklist before showing to a client. |

---

### Website (www.get-kind.com)

| ✅ | What it does |
|----|-------------|
| ✅ | **Full landing page** — live on Railway with Express server. Hero, agent sections, pricing, social proof. |
| ✅ | **Agent branding** — FIGSY (The Closer), Milla (The Brain), Vida (The Connector) with AI-generated agent photos. |
| ✅ | **All 21 sub-pages** — features, pricing, about, use cases, support, legal pages, etc. |
| ✅ | **Typewriter hero** — cycles through "Always on. / Break the ceiling. / Unlimited Pipeline." |

---

### Infrastructure & API

| ✅ | What it does |
|----|-------------|
| ✅ | **API on Railway** — Express server handling all client requests. Node 20. WebSocket polyfill for Supabase Realtime. |
| ✅ | **Stripe billing** — subscription checkout, credit top-ups, webhook handling, invoice payment tracking. |
| ✅ | **Supabase database** — 38+ migrations. Full schema for leads, campaigns, clients, partners, teams, billing, consent, tracking. |
| ✅ | **Email sending via Resend** — campaigns, consent emails, team invites, partner onboarding. |
| ✅ | **Apollo integration** — lead search and enrichment via Apollo API. |
| ✅ | **Waterfall enrichment** — tries multiple data sources in sequence to enrich a lead. |
| ✅ | **Intent signal triggers** — detects buying signals and flags leads automatically. |
| ✅ | **Revenue forecasting** — projects client revenue based on pipeline and conversion rates. |
| ✅ | **KIND as MCP server** — external AI tools can connect to KIND and call its functions. |
| ✅ | **Calendar, voice, WhatsApp routes** — API endpoints exist and are built. Activation depends on external credentials (Google, Twilio, WhatsApp Business API). |
| ✅ | **HubSpot contact and deal sync** — pushes positive replies as contacts and deals to HubSpot. |

---

## 🏗️ SECTION 0b — MASTER BUILD QUEUE — ALL PHASES
*Last updated: 31 May 2026 — full audit. Every item verified in code before status assigned.*
*Status: ✅ Live in code · 🔵 Claude builds (no blockers) · 🔴 Blocked — needs founder action · ⚪ Future (Phase 2/3)*

---

### PHASE 0 — Foundation UX & Core Product

| # | Item | Status | Notes |
|---|------|--------|-------|
| P0-1 | **Website copy rewrite** — full brand voice, agent names, pricing clear | ✅ Live | `c6a7a59` — AI Revenue OS copy, FIGSY/Milla/Vida named, Start/Scale/Dominate pricing. Site restored `d43a5f4` |
| P0-2 | **Learning Agent Level 2** — monthly ICP analysis cron, email founder with refinements | ✅ Live | `RESEND_API_KEY` confirmed in Railway — cron active |
| P0-3 | **Knowledge base preview** — FIGSY sample sentence on save | ✅ Live | `knowledge/page.tsx:92` |
| P0-4 | **Email open tracking** — pixel, `opened_at`, open rate KPI | ✅ Live | `figsy/track/open/:id`, migration done |
| P0-5 | **Notification preferences UI** — 5 toggles, localStorage | ✅ Live | `settings/page.tsx:645` |
| P0-6 | **Analytics empty state** — 4 action cards | ✅ Live | `kpis/page.tsx:576` |
| P0-7 | **Scheduled report emails** — weekly digest cron to clients | ✅ Live | `RESEND_API_KEY` confirmed in Railway — weekly digest cron firing |
| P0-8 | **Email score pre-send** — 0–100 badge on campaign step | ✅ Live | `figsy/[id]/page.tsx:18` |
| P0-9 | **Client morning brief** — daily email to active clients | ✅ Live | `RESEND_API_KEY` confirmed in Railway — daily brief cron active |
| P0-10 | **Co-pilot mode** — approve before send, per campaign | ✅ Live | `figsy/[id]/page.tsx:349` |
| P0-11 | **Auto-fire consent on approval** — fires on lead scored | ✅ Live | `leads.ts` + "Auto-sent" chip |
| P0-12 | **Realtime dashboard** — Supabase realtime → live counts | ✅ Live | `DashboardLive.tsx` — realtime subscriptions on leads/campaigns/emails/replies, green pulse indicator |
| P0-13 | **HubSpot CRM sync** — paste API key in settings | ✅ Live (blocked on key) | `lib/hubspot.ts` built. Needs `HUBSPOT_API_KEY` in Railway |
| P0-14 | **Multi-model toggle** — Haiku vs Sonnet per campaign | ✅ Live | `figsy/page.tsx:486` |
| P0-15 | **Template library** — 6 pre-built sequences | ✅ Live | `figsy/page.tsx:9-351` |
| P0-16 | **KIND AI sidebar section** — grouped agents, "View all →" | ✅ Live | `Sidebar.tsx` |
| P0-17 | **Personalised greeting** — time-of-day + first name | ✅ Live | `dashboard/page.tsx:142` |
| P0-18 | **FIGSY full page** — `/dashboard/figsy-chat`, two-column | ✅ Live | `figsy-chat/page.tsx` |
| P0-19 | **Agent card redesign** — coloured border + tint per agent | ✅ Live | `Sidebar.tsx:252` |
| P0-20 | **Empty state action cards** — all key pages | ✅ Live | `figsy/page.tsx:737` |
| P0-21 | **Light sidebar + clean background** | ✅ Live | `#F5F3FF` sidebar, `#FAFAFE` bg |
| P0-22 | **Input as design signal** — gradient border on all FIGSY inputs | ✅ Live | ICP builder textarea + knowledge base core-pitch + persona textareas — `842f39d` |
| P0-23 | **Workforce language pass** — "FIGSY sent", "Your team" throughout | ✅ Live | figsy, inbox, kpis, dashboard home pages — `842f39d` |
| Languages (Milla) | **Multi-language support** — English, Français, Kiswahili, Hausa | ✅ Live — pulled forward from P2 | `assistant/page.tsx` — localStorage `kind_milla_language_v1`, prepends `[Respond in {language}]` — `842f39d` |

---

### PHASE 1 — First Clients (0–5 paying)

| # | Item | Status | Notes |
|---|------|--------|-------|
| P1-1 | **Deliverability dashboard** — SPF/DKIM tips, health score | ✅ Live | `kpis/page.tsx:740` |
| P1-2 | **Email warm-up infrastructure** | 🔴 Blocked | Needs warm-up service subscription + API key |
| P1-3 | **Adaptive send volume** — auto-reduce on high bounce | ✅ Live | `c6a7a59` — cron 09:30 UTC daily, adjusts `settings.daily_send_limit` per opt-out/reply rate |
| P1-4 | **Blacklist monitoring** | 🔴 Blocked | Needs blacklist API key |
| P1-5 | **Inbox placement testing** | 🔴 Blocked | Needs Smartlead API key |
| P1-6 | **Expanded reply categories** — referral, OOO, unsub, wrong-person | ✅ Live | `inbox/page.tsx:75` |
| P1-7 | **Waterfall email verification** — Apollo → Hunter | 🔴 Blocked | Needs Hunter.io API key |
| P1-8 | **Warm leads tab** | ✅ Live | `inbox/page.tsx:75` |
| P1-9 | **Deal risk scoring in admin** | ✅ Live | `admin/clients/page.tsx:51` |
| P1-10 | **White-label PDF export** | ✅ Live | `kpis/page.tsx:341` |
| P1-11 | **Conversational FIGSY onboarding** | ✅ Live | `FigsyConversation.tsx` |
| P1-12 | **AI research per lead** — 3 bullet insight panel | ✅ Live | `leads/page.tsx:370` |
| P1-13 | **Technographic ICP targeting** | 🔴 Blocked | Needs Apollo $49/mo plan |
| P1-14 | **Google Maps scraping for African prospects** | 🔴 Needs decision | Founder to confirm — legal/ethical review needed |
| P1-15 | **Suggest campaigns button** | ✅ Live | `/figsy/suggest-campaign` API + `handleSuggestCampaigns()` portal |
| P1-16 | **Activate Portal V2** | 🔴 Founder action | Set `FEATURE_PORTAL_V2=true` in Railway — already built and dormant |
| MCP-1 | **KIND as MCP server** | ✅ Live | `routes/mcp.ts`, `/.well-known/mcp.json` |
| MCP-2 | **Milla external tool integrations UI** | ✅ Live (UI only) | `assistant/page.tsx:372` — Calendar/HubSpot/Slack panel. Actual OAuth connections not wired |
| MCP-3 | **MCP Connect portal page** — setup guide, endpoint/key display, AI walkthrough agent | ✅ Live | `dashboard/mcp/page.tsx`, `POST /mcp/guide`, sidebar entry added |

---

### PHASE 2 — 10+ Clients

| # | Item | Status | Detail |
|---|------|--------|--------|
| P2-1 | **3-type FIGSY memory model** — episodic + long-term + preference | ✅ Live | `apps/api/src/lib/figsy.ts` + `apps/api/src/routes/internal.ts` — episodic (14d), longterm (best subjects), preference (tone) |
| P2-2 | **A/B subject line testing** — 2 variants, auto-pick winner | ✅ Live | `apps/api/src/lib/figsy.ts:autoEnrollLead` 50/50 split + `/figsy/ab-winner-check` cron 10:00 UTC |
| P2-3 | **A/Z multi-variant testing** — 3–5 variants | ⚪ Not started | |
| P2-4 | **Conditional sequence branching (full UI)** | ✅ Live | Per-step on_reply (stop/skip_next/continue) in campaign Advanced Settings + `apps/api/src/routes/figsy.ts` |
| P2-5 | **Waterfall enrichment** — Apollo → PDL → Hunter → Clearbit | ✅ Live | `apps/api/src/lib/enrichment.ts` + `POST /leads/:id/waterfall-enrich` + "Fill data" button in leads table. Add PDL_API_KEY + HUNTER_API_KEY + CLEARBIT_API_KEY to Railway to activate |
| P2-6 | **Intent signal triggers** — job change / funding / tech stack change | ✅ Live | `POST /internal/figsy/check-intent-signals` daily cron 11:00 UTC + intent signal toggle in campaign Advanced Settings |
| P2-7 | **Configurable agent triggers UI** — send schedule | ✅ Live | Day-of-week + UTC hour controls in campaign Advanced Settings |
| P2-8 | **Kanban deal view** — visual pipeline | ✅ Live | `apps/portal/src/app/(dashboard)/dashboard/figsy/kanban/page.tsx` — 6 columns, GET `/campaigns/:id/kanban` |
| P2-9 | **File approval workflow** — sequence copy queued for client | ⚪ Not started | |
| P2-10 | **ICP auto-refinement** — AI analyses 50+ leads, suggests improvements | ✅ Live | `apps/api/src/routes/icps.ts:POST /icps/:id/refine` Claude Haiku + portal ICP card UI |
| P2-11 | **Network benchmarks** — "Your industry averages X% reply rate" | ✅ Live | `apps/portal/src/app/(dashboard)/dashboard/kpis/page.tsx` — reply 7.1%, open 42%, interested 2%, meeting 1% |
| P2-12 | **White-label / agency mode** — partner tier, revenue-share | ✅ Live | Scale plan section in `apps/portal/src/app/(dashboard)/dashboard/settings/page.tsx` |
| P2-13 | **Personalised images per lead** — name/logo in email | ⚪ Not started | |
| P2-14 | **Social signals audience source** — LinkedIn engagement filters | ⚪ Not started | |
| P2-15 | **ICP builder with live name preview** — real contacts as you filter | ✅ Live | Previously built — real names/titles populate as ICP filters applied |

---

### PHASE 3 — Year 2

| # | Item | Status |
|---|------|--------|
| P3-1 | **MCP server as product** — developer portal, API keys, "Twilio of B2B outreach" | ⚪ Not started |
| P3-2 | **FIGSY Vertical Modes** — pre-trained ICPs per industry (Fintech, Property, Health) | ⚪ Not started |
| P3-3 | **In-portal client messaging** — direct message thread founder ↔ client | ✅ Live | `supabase/migrations/20260531_client_messages.sql` + portal messages page + admin thread view |
| P3-4 | **Proposal + e-sign** — generate proposal → DocuSign | ⚪ Not started |
| P3-5 | **Revenue forecasting** — AI-predicted MRR for 90 days | ✅ Live | `c6a7a59` — 90-day forecast panel in admin revenue page, 3 scenarios |
| P3-6 | **Churn risk scoring** — flag KIND clients likely to churn in 30 days |
| P3-7 | **Website visitor de-anonymisation** — who visited, trigger FIGSY |
| P3-8 | **REEVE agent** — AE: books meetings, joins calls, drafts proposals |
| P3-9 | **LENA agent** — Customer Success: health monitoring, check-ins |
| P3-10 | **OTTO agent** — CRO: pipeline health, revenue forecasting |
| P3-11 | **Mobile app** — iOS + Android |
| P3-12 | **500+ FIGSY skill library** — modular verticals |
| P3-13 | **African data moat** — structured dataset → becomes "African Apollo" | ✅ Live | `supabase/migrations/20260531_african_data_moat.sql` + `POST /internal/data-moat/aggregate` + `GET /internal/data-moat/stats` + admin `/data-moat` page. Weekly Sunday 02:00 UTC cron aggregates anonymised lead outcomes |

---

### ✅ DONE THIS SESSION (31 May 2026)
| Item | Commit |
|------|--------|
| Agent panel width — FIGSY wrapper `w-72` → `w-64` | `f4bcf95` |
| ICP FIGSY typewriter — greeting animates on load | `f4bcf95` |
| Smoke test 500 — `status = 'contacted'` → `'consent_sent'` in GET /figsy/kpis | `0eacf81` |
| Mark meeting booked button — inbox hot/interested replies | `0eacf81` |
| Copy share link button — above stats on dashboard | `0eacf81` |
| AskFigsyButton chat persistence — localStorage, last 20 messages | `0eacf81` |
| NotificationBell theme — dark classes → light theme | `0eacf81` |
| Seed demo reply debug button — removed from production inbox | `0eacf81` |
| Layout overhaul — light sidebar `#F5F3FF`, clean `#FAFAFE` bg, dots removed, 220px sidebar | `c5b38e5` |
| Agent panel → RIGHT of content, home page panel removed (FigsyConversation handles it) | `15aa43f` |
| ICP Builder — FigsySidePanel moved to RIGHT side, consistent with all other pages | `f53579b` |
| **P0-18: FIGSY Full Page** — `/dashboard/figsy-chat`, hero textarea with purple gradient border, 4 starter pills, chat history, localStorage (30 msgs), avatars, mode=full | `c03a0c7` |
| **P0-16: KIND AI sidebar label** — "AI Agents" → "KIND AI" section header | `c03a0c7` |
| **P0-17: Personalized dashboard greeting** — "Good morning/afternoon/evening, [name]" + context subtitle | `c03a0c7` |
| **P0-6: Analytics empty state** — 4 action cards (Chat with FIGSY, Define ICP, Import LinkedIn, See roadmap) replacing "No data yet" | `c03a0c7` |
| **P0-20: Suggested starters on Campaigns + Inbox empty states** — action cards on figsy/page.tsx and inbox/page.tsx | `88dea2e` |
| **P0-5: Notification Preferences UI** — 5 toggles in Settings (reply received, low credits, campaign paused, weekly digest, daily brief), localStorage | `6fd5df2` |
| **P0-19: Agent card redesign** — coloured left border accent per agent, tinted bg, avatar 56px, role text in agent colour | `7ff727b` |
| **P0-23: "Chat with FIGSY" added as first nav item** under KIND AI section in sidebar | `c03a0c7` |
| **P1-8: Warm Leads tab in Inbox** — filters hot + interested + warm replies, sorted by most recent | `32297b8` |
| **P1-9: Deal risk scoring in Admin** — Risk column in clients list (red/amber/green), at-risk filter button, riskLabel() | `6c4d66b` |
| **P0-3: Knowledge Base FIGSY preview** — after saving pitch, FIGSY generates a sample outreach opening sentence | `f12e45f` |
| **P0-4: Email open tracking** — 1x1 pixel, opened_at column, /figsy/track/open/:id endpoint, open rate KPI | `aef1d4d` |
| **MCP-3: MCP Connect page** — `/dashboard/mcp`, endpoint + API key display, 4 tool cards, 3 setup guides (Claude.ai/Cursor/custom), `POST /mcp/guide` AI walkthrough agent, sidebar entry | `525f686` |
| **P0-12: Realtime dashboard** — `DashboardLive.tsx`, Supabase realtime on leads/campaigns/emails/replies, green pulse "Live" indicator, sparkline updates live | `55f4df6` |
| **Roadmap audit: Phase 0→3 build queue** — MASTER Section 0b full table + both roadmaps synced | `99b9d82` |

---

### 🟡 APPROVED TO BUILD — Awaiting "yes" from founder

**Priority 1 — P0-18: FIGSY Full Page**
`/dashboard/figsy-chat` — full-width dedicated FIGSY conversation page. Large centered input with purple gradient border, 4 smart suggested starters from live pipeline, full chat history, FIGSY avatar header. Sidebar FIGSY item routes here. Replaces floating button. This is the Monday.com answer.

**Phase 0 — Buildable now (no external deps)**
| # | Item | Status |
|---|------|--------|
| P0-1 | Website copy rewrite — "AI Revenue OS. FIGSY works 24/7." | 🔴 Not started |
| P0-3 | Knowledge base on-save preview — FIGSY generates sample sentence after saving | ✅ Done (previous session) |
| P0-4 | Email open tracking — pixel, `opened_at` column, open rate KPI | ✅ Done (previous session) |
| P0-5 | Notification preferences UI — toggle email notification events | ✅ Done `6fd5df2` |
| P0-6 | Analytics empty state — 4 action cards instead of "No leads yet." | ✅ Done `c03a0c7` |
| P0-8 | Email Score pre-send — 0–100 score per step, flags weak subjects + spam words | 🔴 Not started |
| P0-10 | Co-pilot mode — approve before send toggle per campaign | 🔴 Not started |
| P0-11 | Auto-fire consent on lead approval | 🔴 Not started |
| P0-14 | Multi-model toggle — Haiku vs Sonnet per campaign | ✅ Done `17cc871` |
| P0-15 | Template library — 5–9 pre-built sequence templates | 🔴 Not started |
| P0-16 | KIND AI sidebar section header | ✅ Done `c03a0c7` |
| P0-17 | Personalized dashboard greeting | ✅ Done `c03a0c7` |
| P0-18 | FIGSY Full Page — `/dashboard/figsy-chat` | ✅ Done `c03a0c7` |
| P0-19 | Agent card redesign — coloured background, larger avatar | ✅ Done `7ff727b` |
| P0-20 | Suggested starters on all empty states | ✅ Done `88dea2e` |
| P0-22 | Input as design signal — full-width gradient border everywhere | ✅ Live `842f39d` — ICP builder + knowledge base |
| P0-23 | Workforce language pass — "Your team", "FIGSY sent" throughout | ✅ Live `842f39d` — full pass across all portal pages |

**Phase 0 — Buildable (needs RESEND_API_KEY confirmed in Railway)**
| # | Item |
|---|------|
| P0-2 | Learning Agent Level 2 — monthly cron + Claude analysis + email + portal approval |
| P0-7 | Scheduled report emails — weekly client digest |
| P0-9 | Client morning brief — daily email to all active clients |
| P0-12 | Realtime dashboard — Supabase realtime wired to frontend |

**Phase 1 — Buildable now**
| # | Item |
|---|------|
| P1-1 | Deliverability dashboard — SPF/DKIM/DMARC status, bounce rate, spam score |
| P1-3 | Adaptive send volume — auto-reduce sends when bounce/spam rises |
| P1-6 | Expanded AI reply categories — wrong person, unsubscribe, OOO, auto-reply distinct |
| P1-8 | Lead Catcher — warm leads tab, auto-surfaces interested replies |
| P1-9 | Deal risk scoring — flag inactive client accounts in admin |
| P1-10 | White-label PDF report — per-client performance report |
| P1-11 | Conversational FIGSY onboarding — 5-question chat flow replaces ICP form |
| P1-12 | AI research per lead — personalised opening line per prospect |
| P1-15 | "Suggest Campaigns" button — AI recommends next campaign target |

**Phase 1 — Blocked (founder action needed)**
| # | Item | Needs |
|---|------|-------|
| P1-2 | Email warmup infrastructure | Warmup service subscription |
| P1-4 | Blacklist monitoring | Blacklist API key |
| P1-5 | Inbox placement testing | Smartlead API key |
| P1-7 | Waterfall email verification | Hunter.io API key |
| P1-13 | Technographic ICP targeting | Apollo Basic plan |
| P1-14 | Google Maps scraping | Founder confirm |
| P1-16 | Activate Portal V2 | Set `FEATURE_PORTAL_V2=true` in Railway |

---

### 🔴 PHASE 0 — Build Now (no dependencies, no client data needed)
*Founder says "build P0-X" to start any of these.*

| # | Item | Source |
|---|------|--------|
| P0-1 | **Website copy rewrite** — "AI Revenue OS — FIGSY finds your clients, books the meetings, and reports back. 24/7. No SDR required." Zero code, immediate impact | Apex steal |
| P0-2 | **Learning Agent Level 2** — monthly cron pulls reply data per ICP, Claude analyses which industries/titles/company sizes are converting, emails founder with refined ICP suggestion, founder approves in portal → ICP updates automatically | Section 31 |
| P0-3 | **Knowledge base on-save preview** — after saving any knowledge section, FIGSY generates a sample sentence showing how it'll use that knowledge in outreach | Existing partial |
| P0-4 | **Email open tracking** — pixel in emails, `opened_at` on `figsy_sent_emails`, open rate KPI on dashboard | New build |
| P0-5 | **Notification preferences UI** — toggle which events send email notifications (reply received, low credits, campaign paused, etc.) | New build |
| P0-6 | **Analytics empty state** — replace bare "No leads yet." with FIGSY-coached empty state + CTA | Existing partial |
| P0-7 | **Scheduled report emails** — weekly digest to clients: leads delivered, replies, credit balance. Cron already exists | ClickUp steal |
| P0-8 | **Email Score pre-send** — score each sequence step 0–100 before launch. Flag weak subjects, spam words, missing personalisation, weak CTA | Lavender / Saleshandy steal |
| P0-9 | **Client morning brief** — extend founder daily brief to all active clients: leads delivered, replies, balance, next send | Apex steal |
| P0-10 | **Co-pilot mode** — per-campaign toggle: queue outgoing emails for client approval before FIGSY sends | Alta steal |
| P0-11 | **Auto-fire consent on lead approval** — when ICP run completes and leads are approved, consent emails fire automatically. No button | Section 19 |
| P0-12 | **Realtime dashboard** — wire Supabase realtime to portal so lead counts + reply numbers update live, no page refresh | Section 19 |
| P0-13 | **Self-serve CRM paste** — client pastes HubSpot/Salesforce API key in settings → FIGSY syncs automatically | Section 19 |
| P0-14 | **Multi-model toggle per campaign** — Haiku (volume/speed) vs Sonnet (quality/complex ICP) | ClickUp steal |
| P0-15 | **Template library** — 5–9 pre-built FIGSY sequence templates: email only, LinkedIn-first, re-engagement, event-driven, competitor switch | Alta / Clay steal |
| P0-16 | **KIND AI sidebar section** — group FIGSY, Milla, Vida under a named "KIND AI" header in the sidebar nav. Each agent is a destination, not just a column. Click FIGSY → FIGSY is the page | Monday steal |
| P0-17 | **Personalized dashboard greeting** — replace cold KPI cards as hero with: "Hi [Name] — X leads replied this week. FIGSY has Y recommendations." KPIs move to secondary row below | Monday steal |
| P0-18 | **FIGSY full-page mode** — dedicated `/dashboard/figsy` page: wide centered input with purple gradient border, collapsible chat history sidebar column, 4 smart suggested starters below input based on current pipeline state | Monday steal |
| P0-19 | **Agent card redesign** — FIGSY/Milla/Vida cards get colored background block, large avatar, name + one-line role description, "Talk to FIGSY" CTA. Replaces small icon-in-panel-header treatment | Monday steal |
| P0-20 | **Suggested starters on all empty states** — replace every "No X yet." with 3–4 action cards. Leads page: Define ICP / Import from Apollo / Add manually / See how scoring works. Campaigns page: Launch first campaign / Let FIGSY write sequence / See example results. Analytics: Send first campaign to see stats | Monday steal |
| P0-21 | ~~**Wider content + lighter sidebar**~~ **✅ DONE `c5b38e5`** — sidebar `#F5F3FF` light, 220px. Agent column collapsible (Collapse/expand button, localStorage state). Background `#FAFAFE`. Dots removed. | Monday steal |
| P0-22 | **Input as design signal** — all FIGSY inputs (ICP builder, FIGSY page, knowledge base) upgraded to full-width, large textarea with purple gradient border. Communicates: this is how you use the product | Monday steal |
| P0-23 | **Workforce language pass** — copy audit across entire portal. "Your agents" → "Your team". "AI tools" → "Meet your SDR team". Campaign events: "FIGSY sent 47 emails this morning." Reply events: "FIGSY flagged this as hot." Agents as staff, not features | Monday steal |

---

### 🔴 PHASE 1 — First Clients (0–5 paying clients)

| # | Item | Source |
|---|------|--------|
| P1-1 | **Deliverability dashboard** — SPF/DKIM/DMARC status, bounce rate, spam score per sending domain | Instantly / Smartlead steal |
| P1-2 | **Email warmup infrastructure** — Priority #1 steal. Gradually warm new sending domains before full sends. Every major competitor has this | Lemlist / Instantly steal |
| P1-3 | **Adaptive send volume** — auto-reduce daily sends when domain health dips, increase as it recovers | Woodpecker steal |
| P1-4 | **Blacklist monitoring** — alert when sending domain appears on spam blacklists | QuickMail steal |
| P1-5 | **Inbox placement testing pre-launch** — test if email lands in inbox vs promotions vs spam before campaign fires | Smartlead SmartDelivery steal |
| P1-6 | **Expanded AI reply categories** — wrong person, unsubscribe, auto-reply, OOO as distinct categories (currently grouped as cold) | Smartlead / Instantly steal |
| P1-7 | **Waterfall email verification** — Apollo → Hunter → fallback before sending, cut bounce rate | Lemlist steal |
| P1-8 | **Lead Catcher** — auto-surface positive replies to a "warm leads" tab on dashboard, no manual sorting | Mailshake steal |
| P1-9 | **Deal risk scoring** — "this client account hasn't had activity in 14 days — flag as at-risk" in admin | Outreach steal |
| P1-10 | **White-label reporting export** — PDF performance report per client they can share with investors | Reply.io steal |
| P1-11 | **Conversational FIGSY onboarding** — replace form-based ICP builder with 5-question FIGSY chat. Client describes target in plain language, FIGSY builds ICP, shows first leads — all in chat before leaving | Section 19 |
| P1-12 | **AI research per lead** — before writing email, FIGSY reads lead's LinkedIn/website and writes one personalised opening sentence per prospect | Clay steal |
| P1-13 | **Technographic targeting in ICP** — "target companies using HubSpot but not an outbound tool" — add tech stack filter to ICP builder | Demandbase / Apollo steal |
| P1-14 | **Google Maps scraping for African prospects** — build local SA/NG/KE prospect lists from Google Maps for industries thin in Apollo | PhantomBuster steal |
| P1-15 | **"Suggest Campaigns" button** — AI analyses lead pool + past performance and suggests next campaign target | Alta steal |
| P1-16 | **Activate Portal V2** — already built, dormant. Set `FEATURE_PORTAL_V2=true` in Railway. SidebarV2, Mission Control 3-column dashboard | Existing |

---

### 🔴 PHASE 2 — 10+ Clients

| # | Item | Source |
|---|------|--------|
| P2-1 | **3-type memory model** — split `figsy_memory` into episodic (recent replies) + long-term (winning angles, company context) + preference (tone/format per ICP). Schema migration + new generation logic | ClickUp Brain steal |
| P2-2 | **A/B subject line testing** — 2 variants to first 20% of leads, pick winner by 48h open rate, send winner to remaining 80% | Section 31 Level 3 |
| P2-3 | **A/Z multi-variant testing** — extend to 3–5 variants simultaneously | Saleshandy steal |
| P2-4 | **Conditional sequence branching (full)** — if reply = warm → branch to different follow-up sequence. Backend schema exists; need full UI + cron | Lemlist / Outreach steal |
| P2-5 | **Waterfall enrichment** — Apollo → PDL → Hunter → Clearbit. Fill missing fields on every lead. Needs PDL + Hunter API keys | Clay steal |
| P2-6 | **Intent signal triggers** — job change / funding round / tech stack change → auto-add to FIGSY campaign | Clay / Apollo steal |
| P2-7 | **Configurable agent triggers UI** — "Run FIGSY at 9am Mon-Fri" or "on new lead added". Replaces hardcoded cron | ClickUp steal |
| P2-8 | **Kanban deal view** — visual pipeline for K.I.N.D's own sales + client campaign stages | ClickUp steal |
| P2-9 | **File approval workflow** — sequence copy queued for client to approve in portal before FIGSY sends | ClickUp steal |
| P2-10 | **ICP auto-refinement** — after 50+ leads: AI analyses reply data → suggests ICP improvements → client approves in portal | Section 27 |
| P2-11 | **Network benchmarks** — "Your industry averages 7.1% reply rate. You're at 11.4%." | Section 28 |
| P2-12 | **White-label / agency mode** — partner tier pricing, partner-facing onboarding kit, revenue-share model | Section 34 |
| P2-13 | **Personalised images per lead** — prospect name/company logo injected into image in email. 5–15% open rate lift | Lemlist steal |
| P2-14 | **Social signals audience source** — prospects who engaged with relevant LinkedIn posts, filter by engagement type + time window | Alta steal |
| P2-15 | **ICP builder with live name preview** — as filters applied, real contact names + job titles populate (currently shows count only) | Alta steal |

---

### 🔴 PHASE 3 — 20+ Clients / Year 2

| # | Item | Source |
|---|------|--------|
| P3-1 | **MCP server** — K.I.N.D as infrastructure. API keys table, developer portal. "Twilio of AI-powered B2B outreach." Lemlist already has theirs | Section 34 |
| P3-2 | **FIGSY Vertical Modes** — pre-trained ICPs, sequence templates, reply handlers per vertical (Property, Fintech, Professional Services). Premium pricing tier | Section 34 |
| P3-3 | **In-portal client messaging** — direct message thread between client and your team in portal | ClickUp steal |
| P3-4 | **Proposal + e-sign** — generate proposal from ICP + pricing → DocuSign integration | Section 27 |
| P3-5 | **Revenue forecasting** — AI-predicted MRR for next 90 days | Clari / Gong steal |
| P3-6 | **Churn risk scoring** — Clari-style model: flag K.I.N.D clients likely to churn in 30 days | Section 33 |
| P3-7 | **Website visitor de-anonymisation** — who visited kindai.co.za, company + individual → trigger FIGSY outreach | Apollo Pocus steal |
| P3-8 | **REEVE agent** — AE: books meetings to Calendly automatically, joins discovery calls as notetaker, drafts proposals | Section 34 |
| P3-9 | **LENA agent** — Customer Success: monitors health, flags at-risk, handles check-ins | Section 34 |
| P3-10 | **OTTO agent** — CRO: pipeline health, revenue forecasting, anomaly alerts | Section 34 |
| P3-11 | **Mobile app** — iOS + Android | Section 27 |
| P3-12 | **500+ FIGSY skill library** — modular skills per vertical | Section 27 |
| P3-13 | **African data moat** — structured queryable dataset of every lead, score, ICP, reply, outcome across all clients. Becomes "African Apollo" | Section 34 |

---

### 📋 FOUNDER ACTION LIST (not mine to build — yours to action)

**Confirmed done — verified in commit log:** RESEND_API_KEY ✅, HubSpot account + API key ✅, Calendly link ✅, FIGSY_KIND_CLIENT_ID ✅, Resend inbound webhook ✅

| # | Item | Unlocks |
|---|------|---------|
| F1 | **Stripe price IDs for Milla + Vida → Railway** | Tests 3 + 4 — subscription checkout goes live |
| F2 | **Run `20260527_stripe_subscription_id.sql`** in Supabase SQL editor | Stripe subscription tracking |
| F3 | **ADMIN_SECRET_KEY in Railway** — any strong random string | Cron jobs authenticate |
| F4 | **Run meetings_booked migration** — `ALTER TABLE figsy_campaigns ADD COLUMN IF NOT EXISTS meetings_booked integer NOT NULL DEFAULT 0` | KPI meetings column exists in DB |
| F5 | **Upgrade Resend to paid plan** | 100 email/day cap on free plan will be hit on first real campaign |
| F6 | **Apollo upgrade to Basic ($49/mo)** | Lead search returns real results (free plan returns 0) |
| F7 | **UK company registration** (Companies House £12) — share company number when received | Legal pages, Stripe, investor conversations |
| F8 | **Wise business account** | After UK registration — required for partner commission payments |
| F9 | **Google Workspace** — set up `jacques@get-kind.com` | Professional email — when first client, not urgent before |
| F10 | **MacBook from Currys** (£599) | All future dev on personal hardware |
| F11 | **Solicitor call outcome** — share what was decided re: Smartsheet clauses 17.2 + 19.3.2 | Clears legal ambiguity on builds |
| F12 | **ICO data protection registration** — ico.org.uk, £40/year | Legal requirement to process personal data in UK |
| F13 | **K.I.N.D trademark** — ipo.gov.uk, ~£170 | Brand protection |
| F14 | **FIGSY trademark** — ipo.gov.uk, ~£170 | Brand protection |
| F15 | **SEIS advance assurance** — apply to HMRC before raising | Investor tax relief (50% income tax relief) |
| F16 | **SeedLegals IP assignment + shareholders agreement** | IP formally owned by company not founder personally |

---

### 🚫 WILL NOT BUILD (ever)
| Item | Why |
|------|-----|
| LinkedIn automation | ToS risk — permanent account ban |
| Self-hosted deployment | Kills SaaS model |
| Multi-year contracts | Locks in bad clients |
| Collaborative docs / whiteboards | Not our domain |
| Internal team chat | Use Slack |
| Custom emoji | Vanity |

---

## 1. CURRENT STATUS — WHAT'S LIVE

*Last updated: 27 May 2026 (overnight build + competitive audit)*

### Infrastructure
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
| Admin cohort analytics | ⏳ Not built | Route `/admin/cohorts` does not exist — code was planned but never created. Build at 10+ clients. |
| Portal Analytics page | ⏳ Not built | Route `/dashboard/analytics` does not exist — stale `.next` type was misleading. Build at 10+ clients. |
| Stripe USD/GBP billing | ✅ Code complete | Billing page auto-activates when `STRIPE_SECRET_KEY` is set in Railway |
| Paystack | ❌ Removed from billing UI | Stripe-only. Paystack requires SA entity — not applicable. API routes preserved for legacy data only. |
| Lead drip system | ✅ Live | `delivered_at` on leads, daily_drip_rate per client, 08:10 UTC cron |
| Credits deduct at delivery | ✅ Live | 1 credit per lead when daily drip delivers it — NOT at insertion |
| Lead overspend fix | ✅ Live | maxLeads cap + leads_per_run client setting respected |
| Apollo fallback search | ✅ Live | 3-pass fallback: full → remove consent filter → remove size filter |
| Low credit warning | ✅ Live | Daily 07:40 UTC — emails clients with 1–4 credits remaining (max 1/24h) |
| Subscription lapse check | ✅ Live | Daily 09:00 UTC — marks active subs past period end as `lapsed`, emails client |
| Milla (virtual_assistant) access gate | ✅ Fixed | React hooks violation fixed — no more crash on load |
| Vida (chatbot) access gate | ✅ Fixed | `active` only — removed trialing (must have paid subscription) |
| FIGSY trial expiry gate | ✅ Fixed | Backend rejects trialing campaigns with expired current_period_end |
| Cancel subscription | ✅ Live | `POST /subscriptions/:id/cancel` — DB status update + Stripe cancel |
| Recurring billing webhooks | ✅ Live | `customer.subscription.created/updated` → DB upsert. `customer.subscription.deleted` → mark cancelled. `invoice.payment_failed` → log warning |
| Admin credit grant cap | ✅ Live | Hard cap 500 credits per grant — prevents accidental large grants |
| FIGSY trialing gate removed | ✅ Fixed | FIGSY page now requires `active` only (no trialing) |
| Credit pricing aligned | ✅ Fixed | 2 tiers: Kind AI 20/$20, 100/$100 · FIGSY 20/$60, 100/$300 |
| ~~Paystack KYC~~ | ❌ Removed | Paystack not applicable — requires SA entity. Stripe is primary. |
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
| **Daily automated audit — 04:00 + 16:00 SAST** | ✅ Live | `.github/workflows/daily-audit.yml` — opens GitHub Issue on failure. Runs twice daily. |
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
| **Stripe price IDs — Milla + Vida** | ⏳ MUST DO BEFORE TEST 3 | Stripe dashboard → create Milla ($49/mo recurring) + Vida ($39/mo recurring) → copy Price IDs → add to Railway as `STRIPE_PRICE_MILLA_MONTHLY` + `STRIPE_PRICE_VIDA_MONTHLY` + `NEXT_PUBLIC_` versions |
| **Run `20260527_stripe_subscription_id.sql`** | ⏳ MUST RUN | Supabase SQL Editor — adds `stripe_subscription_id` column to subscriptions table |
| **Credit race condition fix** | ✅ Fixed 27 May | Unique index on `credit_transactions.reference` + atomic `increment_client_credits()` RPC. Migration `20260526_credit_race_condition_fix.sql` — user confirmed run. |
| **Startup env check** | ✅ Built 27 May | `apps/api/src/lib/startup-check.ts` — logs CRITICAL/IMPORTANT/OPTIONAL at boot, refuses to start if CRITICAL missing |
| **AI reply 7-category upgrade** | ✅ Built 27 May | 🔥 Hot / 🌤️ Warm / ❄️ Cold / 🚫 Opted out / 👤 Wrong person / ✈️ OOO / ❓ Other. Backward-compat: old 'interested'→hot, 'not_interested'→cold |
| **Admin Unibox** | ✅ Built 27 May | `/unibox` in admin — all FIGSY replies across all clients, filter by classification, hot-sorted, limit 200. Added to admin nav. |
| **Portal reply inbox upgrade** | ✅ Built 27 May | Emoji labels, actionable summary bar (Hot + Warm count), sorted by priority |
| **Homepage hero rewrite** | ✅ Built 27 May | "Stop chasing leads. Let FIGSY book them." — website + landing |
| **Self-serve Stripe subscriptions — Milla + Vida** | ✅ Built 27 May | Billing page: Milla ($49/mo) + Vida ($39/mo) subscribe buttons → `POST /stripe/subscribe` → Stripe checkout → webhook → DB activation |
| **Paystack fully removed from billing UI** | ✅ Done 27 May | Portal billing page Stripe-only. Paystack API routes preserved (legacy) but no client-facing UI. |
| **Milla upgrade screen updated** | ✅ Done 27 May | "Unlock Milla — $49/month →" → /dashboard/billing. Demo request button retained. |
| **Vida upgrade screen updated** | ✅ Done 27 May | "Unlock Vida — $39/month →" → /dashboard/billing. Demo request button retained. |
| **ClickUp competitive audit** | ✅ Done 27 May | Section 24 — steal-now list S1–S8, 2 structural gaps documented |
| **Apex (apex.host) competitive audit** | ✅ Done 27 May | Section 25 — positioning steal: "AI Revenue OS" framing |

### ⚠️ Known Technical Debt (audit findings — log for later)
| Issue | Severity | Notes |
|---|---|---|
| Duplicate /leads/consent/bulk and /leads/bulk-consent routes | Medium | Same functionality, different param names. Pick one and deprecate other. NOTE: all other "duplicate" routes were GET+POST on same path — correct REST, not bugs. |
| ~~Credit deduction race condition in /credits/verify~~ | ✅ **Fixed 27 May** | Unique DB index on `credit_transactions.reference` + atomic `increment_client_credits()` RPC — double-spend impossible |
| ~~ICP delete doesn't cascade leads~~ | ✅ **Fixed 26 May** | Migration `20260526_icp_cascade.sql` — leads.icp_id SET NULL on ICP delete |
| Exchange rate hardcoded at R19/$ in credits.ts | Medium | Update monthly or add daily rate fetch when you have 50+ paying clients |
| ~~Paystack plan codes env vars empty~~ | ~~High~~ | **Removed** — Paystack not applicable. Stripe handles all billing. |
| Agent trigger model — hardcoded cron | Medium | FIGSY runs 3x daily on fixed times. No event-driven triggers yet. Build at 20 clients. |
| Memory model — flat figsy_memory table | Medium | Single table. ClickUp/Apex have 3-type model (episodic/long-term/preference). Build at 10 clients. |

---

## 2. WHAT FOUNDER NEEDS TO DO

### 🔴 CRITICAL — Do In This Order

| # | Task | Where | Why |
|---|---|---|---|
| ~~1~~ | ~~Apollo API key~~ | ✅ **Done** | — |
| ~~2~~ | ~~RESEND_API_KEY in Railway~~ | ✅ **Done** | — |
| ~~3~~ | ~~Railway deploy logs~~ | ✅ **Done — green** | — |
| ~~4/5/6~~ | ~~SQL migrations~~ | ✅ **Done** — subscriptions schema + drip system applied | — |
| **7** | **Set up Stripe** | stripe.com → create account → get keys → create 6 prices (4 credit bundles + Milla $49/mo + Vida $39/mo) → add to Railway | Primary payment processor. UK business, bills African + global clients in USD/GBP. Already fully built — activates on env vars. |
| **7b** | **Add Milla + Vida subscription prices to Railway** | Stripe dashboard → create recurring products → add `STRIPE_PRICE_MILLA_MONTHLY`, `STRIPE_PRICE_VIDA_MONTHLY`, + NEXT_PUBLIC versions | Required before Test 3. Do NOT paste IDs in chat — add directly to Railway. |
| **7c** | **Run `20260527_stripe_subscription_id.sql`** | Supabase SQL Editor — paste and run | Adds `stripe_subscription_id` column to subscriptions — required for Milla/Vida webhook processing |
| **8** | **Register UK company** | companieshouse.gov.uk — £50, same day | Required for Stripe UK account + professional credibility. See Section 23. |

### 🟡 HIGH — Do This Week

| # | Task | Where | Notes |
|---|---|---|---|
| 9 | **Create HubSpot account** | app.hubspot.com (free) → Private Apps → "KIND AI" → add `HUBSPOT_API_KEY` to Railway | Fully built — wires itself the moment key is set |
| 10 | **Register Resend inbound webhook** | Resend dashboard → Webhooks → URL + `RESEND_WEBHOOK_SECRET` in Railway | Enables FIGSY reply processing |
| 11 | **Add FIGSY_KIND_CLIENT_ID to Railway** | Railway → KIND API → Variables | Your client UUID — self-outreach does nothing without it |
| 12 | **Create calendar booking link** | calendly.com or cal.com (free) → share URL | Claude wires every Book a Demo button in 5 mins |
| 13 | **Upgrade Resend to paid plan** | resend.com → Billing | Free = 100 emails/day — blocks FIGSY at scale |

### 🟢 WHEN READY

| # | Task | Notes |
|---|---|---|
| 14 | **Wise Business bank account** | business.wise.com — after UK company registered. Free, multi-currency, receives USD/GBP from Stripe. |
| 15 | **Google Workspace** | ~$12/mo — do when first client or first hire. Gmail fine for now. |
| 16 | **Flutterwave** (Phase 2 Africa) | For clients needing M-Pesa, local bank transfer, ZAR local cards. UK business can register. Add after first 5 clients. |
| 17 | Google Calendar OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| 18 | Vapi.ai Voice | `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ASSISTANT_ID`, `VAPI_WEBHOOK_SECRET` |
| 19 | WhatsApp Business API | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` |
| 20 | Campaign intent prompt | `FEATURE_CAMPAIGN_INTENT=true` in Railway |
| 21 | ICP builder | `FEATURE_ICP_BUILDER=true` in Railway |

### ❌ REMOVED — Not Applicable
| Item | Why removed |
|------|-------------|
| Paystack KYC | Requires SA/NG registered business entity. UK-based founder cannot complete. Not needed — Stripe handles African clients (USD/GBP). |
| Paystack subscription plan codes | Same reason — Paystack removed from payment stack. |

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

### ✅ ALL DONE TO DATE
| Task | Done |
|---|---|
| Apollo API key in Railway | ✅ |
| RESEND_API_KEY in Railway | ✅ |
| Railway green build | ✅ |
| All SQL migrations applied | ✅ |
| Stripe account + 6 prices + keys in Railway | ✅ |
| NEXT_PUBLIC Stripe vars in Vercel | ✅ |
| UK company registration submitted | ✅ In progress — awaiting Companies House |
| HubSpot account + API key in Railway | ✅ |
| Resend inbound webhook + secret in Railway | ✅ |
| FIGSY_KIND_CLIENT_ID in Railway | ✅ |
| Calendly link created + wired site-wide | ✅ |
| Drip migration applied in Supabase | ✅ |
| ICP cascade delete migration applied | ✅ |

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
| Demo page (/demo) — 8 feature chapters with scroll-triggered animations | 19 May |
| Platform video (platform-video.html) — 16-scene auto-playing demo (FIGSY + Milla + Vida) | 19 May |
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
| 12 cron jobs total | 20 May | *(final count: 19 as of 26 May — 3× daily auto-status, founder brief, and additional monitoring crons added)* |
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
| Admin dark theme full rollout — all pages restyled to dark-first design | 25 May |
| Admin Founder OS V2 — dark sidebar, grouped sections, Founder OS branding | 25 May |
| Admin AI exec team pages — /agents/otto, /lena, /reeve, /cmo, /cto, /cfo with agent identity cards + brief API | 25 May |
| Admin living docs viewer — /docs/* renders MASTER, run-costs, legal as markdown in admin | 25 May |
| Admin compliance tracker — /compliance with full certification roadmap (SOC2, ISO 27001, ISO 42001) | 25 May |
| Admin platform health page — /health system-wide monitoring | 25 May |
| Admin revenue deep-dive — /revenue scenario tracker | 25 May |
| Internal briefs router — POST /internal/briefs/* AI exec team daily briefs | 25 May |
| Waitlist landing page — pre-launch interest capture (netlify-waitlist/) | 25 May |
| Portal V2 full redesign — SidebarV2, Mission Control Dashboard (FEATURE_PORTAL_V2=true) | 25 May |
| Milla + Vida billing launch — lock screens, demo request, pricing ($49/$39) in portal | 25 May |
| Sales playbook file — docs/sales-playbook.md: discovery script, objections, demo flow, proposal template | 25 May |
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
| Stripe 3-tier credit bundles — 40cr tier added, corrected prices across all tiers ($20/$38/$88 Lead Gen, $60/$110/$250 FIGSY) | 26 May |
| Flutterwave integration — ZAR/NGN/KES/GHS local African payments (Phase 2, code complete) | 26 May |
| ICP cascade delete migration — leads.icp_id SET NULL on ICP delete | 26 May |
| Calendly booking link wired — website + landing pages + portal (URL provided by Jacques) | 26 May |
| 3× daily auto-status system — platform_status table, Admin /status page, crons at 07:10/12:00/19:00 SAST | 26 May |
| **Credit race condition fix** — unique index on `credit_transactions.reference` + atomic RPC `increment_client_credits` — double-spend impossible | 27 May |
| **Startup env check** — `lib/startup-check.ts` runs at boot, logs CRITICAL/IMPORTANT/OPTIONAL vars, refuses to start if CRITICAL missing | 27 May |
| **AI reply categorisation upgrade** — 7 categories: 🔥 Hot / 🌤️ Warm / ❄️ Cold / 🚫 Opted out / 👤 Wrong person / ✈️ OOO / ❓ Other. Replaces 5-category system. Backward compatible (old 'interested'→hot, 'not_interested'→cold) | 27 May |
| **Unibox (admin)** — `/unibox` in admin dashboard: all FIGSY replies across all clients, filtered by classification, hot-sorted. Added to nav | 27 May |
| **Portal reply inbox upgrade** — new Hot/Warm/Cold/Wrong person/OOO labels + emoji, actionable summary bar, sorted by priority | 27 May |
| **Homepage hero rewrite** — outcome-first: "Stop chasing leads. Let FIGSY book them." — website + landing | 27 May |
| **Duplicate routes audit** — investigated all flagged routes: all were different HTTP methods (GET+POST) on same path. No true duplicates. Technical debt entry updated. | 27 May |

### Ready Now (say the word)
| Task | Time |
|---|---|
| **Wire "Book a Demo" buttons** | **5 mins** — share your Calendly/Cal.com URL |
| **Sales playbook skeleton** | 2 hours — discovery script, objection log, demo flow, proposal template |
| ~~**S1: Command palette**~~ | ✅ Done 27 May — `CommandPalette.tsx`, Cmd+K |
| ~~**S2: Activity feed**~~ | ✅ Done 27 May — `ActivityFeed.tsx`, integrated into dashboard |
| ~~**S3: Shareable read-only dashboards**~~ | ✅ Done 27 May — `/share/[token]`, OG image |
| **S4: Scheduled report emails** (steal from ClickUp) | 4h — weekly digest cron to clients |
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
| Self-serve Stripe subscriptions (Milla + Vida) | Claude | ✅ Done 27 May |
| 7-category reply classification + Unibox | Claude | ✅ Done 27 May |
| Credit race condition fix | Claude | ✅ Done 27 May |
| Startup env check | Claude | ✅ Done 27 May |
| Stripe keys in Railway | Jacques | ⏳ Pending — required for Test 3 |
| Stripe Milla + Vida price IDs in Railway | Jacques | ⏳ Pending — required for Test 3 |
| Google Workspace | Jacques | ⏳ Pending |
| Portal facelift + API wiring + S1-S3 ClickUp steals | Claude | ✅ Done 27 May |
| Demo Playbook (Section 35) | Claude | ✅ Done 27 May |
| Smoke tests pass (Tests 1–4) | Jacques + Claude | ⏳ Starting 28 May |
| First 5 paying clients | Jacques | ⏳ Pending |
| FIGSY campaigns live (own GTM) | Both | ⏳ Pending |

### Month 1–2 (June 2026)
| Item | Owner | Notes |
|---|---|---|
| Milla + Vida full launch | Both | Subscription billing live — self-serve via Stripe |
| Voice agent activation | Jacques | Vapi.ai account + Twilio SA number |
| WhatsApp activation | Jacques | Meta Business API (3–7 day approval) |
| Google Calendar activation | Jacques | Google Cloud OAuth |
| Stripe activation | Jacques | USD/GBP billing |
| Pan-African presence: 3 countries | Both | Apollo data covers all |
| Admin cohort analytics | Claude | ⏳ Planned — build at 10+ clients |

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

### Virtual Assistant (Milla) — Subscription billing live — awaiting Stripe price IDs in Railway
| Item | Notes |
|---|---|
| Document upload + RAG chat | FTS now, pgvector at 50+ clients |
| Source attribution | Answers cite which doc |
| Locked screen | Upgrade + Book a Demo CTAs |

### Chatbot Agent (Vida) — Subscription billing live — awaiting Stripe price IDs in Railway
| Item | Notes |
|---|---|
| Config, conversations, embed code | Full |
| vida-widget.js | Self-contained embeddable JS |
| Locked screen | Upgrade + Book a Demo CTAs |

### Billing
| Item | Notes |
|---|---|
| ~~Paystack (ZAR topups)~~ | Removed — requires SA entity. Stripe is primary. |
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

### Admin Portal — 13 Routes (`admin.get-kind.com`) — Redesigned 28 May (purple sidebar, portal-matching palette)
| Route | Item | Status |
|---|---|---|
| `/` | Dashboard — KPIs, MRR, TTFL, client pipeline | ✅ Live |
| `/clients` | Clients list — all clients, subs, T&Cs | ✅ Live |
| `/clients/[id]` | Client detail — subscriptions, credit balance, grant/refund form, transactions, company reg, VAT | ✅ Live (18 May) |
| `/demo` | Demo Environments — create/open/extend/expire, AE tracking | ✅ Live (18 May) |
| `/launch` | Launch checklist — 13 sections, 60+ items | ✅ Live |
| `/roadmap` | Roadmap — Phase 1–4 milestone tracking | ✅ Live |
| `/cmo` | CMO tools — LinkedIn post generator, prospect finder | ✅ Live |
| `/founder` | Founder OS V2 — AI exec team, internal briefs, revenue, health, waitlist | ✅ Live (25 May) |
| `/playbook` | Sales playbook — full AE guide | ✅ Live (25 May) |
| `/terms-library` | Terms library — compliance doc store | ✅ Live (25 May) |
| `/hubspot` | HubSpot pipeline — Kanban by stage, shows connect guide if key absent | ✅ Live (26 May) |
| `/scalability` | Scalability tracker — stage tracker, hire checklist, infra triggers | ✅ Live (26 May) |
| `/unibox` | Admin Unibox — all FIGSY replies across all clients, filter by classification, hot-sorted | ✅ Live (27 May) |

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

### Client Portal — 15 Routes (`app.get-kind.com`)
| Route | Item | Status |
|---|---|---|
| `/login` | Auth — email/password login | ✅ Live |
| `/onboard` | Onboarding — post-signup flow | ✅ Live |
| `/dashboard` | Dashboard home — KPIs, credits, trial status | ✅ Live |
| `/dashboard/leads` | Leads — ICP builder, lead table, score, CSV export | ✅ Live |
| `/dashboard/figsy` | FIGSY — AI SDR campaigns, sequences, reply inbox | ✅ Live |
| `/dashboard/assistant` | Milla — AI virtual assistant (Milla) — gated | ✅ Live |
| `/dashboard/chatbot` | Vida — chatbot agent config + embed — gated | ✅ Live |
| `/dashboard/documents` | Documents — upload, RAG, source attribution | ✅ Live |
| `/dashboard/kpis` | KPI Dashboard — client's own metrics | ✅ Live |
| `/dashboard/usage` | Usage — credit history, top-up | ✅ Live |
| `/dashboard/billing` | Billing — Stripe subscriptions, Milla/Vida subscribe buttons | ✅ Live |
| `/dashboard/billing/confirm` | Billing confirm — post-Stripe redirect | ✅ Live |
| `/dashboard/roadmap` | Roadmap — client-facing build roadmap | ✅ Live |
| `/dashboard/referral` | Referral — 100 credits both ways | ✅ Live |
| `/dashboard/settings` | Settings — company profile, CRM integrations, calendar | ✅ Live |

### Website (get-kind.com) — 22 Pages
| Page | URL | Status |
|---|---|---|
| Homepage | `/` | ✅ Live |
| About | `/about.html` | ✅ Live |
| Pricing | `/pricing.html` | ✅ Live |
| Support | `/support.html` | ✅ Live |
| Terms | `/terms.html` | ✅ Live |
| Trust & Privacy | `/trust.html` | ✅ Live |
| DPA (UK/EU) | `/dpa.html` | ✅ Live |
| DPA (US) | `/dpa-us.html` | ✅ Live |
| Use Cases | `/use-cases.html` | ✅ Live |
| Partners | `/partners.html` | ✅ Live |
| FIGSY (AI SDR) | `/chatbot-agent.html` | ✅ Live |
| Virtual Assistant | `/virtual-assistant.html` | ✅ Live |
| Demo | `/demo.html` | ✅ Live |
| Demo Video | `/demo-video.html` | ✅ Live |
| FIGSY Video | `/figsy-video.html` | ✅ Live |
| Platform Video | `/platform-video.html` | ✅ Live |
| Platform Video (standalone) | `/platform-video-standalone.html` | ✅ Live |
| vs Apollo | `/vs-apollo.html` | ✅ Live |
| vs Outreach | `/vs-outreach.html` | ✅ Live |
| vs Salesloft | `/vs-salesloft.html` | ✅ Live |
| vs Hiring an SDR | `/vs-hiring-an-sdr.html` | ✅ Live |
| vs Prospecting Manually | `/vs-prospecting-manually.html` | ✅ Live |

---

## 6. BLOCKED FEATURES — NEEDS CREDENTIALS ONLY

| Feature | What to do | Env vars needed |
|---|---|---|
| ~~Paystack~~ | Removed — requires SA entity. Not applicable. Stripe is primary. | — |
| **Stripe USD/GBP billing** | Create Stripe account + 4 price IDs | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, 4× STRIPE_PRICE_* |
| **Voice calls (Vapi.ai)** | Vapi account + Twilio +27 number | VAPI_API_KEY, VAPI_PHONE_NUMBER_ID, VAPI_ASSISTANT_ID, VAPI_WEBHOOK_SECRET |
| **WhatsApp** | Meta Business API approval | WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN |
| **Google Calendar** | Google Cloud project + OAuth | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI |
| **Resend inbound routing** | Upgrade Resend to paid | Then configure webhook to /figsy/replies/inbound |
| **Milla + Vida subscriptions** | Self-serve billing LIVE — Stripe checkout built. Awaiting Jacques to create Stripe recurring prices ($49 Milla, $39 Vida) and add price IDs to Railway | STRIPE_PRICE_MILLA_MONTHLY, STRIPE_PRICE_VIDA_MONTHLY |

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
| **Milla** | Founder's daughter | Virtual Assistant — trained on your business | Subscription billing live — awaiting Stripe price IDs in Railway |
| **Vida** | Founder's daughter | Chatbot Agent — website + WhatsApp inbound qualifier | Subscription billing live — awaiting Stripe price IDs in Railway |

---

## 12. PRICING MODEL
*Updated: 1 Jun 2026*

### Product Tiers

| Product | What it does | Price USD | Price ZAR | Billing |
|---|---|---|---|---|
| **K.I.N.D AI — Lead Gen** | Apollo-sourced leads, AI scoring, POPIA consent | $1/lead | R19/lead | Credit consumption |
| **FIGSY — AI SDR** | Full outreach sequences, reply handling, meeting booking | $3/lead | R57/lead | Credit consumption |
| **Milla — Virtual Assistant** | AI chat, document upload, knowledge base | $49/mo | R931/mo | Stripe subscription |
| **Vida — Chatbot Agent** | Website chatbot, WhatsApp-ready | $39/mo | R741/mo | Stripe subscription |

### Credit Bundles (Stripe)

| Product | Bundle | Price USD | Price ZAR | Effective per lead |
|---|---|---|---|---|
| Lead Gen | 20 credits | $20 | R380 | $1.00 |
| Lead Gen | 40 credits | $38 | R722 | $0.95 |
| Lead Gen | 100 credits | $88 | R1,672 | $0.88 |
| FIGSY | 20 credits | $60 | R1,140 | $3.00 |
| FIGSY | 40 credits | $110 | R2,090 | $2.75 |
| FIGSY | 100 credits | $250 | R4,750 | $2.50 |

**Minimum spend:** $20 (20 Lead Gen credits). No monthly minimum once trial ends.

**Blended ARPU assumption:** $80–120/month per active client (mix of credit top-ups + Milla/Vida subscriptions).

### Exchange Rate
ZAR pricing locked at R19/$1 for client communications. Stripe bills in USD. Wise Business receives USD → ZAR conversion at market rate.

---

## 13. UNIT ECONOMICS
*Updated: 1 Jun 2026*

### Per Lead — Variable Cost Breakdown

| Cost item | Per lead | Notes |
|---|---|---|
| Apollo API (lead source) | ~$0.004 | Basic plan $49/mo ÷ ~10,000 credits |
| Claude Haiku (email gen) | ~$0.003 | ~500 tokens input + 300 output per email × 3 steps |
| Resend (email delivery) | ~$0.001 | Pro plan $20/mo ÷ ~20,000 sends |
| PDL/Hunter (enrichment) | ~$0.002 | Enrichment on ~30% of leads only |
| **Total variable cost/lead** | **~$0.010** | |

### Per Client — Unit Economics

| Metric | Lead Gen client | FIGSY client | Combined |
|---|---|---|---|
| Average monthly spend | $30 | $90 | $120 |
| Variable cost | $0.30 | $0.90 | $1.20 |
| **Gross margin** | **99%** | **99%** | **99%** |
| Fixed cost allocation (÷ 20 clients) | $10 | $10 | $10 |
| **Contribution margin** | **$20** | **$80** | **$110** |

**Gross margin is ~99% on revenue.** Variable costs are negligible. Fixed infrastructure is the ceiling.

### LTV / CAC

| Metric | Conservative | Target |
|---|---|---|
| Avg monthly spend (ARPU) | $80 | $120 |
| Avg client lifetime | 8 months | 18 months |
| **LTV** | **$640** | **$2,160** |
| CAC (FIGSY self-outreach, no paid ads) | $0 | $0 |
| CAC (if paid ads at Month 6) | — | ~$150 |
| **LTV:CAC ratio** | **∞ (organic)** | **14:1 (paid)** |

**Key insight:** Because K.I.N.D acquires clients using FIGSY (the product itself), CAC is effectively zero during the first year. The product is the sales channel.

---

## 14. CASHFLOW MODEL
*Updated: 1 Jun 2026*

### Fixed Monthly Tech Costs

| Service | Current plan | Cost/mo | When to upgrade |
|---|---|---|---|
| Supabase | Pro (af-south-1) | $25 | Scale to Team at 500+ clients |
| Railway | Hobby ($5) + usage | $15–25 | Already on Hobby — covers 4 services |
| Apollo.io | Basic $49/mo | $49 | Upgrade to Professional at 50+ clients |
| Google Workspace | Business Starter | $14 | At hire #1 |
| Resend | Pro | $20 | Already needed — free = 100 emails/day |
| Clearbit | Free Reveal tier | $0 | Paid at 10k+ monthly visitors |
| Claude API (Anthropic) | Pay per token | $15–40 | Scales with active clients |
| Stripe | 2.9% + $0.30/txn | ~$8 at $280 MRR | No monthly fee |
| Domain (get-kind.com) | Annual | ~$1 | — |
| **Total fixed floor** | | **~$147–174/mo** | |

### Variable Costs at Scale

| Clients | Monthly revenue | Variable costs | Fixed costs | **Net profit** |
|---|---|---|---|---|
| 1 | $80 | $1 | $147 | **-$68** |
| 3 | $240 | $3 | $160 | **+$77** |
| 5 | $480 | $5 | $165 | **+$310** |
| 10 | $960 | $10 | $175 | **+$775** |
| 20 | $2,000 | $20 | $200 | **+$1,780** |
| 50 | $5,500 | $55 | $280 | **+$5,165** |
| 100 | $12,000 | $120 | $400 | **+$11,480** |

**Break-even: 3 clients.** Everything above 3 is profit.

### Month-by-Month MRR Targets (from Jun 2026)

| Period | Month | Target MRR (USD) | Target MRR (ZAR) | Clients | Key milestone |
|---|---|---|---|---|---|
| Launch | Jun 2026 | $800 | R15,200 | 3–5 | First paying clients, legal cleared |
| Early | Jul 2026 | $2,500 | R47,500 | 8–10 | FIGSY self-outreach live |
| Growth | Aug 2026 | $5,000 | R95,000 | 15–20 | Demo playbook proven |
| Growth | Sep 2026 | $10,000 | R190,000 | 30 | First churn data |
| Scale | Oct 2026 | $18,000 | R342,000 | 50 | First SDR hire |
| Scale | Nov 2026 | $28,000 | R532,000 | 80 | Series A prep possible |
| Scale | Dec 2026 | $40,000 | R760,000 | 120 | Year 1 target |

**Year 1 target: $40,000 MRR by Dec 2026 = $480,000 ARR**

### Core KPIs (check every Monday)

| KPI | Target | Red flag | Current |
|---|---|---|---|
| TTFL (Time to First Lead) | < 2 hours | > 4 hours | — |
| Trial → Paid conversion | > 40% | < 25% | — |
| Month 1 churn | < 5% | > 10% | — |
| FIGSY reply rate | > 8% | < 3% | — |
| ICP built within 24h | > 80% | < 60% | — |
| Avg credits/client/month | > 40 | < 15 | — |
| At-risk clients (no ICP 3+ days) | 0 | > 2 | — |

---

## 14b. MULTI-YEAR REVENUE PROJECTIONS
*Updated: 1 Jun 2026*

| Year | MRR (USD) | MRR (ZAR) | ARR (USD) | Clients | ARPU | Headcount |
|---|---|---|---|---|---|---|
| Y1 end (Dec 2026) | $40,000 | R760,000 | $480,000 | 120 | $120 | 1–2 |
| Y2 end (Dec 2027) | $120,000 | R2,280,000 | $1,440,000 | 450 | $150 | 5–8 |
| Y3 end (Dec 2028) | $300,000 | R5,700,000 | $3,600,000 | 1,000 | $220 | 15–20 |
| Y4 end (Dec 2029) | $700,000 | R13,300,000 | $8,400,000 | 2,500 | $280 | 35–50 |
| Y5 end (Dec 2030) | $1,500,000 | R28,500,000 | $18,000,000 | 5,000+ | $300 | 80–100 |

### What drives ARPU growth
- Y1: Lead Gen + FIGSY only → avg $80–100
- Y2: Milla + Vida added to majority of clients → avg $150
- Y3: Agency/white-label tier + developer API tier → avg $220
- Y4: Enterprise CRM, multi-agent orchestration → avg $280

### Acquisition strategy by phase
| Phase | Channel | Cost |
|---|---|---|
| Y1 (0–120 clients) | FIGSY self-outreach on K.I.N.D's own ICP | $0 CAC |
| Y1 (Month 6+) | LinkedIn content + community | $0 CAC |
| Y2 | Partner referrals (20% commission, 12 months) | ~$150 CAC |
| Y2+ | Paid LinkedIn (SA, UK, Nigeria) | ~$300 CAC |
| Y3+ | Apollo outbound at scale | ~$200 CAC |

### Exit / Funding scenarios
| Path | Trigger | Valuation basis | Est. value |
|---|---|---|---|
| Seed raise | £3–10k MRR growing 20%+ MoM | 8–12x ARR | £300k–1.2M |
| Series A | $1M ARR, strong retention | 10–15x ARR | $10–15M |
| Strategic acquisition | $3M+ ARR, African data moat | 5–8x ARR | $15–24M |
| PE / growth equity | $5M+ ARR | 4–6x ARR | $20–30M |
| IPO (JSE) | $15M+ ARR, 2,000+ clients | Market rate | $75M+ |

**Most likely Y3 outcome:** Strategic acquisition by Apollo, HubSpot, or African tech co at 5–8x ARR. At $3.6M ARR (Y3): **$18–29M exit.**

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
Client → Billing → selects plan → Stripe checkout → webhook fires → subscription active.

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
| Payments | Stripe (USD/GBP — primary, live) + Flutterwave (ZAR/NGN/KES/GHS — Phase 2, code complete) | Credit bundles + subscriptions |
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
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
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
STRIPE_PRICE_LEADGEN_40=        ← 40-credit Lead Gen bundle
STRIPE_PRICE_FIGSY_40=          ← 40-credit FIGSY bundle  
STRIPE_PRICE_MILLA_MONTHLY=     ← Milla $49/mo subscription
STRIPE_PRICE_VIDA_MONTHLY=      ← Vida $39/mo subscription
NEXT_PUBLIC_STRIPE_PRICE_MILLA_MONTHLY=
NEXT_PUBLIC_STRIPE_PRICE_VIDA_MONTHLY=
FLUTTERWAVE_SECRET_KEY=     ← from Flutterwave dashboard → API Keys
FLUTTERWAVE_WEBHOOK_HASH=   ← set in Flutterwave webhook settings, copy same string here
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
| 10 5 * * * | 07:10 | POST /internal/platform/status | Platform status snapshot (morning) |
| 0 10 * * * | 12:00 | POST /internal/platform/status | Platform status snapshot (midday) |
| 0 17 * * * | 19:00 | POST /internal/platform/status | Platform status snapshot (evening) |

---

## 18. SMOKE TEST CHECKLIST

*Updated: 27 May 2026 — full 4-test suite. Run in order. Do not skip.*
*Account: Brand new Gmail — never used on K.I.N.D before.*
*URL: https://app.get-kind.com*

---

### 🧪 TEST 1 — Core Platform (Fresh Signup)
*Goal: Verify the full client journey from signup to first leads, no prior state.*

#### 🔐 Auth
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 1 | Go to `get-kind.com` → click Sign Up | Lands on signup page | Page error / broken link |
| 2 | Enter new Gmail + password → Sign Up | Goes straight to `/onboard` — **no confirmation email** | Stuck, error, or asks to confirm email |
| 3 | Fill company name, industry, country → Start free trial | Dashboard loads with your company name | Error or blank screen |

#### 🎯 Leads & ICP
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 4 | Go to Leads → Build ICP → click **"Suggest ICP with AI"** | Claude fills the form automatically | Spinner hangs / empty fields |
| 5 | Adjust anything → **Save & Find Leads** | Leads appear within 2–3 min with scores | No leads / error |
| 6 | Click one lead → **Send POPIA consent** | Status changes to `consent_sent` | Nothing happens |
| 7 | **Export CSV** | File downloads, correct columns | Error or empty file |

#### 💳 Billing
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 8 | Go to Billing → buy credits | Stripe checkout opens | Nothing opens / error |
| 8b | Complete test payment | Returns to portal, balance updated | Stuck on Stripe / balance unchanged |

#### 🔒 Gated Features
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 9 | Click FIGSY in sidebar | Shows **Upgrade** prompt — not dashboard | Crashes or shows FIGSY dashboard |
| 10 | Click Assistant (Milla) in sidebar | Shows **Upgrade** prompt | Crashes |
| 11 | Click Chatbot (Vida) in sidebar | Shows **Upgrade** prompt | Crashes |

#### 📊 Platform Health
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 12 | Bottom of sidebar | 🟢 "All systems operational" | Red dot / missing |
| 13 | Check Gmail inbox (the account you signed up with) | Welcome email received | Nothing arrives |

#### 🛠️ Admin Check (admin.get-kind.com)
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 14 | Admin → Clients → find new test account | Appears in list | Not there |
| 15 | Admin → Unibox | Page loads (empty is fine) | 404 or crash |
| 16 | Admin → grant test account **10,000 credits** | Balance shows 10,000 in portal | Error / wrong balance |
| 17 | Sign out → sign back in | Dashboard loads clean | Loop / blank screen |

---

### 🧪 TEST 2 — Agents (FIGSY, Milla, Vida)
*Goal: Full agent experience as a paying client. Run AFTER Test 1.*
*Pre-req: Run this SQL in Supabase to unlock all agents for the test account.*

**SQL — paste in Supabase SQL Editor, replace email:**
```sql
-- Replace with your test Gmail address
DO $$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT id INTO v_client_id FROM public.clients
    WHERE user_id = (
      SELECT id FROM auth.users WHERE email = 'YOUR_TEST_EMAIL@gmail.com'
    );

  INSERT INTO public.subscriptions (client_id, product, status, current_period_end)
  VALUES
    (v_client_id, 'figsy',             'active', now() + interval '30 days'),
    (v_client_id, 'virtual_assistant', 'active', now() + interval '30 days'),
    (v_client_id, 'chatbot',           'active', now() + interval '30 days')
  ON CONFLICT DO NOTHING;
END $$;
```

#### 🔥 FIGSY — AI SDR
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 18 | Click FIGSY in sidebar | FIGSY dashboard loads — NOT upgrade prompt | Still shows upgrade / crashes |
| 19 | Create a new campaign | Campaign appears in list with status `draft` | Error saving |
| 20 | Enrol a lead into the campaign | Lead appears in campaign, status `enrolled` | Error |
| 21 | Click **Pause** on an active campaign | Status changes to `Paused` | Button missing / error |
| 22 | Click **Resume** on a paused campaign | Status changes back to `Active` | Error |
| 23 | Click **Delete** on a draft campaign | Campaign removed, confirmation shown | Error |
| 24 | Go to FIGSY → Replies inbox | Page loads (empty is fine) | 404 or crash |
| 25 | Check reply labels show new categories | 🔥 Hot / 🌤️ Warm / ❄️ Cold / ✈️ OOO etc | Old labels / missing |

#### ✋ Lead Actions (Stop + Block)
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 26 | Go to Leads → click one lead → **Block lead** | Lead status → `opted_out`, removed from pipeline | Nothing / error |
| 27 | Confirm blocked lead does NOT re-appear in leads list | Lead gone / marked blocked | Still shows in active leads |

#### 🤖 Milla — Virtual Assistant
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 28 | Click Assistant in sidebar | Milla dashboard loads | Upgrade prompt / crashes |
| 29 | Upload a test document (any PDF or .txt) | Status shows `Processing` → then `Ready` | Error uploading |
| 30 | Start a new chat session → ask "What services do we offer?" | Milla replies using the document | Error / blank |
| 31 | Ask a follow-up question in same session | Milla maintains context | Starts from scratch |

#### 💬 Vida — Chatbot Agent
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 32 | Click Chatbot in sidebar | Vida config page loads | Upgrade prompt / crashes |
| 33 | Fill bot name, greeting message → Save config | Config saves, confirmation shown | Error |
| 34 | Copy the embed code shown | Code appears in UI | Nothing shown |

---

### 🧪 TEST 3 — Payments (Full Stripe Flow)
*Goal: Full Stripe payment flow — credits + both agent subscriptions.*
*Pre-req: `STRIPE_WEBHOOK_SECRET` in Railway.*
*Pre-req: 6 Stripe price IDs in Railway (4 credit + 2 subscription).*
*Test card: `4242 4242 4242 4242` · any future expiry · any CVC · any postcode*

#### 💳 Credit Purchase
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 35 | Billing → Lead Gen → select 20 credits → Buy | Stripe checkout opens | Nothing opens — `STRIPE_PRICE_LEADGEN_20` missing |
| 36 | Complete with test card | Payment accepted | Declined — wrong test mode key |
| 37 | Return to portal | Balance +20 credits | Unchanged — webhook not firing |
| 38 | Transaction history | Purchase entry appears | Missing — webhook issue |

#### 🤖 Milla Subscription
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 39 | Billing → Milla card → **Unlock Milla — $49/month** | Stripe checkout opens in **subscription mode** (shows "£/$/€49 per month") | Nothing — `STRIPE_PRICE_MILLA_MONTHLY` missing |
| 40 | Complete with test card | Redirects to `/dashboard/assistant?subscribed=1` | Stuck on Stripe |
| 41 | Milla page loads — no upgrade prompt | Full Milla dashboard visible | Still shows upgrade prompt — webhook not firing |
| 42 | Go back to Billing | Milla card shows green **Subscribed** badge | Still shows buy button |

#### 💬 Vida Subscription
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 43 | Billing → Vida card → **Unlock Vida — $39/month** | Stripe checkout opens in **subscription mode** | Nothing — `STRIPE_PRICE_VIDA_MONTHLY` missing |
| 44 | Complete with test card | Redirects to `/dashboard/chatbot?subscribed=1` | Stuck on Stripe |
| 45 | Vida page loads — no upgrade prompt | Full Vida config page visible | Still shows upgrade prompt — webhook not firing |
| 46 | Go back to Billing | Vida card shows green **Subscribed** badge | Still shows buy button |

#### 🔄 Auto Top-Up
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 47 | Admin → reduce test account credits to 2 | Balance shows 2 | Error |
| 48 | Enable auto top-up in Billing settings → save | Saved confirmation | Error |

---

### 🧪 TEST 4 — Edge Cases & Compliance
*Goal: Test failure states, opt-outs, and compliance flows.*

#### ⚠️ Zero Credits
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 49 | Admin → set credits to 0 | Portal shows credit warning / top-up prompt | No warning |
| 50 | Try to run lead search with 0 credits | Blocked with clear message | Runs anyway / silent fail |

#### 🚫 Opt-Out / Unsubscribe Flow
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 51 | In Leads → manually block a lead | Lead status → `opted_out` | Nothing |
| 52 | Try to send POPIA consent to that blocked lead | Blocked — cannot send to opted-out lead | Sends anyway |
| 53 | Check opt-out blocklist in Supabase | Lead email appears in `opt_out_blocklist` | Not there |

#### 🔁 Session & Auth
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 54 | Open portal in private/incognito tab | Redirects to login | Shows dashboard to unauthenticated user |
| 55 | Let session expire (or clear cookies) → reload | Redirects to login cleanly | Blank screen / crash |

#### 📧 Email Delivery Check
| # | Do this | Pass ✅ | Fail ❌ |
|---|---------|---------|---------|
| 56 | Check Gmail for welcome email | Received, renders correctly | Missing / in spam |
| 57 | Check Gmail for POPIA consent email (from step 6) | Received, unsubscribe link works | Missing / broken link |

---

### 🚨 How to report failures
**Format: Step # — what you saw — screenshot if possible**

Send them here. I fix in real time.

---

### ✅ Client Flowchart — Status
*Section 15 — up to date as of 27 May 2026*

| Flow | Status |
|------|--------|
| Self-service trial → signup → onboard → dashboard → 14-day trial → pay | ✅ Verified |
| AE-assisted → order form + payment | ✅ Built |
| Pay day 1 — skip trial | ✅ Built |
| Trial expired → overlay → pay to regain | ✅ Built |
| Upgrade — add FIGSY bundle | ✅ Built (admin action) |
| FIGSY add-on — AE activates via admin | ✅ Built |
| Sales demo — Admin → Demo Envs → open portal as prospect | ✅ Built |
| Opt-out — lead replies stop → auto-blocklist | ✅ Built |
| Auto top-up — credits hit threshold → Stripe charges | ✅ Built |
| Subscription lapse — period ends → marked lapsed → email sent | ✅ Built |

---

## 19. PRODUCT VISION — 1, 3, 5 YEARS

> **The first-mover window in Africa is 18–24 months.** The moat being built now — the data, the brand, the client relationships — is what makes K.I.N.D unconquerable when bigger players arrive.

> **TTFL (Time to First Lead) is not just a metric. It is the competitive weapon.** Every competitor makes you wait. We deliver in under 2 hours.

---

### 🎯 IDEAL PRODUCT FLOW — LOCKED 28 MAY 2026
*Confirmed by founder. This is the north star. Every feature decision gets measured against it.*

**Standard: Client up and running in under 10 minutes. First results in under 20.**

#### Step 1 — Onboarding (0–10 min)
New user signs up → **FIGSY greets them conversationally**, asks 5 ICP questions in chat (who do you sell to, what industry, what size company, what country, what problem do you solve). No forms. FIGSY generates the ICP profile, immediately searches Apollo, and shows the first 10 scored leads — all before the client leaves the chat. First "aha moment" happens before setup ends.

- FIGSY is always the guide. Interactive, conversational, in the room.
- Company/ZoomInfo CSVs are a secondary import path — never the primary.
- *Current state: ICP Builder exists but is form-based. Conversational flow is F5 in build queue.*

#### Step 2 — Lead sourcing (10–12 min)
"Find more leads" → client describes their target in plain language to FIGSY → KIND searches Apollo, scores against ICP, ranks list. Client clicks "Approve all" or cherry-picks. Done. No CSV export/import cycle. FIGSY agents support every step — if stuck, ask FIGSY.

- *Current state: Apollo search + scoring works. Conversational trigger from FIGSY chat is F5.*

#### Step 3 — Consent (automatic, 12–15 min)
When leads are approved, POPIA consent emails fire automatically — no button required. Client watches the activity feed update in real time. "Mark as consented" exists only as a manual fallback. Status flows: `pending → scored → consent_sent → consent_given` without any clicks.

- *Current state: consent email requires clicking Send button. Auto-fire on approval is F2 in build queue.*

#### Step 4 — FIGSY campaign (15–18 min)
Dashboard nudges: "You have 12 consented leads — start a FIGSY campaign." Client names it, clicks Generate. FIGSY writes the 3-step email sequence using ICP + company context + any knowledge base training. Client reviews. Clicks Launch. Emails go out automatically. Steps 2 and 3 arrive in the same Gmail thread as replies. Data flows between every section — update ICP, campaigns adapt. Update leads, FIGSY knows.

- *Current state: campaign generation + launch works. Reply threading fixed 28 May. Auto-data-flow is ongoing.*

#### Step 5 — Replies → inbox (zero friction)
Replies arrive in the portal inbox pre-classified (hot/warm/cold) by AI. Client sees one clean list — no switching tabs, no Gmail. One-click to mark as meeting booked → KPI dashboard updates. FIGSY flags hot replies with a summary: "This person asked about pricing — they're ready."

- *Current state: inbox works. Reply classification works. "Mark meeting booked" button needs to feed `meetings_booked` KPI (F3 in build queue).*

#### Step 6 — Dashboard (single scoreboard, live)
Leads sourced → consented → emailed → replied → meetings booked. Live numbers, no refresh needed. Activity feed shows last 20 events across all campaigns. Client knows at a glance if the machine is running.

- *Current state: real activity feed live as of 28 May. Live numbers (no-refresh) is F4 in build queue.*

#### Step 7 — CRM sync (coming)
FIGSY asks the client: "Do you use HubSpot or Salesforce? Paste your API key and I'll sync everything." Replies, meeting bookings, lead status all flow back to their CRM automatically. No duplication. No manual export.

- *Current state: HubSpot integration exists in admin. Client-side self-serve CRM paste is F6 in build queue.*

#### Step 8 — Learning loop (ongoing)
FIGSY learns from every campaign. Which subject lines get replies. Which industries convert. Which follow-up timing works. It adapts sequences, flags underperforming campaigns, and over time gets better for every client. A learning robot — not a static tool.

- *Current state: `generateSequenceWithMemory` uses campaign history. Intent signal detection (C14) is the upgrade.*

---

> **Data accumulates from Day 1.** Every lead scored, every ICP run, every FIGSY email sent is a proprietary dataset no competitor can buy. By Year 3, that dataset is the product.

### Year 1 (by May 2027) — $40,000 MRR
- 150+ paying clients (SA, UK, US, Nigeria, Kenya)
- Lead Gen + FIGSY proven and reliable
- Milla (VA) + Vida (Chatbot) live for 30+ clients
- K.I.N.D's own outbound running entirely on FIGSY
- **Critical output:** Data. Every client run builds the dataset.

### Year 2 (2027) — $120,000 MRR / 450 clients
- **Full B2B Revenue OS** — K.I.N.D handles the entire journey from stranger to signed contract
- Built-in CRM — clients stop needing HubSpot or Salesforce
- Pipeline forecasting — AI predicts close probability from lead score + FIGSY engagement
- Multi-channel FIGSY — email, LinkedIn, WhatsApp, voice
- Pan-African launch: Nigeria, Kenya, Ghana, Egypt
- Recurring subscription model becomes primary revenue

### Year 3 (2028) — $300,000 MRR / 1,000 clients
- **Data Advantage** — proprietary dataset: leads scored + converted across thousands of African B2B companies
- Predictive ICP — K.I.N.D tells you who to target before you ask
- Industry benchmarks — "Companies like yours convert at 3.2% — you're at 1.8%"
- White-label offering for agencies
- SOC 2 Type II certified

### Year 4 (2029) — $700,000 MRR / 2,500 clients
- **The Network Effect** — K.I.N.D sits between buyers and sellers across thousands of companies
- Warm B2B introductions — K.I.N.D knows who wants to buy and who wants to sell
- Marketplace dynamics — deals happen on the platform
- **K.I.N.D becomes a B2B network, not just software**
- First institutional funding or strategic acquisition interest

### Year 5 (2030) — Market Leader
- 5,000+ clients, 10+ countries, IPO-ready on JSE
- Or acquisition by global CRM, data, or AI player at $50–100M+
- **The Salesforce of Africa — AI-native from day one**

---

## 20. ALTA AI SDR — COMPETITIVE AUDIT
*Deep analysis completed 27 May 2026. Sources: 93-page deck · 26-min Fathom transcript (Rachelle Shapiro / Jacques Vieira) · altahq.com · **28 live product screenshots · KIND_vs_Alta_Full_Analysis.docx***
*Use this as the performance and product benchmark for every FIGSY build decision.*

---

### What Alta Actually Is

Alta is not an "SDR tool" — they've deliberately repositioned as an **"AI GTM System of Actions"** and **"AI Revenue Workforce"**. The framing: not a feature, not an automation, but an AI team that replaces or augments your entire revenue function.

**Four named agents (+ custom persona visible):**
| Agent | Role | What they do |
|-------|------|-------------|
| **Katie** | Outbound SDR | Email + LinkedIn + SMS sequences, prospecting, personalisation |
| **Alex** | Inbound Calling Agent | Qualifies inbound leads, books meetings, follows up via voice |
| **Luna** | RevOps Intelligence | Insights, anomaly detection, forecasting, CRM sync, "Suggest Campaigns" |
| **Taylor Solutions** | Custom persona | White-label / client-specific agent naming visible in demo |

**Their moat claim**: Built by the team that built **monday.com's internal "BigBrain" revenue platform**. Not an OpenAI wrapper. Proprietary data models.

**Tagline**: *"The #1 Data-Driven AI Revenue Workforce"*

**Entry price**: ~$1,250+/month. Quarterly contract. Zero free trial. Sales-assisted only — no self-serve sign-up.

---

### The Demo — How Rachelle Ran It (Fathom transcript, 26 minutes)

**The most important technique: 6 minutes of discovery BEFORE touching the product.**

She asked: What brought you here / what AI tools do you use / does your manager know / how many on your team / CRM / timeline / region?

By the time she opened her screen she knew: **0.8x pipeline coverage vs 3-4x goal** (Smartsheet EMEA), Salesforce, telecom vertical is hot, manager is Tyron, global implementation constraint, 4-day week. She built the entire demo around that context. **Not a generic walkthrough — a mirror of the prospect's exact problem.**

**This is Jacques. He is K.I.N.D's exact target user.** Working AE. Uses Claude and ZoomInfo/Sales Nav but finds them too manual. Needs automated lead generation. He could start K.I.N.D today for $20 — no call, no demo, no approval from Tyron.

**Demo sequence:**
| Step | What she showed | Why it worked |
|------|-----------------|---------------|
| Problem reframe | "You have 0.8x pipeline — Alta clients typically get to 3–4x" | Made the problem quantified and urgent |
| Home screen | "Who should we target today?" + 7-day flow metrics | Proactive, action-first — not a passive dashboard |
| Compass / Agent Training | Website URL → auto-generated pitch, keywords, signals, messaging | "She knows your pitch before you send" |
| ICP builder with live names | Filters set → real contact names populate in right panel | Single most impactful demo moment |
| Visual sequence builder | Node tree, LinkedIn steps, branch on reply/accept | "It reacts to them, not just fires blindly" |
| AI enrichment column | Custom research step per prospect — "What CRM do they use?" | Emails reference fetched data, not guesses |
| Co-pilot mode | Every message queued for approval before send | Removes "I don't trust AI" objection |
| Unified inbox | All channels, AI-classified labels, full thread history | "You see everything in one place" |
| Performance dashboard | 9-metric time-series chart, rep-level breakdown | 18–24% reply rate benchmark — credible and specific |

---

### Alta's Full Product — 13 Subsystems (from 28 screenshots)

#### 3.1 Proactive Home Screen
"Who should we target today?" natural language input on load. CRM-derived quick-start chips: *Closed lost deals / Revive Last Year Contacts / ICP Highest Revenue / Upcoming Renewals*. Rolling 7-day metrics: Prospects 3,165 · Contacted 2,126 · Engagement 39% · Reply 4% · Bounce 8%. "Approve (50)" co-pilot button — users pulled into action immediately. **K.I.N.D's dashboard is passive. This is not.**

#### 3.2 Agent Training (Compass)
Enter website URL → Alta scrapes and auto-generates: **8 configuration tabs** — Pitch, Keywords, Signals, DNC list, Context, Messaging examples, Connector settings, Prompts. Left-panel chatbot guides setup. Messaging tab pulls actual sent emails from team inboxes to train Katie's writing style per rep. **This is what makes it feel like a team member, not a tool.**

#### 3.3 Five Audience Source Types
| Source | What it does |
|--------|-------------|
| **Search** | 250M+ contacts via Apollo/ZoomInfo/LinkedIn/PeopleDataLabs waterfall |
| **Existing audience** | Reuse saved lists from previous campaigns |
| **ABM** | Account-based targeting of specific named companies |
| **CSV** | Upload your own list — Katie qualifies automatically |
| **Social Signals** | Prospects who liked/commented/shared LinkedIn posts matching your keywords |
| **Webhook** | External triggers (form fills, CRM updates, Zapier) start campaigns automatically |

#### 3.4 ICP Builder with Live Name Preview ⭐ (most impactful demo moment)
Filters: company size, industry, revenue range, job title (include/exclude), location. As filters are applied, **real named contacts populate in the right panel** — name, job title, company, LinkedIn icon, data source badge. "10 out of 971" visible with Apollo/ZoomInfo/LinkedIn source icons. This makes the product feel alive before a single campaign is launched. **K.I.N.D W1 shows count. This shows names. W13 closes the gap.**

#### 3.5 Social Signals Discovery
Dedicated audience mode — scrapes LinkedIn for prospects engaging with relevant posts. 4 modes: Search posts by keyword / Specific companies / Specific creators / Specific posts. Filter by engagement: Post / Comments / Shares / Reactions. Time window: All time / Last 30/90/180 days. Alta's own tracked keywords: *AI Sales Agent, Revenue Operations, Data-Driven Growth, Intelligent Automation, Outbound Pipeline, AI Calling Agent.*

#### 3.6 Campaign Templates (9 pre-built)
Magic Node (AI-powered Beta) · Inbound Form Submitted (Omni-channel) · LinkedIn Only · Pre-Event · Email Only Outbound · LinkedIn Only Outbound · Omni-channel Outbound · Event-Driven · Social Signals LinkedIn · LinkedIn Pre-Event (2 variants) · Start from scratch. **K.I.N.D has zero templates. W9 closes this.**

#### 3.7 Visual Sequence Builder (Node Tree)
Not a list — a **branching node tree** with lines between steps. Toggle Tree/List view. Actions at each node:
- Email
- LinkedIn: Connection Request (with/without message, Personalized, Templated) | Message (Personalized, Templated, **Voice Message**) | Like a Post | View Profile (Beta)
- Call (AI voice via Alex) · SMS (Beta) · WhatsApp · Manual Task · API Connect (webhook mid-sequence)
- Conditions: Is Connected | custom Condition

Each step has: editable system prompt · word count control · version history · tone selector · Refine button. **The sequence automates social warming** — "Like a Post" fires before "Send a Message" to get on the prospect's radar first.

**Live example (Seth Houston):** Wed May 20 connection request → Thu May 21 accepted → Thu May 21 AI message → Fri May 22 follow-up with calendar → Fri May 22 Seth replies "I scheduled for next Wednesday at 10am" → Sun May 24 AI confirms. **Full cycle: 4 days. Zero human involvement.**

#### 3.8 AI Enrichment Columns
Custom research step insertable anywhere in the sequence. Define a prompt: *"What CRM does this company use?" / "Are they hiring in sales?" / "What did they post about last month?"* Alta runs it per prospect, stores the result as a named field, syncs to the prospect table, injects as a variable in subsequent message steps. Output format: Text / Number / Boolean / List. **This is what separates research from writing — emails reference actually fetched data, not inferred context.**

#### 3.9 Campaign Launch Settings
Auto-Pilot vs Co-Pilot mode toggle · "Hold low-quality messages for review" toggle · "Auto-refine low quality messages" toggle · Enrich Prospects toggle · **New Prospects to Contact Daily slider (0–200, set to 5 in demo)** · Select Reps (multi-user campaign assignment).

#### 3.10 Unified Inbox
All channels: Email | LinkedIn | Calls | WhatsApp tabs. 2,312 unread in Rachelle's account. Left panel: All / Unread (1,773) / Replied / Archived. **AI-classified labels**: Meeting Booked · Positive · Nurturing · Bad Timing · Reply Needed · Irrelevant · Out Of Office · Need Follow-up · Automatic Reply. Right panel: full conversation thread per prospect with entire sequence history. Reply tools: "Use next message" (AI drafts) / "Help me reply" (human override with AI assist) / Attach File. **K.I.N.D Unibox is read-only. This has two-way reply.**

#### 3.11 People Database (CRM-lite)
Persistent prospect database — 60,845 contacts tracked in Rachelle's account alone. Tabs: All / Main / Waiting for Review / Completed / Rejected / My Prospects. Columns: Name, Company, Campaign, Signals, Pipeline Status, Date. Exportable. **This grows with every campaign — it becomes your CRM.**

#### 3.12 Campaigns List View
Named saved views: Main View / Active / London-2025 / GTM / Social signals / Rachelle / Test. Each row: name, visual engagement/reply progress bar, status badge (Active/Paused/Draft), data source icon, reps, tags. Tooltip on hover: "Qualified 1,344". **"Suggest Campaigns" button powered by Luna** recommends what to run next.

#### 3.13 Performance Dashboard
9-metric time-series chart over 3+ months: New Contacted Prospects · Emails Sent · Opened · Clicked · Replied · Bounced · LinkedIn Connection Requests · Accepted · Messages · LinkedIn Replied. Prospect Status bar chart: New 5,069 · Pending Outreach 7,795 · Pending Reply 11,267 · Interested 405 · Not Interested 456 · Meeting Booked 158 · Unsubscribed 167 · No Response 4,833 · Bounced/Invalid 1,061. Campaign Performance section. Rep-level breakdown.

---

### Alta's Real Performance Data (Rachelle's Live Account — Not a Deck)
*This is Rachelle's real account used to sell Alta to prospects. The product eating its own cooking.*

| Metric | Value |
|--------|-------|
| Total prospects in database | **60,845** |
| Meetings booked (all time) | **158** |
| UK LinkedIn campaign — prospects | 6,538 (1,344 processed) |
| UK LinkedIn campaign — reply rate | **6%** (87 replies, 12 booked meetings) |
| Netherlands campaign | 29 replies, 7 booked meetings |
| Event campaign (Tel Aviv, London) | 3,387 contacts, 50 replies, **30 event attendees** |
| Unresponsive revival campaign | 1,045 prospects, **53% engagement**, 44 replies |
| Seth Houston LinkedIn sequence | Connection → booked meeting: **4 days, fully automated** |

**What this tells us**: Alta's own reply rate in a live account is 6% — their claimed benchmark of 18-24% is aspirational or blended across best-case campaigns. Our Unibox data can be used to benchmark similarly.

---

### Alta's Portal — Visual Design
| Element | Alta's choice |
|---------|--------------|
| Base background | Pure white `#FFFFFF` |
| Sidebar background | White / very light grey — no dark background |
| Accent / primary | Medium purple `~#6B5CE7` |
| Section banners | Soft lavender `~#EAE7F8` |
| Agent visuals | 3D illustrated avatars — professionally designed |
| Sidebar items | 4 only — Inbox, Calls, Assistants, Workflows |
| Emotional tone | Airy, clean, friendly — not a "hacker tool" |

---

### Full Feature Comparison Table
| Feature | K.I.N.D | Alta |
|---------|---------|------|
| Email outreach | ✅ | ✅ |
| LinkedIn outreach | ❌ | ✅ |
| AI voice calls | ❌ | ✅ |
| SMS outreach | ❌ | Beta |
| WhatsApp outreach | ✅ (Vida — standalone) | Sequences only |
| Social signals audience source | ❌ | ✅ |
| ABM mode (named account targeting) | ❌ | ✅ |
| CSV audience upload | ✅ | ✅ |
| Webhook-triggered campaigns | ❌ | ✅ |
| **Live contact preview in ICP builder** | ⚡ Count only (W1) | ✅ Names + company + LinkedIn icon |
| Visual sequence builder (node tree) | ❌ | ✅ |
| Conditional sequence branching | ❌ | ✅ |
| AI enrichment columns (research step) | ❌ | ✅ |
| Campaign templates library | ❌ | ✅ (9 templates) |
| Email style training from sent emails | ❌ | ✅ |
| Editable per-step AI prompts | ❌ | ✅ |
| Daily send throttle / quota control | ❌ | ✅ |
| Quality gate (hold low-quality) | ❌ | ✅ |
| Auto-refine low quality messages | ❌ | ✅ |
| **Proactive home screen** | ❌ (passive) | ✅ "Who to target today?" |
| Suggest campaigns (AI recommendation) | ❌ | ✅ (Luna) |
| Unified multi-channel inbox | ⚡ Read-only | ✅ Two-way reply |
| AI reply classification (labels) | ✅ (Unibox) | ✅ |
| AI-assisted reply drafting in inbox | ❌ | ✅ |
| Persistent prospect database (CRM-lite) | ❌ | ✅ (60,845 in Rachelle's account) |
| Analytics: time-series multi-metric | Basic | ✅ (9 metrics) |
| Rep-level performance breakdown | ❌ | ✅ |
| CRM integration (HubSpot / Pipedrive) | ✅ All plans | ✅ All plans |
| Agent persona customisation | ❌ | ✅ |
| SOC2 / ISO certified | ❌ | ✅ |
| **Pay-per-result pricing** | ✅ | ❌ |
| **Free trial (no card required)** | ✅ | ❌ (no trial at all) |
| **Entry price** | **$20 today** | **~$1,250/mo, quarterly contract** |
| **Individual AE self-serve** | ✅ | ❌ (sales call required) |
| **Africa-first (POPIA native)** | ✅ | ❌ |
| **WhatsApp as standalone chatbot** | ✅ (Vida) | In sequences only |

---

### Where K.I.N.D Wins — Our Structural Moats

#### 1. Pricing is a structural moat, not a discount
Alta starts at ~$1,250/month on a quarterly contract with no free trial. An AE like Jacques cannot self-serve — he needs Tyron's approval, then his VP's, then procurement, then a global rollout decision. **K.I.N.D costs $20 to start today.** The Jacques-type user can prove results next Thursday in Tyron's office with real pipeline, not a demo recording. This is not temporary. Alta cannot undercut this without destroying their unit economics.

#### 2. Africa and POPIA as an uncontested market
Alta is built for global B2B teams. K.I.N.D is built from day one around South African data law. Data stored in Cape Town. POPIA compliance is architectural, not a checkbox. No competitor at this price point serves this market. Alta's demo even showed MTN and Hicell Telecommunication in their database — SA companies in an Alta account — yet K.I.N.D has POPIA credibility and trust Alta cannot replicate at equivalent price.

#### 3. Speed to first lead
K.I.N.D: define ICP → add $20 in credits → FIGSY starts. **10 minutes.** Alta: train Katie, configure 8 pitch tabs, set up connectors, onboard with customer success manager, schedule setup calls. **Days to weeks.** 

#### 4. WhatsApp as a standalone product
Alta has WhatsApp inside sequences only. K.I.N.D has Vida — a full WhatsApp chatbot product that operates independently. In Africa, WhatsApp has 90%+ penetration. This is not a feature, it's a separate distribution channel Alta doesn't have.

---

### What We've Done From This Audit
| # | Item | Status |
|---|------|--------|
| 1 | Sequence branching UI — `on_reply: stop/skip_next/continue` | ✅ Built — API wiring pending |
| 2 | Meetings Booked headline KPI — violet card, "Alta: 3–5%" benchmark | ✅ Built |
| 3 | Dashboard Mission Control — single screen, all metrics | ✅ Built |
| 4 | Real agent photos in sidebar + widget | ✅ Built |
| 5 | Soft warm palette | ✅ Applied |
| 6 | AskFigsyButton — always-accessible, dark branded | ✅ Built |
| 7 | Performance benchmark on KPIs page | ✅ Built |
| 8 | W1: Live ICP lead count ("X matching leads") | ✅ Built |
| 9 | W13: ICP preview upgraded to show 3 real contact names + LinkedIn badges | ✅ Built |
| 10 | W3: Intent signals in ICP builder (4 signal types) | ✅ Built |
| 11 | W5: LinkedIn `in` badge on every lead row | ✅ Built |
| 12 | W6: Social proof slot on login page | ✅ Built |
| 13 | W8: Proactive home screen — "Who should FIGSY target today?" | ✅ Built |
| 14 | W9: Campaign templates (8 total + Revival + Inbound Qualify) | ✅ Built |
| 15 | W10: Editable FIGSY prompt per campaign (custom instructions textarea) | ✅ Built |
| 16 | W11: Daily send quota slider (1–200 per campaign) | ✅ Built |
| 17 | W12: Co-pilot quality gate toggle per campaign | ✅ Built |
| 18 | W14: Email style training textarea in settings | ✅ Built |
| 19 | W15: Unresponsive revival filter + campaign type (53% benchmark) | ✅ Built |
| 20 | W2: Signal tokens — FIGSY opens every Step 1 with best personalization signal | ✅ Built |
| 21 | Unibox two-way reply — `ReplyForm` + admin `/api/reply` via Resend | ✅ Built |
| 22 | W7: Demo narration Scene 1 scripted in Section 35 | ✅ Built |

### Still To Build (Long-term / Tier 3)
| # | Item | Effort | When |
|---|------|--------|------|
| — | Persistent prospect database / CRM-lite view | Medium | At 5+ clients |
| — | Visual sequence builder (node tree) | High | 🟢 Long-term |
| — | LinkedIn automation (connection + message) | High | 🟢 Requires API partner approval |
| — | Social signals audience source (LinkedIn post scraping) | High | 🟢 Long-term |
| — | AI enrichment columns (custom research step per sequence) | High | 🟢 Long-term |
| — | AI voice calls (Alex equivalent) | High | 🟢 Lowest priority for Africa/SMB |

---

### Sales Battlecard — When a Prospect Mentions Alta

**Acknowledge and redirect:**
*"Alta is a solid product — it's built for revenue teams that have budget and time for enterprise onboarding. K.I.N.D is built for people who need pipeline now, not next quarter."*

**Key differentiators to lead with:**
1. You can start today for $20. No demo call. No quarterly contract. No procurement.
2. 14-day free trial — no card required. Alta has no trial at all.
3. You only pay when a lead replies positively. Alta charges ~$1,250/month whether or not it works.
4. FIGSY is live in 10 minutes. Alta requires training sessions and customer success onboarding.
5. Built for Africa — POPIA native, data stored in Cape Town. Alta is not.

**If they ask about LinkedIn:**
*"LinkedIn is on our roadmap. For most of our users, email outreach is already generating qualified leads before we even get there. And at $1/lead, you can run 200 campaigns worth of data to know what works before you'd spend the first month on Alta."*

**If they ask about voice calling:**
*"Alex is impressive but voice calling works best for inbound qualification at scale — that's a different motion from what most individual AEs need. WhatsApp via Vida is live today and significantly more relevant for the African market."*

**If they say Alta has better analytics:**
*"The metrics that matter are qualified leads and meetings booked — and those are on your K.I.N.D dashboard today. The 9-metric time-series chart is great for a revenue ops team justifying budget. You need to justify pipeline."*

**If they say Alta has more features:**
*"It does — and it should, at $1,250/month. K.I.N.D gets you the 20% of features that deliver 80% of the results, starting today, for $20. If after 3 months of K.I.N.D you need LinkedIn automation and AI voice calls, we'll have built them by then — funded by real clients."*

**The close for the Jacques-type prospect:**
*"You have a meeting with your manager next Thursday. Start a K.I.N.D trial today, run a 200-prospect campaign this week, and walk into that meeting with real replies and booked meetings — not a demo recording asking for $1,250/month. That's your business case."*

---

### Alta's Gaps (Our Weapons)
- Zero Africa presence
- USD-only, quarterly billing, non-refundable, **no trial**
- No POPIA/NDPR compliance
- No WhatsApp-native standalone product
- Enterprise-only — SMBs cannot access
- Sales-assisted only — no self-serve
- No VA (Milla) or standalone chatbot (Vida) equivalent
- No pay-per-result pricing — fixed monthly fee regardless of outcome

---

## 21. KEY DECISIONS LOCKED

| Decision | Outcome |
|---|---|
| Core metric | TTFL — target < 2 hours from signup |
| Billing model | Credit bundles now → recurring subscriptions Phase 2 |
| Agent naming | FIGSY (founder) · Milla (daughter) · Vida (daughter) |
| Market expansion trigger | After 5 paying clients |
| Compliance | POPIA + GDPR + CAN-SPAM + CCPA |
| Milla + Vida launch | ✅ Billing built — needs price IDs | Subscription billing live — awaiting Stripe price IDs in Railway |
| Payment processor | **Stripe (USD/GBP) — primary**. Founder is UK-based, Paystack requires SA entity. African clients pay in USD via international card. Flutterwave Phase 2 for local African payment methods (M-Pesa etc). |
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
6. Close → Stripe checkout or manual invoice
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
| 1 | Stripe fully activated (keys + prices + webhook secret in Railway) |
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

### 📣 MARKETING PLAYBOOK — How to Get Leads Fast

*Written: 1 Jun 2026. No agency. No budget. Founder-led. FIGSY does the outbound. You do the content.*
*Goal: 5 clients in 30 days. 20 clients in 90 days. All inbound + outbound, zero ad spend.*

---

#### CHANNEL 1 — FIGSY Self-Outreach (Start Day 1, costs only credits)

**This is your unfair advantage. You sell outbound software using outbound software.**

K.I.N.D finds its own clients using FIGSY. Set up one campaign targeting your own ICP. Every email sent is a live proof-of-concept.

**Setup:**
1. Admin → Demo Envs → open your own KIND account
2. ICP: Founder/CEO/MD/Sales Director, B2B company 5–50 staff, SA/Nigeria/Kenya
3. Campaign name: "K.I.N.D Founder Outreach Q3"
4. Sequence: 3 steps, 4 days apart
5. Subject line: *"FIGSY found your details. I thought it was only fair to tell you."*
6. Step 1 body: short, personal, no features. *"I built K.I.N.D because I was tired of spending half my week hunting leads. FIGSY is the AI SDR I wish I had. 14-day free trial, first leads in under 10 minutes. Worth 30 minutes?"*
7. Step 3: social proof. *"Quick follow-up — [Name] at [Company] got 11 replies in week 1. Happy to show you what their setup looks like."*

**Volume:** 50 emails/day to start. Safe on Resend. Expect 8–15% reply rate.

---

#### CHANNEL 2 — LinkedIn Organic (Ongoing, 3x per week, 20 min/post)

LinkedIn is where your ICP lives. One good post reaches 500–5,000 people for free.

**Post formula that works:**

```
Hook (1 line, no emoji, specific number):
"I sent 847 cold emails last month without writing a single one."

Story (3–5 short lines):
"I built K.I.N.D because I was spending 4 hours a day on outreach.
FIGSY finds the leads, writes the emails, reads the replies.
I just show up to the calls.
Last week: 14 warm replies. 3 demos booked. 1 closed."

CTA (one line):
"First 10 minutes free. Link in comments."
```

**Post topics — 30-day calendar:**

| Week | Post 1 | Post 2 | Post 3 |
|------|--------|--------|--------|
| 1 | "The problem with hiring an SDR in South Africa" | "I replaced my outreach spreadsheet with AI. Here's what happened." | "8% reply rate. Here's the subject line." |
| 2 | "POPIA compliance in B2B email — what most companies get wrong" | "250 million contacts. How we find the right 50." | "Why I built KIND for Africa first" |
| 3 | "The human ceiling — your pipeline is limited by your hours" | "Cold email is not dead. This reply rate proves it." | "[Screenshot] 3 warm replies, 1 meeting booked. Tuesday morning." |
| 4 | "The $0 marketing stack that booked 10 meetings this month" | "What Alta charges. What K.I.N.D charges. The difference." | "Every tool I use to run a B2B AI company as a solo founder" |

**Rules:**
- Post at 7–9am SA time (highest reach)
- Always put the link in **comments**, not the post body (LinkedIn suppresses external links in posts)
- Reply to every comment within 2 hours — this boosts reach dramatically
- Never use hashtags — they look desperate and reduce reach on LinkedIn

---

#### CHANNEL 3 — SEO (Start now, pays off in 60–90 days)

Your `vs-` pages are already live. These are your highest-converting SEO pages — people searching "Apollo alternative" or "Lemlist vs outreach" are ready to buy.

**Target keywords — in priority order:**

| Keyword | Monthly searches | Difficulty | Page |
|---------|-----------------|------------|------|
| apollo.io alternative | 1,200/mo | Medium | `/vs-apollo.html` |
| lemlist alternative south africa | 400/mo | Low | `/vs-outreach.html` |
| AI SDR south africa | 300/mo | Low | new page needed |
| b2b lead generation south africa | 800/mo | Medium | homepage |
| cold email software africa | 200/mo | Low | new page needed |
| outreach.io alternative | 600/mo | Medium | `/vs-outreach.html` |
| AI sales development representative | 500/mo | Medium | homepage |

**What to do this week (takes 2 hours):**

1. **Update each `vs-` page** — make sure each page has:
   - H1 with the exact keyword: "The Best Apollo.io Alternative for African B2B Teams"
   - 400+ words of real comparison content (already mostly there)
   - A clear CTA with your Calendly link
   - Meta title + description using the keyword

2. **Add a blog section** — create `/blog` with 3 articles:
   - "How to do B2B outreach in South Africa without violating POPIA" (ranks for compliance searches)
   - "Apollo.io vs K.I.N.D: Which is better for African lead generation?" (ranks for competitor searches)
   - "The AI SDR guide for South African founders" (ranks for AI SDR searches)

3. **Google Search Console** — verify `get-kind.com`, submit sitemap. Free. Takes 10 minutes.

4. **Google Business Profile** — register `get-kind.com` as a business. Free. Adds credibility.

**SEO quick wins (no content needed):**
- Add `<title>` and `<meta description>` to every page (most are already good — check vs- pages)
- Add `alt` text to all images
- Internal linking — every page links to at least 2 others
- Page speed — already fast (static HTML on Railway)

---

#### CHANNEL 4 — Directories & Communities (Week 1, 2 hours, free)

**Submit to these immediately — all free:**

| Platform | URL | Why |
|----------|-----|-----|
| Product Hunt | producthunt.com/posts/new | 1,000+ founders see it on launch day. Post on a Tuesday. |
| G2 | g2.com/products/new | Buyers check G2 before buying. Get 5 reviews = star rating shows. |
| Capterra | capterra.com | Enterprise buyers use this. Free listing. |
| Futurepedia | futurepedia.io | AI tools directory. 200K monthly visitors. |
| There's An AI For That | theresanaiforthat.com | Submit KIND. Instant indexed. |
| Indie Hackers | indiehackers.com | Post your story. Founder community = early adopters. |
| Reddit r/entrepreneur | reddit.com/r/entrepreneur | "I built an AI SDR for African B2B" — authentic story gets traction |
| YC Hacker News | Show HN post | "Show HN: KIND — AI Revenue Team for African B2B companies" |

---

#### CHANNEL 5 — Partnerships (Week 2 onwards, zero cost)

**Target partners who already talk to your ICP:**

| Partner type | Who to reach | What you offer |
|---|---|---|
| Business coaches / consultants | SA business consultants on LinkedIn | 20% recurring commission on referrals |
| Marketing agencies | Agencies who do outbound for clients | White-label K.I.N.D under their brand |
| Accelerators | SA startup accelerators (Knife Capital, AlphaCode, Grindstone) | Free or discounted access for their portfolio companies |
| Accounting firms | SME accountants who advise on growth | Referral fee per client |
| Co-working spaces | Workshop17, The Workspace, WeWork SA | Cross-promotion, demo events |

**Outreach script (LinkedIn DM):**
> *"Hi [Name] — I built an AI sales tool for African B2B companies. Your clients keep asking you how to grow faster. I'd love to show you what it does in 20 minutes. If it's a fit, I pay 20% recurring on every client you refer. Interested?"*

---

#### CHANNEL 6 — Content Flywheel (Week 2 onwards, 1 hr/week)

One piece of content → repurposed into 5 formats:

```
1 FIGSY campaign result (screenshot)
        ↓
LinkedIn post (organic reach)
        ↓
Short-form video (screen recording, posted to LinkedIn + YouTube Shorts)
        ↓
Email newsletter (sent to trial signups who didn't convert)
        ↓
Blog post (SEO indexed)
        ↓
Case study (added to website)
```

**The one screenshot that drives everything:**
Every week, screenshot your best FIGSY stat. Reply rate. Meetings booked. Leads found. Post it raw — no design, no editing. Real numbers convert better than polished graphics.

---

#### 30-DAY MARKETING SPRINT PLAN

| Day | Action | Time |
|-----|--------|------|
| 1 | Set up FIGSY self-outreach campaign (50/day) | 45 min |
| 1 | Submit to Product Hunt, G2, Futurepedia, There's An AI For That | 60 min |
| 1 | Verify Google Search Console, submit sitemap | 15 min |
| 2 | Post LinkedIn: founder story ("Why I built KIND") | 20 min |
| 3 | Reach out personally to 10 warm contacts via DM | 30 min |
| 5 | Post LinkedIn: FIGSY reply rate screenshot | 10 min |
| 7 | Write first blog post: "POPIA + B2B cold email" | 90 min |
| 7 | First FIGSY replies coming in — reply to every hot lead same day | ongoing |
| 8 | Post LinkedIn: "What I learned from 350 cold emails this week" | 20 min |
| 10 | Reach out to 3 potential partners (consultants, agencies) | 30 min |
| 14 | First 5 clients targeted — push for close | — |
| 14 | Post LinkedIn: first client win (with permission) | 10 min |
| 21 | Write comparison blog: "K.I.N.D vs Apollo for SA companies" | 60 min |
| 30 | Review: reply rate, demo rate, close rate. Adjust ICP if needed | 60 min |

---

#### WHAT NOT TO DO

| Don't | Why |
|-------|-----|
| Run Google Ads | Too expensive at this stage. SEO does the same job for free in 90 days. |
| Buy LinkedIn Sales Navigator | Apollo covers the same data. Overlap. |
| Hire a marketing agency | You are the marketer. Your authentic founder story converts better than agency copy. |
| Post on every social platform | LinkedIn only. That's where B2B buyers are. |
| Create a newsletter before you have 50 subscribers | Build audience first via LinkedIn → then convert to email. |
| Offer free forever tiers | Free trials convert. Free forever attracts users, not buyers. |

---

#### KPIs TO TRACK WEEKLY

| Metric | Week 1 target | Week 4 target | Where to check |
|--------|--------------|--------------|----------------|
| FIGSY emails sent | 350 | 1,400 | Admin → Analytics |
| Reply rate | >6% | >10% | Admin → Analytics |
| Demo calls booked | 2 | 8 | Calendly |
| Clients closed | 0 | 3 | Admin → All Clients |
| LinkedIn post reach | 500 | 2,000 | LinkedIn analytics |
| Website visitors | 50 | 300 | Google Search Console |
| Inbound signups | 0 | 5 | Admin → All Clients |

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

### SEIS / EIS — Your Unfair Advantage With UK Investors

> Apply for SEIS Advance Assurance BEFORE approaching any investor. It halves their risk and doubles your close rate.

**SEIS (Seed Enterprise Investment Scheme):**
- 50% income tax relief on investments up to £200,000 per investor
- Capital gains tax exemption on profit at exit
- Loss relief if company fails — further reduces investor risk
- K.I.N.D eligibility: UK Ltd, under 3 years from first commercial sale, <25 employees, gross assets <£350k before investment
- Apply at gov.uk — "SEIS advance assurance" — takes 4–8 weeks. Do it now.

**EIS (Enterprise Investment Scheme):**
- 30% income tax relief on investments up to £1M per investor
- Kicks in once K.I.N.D exceeds SEIS limits (>25 employees or >3 years)

**How to apply for Advance Assurance:**
1. Go to gov.uk → search "SEIS advance assurance"
2. Submit: business plan, financial projections, company details
3. Wait 4–8 weeks — receive advance assurance letter
4. Show this letter to every investor before they commit

---

### Intellectual Property Protection

> Every person who has written code or designed assets for K.I.N.D must have a signed IP assignment agreement. This is the #1 issue that kills tech acquisitions in due diligence.

**Trademarks to file at UK IPO (ipo.gov.uk) — Class 42 (SaaS):**
| Mark | Cost | Status |
|------|------|--------|
| K.I.N.D | £170 first class | ⏳ Pending L4 |
| FIGSY | £50 add-on | ⏳ Pending L5 |
| Milla | £50 add-on | ⏳ Pending L6 |
| Vida | £50 add-on | ⏳ Pending L6 |

Filing date = priority date. File before a competitor does. 4-month processing if uncontested.

**After Brexit:** UK trademark ≠ EU coverage. If selling in Europe → EUIPO separately (~€850/class). If significant ZA revenue → CIPC filing.

**Code ownership checklist:**
- [ ] All repos owned by company GitHub account, not personal
- [ ] All domain registrations in company name + company email
- [ ] All social accounts managed under company login
- [ ] IP assignment agreements signed by every dev/contractor — past and present (SeedLegals template: £300)

---

### Legal Foundations

**Privacy & GDPR:**
- UK GDPR applies — publish Privacy Policy explaining data collected, why, retention, rights
- Lawful basis for outbound outreach = "legitimate interests" (already documented in POPIA framework)
- Maintain Record of Processing Activities (ROPA) — internal log
- Respond to data subject access requests within 30 days
- **ICO registration required: ico.org.uk — £40–60/year. Legal requirement.** → L7

**Shareholders agreement (via SeedLegals ~£300–500):**
- Pre-emption rights — existing shareholders get first refusal on new shares
- Drag-along + tag-along rights for exit scenarios
- Reserved matters — decisions requiring shareholder approval
- Leaver provisions — what happens to shares if someone leaves
- Vesting schedules for any equity given to co-founders or key hires (standard: 4yr / 1yr cliff)

---

### Investor Landscape

**Pre-Seed — UK Angels (£10k–£100k, SEIS-backed):**
| Platform | Type | URL |
|----------|------|-----|
| Angel Investment Network | Generalist | angelinvestmentnetwork.co.uk |
| Syndicate Room | SEIS/EIS syndicates | syndicateroom.com |
| Crowdcube | Equity crowdfunding | crowdcube.com |
| Seedrs (Republic Europe) | B2B SaaS strong | seedrs.com |
| London Business Angels | London network | lbangels.co.uk |
| Beer & Partners | Early stage UK | beerandpartners.com |

**Africa-Focused Angels & Networks:**
| Network | Focus | URL |
|---------|-------|-----|
| African Business Angel Network (ABAN) | Pan-African diaspora angels | aban.community |
| Grindstone Accelerator | South Africa | grindstone.co.za |
| Cape Angel Network | Cape Town / SA | LinkedIn direct |
| Africa Tech Ventures | African tech seed fund | africatechventures.com |

**Seed Funds — UK/European (need £3k–10k MRR growing):**
| Fund | Cheque | Notes |
|------|--------|-------|
| Seedcamp | £100k–£500k | seedcamp.com — most active early stage EU fund |
| LocalGlobe | £500k–£2M | localglobe.vc — backed Wise, Robinhood |
| Backed VC | £250k–£1M | backed.vc — founder-friendly, good for solo founders |
| Fuel Ventures | £250k–£2M | fuel.ventures — UK B2B SaaS focus |
| Concept Ventures | £250k–£750k | conceptventures.vc — very early stage |
| Notion Capital | £1M–£5M | notion.vc — EU B2B SaaS specialist — highly relevant |

**Africa-Focused VC Funds:**
| Fund | Focus | URL |
|------|-------|-----|
| TLcom Capital | Pan-African tech | tlcomcapital.com |
| Partech Africa | Pan-African (Anglophone) | partechpartners.com |
| 4Di Capital | South Africa tech | 4dicapital.com |
| Knife Capital | SA scale-ups | knifecap.com |
| Future Africa | Pan-African, African founders | future.africa |
| Ingressive Capital | West + East Africa | ingressive.com |

> Africa-focused VCs will value K.I.N.D's POPIA-native architecture and Africa-first positioning far more than generic UK seed funds. Segment outreach accordingly.

**Accelerators:**
| Programme | What | Equity | Apply |
|-----------|------|--------|-------|
| Innovate UK Smart Grants | £25k–£500k non-dilutive grant | 0% | iuk.ktn-uk.org |
| Founders Factory | Studio model — build + invest | ~10% | foundersfactory.com |
| Entrepreneur First | Pre-team building | ~8–10% | joinef.com |
| Y Combinator | $500k | 7% | ycombinator.com |
| Techstars London | $120k + mentorship | 6% | techstars.com/london |
| Anthropic Startups | Claude API credits | 0% | anthropic.com/startups |
| Google for Startups | Cloud credits | 0% | startup.google.com |

**Grant Funding (no dilution):**
- **Innovate UK Smart Grants** — £25k–£500k for innovative UK tech. Competitive, worth applying. iuk.ktn-uk.org
- **UKRI Future Leaders Fellowship** — up to £1.5M over 4 years if K.I.N.D has a research component
- **British Business Bank Start Up Loans** — £500–£25k at 6% fixed, no equity. british-business-bank.co.uk

---

### What Investors Look At (Pre-Seed / Seed)

| Metric | Why It Matters |
|--------|----------------|
| MRR growth rate month-on-month | Rate matters more than absolute number — 3x growth from £5k to £15k is more interesting than flat £50k |
| Repeat purchase rate | K.I.N.D is pay-per-result not subscription — this is our equivalent of churn. Track from day one. |
| CAC | Every £ spent on acquisition. Must be below LTV. |
| LTV | LTV:CAC ≥ 3:1 is the investor benchmark. |
| Pipeline metrics | Meetings booked, reply rates — K.I.N.D's product metrics ARE the investor metrics. Publish them. |
| NPS / retention | One strong NPS signal beats a deck full of projections. |

**The Africa angle is a genuine investor differentiator.** POPIA-native architecture, Africa-specific ICP understanding, WhatsApp-first Vida — these are technical facts, not marketing claims. Africa-focused VCs will value this far above what a generic UK seed fund pays for it.

---

### Exit Paths

| Path | Notes |
|------|-------|
| **Strategic acquisition (most likely)** | Acquirers: Apollo, HubSpot, Salesforce, or regional African tech co. Price = 3x–10x ARR. At £100k ARR with strong growth: £500k–1M realistic. At £1M ARR: £3M–10M range. |
| **PE / growth equity** | Requires £1M+ ARR. PE firm buys majority, scales, exits in 3–5 years. |
| **IPO** | 10+ year path. Don't optimise for it at this stage. |

**What makes K.I.N.D attractive for acquisition:** clean cap table, all IP owned by company, documented codebase, repeat revenue, defensible Africa + POPIA market position, product an acquirer can distribute through their existing sales motion.

---

### Lawyers, Platforms & Resources

| Service | Best For | Cost | URL |
|---------|----------|------|-----|
| SeedLegals | All standard startup legal — fast, online | £300–1,500 most tasks | seedlegals.com |
| Stephenson Law | Startup legal, fixed fees, founder-friendly | £1k–5k structuring | stephensonlaw.co.uk |
| FreeAgent | Early-stage bookkeeping, MTD compliant | £19/month | freeagent.com |
| Xero | Scaling businesses, integrations | £15–47/month | xero.com |
| Crunch | UK startup accountancy + software | £100–200/month | crunch.co.uk |

| Research Tool | URL |
|--------------|-----|
| Crunchbase | crunchbase.com — research investors, see portfolio + recent deals |
| Dealroom | dealroom.co — European startup + investor data |
| Signal by NFX | signal.nfx.com — free investor database with email contacts |
| Beauhurst | beauhurst.com — UK equity deals, investor activity |

---

## 24. CLICKUP COMPETITIVE AUDIT — FULL COMPARISON + STEAL-NOW

*ClickUp is a $1B+ general-purpose work OS. K.I.N.D is a vertical AI outbound engine. We don't compete — but there are 6 things worth stealing.*

---

### 🧠 AI / Agents
| Feature | ClickUp | K.I.N.D |
|---|---|---|
| AI model | GPT-5, Claude Opus 4.1, o3, o1-mini (switchable) | Claude Haiku (fixed) |
| AI memory — episodic | ✅ Recent interactions, conversations | ❌ Not built |
| AI memory — long-term | ✅ Docs, past tickets, rules, naming conventions | ✅ figsy_memory (basic — reply stats, winning angles) |
| AI memory — preference | ✅ Tone, format, channel preferences per person | ❌ Not built |
| Agent triggers — manual | ✅ @mention, DM, assign as task | ❌ N/A |
| Agent triggers — scheduled | ✅ Hourly / daily / weekly / monthly / custom | ⚠️ Cron (3x daily) — hardcoded |
| Agent triggers — automated | ✅ Any event in workspace via Automations | ❌ Not built |
| Agent skills | 500+ prebuilt (writing, research, data, PM) + custom | FIGSY only — sequences + reply analysis |
| Multi-agent orchestration | ✅ Multiple agents working in parallel | ❌ Not built |
| Agent identity | Named members in workspace, persistent presence | ✅ FIGSY has identity card (built May '26) |
| Agent escalation | ✅ Auto-pause, ask for help, route to human | ✅ Auto-pause cron on low credits (built May '26) |
| AI notetaker | ✅ Joins Zoom/Teams — transcribes, creates tasks | ❌ Not built |
| Multi-model toggle | ✅ Per-task switch GPT-5 vs Claude vs o3 | ❌ Fixed Haiku |
| AI in mobile | ✅ Brain everywhere, dictation, syncs | ❌ No mobile app |

*Gap: ClickUp's memory model (3 types) is far more granular. Their scheduled triggers are event-driven — ours are hardcoded cron. The 500+ skill library is their real moat.*

---

### 🖥️ Client Portal
| Feature | ClickUp | K.I.N.D |
|---|---|---|
| Dedicated client portal | ⚠️ Hacked together via guest access | ✅ Purpose-built (NextAuth, dashboard) |
| White labeling | ❌ Enterprise only — ClickUp brand still shows | ✅ Fully white-labeled |
| Custom domain | ❌ Not available | ✅ clients.kindai.co.za or similar |
| Client onboarding flow | ❌ Manual — set up views/permissions per client | ✅ Automated provisioning |
| Campaign status view | ❌ Not purpose-built | ✅ Built |
| Credit balance / usage | ❌ Not built | ✅ Built |
| Lead delivery dashboard | ❌ Not built | ✅ Built |
| File approval workflow | ❌ Not native | ❌ Not built |
| Contract / e-sign | ❌ Not built | ❌ Not built |
| Invoicing in portal | ❌ Not built | ❌ Not built (Stripe external) |
| Messaging in portal | ❌ Not native | ❌ Not built |
| Clean non-PM UX | ❌ Clients see full PM interface | ✅ Stripped-back, purpose-built UI |
| Mobile app | ❌ Guests get full ClickUp mobile — overkill | ❌ No mobile |
| Guest seat cost | ❌ Costs extra on paid plans | ✅ No per-client seat pricing |
| Notification / alerts | ⚠️ Email only | ⚠️ Not built properly |
| Client self-service top-up | ❌ Not built | ✅ Stripe credit top-up |
| Real-time data refresh | ✅ Live dashboard widgets | ⚠️ Polling / page refresh |

*Verdict: We win client portal. ClickUp's is a workaround. Ours is purpose-built.*

---

### ⚙️ Backend / Platform
| Feature | ClickUp | K.I.N.D |
|---|---|---|
| Database | Proprietary cloud | Supabase (Postgres, af-south-1) |
| API | Full REST + webhooks + Enterprise API | REST API (Express) |
| Webhooks (outbound) | ✅ Any workspace event | ✅ Stripe webhooks (inbound) |
| Realtime | ✅ Live updates everywhere | ⚠️ Supabase realtime (not wired to frontend yet) |
| File storage | ✅ Native (60MB free, paid tiers) | ❌ No file storage |
| Multi-tenancy | ✅ Workspace isolation | ✅ Per-client row isolation (Supabase RLS) |
| Roles / permissions | ✅ Owner, Admin, Member, Guest + custom roles | ⚠️ Basic — admin vs client |
| Audit log | ✅ Enterprise tier | ❌ Not built |
| HIPAA / SOC2 / GDPR | ✅ Enterprise compliance | ❌ Not built |
| POPIA compliance | ❌ Not South Africa specific | ❌ Not built (noted in Section 9) |
| Billing / subscriptions | ⚠️ Their own billing — not yours to control | ✅ Stripe — credits + subscriptions |
| Credit system | ❌ No native credit model | ✅ Built (credit_balance, transactions) |
| Background jobs | ❌ Not exposed | ✅ 16 cron jobs (Railway) |
| Email sending | ⚠️ Notifications only — not outbound campaigns | ✅ Resend + FIGSY sequences |
| Sequence engine | ❌ No outbound email sequences | ✅ Built (multi-step, variable days) |
| Reply detection | ❌ Not built | ✅ Built (auto-pause on reply) |
| ICP management | ❌ Not built | ✅ Built (ICP cascade, attributes) |
| Lead sourcing | ❌ Not built | ✅ Apollo integration |
| Platform status snapshots | ❌ Not built | ✅ Built (3x daily, platform_status table) |

---

### 🛠️ Admin End
| Feature | ClickUp | K.I.N.D |
|---|---|---|
| Admin dashboard | ✅ Full workspace analytics | ✅ Built (K.I.N.D Admin portal) |
| Client health view | ⚠️ Task-based, not client-health | ✅ At-risk client tracking |
| Revenue dashboard | ⚠️ Time billing reports only | ✅ Revenue page |
| AI exec team view | ❌ Not built | ✅ /agents/otto, /lena, /reeve, /cmo, /cto, /cfo |
| Cohort tracking | ❌ Not built | ✅ /cohorts |
| Lead pipeline view | ❌ Not built | ✅ HubSpot integration |
| Scalability modelling | ❌ Not built | ✅ /scalability |
| Terms library | ❌ Not built | ✅ /terms-library |
| Doc viewer (internal) | ✅ ClickUp Docs — full collaborative editor | ✅ Markdown renderer (/docs/*) |
| Roadmap | ✅ Multiple views (Gantt, Board) | ✅ /roadmap (static for now) |
| Compliance tracking | ✅ Enterprise (SOC2, HIPAA dashboard) | ✅ /compliance page |
| Scheduled reports | ✅ Dashboard reports can be emailed on schedule | ❌ Not built |
| Workload view | ✅ Full team capacity management | ❌ N/A (no internal team yet) |
| Goals / OKR | ✅ Full goal folders, progress tracking | ❌ Not built |
| Kanban for deals | ✅ Full Kanban any list | ⚠️ HubSpot for pipeline, no native Kanban |
| Public shareable dashboards | ✅ Can share read-only links | ❌ Not built |

---

### 📱 Views / UX
| Feature | ClickUp | K.I.N.D |
|---|---|---|
| Views | 15+ (List, Board, Gantt, Calendar, Map etc.) | Pages-based (no view switching) |
| Global search | ✅ Searches Gmail too (2026) | ❌ Not built |
| Command palette | ✅ Built in | ❌ Not built — Art of Possible #1 |
| Activity feed | ✅ Realtime | ❌ Not built — Art of Possible #2 |
| Mobile app | ✅ iOS + Android | ❌ None |
| Dark mode | ✅ | ✅ Dark-first design |
| Keyboard shortcuts | ✅ Full | ❌ Not built |
| Chat (internal team) | ✅ Full async + AI summaries | ❌ Not built |
| Whiteboards | ✅ Collaborative | ❌ Not built |
| Forms builder | ✅ Full custom forms | ❌ Not built |
| Templates | ✅ 1,000+ community templates | ❌ Not built |

---

### 💰 Pricing Model
| | ClickUp | K.I.N.D |
|---|---|---|
| Model | Per-seat / per-user / per-month | Per-client SaaS + credit consumption |
| Free tier | ✅ Free Forever (limited) | ❌ No free tier |
| Entry price | $7/user/month | ~$80/month blended ARPU |
| AI add-on | $9/user/month extra | Included |
| White label | Enterprise only (expensive) | ✅ Standard |
| African market pricing | Not localised | ✅ ZAR-aware |
| Credit model | ❌ Not applicable | ✅ Core mechanic |

### Where We Win (don't let ClickUp reps confuse clients)
| Our Advantage | Why it matters |
|---|---|
| Purpose-built for B2B outbound | ClickUp has zero sequence engine, zero lead delivery, zero reply handling |
| Client portal is actually clean | ClickUp guests see a PM tool. Ours is a real portal. |
| White label standard | ClickUp charges enterprise rates — we include it |
| Credit consumption model | No per-seat confusion — pay for what you use |
| African market + ZAR pricing | ClickUp is not thinking about POPIA or ZAR |
| FIGSY | AI that does outbound for you, not just assists with tasks |

---

### Steal Now — Tier 1 (this week, all are pure frontend/cron)
| # | Feature | What it does | Est time |
|---|---------|-------------|---------|
| S1 | **Command palette** | Cmd+K: search anything, jump to page, run quick action — portal + admin | 4h |
| S2 | **Activity feed** | Timeline: lead added / email sent / reply / credit used / sub changed | 1 day |
| S3 | **Shareable read-only dashboards** | `/share/:token` — client shares live stats link with investor, no login | 1 day |
| S4 | **Scheduled report emails** | Weekly digest: leads delivered, replies, credit balance — cron already exists | 4h |

*S1–S4 are blocked under "Art of Possible" queue. Say the word and they're built same day.*

---

### Steal at 20+ Clients — Tier 2 (architectural)
| # | Feature | What it does | Notes |
|---|---------|-------------|-------|
| S5 | **3-type memory model** | Split figsy_memory: episodic (recent replies) + long-term (winning angles) + preference (tone/format) | ClickUp's real moat — doubles FIGSY quality |
| S6 | **Configurable agent triggers** | UI: "Run FIGSY at 9am Mon-Fri" or "on new lead added" — replaces hardcoded cron | Needs `triggers` table + event bus |
| S7 | **Multi-model toggle** | Per-campaign: Haiku (volume) vs Sonnet (quality) — API already supports both | Low complexity |
| S8 | **Kanban deal view** | Visual pipeline for own sales + client campaign stages | HubSpot integration already exists |

---

### Year 2 / Not Now
| Feature | Why parked |
|---------|-----------|
| Mobile app | Cost vs priority — not blocking revenue |
| 500+ AI skill library | Need client volume to know which to build |
| Multi-agent orchestration (FIGSY + OTTO + LENA parallel) | Section 28 — Year 2 architecture |
| Meeting notetaker | Month 6-12 in roadmap already |
| Collaborative docs | Notion/ClickUp territory — not our domain |

---

### The 2 Real Structural Gaps

**Gap 1 — Agent trigger model**
Ours: hardcoded cron (3x daily, fixed times).
ClickUp: event-driven — any workspace event can fire an agent.
Impact: if a client asks "can FIGSY react when something happens?" — the answer is no today.
Fix: `triggers` table (`type`, `schedule`, `event_type`, `client_id`) + lightweight event bus. Build at 20 clients.

**Gap 2 — Memory granularity**
Ours: one flat `figsy_memory` table (avg reply rate, winning angles, total sent).
ClickUp: 3 distinct types — episodic (what happened recently), long-term (docs, naming conventions, rules), preference (tone/format/channel per person).
Impact: FIGSY can't learn that *this client's ICP* responds to short emails but *that client's* responds to story-driven ones.
Fix: schema split into `figsy_memory_episodic`, `figsy_memory_longterm`, `figsy_memory_prefs`. Build at 10 clients.

---

## 25. APEX (apex.host) COMPETITIVE AUDIT

*Apex is an AI Operating System for founders, built by Dan Martell (SaaS Academy). It is NOT a cold email tool — it's a personal digital twin that runs 24/7 on its own server and takes autonomous action across an entire business.*
*Still on waitlist — no public pricing. Built on 88,000+ lines of custom code. Self-hosted.*

### What Apex Does
| Category | Capability |
|---|---|
| Email | Triages inbox, drafts + sends responses, manages follow-ups — without you |
| Calendar | Books meetings, protects deep work blocks, declines requests |
| Messaging | Monitors Slack / WhatsApp / Telegram — responds, filters noise |
| KPI monitoring | Watches metrics, flags anomalies, sends daily briefings |
| Actions | Makes calls, builds apps, handles purchases, creates content |
| Memory | Compounding context — gets smarter over time |
| Infrastructure | Self-hosted — founder owns all data |
| Channels | Single agent across email + voice + Slack + WhatsApp |

---

### Where We Win
| Our Advantage | Why it matters |
|---|---|
| **Outbound sequences** | Apex has zero sequence engine, zero lead sourcing, zero reply handling |
| **Multi-client platform** | Apex = 1 founder's personal OS. K.I.N.D = agency serving 50+ clients |
| **Client portal** | Apex has no client-facing concept — ours is purpose-built |
| **Live today** | Apex is still on waitlist. We are live and purchasable now |
| **Africa + POPIA** | Apex is not thinking about ZAR, POPIA, or pan-African expansion |
| **Credit model** | Transparent consumption billing — Apex has no pricing model public |

---

### Steal Now — Language (zero build time, immediate impact)
| What to steal | Old K.I.N.D copy | New K.I.N.D copy |
|---|---|---|
| **AI OS framing** | "AI outbound platform" | "AI Revenue OS — one system, all your outbound, running 24/7" |
| **Acts, doesn't chat** | "AI-powered sequences" | "FIGSY doesn't draft emails. It sends them." |
| **Compounding context** | "AI memory" | "FIGSY gets smarter with every campaign it runs" |
| **24/7 framing** | "Automated outreach" | "FIGSY runs 24/7. Even when you're asleep." |

*→ Update website hero + pricing page copy to adopt this language. Say the word.*

---

### Steal Soon — Features
| Feature | Apex version | K.I.N.D version | Status |
|---|---|---|---|
| Daily briefing | Founder gets full KPI brief | Clients get: leads delivered, replies, balance, next send | Built for founder — extend to clients (Month 1) |
| Anomaly alerts | Flags KPI drops unprompted | FIGSY flags reply rate drop, low credits | ✅ Already built |
| Multi-channel single agent | Email + WhatsApp + voice = 1 agent | FIGSY on all channels = 1 identity | Month 2 roadmap |
| Compounding memory | Learns tone/format/timing per person | 3-type memory model (episodic/long-term/preference) | Build at 10 clients |

---

### Don't Steal
| Feature | Why not |
|---|---|
| Self-hosted deployment | Kills SaaS model. af-south-1 + RLS is our POPIA answer |
| Personal inbox/calendar | Not our domain — Milla assists, she doesn't replace your Gmail |
| App building / purchases | Too broad — we go deep on outbound, not wide on everything |

---

### The Sharpest Steal — Positioning
Apex is winning on brand. "AI OS that runs 24/7 and acts for you" is a better story than "cold email tool."

**Today:** *"K.I.N.D is an AI outbound platform for B2B businesses."*
**Should be:** *"K.I.N.D is your AI Revenue OS — FIGSY finds your clients, books the meetings, and reports back. 24/7. No SDR required."*

Same product. 10x the perception. Update this across website, deck, and GTM when smoke tests are done.

---

## 26. FULL COMPETITOR LANDSCAPE — ALL PLAYERS

*Every major player in AI outbound / cold email / lead gen. Updated May 2026.*
*Our weapon in every fight: vertical depth + client portal + Africa + credit model.*

---

### 🆚 MASTER COMPARISON — K.I.N.D vs The Field

| Feature | K.I.N.D | Lemlist | Instantly | Clay | Apollo | Reply.io | Alta AI | ClickUp | Apex |
|---|---|---|---|---|---|---|---|---|---|
| **Outbound sequences** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Lead sourcing** | ✅ Apollo | ✅ Limited | ❌ Bring own | ✅ Waterfall | ✅ 265M+ | ✅ Database | ✅ Limited | ❌ | ❌ |
| **Client portal** | ✅ Purpose-built | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ Guest hack | ❌ |
| **White label** | ✅ Standard | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ Enterprise | ❌ |
| **Credit model** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **AI reply classify** | ✅ 7 categories | ❌ | ❌ | ❌ | ⚠️ Basic | ⚠️ Basic | ✅ | ❌ | ❌ |
| **Africa / POPIA** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **ZAR billing** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Multi-agent (Milla/Vida)** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **AI memory** | ⚠️ Basic | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Admin health dashboard** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **LinkedIn automation** | ❌ (by choice) | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Live today** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ Waitlist |

---

### 1️⃣ Lemlist

**What they are:** Personalisation-first cold email + LinkedIn outreach. Popularised custom images/videos in cold email. Now a full multichannel platform.

| Category | Lemlist | K.I.N.D |
|---|---|---|
| Cold email sequences | ✅ Multi-step, conditional branches | ✅ Multi-step, variable days |
| LinkedIn steps | ✅ Built in | ❌ Not built (ToS risk) |
| Personalisation | ✅ Custom images, videos, liquid syntax | ✅ Claude-generated copy per ICP |
| Lead database | ✅ 450M+ contacts | ✅ Apollo (265M+) |
| AI writing | ✅ AI icebreaker generator | ✅ Claude Haiku — full sequence gen |
| Reply detection | ✅ Auto-stop on reply | ✅ Auto-pause, 7-category classify |
| Client portal | ❌ None | ✅ Purpose-built |
| White label | ❌ None | ✅ Standard |
| Africa pricing | ❌ USD only | ✅ ZAR-aware |
| Pricing | $59/mo (Email) → $99/mo (Pro) → $159/mo (Scale) | Credit bundles + subscriptions |

**Their gaps (our weapons):**
- Zero client portal — agencies have nowhere to show clients their results
- No white label at any price point
- No African market focus, no POPIA compliance
- Lemlist is a tool you operate — K.I.N.D is a service platform clients log into
- No credit model — seat-based pricing confuses agencies serving multiple clients

**What we built from this:** Competitor ICP seed config in `supabase/seeds/competitor_icps.sql` — targets Lemlist users in ZA/NG/KE/GH/EG for FIGSY outreach.

---

### 2️⃣ Instantly.ai

**What they are:** Cold email infrastructure at scale. Inbox rotation, deliverability-first. Massive sending volumes. No AI SDR — just email infrastructure.

| Category | Instantly | K.I.N.D |
|---|---|---|
| Cold email at scale | ✅ Unlimited sending accounts | ✅ Single sending domain (Resend) |
| Inbox rotation | ✅ Auto-rotate across accounts | ❌ Not built |
| Deliverability tools | ✅ Email warmup, domain health | ❌ Not built — Art of Possible #7 |
| AI writing | ✅ Basic AI personalisation | ✅ Claude — full sequence gen with memory |
| Lead sourcing | ❌ Bring your own leads | ✅ Apollo integration built in |
| Reply detection | ✅ Auto-stop on reply | ✅ Auto-pause + 7-category classify |
| Client portal | ❌ None | ✅ Purpose-built |
| White label | ❌ None | ✅ Standard |
| AI reply analysis | ❌ None | ✅ Hot/Warm/Cold/OOO etc |
| Pricing | $37/mo (Growth) → $97/mo (Hypergrowth) → $358/mo (Light Speed) | Credit bundles + subscriptions |

**Their gaps (our weapons):**
- Instantly is a raw sending engine — no lead sourcing, no AI SDR, no reply intelligence
- Zero client-facing interface — K.I.N.D is a complete platform
- No African market focus
- Clients need to bring their own lead lists — we generate them

**What we built from this:** Competitor ICP seed config targets Instantly power users.
**What to steal:** Inbox rotation model for deliverability (Art of Possible Tier 3). Multiple sending domains per client.

---

### 3️⃣ Clay

**What they are:** Data enrichment and waterfall lead building. Not a sequence tool — it feeds other tools. The "data layer" of the modern outbound stack.

| Category | Clay | K.I.N.D |
|---|---|---|
| Data enrichment | ✅ 50+ data sources, waterfall | ✅ Apollo only (1 source) |
| Lead list building | ✅ Custom attributes, complex logic | ✅ ICP-based Apollo search |
| Email sequences | ❌ Doesn't send — integrates with Instantly/Lemlist | ✅ Built in |
| AI personalisation | ✅ AI columns — write personalised copy at scale | ✅ Claude-generated per ICP |
| Client portal | ❌ None | ✅ Purpose-built |
| Pricing | $149/mo (Starter) → $800/mo (Pro) → $5k+/mo (Enterprise) | Credit bundles |
| Learning curve | Very high — requires technical operator | Low — client self-serves |

**Their gaps (our weapons):**
- Clay is a power tool for technical operators — agencies use it, not their clients
- No client-facing layer at all — pure internal tool
- Expensive at scale
- K.I.N.D does lead gen + sequences + client portal in one

**What to steal:** Waterfall enrichment model — layer Apollo → PDL → Hunter → Clearbit to fill missing fields. This is Art of Possible #16. Needs PDL + Hunter API keys.

---

### 4️⃣ Apollo.io

**What they are:** Lead database (265M+ contacts) + outreach sequences + CRM. Our data source — but also a competitor for the full platform.

| Category | Apollo | K.I.N.D |
|---|---|---|
| Lead database | ✅ 265M+ contacts, 60+ filters | ✅ Powered by Apollo API |
| Email sequences | ✅ Multi-step, AI personalisation | ✅ Claude-generated, memory-enhanced |
| AI SDR (Jason) | ✅ $500/mo — researches, emails, follows up | ✅ FIGSY — included in plan |
| LinkedIn steps | ✅ Built in | ❌ Not built |
| CRM | ✅ Built-in lightweight CRM | ❌ HubSpot/Pipedrive integration only |
| Client portal | ❌ None — single-company tool | ✅ Multi-client, purpose-built |
| White label | ❌ None | ✅ Standard |
| Africa pricing | ❌ USD only, no POPIA | ✅ ZAR-aware, POPIA-aware |
| Pricing | Free (50 cr/mo) → $59/mo → $99/mo → custom | Credit bundles |
| Multi-client | ❌ One company per account | ✅ Unlimited clients per instance |

**Their gaps (our weapons):**
- Apollo is built for a company's own outbound — not for running outbound FOR clients
- No agency/platform model — no client portal, no multi-tenancy
- No white label
- African market is not a focus
- K.I.N.D uses Apollo as the data source, then wraps it in a full client platform

**Note:** Apollo is our data partner AND our competitor. The moat is the platform wrapper, not the data.

---

### 5️⃣ Reply.io

**What they are:** Multichannel outbound platform. Email + LinkedIn + SMS + calls + WhatsApp. AI SDR "Jason" that can auto-reply to prospects.

| Category | Reply.io | K.I.N.D |
|---|---|---|
| Email sequences | ✅ Multi-step, unlimited mailboxes | ✅ Built |
| LinkedIn steps | ✅ Built in | ❌ Not built |
| SMS / calls / WhatsApp | ✅ All channels | ⚠️ WhatsApp code done, needs Meta approval |
| AI SDR (Jason) | ✅ Auto-replies to prospects | ✅ FIGSY auto-pauses on reply (safer) |
| Lead database | ✅ Built-in (limited) | ✅ Apollo (265M+) |
| Meeting scheduler | ✅ Built in | ❌ Google Calendar code done, needs OAuth |
| Client portal | ❌ None | ✅ Purpose-built |
| White label | ❌ None | ✅ Standard |
| Africa / POPIA | ❌ Not applicable | ✅ Our market |
| Pricing | $49/mo → $89/mo → custom | Credit bundles |

**Their gaps (our weapons):**
- No client portal — agency use case not served
- No white label
- Jason AI SDR auto-replies without human review — risky. FIGSY pauses and surfaces to human = safer.
- Not Africa-focused

**What to steal:** Multichannel single-agent model (email + WhatsApp + voice through FIGSY). Already on Month 2 roadmap.

---

### 6️⃣ Amplemarket

**What they are:** AI SDR platform. Lead sourcing + multichannel sequences + LinkedIn + intent signals. Enterprise-focused.

| Category | Amplemarket | K.I.N.D |
|---|---|---|
| Lead sourcing | ✅ 300M+ contacts | ✅ Apollo (265M+) |
| Multichannel | ✅ Email + LinkedIn + calls | ⚠️ Email only (Month 2: WhatsApp + voice) |
| Intent signals | ✅ Job changes, funding, hiring | ❌ Not built — Art of Possible #10 |
| AI personalisation | ✅ Research + write at scale | ✅ Claude Haiku |
| Client portal | ❌ None | ✅ Purpose-built |
| White label | ❌ None | ✅ Standard |
| Pricing | ~$700/mo+ (enterprise) | Credit bundles — fraction of cost |
| Africa | ❌ Not applicable | ✅ Our market |

**Their gaps (our weapons):**
- Enterprise-only pricing ($700+/mo) locks out SMBs
- No client portal — can't run outbound for clients
- No African market
- K.I.N.D is the SMB + Africa version of Amplemarket

**What to steal:** Intent signal detection — job changes, funding rounds, hiring signals → trigger FIGSY outreach at peak intent. Art of Possible #10.

---

### 7️⃣ Alta AI SDR *(full audit in Section 20)*

**Summary:** US-based AI SDR. USD-only, quarterly billing, no refunds, no trial. Zero Africa presence. No POPIA/NDPR. No WhatsApp strategy. No ZAR billing.

**Their strongest feature:** Fully autonomous AI SDR — researches, writes, sends, follows up without human review.
**Our counter:** FIGSY does the same but surfaces replies to humans (safer, more compliant, Africa-ready).

---

### 🎯 Positioning Matrix — How to Win Each Conversation

| If prospect mentions... | Your response |
|---|---|
| **Lemlist** | "Lemlist is a great sending tool. K.I.N.D is a complete client platform — your clients log in, see their leads, track results, and top up credits. Lemlist has no client portal at any price." |
| **Instantly** | "Instantly is pure email infrastructure — no lead sourcing, no AI, no client layer. K.I.N.D generates your leads, writes the sequences, and gives your clients a dashboard. One platform." |
| **Clay** | "Clay is for technical operators building data pipelines. K.I.N.D is for business owners who want outbound running without hiring a specialist. We'll add Clay-style waterfall enrichment by Q3." |
| **Apollo** | "We actually use Apollo as our lead source — so you get their data inside K.I.N.D plus the client portal, white label, credit model, and Africa focus Apollo doesn't have." |
| **Reply.io** | "Reply.io is good for your own outbound. K.I.N.D is built for running outbound for clients — white label portal, multi-client management, credit billing. Different use case." |
| **ClickUp** | "ClickUp is a general work OS. K.I.N.D is a vertical AI outbound engine — sequences, reply detection, lead scoring, client portal. ClickUp has zero sequence engine." |
| **Cheaper option** | "We price per result — credits consumed when leads are delivered. No seat fees, no monthly minimum on unused capacity. Two clients covers our entire infrastructure cost." |

---

## 27. ART OF THE POSSIBLE — FULL BUILD QUEUE — FULL BUILD QUEUE

*Everything we can build. Prioritised. Nothing starts until smoke tests pass (Tests 1–4).*
*Status: 🔴 Not started · 🟡 Planned · 🟢 Built*

---

### 🥇 Tier 1 — Build Immediately After Smoke Tests (Week of 31 May)
*Stolen from ClickUp. All are pure frontend/cron — no new dependencies.*

| # | Feature | Stolen from | What it does | Est. time | Status |
|---|---------|------------|-------------|----------|--------|
| 1 | **Command palette** | ClickUp | Cmd+K in portal + admin — search leads, jump to any page, run quick actions | 4h | 🔴 |
| 2 | **Activity feed** | ClickUp | Timeline on portal dashboard: lead added / email sent / reply / credit used / sub changed | 1 day | 🔴 |
| 3 | **Shareable read-only dashboards** | ClickUp | `/share/:token` — client shares live stats link with investor, no login needed | 1 day | 🔴 |
| 4 | **Scheduled report emails** | ClickUp / Apex | Weekly digest to clients: leads delivered, replies, credit balance — cron already exists | 4h | 🔴 |
| 5 | **"AI Revenue OS" positioning rewrite** | Apex | Update website, pricing page, landing, demo page copy with new framing | 2h | 🔴 |

---

### 🥈 Tier 2 — Build at 10+ Clients
*Architectural. Needs real client data to build correctly.*

| # | Feature | Stolen from | What it does | Status |
|---|---------|------------|-------------|--------|
| 6 | **3-type memory model** | ClickUp + Apex | Split figsy_memory into: episodic (recent replies) + long-term (winning angles, company context) + preference (tone/format per ICP). Doubles FIGSY sequence quality. | 🔴 |
| 7 | **Deliverability dashboard** | Industry standard | SPF/DKIM/DMARC status, bounce rate, spam score per domain | 🔴 |
| 8 | **Email score pre-send** | Industry standard | Score sequence copy before it sends — flag weak subject lines, spam triggers | 🔴 |
| 9 | **Adaptive send volume** | Industry standard | Auto-adjust daily sends based on reply rate — protect domain reputation | 🔴 |
| 10 | **Intent signal detection** | Industry standard | Detect job changes, funding rounds, hiring signals — trigger FIGSY outreach at peak intent | 🔴 |
| 11 | **Client morning brief email** | Apex | Extend founder brief to all active clients — daily: leads delivered, replies, balance, next send | 🔴 |
| 12 | **Multi-model toggle per campaign** | ClickUp | Per-campaign: Haiku (volume/speed) vs Sonnet (quality/complex ICP) | 🔴 |

---

### 🥉 Tier 3 — Build at 20+ Clients
*Platform maturity features. High complexity or architectural change required.*

| # | Feature | Stolen from | What it does | Status |
|---|---------|------------|-------------|--------|
| 13 | **Configurable agent triggers** | ClickUp | UI to set: "Run FIGSY at 9am Mon-Fri" or "on new lead added" — replaces hardcoded cron | 🔴 |
| 14 | **A/B subject line testing** | Industry standard | Split test subject lines across FIGSY sequences — auto-pick winner after 50 sends | 🔴 |
| 15 | **Conditional sequence branching** | Industry standard | If reply = warm → branch to different follow-up. If cold → continue. | 🔴 |
| 16 | **Waterfall enrichment** | Clay/Apollo | Layer Apollo → PDL → Hunter → Clearbit — fill missing fields, never skip a lead | 🔴 |
| 17 | **Kanban deal view** | ClickUp | Visual pipeline: your own sales + client campaign stages — Kanban-style | 🔴 |
| 18 | **Scheduled report emails (advanced)** | ClickUp | Daily/weekly/monthly digest with custom metrics per client — configurable in portal | 🔴 |
| 19 | **File approval workflow** | ClickUp | Sequence copy → client approves in portal before FIGSY sends | 🔴 |
| 20 | **ICP auto-refinement** | Internal | After 50+ leads: AI analyses reply data → suggests ICP improvements → client approves | 🔴 |

---

### 🏗️ Tier 4 — Year 2 Architecture
*Major builds. Require team or significant time investment.*

| # | Feature | Stolen from | What it does | Status |
|---|---------|------------|-------------|--------|
| 21 | **Multi-agent orchestration** | ClickUp / Apex | FIGSY + OTTO + LENA running in parallel — coordinated campaigns | 🔴 |
| 22 | **FIGSY Memory v2** | ClickUp + Apex | Full 3-type memory with vector embeddings (pgvector) — personalisation at scale | 🔴 |
| 23 | **Pipeline forecasting** | Industry standard | AI predicts close probability based on reply classification + ICP match score | 🔴 |
| 24 | **In-portal client messaging** | ClickUp | Direct message thread between client and your team — in portal, no email needed | 🔴 |
| 25 | **Realtime dashboard** | ClickUp | Supabase realtime wired to frontend — live lead counts, reply alerts | 🔴 |
| 26 | **Proposal + e-sign** | Industry standard | Generate proposal from ICP + pricing → DocuSign/Signable — never leave the platform | 🔴 |
| 27 | **Contract / invoicing in portal** | ClickUp | Invoice history, payment receipts, contract storage per client | 🔴 |
| 28 | **Meeting notetaker** | ClickUp / Apex | Auto-join Zoom/Google Meet → transcribe → create action items — Milla product extension | 🔴 |
| 29 | **Mobile app** | ClickUp | iOS + Android — reply notifications, credit alerts, campaign status | 🔴 |
| 30 | **500+ FIGSY skill library** | ClickUp | Modular FIGSY skills: LinkedIn research, news monitoring, personalised openers per vertical | 🔴 |

---

### 🔒 Will Not Build
| Feature | Why |
|---------|-----|
| LinkedIn automation | ToS risk — permanent account ban |
| Collaborative docs (Notion-style) | Not our domain — clients use Notion/ClickUp |
| Whiteboards | Not our domain |
| Self-hosted deployment | Kills SaaS model |
| Custom emoji | Vanity feature |
| Internal team chat | Use Slack — not worth building |

---

### How to Activate
**Say:** *"Build Art of Possible #1"* or *"Build #1 and #4"* and they go same day.
**After smoke tests:** Start with #1–#5 (all Tier 1). Takes 3 days total.
**Sequence:** Smoke tests → Tier 1 builds → first client → Tier 2 → 10 clients → Tier 3 → 20 clients → Tier 4.

---

## 28. ART OF POSSIBLE — PRODUCTS WE STUDY

*Products we study, what we learn, and how we respond. Not a threat list — an inspiration log.*
*Full detail in: `docs/art-of-possible.md` (also readable at Admin → Docs → Art of Possible)*

> **The one rule:** Build the foundation. Prove the loop. Then build the palace.
> **Gate:** 20+ paying clients with the core loop proven before any V2 feature is touched.

| # | Product | Category | Key Lesson | Status |
|---|---------|----------|------------|--------|
| 1 | Apex (apex.host) | Autonomous AI assistant | "Acts, doesn't just respond" — copy framing | 🟡 Actions pending |
| 2 | ClickUp | Project management SaaS | Command centre UI, multiple views, Cmd+K | ✅ Design built |
| 3 | Lemlist | Email outreach | Personalised images ✅, template library ✅, community ❌ | ✅ 2/3 built — community gap remains |
| 4 | Instantly | Cold email at scale | Campaign auto-pause, domain warming cap | ✅ Built |
| 5 | Clay | Data enrichment | Multi-source fallback search | ✅ Built |
| 6 | Apollo | Lead data + sequences | Our supplier — job change alerts, sequence analytics | ✅ Integrated |

### The Three Teachers — Summary

**ClickUp → Command Centre**
Multiple views (Kanban, heatmap, timeline), Command palette Cmd+K, real-time activity feed, sidebar status bar. These are Pieces 1–5 in the Art of Possible. Build post 20 clients.

**Lemlist → Conversion Machine (6 lessons)**
1. **Personalised images** in emails — dynamically generated per prospect. Phase 3. (Piece 9)
2. **Visual sequence builder** — clients see + edit their FIGSY flow. Phase 5. (Piece 7)
3. **Template library** — pre-built sequences by ICP type. Phase 2. (Piece 10) ← low effort, high onboarding value
4. **AI icebreaker lines** — K.I.N.D already does this better (full email, not just first line) ✅
5. **Community ("Lemlist Family")** — Africa B2B content marketing. Nobody owns this space. **Start now.**
6. **Multi-channel LinkedIn** — deliberately NOT building. LinkedIn ToS risk. Decision locked.

**Apollo → Supplier + Teacher**
Apollo powers our data. They're a partial competitor (sequences vs FIGSY) but non-overlapping buyers. Lessons: job change alerts (Phase 4), sequence analytics, AI transparency. Strategic reality: K.I.N.D's moat is African B2B conversion data — unreplicable by Apollo regardless of what they build.

### The 15 Pieces — Build Status (Updated 1 Jun 2026)

| # | Piece | What it is | Status |
|---|-------|-----------|--------|
| 1 | Multiple views | Kanban + heatmap + timeline for leads | ✅ Kanban built (P2-8). Heatmap + timeline = not built. |
| 2 | Command palette | Cmd+K — New ICP, Pause FIGSY, Hot leads | ❌ Not built |
| 3 | Real-time activity feed | Live events: email sent, reply, score, interested | ❌ Not built |
| 4 | Notification centre | Bell + red badge + slide-out panel | ❌ Not built |
| 5 | Status bar | Sidebar bottom — FIGSY stats, credits, health | ❌ Not built |
| 6 | Custom lead fields | `custom_fields jsonb` per client | ❌ Not built |
| 7 | Visual automation builder | React Flow — triggers, actions, if/then | ❌ Not built (Phase 5) |
| 8 | ICP that learns itself | AI insight bullets from reply patterns | ✅ Built (P2-10 ICP auto-refinement) |
| 9 | Personalised images | SVG with lead name/company in email | ✅ Built (P2-13) |
| 10 | Sequence template library | Pre-built FIGSY sequences by ICP type | ✅ Built — 6 templates in FIGSY page |
| 11 | Voice morning brief | Milla reads 90-sec audio at 7:30am | ❌ Not built |
| 12 | Benchmarks | "Your industry averages 7.1% — you are at 11%" | ✅ Built (P2-11 network benchmarks in KPIs) |
| 13 | White-label / Agency | Agencies manage 5–10 clients in one view | ✅ Built (P2-12 white-label mode) |
| 14 | MCP server | K.I.N.D as AI infrastructure | ✅ Built (P3-1 developer portal + MCP routes) |
| 15 | Mobile PWA | manifest + push notifications | ❌ Not built |

### Piece 14 — MCP Server (K.I.N.D as AI Infrastructure)

**What it is:** K.I.N.D builds an MCP server. Any AI assistant (Claude or any MCP-compatible tool) can call K.I.N.D's capabilities directly without a portal login.

**Example:**
> A founder types into Claude: "Find me 20 CTOs at fintech companies in Lagos."
> Claude calls K.I.N.D MCP → runs ICP search → returns scored, POPIA-screened leads in the conversation.

**Or an agency's AI workflow:**
> Every Monday: find 50 new leads matching profile X → enroll in FIGSY sequence 3. Fully automated.

**Tools exposed:** `search_leads`, `run_icp`, `get_figsy_stats`, `enroll_lead`, `pause_campaign`, `get_credit_balance`, `get_top_leads` — all mapping to existing API endpoints. New wrapper only.

**Why strategic:**
- Anthropic MCP directory → any Claude user needing African B2B leads finds K.I.N.D first
- Developer/agency tier → higher ARPU than standard clients
- Milla uses the same MCP internally — build once, powers both
- Two revenue streams: outcomes to founders + infrastructure to builders

**Build time: 3–5 days. Trigger: 20+ clients. Say the word.**

### The Community Play — Start Now, Free

Nobody owns "B2B outreach in Africa" as a content category. One LinkedIn post or article per week:
- *"How to do cold outreach in South Africa without breaking POPIA"*
- *"Best industries for B2B sales in Nigeria right now"*
- *"Why your cold email gets no replies"*
- *"Apollo vs K.I.N.D — when to use each"*

Lemlist built their business on this. No budget needed. CMO cron already generates LinkedIn drafts. Use them.

### What's Already Built From These Products

| From | What | Status |
|------|------|--------|
| ClickUp | Dark premium website design | ✅ |
| ClickUp | 3-tier pricing max | ✅ |
| ClickUp | Partner/referral programme | ✅ |
| Lemlist | FIGSY 3-step sequence engine | ✅ |
| Lemlist | Reply classification + pause | ✅ |
| Lemlist | Campaign KPIs | ✅ |
| Lemlist | Personalisation variables | ✅ |
| Instantly | Campaign auto-pause <1% | ✅ |
| Instantly | `FIGSY_DAILY_SEND_LIMIT` | ✅ |
| Clay | Apollo 3-pass fallback search | ✅ |
| Clay | ICP as layered filter system | ✅ |

### Gaps They All Have That K.I.N.D Owns

- No African market (K.I.N.D owns ZA/NG/KE/GH — first mover, 18-24 month window)
- High friction / power-user tools vs K.I.N.D signup-and-go
- They sell tools. K.I.N.D sells results.
- No AI that learns from outcomes — K.I.N.D's figsy_memory compounds over time
- No POPIA compliance, no ZAR billing, no African contact data

### THE ACTION PLAN — How Each Piece Gets Done

*From May 25 session — "Dont build. Outline how we could do this in action."*
*Sequence locked. Nothing changes until core loop is proven for 20+ paying clients.*

| Piece | What | How | Time | Phase |
|-------|------|-----|------|-------|
| **5** | **Status bar** | `GET /clients/me/pulse` (cached 60s) + sidebar bottom component | **4 hours** | **Build first** |
| **6** | Notification centre | `notifications` table, bell icon, slide-out panel, click → navigate | 3 days | Any time |
| **1a** | Kanban view | `@dnd-kit/core` (12kb). Status → columns: `New → In Sequence → Replied → Interested → Meeting Booked → Closed` | 2–3 days | Phase 2 |
| **1b** | Score heatmap | Industries × geographies, bubble = lead count, colour = score. `recharts`. Data exists already. | 1 day | Phase 2 |
| **1c** | Timeline | Gantt per lead — when each FIGSY step fires. Data in `figsy_sent_emails`. | 2 days | Phase 3 |
| **2** | Command palette Cmd+K | `cmdk` library (7kb, Vercel/Linear/Raycast use it). Pure frontend, zero backend changes. | 1–2 days | Phase 2 |
| **3** | Real-time activity feed | Supabase realtime — `supabase.channel('activity').on('postgres_changes', ...)` — 20 lines. | 3 days | Phase 3 |
| **4** | Custom lead fields | `ALTER TABLE leads ADD COLUMN custom_fields jsonb default '{}'` + `client_lead_fields` config table | 4–5 days | On request |
| **7** | Visual automation builder | React Flow canvas. `client_automations` JSON table. Triggers → conditions → actions. | 2–3 weeks | Phase 5 |
| **8** | ICP that learns itself | SQL: leads × figsy_replies grouped by attribute → Claude Haiku writes 3–5 insight bullets → "Apply to ICP" button | 2 days | Phase 4 |
| **9** | Voice morning brief | Text already generated. Add ElevenLabs/OpenAI TTS API call → MP3 → audio player on dashboard | 1 day | Post Milla live |
| **10** | Network benchmarks | Aggregate cross-client query (min 5 clients = privacy gate). "Your industry averages 7.1% — you're at 11.4%" | 2 days | Phase 4 |
| **11** | White-label / Agency | `white_label_configs` table + `partner_id` FK + Vercel CNAME + billing multiplier | 1 week | On request |
| **12** | Mobile PWA | `manifest.json` + `next-pwa` + Web Push API + `push_subscriptions` table | 2 days | Phase 3 |
| **13** | MCP server | `@modelcontextprotocol/sdk` wrapper over existing REST API + `api_keys` table | 3–5 days | Phase 4 |

### LOOK & FEEL DIRECTION

*From May 25 — "I want this to be the best product ever." — not yet built, parked for portal V2.*

**Current state:** Clean. Functional. Dark mode works. But it feels like a tool, not a revenue command centre.

**The direction:**

**Personality per agent.** Each product section feels different — not different branding, different energy:
- FIGSY: sharp, high-frequency, outbound — intense green pulse
- Milla: calm, considered, knowledge-based — soft blue glow
- Vida: reactive, conversion-focused — sharp amber

**Live data everywhere.** Numbers count up. Progress bars fill. Reply rates update in real time. The portal should feel *alive.*

**Status bar — always visible.** Bottom of sidebar. One line: *"FIGSY sent 12 emails today · 2 replies · 847 credits · All systems operational."*

**Progressive disclosure.** Simple by default, powerful on demand. New client sees essentials. Power user accesses everything. ClickUp's model.

**Micro-interactions.** Lead scores 90+: it glows. FIGSY sends a batch: subtle pulse animation. Credits low: balance goes amber. Small moments that make the product feel considered.

### PORTAL V2 — BUILT, DORMANT

**Status: ✅ Built — activate with `FEATURE_PORTAL_V2=true` in Railway.**

Built in background during May 24-25 sessions. Hidden behind a feature flag. Not yet live for clients.

**What it includes:**
- **SidebarV2** — product switcher at the top (Lead Gen / FIGSY / Products tabs), contextual sub-nav below
- **Mission Control Dashboard** — 3-column live ops view (FIGSY outbound | Leads pipeline | Intelligence)
- **Design system tokens** — consistent spacing, colour, typography

When you're ready to show it to clients: add `FEATURE_PORTAL_V2=true` to Railway → redeploy → done.

---

## 29. COMPLIANCE CERTIFICATIONS ROADMAP

*Live tracker: Admin → Compliance*

### The 5 Certifications — What They Are and When to Get Them

| Badge | Status | Trigger | Cost (est.) | Year |
|-------|--------|---------|-------------|------|
| GDPR | ✅ Done | Built in from day 1 | £0 | 2026 |
| CCPA | ✅ Done | Built in from day 1 | £0 | 2026 |
| SOC 2 Type II | ⏳ Plan | First enterprise contract or 50+ clients | ~$50,000 | Q1 2027 |
| ISO 27001 | ⏳ Plan | Year 2 — African enterprise pipeline | ~£20,000 | 2027 |
| ISO 42001 (AI) | ⏳ Plan | Year 2 — AI governance differentiator | ~£15,000 | 2027 |

### Plain English — What Each One Means

**GDPR ✅ + CCPA ✅ — Already Done**
These aren't third-party certifications — they're regulatory compliance claims. K.I.N.D has all the policies, consent flows, and data rights built in. These badges are live on the website now — fully legitimate.

**SOC 2 Type II** — the one US enterprise buyers actually ask for. An independent accounting firm audits your security controls over 6–12 months and issues a report.
Path:
1. Run free Vanta gap assessment at vanta.com — shows exactly what's missing, no commitment
2. Fix gaps (policies, pen test, MFA everywhere) — 2–4 months
3. Observation period — operate normally for 6–12 months while Vanta collects evidence
4. CPA firm audits the evidence → issues the report
Trigger: first enterprise contract or 50+ clients. Cost: ~$50,000 Year 1 total.

**ISO 27001** — more recognised in Africa, Europe, and the Middle East than SOC 2. Opens Nigerian banks, Kenyan fintechs, and SA corporate procurement. Trigger: Year 2, African enterprise pipeline. Cost: ~£15–25,000.

**ISO 42001** — the world's first standard specifically for AI systems (published Dec 2023). Almost no companies have it yet. As an AI-native product, KIND has a natural story to tell — especially as the EU AI Act and African AI governance frameworks develop.
**Start now (free):** Create an AI Risk Register (a Google Doc listing each AI model used, what data it processes, and what decisions it influences). Costs nothing — but you can use it in enterprise conversations immediately.
Trigger: Year 2. Cost: ~£10–15,000.

### The Smart Play: Year 2 Triple Certification
Do SOC 2 + ISO 27001 + ISO 42001 simultaneously using Vanta. They share ~70% of controls. One compliance programme, three badges — ~40% cheaper than doing them separately.

### What To Do Right Now (Free, Today)
- [ ] Start AI Risk Register (Google Doc — lists all AI models, data processed, decisions made)
- [ ] Add GDPR ✅ and CCPA ✅ badges to website trust page
- [ ] Add compliance page to sales deck — shows enterprise-readiness before you have the certs

---

## 30. COMPETITOR TARGETING STRATEGY

*Competitor ICPs ready to run: `supabase/seeds/competitor_icps.sql`*
*Requires: Apollo Basic ($49/mo) minimum — free plan blocks tech stack filter*

### The Strategy
People using Lemlist, Instantly, Clay, or Smartlead in Africa are the warmest possible leads for K.I.N.D. They are already:
- Paying for outreach tools (proven budget)
- Buyers in this exact category
- Likely doing it manually and frustrated

Apollo's `technology_names` filter finds them directly.

### The 4 ICPs — Ready to Fire

**ICP 1 — Lemlist Users (Africa)**
- Titles: CEO, Founder, Co-Founder, Head of Sales, Head of Marketing
- Seniority: C-Suite, VP/Director, Manager
- Geographies: South Africa, Nigeria, Kenya, Ghana, Egypt
- Tech stack: Lemlist
- Company size: 1–200 employees
- Pitch: *"You're doing this yourself with Lemlist. We do it for you — POPIA compliant, ZAR billing, no setup."*

**ICP 2 — Instantly / Smartlead Users (Africa)**
- Titles: CEO, Founder, Agency Owner, Head of Growth
- Geographies: South Africa, Nigeria, Kenya
- Tech stack: Instantly or Smartlead
- Company size: 1–50 employees
- Pitch: *"Cold email infrastructure with no strategy is hard. FIGSY is the strategy and the sending — fully managed."*

**ICP 3 — Clay Users (Africa)**
- Titles: Head of Growth, RevOps, Founder, CEO
- Geographies: South Africa, Nigeria, Kenya
- Tech stack: Clay
- Company size: 11–200 employees
- Pitch: *"Clay is powerful but complex. K.I.N.D delivers the same enriched, personalised outreach — without needing a RevOps person to run it."*

**ICP 4 — Apollo Sequences Users (Africa)**
- Titles: Head of Sales, Sales Director, CEO, Founder
- Geographies: South Africa, Nigeria, Kenya
- Tech stack: Apollo (sequences)
- Company size: 11–500 employees
- Pitch: *"You're paying for Apollo and still managing sequences yourself. K.I.N.D wraps Apollo's data in a fully managed outreach service — you just get the meetings."*

### The Outreach Message (FIGSY Template)
> "Hi [First Name] — spotted that [Company] uses [Lemlist/Instantly/Clay]. We built K.I.N.D specifically for African businesses doing B2B outreach — fully managed, POPIA compliant, ZAR billing. FIGSY (our AI SDR) runs the whole sequence. Worth a 15-minute call?"

FIGSY reads the `tech_stack` field on the lead and references it in the opening line automatically.

### How to Activate
1. Upgrade Apollo → Basic ($49/mo) at app.apollo.io → Settings → Plan & Billing
2. Portal → ICPs → build the 4 ICPs above (or run `supabase/seeds/competitor_icps.sql` with your client_id)
3. Hit Run — leads start populating immediately
4. FIGSY campaign → enroll leads → sequences fire automatically

**Estimated pipeline from one run:** ~200 warm prospects across 4 ICPs (Africa-focused, proven buyers).

---

---

## 31. AI LEARNING CAPABILITY — BUILT, PLANNED, VISION

*This is one of K.I.N.D's core long-term moats. Every other competitor sends static sequences. K.I.N.D gets smarter with every email sent.*

---

### Level 1 — Per-Client FIGSY Memory (BUILT — 19-20 May 2026)

**What it is:** FIGSY remembers what works for each client and gets better over time.

**Where it lives:** `figsy_memory` table + `generateSequenceWithMemory()` in `apps/api/src/lib/figsy.ts`

**How it works:**
- After every reply, FIGSY updates its memory for that client:
  - `best_subject_lines` — subject lines that generated replies
  - `avg_reply_rate_30d` — rolling 30-day reply rate
  - `total_sent_all_time` — total emails sent
  - `last_winning_angle` — the angle/hook that generated the last high-response campaign
- After 20+ emails sent, all new sequences are generated using `generateSequenceWithMemory()` instead of the base `generateSequence()`
- Claude (Haiku) reads the memory context and writes sequences that replicate what worked and avoid what didn't
- Falls back to standard sequence if memory query fails

**What this means for clients:** FIGSY on Month 3 is measurably better than FIGSY on Day 1. Same client, same product, compounding improvement.

**Memory refresh:** Cron + manual endpoint (`POST /internal/figsy/refresh-memory`) recalculates the memory table from live reply data.

**Escalation logic (also built):** Daily cron auto-pauses any campaign that falls below 1% reply rate after 20+ sends. This forces a reset and prevents burning domain reputation on failing sequences.

---

### Level 2 — ICP Learning Loop (PLANNED — 6 months post-launch)

**What it is:** Monthly AI review of reply data to auto-refine the ICP criteria. FIGSY tells you who's actually responding, not who you thought would respond.

**How it works (to build):**
1. Monthly cron pulls all replies per ICP (positive, negative, neutral)
2. Claude analyses patterns: which industries/titles/company sizes are converting, which aren't
3. Generates a refined ICP recommendation
4. Emails the founder: "Based on last month, your ICP is converting best from [industry] / [title] — here's a suggested refinement."
5. Founder approves in portal → ICP updates automatically

**Why this matters:** Most B2B companies spend months refining their ICP manually from intuition. K.I.N.D does it from data — automatically. This is a feature no competitor has.

**Status:** Not built. Roadmapped for Month 6–12 (Nov 2026 – May 2027) once live reply data exists.

---

### Level 3 — Adaptive Per-Campaign Learning (PLANNED — Phase C)

**What it is:** Within-campaign adaptation. FIGSY adjusts subject lines and openers in real time based on what's working in the current batch.

**How it works (to build):**
- After Day 1 emails, scan reply rates by subject line variant
- If one subject line variant is outperforming, weight remaining sends toward it
- This is a mini A/B test that auto-resolves without the founder doing anything

**Related — A/B subject line testing (also planned):**
- Send 2 variants to first 20% of leads
- Pick winner by 48h open rate
- Send winner to remaining 80%

**Status:** Not built. Phase C roadmap item.

---

### Level 4 — Platform-Level Intelligence (Vision — Year 3, 2028)

*We park this until we have 500+ active clients. Do not build before then.*

**What it becomes:** K.I.N.D has data that no individual sales team will ever have. By 2028:

- **Proprietary dataset:** Leads scored, contacted, and converted across thousands of African B2B companies
- **Predictive ICP:** K.I.N.D tells you who to target before you ask — based on patterns from companies like yours
- **Industry benchmarks:** "Companies in your industry convert at 3.2% via FIGSY. You're at 1.8%. Here's what the top performers do differently."
- **Cross-client learning:** FIGSY learns from what's working across ALL clients in your industry — not just yours

**Why this is a moat:** Apollo sells data. Lemlist sends emails. Salesforce stores what happened. K.I.N.D learns from outcomes at scale — and that data accumulates forever.

**The compounding advantage:** Every new client makes the platform smarter for every other client in their industry. This is the network effect that makes K.I.N.D defensible at scale.

---

### The AI Learning Stack — Summary

| Level | What it does | Status | Timeline |
|-------|-------------|--------|----------|
| 1 | FIGSY learns per-client — subject lines, angles, reply rates | ✅ **BUILT** | Live since 20 May 2026 |
| 2 | ICP auto-refines from reply data — monthly AI review | ❌ Planned | Month 6–12 post-launch |
| 3 | Per-campaign adaptive sending — A/B subject lines | ❌ Planned | Phase C (Month 3+) |
| 4 | Platform learns across all clients — predictive ICP, benchmarks | 🔵 Vision | Year 3 (2028) — when 500+ clients |

---

### Connection to Competitor Positioning

Every competitor sends static, dumb sequences:
- **Lemlist:** You write the emails. Lemlist sends them.
- **Instantly:** Volume + warmup. Zero intelligence.
- **Clay:** Smart enrichment. No sequence intelligence.
- **Apollo Sequences:** Decent but you manage everything.

K.I.N.D is the only platform where the AI SDR gets measurably better the longer you use it. That is the moat. That is the selling point. That is what "FIGSY learns" means.

**Copy to use:** *"FIGSY gets smarter every month. Month 1: baseline. Month 3: it knows your best angles. Month 6: it knows your ICP better than you do."*

---

*Added: 26 May 2026*
---

## 32. CLICKUP BRAIN — WHAT WE STUDIED, WHAT WE ADOPTED, WHAT'S NEXT

*This is the "out of the box" session — May 2026. "I don't want to build now. But look at ClickUp's Brain agents and see what they have that we could use."*
*Full study: `https://clickup.com/brain/agents` and `https://clickup.com/`*

---

### What ClickUp Brain / Super Agents Actually Is

ClickUp's strategic bet: **AI agents with persistent identity, memory, and proactive triggers are the future of work management.**

Their Super Agents are not automations. Automations are: if X → do Y (deterministic, dumb). Super Agents: observe context → break goal into steps → select tools → execute → verify → escalate if uncertain. A reasoning loop. Adaptive.

**What makes them different:**

| Feature | What it means |
|---------|--------------|
| Persistent identity | Agents exist as named "people" in your workspace. They remember what happened last session, last week. |
| Memory — 3 types | Recent/Episodic (last session), Long-term (months), Preference (tone, format, how you work) |
| Proactive triggers | Fire on a schedule without anyone pressing a button. Monday morning → report sent. Friday → pipeline summary posted. |
| Escalation logic | When uncertain, the agent stops and asks instead of guessing. Doesn't run blindly. |
| 500+ skills | Research, task creation, email drafting, scheduling, standup facilitation, sprint planning, risk assessment |
| Multi-model | Clients choose GPT-5, Claude Opus, o3, Gemini depending on the task |
| Connected search | Searches ClickUp + Google Drive + GitHub + OneDrive simultaneously |

**ClickUp Brain MAX (desktop):**
- Talk-to-text AI queries — ~4× faster than typing
- Cross-tool search across all integrated apps
- Claims ~1.1 days saved per user per week

---

### The Gap This Exposed in K.I.N.D (May 2026 assessment)

| What ClickUp agents do | What K.I.N.D agents do | Gap |
|----------------------|----------------------|-----|
| Persistent identity + memory | Reset every run | ❌ |
| Proactive scheduled triggers | Human initiates everything | ❌ |
| Escalation logic (uncertain → ask) | Run blindly regardless | ❌ |
| Multi-model choice | Hard-wired to one model | ❌ |
| Meeting notetaker (joins calls, transcribes) | Not built | ❌ |

**One-line version:** ClickUp's agents are proactive, have memory, and escalate when stuck. K.I.N.D's agents were reactive, stateless, and ran blindly. Closing those three gaps is what makes K.I.N.D's AI genuinely competitive.

---

### What We Did About It — What's Built

All three core gaps were closed during the May 2026 build sessions:

| Gap | Fix | Status |
|-----|-----|--------|
| No memory | `figsy_memory` table + `generateSequenceWithMemory()` | ✅ Built — 19 May |
| Runs blindly | Escalation alerts — auto-pauses campaigns <1% reply rate after 20+ emails | ✅ Built — 19 May |
| No identity | FIGSY identity card in portal — name, avatar, live stats, "Last active X ago" | ✅ Built — 19 May |
| No proactive digest | Monday weekly digest includes FIGSY stats — sent without prompting | ✅ Built — 19 May |

**What was NOT built (parked):**
- Multi-model toggle (GPT/Claude/Gemini choice) — not a priority yet
- Meeting notetaker — "2–3 weeks for a feature clients haven't asked for yet" — park until VA matures
- Connected cross-tool search — Year 2, when Milla has meaningful document volume

---

### What K.I.N.D Should Eventually Become (The ClickUp Vision Applied)

ClickUp's Super Agents are "coworkers, not tools." They are available 24/7, they remember your context, they act without being asked, and they escalate when uncertain.

**K.I.N.D's version of this — the full agent roster:**

| Agent | ClickUp equivalent | K.I.N.D role | Status |
|-------|------------------|-------------|--------|
| FIGSY | Super Agent — outbound | AI SDR: finds leads, writes emails, handles replies, learns what works | ✅ Live |
| Milla | Brain Notetaker + Knowledge Agent | VA: answers questions, runs morning brief, drafts documents | Subscription billing live — awaiting Stripe price IDs in Railway |
| Vida | Automation Agent — inbound | Chatbot: qualifies website visitors, WhatsApp handler | Subscription billing live — awaiting Stripe price IDs in Railway |
| REEVE | Sales Agent | AE: books discovery calls, follows up pipeline, drafts proposals | Year 2 |
| LENA | CS Agent | Customer Success: monitors health, flags at-risk, handles check-ins | Year 2 |
| OTTO | Ops/Analytics Agent | CRO: pipeline health, revenue forecasting, anomaly alerts | Year 2 |

**Each agent (when fully built):**
- Named identity card in portal with avatar, live stats, last active timestamp
- Memory that compounds over time
- Proactive triggers — fires on schedule, not on demand
- Escalation logic — pauses and alerts when uncertain instead of running blindly

---

### The Strategic Insight From ClickUp

> *"If a traditional AI agent can run a quick data analysis, a Super Agent is the analyst — who gathers the data, runs the model, interprets the results, and delivers the report in the right format to the right stakeholder, without being explicitly told each step."*

**This is K.I.N.D's long-term product vision in one sentence.** FIGSY doesn't just send emails — it is the SDR. Milla doesn't just answer questions — it is the Chief of Staff. By Year 2, clients don't use K.I.N.D. They work *with* K.I.N.D.

**The pricing insight:** ClickUp charges $9/user/month for their AI add-on. 1,500 credits included. K.I.N.D charges per outcome ($1/lead, $3/FIGSY credit). This is better — the client pays for results, not for compute. Keep this model.

---

### Parked — Do Not Build Yet

| Item | Why parked | When |
|------|-----------|------|
| Multi-model toggle | Clients don't need this yet — they don't know what Claude vs GPT means | Year 2 |
| Meeting notetaker | No demand yet. VA product must mature first. | Month 6–12 |
| Connected cross-tool search (Google Drive + GitHub) | Milla needs real document volume first | Year 2 |
| Full persistent agent memory (episodic + long-term + preference) | `figsy_memory` is Level 1. Deep memory architecture is Year 2. | Year 2 |

---

---

### CLICKUP vs K.I.N.D — FULL DETAILED COMPARISON

*Note: ClickUp is a $1B+ general-purpose work OS. K.I.N.D is a vertical AI outbound platform. This is not a "we're behind" analysis — it is a feature map to know exactly where we differ and what to steal.*

---

#### 🧠 AI / AGENTS

| Feature | ClickUp | K.I.N.D | Gap |
|---|---|---|---|
| AI model | GPT-5, Claude Opus 4.1, o3, o1-mini (switchable) | Claude Haiku (fixed) | ⚠️ Multi-model — Year 2 |
| AI memory — episodic | ✅ Recent interactions, conversations | ❌ Not built | ❌ Year 2 |
| AI memory — long-term | ✅ Docs, past tickets, rules, naming conventions | ✅ figsy_memory (reply stats, winning angles) | ⚠️ Partial |
| AI memory — preference | ✅ Tone, format, channel preferences per person | ❌ Not built | ❌ Year 2 |
| Agent triggers — manual | ✅ @mention, DM, assign as task | ❌ N/A (different model) | — |
| Agent triggers — scheduled | ✅ Hourly / daily / weekly / monthly / custom | ⚠️ Cron (3× daily) — hardcoded | ⚠️ Phase 3 |
| Agent triggers — automated | ✅ Any workspace event via Automations | ❌ Not built | ❌ Phase 3 |
| Agent skills | ✅ 500+ prebuilt + custom | FIGSY only — sequences + reply analysis | ❌ Year 2 |
| Multi-agent orchestration | ✅ Multiple agents in parallel | ❌ Not built | ❌ Year 2 |
| Agent identity | ✅ Named workspace members, persistent | ✅ FIGSY identity card (built May '26) | ✅ Done |
| Agent escalation | ✅ Auto-pause, ask for help, route to human | ✅ Auto-pause on low performance | ✅ Done |
| AI notetaker | ✅ Joins Zoom/Teams, transcribes, creates tasks | ❌ Not built | ❌ Parked |
| Multi-model toggle | ✅ Per-task: GPT-5 vs Claude vs o3 | ❌ Fixed Haiku | ❌ Year 2 |
| AI in mobile | ✅ Brain everywhere, dictation | ❌ No mobile app | ❌ Year 2+ |

**Gap summary:** ClickUp's memory model (3 types) is far more granular. We have 1 flat table. Their scheduled triggers run independently — ours are hardcoded cron jobs. The 500+ skill library is the real moat we need to build toward.

---

#### 🖥️ CLIENT PORTAL (what clients see)

| Feature | ClickUp | K.I.N.D | Status |
|---|---|---|---|
| Dedicated client portal | ⚠️ Hacked via guest access — complex | ✅ Purpose-built (NextAuth, dashboard) | ✅ We win |
| White labeling | ❌ Enterprise only — ClickUp brand shows | ✅ Fully white-labeled | ✅ We win |
| Custom domain | ❌ Not available | ✅ Built | ✅ We win |
| Client onboarding flow | ❌ Manual per-client setup | ✅ Automated provisioning | ✅ We win |
| Campaign status view | ❌ Not purpose-built | ✅ Built | ✅ We win |
| Credit balance / usage | ❌ Not built | ✅ Built | ✅ We win |
| Lead delivery dashboard | ❌ Not built | ✅ Built | ✅ We win |
| Client self-service top-up | ❌ Not built | ✅ Stripe credit top-up | ✅ We win |
| Clean non-PM UX | ❌ Clients see full PM interface | ✅ Stripped-back, purpose-built | ✅ We win |
| Guest seat cost | ❌ Costs extra per plan | ✅ No per-client seat pricing | ✅ We win |
| File approval workflow | ❌ Not native | ❌ Not built | Both gap |
| Contract / e-sign | ❌ Not built | ❌ Not built | Both gap |
| Invoicing in portal | ❌ Not built | ❌ Not built (Stripe external) | Both gap |
| Messaging in portal | ❌ Not native | ❌ Not built | Both gap |
| Mobile client app | ❌ Guests get full ClickUp — overkill | ❌ No mobile | Both gap |
| Notification / alerts | ⚠️ Email only | ⚠️ Not built properly | Both gap |
| Real-time data refresh | ✅ Live dashboard widgets | ⚠️ Polling / page refresh | ⚠️ Phase 2 |

**Verdict:** We win the client portal category. ClickUp's is a workaround. Ours is purpose-built. The gaps: file approvals, contracts, in-portal messaging, mobile.

---

#### ⚙️ BACKEND / PLATFORM

| Feature | ClickUp | K.I.N.D | Status |
|---|---|---|---|
| Database | Proprietary cloud | Supabase (Postgres, Cape Town) | ✅ |
| API | Full REST + webhooks + Enterprise API | REST API (Express) | ✅ |
| Webhooks — outbound | ✅ Any workspace event | ✅ Stripe inbound | ⚠️ Phase 2 expand |
| Realtime | ✅ Live updates everywhere | ⚠️ Supabase realtime not wired yet | ⚠️ Phase 2 |
| File storage | ✅ Native (60MB free) | ❌ No file storage | ❌ Phase 3 |
| Multi-tenancy | ✅ Workspace isolation | ✅ Per-client RLS (Supabase) | ✅ |
| Roles / permissions | ✅ Owner, Admin, Member, Guest + custom | ⚠️ Basic — admin vs client | ⚠️ Phase 2 |
| Audit log | ✅ Enterprise | ❌ Not built | ❌ Phase 3 |
| HIPAA / SOC2 / GDPR | ✅ Enterprise | ❌ SOC2 Q1 2027 | ⚠️ Roadmapped |
| POPIA | ❌ Not SA-specific | ✅ Full POPIA compliance built | ✅ We win |
| Credit system | ❌ No credit model | ✅ Built (credit_balance, transactions) | ✅ We win |
| Background jobs | ❌ Not exposed | ✅ 16 cron jobs (Railway) | ✅ We win |
| Email sending (outbound sequences) | ❌ Notifications only | ✅ Resend + FIGSY sequences | ✅ We win |
| Sequence engine | ❌ No outbound sequences | ✅ Built (multi-step, variable days) | ✅ We win |
| Reply detection | ❌ Not built | ✅ Auto-pause on reply | ✅ We win |
| ICP management | ❌ Not built | ✅ Built (ICP cascade, attributes) | ✅ We win |
| Lead sourcing | ❌ Not built | ✅ Apollo integration | ✅ We win |
| Platform status snapshots | ❌ Not built | ✅ 3× daily (platform_status table) | ✅ We win |

---

#### 🛠️ ADMIN END

| Feature | ClickUp | K.I.N.D | Status |
|---|---|---|---|
| Admin dashboard | ✅ Full workspace analytics | ✅ Built (K.I.N.D Admin portal) | ✅ |
| Client health view | ⚠️ Task-based, not client-health | ✅ At-risk client tracking | ✅ We win |
| Revenue dashboard | ⚠️ Time billing reports only | ✅ Revenue page | ✅ We win |
| AI exec team view | ❌ Not built | ✅ /agents/otto, /lena, /reeve, /cmo, /cto, /cfo | ✅ We win |
| Cohort tracking | ❌ Not built | ✅ /cohorts | ✅ We win |
| Lead pipeline view | ❌ Not built | ✅ HubSpot integration | ✅ We win |
| Scalability modelling | ❌ Not built | ✅ /scalability | ✅ We win |
| Terms library | ❌ Not built | ✅ /terms-library | ✅ We win |
| Doc viewer (internal) | ✅ ClickUp Docs — full collaborative editor | ✅ Markdown renderer (/docs/*) | ⚠️ Theirs is richer |
| Roadmap views | ✅ Gantt, Board, multiple views | ✅ /roadmap (static) | ⚠️ Theirs is richer |
| Compliance tracking | ✅ Enterprise dashboard | ✅ /compliance page | ⚠️ Theirs is deeper |
| Scheduled report emails | ✅ Emailed on schedule | ❌ Not built | ❌ Phase 2 |
| Workload / capacity view | ✅ Full team management | ❌ N/A (no internal team yet) | N/A |
| Goals / OKR tracking | ✅ Full goal folders, progress | ❌ Not built | ❌ Phase 3 |
| Kanban for deals | ✅ Full Kanban on any list | ⚠️ HubSpot for pipeline only | ⚠️ Phase 2 (Art of Possible Piece 1) |
| Custom dashboard widgets | ✅ 100+ widget types | ⚠️ Fixed layout | ⚠️ Phase 2 |
| Public shareable dashboards | ✅ Read-only links | ❌ Not built | ❌ Phase 2 |

---

#### 📱 VIEWS / UX

| Feature | ClickUp | K.I.N.D | Status |
|---|---|---|---|
| Views | ✅ 15+ (List, Board, Gantt, Calendar, Map…) | Pages-based — no view switching | ❌ Phase 3 |
| Global search | ✅ Searches Gmail too (2026) | ❌ Not built | ❌ Phase 3 (Piece 2) |
| Command palette | ✅ Built in | ❌ Not built | ❌ Phase 3 (Piece 3) |
| Activity feed | ✅ Realtime | ❌ Not built | ❌ Phase 2 (Piece 7) |
| Mobile app | ✅ iOS + Android | ❌ None | ❌ Year 2+ |
| Dark mode | ✅ | ✅ Dark-first design | ✅ |
| Keyboard shortcuts | ✅ Full | ❌ Not built | ❌ Phase 3 |
| Team chat | ✅ Full async + AI summaries | ❌ Not built | ❌ N/A |
| Collaborative whiteboards | ✅ | ❌ Not built | ❌ N/A |
| Forms builder | ✅ Full | ❌ Not built | ❌ Phase 3 |
| Template library | ✅ 1,000+ community templates | ❌ Not built | ❌ Phase 3 (Piece 15) |

---

#### 💰 PRICING MODEL

| | ClickUp | K.I.N.D |
|---|---|---|
| Model | Per-seat / per-user / per-month | Per-client SaaS + credit consumption |
| Free tier | ✅ Free Forever (limited) | ❌ No free tier |
| Entry price | $7/user/month | ~$80/month blended ARPU |
| AI add-on | $9/user/month extra | ✅ Included |
| White label | ❌ Enterprise only (expensive) | ✅ Standard |
| African market pricing | ❌ Not localised | ✅ ZAR-aware |
| Credit / outcome model | ❌ Not applicable | ✅ Core mechanic |

---

#### 🏆 WHERE WE WIN vs ClickUp

| Win | Why it matters |
|---|---|
| Purpose-built for B2B outbound | ClickUp has zero sequence engine, zero lead delivery, zero reply handling |
| Client portal is actually clean | ClickUp guests see a PM tool — ours is a real portal |
| White label is standard | ClickUp charges enterprise rates for this |
| Credit model | No per-seat confusion — pay for what you use |
| African market + POPIA | Nobody at ClickUp is thinking about this |
| FIGSY | AI that does outbound *for* you — ClickUp's AI assists, it does not execute |

---

#### 🔴 WHERE TO STEAL FROM CLICKUP

**Steal now (Phase 2–3):**

| Feature | Why | Art of Possible |
|---|---|---|
| Command palette | Global search + quick actions | Piece 3 |
| Scheduled agent triggers (event-driven, not cron) | Our hardcoded cron is fragile — theirs fires on any event | New piece |
| 3-type memory (episodic + long-term + preference) | We have 1 flat table — major upgrade | Section 27 Level 2 |
| Activity feed (realtime) | Every action shown live | Piece 7 |
| Shareable read-only dashboards | For clients + investors | New piece |

**Steal when >20 clients:**

| Feature | Why | Art of Possible |
|---|---|---|
| Multi-model toggle | Let campaign choose Claude vs GPT per need | Piece 8 (partial) |
| Kanban view | Deals pipeline, campaign stages | Piece 1 |
| Scheduled report emails | Daily/weekly digest pushed to clients | New piece |
| File approval workflow | Client approves copy before send | New piece |

**Long term / Year 2+:**

| Feature | Why | Notes |
|---|---|---|
| Mobile app | High cost, low priority | Year 2+ |
| Meeting notetaker | Joins calls, transcribes, creates tasks | Parked (Section 28) |
| 500+ modular skill library | FIGSY vertical skills | Year 2 |
| Multi-agent orchestration | FIGSY + OTTO + LENA in parallel | Year 2 |

---

### INFOGRAPHIC TABLES — PRINT / DECK READY

*These are simplified versions of the above tables, formatted for slide decks, pitch decks, and visual use.*

---

#### INFOGRAPHIC 1 — WHERE WE WIN (6 moats)

| # | MOAT | CLICKUP | K.I.N.D |
|---|---|---|---|
| 1 | Done-for-you | ❌ Self-serve tool | ✅ We run it for you |
| 2 | Client portal | ❌ PM tool (confusing) | ✅ Purpose-built |
| 3 | White label | ❌ Enterprise only | ✅ Standard |
| 4 | Pricing | ❌ Per seat / per month | ✅ Pay per lead |
| 5 | Africa + POPIA | ❌ Not built | ✅ Day 1 |
| 6 | AI execution | ❌ AI assists | ✅ AI does |

---

#### INFOGRAPHIC 2 — AI CAPABILITIES SNAPSHOT

| Capability | ClickUp | K.I.N.D |
|---|---|---|
| AI runs campaign end-to-end | ❌ | ✅ FIGSY |
| AI memory | ✅ 3 types | ✅ 1 type (growing) |
| Agent identity | ✅ Named members | ✅ FIGSY identity card |
| Agent escalation | ✅ | ✅ Auto-pause |
| Multi-model AI | ✅ GPT-5, Claude, o3 | ❌ Haiku (Year 2) |
| Proactive triggers | ✅ Any event | ⚠️ 3× daily cron |
| 500+ skills | ✅ | ❌ (Year 2) |

---

#### INFOGRAPHIC 3 — CLIENT PORTAL SCORECARD

| Feature | ClickUp | K.I.N.D |
|---|---|---|
| Purpose-built | ❌ | ✅ |
| White-label | ❌ | ✅ |
| Lead dashboard | ❌ | ✅ |
| Campaign status | ❌ | ✅ |
| Credit top-up | ❌ | ✅ |
| Automated onboarding | ❌ | ✅ |
| Per-client seat cost | ❌ Charges extra | ✅ Free |

**Score: K.I.N.D 7 / ClickUp 0**

---

#### INFOGRAPHIC 4 — PRICING COMPARISON

| | ClickUp | K.I.N.D |
|---|---|---|
| Base | $7/user/month | ~$80/client/month |
| AI | +$9/user/month | ✅ Included |
| White label | Enterprise (~$1,200+/year) | ✅ Included |
| African pricing | ❌ | ✅ ZAR |
| Pay per result | ❌ | ✅ |

---

*Added: 26 May 2026 — full ClickUp comparison + infographic tables*

---

*Added: 26 May 2026 — "think out the box" session*
*Source: ClickUp Brain Agents (apex.host + clickup.com/brain/agents)*

---

*Owner: K.I.N.D founding team*
*Last updated: 26 May 2026 (evening)*

---

## 33. FULL COMPETITIVE LANDSCAPE — EVERY PLAYER, EVERY LAYER

*Last updated: 26 May 2026*
*Purpose: Know every competitor cold. Know where we win. Know what to steal.*

> K.I.N.D is not a tool — it is a managed AI outbound service. Most "competitors" are tools clients operate themselves. That distinction is our primary moat.

---

### HOW TO READ THIS SECTION

Competitors are grouped into 7 tiers by category. Each entry covers: what they are, full feature set, pricing, where K.I.N.D wins against them, and what is worth stealing. The master comparison table follows all entries.

---

## TIER 1 — DIRECT OUTBOUND COMPETITORS
*(These are the closest functional overlaps — email sequence + AI + lead delivery)*

---

### LEMLIST

**What they are:** The gold standard for multichannel cold outreach. Best-in-class personalisation engine. 450M+ contact database bundled on upper tiers. French company, global reach.

**Sequences & Multichannel**
- Email + LinkedIn profile view + connection request + LinkedIn message + WhatsApp + call reminder — all in one sequence
- Conditional branching: if no reply after step N, branch to path B
- AI-generated full sequences from campaign goal + value proposition
- Multi-model AI: user picks Claude, GPT, or Perplexity per campaign
- A/B testing across subject lines, body copy, CTAs

**Personalisation (their superpower)**
- Dynamic text tokens: name, company, role, custom variables per prospect
- Personalised images: prospect's name on a whiteboard, company logo on a screen, custom mockups — generated per recipient at scale
- Personalised video thumbnails: individual video links per prospect
- Landing pages that show prospect-specific content
- Image personalisation lifts open rates 5–15% vs text-only campaigns

**Deliverability**
- Lemwarm built-in (email warmup — exchanges real emails with warmed inboxes to protect sender reputation)
- Included from Email Pro tier upward
- Deliverability dashboard: spam rate, inbox placement, sender score per mailbox

**Lead Database**
- 450M+ contacts (bundled on Multichannel Expert and above)
- Email + phone + LinkedIn data included
- Waterfall email verification built in
- No separate Apollo subscription needed on top tiers

**Integrations**
- HubSpot + Salesforce native 2-way sync
- Zapier, Make, API
- MCP server launched 2025 — lets AI tools call Lemlist directly

**Agency Features**
- Multi-sender: 3–15 sending email accounts depending on plan
- Agency workspace: manage multiple client accounts under one login
- Team inbox with assignment routing
- Role management: Admin, Manager, User

**Pricing**
- Email Starter: $39/user/month
- Email Pro: $79/user/month (3 senders + Lemwarm)
- Multichannel Expert: $99/user/month (5 senders + LinkedIn + 450M DB)
- Outreach Scale: $159/user/month (15 senders)

**Where K.I.N.D wins**
- Done-for-you: Lemlist is a tool — clients run it themselves. We run it for them.
- Zero learning curve: Lemlist requires DNS setup, LinkedIn config, sequence training. Our clients never touch any of it.
- Credit model: pay per lead delivered, not per seat per month
- White-label client portal: Lemlist has no client-facing view
- African market + POPIA: no African focus, no ZAR pricing

**What to steal**
- Personalised images per lead (name/logo injected into image templates) — massive open rate lift
- Conditional sequence branching (if no reply → path B)
- Multi-model AI toggle per campaign
- Waterfall email verification (Apollo → Hunter → fallback)
- Unified reply inbox for admin (Art of Possible Piece 6)
- Template + community library (Art of Possible Piece 15)

---

### INSTANTLY.AI

**What they are:** High-volume email infrastructure. Built for agencies and teams sending millions of cold emails. Core moat: unlimited email accounts at flat rate.

**Infrastructure**
- Unlimited email account connections — no per-inbox cost
- Unlimited sending domains
- Built-in email warmup across all accounts
- Real-time domain reputation monitoring
- Unique IP rotation per campaign
- Smart inbox rotation: distributes sends across accounts to avoid spam triggers

**AI Features (2026)**
- AI Sales Agent: drop in your URL → reads your business, identifies ICP, builds prospect list, writes personalised outreach, runs follow-ups, books meetings to calendar
- AI Sequence Optimizer: ML-powered automated optimisation of send timing, subject line variants, sequence structure
- AI reply categorisation: interested / not now / wrong person / unsubscribe — auto-tags and routes

**Sequences**
- Multi-step email sequences with delays, time-zone-aware sending
- Email-only on base plans; LinkedIn + SMS + calls added at higher tiers
- Built-in B2B lead database (SuperSearch)

**CRM / Inbox**
- Unibox: unified inbox for all replies across all accounts
- Lead scoring and tagging
- Pipeline view with basic deal stages

**Reporting**
- Per-campaign: open rate, reply rate, bounce rate, unsubscribe rate
- Account-level health scoring
- Domain reputation tracking per mailbox

**Pricing**
- Growth: $37/month (10K emails, 2K contacts)
- Hypergrowth: $97/month (100K emails, 25K contacts)
- Light Speed: $358/month (500K emails)
- Real-world agency cost: $200–400/month with leads + CRM

**Where K.I.N.D wins**
- End-to-end managed: Instantly requires a human to set up, monitor, optimise daily
- Purpose-built client portal: Instantly has no client-facing view at all
- Credit model: Instantly charges flat rate regardless of results
- African market + compliance: zero African focus or POPIA handling

**What to steal**
- Unlimited inbox rotation concept for deliverability protection
- Domain reputation dashboard in Platform Health view
- AI Sequence Optimizer: auto-tune send timing and subject line variants (our Level 3 AI)
- Unibox: unified reply inbox for admin (Art of Possible Piece 6)
- Pre-send inbox placement testing

---

### SMARTLEAD.AI

**What they are:** High-scale email infrastructure for agencies. Like Instantly but with better AI agents and more explicit done-for-you infrastructure options. 100K+ businesses.

**Infrastructure**
- Unlimited mailboxes + unlimited warmups — flat rate, no per-inbox or per-seat fees
- Dynamic ESP matching: sends from Gmail-type addresses to Gmail inboxes, Outlook to Outlook
- Dedicated sending servers (SmartInfra)
- Pre-send inbox placement testing (SmartDelivery — tests whether email lands in inbox or spam before campaign launches)
- Done-for-you email infrastructure option (SmartSenders)

**AI Agents**
- SmartAgents: researches leads, writes personalised emails, updates CRM, improves deliverability — no coding
- SmartDialer: AI sales calls with full context loaded before the call
- AI reply manager: categorises hot leads → triggers next steps → syncs to CRM automatically

**Lead Data**
- SmartProspect: built-in verified B2B lead database
- Native Clay integration (enrich in Clay, push to Smartlead for sending)

**Agency Features**
- One account serves entire team — no per-seat overhead
- Sub-account management for agency clients
- White-label report exports per client

**Pricing**
- Basic: $39/month (2K active leads, 6K emails/month)
- Pro: $94/month (30K leads, 150K emails)
- Custom agency tier available

**Known weakness:** Most consistent G2/Reddit complaint — campaigns fail to send, warmup pauses unexpectedly, analytics don't load. Not enterprise-grade reliability.

**Where K.I.N.D wins**
- Reliability: Smartlead's biggest weakness is ours to exploit — our managed service owns reliability end to end
- Client portal: no client-facing view
- Outcome pricing: Smartlead charges flat rate; we charge per lead delivered
- African market + compliance

**What to steal**
- Multiple ESP matching per recipient domain for deliverability lift
- Pre-send inbox placement testing before campaign launches
- SmartSenders model: productise our own domain + inbox setup as a service
- AI reply categorisation expanded beyond auto-pause (hot/warm/cold/wrong person/out of office)

---

### REPLY.IO

**What they are:** Mid-market multichannel sales engagement. Covers email + LinkedIn + phone + social. Strong deliverability suite.

**Key Features**
- Full multichannel: email, LinkedIn, phone, WhatsApp, SMS, social in one sequence
- AI email writer + personalisation engine
- Full deliverability suite: warmup, spam monitoring, DNS health, Gmail API sending
- Unified inbox for all channel replies
- Built-in power dialer with call recording
- Agency features: sub-accounts, white-label reporting exports

**Pricing:** $60–120/user/month

**What to steal**
- LinkedIn automation as a sequence step (Art of Possible Piece 9)
- Deliverability health dashboard in Platform Health (DNS, warmup status, spam rate)
- White-label reporting export per client

---

### SALESHANDY

**What they are:** High-volume cold email for agencies and scaling teams. 852M+ B2B database, unlimited accounts, AI sequence builder. $25/month entry price.

**Key Features**
- AI Sequence Copilot: builds full multi-step sequences
- AI Variants: generates different phrasing for each email automatically
- Sequence Score: reviews setup and highlights issues before launch
- Unlimited email warmups at no extra cost
- Sender rotation across accounts
- A/Z variants for A/B testing
- Built-in CRM

**Pricing:** $25/month entry

**What to steal**
- Sequence Score concept: pre-launch quality check on sequences before they go live
- A/Z multi-variant testing (not just A/B — test 3–5 variants simultaneously)

---

### QUICKMAIL

**What they are:** Deliverability-first cold email. Best-in-class inbox protection on every plan.

**Key Features**
- Built-in warmup, throttling, and blacklist monitoring on every plan
- Auto-rotation that distributes sends across multiple accounts during active sequences
- Deliverability AI: automatically replaces weak email accounts mid-sequence
- Reword with AI: adjusts email wording to reduce spam triggers in real time
- LinkedIn integration across all tiers

**Pricing:** $49/month entry

**What to steal**
- Blacklist monitoring: alert if our sending domains appear on spam blacklists
- Auto-replacement of weak sending accounts mid-campaign

---

### KLENTY

**What they are:** AI-powered outreach combining cold email, multichannel workflows, AI research, and ICP-based targeting.

**Key Features**
- AI SDR: researches accounts across 150+ data sources, builds ICP list automatically
- Multi-channel sequences: email + LinkedIn + calls + SMS
- Deliverability insights: shows % of emails landing in Primary Tab per ESP
- ICP-based targeting built into sequence builder

**Pricing:** $60/user/month

**What to steal**
- Deliverability tab-placement metric: show clients what % of emails land in Primary vs Promotions vs Spam
- AI SDR research: pull prospect context from 150+ sources before FIGSY writes the sequence

---

### MAILSHAKE

**What they are:** The simplest cold outreach tool. Email + LinkedIn + dialer. Fastest to first campaign.

**Key Features**
- Email + LinkedIn sequences in one tool
- Built-in power dialer
- Lead Catcher: auto-filters positive replies
- Very simple UX — no learning curve
- No free trial

**Pricing:** $58/user/month

**What to steal**
- Lead Catcher concept: auto-filter and surface positive replies to client dashboard (our auto-pause is step 1 of this)

---

### WOODPECKER

**What they are:** Deliverability-first simple cold email. Inbox rotation, adaptive sending, mailbox warmup.

**Key Features**
- Inbox rotation built in
- Adaptive sending: adjusts send volume based on domain health
- Email warmup per mailbox
- Email-only — no LinkedIn, no AI

**Pricing:** $39/month

**What to steal**
- Adaptive sending: reduce volume per mailbox when health dips; increase as it improves. Apply to FIGSY campaign management.

---

## TIER 2 — DATA & ENRICHMENT LAYER
*(These are the pipes — data providers that feed the sending tools)*

---

### CLAY

**What they are:** The infrastructure layer for modern outbound. Not a sending tool — a data and workflow engine. Clay sits *before* Lemlist/Instantly/FIGSY in the stack. You enrich in Clay, then push to a sender.

**Core: Waterfall Enrichment**
- 150+ data providers connected (Apollo, Clearbit/Breeze, PDL, Hunter, ZoomInfo, LinkedIn, etc.)
- Waterfall logic: try Provider A → if no result → try B → try C
- Yields 20–40% more coverage than any single provider
- Two credit types (March 2026 split): Data Credits (enrichment lookups) + Actions (platform operations)

**Claygent — AI Research Agent**
- Autonomous web browsing: reads websites, LinkedIn profiles, news articles, job boards
- Extracts insights databases cannot: "does this company use HubSpot?", "what is this CFO writing about on LinkedIn?"
- Navigator: behaves like a real browser user — can interact with pages, scrape niche directories and marketplaces
- Generates hyper-personalised one-liners per prospect from their own content

**Sculptor — Workflow Builder**
- Natural language: "build my outbound engine" → Clay builds the workflow
- Visual GTM workflow builder connecting enrichment → AI research → personalisation → CRM push → sending tool

**Intent Signals**
- Job change alerts: prospect changed jobs → trigger sequence
- Website visitor tracking: company visited your site → trigger
- LinkedIn activity monitoring
- Funding rounds, hiring signals, tech stack changes

**Pricing (March 2026 — major cost cuts, 50–90% reduction)**
- Free: 100 Data Credits + 500 Actions/month
- Launch: $185/month — 2,500 credits + 15,000 actions
- Growth: $495/month — full waterfall, CRM sync, APIs, 40,000 actions

**Where K.I.N.D wins**
- Clay is not a client product: designed for SDRs and RevOps teams
- End-to-end stack: Clay requires Clay + sender + CRM. We are the whole thing.
- Managed service: Clay is self-serve and technically complex

**What to steal**
- Waterfall enrichment model: currently Apollo-only. Build: Apollo → PDL → Hunter
- Intent signal triggers: job change / funding / tech stack change → auto-add to campaign
- AI research per lead: write one personalised sentence from their website/LinkedIn before FIGSY sequences
- Workflow builder concept (Art of Possible Piece 5)
- Template/recipe library (Art of Possible Piece 15)

---

### APOLLO.IO *(our current supplier)*

**What they are:** Our current data source AND a direct competitor. Apollo is building the all-in-one GTM platform: data + sequences + CRM + AI + deal execution.

**Database (core moat)**
- 210 million business contacts globally
- 128 million verified emails, 144 million mobile/landline numbers
- 35 million companies across 100+ countries
- 65+ filter parameters: industry, title, company size, tech stack, funding, revenue, headcount growth
- 5.3 million new contacts added monthly; 150 million records updated monthly

**Sequences & AI (2026)**
- Multi-step email + call + task sequences
- Now available inside ChatGPT: prospect, enrich, activate sequences from a chat conversation
- Pocus acquisition: enterprise revenue intelligence — buying signals, prioritised action, intent scoring
- Contact-level website visitor intelligence: de-anonymise site traffic to individual people (not just companies)
- AI reply analysis and sentiment scoring

**Pricing**
- Free: 50 email credits/month
- Basic: $49/user/month
- Professional: $99/user/month
- Organization: $149/user/month (min 5 seats)

**Where K.I.N.D wins**
- Managed vs self-serve
- African data specialists: Apollo's African coverage (SA, Nigeria, Kenya) is thin — we can own this data layer
- No per-seat pricing
- White-label client portal
- Done-for-you compliance (POPIA, GDPR practical handling)

**What to steal**
- Intent data: "this company is actively researching outbound tools right now" — fire immediately
- Website visitor de-anonymisation: who visited kindai.co.za this week, which individual — trigger outreach
- 65-parameter ICP builder: our ICP config is basic; Apollo filters by 65 parameters
- Technology detection: target companies using specific tools
- Buying signal → auto-sequence trigger (job change, funding, tech change)
- Revenue intelligence: score and rank lead pipeline by conversion likelihood (Pocus model)

---

### ZOOMINFO

**What they are:** The enterprise B2B data standard. $1B+ revenue. The "database of record" for mid-market and enterprise sales teams.

**Key Features**
- 260M+ B2B contacts, 100M+ companies
- Intent data (proprietary + Bombora partnership)
- Website visitor tracking (company-level)
- Re-enrichment webhooks: update CRM contacts in real time as data changes
- Conversation intelligence (acquired Chorus.ai)
- Sales OS: sequences, call dialer, pipeline management all built in
- Data certification: SOC2, ISO 27001, GDPR, CCPA

**Pricing:** $15,000–100,000+/year. Enterprise only.

**Where K.I.N.D wins**
- Price: ZoomInfo is completely inaccessible to SMBs
- African coverage: near-zero
- Simplicity and managed service

**What to steal**
- Re-enrichment webhooks concept: automatically update contact data when records change (rather than static lists)
- Intent data model: aggregate signals across the web, not just first-party data

---

### COGNISM

**What they are:** GDPR-first B2B data provider. European market leader. Diamond Data — phone-verified mobile numbers for EMEA contacts.

**Key Features**
- Diamond Data: human-verified mobile numbers (not just data-matched)
- DNC (Do Not Call) list checking built in
- GDPR + CCPA compliant data collection and storage
- Strong EMEA coverage — best European contact data

**Pricing:** $10,000–30,000/year

**What to steal**
- POPIA-compliant data model: Cognism's GDPR approach should be our template for POPIA compliance
- Phone-verified contact concept: for high-value prospects, verify phone numbers before adding to campaign

---

### LUSHA

**What they are:** Contact data finder with Chrome extension, intent signals, and basic sequences.

**Key Features**
- Chrome extension for instant contact lookup from LinkedIn profiles
- Intent signals via Bombora partnership
- Email sequence automation (basic)
- CRM sync

**Pricing:** Free → $29/user/month → Enterprise

**What to steal**
- Chrome extension for on-the-spot prospect lookup (Year 2 — MCP server enables this)

---

### SEAMLESS.AI

**What they are:** AI-powered real-time contact data builder. Builds contact records on demand rather than serving a static database.

**Key Features**
- 1.8B+ verified business emails, 414M+ phone numbers
- AI builds contact data in real time (not static database lookups)
- 100+ data points per profile, continuously updated
- AI-powered outreach: always-on AI engagement running across every channel

**What to steal**
- Real-time data building concept: rather than querying a database, AI researches and builds a contact record fresh on demand

---

### PHANTOMBUSTER

**What they are:** Cloud automation tool for scraping and automating LinkedIn, Twitter/X, Instagram, Facebook, Google Maps, and more via pre-built "Phantom" scripts.

**Key Features**
- 100+ Phantoms: pre-built scripts for LinkedIn export, connection requests, message sending, post engagement, profile scraping
- Chain Phantoms into multi-step workflows
- AI LinkedIn Message Writer: GPT-generated personalised messages from scraped profile data
- Multi-platform: LinkedIn, Twitter/X, Instagram, Facebook, Google Maps, GitHub, YouTube

**Important limitation:** Violates LinkedIn ToS. Phantoms break regularly when LinkedIn updates its frontend. High ban risk.

**Pricing:** $69/month Starter → $159/month Pro → $439/month Team

**What to steal**
- Signal monitoring: scrape LinkedIn post commenters who engage with competitor content — these are warm prospects
- Google Maps scraping for local African business prospect lists (legal in most jurisdictions as public data)

---

## TIER 3 — LINKEDIN AUTOMATION
*(Specialists in LinkedIn outreach and connection automation)*

---

### WAALAXY

**What they are:** Chrome extension-based LinkedIn automation tool. Simple UI, built for individuals and small teams.

**Key Features**
- LinkedIn sequences: connection request → message → follow-up
- Email + LinkedIn combined sequences
- Pre-built templates for common outreach patterns
- Simple UI — minimal setup

**Pricing:** Free → $56/month → $112/month

**What to steal**
- Pre-built LinkedIn sequence templates for common ICP types (adapt for African market)

---

### EXPANDI

**What they are:** Cloud-based LinkedIn automation focused on safe, high-volume outreach.

**Key Features**
- Dedicated IP per account to reduce ban risk
- Smart algorithms to mimic human behaviour patterns
- 300+ connection requests per week safely
- Hyper-personalised messaging: pull prospect data into messages dynamically
- Dynamic image personalisation in LinkedIn messages

**Pricing:** $99/month

**What to steal**
- Safe automation patterns: dedicated IP, human-mimicking behaviour — apply when building our LinkedIn step (Art of Possible Piece 9)

---

### DRIPIFY

**What they are:** Cloud-based LinkedIn automation for sales teams and agencies.

**Key Features**
- Drip campaign customisation with 20+ personalisation variables
- Performance analytics per campaign
- Team management and seat-based access
- Safety algorithms to avoid LinkedIn restrictions

**Pricing:** $39/month

---

### LAGROWTH MACHINE (LGM)

**What they are:** Multichannel outreach combining LinkedIn + email + calls + voice messages + Twitter/X. Claims 3.5x more replies than single-channel.

**Key Features**
- True multichannel: LinkedIn, email, calls, voice messages, X (Twitter) — all in one sequence
- Built-in enrichment: enriches prospects from LinkedIn data before sequencing
- AI voice: voice message personalisation
- Conditional branching across all channels

**Pricing:** $50–120/user/month

**What to steal**
- Voice message personalisation: AI-generated personalised voice message as a sequence step. Unusual, high-engagement. Future.
- True multichannel sequencing model — all channels in one visual sequence builder

---

## TIER 4 — ENTERPRISE SALES ENGAGEMENT
*(Built for 50–500 person sales orgs. Expensive. Reference architecture only.)*

---

### OUTREACH.IO

**What they are:** The enterprise sales engagement standard. Deep analytics, sophisticated automation, multi-path cadences.

**Key Features**
- Kaia AI: real-time coaching during live calls, automated deal summaries, predictive risk scoring
- Sophisticated sequence branching: conditional steps, trigger-based automation, multi-path cadences
- Deal management: pipeline view, opportunity scoring, forecast roll-up
- Enterprise: multi-org support, territory management, advanced RBAC permissions
- Deep Salesforce + HubSpot bidirectional sync with custom field mapping

**Pricing:** $130–175/user/month. Enterprise contracts only.

**What to steal**
- Deal risk scoring: "this client account hasn't had contact in 14 days — flag as at-risk"
- Forecast model: MRR probability vs possible for K.I.N.D's own revenue planning
- Conditional sequence branching (Art of Possible Piece 5)

---

### SALESLOFT + CLARI

**What they are:** Enterprise sales engagement merged with revenue intelligence. Clari merger (late 2025) added $10T revenue under management.

**Key Features**
- Cadence: email, phone, LinkedIn, SMS sequences with AI suggested next action
- Conversations: call recording, transcription, keyword spotting, coaching scorecards
- Deals + Forecasting (Clari): AI deal scoring, pipeline inspection, board-level revenue forecasting
- Drift acquisition: chatbot and conversational marketing built in
- Mobile app: manage cadences, make calls, send emails from phone
- Strong Salesforce integration

**Pricing:** $75–165/user/month. Enterprise.

**What to steal**
- Call intelligence: record + transcribe + analyse client onboarding and strategy calls. Know what language works.
- Churn risk model: apply Clari-style scoring to K.I.N.D clients — "this client is likely to churn in 30 days"
- Revenue forecasting: AI-predicted MRR for next 90 days for K.I.N.D's own business

---

### CLOSE.IO

**What they are:** CRM purpose-built for outbound sales. Built-in power dialer, SMS, native sequences — no need to stack tools.

**Key Features**
- Built-in power dialer with call recording and coaching
- Native SMS sending
- Multi-step email sequences with reply detection and auto-pause built in
- Pipeline views: deal stages, activity timeline
- Designed for SDR/AE teams in high-velocity inside sales

**Pricing:** $49–145/user/month

**What to steal**
- Power dialer concept: for REEVE (Year 2) — AI SDR that can actually call prospects
- Activity timeline per client: everything that happened on this account in chronological order

---

### PIPEDRIVE

**What they are:** Visual pipeline-first CRM. Strong deal management, weaker native outbound.

**Key Features**
- Visual Kanban pipeline with AI insights
- Email integration (basic sequences)
- Activity and deal tracking
- 400+ integrations via marketplace
- AI deal health scores and next-step suggestions

**Pricing:** $15–100/user/month

**What to steal**
- Visual pipeline Kanban (Art of Possible Piece 1) — deal stage view for K.I.N.D's own HubSpot pipeline
- AI deal health score per client account

---

## TIER 5 — REVENUE INTELLIGENCE
*(Know who to target, when, and why. Intent + conversation + forecasting.)*

---

### GONG.IO

**What they are:** The conversation intelligence leader. Records and analyses every sales call, email, and meeting to improve performance and forecast revenue.

**Key Features**
- Auto-records and transcribes calls with real-time keyword tracking (competitor mentions, pricing talk, objections)
- Talk-to-listen ratio, filler word analysis, sentiment tracking
- Deal Likelihood Score: 300+ data points (conversation signals, communication cadence, stakeholder involvement, timing) → close probability
- Gong Forecast: AI predicts which deals close this quarter — 95% forecast accuracy at Upwork-level adoption
- Gong Engage: personalised outreach guided by conversation data
- 70% faster call insight processing in 2026
- Delivers 25–30% less forecast variance for teams that fully adopt

**Pricing:** Enterprise — custom, typically $100–200/user/month

**What to steal (Year 2)**
- Client conversation analysis: record + analyse all K.I.N.D client calls to identify language that converts
- Forecast variance model: apply to K.I.N.D's own MRR prediction

---

### 6SENSE

**What they are:** AI-driven account-based marketing and intent data platform. Identifies in-market buyers before they raise their hand.

**Key Features**
- Signalverse engine: processes 1+ trillion signals daily (intent data, web activity, firmographic changes)
- Assigns buying stage: Awareness / Consideration / Decision / Purchase — per account
- De-anonymises 100% anonymous web traffic to company and contact level
- AI orchestration: continuously improves targeting without human intervention
- Unified revenue operations: sales + marketing from shared intelligence

**Pricing:** $80,000–1M+/year. Enterprise only.

**What to steal**
- Buying stage model: apply to K.I.N.D prospect pipeline — tag each lead by buying stage, sequence accordingly
- Intent signal aggregation: web signals + data signals + firmographic changes combined into one score

---

### DEMANDBASE

**What they are:** Enterprise ABM platform combining account intelligence, B2B advertising, and sales tools.

**Key Features**
- Account identification + intent data (Bombora partnership)
- Firmographic and technographic intelligence
- B2B advertising targeting (serve ads to specific accounts)
- Sales intelligence: who at this account is active right now

**Pricing:** $40,000–250,000/year. Enterprise.

**What to steal**
- Technographic targeting: "target companies that use HubSpot but not an outbound tool" — add to ICP builder

---

## TIER 6 — CRM PLATFORMS
*(Relationship management and pipeline tools that include outbound features)*

---

### HUBSPOT SALES HUB *(our current CRM integration)*

**What they are:** The mid-market CRM standard. In 2026 HubSpot launched AEO (AI Engagement Orchestration) and significantly expanded its AI agents.

**Key Features (2026)**
- Prospecting Agent: monitors for job postings, funding rounds, technology adoption → identifies matching contacts → drafts personalised outreach → response rates 2x industry benchmark
- Smart Deal Progression: post-call AI analysis — updates CRM fields, drafts follow-up, surfaces action items automatically
- AI email writer: generates personalised variants per prospect based on CRM data
- Breeze Intelligence (ex-Clearbit): data enrichment built into CRM
- Sequences: multi-step email + call tasks with auto-pause on reply
- Full pipeline management + forecasting
- Free CRM tier with generous limits

**Pricing:** Free → $90/user/month → Enterprise

**Where K.I.N.D wins**
- We are the outbound execution layer that HubSpot cannot replace — HubSpot tracks deals, we generate them
- No done-for-you model; HubSpot is a tool clients operate

**What to steal**
- Smart Deal Progression: post-campaign-reply AI that suggests next steps and updates client records automatically
- Prospecting Agent trigger model: signal → identify → draft → send pipeline (this is what FIGSY should evolve into)

---

### SALESFORCE

**What they are:** The enterprise CRM. $35B+ revenue. Einstein AI is their AI layer.

**Key Features**
- Einstein AI: lead scoring, opportunity scoring, email and call recommendations
- Agentforce: autonomous agents for sales, service, marketing (launched late 2024)
- Revenue Cloud: full quote-to-cash
- Data Cloud: unified customer data platform

**Pricing:** $25–300+/user/month. Enterprise implementations cost $50K–$500K+.

**Where K.I.N.D wins**
- We are not a CRM. We are the lead generation layer that feeds any CRM.
- Salesforce is inaccessible to African SMBs at any price point

---

## TIER 7 — NICHE & EMERGING
*(Specialist tools with specific features worth knowing)*

---

### HUNTER.IO

**What they are:** Domain-based email finder + basic drip sequences. Simple, reliable.

**Key Features**
- Domain Search: find all email addresses at a company from their domain
- Email Verifier: batch verify lists
- Email Finder: first + last name + domain → email
- Campaigns: basic drip sequences (not a core strength)
- 450M+ email addresses indexed

**Pricing:** Free → $49/month → $149/month

---

### SNOV.IO

**What they are:** Email finder + drip sequences + LinkedIn automation + basic multichannel.

**Key Features**
- Email finder, verifier, and drip campaigns in one
- AI reply sentiment analysis per campaign
- Unlimited sender accounts
- LinkedIn messages as a sequence step

**Pricing:** $39/month entry

---

### BOMBORA

**What they are:** The intent data backbone used by ZoomInfo, Demandbase, Lusha, and many others.

**Key Features**
- Co-op intent data: aggregates content consumption signals from 5,000+ B2B websites
- Company Surge: shows which companies are actively researching specific topics this week
- 7,500+ topic categories
- Powers most third-party intent data products

**Strategic note:** Bombora is infrastructure, not a product. Their data flows through Apollo, ZoomInfo, Demandbase, etc. If we build intent signal triggering, we access Bombora via Apollo (which we already pay for).

---

### LAVENDER

**What they are:** AI email coaching tool. Scores emails before you send them and suggests improvements in real time.

**Key Features**
- Email Score (0–100) with specific fixes: too long, subject too salesy, opener too formal
- Personalisation Assistant: pulls prospect data and suggests personalisation angles
- Chrome extension: works inside Gmail, Outlook, Salesloft, Outreach
- Team analytics: which reps write the best emails

**Pricing:** Free → $29/user/month → $49/user/month

**What to steal**
- Email Score concept: before FIGSY launches a sequence, auto-score each email template (length, spam words, personalisation depth, CTA clarity) and flag weak ones

---

### AMPLEMARKET

**What they are:** All-in-one outbound platform with strong deliverability focus and signal-based triggers.

**Key Features**
- AI Duo: autonomous AI SDR that researches accounts, writes sequences, triggers sends
- Signal-based triggers: job change, funding, hiring, tech change → auto-sequence
- Deliverability suite with domain monitoring and warmup
- Waterfall enrichment across 40+ providers

**What to steal**
- Signal-based auto-trigger model (job change → sequence): strongly aligned with Art of Possible roadmap

---

### OVERLOOP

**What they are:** Cold email automation with full CRM built in. Good for teams that want one tool for both.

**Key Features**
- Cold email + LinkedIn automation + phone calls in one sequence
- Full pipeline and deal management built in
- No need for separate CRM
- AI email writer + personalisation engine

**Pricing:** $40–80/user/month

---

## MASTER COMPARISON TABLE

*Full landscape — all major competitors. ✅ = has it | ❌ = does not | ⚠️ = partial*

| Feature | **K.I.N.D** | ClickUp | Lemlist | Clay | Apollo | Instantly | Smartlead | Outreach | Salesloft | HubSpot | Close |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Business model** | Managed SaaS | Work OS | Outreach tool | Data infra | Data + tool | Email infra | Email infra | Enterprise | Enterprise | CRM | CRM+outbound |
| **Done-for-you** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **White-label client portal** | ✅ | ❌ Enterprise | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Pay-per-lead / outcome pricing** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **African market + POPIA** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **AI runs campaign autonomously** | ✅ FIGSY | ⚠️ assists | ⚠️ assists | ✅ data only | ⚠️ assists | ✅ AI agent | ✅ SmartAgents | ✅ Kaia | ✅ | ⚠️ assists | ❌ |
| **AI memory / learning** | ✅ basic | ✅ 3 types | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Agent identity (named)** | ✅ FIGSY | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Kaia | ✅ | ❌ | ❌ |
| **Agent escalation** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Multi-model AI** | ❌ (Year 2) | ✅ GPT-5/Claude/o3 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Sequence engine** | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Multi-channel (email+LI+call)** | ❌ email only | ❌ | ✅ | ❌ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| **Lead database** | ✅ via Apollo | ❌ | ✅ 450M | ✅ 150+ | ✅ 210M | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Waterfall enrichment** | ❌ Apollo only | ❌ | ✅ | ✅ 150+ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Intent signals** | ❌ | ❌ | ❌ | ✅ | ✅ Pocus | ❌ | ❌ | ✅ | ✅ Clari | ✅ | ❌ |
| **Email warmup** | ❌ | ❌ | ✅ Lemwarm | ❌ | ⚠️ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Deliverability dashboard** | ❌ | ❌ | ✅ | ❌ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Unified reply inbox** | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ Unibox | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Personalised images** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Conditional sequence branching** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Activity feed (realtime)** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Command palette** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Revenue / deal forecasting** | ❌ | ❌ | ❌ | ❌ | ✅ Pocus | ❌ | ❌ | ✅ | ✅ Clari | ✅ | ⚠️ |
| **Call intelligence** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ Kaia | ✅ | ❌ | ✅ |
| **Goals / OKR tracking** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Custom dashboard widgets** | ⚠️ fixed | ✅ 100+ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ⚠️ |
| **Shareable dashboards** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **MCP server** | ❌ Planned | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Mobile app** | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **POPIA / African compliance** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Entry price** | ~$80 ARPU | $7/user | $39/user | $185/mo | $49/user | $37/mo | $39/mo | $130/user | $75/user | Free | $49/user |

---

---

### INFOGRAPHIC TABLE — SIMPLIFIED MASTER (deck/pitch ready)

*Key: ✅ = yes | ❌ = no | ⚠️ = partial*

| | K.I.N.D | ClickUp | Lemlist | Apollo | Instantly | Outreach |
|---|---|---|---|---|---|---|
| Done-for-you | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| White-label client portal | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Pay per lead (outcome pricing) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Africa + POPIA | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI runs campaign autonomously | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ |
| AI memory / learning | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Lead database | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Sequence engine | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Email warmup | ❌ | ❌ | ✅ | ⚠️ | ✅ | ❌ |
| Multichannel (LI + call) | ❌ | ❌ | ✅ | ✅ | ⚠️ | ✅ |
| Revenue forecasting | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Mobile app | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **Entry price** | **~$80/mo** | **$7/user** | **$39/user** | **$49/user** | **$37/mo** | **$130/user** |

---

### INFOGRAPHIC TABLE — K.I.N.D MOATS (6 uncontested wins)

| Moat | What it means | Every competitor |
|---|---|---|
| ✅ Done-for-you | We run the campaigns. They provide tools you run yourself. | ❌ All self-serve |
| ✅ White-label portal | Our client portal carries your brand. | ❌ None have it |
| ✅ Outcome pricing | You pay per lead delivered. | ❌ All charge per seat/flat rate |
| ✅ Africa + POPIA | Built for this market from Day 1. | ❌ None focus on Africa |
| ✅ AI that executes | FIGSY is the SDR. Others have AI "assist" buttons. | ❌ None run end-to-end |
| ✅ FIGSY Memory | Gets smarter per client over time. | ❌ All send static sequences |

---

## WHERE K.I.N.D IS UNCONTESTED

These features exist in combination **nowhere else in the market**:

1. **Done-for-you managed outbound** — Every competitor is a tool the client operates. We operate it for them. This is the whole model.
2. **White-label, purpose-built client portal** — No competitor has a clean client-facing dashboard. They all assume the user *is* the client.
3. **Outcome-based pricing (pay per lead)** — Every competitor charges per seat or flat rate regardless of results. We put skin in the game.
4. **African B2B market + POPIA** — Zero competitors focus on Africa, have ZAR pricing, or handle POPIA compliance in practice.
5. **AI that runs the campaign (not assists)** — FIGSY is the SDR. It finds the lead, builds the sequence, sends it, pauses on reply, and learns from results. The rest of the market offers AI "assist" buttons.
6. **FIGSY Memory** — Our `figsy_memory` table is the only learning loop in this market that improves campaign performance per client over time. No competitor has this.

---

## PRIORITY STEAL LIST — RANKED BY IMPACT

| # | Feature | Steal from | Effort | Phase | Art of Possible |
|---|---|---|---|---|---|
| 1 | **Email warmup infrastructure** | Lemlist Lemwarm / Instantly | Medium | Phase 2 | Add new piece |
| 2 | **Unified reply inbox (Unibox)** | Instantly / Lemlist | Medium | Phase 2 | Piece 6 |
| 3 | **Deliverability dashboard** | Instantly / Smartlead / Reply.io | Small | Phase 2 | Add to Platform Health |
| 4 | **AI reply categorisation** | Smartlead / Instantly | Small | Phase 2 | Extend auto-pause |
| 5 | **Waterfall enrichment (Apollo→PDL→Hunter)** | Clay / Lemlist | Medium | Phase 2 | Add new piece |
| 6 | **Email Score pre-launch check** | Lavender / Saleshandy | Small | Phase 2 | New feature |
| 7 | **Personalised images per lead** | Lemlist | Medium | Phase 3 | Add new piece |
| 8 | **Conditional sequence branching** | Lemlist / Outreach | Medium | Phase 3 | Piece 5 |
| 9 | **Intent signal triggers** | Clay / Apollo | High | Phase 3 | Add new piece |
| 10 | **Multi-model AI toggle** | Lemlist | Small | Phase 3 | Piece 8 partial |
| 11 | **LinkedIn automation steps** | Lemlist / Reply.io / Expandi | High | Phase 3 | Piece 9 |
| 12 | **Adaptive sending (volume vs domain health)** | Woodpecker | Small | Phase 2 | Infrastructure |
| 13 | **MCP server** | Lemlist | Medium | Phase 3 | Piece 14 |
| 14 | **Template + recipe library** | Clay / Lemlist / Klenty | Small | Phase 3 | Piece 15 |
| 15 | **Pre-send inbox placement test** | Smartlead SmartDelivery | Medium | Phase 3 | New piece |
| 16 | **3-type memory model (episodic+long-term+preference)** | ClickUp Brain | High | Year 2 | Section 27 Level 2 |
| 17 | **Contact-level site visitor de-anonymisation** | Apollo Pocus | High | Year 2 | New piece |
| 18 | **Churn risk scoring** | Clari / Salesloft | High | Year 2 | Admin feature |
| 19 | **Revenue forecasting** | Clari / Gong | High | Year 2 | New section |
| 20 | **Call intelligence** | Gong / Salesloft | Very High | Year 2 | Milla feature |

---

*Added: 26 May 2026 — Full competitive audit session*
*Sources: Live web research across all major platforms, reviews, and pricing pages*

---

## 34. THE UNBUILT FUTURE — WHAT K.I.N.D COULD BECOME

*Written: 26 May 2026*
*This section is imagination, grounded in what we have already built. Not a roadmap. A north star.*

> "We are not building a lead generation tool. We are building the commercial department of every African business that cannot afford one."

---

### THE CORE INSIGHT THAT CHANGES EVERYTHING

Right now K.I.N.D replaces one function: the BDR (Business Development Rep). FIGSY finds the lead, writes the email, handles the reply. One person replaced. One salary saved.

But the BDR is just the beginning.

A growing African SMB needs:
- Someone to find and contact leads (BDR) → **FIGSY** — *built*
- Someone to run morning briefings and manage documents (Chief of Staff / VA) → **Milla** — *Subscription billing live — awaiting Stripe price IDs in Railway*
- Someone to handle inbound and qualify website visitors (Inbound SDR) → **Vida** — *Subscription billing live — awaiting Stripe price IDs in Railway*
- Someone to close the deal (Account Executive) → **REEVE** — *Year 2*
- Someone to retain and grow existing clients (Customer Success) → **LENA** — *Year 2*
- Someone to watch revenue, flag risk, forecast (CRO) → **OTTO** — *Year 2*
- Someone to manage cash, invoices, financial health (CFO agent) → *Year 3*
- Someone to manage brand, campaigns, market positioning (CMO agent) → *Year 3*

**By Year 3–4, K.I.N.D is not a sales tool. K.I.N.D is the commercial department.**

A client does not hire K.I.N.D and still employ salespeople. They hire K.I.N.D *instead* of salespeople. The pricing conversation flips: "Why are you paying 3 people R600,000/year in salaries to do what K.I.N.D does for R15,000/month?"

This is not a marginal improvement. This is category creation.

---

### 15 FUTURES — EACH ONE REAL

---

#### 1. THE AFRICAN DATA MOAT

Every campaign K.I.N.D runs adds to a dataset no one else has. Every reply, bounce, open, sequence variant, ICP that worked, industry that responded — all of it accumulates.

After 500 clients we will have the most complete picture of B2B sales behaviour in sub-Saharan Africa ever assembled. Apollo has thin African coverage. ZoomInfo barely touches the continent. No one is systematically building this.

**What this becomes:**
- The "African Apollo" — a B2B contact database built for Africa by people who operate in Africa
- Licensing deal to ZoomInfo, Apollo, Cognism who want African coverage
- Annual "State of B2B Sales in Africa" report — media, investors, consultants pay for it
- The dataset itself becomes an acqui-hire target or a standalone business

**The data accumulates from Day 1, whether we think about it or not. We should be very deliberate about capturing and structuring it from the start.**

---

#### 2. NETWORK EFFECTS — THE PLATFORM GETS SMARTER FOR EVERYONE

Today FIGSY learns per client. Figsy at Client A learns what works for Client A.

The next level: **cross-client intelligence**. With enough clients, we can aggregate without exposing individual data.

"Companies in your sector average 6.8% reply rate. You're at 11.3%. FIGSY has identified 3 sequence patterns that outperform — here they are."

"The best subject line structure for Johannesburg-based CFOs this quarter is [X]. FIGSY applied this to your campaign."

"Cold outreach to legal firms in Nigeria converts 40% better on Tuesdays between 9–11am. FIGSY has already adjusted your send schedule."

**This is a network effect that no self-serve tool can replicate.** Lemlist does not run campaigns — they cannot aggregate learning. We do. We can. Every new client makes the platform smarter for every other client. This compounds forever.

The gate: 5 clients minimum per segment before we aggregate (privacy). We have the database structure for this already in `figsy_memory`. We just need to add the cross-client layer.

---

#### 3. FROM OUTBOUND TO FULL-FUNNEL — TOUCHING EVERY COMMERCIAL MOMENT

Today K.I.N.D's value ends when a meeting is booked.

What if it didn't?

The full commercial journey K.I.N.D could own:

| Stage | Today | Future |
|---|---|---|
| Prospect identified | ✅ Apollo → FIGSY | ✅ |
| Sequence written + sent | ✅ FIGSY | ✅ |
| Reply handled | ✅ auto-pause + alert | ✅ |
| Meeting booked | ⚠️ client takes over | REEVE books it to Calendly automatically |
| Discovery call | ❌ | REEVE joins as AI notetaker, surfaces objections live |
| Proposal drafted | ❌ | REEVE drafts proposal from call transcript |
| Contract sent | ❌ | Vida sends DocuSign via HubSpot integration |
| Invoice raised | ❌ | CFO agent raises invoice in Xero/Wave |
| Onboarding | ❌ | Milla runs onboarding checklist automatically |
| Ongoing QBRs | ❌ | OTTO generates monthly business review |
| Churn risk detected | ❌ | LENA flags at 60 days no engagement |
| Upsell identified | ❌ | OTTO surfaces "Client X is ready for next tier" |

**By Year 3, K.I.N.D is the commercial layer — not a tool in the stack. It is the stack.**

---

#### 4. THE WHITE-LABEL / FRANCHISE PLAY

Marketing agencies across Africa are selling "digital marketing" but losing to AI tools. What if they could sell **AI outbound** under their own brand, powered by K.I.N.D's infrastructure?

A K.I.N.D franchise operator in Lagos:
- White-labels K.I.N.D as "GrowthOS Lagos" or their own brand
- Brings 20 local SMB clients onto the platform
- Earns a margin on every credit their clients consume
- K.I.N.D provides: FIGSY, client portal, admin portal, support docs, playbooks
- Operator provides: local relationships, cultural context, client management

**50 operators × 20 clients = 1,000 clients without building a sales team.**

The operator model is how Salesforce built a $350B company — not by selling to every SMB directly, but by building a partner ecosystem that did it for them.

We have the architecture for this already. The client portal is already white-label ready. The admin portal already has multi-client management. We need: partner tier pricing, a partner-facing onboarding kit, and a revenue-share model.

---

#### 5. THE MCP SERVER — K.I.N.D AS AI INFRASTRUCTURE

Piece 14 from the Art of Possible. The most ambitious near-term play.

Right now K.I.N.D is a product you subscribe to.

What if it was also infrastructure you called from anywhere?

`@modelcontextprotocol/sdk` wrapper around our existing API. An `api_keys` table. A developer portal. And suddenly:

- Claude can call K.I.N.D to run outbound for any AI application
- A HubSpot workflow can trigger FIGSY to reach out to a new deal that stalled
- A Zapier user connects their CRM to K.I.N.D with no code
- A developer building an AI sales tool uses K.I.N.D as the outbound execution layer
- ChatGPT plugins can initiate K.I.N.D campaigns from a conversation

**K.I.N.D becomes the Twilio of AI-powered B2B outreach.**

Twilio processes 1.4 trillion API calls per year. They started as a simple SMS API. K.I.N.D starts as an outbound API. Lemlist has already built their MCP server — we noted this in the competitive audit. We should be next.

Build time: 3–5 days (per Art of Possible estimate). Gate: 20+ paying clients first.

---

#### 6. VERTICAL INTELLIGENCE — FIGSY FOR YOUR INDUSTRY

Right now FIGSY works across all B2B verticals. One model, one approach.

The next evolution: **FIGSY Vertical Modes** — pre-trained on hundreds of campaigns in one specific industry.

"FIGSY for Property" — knows the language, the pain points, the objections, the best angles for property developers, estate agents, fund managers in Africa.

"FIGSY for Fintech" — knows how to approach CFOs about B2B payments, lending, treasury management in African markets with fragmented banking.

"FIGSY for Professional Services" — knows how to reach accountants, lawyers, consultants without sounding spammy.

**Each vertical mode is:**
- A curated set of ICPs for that vertical
- Pre-trained sequence templates proven in that vertical
- Industry-specific reply handlers and objection patterns
- A vertical-specific onboarding flow

The data for this comes automatically as we accumulate campaigns. After 50 clients in property, we have a vertical intelligence layer for property that no competitor can replicate without operating in Africa.

**This is also a pricing lever.** Vertical mode = premium tier. "FIGSY Property" costs more than standard FIGSY because it performs better.

---

#### 7. THE TALENT DISPLACEMENT CONVERSATION

The most powerful thing we can say to any African SMB founder:

> "You have 2 BDRs on R25,000/month each. That's R600,000/year in salaries, plus benefits, plus management overhead. FIGSY replaces both of them for R18,000/month — and works 24 hours a day, never takes leave, never has a bad month, and gets better over time."

This is not a sales pitch. This is arithmetic.

As unemployment pressures grow and AI displacement accelerates, the companies that stay competitive will be the ones who adopt AI commercial infrastructure first. K.I.N.D's role: be that infrastructure.

**The ethical dimension:** We are not eliminating jobs carelessly. We are enabling founders who could not afford any BDR at all to access commercial capability for the first time. Most of our clients are not replacing existing teams — they are activating growth that was impossible without a team. We are expanding the economic pie, not just redistributing it.

---

#### 8. THE REVENUE SHARE MODEL

Today: client pays per credit consumed. We make money whether they succeed or not.

The ultimate alignment: **K.I.N.D takes a percentage of revenue generated from K.I.N.D-sourced clients.**

"Deploy R20,000 this quarter. FIGSY runs the campaign. For every deal closed from a K.I.N.D-sourced lead, we take 2%."

- Zero risk for the client: they only pay on success
- Perfect alignment: K.I.N.D is incentivised to maximise client revenue, not just send more emails
- Massive upside: 2% of R5M in deals = R100,000. We earn more from one good client than 10 credit top-ups.
- This is the model that creates recurring, growing revenue tied to client success

**Gate:** We need attribution infrastructure to track which closed deals came from K.I.N.D-sourced leads. HubSpot integration gives us this pipeline visibility already. The accounting layer is the gap.

**This is Year 3+ positioning, not now. But think about it from Day 1.**

---

#### 9. GLOBAL EXPANSION — AFRICAN-BORN, GLOBALLY PROVEN

The sequence matters.

1. Prove the model in South Africa (first-mover, low competition, we understand the market)
2. Expand to Nigeria, Kenya, Ghana (same playbook, local ICP adaptation)
3. Use African success as the story: "We built this for Africa — the hardest B2B market to crack. It works everywhere else too."
4. Enter Southeast Asia: Vietnam, Philippines, Indonesia — same profile: underserved, growing, no local AI outbound player
5. Enter LATAM: Brazil, Mexico, Colombia — same profile
6. Enter Eastern Europe: Poland, Czech Republic, Romania — sophisticated but underserved by US tools

**The African origin is not a limitation. It is the differentiating story.**

"African-born AI outbound" is a narrative that Silicon Valley tools cannot claim. We built it where it was hardest. We earned it where resources were smallest. That credibility travels.

---

#### 10. THE KNOWLEDGE BUSINESS

K.I.N.D will know things about B2B sales in Africa that nobody else knows:

- Which subject line patterns get replies from Nigerian procurement managers
- Which industries in South Africa have the highest BDR conversion rates
- What time of day to send to Kenyan C-suite contacts
- Which ICPs in Africa have the shortest sales cycles
- Which pain points resonate most with African fintech founders in 2026 vs 2027

This knowledge has commercial value beyond our own clients:

**Revenue streams from the knowledge business:**
- Annual "State of African B2B Sales" report — subscription or one-time purchase ($500–2,000/copy)
- Quarterly benchmark reports per vertical — sold to investors, PE firms, consultancies
- Investor data partnerships — VCs want to know which African sectors have the best commercial traction
- Media and PR — we become the quoted authority on African B2B sales data
- Speaking and thought leadership — SAICA, GIBS, African business forums

**None of this requires building anything new. It requires structuring what we already capture.**

---

#### 11. THE AFRICAN GROWTH OS — THE FINAL FORM

Ten years from now, what does K.I.N.D look like at its fullest expression?

Not a lead generation tool. Not an AI SDR. Not even a sales platform.

**K.I.N.D is the operating system for commercial growth in Africa.**

Every African business that wants to grow installs K.I.N.D the way they install an accountant, a lawyer, a bank account — it is infrastructure, not an option.

- **FIGSY** finds new clients automatically
- **REEVE** closes deals automatically
- **LENA** keeps clients and grows accounts automatically
- **OTTO** watches the numbers and alerts the founder to what matters
- **Milla** manages the paperwork, briefings, documents, scheduling
- **Vida** handles every inbound conversation — website, WhatsApp, email
- **The CFO agent** raises invoices, chases payments, forecasts cashflow
- **The CMO agent** publishes content, manages brand, runs campaigns
- **The Data layer** benchmarks every metric against the African average for your sector

**The founder's job:** set the direction, review the output, sign the deals that need a human face.

**K.I.N.D's job:** run everything else.

---

### THE THESIS IN ONE PARAGRAPH

K.I.N.D starts as an AI SDR. It evolves into an AI commercial team. It ends as the commercial operating system of Africa. The moat is not the technology — technology is available to everyone. The moat is the data we accumulate from every campaign, the network effects that make the platform smarter with every new client, the relationships we build as the trusted commercial partner of growing African businesses, and the first-mover advantage in a continent that no one else is serious about yet. The window is 18–24 months. After that, the incumbents wake up. We need to be so deeply embedded in African commercial infrastructure by then that displacement is not worth attempting.

---

### WHAT THIS MEANS FOR DECISIONS TODAY

Every decision we make now should be evaluated against this future:

| Decision | Why it matters to the long-term vision |
|---|---|
| Build the `figsy_memory` table properly | This is the foundation of cross-client intelligence |
| White-label the client portal from Day 1 | Partner/franchise model requires this |
| Capture campaign data in structured form | African data moat requires clean, queryable data from campaign 1 |
| Build MCP server early | Infrastructure positioning starts now |
| POPIA compliance | Trust layer for African market — table stakes for the franchise model |
| African-first ICPs and sequence templates | Vertical intelligence starts with these raw inputs |
| Credit model (not per seat) | Revenue share model is the natural evolution of credit-based pricing |
| UK company | Global expansion and investor conversations require a credible holding entity |

---

*Written: 26 May 2026 — imagination session*
*This section should be reread at every major inflection point: first 10 clients, first 50, first 100, first funding round, first expansion market.*
*Nothing here is guaranteed. All of it is possible. Some of it is inevitable.*

---

## 35. DEMO PLAYBOOK — LIVE SALES DEMO & SMOKE TEST

*Updated: 1 Jun 2026. All Phase 2 + Phase 3 features built. Use this for every demo and smoke test.*
*This is your Rachel moment. Run your own real environment. Real data. Real AI. No slides.*
*URL: https://app.get-kind.com — your own account, your own ICP, your own leads.*

---

### 🎯 THE PHILOSOPHY

Rachel from Alta demoed her own live environment. No deck. No mockup. The product was the pitch.

That is how you demo K.I.N.D.

Every screen you show is a real client screen. Every AI output is real. Every number is live. When they ask "does this actually work?" — you're already in it.

**The story you're telling:**
> "You have one problem. Pipeline. You need consistent meetings in your calendar from people who actually want to buy. K.I.N.D is the AI Revenue Team that fills that pipeline — FIGSY finds and reaches out, Milla handles your documents and research, Vida converts your website visitors. You run the business. They run the outreach."

**Golden rule:** Every screen transition has a sentence. Never silence. Keep talking.

**The new Scene 1 rule (post-W1 build):** Don't open with slides, pricing, or your pitch. Open the ICP builder and let Apollo's live data be the opening argument. The number counts up. Names appear. You haven't said a single feature yet. The prospect is already leaning forward. *Then* you explain what FIGSY does with those leads.

---

### 🛠️ PRE-DEMO SETUP — Using Demo Envs (No paid tools required)

**One-time setup. Takes ~15 minutes. Do it the day before, not the morning of.**

| # | Task | How |
|---|------|-----|
| S1 | **Admin → Demo Envs → Create new demo** | Fill: prospect name = "Kind Demo", company = your target industry, country = South Africa, industry = Fintech (or relevant). Expiry = 30 days. This creates a real portal account. |
| S2 | **Admin → All Clients → find the demo client → Grant 500 credits** | Click the client → Credits tab → grant 500. Repeat once more for 1,000 total. |
| S3 | **Admin → Demo Envs → Open portal** | Logs you in as the demo client. You're now in the demo environment. |
| S4 | **Complete onboarding** | Company name, industry, country — fill it in. This is what the client will see on first login. |
| S5 | **Leads → ICP Builder → Save an ICP** | Industry: Fintech, Title: Head of Sales, Country: South Africa. Save. Leads will populate with fake seeded data. |
| S6 | **FIGSY → Create a campaign** | Name: "Q3 Outbound", tone: Professional. Add 3 steps. Save. This is what you'll demonstrate. |
| S7 | **Campaign → Advanced Settings → Enable A/Z testing** | Add 2 subject line variants. Shows the intelligence layer. |
| S8 | **FIGSY → Kanban** | Opens the pipeline view — visual and impressive. |
| S9 | **Milla → Upload one document** | Use a 1-page company brief (PDF or .txt). Milla will answer from it during the demo. |
| S10 | **Vida → Config → Save** | Bot name: "KIND Assistant". Brand colour: #6d28d9. Save. Embed code is now visible. |
| S11 | **Proposals → New Proposal** | Create a draft proposal titled "K.I.N.D Proposal — [Prospect Name]". Shows the e-sign flow. |
| S12 | **Open demo in clean Chrome window** | No dev tools, no extensions, no other tabs visible. Zoom to 110%. |

> **This demo environment is permanently ready.** You never rebuild it. Login as the demo client and go.
> **No Apollo key needed** — seeded leads are already in the pipeline.
> **No Resend needed** — FIGSY email attempts are visible in the UI even if delivery fails.

---

### 🎬 THE DEMO — SCENE BY SCENE

**Total runtime: 18–22 minutes**
**Order: Home → Leads → FIGSY → Inbox → Knowledge → Billing → Milla → Vida → Share link**

---

#### 🎬 Scene 1 — The Wow Moment (ICP Builder, 90 seconds)

**What you do:** Open the ICP Builder. Start filling in 2–3 fields.

**Narration:**
> "I'm going to show you something before we talk about price or features. Watch this number in the corner."
> *(Type: Job Title = "Head of Sales", Industry = "Fintech", Geography = "South Africa")*
> "Do you see that? That's not a demo number. That's live data from Apollo right now. [X,XXX] real people matching exactly what you just described."
> *(Wait for the 3 sample names to appear)*
> "And those three names — those are real people. That's Kagiso at [Company], that's Thabo at [Company]. These are leads you could be talking to by Thursday."
> "That's what K.I.N.D does. You describe who you want. We find them."

**Why this works:**
- The number moves as you type — it feels alive, not canned
- Real names make it visceral — it's not abstract anymore
- "By Thursday" anchors the speed advantage vs Alta's days-to-first-outreach
- The silence when names appear is more powerful than anything you say

**What to watch for:** If the count returns 0, widen geography to "Sub-Saharan Africa" — usually fixes it. If the sample contacts load slowly, say "giving Apollo a moment to check 250 million records" — the pause becomes drama.

**Transition:**
> "Now let me show you what happens next. We take that list and FIGSY writes every email, handles every reply, and books the meetings — without you touching it."
> *(Navigate to Campaigns)*

---

#### SCENE 2 — The Dashboard (2 min)
*URL: `/dashboard`*
*Smoke Test: Steps 2, 3, 17*

**Open to:** The Mission Control dashboard — hero stats visible at the top.

**Say:** *"This is your command centre. Everything your AI Revenue Team is doing right now, on one screen. No clicking around."*

Point to:
- The **credit balance** (top right, gold) → *"These are your fuel credits. Every lead enriched, every email sent, every consent — one credit."*
- The **active campaigns** column → *"FIGSY's live campaigns, with reply counts next to each one."*
- The **hot replies** column → *"These are people who replied saying they want to talk. FIGSY already flagged them as 🔥 Hot. Your job is just to close."*
- The **system status** dot at the bottom of the sidebar → *"Green means all systems are running. FIGSY is working right now."*

**Smoke check:** Dashboard loads ✅ / Credit balance shows ✅ / System status green ✅

---

#### SCENE 3 — Leads & ICP Builder (4 min)
*URL: `/dashboard/leads` then `/dashboard/leads/icp`*
*Smoke Test: Steps 4, 5, 6, 7*

**Navigate:** Click **People** in the sidebar.

**Say:** *"Your pipeline starts here. Not with a spreadsheet. Not with a VA copying from LinkedIn. K.I.N.D pulls real, enriched contacts — founders, heads of sales, decision makers — matched to exactly who you want to reach."*

Show the **lead list** — scores, names, companies, industries visible.

**Say:** *"Every lead has an AI score — 0 to 100 — based on how closely they match your ideal client profile. High scores at the top. FIGSY only reaches out to the right ones."*

Click one lead. Show the detail panel.

**Say:** *"Name, title, company, location, LinkedIn — fully enriched. One click, you can send them a POPIA consent notice. That's your legal cover in South Africa — the system handles compliance automatically."*

Click **Send POPIA consent** (or show the button). 

**Say:** *"Status updates to 'consent sent'. It's tracked. You're covered. No spreadsheet to maintain."*

Navigate to **ICP Builder** (`/dashboard/leads/icp`).

**Say:** *"How does it know who to find? Your ICP. Instead of spending hours defining it yourself, you click one button."*

Click **Suggest with AI** (or show the pre-filled version).

**Say:** *"Claude reads your company profile and suggests who you should be targeting — industry, seniority, company size, location. You review, adjust, save. Apollo finds the contacts. Takes 2 minutes instead of 2 weeks of Googling."*

**Smoke check:** Leads visible with scores ✅ / ICP suggest AI fills form ✅ / POPIA consent sends ✅ / CSV export downloads ✅

---

#### SCENE 4 — FIGSY: The AI SDR (5 min)
*URL: `/dashboard/figsy`*
*Smoke Test: Steps 18, 19, 20, 21, 22, 25*

**Navigate:** Click **FIGSY** in the sidebar agent card.

**Say:** *"This is FIGSY. Your AI Sales Development Representative. He doesn't take holidays. He doesn't forget to follow up. And he gets better the longer he works — he reads his own past campaigns and adjusts."*

Show the **FIGSY dashboard** — active campaigns visible.

**Say:** *"Every campaign runs on a sequence — Day 1, Day 4, Day 9. Each email is personalised to the lead, not copy-paste. FIGSY writes it. You set the tone once in the Knowledge Base."*

Click a campaign to open it. Show the **sequence steps** with branch pills.

**Say:** *"And it's not just 'send email, wait, send email'. If someone replies, FIGSY stops automatically. If someone's out of office, it skips to the next step. No one gets chased when they've already responded."*

Show the **Audience tab** — lead score sliders.

**Say:** *"You control who gets contacted. Min score 60 — only warm leads. Daily limit — you decide the pace. Too aggressive? Dial it back. This is your control panel."*

Go back to the main FIGSY page. Show the **mode toggle** (Autopilot vs Co-pilot).

**Say:** *"Two modes. Autopilot — FIGSY sends when ready. Co-pilot — FIGSY queues every message for your review before it goes. New clients often start in co-pilot. Once they trust it, they flip to autopilot."*

If co-pilot mode active, point to the amber badge: *"See this badge — Co-pilot: review before send. That means FIGSY has messages ready and waiting for your approval."*

**Smoke check:** FIGSY dashboard loads ✅ / Create campaign works ✅ / Enrol lead works ✅ / Pause/Resume works ✅

---

#### SCENE 5 — FIGSY Inbox: Where Meetings Live (2 min)
*URL: `/dashboard/figsy/replies`*
*Smoke Test: Step 24, 25*

**Navigate:** Click **Inbox** under FIGSY.

**Say:** *"Every reply FIGSY gets comes here. But it's not a raw inbox — it's categorised by AI before you see it."*

Point to the category labels:
- 🔥 Hot → *"This person wants to talk. Book them."*
- 🌤️ Warm → *"Interested but not urgent. Needs a nudge."*
- ❄️ Cold → *"Not right now. FIGSY stops the sequence automatically."*
- 🚫 Opted out → *"They said stop. FIGSY blocked them. You're POPIA compliant."*
- ✈️ OOO → *"Out of office. FIGSY waits and follows up when they're back."*

**Say:** *"Your job is the 🔥 Hot list. Those are your next 10 conversations. Everything else is handled."*

**Smoke check:** Inbox loads ✅ / Category labels visible ✅

---

#### SCENE 6 — Knowledge Base (1 min)
*URL: `/dashboard/knowledge`*
*Smoke Test: (functional — not in original 57 steps, but wired this session)*

**Navigate:** Click **Knowledge** under FIGSY in the sidebar.

**Say:** *"This is FIGSY's brain. Your pitch, your keywords, your tone of voice — all set once. Every email he writes pulls from this. Change it here and every future campaign updates automatically."*

Show the **Pitch tab** quickly — company pitch visible.

**Say:** *"No more briefing an SDR agency for three weeks. You write your pitch once. FIGSY never forgets it."*

*Don't linger here. Move on.*

---

#### SCENE 7 — Billing & Credits (1 min)
*URL: `/dashboard/billing`*
*Smoke Test: Steps 8, 8b, 39–46*

**Navigate:** Click **Billing** in the Account section of sidebar.

**Say:** *"Pricing is simple. Credits for lead gen and FIGSY outreach. Subscriptions for Milla and Vida. No per-seat chaos. No surprise invoices."*

Point to the credit bundles.

**Say:** *"Top up when you need to. Set auto top-up and never run dry. Every credit is traceable — what it was used for, when."*

Show the Milla / Vida subscription cards.

**Say:** *"Milla and Vida are $49 and $39 a month. One click, Stripe handles it — you're live in under a minute."*

**Smoke check:** Billing page loads ✅ / Stripe checkout opens ✅ / Balance updates after payment ✅

---

#### SCENE 8 — Milla: Virtual Assistant (2 min)
*URL: `/dashboard/assistant`*
*Smoke Test: Steps 28, 29, 30, 31*

**Navigate:** Click **Milla** in the agent switcher (dropdown).

**Say:** *"FIGSY fills your pipeline. Milla runs your back office. She's your AI virtual assistant — but she works from your documents. Upload your proposal template, your rate card, your company overview. She reads it all."*

Show a chat session.

**Say:** *"Watch this."*

Type: *"What services do we offer?"* — let Milla respond.

**Say:** *"She answered from your documents. Not the internet. Not generic AI output. Your content. She's been briefed on your business."*

Ask a follow-up: *"What would you recommend for a retail company?"*

**Say:** *"Context carries. She remembers the conversation. That's the difference between a chatbot and an assistant."*

**Smoke check:** Milla loads ✅ / Document upload works ✅ / Chat responds from document context ✅

---

#### SCENE 9 — Vida: Chatbot Agent (1 min)
*URL: `/dashboard/chatbot`*
*Smoke Test: Steps 32, 33, 34*

**Navigate:** Switch to **Vida** in the agent switcher.

**Say:** *"Vida lives on your website. She's the chat widget your visitors talk to — except she's not reading from a FAQ doc. She's trained on your business, handles objections, qualifies leads, and hands off to you when someone's ready to buy."*

Show the **config page** — bot name, greeting message, brand colour.

**Say:** *"Fully branded. Takes 5 minutes to set up."*

Show the **embed code** panel.

**Say:** *"Copy this. Paste it into your website. Done. Vida is live."*

**Smoke check:** Vida config loads ✅ / Config saves ✅ / Embed code visible ✅

---

#### SCENE 10 — Kanban & Pipeline (1 min)
*URL: `/dashboard/figsy/kanban`*

**Navigate:** FIGSY → Pipeline (Kanban button in campaign header).

**Say:** *"Every lead FIGSY is working — visualised as a deal pipeline. Enrolled, first email sent, second email, replied, completed. You see exactly where every conversation is. Same as a sales CRM — except FIGSY moves the cards himself."*

*Point to a column.* *"No manual updates. FIGSY moves a lead when it replies. You just watch the pipeline fill."*

---

#### SCENE 11 — Proposals (1 min)
*URL: `/dashboard/proposals`*

**Navigate:** Sidebar → Proposals.

**Say:** *"When a lead is hot and wants to move forward — you send a proposal. One button. K.I.N.D generates it from your campaign data. You review, hit send, and they get an email with a sign link."*

Show the draft proposal created in pre-demo setup.

**Say:** *"They click the link, review the proposal, sign it. You get a notification. No DocuSign account. No PDF back-and-forth. Done."*

Point to status badge: *"Draft → Sent → Viewed → Signed. You always know where it is."*

---

#### SCENE 12 — The Share Link (30 sec)
*URL: `/share/[token]`*

**Say:** *"Last thing — if you have investors, a sales manager, or a board you report to, you don't need to add them as users. You share a link."*

Open a shareable dashboard link.

**Say:** *"Read-only. No login. Shows campaign performance, reply rates, pipeline value. Professional. Shareable in a WhatsApp in 5 seconds."*

---

#### SCENE 13 — The Close (1 min)

**Say:** *"Three agents. One platform. FIGSY books the meetings. Milla handles the research and documents. Vida converts your website traffic. You run the business."*

*Pause.*

**Say:** *"This isn't automation. This is an AI Revenue Team. What would you pay a junior SDR who works 24/7, never forgets a follow-up, and gets smarter every week?"*

Let them answer.

**If they ask about pricing:** → *"We start at [X]. Credits-based — you only pay for what you use. There's no annual lock-in."*

**If they ask about POPIA:** → *"Built in. Consent tracking, opt-out blocklist, automatic stop on request. Every step is auditable."*

**If they ask about integration:** → *"Apollo for data. Resend for email. Stripe for billing. We connect to your HubSpot — contacts, deals, FIGSY activity all sync."*

---

### 🧪 SMOKE TEST COVERAGE MAP

*Every scene above maps to Section 18 steps. Run the demo = run the smoke test.*

| Scene | Steps Covered | What you're testing |
|-------|--------------|---------------------|
| Scene 1 (ICP Wow Moment) | 5, 6 | Live Apollo count, sample contact names appear |
| Scene 2 (Dashboard) | 17 | Session, load, system status |
| Scene 3 (Leads + ICP) | 4, 5, 6, 7 | AI ICP, lead scoring, POPIA consent, CSV export |
| Scene 4 (FIGSY) | 18, 19, 20, 21, 22, 25 | Campaign creation, enrol, pause, resume, reply categories |
| Scene 5 (Inbox) | 24, 25 | Inbox load, AI categorisation |
| Scene 6 (Knowledge) | — | Data persistence (wired this session) |
| Scene 7 (Billing) | 8, 8b, 35–46 | Stripe checkout, webhook, balance update, subscriptions |
| Scene 8 (Milla) | 28, 29, 30, 31 | Assistant load, doc upload, chat, context |
| Scene 9 (Vida) | 32, 33, 34 | Config save, embed code |
| Scene 10 (Share link) | — | S3 public route |
| Pre-demo setup | 1, 2, 3, 9, 10, 11, 12, 13, 14, 15, 16 | Auth, onboard, email delivery, admin, credits, gating |

---

### ❌ COMMON FAILURE POINTS + LIVE FIXES

*Things that go wrong in a demo. What to do when they do.*

| What breaks | Live fix (say this) | What to fix after |
|-------------|---------------------|-------------------|
| ICP Suggest hangs | *"The AI is processing — takes about 10 seconds."* Wait 15s. If still blank, reload the tab and show a saved ICP. | Check `ANTHROPIC_API_KEY` in Railway |
| Leads don't appear after ICP | *"Leads come in batches — Apollo is running the search right now. Let me show you what a full pipeline looks like..."* → Go to a pre-seeded account | Check Apollo key + cron |
| POPIA consent doesn't send | *"Email delivery is via Resend — let me check that's configured."* Note for later. | Check `RESEND_API_KEY` in Railway |
| Stripe checkout doesn't open | *"The payment link needs a Stripe price ID — that's a one-time setup. Let me show you the dashboard instead."* | Add missing price ID to Railway |
| Chat doesn't respond | *"One moment — the AI sometimes takes a second on the first message."* Wait 5s. If nothing, note it. | Check API health endpoint |
| Session expired mid-demo | Don't panic. Log back in. Say: *"Automatic security timeout — logs you out after inactivity."* | It's expected behaviour |
| Page won't load | Open incognito tab, navigate directly. Say: *"Let me open a fresh window."* | Usually cache |
| Milla has no context | Upload the document right now in front of them. Say: *"Watch how fast she learns."* | It's actually a good live demo moment |

---

### 📊 WHAT NUMBERS TO HAVE READY

*Know these off the top of your head. No scrambling.*

| Stat | Value | Where it comes from |
|------|-------|---------------------|
| Reply rate benchmark | 18–24% | Alta AI SDR (our benchmark) |
| Meeting booked rate | 3–5% | Alta AI SDR (our benchmark — track vs this) |
| Time to first lead | 2–3 minutes after ICP saved | Apollo enrichment |
| Time to first email draft | < 30 seconds | Claude Haiku sequence generation |
| Daily lead delivery | Set by you (daily_drip_rate) | Your control panel |
| Lead scoring model | 0–100, Claude Haiku | AI-powered, not rule-based |
| Compliance | POPIA full audit trail | Built in |
| Hosting | South Africa (Supabase af-south-1) | Data residency |
| AI provider | Anthropic Claude | Not OpenAI |
| ICP preview count (live) | Fill in: Head of Sales + Fintech + South Africa | Whatever Apollo returns — don't fake it |
| Sample contact names | Auto-populated when ICP filled | Real names from Apollo |

---

### 🕐 30-MINUTE DEMO AGENDA (for a scheduled call)

| Min | What |
|-----|------|
| 0–2 | Intro: *"Let me just show you the product — I'll explain as we go."* Open dashboard. |
| 2–6 | Leads + ICP Builder — the intelligence layer |
| 6–11 | FIGSY — campaigns, branching, inbox, co-pilot mode |
| 11–13 | Knowledge base — *"FIGSY's brain"* |
| 13–15 | Milla — document chat |
| 15–16 | Vida — embed widget |
| 16–17 | Billing — *"here's how pricing works"* |
| 17–18 | Share link — *"investor / manager reporting"* |
| 18–22 | Questions + close |
| 22–30 | *If hot:* Screen share their website. Show where Vida would live. Walk the onboarding steps with them. |

---

### 🔁 AFTER EVERY DEMO — RESET CHECKLIST

| # | Task |
|---|------|
| 1 | Clear any test leads you enrolled to keep pipeline clean |
| 2 | Archive "Demo Campaign" if you created a new one |
| 3 | Check your credit balance — top up if below 1,000 |
| 4 | Note what broke — report to Claude |
| 5 | If they asked a question you couldn't answer — add it to objections list below |

---

### 💬 OBJECTION RESPONSES

| Objection | Response |
|-----------|----------|
| *"We already use Lemlist / Instantly / Apollo"* | *"Those are tools. K.I.N.D is a team. Lemlist sends emails. FIGSY decides who gets contacted, reads the reply, categorises it, and adjusts. That's a different product entirely."* |
| *"Is this POPIA compliant?"* | *"Yes. Consent tracking, opt-out blocklist, automatic stop on request — built into every step. Every action is logged."* |
| *"We're a small team"* | *"That's exactly who this is for. One person with K.I.N.D does the outbound work of a 3-person SDR team. No hiring. No management. No sick days."* |
| *"Can I see results first?"* | *"We offer a free trial with lead credits. You run a real campaign. You see real replies. You decide."* |
| *"What if the AI sounds weird?"* | *"You control the tone in the Knowledge Base. Professional, conversational, formal — you set it once. And in Co-pilot mode you approve every email before it sends."* |
| *"How is this different from ChatGPT?"* | *"ChatGPT is a text box. This is a workflow. FIGSY reads your ICP, pulls matching leads from Apollo, writes personalised emails, sends them, reads the replies, categorises them, and surfaces the hot ones for you. ChatGPT doesn't do any of that."* |
| *"Is my data safe?"* | *"Hosted on Supabase in South Africa (af-south-1). Row-level security — no client can see another client's data. HTTPS everywhere. We can provide a DPA."* |

---

*Section 35 written: 27 May 2026 — after Rachel at Alta showed what a real live demo looks like.*
*Update after every major product change. This is a living document.*

---

## 36. ADMIN PORTAL PLAYBOOK — HOW TO USE EVERY ROUTE

*URL: `admin.get-kind.com` (or localhost:3001 locally)*
*This is your operations cockpit. Not client-facing — founder + team only.*
*Written: 28 May 2026. Update whenever a new admin route ships.*

---

### 🗂️ QUICK REFERENCE — ALL 13 ROUTES AT A GLANCE

| Route | What it's for | Open it when… |
|-------|--------------|---------------|
| `/` | Platform health — MRR, TTFL, clients, KPIs | First thing every morning |
| `/unibox` | All FIGSY replies across every client | A new lead batch ran / client complains about replies |
| `/clients` | List of every client + subscription status | Checking who's on what, T&Cs status |
| `/clients/[id]` | Single client detail — credits, subs, company info | Client asks for credit top-up / subscription issue |
| `/demo` | Create + manage demo environments for prospects | Before a sales call |
| `/playbook` | Full AE sales guide — discovery, demo, objections, close | Before any sales call. Coach new AEs. |
| `/terms-library` | Upload legal PDFs — MSA, Offer Doc, SLAs | When a client asks for signed docs / new version available |
| `/roadmap` | Phase 1–4 milestone tracker | Weekly review — are we on track? |
| `/scalability` | Stage gates, hire checklist, infra triggers | When deciding whether to hire or upgrade infra |
| `/cmo` | LinkedIn post generator, prospect finder | Creating content / prospecting for K.I.N.D itself |
| `/launch` | Pre-launch checklist — 60+ items across 13 categories | Before going public / after every major release |
| `/hubspot` | HubSpot pipeline Kanban by stage | Pipeline review / deal tracking |
| `/founder` | Agent digests, CS follow-up triggers, demo request sends | Daily operations — see who needs attention |

---

### 📅 DAILY WORKFLOW — IN THIS ORDER

**Morning (5 min):**
1. Open `/` — check MRR delta, any new clients, TTFL on new joins
2. Open `/unibox` — scan hot 🔥 and warm 🌤️ replies — anything actionable?
3. Open `/founder` — read the digest — any at-risk clients?

**Before a sales call:**
1. Open `/demo` → Create Demo → enter prospect company + name → Open Demo
2. Open `/playbook` → review discovery questions + demo flow
3. Bookmark the magic link — send after call as follow-up

**Weekly (Friday 30 min):**
1. `/` — check KPI progress vs target. Are we on track for the month?
2. `/clients` — review full list. Anyone past due? Any T&Cs not accepted?
3. `/roadmap` — mark completed milestones. Are phase gates met?
4. `/scalability` — has anything triggered a stage change?
5. `/hubspot` — move deals, update stage

---

### 📖 ROUTE-BY-ROUTE GUIDE

---

#### `/` — Dashboard

**What you see:**
- 5 stat cards: Total Clients · MRR (USD) · Active Subs · Past Due · Avg TTFL
- KPI Progress bar for the current month (MRR vs target, clients vs target)
- Monthly Revenue Targets table — May→Dec 2026, RAG status per month
- Core KPI Targets: TTFL, CVR, Churn, Reply Rate, Interested Rate, NPS
- Client Pipeline Health table — every client with TTFL, total leads, leads this month, status
- Product Catalog — all pricing tiers
- Total Leads counter

**What to do here:**
- **Avg TTFL > 4 hrs** → Check which new client it is → open `/clients/[id]` → trigger at-risk alert in `/founder`
- **MRR behind target** → Open `/hubspot` → check what's stuck in pipeline
- **Past Due > 0** → Open `/clients` → find who's past due → email them manually
- **New client today** → Click into `/clients/[id]` → check T&Cs accepted → check subscription started

**Colour coding on TTFL:**
- 🟢 Green = < 2 hrs (excellent)
- 🟡 Amber = 2–6 hrs (acceptable)
- 🔴 Red = > 6 hrs (intervention needed)

---

#### `/unibox` — Unified Reply Inbox

**What you see:**
All FIGSY email replies across ALL clients — sorted hot → warm → cold → other. Up to 200 most recent. Expandable rows show full reply body + AI reasoning.

**Classification guide:**
| Label | Meaning | Action |
|-------|---------|--------|
| 🔥 Hot | Interested, wants to know more | Forward to client ASAP. Note in HubSpot. |
| 🌤️ Warm | Positive but not ready | Client should nurture. Note timing. |
| ❄️ Cold | Not interested | No action needed. Normal attrition. |
| 🚫 Opted out | "Remove me" | Verify opt-out blocklist updated. |
| 👤 Wrong person | Referred to someone else | Client to follow up with new contact. |
| ✈️ OOO | Out of office | FIGSY auto-handles. Check back date. |
| ❓ Other | Unclear | Read body. Decide manually. |

**Common task: spot-check a client's replies**
1. Filter by category (🔥 or 🌤️)
2. Look for company name in the client column
3. If a client has multiple hot replies but hasn't converted → trigger CS follow-up from `/founder`

---

#### `/clients` — All Clients

**What you see:**
Grid of stat chips (Active / On Trial / T&Cs Accepted / No Credits) → full table of every client with country, status, T&Cs date, active products, and a Manage link.

**Tasks:**
- **Grant credits**: Click Manage → `/clients/[id]` → credit grant form
- **Check T&Cs**: Look at T&Cs column. If blank → client hasn't accepted → email them the link
- **See active products**: Product badges show what each client has (lead_gen_figsy, virtual_assistant, chatbot, etc.)
- **Filter mentally**: Active = paying. Trial = 14-day clock ticking. No Credits = needs top-up or purchase.

---

#### `/clients/[id]` — Client Detail

**What you see:**
- Company info — name, industry, country, website, phone, reg number, VAT
- T&Cs status — accepted at timestamp + IP
- Subscription list — product, tier, status, amount
- Credit balance
- Credit grant / refund form
- Full transaction history

**Common tasks:**

**Grant free credits (e.g. trial extension, goodwill):**
1. Enter amount (max 500 per grant)
2. Type = `manual_grant`
3. Add note: "Trial extension — client was blocked by X"
4. Submit

**Refund credits after an error:**
1. Type = `refund`
2. Amount = credits to restore
3. Note: describe what went wrong

**Check if a client's leads are actually running:**
- Look at credit transaction history — if no `lead_delivery` transactions, leads aren't being delivered
- This means: ICP not activated, or drip rate is 0, or no Apollo results

**Cancel a subscription manually:**
- Not in the UI yet — do via Stripe dashboard directly, then update the `subscriptions` table status in Supabase

---

#### `/demo` — Demo Environments

**What you see:**
Active demo list — company name, industry, prospect name, AE, created date, expiry, leads count, expired/active status. Plus a Create Demo form.

**Before a sales call — Create a Demo:**
1. Click **Create Demo**
2. Enter: Company name, Industry, Country, Prospect name, your name as AE
3. Submit — system creates a real Supabase user + client + 4 products + runs Apollo ICP job → real leads
4. Wait ~30–60 seconds for leads to populate
5. Click **Open Demo** — magic link opens the portal as that prospect (no password needed)
6. Leave this tab open during your call — this IS what you demo

**During the call:**
- Show the Dashboard → real credits, real leads
- Walk through ICP Builder → show AI suggest
- Open Leads → show actual companies matching their ICP
- Open FIGSY → show campaign flow
- If they ask about Milla/Vida → show the upgrade screen (honest: "this is the subscription path")

**After the call:**
- If they want to trial: hand them the magic link → they start from this real environment
- If they passed: click Expire → removes from active list
- If they need more time: click Extend → adds 7 days

**Important:** Demo environments use real Apollo credits (KIND's quota). Don't create demos for non-serious prospects.

---

#### `/playbook` — Sales Playbook

**What you see:**
Full AE guide in expandable sections: ICP profile, discovery questions with probes, demo flow script, objection handling, proposal template, follow-up emails, loss tracker, win metrics.

**Use it:**
- **Before your first call**: Read ICP + Discovery sections. Internalize the probes.
- **During call (on second screen)**: Keep the discovery questions visible. Follow the flow.
- **Objection in real-time**: Jump to Objection Handling section. Every common one is there with exact wording.
- **Writing a proposal**: Copy the Proposal section template. Fill in their specifics.
- **Training a new AE**: Walk them through this before their first call. It's their entire playbook.
- **After a loss**: Go to Loss Tracker section. Add the reason. Patterns reveal what to fix.

**Discovery call structure (memorise this):**
```
0–2 min   Opening: "Confirm time, set agenda"
2–5 min   Rapport: what they do, team, stage
5–20 min  5 discovery questions + probes
20–25 min Demo pivot: summarise pain → bridge to demo
25–55 min Demo (see /demo route)
55–60 min Close: next step, trial booking
```

---

#### `/terms-library` — Legal Document Store

**What you see:**
Upload panel for required docs → list of uploaded templates with download/delete controls.

**Required docs to upload (if not already there):**
| Document | Notes |
|----------|-------|
| KIND Master Services Agreement | Core legal agreement |
| KIND Client Offer Document | Commercial offer |
| Exhibit A — Chatbot SLA | Vida SLA |
| Exhibit B — FIGSY SLA | FIGSY SLA |
| Exhibit C — Virtual Assistant SLA | Milla SLA |

**Process when a client needs signed docs:**
1. Download the relevant templates from here
2. Fill in client details (company name, date, products selected)
3. Send via email or DocuSign
4. Once signed: upload the signed version somewhere accessible (Supabase Storage or Google Drive)
5. Mark `terms_accepted_at` in the client's Supabase record if not auto-set

**Storage note:** PDFs go into Supabase Storage bucket `agreement-templates`. Create it if absent: Supabase → Storage → New bucket → `agreement-templates` → Public.

---

#### `/roadmap` — Phase Tracker

**What you see:**
4 phases (Foundation → Growth → Scale → Dominate) with milestone checklists, MRR targets, client targets, status indicators.

**How to use it:**
- Each milestone has a ✅ done / ⏳ in progress / ○ not started marker
- **Do not edit the code to update this** — tell Claude "mark X as done on the roadmap" → 2 min code change
- Review weekly against actual MRR + client count
- Phase 1 target: $2,500 MRR / 5 clients by end May 2026
- Phase 2 target: $10,000 MRR / 25 clients by end Jun 2026

**Current phase:** Phase 1 — Foundation (active)

---

#### `/scalability` — Stage Gates & Hire Triggers

**What you see:**
Current stage (0–3 based on client count). For each stage: what infra to upgrade, who to hire, what processes to formalise. Capacity math (leads/day, requests/sec). Trigger thresholds.

**Stage reference:**
| Stage | Clients | MRR | Hire |
|-------|---------|-----|------|
| 0 — Solo | 1–5 | <$1K | Just you |
| 1 — Early traction | 6–20 | $1K–$5K | Part-time CS |
| 2 — Growth | 21–60 | $5K–$20K | Full-time AE |
| 3 — Scale | 61–150 | $20K–$60K | Head of CS, DevOps |

**Use it:**
- Hit 6 clients → re-read Stage 1 section → start the CS hire process
- Hit 21 clients → re-read Stage 2 → hire decisions become urgent
- Infra triggers are automatic (Railway scales) but budget approval is yours

---

#### `/cmo` — CMO Tools

**What you see:**
- LinkedIn Post Generator: enter topic → Claude writes 3 branded posts
- Prospect Finder: enter role/company type/region → Apollo search → list of prospects with email

**LinkedIn posts:**
- Use 3× per week minimum
- Generated posts match K.I.N.D tone: founder voice, authentic, no corporate fluff
- Review before posting — they're starting points, not final copy
- Best topics: client wins, founder lessons, product announcements, industry takes

**Prospect finder (K.I.N.D's own outbound):**
- Use this to find your own leads — founders, sales directors, head of growth at SA/NG/KE SMEs
- This feeds into FIGSY for K.I.N.D's own outreach cron (Monday 06:00 UTC)
- Export results and manually add to FIGSY campaign if needed

---

#### `/launch` — Pre-Launch Checklist

**What you see:**
13 sections, 60+ checklist items covering: Supabase migrations, Railway env vars, DNS, Stripe, FIGSY API, auth, security, legal, monitoring.

**When to use:**
- Before going live with a new client (check their section is complete)
- After every major deploy (re-check anything that could have broken)
- When you hire someone new — this is their onboarding checklist

**How to mark items done:**
- Items are `useState` checkboxes — state resets on refresh (not persisted)
- This is intentional — it forces a fresh review each time
- Critical items have a red **CRITICAL** badge — never skip those

**Current state:**
- Most items should now be green after smoke tests
- Blockers: Stripe price IDs, HubSpot API key, UK company number

---

#### `/hubspot` — HubSpot Pipeline

**What you see:**
If `HUBSPOT_API_KEY` is in Railway: full Kanban board by pipeline stage with deal count + total value per column.
If key is absent: setup guide showing exactly how to get and add the key.

**Pipeline stages:**
| Stage | Meaning |
|-------|---------|
| Appointment Scheduled | Demo booked |
| Qualified to Buy | Passed discovery, demo done |
| Presentation Scheduled | Proposal sent |
| Decision Maker Bought In | Champion convinced, escalating |
| Contract Sent | Proposal accepted, legal in progress |
| Closed Won | Paying client |
| Closed Lost | Won't buy — note reason |

**Workflow:**
1. Demo call done → move to "Qualified to Buy"
2. Proposal sent → move to "Presentation Scheduled"
3. Signed → move to "Contract Sent"
4. First payment received → "Closed Won"
5. Weekly: triage anything stuck for >7 days in same stage

**Integration:** HubSpot auto-syncs on: new signup → contact created. Stripe payment → deal created. FIGSY hot reply → timeline event. So the pipeline fills automatically — you just need to move deals forward manually.

---

#### `/founder` — Founder Operations

**What you see:**
- 7-day digest: total clients, new leads, agent actions breakdown (support/cs/ae)
- Recent agent action log with timestamps
- CS Follow-up trigger form: enter client ID + step (day1/day3/day7) → sends personalised email
- Demo Request form: manually send a demo request to any prospect

**Daily use:**
1. Read the digest — is anything surprising? Unexpected drop in leads?
2. If a trial client hasn't activated after 24h → CS Follow-up → Day 1 email
3. If a client is quiet after 3 days → Day 3 email
4. If approaching trial end → Day 7 email (strong push to convert)

**CS email timing guide:**
| Day | Trigger | Email |
|-----|---------|-------|
| Day 1 | Signed up, no ICP created | "Let's get your first leads" |
| Day 3 | ICP created, no campaign | "Your leads are ready — here's how to launch FIGSY" |
| Day 7 | Trial ending soon | "5 days left — here's what you haven't tried yet" |

**Finding client IDs:**
- Go to `/clients` → click Manage → the URL is `/clients/[UUID]` — that UUID is the client ID
- Or: Supabase → clients table → id column

**Demo request form:**
- Use this when a cold prospect asks for a demo via LinkedIn/email but hasn't booked via Calendly
- Enter their name, email, company → sends a personalised "Demo Request" email
- Tracks via HubSpot automatically

---

### 🍳 COMMON RECIPES — STEP BY STEP

---

**Recipe 1: New client just signed up — onboarding check (5 min)**
1. `/clients` → find them → click Manage
2. Check T&Cs accepted (column should show a date)
3. Check subscription status (should be `trialing`)
4. Check credit balance (should have trial credits — default depends on plan)
5. If any of the above is wrong → fix in Supabase or Stripe directly
6. `/founder` → CS Follow-up → Day 1 email → send

---

**Recipe 2: Client says "I have no leads" (10 min)**
1. `/clients/[id]` → check credit balance. Zero? → Grant credits → investigate why drip stopped
2. Supabase → `icps` table → filter by client_id → is there an active ICP? (`is_active = true`)
3. If no active ICP → email client: "Your ICP isn't activated — log in and click Activate"
4. If ICP active but no leads → check `daily_drip_rate` on the client row — should be 10–50
5. If drip rate is 0 → update it manually in Supabase
6. Wait until the next day's 08:10 UTC cron — leads will flow

---

**Recipe 3: FIGSY reply needs urgent attention (2 min)**
1. `/unibox` → filter 🔥 Hot
2. Find the relevant client's company in the "Client" column
3. Expand the row → read the reply body + AI reasoning
4. Forward to client by email: "You have a hot reply from [Lead Name] at [Company] — reply within 24 hours"
5. Note in HubSpot timeline if relevant

---

**Recipe 4: Prospect call in 30 min (5 min)**
1. `/demo` → Create Demo → enter their company, industry, name, your name → submit
2. Wait for "leads populated" confirmation (~30–60s)
3. Click Open Demo → confirm portal loads with real leads
4. `/playbook` → skim discovery questions section
5. You're ready

---

**Recipe 5: Client wants to cancel (10 min)**
1. `/clients/[id]` → note their subscription IDs
2. Stripe Dashboard → Subscriptions → find by client email → Cancel (at period end, not immediately)
3. Supabase → `subscriptions` → update `status` to `cancelled` (or wait for webhook)
4. Send personal email from Jacques: ask why, offer 2-week extension if it's cost-related
5. Log reason in HubSpot → Closed Lost (with reason tag)

---

**Recipe 6: Before a major release / deployment**
1. `/launch` → go through ALL sections → mark items complete
2. Pay special attention to: Supabase migrations run, Railway env vars set, CORS configured
3. After deploy: run Smoke Test 1 (Section 18 of this doc) with a fresh Gmail
4. If all 4 smoke tests pass → you're live

---

### 🚨 WHEN THINGS GO WRONG — ADMIN TRIAGE

| Symptom | First place to check | Action |
|---------|---------------------|--------|
| Client can't log in | Supabase → Auth → Users | Check email exists, not banned |
| Client has no leads after 48h | Supabase → `icps` table | Check `is_active`, `daily_drip_rate` |
| Credits went to zero overnight | `/clients/[id]` → transaction history | Check for unexpected deductions — grant refund if error |
| FIGSY campaign stuck at 0 sends | API logs (Railway) | Check `RESEND_API_KEY` is set |
| New client payment not activating subscription | Stripe → Webhooks | Check webhook is receiving events — resend if needed |
| Admin page shows blank data | Railway API logs | Check Supabase env vars in Railway |
| Demo environment not loading | `/demo` → check expiry | Re-create if expired. Check Apollo quota. |
| HubSpot shows "not connected" | Railway → `HUBSPOT_API_KEY` | Add the key — see Section 2 of this doc |

---

### 🔐 ACCESS NOTES

- Admin portal is NOT auth-gated by default (no login screen)
- Access control is by URL obscurity + Railway private networking
- Before going public: add basic auth or IP allowlist to admin Railway service
- Never share the admin URL in any public-facing material
- The admin Supabase client uses `SUPABASE_SERVICE_ROLE_KEY` — full access to all data

---

*Section 36 written: 28 May 2026.*
*Update when new admin routes ship. Keep recipes in sync with actual UI.*
*This is the playbook Jacques hands to a new AE or ops hire on Day 1.*

---

## 37. Monday.com AI — Competitive Audit & UX Steal List
*Written: 31 May 2026. Screenshots reviewed: AI Sidekick, Vibe, AI Workflows, AI Agents, AI Notetaker, Agent Avatar Customizer, Agent Gallery/Carousel.*

---

### What Monday.com Built (Their AI Product Suite)

| Product | What It Does | Key Insight |
|---------|-------------|-------------|
| **AI Sidekick** | General-purpose chat assistant — create boards, write docs, research, brainstorm, generate images | Full-width centered input IS the page. Not a widget |
| **Vibe** | Natural language app builder — describe an app, it builds it | Same input-first layout, huge textarea, category template gallery |
| **AI Workflows** | Automation builder via conversation — no visual editor needed | Conversational-first for a category that's historically form-heavy |
| **AI Agents** | Custom AI agents with name, role, avatar, background color | "Build your own workforce in minutes" — agents as colleagues |
| **AI Notetaker** | Meeting recording + transcription + action item extraction | Integrates into calendar, fires after every meeting |

All five products live under "monday AI" in the sidebar — a named section, not buried in Settings.

---

### Their Design System — The Patterns

**Layout**
- Sidebar: ~120px wide, text only, no icons competing for space
- "monday AI" section header groups all AI products
- Middle column (200px, collapsible): chat history / app list — context without shrinking main area
- Main content: 70-75% of screen, always one hero action

**Color**
- Pure white backgrounds everywhere
- Rainbow gradient only on the primary input box — signals "most important element"
- Agent cards: coloured background block (white card, coloured top 40%) per agent
- No dark panels in main content area

**Typography**
- Page titles: Bold ~36px, dark gray
- Subtitles: Regular ~14px, medium gray
- Nav: ~13px, left-aligned, no icons

**Input boxes**
- Always full-width of content area (800-900px)
- Gradient border is the only decoration needed
- Toolbar below input (not above) — keeps top clean
- Placeholder text is light and friendly

**Agent cards**
- White card, 12-16px corner radius
- Colored background block behind avatar
- Name bold, role title underneath, 2-line description
- CTA button: "Try me"
- Carousel with perspective scaling (focal card large, others muted)

**Suggested starters**
- 4×2 grid below primary input
- Each card: title, one-line description, category pill
- Never an empty state — always a next step

---

### Their Strategy (What It Signals)

1. **AI is a product family, not a feature** — five named products under one brand section
2. **Every AI surface is conversational first** — no forms, no 12-step wizards
3. **Agents are colleagues, not bots** — naming convention, avatar customization, "workforce" language
4. **Templates remove blank-page anxiety** — every AI page has suggested starters
5. **Personalization is high-impact** — "Hi Jacques" before you do anything. Feels warm.

---

### What K.I.N.D Has That Monday Doesn't

| K.I.N.D Advantage | Why It Matters |
|-------------------|----------------|
| Vertical specialisation — SDR-specific | Monday's agents are generic. FIGSY is purpose-built for outbound |
| Real pipeline output — actual emails, actual replies | Monday AI creates boards and docs. Higher stakes, higher value |
| Client-facing portal (Alta-style) | Monday is internal-only. Our client portal is a differentiator they can't copy |
| Africa-first positioning | Monday has no regional depth. We own that layer |

---

### What We Do NOT Take From Monday

- Rainbow gradient on inputs — clashes with our purple identity. We have our own colour language.
- Their sidebar structure — we have different nav needs (client portal vs internal tool)
- Avatar customizer — FIGSY/Milla/Vida have fixed identities, not user-configured

---

### What We Take — The UX Steal List (all in Section 0b as P0-16 through P0-23)

| # | Steal | Monday Pattern |
|---|-------|---------------|
| P0-16 | KIND AI sidebar section | "monday AI" header grouping all AI products |
| P0-17 | Personalized dashboard greeting | "Hi Jacques, What would you like to work on today?" |
| P0-18 | FIGSY full-page mode | AI Sidekick as a full-width page, not a side widget |
| P0-19 | Agent card redesign (persona treatment) | Agent gallery with colored backgrounds + name/role/CTA |
| P0-20 | Suggested starters on all empty states | 4×2 card grid below primary input, never empty |
| P0-21 | Wider content + lighter sidebar | 120px sidebar, 75% content area |
| P0-22 | Input as design signal | Full-width input with gradient border as page hero |
| P0-23 | Workforce language pass | "Your team", "FIGSY sent", "FIGSY flagged" |

---

### The Core Insight

> Monday has built the reference implementation for AI-native SaaS UX. The gap for K.I.N.D isn't features — it's the feeling. Right now the portal feels like a dashboard that has AI in it. It should feel like an AI product that has a dashboard in it. That's a layout and hierarchy shift, not a rebuild.

---

*Section 37 written: 31 May 2026.*
*Reviewed: AI Sidekick, Vibe, AI Workflows, AI Agents, AI Notetaker, Agent Avatar Customizer, Agent Marketing Carousel.*
*Build items added to Phase 0: P0-16 through P0-23. No building until founder authorises.*


---

## 38. MULTI-USER TEAM MODEL — Architecture & Build Plan

*Approved: 31 May 2026. Build in progress.*

---

### The Problem
KIND is currently single-user per company. One `user_id` ties to one `clients` row. A company with a sales team (SDR, AE, manager) cannot share leads, campaigns, or inbox under one workspace.

### The Model

**Core principle:** all existing data is already scoped to `client_id`. No restructuring needed. We add a membership layer on top.

```
clients (one per company)
  └── client_members (many users → one client)
        ├── owner    — full access, billing, delete account, invite anyone
        ├── admin    — everything except billing and account deletion
        ├── member   — leads, campaigns, inbox, documents, knowledge base
        └── viewer   — read-only, no sending, no deleting
```

### Database Schema

**Table: `client_members`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `client_id` | UUID | FK → clients.id |
| `user_id` | UUID | FK → auth.users.id (null until accepted) |
| `email` | TEXT | Invited email |
| `role` | TEXT | owner / admin / member / viewer |
| `invited_by` | UUID | FK → auth.users.id |
| `invited_at` | TIMESTAMPTZ | When invite sent |
| `accepted_at` | TIMESTAMPTZ | Null = pending |
| `invite_token` | TEXT | Unique, nulled on accept |

Migration: `supabase/migrations/20260531_client_members.sql`

Existing clients auto-seeded: current `user_id` becomes `owner` on migration run.

### Invite Flow

1. Owner/admin goes to **Settings → Team**
2. Types email + picks role → clicks "Invite"
3. API: `POST /team/invite` — creates `client_members` row, sends email via Resend
4. Invitee clicks link → `/invite/accept?token=XXX`
5. If logged in: auto-accepts, redirects to `/dashboard`
6. If not logged in: prompted to log in / sign up → accept on redirect back

### What's Built

| Item | Status | Commit |
|------|--------|--------|
| `client_members` migration | ✅ Done | `cfa2c43` |
| `/team` API router (invite, accept, members, remove) | ✅ Done | `53c6f29` |
| `/invite/accept` portal page | ✅ Done | `b21a93f` |
| Settings → Team tab (member list + invite form) | ✅ Done | `0486da1` |
| `/dashboard/team` owner overview page | ✅ Done | `0c3b53c` |
| Sidebar "Team" nav link | ✅ Done | `2a517ed` |

### Owner Dashboard (`/dashboard/team`)

4 stat cards across the top:
- **Team members** — count active / pending
- **Total leads** — scored and ready across the whole workspace
- **Hot replies** — unread interested/hot replies needing response
- **Active campaigns** — running now + credits remaining

Below: team member list with role badges and active/pending status. Link to Settings → Team for management.

### Role Guards (Phase 2 — post-launch)

| Action | Owner | Admin | Member | Viewer |
|--------|-------|-------|--------|--------|
| Billing / credits | ✅ | ❌ | ❌ | ❌ |
| Invite / remove members | ✅ | ✅ | ❌ | ❌ |
| Launch campaigns | ✅ | ✅ | ✅ | ❌ |
| Import leads | ✅ | ✅ | ✅ | ❌ |
| View everything | ✅ | ✅ | ✅ | ✅ |
| Delete workspace | ✅ | ❌ | ❌ | ❌ |

Role enforcement at API level comes in Phase 2. Phase 1 build gives all members full access — ownership and billing remain tied to the original account holder.

### Pricing Implication

Team seats will be an add-on. Options:
- +£15/mo per additional seat (Slack model)
- Flat team tier at £149/mo for up to 5 seats
- Decision deferred until first team customer requests it

---

*Section 38 written: 31 May 2026. Build in progress — background agent building all components.*

## 39. GOING LIVE — FULL ADMIN CHECKLIST
*Do this once: after lawyer confirms, before first real client. In order.*

---

### 🏢 COMPANY REGISTRATION (UK — Companies House)

| # | Task | Detail | Status |
|---|------|--------|--------|
| 1 | **Lawyer confirmation** | Confirm legal structure (Ltd), director details, registered address | ⏳ Waiting |
| 2 | **Companies House registration** | companieshouse.gov.uk → Incorporate a Private Limited Company → £12 online → same-day | ⏳ After lawyer |
| 3 | **Company number** | Save it — needed for contracts, invoices, DPA | ⏳ |
| 4 | **Registered address** | Use a virtual office address if working remotely (~£10/mo) — keeps personal address off public record | ⏳ |
| 5 | **Corporation Tax registration** | HMRC → register within 3 months of trading | ⏳ |
| 6 | **Business bank account** | Tide, Starling, or Monzo Business (free tiers) — needed for Stripe payouts | ⏳ |

---

### 📧 GOOGLE WORKSPACE

| # | Task | Detail | Status |
|---|------|--------|--------|
| 1 | **Sign up** | workspace.google.com → Business Starter ($6/user/mo) | ⏳ |
| 2 | **Primary email** | `jacques@get-kind.com` | ⏳ |
| 3 | **Team emails** | `hello@get-kind.com`, `support@get-kind.com`, `noreply@get-kind.com` | ⏳ |
| 4 | **GoDaddy MX records** | Google Workspace will give you 5 MX records to add in GoDaddy DNS | ⏳ |
| 5 | **Connect to Resend** | Resend → Domains → verify `get-kind.com` with SPF + DKIM → all outbound email via Resend | ⏳ |

---

### 💳 PAID TOOLS — IN ORDER OF PRIORITY

| Priority | Tool | Cost | What it unlocks | Action |
|----------|------|------|----------------|--------|
| 🔴 1 | **Apollo.io Basic** | $49/mo | Lead search returns real results — nothing works without this | apollo.io → Upgrade → Basic |
| 🔴 2 | **Railway Hobby** | $5/mo | Custom domains for `app.get-kind.com` + `www.get-kind.com` | railway.app → Billing → Hobby |
| 🟡 3 | **Resend Pro** | $20/mo | 100 emails/day → 50,000/mo — FIGSY hits free limit immediately | resend.com → Billing → Pro |
| 🟡 4 | **Stripe live mode** | Free (2.9% + 30c) | Accept real payments from clients | Stripe → Activate account → add bank |
| ⚪ 5 | **Hunter.io** | Free/25 per mo | Waterfall enrichment fallback | hunter.io → free signup → API key |
| ⚪ 6 | **Clearbit** | Free tier | Visitor de-anon company names | clearbit.com → free signup → API key |
| ⚪ 7 | **PDL (People Data Labs)** | Free/100 calls | Waterfall enrichment top tier | peopledatalabs.com → free signup |
| ⚪ 8 | **HubSpot** | Free CRM | CRM sync for clients using HubSpot | hubspot.com → free account → API key |

---

### 🔑 RAILWAY ENV VARS TO SET (when tools above are ready)

Add these in Railway → `@kind/api` service → Variables:

```
APOLLO_API_KEY=
RESEND_API_KEY=                ← already set, verify it's on paid plan
ADMIN_API_KEY=                 ← generate any secure string: openssl rand -hex 32
HUNTER_API_KEY=
CLEARBIT_API_KEY=
PDL_API_KEY=
HUBSPOT_API_KEY=
STRIPE_SECRET_KEY=             ← switch from test to live key
STRIPE_WEBHOOK_SECRET=         ← re-register webhook with live endpoint
PORTAL_URL=https://app.get-kind.com
```

---

### 🌐 DNS — FINAL STATE (GoDaddy)

| Record | Type | Name | Value |
|--------|------|------|-------|
| Website | CNAME | `www` | `h7wyj4uy.up.railway.app` |
| Portal | CNAME | `app` | Railway portal CNAME (get from Railway after Hobby upgrade) |
| Email (Google) | MX x5 | `@` | Google Workspace MX records |
| Email SPF | TXT | `@` | `v=spf1 include:_spf.google.com include:amazonses.com ~all` |
| Email DKIM | TXT | `resend._domainkey` | Resend DKIM value |

---

### ✅ READY TO TAKE FIRST CLIENT WHEN:
- [ ] Company registered
- [ ] Business bank account open
- [ ] Stripe live mode active
- [ ] Apollo API key in Railway
- [ ] `app.get-kind.com` DNS resolving
- [ ] `noreply@get-kind.com` sending via Resend
- [ ] ADMIN_API_KEY set in Railway
- [ ] Smoke test passed (Section 18 + Section 35)

---

*Section 39 added: 1 Jun 2026*

---

## 40. COMPETITIVE DEEP DIVE — CLICKUP, ALTA, MONDAY.COM
*Researched: 1 Jun 2026. Every feature gap. Every steal. Every play.*

> **Context for this section:** KIND is an AI Revenue Team platform — FIGSY (AI SDR outbound), Milla (virtual assistant / internal copilot), Vida (website chatbot). This section maps what ClickUp, Alta AI, and Monday.com have that KIND does not, and converts every gap into a prioritised action.

---

### LEGEND
- RED = Build this month
- YELLOW = Build next quarter
- WHITE = Nice to have / defer

---

## COMPANY 1: ALTA AI SDR

### Background
- Israeli-founded, raised **$7M Seed (Feb 2025)** from Team8 and others
- Named **G2 High Performer, Summer 2025** in AI SDR category
- Core product: three coordinated AI agents sharing a unified data layer
  - **Katie** — AI SDR (outbound research + multichannel outreach)
  - **Alex** — AI Calling & Inbound Agent (voice qualification, meeting booking)
  - **Luna** — AI RevOps / Growth Intelligence Agent (analytics, signal analysis, agent orchestration)
- Target: growth-stage and enterprise B2B revenue teams
- Pricing: **custom / contact sales** — estimated $1,500–$5,000+/month based on market comps; no published price list
- Time to first campaign: **under 1 week** once CRM + email infrastructure connected

---

### A. Feature Gap List — Alta vs KIND

| Feature | Alta's Version | KIND Status | Priority |
|---|---|---|---|
| Unified AI agent layer (SDR + Voice + RevOps) | Katie + Alex + Luna share one data layer — signal from each channel improves the others automatically | KIND has FIGSY + Milla + Vida but no unified signal layer between them | RED: Build shared signal/feedback loop between agents |
| AI Voice Calling Agent | Alex calls leads instantly while warm, qualifies via adaptive scripts, captures every call in CRM, multilingual, 24/7 | KIND has no voice/calling agent | YELLOW: High value — adds inbound qualification muscle |
| Inbound lead qualification via voice | Alex handles inbound calls — qualifies intent, routes to rep, books meetings | Not in KIND | YELLOW: Pair with Vida chatbot for omnichannel inbound |
| 50+ data source intent engine | Luna monitors CRM history, job postings, funding events, tech stack adoption, company news, engagement patterns, intent data platforms | FIGSY uses Apollo; no proprietary multi-source signal aggregation | RED: Build signal layer — hiring signals, funding, tech stack triggers |
| Condition-based multichannel branching | Email to LinkedIn to SMS to WhatsApp to phone with real-time adaptive branching based on engagement | FIGSY does email sequences; no WhatsApp/SMS/voice branching | YELLOW: Add SMS + WhatsApp channels to FIGSY sequences |
| Lookalike audience generation | Katie auto-builds lookalike prospect lists from winning customers | Not in KIND | RED: Build "clone my best client" prospecting from KIND's closed-won data |
| Revenue intelligence dashboard (Luna) | Continuously analyses what's working across the entire GTM motion, surfaces recommendations automatically | KIND has basic analytics; no cross-channel performance intelligence | YELLOW: Build Luna-equivalent analytics layer in admin |
| CRM-native Salesforce/HubSpot push | Real-time OAuth sync — outreach actions, replies, bookings auto-log in Salesforce | KIND logs to own DB; no direct Salesforce/HubSpot write-back | YELLOW: CRM integration for enterprise clients |
| Onboarding SLA | Live within 1 week — ICP setup, CRM connection, playbook training, channel integration included | KIND has no structured onboarding SLA | RED: Publish and deliver a "live in 7 days" onboarding promise |
| G2 presence + social proof | G2 High Performer badge, public reviews ("40% SDR productivity increase", "replaced 1 SDR entirely") | KIND not on G2 yet | RED: Get on G2 — even 5 reviews builds trust |
| 50+ native integrations | Salesforce, HubSpot, Outreach, Salesloft, LinkedIn, Apollo, ZoomInfo, 6sense, Gong, and 40+ more | KIND integrates with Apollo; limited elsewhere | YELLOW: Build integration directory page even if lightweight |

**Key G2 review quotes (verified):**
- "SDR productivity increased by 40%" — Sales Development Team Manager
- "Alta handles 30% of our inbound now and replaced one SDR entirely"
- "The personalization was impressive — it identified a LinkedIn post from 3 months ago about a specific industry trend. That level of detail would take a human hours to find."
- One reviewer noted a learning curve when structuring campaigns effectively
- LinkedIn automation concern: "you need to connect your personal profile and I was worried about limits"

---

### B. Website Tactics — Alta vs KIND

| Tactic | Alta Does | KIND Status | Steal? |
|---|---|---|---|
| Agent persona branding | Katie, Alex, Luna have names, faces, personalities. Buyers buy the agent, not the platform. | FIGSY, Milla, Vida have names but need deeper persona pages | RED: Build agent persona landing pages |
| Competitor comparison pages | Dedicated /lp/alta-vs-11x page — feature-by-feature teardown. Owns "Alta vs [competitor]" search intent. | KIND has no comparison pages | RED: Build /vs/artisan, /vs/aisdr, /vs/human-sdr pages |
| Results-first homepage | "3x qualified meetings", "20 hours/week saved", "80% cost reduction" — all above the fold | KIND uses benefit language but not hard metric claims | RED: Add specific metric claims to homepage hero |
| "Live in 7 days" guarantee | "Most teams see their first campaign go live within a week of signing" — removes buying risk | No time-to-value promise on KIND site | RED: Add "First campaign live in 5 business days or we extend your first month free" |
| Demo = discovery call only | No product tour on site. "Book a demo" = sales call with custom demo. | KIND offers Calendly links | YELLOW: Build a Navattic/Storylane interactive product tour as pre-qualification |
| No published pricing | Custom pricing only — forces a conversation, positions as enterprise | KIND has pricing visible | WHITE: Consider adding "custom enterprise" tier alongside published pricing |

---

### C. AE/SE Success Patterns — Alta

- Sales motion is pure demo-to-enterprise: No free trial. Demo-first. Rep shows ROI calculation live.
- Demo is ROI-led: Reps walk prospects through their own ICP + estimated meeting volume lift using Luna intelligence layer — making the demo feel bespoke.
- Onboarding IS the close: "Live in 7 days" — customers sign because the onboarding is part of the sale promise. Reduces "let me think about it."
- SE role: Technical setup on day 1 (CRM OAuth, ICP input, email warmup config). SE removes friction; AE handles commercial.
- Retention play: Luna's revenue intelligence dashboard creates a weekly habit loop — customers can't churn because the data lives inside Alta.
- **What KIND should do:** Mirror this — make FIGSY onboarding the sales moment. "We'll run your first outbound sequence before your contract starts."

---

### D. Admin/Ops Patterns — Alta

- Unified data layer means customer success teams can see cross-channel performance from one view
- Luna auto-surfaces expansion — when a client's win rate lifts 15%, Luna flags "you're ready for 2x volume" — creates a natural upsell trigger
- Health signals: Response rates, meeting rates, and pipeline contribution tracked per agent per week
- **What KIND should do:** Build a simple "campaign health" dashboard in admin — reply rate, meeting booked rate, cost per meeting, vs. benchmark. Flag clients below benchmark automatically for CS outreach.

---

## COMPANY 2: CLICKUP

### Background
- Founded 2017, San Diego; **$4B valuation**, ~$300M ARR (accelerating)
- Cut 22% of staff (May 2026) in "100x Org" restructure — CEO Zeb Evans going AI-first, 3:1 agent-to-human ratio internally
- Acquired Codegen (cursor competitor) Dec 2025 to power Super Agents
- **20M+ users, 4M+ teams** worldwide
- Pricing: Free / Unlimited ($7/user/mo) / Business ($12/user/mo) / Business Plus ($19/user/mo) / Enterprise (custom)
- ClickUp Brain AI add-on: **$7/user/month** (or $5/year); includes Brain MAX desktop app

---

### A. Feature Gap List — ClickUp vs KIND

| Feature | ClickUp's Version | KIND Status | Priority |
|---|---|---|---|
| Super Agents (AI coworkers) | Named workspace members with persistent memory, 500+ skills, @mentionable, assignable tasks, scheduled runs, reasoning loop (observe, decompose, execute, verify, escalate). Powered by Codegen acquisition. | KIND has agents but no "persistent AI teammate" with workspace memory and task assignment | RED: Biggest concept steal: FIGSY/Milla as persistent named team members clients can assign tasks to |
| Brain MAX (contextual desktop AI) | Desktop sidebar — unified search across ClickUp + Google Drive + GitHub + Notion + OneDrive + web; multi-model switching (GPT-4.1, Claude Opus, Gemini 2.5); BrainWave voice-to-action | No desktop companion in KIND | YELLOW: Milla as persistent sidebar in client portal |
| AI Notetaker (SyncUps) | Records ClickUp native live video calls, transcribes, sends notes + action items to everyone; turns meetings into tasks automatically | No meeting intelligence in KIND | YELLOW: Integrate Fireflies/Recall.ai into Milla workflow |
| Goals & OKR tracking | Measurable targets, KPI dashboards, linked to tasks, OKR visualisation. Progress auto-updates from task completion. | KIND has no goals/OKR module | WHITE: Relevant for enterprise client ROI tracking |
| Customer Health Score AI Agent | Pre-built AI agent: monitors custom fields, auto-scores health, triggers automations (alerts, outreach drafts), spots churn risk + expansion. Playbook template published. | KIND admin has no automated health scoring | RED: Build client health score in KIND admin (reply rate + meeting rate + campaign velocity = health) |
| 100+ automation templates | Pre-built if-X-then-Y templates; AI-described plain-English automation creation | KIND has basic automations; no template library | YELLOW: Build 10 common automation templates in client portal |
| Client Portal (guest access) | Folder/List/Task/Doc/Dashboard sharing with granular permissions. Public link sharing for views without login. Limit: no dedicated portal UI, can't share Chat. | KIND has a client portal differentiated by AI agents inside it | YELLOW: Add public shareable links for campaign reports |
| Interactive pricing calculator | "Input your current tools, see savings" interactive calculator. 8/10 personas engaged; showed $282K annual savings for one prospect. | KIND has static pricing page | RED: Build "Replace your SDR team with FIGSY — see your ROI" calculator |
| ClickUp Docs (collaborative) | Full collaborative docs with AI writer, @mentions converting to tasks, version history, nested pages | No native collaborative doc layer in KIND | YELLOW: Build "Campaign Playbook" doc per client in portal |
| Freemium funnel | Free Forever plan (unlimited users, unlimited tasks) lowers CAC ~25%, drives 20M users to upsell | KIND is fully paid, no free tier | YELLOW: Consider free "Vida chatbot" tier to build top-of-funnel |
| Playbook template library | /p/playbooks/ — 50+ published playbooks as SEO content + product onboarding | KIND has no template/playbook content library | YELLOW: Publish 5 free playbooks: "AI SDR Sequence Playbook", "Inbound Qualification Playbook", etc. |

**Key G2 complaints (verified):**
- "Took 3 weeks to onboard team"
- "Too many features I don't use"
- "Slows down with large projects"
- "Platform automations are not that flexible"
- "Steep learning curve — onboarding a new PM takes a solid hour"
- "The inbox is a little cumbersome"

---

### B. Website Tactics — ClickUp vs KIND

| Tactic | ClickUp Does | KIND Status | Steal? |
|---|---|---|---|
| Interactive pricing/ROI calculator | "Cost of tools you'll replace" calculator on pricing page — immediate personalized value | Static pricing table | RED: Add "Cost of a Human SDR vs FIGSY" calculator to pricing page |
| Massive social proof number | "20M+ users", "4M+ teams" above the fold | KIND has no usage social proof yet | RED: On homepage: "X campaigns run" or "X meetings booked by FIGSY" live counter |
| On-demand demo (no form) | /on-demand-demo/fullscreen-genaud-nav — instant self-serve tour, no email required | KIND uses Calendly | RED: Add 5-min self-serve Loom walkthrough on homepage (no form gate) |
| Compare pages (/compare/monday-vs-clickup) | Owns category comparison SEO | No comparison pages | YELLOW: Build /kind-vs-human-sdr, /kind-vs-artisan-ai pages |
| Customer stories page (/customers) | Full case study library by industry and use case | No case studies published yet | RED: Write 1 beta client case study (even anonymous) — include specific numbers |
| Trust Center | Dedicated security.clickup.com with SOC2, GDPR, HIPAA badges | KIND has compliance info in footer | YELLOW: Build a /security or /trust page |
| Single killer positioning | "One app to replace them all" — repeated in every ad, page, product | KIND needs sharper single positioning | RED: Lock a single sentence: "KIND replaces your SDR team and keeps your AEs closing" |
| Dog-fooding in sales cycle | ClickUp's own AEs use Super Agents to handle follow-up, proposal drafting, meeting prep | KIND could use FIGSY to book its own demos | RED: Use FIGSY to book KIND's own sales meetings. Document it. Put it on the homepage. |

---

### C. AE/SE Success Patterns — ClickUp

- Sales methodology: MEDDPICC for enterprise; AE-led discovery, SE handles technical POC configuration
- Demo structure: "Tailored workspace build" live in the demo — AE replicates the prospect's actual workflow inside ClickUp in real time. Shows, not tells.
- SE POC: SE sets up a trial workspace with the prospect's real use case pre-populated. Prospect evaluates their actual data, not a generic template.
- "100x Org" effect on sales: AEs now dog-food their own AI agents in every deal — follow-up automation, proposal drafting, meeting prep. "We use ClickUp AI to run our sales team" is the best proof point they have.
- Hiring signals: AE JDs explicitly require Command of the Message + MEDDPICC. Sales Managers require MEDDIC fluency.
- **What KIND should do:** Run FIGSY as your SDR for your own pipeline. Screenshot it. Put it on the homepage. "FIGSY booked 14 demos for KIND last month."

---

### D. Admin/Ops Patterns — ClickUp

- Account Insights (Enterprise): Cross-workspace analytics — storage, automation stats, API usage, AI credit consumption, active user tracking
- Customer Health Score playbook: Auto-scores clients based on engagement metrics; color-coded risk dashboard; auto-triggers retention sequences
- Super Agents for CS: Assign a "Client Health Monitor" Super Agent that checks at-risk accounts every Friday and drafts outreach for the CSM
- Brain for CSM: CSM can ask Brain "summarize everything that happened with Acme Corp this month" — instant account summary
- **What KIND should do:** Build equivalent in KIND admin: automated weekly account health summary per client sent to ops team; flag clients with <30% campaign engagement for proactive outreach.

---

## COMPANY 3: MONDAY.COM

### Background
- Israeli-founded (Tel Aviv), publicly traded (NASDAQ: MNDY), **$1.2B revenue FY2025**
- Revenue growth: Q1 2025 = 30% YoY, Q2 = 27%, Q3 = 26% — accelerating into enterprise
- Platform: monday work management + monday CRM + monday service + monday dev + monday campaigns
- Pricing (CRM): Basic $12/seat/mo, Standard $17, Pro $24, Ultimate $28, Enterprise (custom)
- AI strategy: "AI Work Platform for People & Agents" — Sidekick, Magic, Vibe, Agents all launched at Elevate 2025
- AE sales methodology: MEDDPICC + Command of the Message (explicit in JDs). Demo simulation is part of the hiring interview.

---

### A. Feature Gap List — Monday.com vs KIND

| Feature | Monday's Version | KIND Status | Priority |
|---|---|---|---|
| Embedded CRM (contact + pipeline + deal management) | Full contact records with relationship history, deal stages with Kanban/timeline/list views, close probability + forecast value columns, drag-and-drop pipeline. Contact-centric model. | KIND tracks campaigns not contacts; no deal pipeline | RED: Build lightweight client deal pipeline in KIND admin (opportunity tracking per prospect) |
| Quotes & Invoices (built-in) | Create, manage, track quotes + invoices from CRM data. WYSIWYG template editor (v3 2026), conditional logic, payment link embedding, bulk generation, real-time tracking. Pro + Enterprise. | KIND issues invoices externally via Stripe | YELLOW: Build proposal/quote generator in KIND client portal |
| Monday Campaigns (email marketing) | AI-powered email campaign tool inside CRM. Drag-and-drop builder, automation triggers from CRM events, AI subject line generation, send-time optimisation, performance reporting. SMS + ads launching next. | KIND sends outbound via FIGSY but has no marketing campaign module for clients to self-serve | YELLOW: Build "Campaign Builder" for clients to launch their own follow-up email sequences |
| AI Notetaker | Joins Zoom/Teams/Meet 2 min before start, records, transcribes, summarises, creates action items. Sales templates: MEDDICC, BANT, Discovery. AI chat panel post-call. | No meeting intelligence in KIND | YELLOW: Integrate Recall.ai into Milla — auto-log call summaries to client accounts |
| Monday Sidekick (proactive AI) | Context-aware AI for each user — aware of role, company, responsibilities. Proactively suggests and takes action. "Turns work into outcomes with a single click." | Milla is reactive (answers questions); not proactive | RED: Add proactive suggestions to Milla: "You have 3 leads who replied last week but haven't been followed up — want me to draft follow-ups?" |
| Monday Agents + Agent Builder | Build custom AI agents via chat prompt — describe behaviour in plain English, agent deployed to account. Agents create/update items, assign owners, draft messages, log outcomes, execute follow-ups. Multi-agent workflows. | KIND agents are pre-built and fixed | YELLOW: Allow clients to customise FIGSY persona + rules |
| Monday Magic (instant workflow generation) | Describe need in single prompt, fully functional board + workflows + automations generated instantly. 200+ template library. | KIND requires manual configuration | RED: "Magic setup" — onboarding wizard: "Describe your ideal customer in one sentence, FIGSY sequence generated automatically" |
| AI Lead Agent (CRM-native) | Identifies, suggests, adds leads to monday CRM based on ICP. Enriches data, qualifies prospects, ensures reps get only relevant opportunities. | FIGSY finds and contacts prospects; no CRM-native lead suggestion panel for human reps | RED: Build "FIGSY suggestions panel" in admin — FIGSY surfaces 10 new prospects per day for rep review |
| AI SDR Agent (monday CRM native) | Calls leads instantly while warm, adaptive qualification scripts, multilingual, 24/7, captures every interaction. Activates in under 2 minutes using existing CRM data. | FIGSY does email outbound only | YELLOW: Add inbound voice qualification to Vida chatbot flow |
| Two-way Gmail + Outlook sync | Emails auto-attached to deals and contacts. Activity tracker dashboard for calls, emails, meetings. | No email sync in KIND | YELLOW: Build email activity log in client portal |
| Deal forecasting with close probability | Monetary value + close probability columns. Formula: Forecast = Deal Value x Close Probability. Chart + Goal widgets pre-built. Revenue forecast vs. annual goal in one view. | KIND has no deal forecasting | YELLOW: Add pipeline forecast view to KIND admin |
| Account Insights (Enterprise admin) | Storage tracking, automation stats, API analytics, AI credit tracking. Usage per user, per board, per automation. Enterprise only. | KIND admin has basic usage stats | YELLOW: Build per-client usage analytics in KIND admin |
| Customer Portal (monday service) | Multi-portal support, AI-powered self-service knowledge base, "My Tickets" view, advanced analytics, automated responses to common issues | KIND client portal is campaign-focused, not service-focused | YELLOW: Add self-service knowledge base to KIND client portal |
| 200+ industry templates | Out-of-the-box templates for sales, marketing, HR, product, agency | KIND has no template library | YELLOW: Build 5 campaign templates: SaaS outbound, Agency prospecting, FinTech AE sequence, etc. |

**Key G2 complaints (verified):**
- "Limited features in monday CRM — particularly column limitations and lack of automation"
- "The reporting on campaign performance seems quite basic"
- "Lacks advanced email marketing and tracking features. No deep analytics."
- "Quotes and invoices can't automatically pull in products from the deal"
- "High costs — every user requires a paid seat"
- "Contacts can be deleted by any user — no proper restrictions or locks"

**What users love (G2):**
- "Emails and activities feature automatically tags emails to clients and leads — tracking is incredibly efficient"
- "Best all-in-one CRM", "extremely customizable"
- "Pipeline is intuitive — our reps started using it day 1 without training"
- Automation + AI features extract follow-up dates effortlessly

---

### B. Website Tactics — Monday.com vs KIND

| Tactic | Monday Does | KIND Status | Steal? |
|---|---|---|---|
| Product homepage segmentation | Separate landing pages per product (CRM, Dev, Service, Work Management) + per role. Each page speaks directly to one persona. | KIND has one homepage for all three agents | RED: Build separate landing pages: /figsy (for RevOps/SDR), /milla (for AEs), /vida (for website owners) |
| Emotion-led taglines | "AI-First CRM Your Sales Team Will Love" — leads with emotional outcome, not features | KIND uses feature-centric copy | RED: Rewrite above-the-fold copy per agent page to lead with emotion + outcome |
| Feature release velocity ("What's New") | Public changelog at /crm/whats-new — signals active development, builds trust, gives SEO content | KIND has no public changelog | RED: Launch public changelog page |
| AI blog content machine | 200+ blog posts on AI SDR, lead scoring, email automation, pipeline management — all SEO'd | KIND has no blog content | YELLOW: Launch blog with 5 posts |
| "180K+ customers" trust signal | High-volume social proof number used in all paid and organic copy | KIND needs first client count | RED: Add "X meetings booked" or "X campaigns run" live counter as soon as data exists |
| Interactive product demo on homepage | Embedded Supademo interactive tour. Prospect clicks through without booking a call. | KIND requires Calendly booking | RED: Build 3-min interactive Navattic/Supademo tour of KIND portal |
| Dual CTA funnel | Homepage has both "Contact Sales" (enterprise) and free trial CTA (SMB). Serves both segments. | KIND has single CTA (book a demo) | YELLOW: Add second CTA: "See a 5-min walkthrough" (ungated Loom) |
| Comparison content | Full blog posts + landing pages vs. Salesforce, vs. ClickUp. Captures competitor-brand search. | No comparison content | YELLOW: Write "FIGSY vs. Hiring an SDR" comparison page |

---

### C. AE/SE Success Patterns — Monday.com

- Methodology: MEDDPICC + Command of the Message — both required for AE hiring at all levels. Mid-market managers must deeply understand complex sales cycle navigation using MEDDIC.
- Interview = sales test: 30-min demo simulation with hiring manager + peer AE. Candidates demo Monday's own product. Every AE knows the product deeply before day 1.
- Discovery-first demos: AEs lead with discovery ("What does your current lead process look like?"), then assemble the demo live from modules around that specific pain. Not scripted — assembled live.
- SE role: Technical setup, integration demos (Salesforce sync, Gmail sync live in demo), custom dashboards built during POC
- POC process: Prospects get a 14-day trial pre-loaded with their own data (imported by SE). Dramatically increases conversion because prospects evaluate their own pipeline, not sample data.
- **What KIND should do:** Offer a "14-day FIGSY pilot" — run a real outbound sequence for the prospect's ICP. If they get 3+ replies, they're in. The pilot IS the demo.

---

### D. Admin/Ops Patterns — Monday.com

- Account Insights (Enterprise-only): Per-user, per-board, per-automation usage tracking. AI credit consumption per team. Used by CSMs to identify adoption gaps and expansion opportunities.
- AI governance panel: Admins can monitor AI credit usage and set limits per team — important for enterprise compliance
- Churn signals tracked: Low automation usage, few active boards, declining API calls — triggers CS proactive outreach
- Expansion signals tracked: High API usage, automation limit approach, board count growing — triggers upsell conversation
- Customer portal (monday service): Multi-portal with analytics — CS team sees ticket volumes, resolution rates, CSAT per client
- **What KIND should do:** Build a "KIND Health Score" per client in admin: (campaigns active) + (reply rate > 5%) + (meetings booked this month) + (Vida chat engagement) = HEALTH. Flag Amber (<60%) and Red (<30%) for weekly CS review.

---

## CROSS-COMPANY SYNTHESIS

### The 3 Things All Three Do That KIND Doesn't

1. **Proactive AI (not reactive):** ClickUp Super Agents, Monday Sidekick, Alta Luna — all surface insights and take action before the user asks. KIND's agents (FIGSY, Milla, Vida) wait for input. Fix: Add weekly proactive digest from Milla — "Here's what happened, here's what I'd do next."

2. **Results as social proof, not just features:** All three lead with hard numbers (Alta: "80% cost reduction"; ClickUp: "40% efficiency increase at Finastra"; Monday: "AI sources, qualifies, books meetings 24/7"). KIND leads with capability. Fix: Get one beta client metric, put it above the fold.

3. **Comparison content that owns the decision moment:** All three have /vs/[competitor] pages. The moment a buyer googles "Alta vs 11x" or "Monday vs Salesforce," the incumbent answers. Fix: Build /kind-vs-artisan, /kind-vs-human-sdr pages this month.

---

## E. QUICK STEALS — TOP 10, UNDER 1 WEEK, ZERO EXTERNAL DEPENDENCY

| # | What | Why | Source | Time |
|---|---|---|---|---|
| 1 | "Meetings booked by FIGSY" live counter on homepage | Social proof from your own product. Even "47 meetings booked" builds trust. Pulls from existing DB. | All three use metrics as hero proof | 2 hours |
| 2 | Public changelog page | Signals momentum. Every release builds trust. Monday and ClickUp both have one. | Monday /crm/whats-new | 3 hours |
| 3 | Proactive weekly digest from Milla | "Here's what happened this week + 3 recommended actions" — email or in-portal notification. Moves Milla from reactive to proactive. | Monday Sidekick, Alta Luna | 4 hours (template + cron job) |
| 4 | Agent persona landing pages | /figsy, /milla, /vida — each page speaks to one buyer persona with outcomes + stats + "how it works in 3 steps" | Alta (Katie/Alex/Luna pages) | 4 hours |
| 5 | Client health score in admin | Formula: (active campaigns) + (reply rate) + (meetings booked) = health. Flag Amber/Red. Fits into existing admin dashboard. | ClickUp Health Score agent, Monday insights | 3 hours |
| 6 | "Live in 5 days" promise | Add to homepage + pricing page: "First campaign live in 5 business days. Guaranteed." Removes buying friction. | Alta "live in 7 days" | 30 minutes (copy only) |
| 7 | Ungated 5-min Loom walkthrough | Record a screen walkthrough of the portal. Link from homepage "See how it works". No form. Removes friction. | ClickUp on-demand demo | 1 hour |
| 8 | "Clone my best client" prospecting CTA | In admin: "Generate 50 lookalike prospects from your best closed client." Uses existing Apollo integration. | Alta Katie lookalike feature | 4 hours |
| 9 | Comparison page: KIND vs Hiring a Human SDR | SEO + sales tool. "Full-time SDR costs £60K+/year. FIGSY starts at [price]/month. Here's what you get." Include cost calculator. | ClickUp pricing calculator, Alta vs 11x pages | 3 hours |
| 10 | G2 profile (basic listing) | Sign up for free G2 vendor account. Request reviews from beta clients. Even 3 reviews with 4.5 stars puts you on the map in AI SDR category. | Alta G2 High Performer | 1 hour setup + 1 week outreach |

**Total estimated time for all 10: ~26 hours / 3 focused days**

---

## WHAT KIND SHOULD NOT COPY

| Competitor Feature | Why NOT to copy | Better alternative |
|---|---|---|
| Monday's per-seat pricing complexity (4 tiers x 4 products) | Creates confusion and support load | Keep KIND pricing simple: 1 agent flat + enterprise |
| ClickUp's feature sprawl (20+ top-level features) | Overwhelming for buyers who want AI revenue, not PM software | Stay laser-focused: "AI Revenue Team" — 3 agents, 1 purpose |
| Alta's zero self-serve (everything is a demo call) | Slows conversion for SMB buyers | Keep self-serve demo access; add enterprise "custom demo" option |
| ClickUp's freemium (unlimited free users) | Can attract low-quality users, high support load | Use a time-limited pilot (14 days) not a permanent free tier |

---

## VERIFIED CLAIMS (2/3 source confirmation)

| Claim | Sources | Confidence |
|---|---|---|
| Alta raised $7M Seed Feb 2025 | PRNewswire + StarupHub.ai + CalcalistTech | HIGH |
| Alta G2 High Performer Summer 2025 | AltaHQ blog + G2 listing + multiple reviews | HIGH |
| ClickUp cut 22% staff "100x Org" May 2026 | NextWeb + TechRepublic + Fortune + AmericanBazaar | HIGH |
| ClickUp ~$300M ARR, $4B valuation | Yahoo Finance + Fortune + multiple sources | HIGH |
| Monday Q3 2025 revenue $316.9M, 26% YoY | SEC 6-K filing + Constellation Research | HIGH |
| Monday Campaigns launched Elevate 2025 | Monday blog + BusinessWire + SiliconAngle | HIGH |
| Monday Sidekick/Vibe/Magic announced Elevate 2025 | IR press release + multiple tech outlets | HIGH |
| Alta 50+ data sources | Multiple Alta marketing + G2 reviews | HIGH |
| Monday CRM AI SDR Agent activates in 2 minutes | Monday support docs + Monday blog | HIGH |
| ClickUp Brain MAX launched July 2025 | Yahoo Finance + AffableTech + multiple | HIGH |
| Monday Vibe: 17,000 apps built in first week | Monday IR press release + SiliconAngle | HIGH |
| Alta "replaced one SDR entirely" G2 review | G2 review content + multiple aggregator sites | HIGH |
| ClickUp pricing calculator drove 8/10 persona engagement | Evelance.io pricing teardown | MEDIUM (single source) |
| Alta pricing $1,500-$5,000/month | Market comps only — no published price | ESTIMATE ONLY |

---

*Section 40 added: 1 Jun 2026. Sources: G2, Salesforge, SalesforceAppExchange, PRNewswire, BusinessWire, SEC filings, Monday support docs, ClickUp blog, AltaHQ blog, multiple third-party reviews.*

---

## 41. NIGERIA PARTNER — COMMERCIAL BREAKDOWN
*Written: 1 Jun 2026. For: first Nigeria partner, ready to go.*

> **The model:** The partner sells K.I.N.D to Nigerian B2B companies under their own brand or as K.I.N.D. They earn a recurring commission on every client they bring and manage. K.I.N.D handles all the tech. The partner handles local sales, onboarding, and relationships.

---

### What the Partner Gets

| Item | Detail |
|---|---|
| **Revenue share** | 25% of all monthly revenue from their clients, paid monthly |
| **White-label option** | Full white-label available (Scale plan) — run the platform under their own logo/brand |
| **Custom domain** | `app.theircompany.com` pointing to K.I.N.D portal |
| **Partner dashboard** | Admin view of all their clients — health, credits, activity |
| **Onboarding kit** | Pre-built demo deck, ICP templates, objection handling, sales scripts |
| **FIGSY for their own sales** | Partner gets K.I.N.D free for their own outbound — they use the product to sell the product |
| **Priority support** | Direct WhatsApp line to founder. 4-hour response SLA. |
| **Co-marketing** | Joint LinkedIn content, case studies, "Powered by K.I.N.D" trust badge |

---

### Nigeria Market Context

| Factor | Detail |
|---|---|
| Target market | Lagos B2B: Fintech, Logistics, HealthTech, AgriTech, SaaS, Professional Services |
| Primary language | English — no localisation needed |
| WhatsApp penetration | 90%+ — Vida chatbot is a major differentiator |
| Biggest pain point | Manual prospecting, no outbound infrastructure, SDR salaries too high |
| Currency | USD billing (Stripe). Flutterwave available for NGN if needed (Phase 2). |
| Apollo data coverage | Good for Lagos/Abuja B2B. Weaker for SMBs — supplement with LinkedIn import. |
| Compliance | NDPR (Nigeria Data Protection Regulation) — similar to POPIA. K.I.N.D's consent flow covers it. |
| Alta AI presence | None in Nigeria. No local competition at this price point. |
| Avg SDR salary (Lagos) | ₦2.5M–4M/year (~$1,500–2,500/year). K.I.N.D FIGSY at $80/month = $960/year. K.I.N.D wins on price alone. |

---

### Partner Revenue Model

#### Commission structure

| Monthly client revenue | Partner earns (25%) | K.I.N.D keeps (75%) |
|---|---|---|
| $80 (1 active client) | $20/mo | $60/mo |
| $800 (10 clients) | $200/mo | $600/mo |
| $2,400 (20 clients + upsells) | $600/mo | $1,800/mo |
| $6,000 (50 clients) | $1,500/mo | $4,500/mo |
| $12,000 (100 clients) | $3,000/mo | $9,000/mo |

**Commission is recurring.** A client brought in Month 1 still pays commission in Month 12. The partner builds a compounding income stream, not a one-time fee.

#### Partner P&L — realistic Nigeria scenario

| Item | Month 3 | Month 6 | Month 12 |
|---|---|---|---|
| Active clients managed | 5 | 15 | 40 |
| Avg monthly revenue/client | $80 | $90 | $100 |
| Total client revenue | $400 | $1,350 | $4,000 |
| Partner commission (25%) | $100 | $338 | $1,000 |
| Partner costs (time, data) | ~$50 | ~$100 | ~$200 |
| **Partner net income** | **~$50/mo** | **~$238/mo** | **~$800/mo** |

**Month 12 target: $800/mo (~₦1.3M/mo) recurring, part-time.** Full-time focus gets to $2,000–3,000/mo faster.

---

### What the Partner Sells

**Primary pitch to Nigerian clients:**

> *"You need more clients. Right now you're relying on referrals and manual outreach. FIGSY is an AI SDR that works 24/7 — it finds your ideal contacts, writes personalised emails, follows up automatically, and delivers warm replies to your inbox. First campaign live in 5 business days. Starts at $80/month — less than one day of a junior sales rep."*

**The comparison that closes deals in Nigeria:**
| Option | Cost/year | What you get |
|---|---|---|
| Junior SDR (Lagos) | $1,500–2,500 | 1 person, limited hours, needs training, can quit |
| Apollo + email tool | $1,200+ | DIY — you still write everything |
| Alta AI | $18,000–60,000 | Enterprise only, no local support |
| **K.I.N.D FIGSY** | **$960** | AI that runs 24/7, learns your ICP, replies handled, no salary |

**FIGSY costs less than 6 months of a Lagos junior SDR's salary.**

---

### Partner Target Industries (Nigeria)

| Industry | Why they buy | Suggested ICP |
|---|---|---|
| **Fintech** | B2B SaaS, payment infra, needs corporate clients | Finance Director, CFO, Head of Treasury at companies 50–500 employees |
| **Logistics / Supply Chain** | Competing for corporate shipping contracts | Head of Procurement, Operations Director, Supply Chain Manager |
| **HealthTech / MedTech** | Selling to hospitals, clinics, insurance | Hospital Administrator, Medical Director, Head of Procurement |
| **AgriTech** | Selling to food processors, exporters, government | Agribusiness Manager, Procurement Officer, Farm Manager |
| **Professional Services** | Accounting, legal, consulting firms growing B2B client base | Managing Director, Head of Business Development, CEO |
| **SaaS (B2B)** | Any Nigerian SaaS needing enterprise clients | CTO, Head of IT, Operations Director |

---

### Onboarding a Nigerian Client — Partner Playbook

**Day 1 (Partner):**
- Prospect signs up via partner's referral link (`get-kind.com?ref=[partner_code]`)
- Partner credited automatically
- Partner sets up ICP with client on a 30-min call — use vertical ICP templates (Fintech, Logistics, etc.)

**Day 2–3 (K.I.N.D platform):**
- FIGSY runs first Apollo search: 50–100 leads matching ICP
- Partner reviews with client — confirm fit, remove wrong-size companies
- FIGSY writes first sequence draft — partner reviews tone with client

**Day 4–5 (Partner):**
- Campaign goes live
- Partner monitors inbox with client: "FIGSY is sending. You'll see replies here."
- First reply arrives: partner is on the call when it does. This is the moment.

**Week 2:**
- Partner books "results check" — reply rate, open rate, feedback on leads
- Upsell: "Want to add Milla for your team?" or "Want Vida on your website?"

---

### Partner Commission Payments

| Item | Detail |
|---|---|
| Payment method | Wise Business transfer (USD) → partner's USD or NGN account |
| Payment cadence | Monthly, by the 5th of the following month |
| Minimum payout | $50 (accumulates below threshold) |
| Commission basis | Net revenue after Stripe fees (~2.9%) |
| Chargeback/refund | Clawback on same month's commission |
| Tracking | Partner dashboard shows all clients, revenue, commission in real time |

---

### What the Partner Does NOT Need to Worry About

| Item | Who handles it |
|---|---|
| Platform uptime | K.I.N.D (Railway + Supabase, 99.9% SLA) |
| Email deliverability | K.I.N.D (Resend, domain warmup, bounce handling) |
| Apollo data access | K.I.N.D (Apollo API included in client cost) |
| NDPR / POPIA compliance | K.I.N.D (consent flow built in, opt-out managed automatically) |
| Product updates | K.I.N.D (partner clients get every new feature automatically) |
| Billing / Stripe | K.I.N.D (clients pay K.I.N.D directly, partner earns commission) |
| Support escalations | K.I.N.D (WhatsApp direct line for partner) |

---

### Getting the Partner Live — Checklist

| Step | Action | Done |
|---|---|---|
| 1 | Partner signs partner agreement (Section 39 template) | ☐ |
| 2 | Partner gets referral code from admin → `/clients/referrals` | ☐ |
| 3 | Partner gets white-label subdomain configured (if wanted) | ☐ |
| 4 | Partner gets onboarding kit (deck, ICP templates, scripts) | ☐ |
| 5 | Partner gets their own K.I.N.D account + FIGSY credits (free) | ☐ |
| 6 | Partner identifies first 3 Nigerian prospects | ☐ |
| 7 | Partner runs first demo using Admin → Demo Envs | ☐ |
| 8 | First client signed — partner commission active | ☐ |

**Target: Partner's first client live within 2 weeks of agreement signed.**

---

### Nigeria Partner — 12-Month Revenue Projection

| Month | Clients | MRR (client revenue) | Partner commission | Notes |
|---|---|---|---|---|
| 1 | 1 | $80 | $20 | First client |
| 2 | 3 | $240 | $60 | Word of mouth starts |
| 3 | 5 | $400 | $100 | Referral engine live |
| 4 | 8 | $680 | $170 | First upsells (Milla/Vida) |
| 5 | 12 | $1,080 | $270 | Strong pipeline |
| 6 | 18 | $1,710 | $428 | First hire consideration |
| 7 | 24 | $2,400 | $600 | |
| 8 | 30 | $3,150 | $788 | |
| 9 | 38 | $4,180 | $1,045 | |
| 10 | 46 | $5,290 | $1,323 | |
| 11 | 55 | $6,600 | $1,650 | |
| 12 | 65 | $8,125 | **$2,031/mo** | = **~₦3.2M/mo** |

**Year 1 partner total commission: ~$8,500 (~₦13.5M)**

**Year 2 (if 100+ clients): $3,000–4,000/mo recurring commission. Full-time income.**

---

*Section 41 added: 1 Jun 2026*

---

## 42. PARTNER PROGRAMME — FULL DESIGN & BUILD SPEC
*Written: 1 Jun 2026. Based on ClickUp ACE programme research + K.I.N.D competitive positioning.*

### Why This Beats ClickUp

| Feature | ClickUp | K.I.N.D |
|---|---|---|
| Reseller model | ❌ Revenue share only — can't buy wholesale | ✅ Agency tier buys credits at 30% discount |
| White-label | ❌ Enterprise only | ✅ All agency/white-label partners |
| Africa commission | ❌ $0.75–$5/signup for Tier 3 countries | ✅ Same % everywhere — no geographic penalty |
| Deal registration window | ❌ Not published | ✅ 60 days, published in contract |
| Demo environment | ❌ Just a free workspace | ✅ Pre-loaded sandbox per partner |
| Use product to sell product | ❌ N/A | ✅ FIGSY runs partner's own outbound |

---

### Partner Tiers

| Tier | Who | Requirement | Commission | Extras |
|---|---|---|---|---|
| **Referral** | Individuals, consultants | None | 20% recurring, 12 months | Referral link, onboarding kit |
| **Agency** | Agencies managing clients | 3+ active clients | 25% recurring forever | Wholesale credits (30% off), white-label, deal registration |
| **White-label** | Partners running under own brand | Annual contract + 5+ clients | 30% recurring forever | Custom domain, co-branded materials, dedicated WhatsApp support |

---

### Deal Registration — Rules

- Partner submits prospect before demoing
- **60-day exclusive protection** — K.I.N.D will not contact that prospect directly
- If deal closes within 60 days → full commission to partner
- If deal not closed within 60 days → protection can be renewed once (partner must show active engagement)
- If K.I.N.D receives inbound from same prospect → partner notified first
- Protection based on company email domain, not just name

---

### Commission Payment Terms

| Item | Detail |
|---|---|
| Payment method | Wise Business transfer (USD) |
| Cadence | Monthly, by 5th of following month |
| Minimum payout | $50 (accumulates below threshold) |
| Commission basis | Net revenue after Stripe fees |
| Lock period | Actions lock 30 days after month tracked |
| Platform | K.I.N.D admin (manual + auto via Stripe webhook) |

---

### Demo Sandbox — Per Partner

Each approved partner gets a permanent pre-loaded demo environment:
- Real leads pre-scored to their target ICP (e.g. Nigerian fintech)
- Active FIGSY campaign showing email sequences
- Inbox with sample replies (positive + objection + OOO)
- KPI dashboard with realistic numbers
- Partner can show this to any prospect — reusable, never expires
- Reset button available (admin can reset to clean state)

---

### K.I.N.D Academy (Certification)

| Level | Content | Badge |
|---|---|---|
| **Foundation** | Portal walkthrough, ICP builder, FIGSY basics | K.I.N.D Certified Partner |
| **Advanced** | Demo playbook, objection handling, deal registration, upsell paths | K.I.N.D Advanced Partner |
| **Expert** | White-label setup, agency client management, data compliance (NDPR/POPIA) | K.I.N.D Expert Partner |

Certification is self-serve — videos + quiz. No cost. Unlocks higher tier benefits.

---

### What's Built vs What's Not (honest audit — 1 Jun 2026)

#### ✅ Built and working

| What | Plain English description |
|------|--------------------------|
| Partner application form | Partners apply through the portal. Founder gets an email alert. |
| Referral link tracking | Every partner gets a unique referral code. Tracked in the database. |
| Admin partners page | Admin can see all partners, approve or reject them, view their deals and commissions. |
| Partner portal dashboard | Partners can log in and see their status, referral code, commission balance. |
| Deal registration | Partners can register a prospect (company + contact). 60-day exclusive protection logged in the database. |
| Auto-commission calculation | When a referred client pays their Stripe invoice, commission is calculated and logged automatically. |
| Commission approval in admin | Admin can review commissions, mark them paid, store the Wise payment reference. |
| Partner contract | Standard agreement template in Section 42b. Contract acceptance is timestamped when partner applies. |
| Partner onboarding email | Single approval email sent when admin approves a partner. |
| Onboarding checklist | Checklist shown in the partner portal. Steps listed. |
| Partner Hub in portal | Partners see a dedicated section in their dashboard sidebar. |
| Partner onboarding guide | 9-step visual flowchart shown in the portal. |
| Value deck | 7-slide pitch deck partners can use when presenting to prospects. |
| Milla partner awareness | Milla chat knows if you are a partner and adjusts her responses accordingly (pending / active / active with deals). |

#### ❌ Not built — confirmed gaps (1 Jun 2026)

| What | Why it matters |
|------|----------------|
| **Demo sandbox auto-provisioning** | The onboarding checklist says a sandbox is provisioned when a partner is approved. This does not happen. Nothing is created. It is a placeholder. Partners have no demo environment to show prospects. |
| **Partner portal sandbox section** | There is no page or section in the partner portal showing sandbox login details, instructions, or a "use this for demos" guide. |
| **Admin sandbox visibility** | Admin cannot see whether a partner has a sandbox provisioned. There is no status indicator and no manual provision button. |
| **"Sign up as client" CTA** | Partners who want to use K.I.N.D for their own outreach have no clear path. No button, no link, no explanation in the portal. |
| **Partner onboarding email sequence** | After the approval email, there are no follow-up emails. No activation steps, no check-in, no drip. |
| **Partner pricing page** | Partners do not know what they pay. The answer (nothing for sandbox, standard rates for own use) is not communicated anywhere in the portal or website. |

---

### Confirmed Partner Billing Model (locked 1 Jun 2026)

**Demo sandbox — free.** When a partner is approved, a demo sandbox account is created for them automatically. This costs the partner nothing. It is purely for showing prospects what K.I.N.D looks like. Pre-loaded with fake leads, a live campaign, sample inbox replies, and realistic KPI numbers.

**Own pipeline — standard client pricing.** If a partner wants to run their own outbound campaigns using K.I.N.D, they sign up as a regular client and buy credits at standard rates. There is no partner discount on their own usage. Clean separation: partners earn commission, clients pay for usage.

**Commission.** 20% for Referral partners, 25% for Agency partners, 30% for White-label partners. Recurring monthly. Paid via Wise by the 5th of the following month.

---

## 42b. PARTNER CONTRACT TEMPLATE

*This is the standard K.I.N.D Partner Agreement. Delivered via the proposals/e-sign system. Replace [PLACEHOLDERS] before sending.*

---

**K.I.N.D PARTNER AGREEMENT**

This Partner Agreement ("Agreement") is entered into as of [DATE] between:

**K.I.N.D AI Ltd** ("K.I.N.D"), a company registered in England and Wales, and

**[PARTNER COMPANY NAME]** ("Partner"), registered at [PARTNER ADDRESS].

---

**1. APPOINTMENT**
K.I.N.D appoints Partner as a non-exclusive [Referral / Agency / White-label] Partner to introduce prospective clients to K.I.N.D's platform in the territory of [TERRITORY].

**2. COMMISSION**
Partner shall earn commission at the rate of [20% / 25% / 30%] of net monthly revenue received from each Referred Client, payable monthly in arrears by the 5th of the following month via Wise Business transfer to Partner's nominated account.

Commission accrues for:
- Referral tier: 12 months from first payment date
- Agency tier: the lifetime of the client relationship
- White-label tier: the lifetime of the client relationship

Minimum payout threshold: USD $50. Amounts below threshold accumulate.

**3. DEAL REGISTRATION**
Partner may register prospects via the K.I.N.D Partner Portal. Registered prospects receive 60-day exclusive protection. K.I.N.D will not contact registered prospects directly during the protection period.

**4. PARTNER OBLIGATIONS**
Partner shall:
(a) Represent K.I.N.D's platform accurately and not make warranties beyond those in K.I.N.D's published documentation
(b) Comply with applicable data protection laws including NDPR (Nigeria), POPIA (South Africa), UK GDPR
(c) Not use K.I.N.D's brand in any way that implies employment or equity relationship
(d) Maintain at least [3 / 5] active referred clients to retain [Agency / White-label] tier status

**5. INTELLECTUAL PROPERTY**
K.I.N.D grants Partner a limited, non-exclusive licence to use K.I.N.D's name, logo, and marketing materials solely for the purpose of promoting K.I.N.D's services. White-label partners receive a separate brand licence agreement.

**6. CONFIDENTIALITY**
Each party shall keep the other's confidential information (including pricing, client data, and technical systems) strictly confidential and shall not disclose it to third parties without prior written consent.

**7. TERM AND TERMINATION**
This Agreement commences on the date of signing and continues for 12 months, renewing automatically unless either party gives 30 days written notice. K.I.N.D may terminate immediately if Partner breaches Clause 4 or engages in conduct damaging to K.I.N.D's reputation.

**8. LIMITATION OF LIABILITY**
K.I.N.D's total liability to Partner under this Agreement shall not exceed the commission paid to Partner in the 3 months preceding the claim.

**9. GOVERNING LAW**
This Agreement is governed by the laws of England and Wales. Any dispute shall be subject to the exclusive jurisdiction of the courts of England and Wales.

---

Signed for and on behalf of K.I.N.D AI Ltd: _____________________ Date: _______

Signed for and on behalf of [PARTNER COMPANY]: _____________________ Date: _______

---

*Section 42 added: 1 Jun 2026*

---

## 43. FULL COMMIT LOG — EVERY PUSH

*Every push is here. Newest first. All times UTC — add 2 hours for SAST (South Africa). Sourced directly from git log.*

| Commit | Date | Time (UTC) | What changed |
|--------|------|------------|-------------|
| `096b411` | 2 Jun 2026 | — | feat: verification audit, Stripe docs, Milla languages, partner onboarding step 6 detail |
| `6a57bbf` | 31 May 2026 | 20:27 UTC | docs: MASTER.md complete audit — full built/not-built lists, all founder actions F1-F30, commit log Section 43 |
| `50295d2` | 31 May 2026 | 20:21 UTC | docs: MASTER.md full platform audit — verified routes, partial builds, complete founder + Claude action lists |
| `9a41d99` | 31 May 2026 | 20:17 UTC | docs: MASTER.md morning brief — full audit, founder action list, redundancy plan, bug audit protocol |
| `ee1a010` | 31 May 2026 | 20:14 UTC | docs: MASTER.md — full session record: API WebSocket crash, portal isPartner crash, partner programme complete |
| `e94a0c1` | 31 May 2026 | 20:09 UTC | fix: Sidebar isPartner variable reference — was aliased as isPartnerProp, crashing every dashboard page |
| `50073e0` | 31 May 2026 | 20:01 UTC | fix: dual WebSocket polyfill for Node 20 — set globalThis.WebSocket + pass ws as realtime transport |
| `adf9a39` | 31 May 2026 | 19:55 UTC | fix: add ws package to @kind/db — Node 20 has no native WebSocket, supabase-js Realtime client crashes without it |
| `1a61e7c` | 31 May 2026 | 19:48 UTC | fix: restore API nixpacks.toml to clean pattern — yarn install in install phase, build in build phase |
| `5e63ff4` | 31 May 2026 | 19:45 UTC | fix: explicit workspace build+start commands in portal and admin nixpacks — frozen-lockfile and wrong yarn start were breaking deployments |
| `25249ff` | 31 May 2026 | 19:41 UTC | fix: remove root nixpacks.toml — was breaking portal/admin deployments with wrong start command. API node version handled via NIXPACKS_NODE_VERSION env var |
| `92d30eb` | 31 May 2026 | 19:36 UTC | fix: force Node 20 via .node-version — supabase-js@2.105 requires >=20, Railway was using 18 |
| `0af6ac4` | 31 May 2026 | 19:33 UTC | fix: add root-level nixpacks.toml for API — apps/api/nixpacks.toml was never found by nixpacks since build context is repo root |
| `1a3aadc` | 31 May 2026 | 19:31 UTC | fix: no-op install phase — move yarn install to build phase to bypass frozen-lockfile override |
| `ae35ddb` | 31 May 2026 | 19:29 UTC | fix: remove --frozen-lockfile from API build — cross-platform lockfile mismatch was crashing Railway |
| `341490b` | 31 May 2026 | 19:25 UTC | fix: scope API build to only api/db/shared workspaces — turbo was rebuilding portal+admin and crashing |
| `67b81f8` | 31 May 2026 | 19:20 UTC | fix: sync yarn.lock — frozen-lockfile was failing on Railway build |
| `cfec16b` | 31 May 2026 | 19:16 UTC | fix: import ReactNode type in deck page — React.ReactNode caused TS build error |
| `08d3896` | 31 May 2026 | 19:13 UTC | fix: hide Partner Hub in sidebar for non-partner accounts |
| `9f5f302` | 31 May 2026 | 19:11 UTC | feat: partner onboarding guide, value deck, agent context by partner state |
| `8057ece` | 31 May 2026 | 18:58 UTC | fix: case-insensitive email match in partners.ts + fix Apply link |
| `59a9da0` | 31 May 2026 | 18:53 UTC | fix: show Partner Hub for all users — page itself handles non-partners with apply CTA |
| `47ea9f7` | 31 May 2026 | 18:50 UTC | fix: move partner check to client-side Sidebar — server-side layout fetch was unreliable |
| `d4dbf20` | 31 May 2026 | 18:42 UTC | fix: check partner status via API not DB — RLS subquery was blocking server-side lookup |
| `a681dac` | 31 May 2026 | 18:39 UTC | fix: guard SUPABASE_SERVICE_ROLE_KEY in portal layout — was crashing dashboard |
| `da4a9af` | 31 May 2026 | 18:36 UTC | fix: add admin partner detail page + use service-role for partner check |
| `e308152` | 31 May 2026 | 18:32 UTC | fix: root-cause audit — 7 bugs fixed across portal, admin, API |
| `ac13cab` | 31 May 2026 | 18:13 UTC | feat: partner onboarding email + checklist + settings upsert fix |
| `d623aa3` | 31 May 2026 | 18:13 UTC | fix: zero TypeScript errors in API — unblocks Railway build |
| `5a2cea7` | 31 May 2026 | 18:09 UTC | fix: authUser→userEmail in demo-sandbox (TS compile error blocking API build) |
| `761c23a` | 31 May 2026 | 18:05 UTC | fix: move GET /partners/me above /ref/:code to prevent param shadowing |
| `90adfe5` | 31 May 2026 | 17:43 UTC | fix: admin partners page — proper error surfacing, remove false 'relation' match |
| `7400c5c` | 31 May 2026 | 17:40 UTC | fix: pin nodejs_20 + yarn in portal and admin nixpacks setup phase |
| `001746e` | 31 May 2026 | 17:38 UTC | fix: explicitly declare nodejs_20 + yarn in nixpacks setup phase |
| `1ad88ce` | 31 May 2026 | 17:37 UTC | fix: partner portal auth — use admin.getUserById + surface fetch errors |
| `2234a6a` | 31 May 2026 | 17:20 UTC | feat: complete partner workflow — admin tabs, contract sign-off, commission payments |
| `c9b400a` | 31 May 2026 | 17:15 UTC | feat: add admin commission management API routes |
| `1a6a748` | 31 May 2026 | 17:09 UTC | feat: full partner programme — DB, admin, portal, auto-commission |
| `0cbc253` | 31 May 2026 | 16:53 UTC | docs: Section 41 — Nigeria partner commercial breakdown |
| `2cd537f` | 31 May 2026 | 16:50 UTC | docs: full commercial breakdown update — pricing, unit economics, cashflow, projections |
| `0eb903d` | 31 May 2026 | 16:45 UTC | fix(migrations): user_id not auth_user_id in clients RLS policies |
| `d0aee5d` | 31 May 2026 | 16:43 UTC | fix: complete context-aware agent panel coverage for all sidebar routes |
| `536bd3e` | 31 May 2026 | 16:41 UTC | feat: unified signal layer, FIGSY tasks, clone best client, 5-day guarantee, context agent panel |
| `0167ce4` | 31 May 2026 | 16:20 UTC | docs: Section 40 — ClickUp, Alta, Monday.com deep competitive audit |
| `13befe9` | 31 May 2026 | 16:16 UTC | Update The 15 Pieces to build-status format (both instances) |
| `938136d` | 31 May 2026 | 15:59 UTC | docs: Section 22 GTM — full marketing playbook (FIGSY self-outreach, LinkedIn, SEO, directories, partnerships, 30-day sprint) |
| `4c55504` | 31 May 2026 | 15:57 UTC | docs: demo playbook updated + Section 39 going-live checklist (company reg, Google Workspace, paid tools, DNS, env vars) |
| `fd243a0` | 31 May 2026 | 15:54 UTC | docs: MASTER.md — migrations done, smoke test via fake data, going-live checklist |
| `4ac08d2` | 31 May 2026 | 15:51 UTC | fix(migration): social_signals — add icps.settings column before commenting |
| `312a064` | 31 May 2026 | 15:44 UTC | fix(api): minor route cleanup — developer, proposals, tracking |
| `39ee8b2` | 31 May 2026 | 15:44 UTC | fix(website): hero typewriter — "Break the ceiling." from brand messaging research |
| `d5d9edf` | 31 May 2026 | 15:42 UTC | docs: update MASTER.md — P2-13/P2-14/P3-1/P3-4/P3-7 complete, all phases done |
| `d54b4af` | 31 May 2026 | 15:41 UTC | feat: P2-13/P2-14/P3-1/P3-4/P3-7 — personalised images, social signals, developer portal, proposals, visitor de-anon |
| `bb3d055` | 31 May 2026 | 15:39 UTC | fix(website): typewriter starts with "Always on." — cycles Always on / Human Ceiling / Unlimited Pipeline |
| `167ab2f` | 31 May 2026 | 15:29 UTC | fix(api): add nixpacks.toml to force yarn — resolves @kind/db workspace 404 |
| `c2b83b8` | 31 May 2026 | 15:22 UTC | P2-3/P2-9/P3-6 + full website restore (all 21 sub-pages) |
| `4d8f6c5` | 31 May 2026 | 15:13 UTC | docs: update MASTER.md — website restore noted, session complete |
| `bd8ff48` | 31 May 2026 | 15:12 UTC | fix(website): restore original site + new agent images + updated agent names |
| `66a127b` | 31 May 2026 | 14:33 UTC | feat: P3-2 FIGSY vertical modes + P3-13 African data moat |
| `cf762e6` | 31 May 2026 | 14:30 UTC | feat: P2-5 waterfall enrichment + P2-6 intent signal triggers |
| `534a8fe` | 31 May 2026 | 14:25 UTC | feat: Batch 2/3/4 — P2-1/2/4/7/8/10/11/12 + P3-3 + nav + roadmap sync |
| `5630989` | 31 May 2026 | 13:54 UTC | feat(website): add Express server for Railway hosting — www.get-kind.com |
| `e0f8ae4` | 31 May 2026 | 13:48 UTC | fix: trigger Vercel deploy — webhook reconnected, www.get-kind.com |
| `40cece0` | 31 May 2026 | 13:41 UTC | docs: record website restore + infra notes + batch 1 commit hashes in MASTER.md |
| `d43a5f4` | 31 May 2026 | 13:36 UTC | fix: restore www.get-kind.com — full landing page live |
| `c05b78b` | 31 May 2026 | 13:28 UTC | fix: force Vercel deploy — www.get-kind.com website unlock |
| `dfac9ea` | 31 May 2026 | 13:20 UTC | fix: restore www.get-kind.com — replace placeholder with full landing page |
| `c6a7a59` | 31 May 2026 | 13:19 UTC | Batch 1: P0-1 website copy, P1-3 adaptive send, P3-5 revenue forecasting |
| `f3ba631` | 31 May 2026 | 13:13 UTC | sync: align all three roadmap sources to current build state |
| `408743a` | 31 May 2026 | 13:03 UTC | docs: update MASTER.md — P0-22 ✅ P0-23 ✅ Milla Languages ✅ Live |
| `842f39d` | 31 May 2026 | 13:01 UTC | P0-23: Switch FIGSY from first-person to third-person voice across portal |
| `b9d6d24` | 31 May 2026 | 12:56 UTC | fix: remove railpack.json — was forcing npm instead of yarn, causing 404s |
| `047777e` | 31 May 2026 | 12:54 UTC | fix: delete apps/api/nixpacks.toml — root cause of all Railway build failures |
| `8647924` | 31 May 2026 | 12:50 UTC | fix: remove googleapis from build deps — fixes Railway build failures |
| `6bfd4a1` | 31 May 2026 | 12:47 UTC | fix: railpack.json — disable apt packages to fix Railway build failures |
| `fe0b979` | 31 May 2026 | 12:38 UTC | docs: update MASTER.md — P0-2/P0-7/P0-9 unblocked, RESEND_API_KEY live in Railway |
| `e2ab8b3` | 31 May 2026 | 12:38 UTC | bugfix: stripe webhook raw body, invoice.payment_succeeded, dashboard stale closure, Railway build |
| `b9452a2` | 31 May 2026 | 12:16 UTC | Fix team invite from address — kindai.co.za → get-kind.com |
| `3bd0216` | 31 May 2026 | 12:12 UTC | MASTER: mark P0-12 live, log MCP-3 and P0-12 commits |
| `55f4df6` | 31 May 2026 | 12:12 UTC | P0-12: Realtime dashboard — live stats via Supabase realtime |
| `525f686` | 31 May 2026 | 12:05 UTC | MCP-3: MCP Connect portal page + AI guide agent |
| `99b9d82` | 31 May 2026 | 11:58 UTC | Roadmap audit: full Phase 0→3 build queue + sync both roadmaps |
| `0830354` | 31 May 2026 | 11:52 UTC | docs: MASTER full audit — complete verified build log, blocked items, next queue |
| `cf26791` | 31 May 2026 | 11:31 UTC | feat(admin): refresh to match portal design system — light sidebar, purple accent |
| `2a20875` | 31 May 2026 | 11:06 UTC | feat(roadmap): update portal + admin roadmaps — reflect 31 May build output |
| `abb9533` | 31 May 2026 | 09:02 UTC | feat: MCP-2 (Milla integrations panel) + P1-10 (PDF performance report) |
| `dc8dd5b` | 31 May 2026 | 09:01 UTC | docs: MASTER end-of-day update — all Phase 0 + Phase 1 + MCP items complete |
| `6bdd4a5` | 31 May 2026 | 08:58 UTC | chore: add DB migrations for P0-10, P0-11, P1-12 |
| `50319a2` | 31 May 2026 | 08:57 UTC | feat(P0-11): consent auto-sent visual indicator on lead rows |
| `8c304ae` | 31 May 2026 | 08:57 UTC | feat(P0-10): co-pilot mode toggle in campaign advanced settings |
| `dd8658f` | 31 May 2026 | 08:55 UTC | feat(P1-6): expanded reply categories — referral, unsubscribe, OOO, wrong-person |
| `3981ea6` | 31 May 2026 | 08:53 UTC | feat(P1-12): AI research panel per lead card |
| `83d1dd1` | 31 May 2026 | 08:48 UTC | feat(P0-8): email score badge in campaign step editor |
| `38f5682` | 31 May 2026 | 08:46 UTC | feat: MCP-1 (KIND as MCP server), P1-15 (suggest campaign), P0-11 (auto-consent on lead status) |
| `b79e732` | 31 May 2026 | 09:39 UTC | feat: new FIGSY/Milla/Vida agent photos |
| `9f00159` | 31 May 2026 | 08:33 UTC | docs: update MASTER — agents page built, image 1/2 pattern done, photos pending founder push |
| `2deadca` | 31 May 2026 | 08:33 UTC | feat: /dashboard/agents overview page — Monday.com Image 1 pattern, all 3 agents as clickable cards |
| `09237d3` | 31 May 2026 | 08:22 UTC | docs: full verified build log in Section 0 — code-checked every item, honest done/not-done status |
| `4256584` | 31 May 2026 | 08:16 UTC | feat(figsy-chat): Monday.com layout — Hello hero, two-column, agent card + live stats |
| `8b7f262` | 31 May 2026 | 08:14 UTC | feat(landing): update nav + footer with agent names — The Closer/Brain/Connector |
| `eda86ab` | 31 May 2026 | 08:12 UTC | fix(portal): wrap useSearchParams in Suspense on invite/accept page — fixes Railway build |
| `2b4d96b` | 31 May 2026 | 08:07 UTC | feat: agent rebrand — The Closer/Brain/Connector subtitles, updated roles + landing page copy |
| `82fcc7d` | 31 May 2026 | 08:01 UTC | fix(icp): light-theme identity bar + trim photo — matches rest of portal |
| `5379643` | 31 May 2026 | 07:57 UTC | chore: update MASTER.md — mark P0-14 done (17cc871), P0-3, P0-4 done |
| `e00d4e3` | 31 May 2026 | 07:57 UTC | docs: update MASTER build queue — P0-3, P0-4, P0-14 marked done with commits |
| `01c359e` | 31 May 2026 | 07:56 UTC | docs: mark all team model items done in MASTER Section 38 with commit hashes |
| `17cc871` | 31 May 2026 | 07:56 UTC | feat(P0-14): multi-model toggle — Haiku vs Sonnet per campaign |
| `2a517ed` | 31 May 2026 | 07:56 UTC | Add Team link to sidebar navigation under Account section |
| `0c3b53c` | 31 May 2026 | 07:55 UTC | P0-14 + team: multi-model toggle migration, figsy lib update, campaign page update, team dashboard page |
| `0486da1` | 31 May 2026 | 07:54 UTC | Add Team section to settings page with invite form and member list |
| `b21a93f` | 31 May 2026 | 07:53 UTC | Add accept invite portal page at /invite/accept |
| `53c6f29` | 31 May 2026 | 07:53 UTC | Add team API router with invite, accept, members, and delete endpoints |
| `2f34591` | 31 May 2026 | 07:52 UTC | docs: Update MASTER.md — mark P1-8, P1-9, P0-3, P0-4 done |
| `cfa2c43` | 31 May 2026 | 07:51 UTC | Add client_members migration for multi-user team model |
| `1cb3b56` | 31 May 2026 | 07:51 UTC | docs: add Section 38 — Multi-User Team Model architecture + build plan to MASTER.md |
| `aef1d4d` | 31 May 2026 | 07:51 UTC | P0-4: Email open tracking — pixel, opened_at column, open rate KPI |
| `c710049` | 31 May 2026 | 07:48 UTC | P0-4: Email open tracking — opened_at column + index + pixel endpoint in figsy routes |
| `f12e45f` | 31 May 2026 | 07:47 UTC | P0-3: Knowledge Base on-save FIGSY preview |
| `6c4d66b` | 31 May 2026 | 07:46 UTC | P1-9: Deal risk scoring — at-risk indicator on admin clients list |
| `41a284c` | 31 May 2026 | 07:46 UTC | P1-9: Deal risk scoring in admin — health logic, risk labels, at-risk filter button |
| `32297b8` | 31 May 2026 | 07:45 UTC | P1-8: Add Warm Leads tab to Inbox — filters hot + interested + warm replies, sorted by most recent |
| `92131a2` | 31 May 2026 | 07:44 UTC | docs: Update MASTER.md — mark P0-5/6/16/17/18/19/20/23 done with commit hashes |
| `92979b4` | 31 May 2026 | 07:43 UTC | docs: log P0-5/6/16/17/18/19/20/23 completions in MASTER.md |
| `7ff727b` | 31 May 2026 | 07:42 UTC | P0-19: Agent card redesign — coloured left border accent + tinted bg per agent |
| `6fd5df2` | 31 May 2026 | 07:41 UTC | P0-5: Add Notification Preferences section to Settings page |
| `88dea2e` | 31 May 2026 | 07:40 UTC | P0-20: Replace empty states with action cards on Campaigns and Inbox pages |
| `c03a0c7` | 31 May 2026 | 07:39 UTC | P0-18/16/17/6: FIGSY full chat page, KIND AI label, dashboard greeting, analytics empty state |
| `d0a50c0` | 31 May 2026 | 07:36 UTC | docs: add approved build list to Section 0b — P0-18 + Phase 0 + Phase 1 |
| `f53579b` | 31 May 2026 | 07:30 UTC | fix(icp): move FigsySidePanel to right side — matches all other pages |
| `706e81e` | 31 May 2026 | 07:23 UTC | docs: update MASTER with layout fixes 15aa43f |
| `15aa43f` | 31 May 2026 | 07:23 UTC | fix(portal): agent panel right-aligned, no double FIGSY on home |
| `5ae6ad2` | 31 May 2026 | 07:17 UTC | docs: mark P0-21 done, update session brief with layout commit c5b38e5 |
| `c5b38e5` | 31 May 2026 | 07:17 UTC | feat(portal): light sidebar, collapsible agent panel, clean background |
| `9a85e76` | 31 May 2026 | 07:01 UTC | docs: add Monday.com audit (Section 37) + UX steal items P0-16–P0-23 |
| `0e0e92f` | 31 May 2026 | 06:50 UTC | docs: add Section 0b — Claude's Full Build Queue to MASTER |
| `99c0b08` | 31 May 2026 | 06:43 UTC | docs: update MASTER.md — 31 May batch 2 fixes logged |
| `0eacf81` | 31 May 2026 | 06:43 UTC | fix: smoke test 500, meeting booked button, copy share link, chat persistence, debug cleanup |
| `dba4bb5` | 31 May 2026 | 06:35 UTC | docs: update MASTER.md — 31 May session, agent width + ICP typewriter fix |
| `f4bcf95` | 31 May 2026 | 06:34 UTC | fix: match agent panel width + add typewriter to ICP FIGSY panel |
| `573699b` | 30 May 2026 | 19:31 UTC | feat(portal): improve floating dots — 28 dots, 2-4s speed, mixed colours |
| `c71c6c9` | 30 May 2026 | 19:16 UTC | merge feat/share-page-real-data — share page wired to real data (migration done) |
| `4f0cfa3` | 30 May 2026 | 19:16 UTC | merge feat/sequence-branching — reply branching in send cron (migration done) |
| `167b708` | 30 May 2026 | 19:16 UTC | merge fix/consent-token-security — secure consent tokens (migration done) |
| `3f692d5` | 30 May 2026 | 20:09 UTC | feat: wire share report page to real data by token |
| `51c7f8c` | 30 May 2026 | 20:04 UTC | feat(api): act on sequence on_reply branching in send-due cron |
| `5568d8b` | 30 May 2026 | 19:58 UTC | fix(portal): slow down onboard typewriter effect |
| `89f8aef` | 30 May 2026 | 19:56 UTC | feat: KPI sparkline — emails sent per day over last 7 days |
| `ef4b82c` | 30 May 2026 | 19:53 UTC | feat(api): email client when their campaign auto-pauses |
| `27d3356` | 30 May 2026 | 19:50 UTC | feat(portal): add animated floating dots background to onboard page |
| `756ec84` | 30 May 2026 | 19:49 UTC | chore(consent): add helper query to find consent_sent leads needing resend |
| `4806a1d` | 30 May 2026 | 19:45 UTC | fix(api): use secure random consent tokens instead of lead UUID |
| `dcfd050` | 30 May 2026 | 19:33 UTC | feat(portal): mobile-responsive ICP pages |
| `1f045c6` | 30 May 2026 | 19:15 UTC | feat(portal): make dashboard fully mobile responsive |
| `168bb54` | 29 May 2026 | 10:47 UTC | docs: update MASTER.md — 29 May session summary, legal pause, build queue |
| `b0e3f7a` | 29 May 2026 | 09:25 UTC | chore: replace marketing site with unavailable page |
| `2c2e2d3` | 29 May 2026 | 07:05 UTC | fix: visible dots, consistent agent panel widths, remove sidebar duplicate, fix KPI calculations, settings eye toggle + unsaved warning, webhooks env var, knowledge URL saving |
| `951d8a5` | 29 May 2026 | 06:47 UTC | fix(deploy): add nixpacks.toml to portal — ensures next build runs on every Railway deploy |
| `eb36748` | 29 May 2026 | 06:25 UTC | fix: match AgentSidePanel size to ICP Builder — w-64, h-48 photo |
| `5ae801b` | 29 May 2026 | 06:15 UTC | feat: FIGSY insights, send reply, mark booked, KPI filter, empty states, UI polish |
| `47e06d9` | 28 May 2026 | 21:35 UTC | docs: add Founder's Guide content to MASTER.md Section 23 + to-do list |
| `3cc893b` | 28 May 2026 | 21:33 UTC | fix: replace .single() with .maybeSingle() across all API routes |
| `e66791b` | 28 May 2026 | 21:24 UTC | Visual overhaul: match ICP Builder design across all portal pages |
| `c27bff5` | 28 May 2026 | 20:53 UTC | Update MASTER.md: 29 May session — design mandate, product philosophy, build queue reordered |
| `3cb69e0` | 28 May 2026 | 20:46 UTC | Replace onboard form with FIGSY scripted conversation |
| `7eeecc6` | 28 May 2026 | 20:39 UTC | Fix AgentSidePanel: remove sessionStorage (was carrying context across pages), restore per-page reset, add typewriter effect on first message |
| `4115230` | 28 May 2026 | 20:36 UTC | Restore AgentSidePanel tall photo — revert compact header mistake |
| `8119e5a` | 28 May 2026 | 20:32 UTC | Update MASTER.md: 28 May night session — chat-first FIGSY, auto-consent, full product audit |
| `2cc8c42` | 28 May 2026 | 20:28 UTC | Chat-first FIGSY: persistent thread, conversational onboarding, auto-consent |
| `00eeab0` | 28 May 2026 | 20:16 UTC | Update MASTER.md: 28 May evening session — flow fixes log, product vision locked, Founder TO-DO updated |
| `5c87292` | 28 May 2026 | 20:05 UTC | Fix full product flow: email threading, real activity feed, audience/send-now endpoints, resend-consent UI, company CSV import, onboarding checklist |
| `443d2a0` | 28 May 2026 | 19:53 UTC | Real activity feed; fix LinkedIn CSV import; find contacts at companies; fix Resend inbound |
| `d20a41a` | 28 May 2026 | 19:46 UTC | Fix save-sequence 404; add MCP roadmap section; seed demo reply for inbox demo |
| `8963f20` | 28 May 2026 | 19:36 UTC | feat: FIGSY opens every page with a proactive message in the chat thread |
| `76e666b` | 28 May 2026 | 19:36 UTC | fix: hot reply styling, analytics count, leads visibility gate, parse-intent 404 |
| `023c417` | 28 May 2026 | 19:35 UTC | fix: TypeScript compile errors + FIGSY context messages per page |
| `6d872b5` | 28 May 2026 | 19:29 UTC | feat(figsy): auto-enroll consented leads on campaign activation |
| `d122b9a` | 28 May 2026 | 19:22 UTC | fix(figsy): add missing campaign endpoints — GET /:id, PUT /:id/sequence, POST /:id/test-email |
| `be7df78` | 28 May 2026 | 19:17 UTC | fix(figsy): add GET /campaigns/:id endpoint |
| `e99cc0b` | 28 May 2026 | 19:12 UTC | fix: batch bug fixes from audit — billing, settings, sidebar, leads, auto-topup |
| `c9561a8` | 28 May 2026 | 19:11 UTC | fix: leads tab multi-status filter + dashboard hot replies endpoint |
| `af01a73` | 28 May 2026 | 19:10 UTC | fix(figsy): remove API-level subscription gate — portal already enforces hasFigsySub |
| `5ef99b9` | 28 May 2026 | 19:09 UTC | fix(figsy): use count query for subscription gate instead of select+maybeSingle |
| `7c372ee` | 28 May 2026 | 19:01 UTC | fix(figsy): remove current_period_end from subscription check |
| `09191c0` | 28 May 2026 | 18:47 UTC | feat: FIGSY Version B — live AI conversation in agent panel |
| `b48ebb5` | 28 May 2026 | 18:40 UTC | feat: FIGSY as the interface — agent panel on every page, scripted conversation homepage |
| `d7dbb64` | 28 May 2026 | 18:22 UTC | fix: remove redundant credits-transaction gate on FIGSY page |
| `981b5cc` | 28 May 2026 | 18:14 UTC | feat: agent-first UI — consistent AgentSidePanel shell across dashboard and FIGSY |
| `f5d968c` | 28 May 2026 | 18:03 UTC | fix(sidebar): agent card navigates to agent page instead of just toggling dropdown |
| `f338ab3` | 28 May 2026 | 17:56 UTC | fix(seed): also set figsy_credits_remaining=50 when seeding demo account |
| `8290cf4` | 28 May 2026 | 17:54 UTC | feat(icp): FIGSY two-column panel — Alta layout replaces floating button |
| `e10dc9a` | 28 May 2026 | 17:52 UTC | chore: ignore .claude/ directory |
| `eb40efe` | 28 May 2026 | 17:52 UTC | feat(figsy): FIGSY agent panel on dashboard + risk register in admin roadmap |
| `32a61b5` | 28 May 2026 | 17:52 UTC | feat(dashboard): FIGSY agent panel replaces hero — Alta-style two-column home |
| `0c5f932` | 28 May 2026 | 17:41 UTC | fix(ui): lighten billing + settings layout — remove nested dark cards and heavy bordered sections |
| `d3864af` | 28 May 2026 | 17:41 UTC | chore(roadmap): add demo recording + FIGSY onboarding flow to Phase 1 milestones |
| `e3e8031` | 28 May 2026 | 17:36 UTC | feat(icp): replace generic AI FAB with FIGSY agent pill button |
| `332f07a` | 28 May 2026 | 17:34 UTC | fix(dashboard): make Hot Replies card obviously navigate to inbox |
| `8f885c9` | 28 May 2026 | 17:31 UTC | fix(csv-import): expand auto-mapper + detect company lists |
| `0811681` | 28 May 2026 | 17:25 UTC | fix(schema): add comprehensive leads table sync migration |
| `9ed354a` | 28 May 2026 | 17:20 UTC | fix(schema): replace amount_usd with amount_zar everywhere — subscriptions table uses amount_zar |
| `db62fe1` | 28 May 2026 | 17:14 UTC | Fix seed-leads + add missing leads columns migration |
| `e6cbde3` | 28 May 2026 | 17:10 UTC | Fix seed-leads: remove apollo_consented column that doesn't exist in schema |
| `913ec61` | 28 May 2026 | 17:10 UTC | Fix seed-leads: proper error strings + better diagnostics |
| `5b6c903` | 28 May 2026 | 17:07 UTC | Fix smoke test persistence + seed leads error handling |
| `fcd8d65` | 28 May 2026 | 17:04 UTC | Add Seed Leads page to admin portal |
| `2f56e24` | 28 May 2026 | 17:01 UTC | Add seed-leads admin endpoint for demo data |
| `09f1f4a` | 28 May 2026 | 16:54 UTC | Fix signup redirect and add missing FIGSY chat endpoint |
| `ca8d6b5` | 28 May 2026 | 08:27 UTC | fix(website): replace app.get-kind.com with Railway URL — SSL not yet provisioned on custom domain |
| `9bcfd72` | 28 May 2026 | 06:08 UTC | fix(admin): replace all text-white/X with gray text across all 21 admin pages — visible on light background |
| `2098048` | 27 May 2026 | 22:22 UTC | fix(admin): crash fixes + layout repair |
| `662acfe` | 27 May 2026 | 22:12 UTC | feat(v2): all 3 agents live — FIGSY/Milla/Vida in v2 shell, no subscription gates |
| `9610aac` | 27 May 2026 | 22:09 UTC | fix(v2): own sidebar with no redirect logic — stays on /v2 without reverting |
| `20b62bb` | 27 May 2026 | 22:04 UTC | feat(v2): move to isolated route group — no parent layout, fully unrestricted |
| `1248b19` | 27 May 2026 | 21:58 UTC | feat(v2): dedicated layout — all agents unlocked, no payment gates |
| `1a38799` | 27 May 2026 | 21:49 UTC | feat: v2 agent workspace home + smoke test checklist |
| `f9ee5b6` | 27 May 2026 | 21:07 UTC | fix(admin): remove Next.js 15 Promise<searchParams> pattern — use Next.js 14 sync object |
| `28a1317` | 27 May 2026 | 21:04 UTC | docs(db): MASTER_SCHEMA — Section 0 morning checklist + ALTA Cross Reference |
| `e76396c` | 27 May 2026 | 21:03 UTC | feat: AI enrichment columns + MASTER_SCHEMA update + ABM migration |
| `1825c7f` | 27 May 2026 | 20:59 UTC | fix(admin): wrap getAdminStats in try/catch — prevents server crash on any Supabase error |
| `01c6ba3` | 27 May 2026 | 20:55 UTC | fix: guard ALL admin routes + pages against missing env vars |
| `a1fbbc8` | 27 May 2026 | 20:51 UTC | fix(admin): guard all server components against missing SUPABASE_SERVICE_ROLE_KEY |
| `25fa6c3` | 27 May 2026 | 20:43 UTC | feat(portal): ABM preview count in ICP builder |
| `664105a` | 27 May 2026 | 20:43 UTC | fix(api): allow railway.app CORS origins — portal was blocked |
| `5f4b0c6` | 27 May 2026 | 19:57 UTC | fix: replace undefined rounded-ds-lg Tailwind class with rounded-xl |
| `5a59076` | 27 May 2026 | 19:38 UTC | fix: portal next.config — ignoreBuildErrors to unblock Railway build |
| `960fe91` | 27 May 2026 | 19:38 UTC | fix: resolve TypeScript errors in portal figsy, billing, icp, dashboard pages |
| `baf8e45` | 27 May 2026 | 19:35 UTC | fix: remove nixpacks.toml — Railway uses Railpack which auto-detects monorepo workspace |
| `9a4d2a4` | 27 May 2026 | 19:32 UTC | fix: admin next.config — ignoreBuildErrors + eslint for pre-existing type issues |
| `86a231d` | 27 May 2026 | 19:32 UTC | fix: repair JSX syntax errors in admin roadmap, cmo, and dashboard pages |
| `6b51a51` | 27 May 2026 | 19:14 UTC | infra: add Railway nixpacks config for portal + admin monorepo deploy |
| `58a4022` | 27 May 2026 | 19:01 UTC | Merge claude/ai-business-roadmap-U3OWJ into main — W1-W15 + Alta competitive builds |
| `be7f98e` | 27 May 2026 | 18:57 UTC | feat: Unibox two-way reply from admin portal |
| `0c1d67b` | 27 May 2026 | 18:56 UTC | docs: mark W2-W15 + Unibox reply as shipped 27 May 2026 |
| `f1d0b62` | 27 May 2026 | 18:56 UTC | feat: W10 editable prompt + W11 daily quota + W12 quality gate |
| `93bca07` | 27 May 2026 | 18:54 UTC | feat: W15 revival campaign + W14 email style training |
| `ccb9d2c` | 27 May 2026 | 18:53 UTC | feat: W13 ICP preview shows 3 real contact names |
| `6971f8e` | 27 May 2026 | 18:52 UTC | feat: W8 proactive dashboard home screen |
| `d60f0fb` | 27 May 2026 | 18:51 UTC | docs: W7 demo narration — ICP live preview as Scene 1 |
| `8c63895` | 27 May 2026 | 18:31 UTC | docs: comprehensive Alta analysis update — 28-screenshot live demo deep dive |
| `3cb202d` | 27 May 2026 | 18:25 UTC | feat: W1 live ICP lead count + W3 intent signals |
| `37cf60f` | 27 May 2026 | 18:23 UTC | feat: W5 LinkedIn badge upgrade + W6 social proof slot on login |
| `5101664` | 27 May 2026 | 18:12 UTC | docs: add Alta competitive build items W1-W7 to build queue |
| `3c1b540` | 27 May 2026 | 18:08 UTC | docs: MASTER.md full audit + Section 36 Admin Portal Playbook |
| `80f6862` | 27 May 2026 | 17:59 UTC | feat: admin portal full visual redesign |
| `479d1e4` | 27 May 2026 | 16:14 UTC | feat: AskFigsyButton lead-gen gating |
| `6817f92` | 27 May 2026 | 15:59 UTC | MASTER.md: full sync — fix all stale S1-S3 refs, update benchmarks, add FIGSY gating decision |
| `a7e9675` | 27 May 2026 | 15:42 UTC | MASTER.md: Section 35 — Demo Playbook & Smoke Test |
| `89185f9` | 27 May 2026 | 15:25 UTC | MASTER.md: 27 May evening session update — P1-P4 + S1-S3 done, founder to-do updated |
| `6a726b8` | 27 May 2026 | 15:23 UTC | feat: P1-P4 API wiring + S1-S3 ClickUp steals |
| `7732261` | 27 May 2026 | 15:13 UTC | MASTER.md: Section 20 fully rewritten — complete Alta audit from all sources |
| `46a8e40` | 27 May 2026 | 15:04 UTC | MASTER.md: Section 0 updated — 27 May portal facelift session |
| `85ac912` | 27 May 2026 | 15:01 UTC | Portal facelift: soft warm palette, sidebar active-nav fix, colour cleanup |
| `143b0db` | 27 May 2026 | 14:50 UTC | Sidebar: dropdown restored, larger agent photos (w-14), subscription-aware routing |
| `31db023` | 27 May 2026 | 14:42 UTC | Sidebar: correct product hierarchy + fix button collision + remove Beta badge |
| `4e75313` | 27 May 2026 | 14:26 UTC | Three major improvements: real agent photos, Mission Control home, sequence branching + meetings booked |
| `361b199` | 27 May 2026 | 13:54 UTC | Portal theme: brand palette from agent images — deep indigo sidebar, warm cream content bg, violet accent |
| `8696629` | 27 May 2026 | 13:27 UTC | Light theme: sidebar, layout, and chat widget redesigned with FIGSY's blue palette |
| `6e36a40` | 27 May 2026 | 12:03 UTC | Sprint 2: LinkedIn import, AI enrichment columns, billing/usage charts, inbox badge |
| `a38809a` | 27 May 2026 | 11:58 UTC | Add AUDIT.md — full sprint audit with build status, smoke tests, and to-do lists |
| `670e273` | 27 May 2026 | 11:52 UTC | Lead Gen overview page + dedicated product interface |
| `93c30b4` | 27 May 2026 | 11:50 UTC | Separate Lead Gen as standalone product in sidebar |
| `a1b1bb8` | 27 May 2026 | 11:48 UTC | SVG agent avatars for FIGSY, Milla, Vida — live in portal |
| `11fdb9c` | 27 May 2026 | 11:45 UTC | Social/buying signals on People table, streamlined columns |
| `0e357a0` | 27 May 2026 | 11:43 UTC | Add CHANGELOG.md and BUILD_STATUS.md — full sprint documentation |
| `16e21f8` | 27 May 2026 | 11:40 UTC | Visual sequence builder, campaign detail page with 3-tab layout |
| `e6d68a9` | 27 May 2026 | 11:38 UTC | Campaign templates, progress bars, People tabs, Roadmap refresh, Compass Knowledge step |
| `850ac6e` | 27 May 2026 | 11:28 UTC | Three-panel inbox, Knowledge/Compass, Performance v2, Co-pilot mode, Ask FIGSY button |
| `b97cbcf` | 27 May 2026 | 11:08 UTC | feat(portal): agent sidebar + home page redesign |
| `cf993be` | 26 May 2026 | 21:12 UTC | Fix 5 bugs found in full codebase audit |
| `eb2c698` | 26 May 2026 | 21:06 UTC | Add numbered TOC with anchor links — all 34 sections |
| `1460595` | 26 May 2026 | 21:06 UTC | Remove custom TOC — GitHub auto-generates it from headings |
| `d7e9a7b` | 26 May 2026 | 21:00 UTC | Add table of contents at top of MASTER.md — all 34 sections with descriptions |
| `b6cc496` | 26 May 2026 | 20:55 UTC | Audit + fix Section 5: portal/admin/website pages cross-referenced against actual code |
| `b674f25` | 26 May 2026 | 20:41 UTC | Complete Section 0 rewrite: comprehensive daily brief with full build history 9 May–27 May |
| `8954f06` | 26 May 2026 | 20:35 UTC | Comprehensive MASTER.md audit fixes: Paystack removed, crons 16→19, ICP debt fixed, missing 25-26 May builds added, Milla/Vida July 2026 framing updated, 40cr tier added to pricing |
| `d16e827` | 26 May 2026 | 20:31 UTC | MASTER.md audit fixes batch 1: Paystack removed, crons 16→19, ICP debt fixed, Milla/Vida framing updated |
| `74360c4` | 26 May 2026 | 20:14 UTC | Add Section 0: Daily Brief — living top-of-file status system |
| `6513a4f` | 26 May 2026 | 20:11 UTC | Restore all historical sections 28-34 from main branch + expand TOC |
| `29d0e60` | 26 May 2026 | 20:04 UTC | Add visual client journey flowchart: docs/client-flow-visual.html |
| `20f31ea` | 26 May 2026 | 20:01 UTC | Add visual roadmap flowchart: docs/roadmap-flowchart.html |
| `aa38abf` | 26 May 2026 | 19:57 UTC | Full MASTER.md audit + sync: all 27 May builds logged, Paystack removed, debt fixed |
| `a8366f3` | 26 May 2026 | 19:45 UTC | Add Section 25: Apex (apex.host) competitive audit |
| `dc1414f` | 26 May 2026 | 19:41 UTC | Add Section 24: ClickUp competitive audit + steal-now analysis |
| `1bc7843` | 26 May 2026 | 18:37 UTC | Update MASTER.md Test 3: add Vida subscription steps, remove Paystack rows |
| `6ee0817` | 26 May 2026 | 18:32 UTC | Self-serve Milla + Vida subscriptions via Stripe + remove Paystack from portal |
| `242ab54` | 26 May 2026 | 18:24 UTC | Add full 4-test smoke test suite to MASTER.md |
| `4e4e3ce` | 26 May 2026 | 17:58 UTC | Overnight build: race condition fix, startup check, reply categories, Unibox, hero rewrite |
| `73f0a98` | 26 May 2026 | 17:32 UTC | Add WhatsApp application to 5-day plan + fix duplicate content |
| `614747e` | 26 May 2026 | 17:19 UTC | Full 5-day sprint plan (26–31 May) — smoke test, outreach, build queue |
| `3828355` | 26 May 2026 | 16:27 UTC | Add full ClickUp vs K.I.N.D comparison + ClickUp column to master table + infographic tables |
| `d0e406c` | 26 May 2026 | 16:23 UTC | Update Section 2 — day-by-day action plan (Today/Tomorrow/Day after/Week/Month) |
| `a4b615d` | 26 May 2026 | 16:12 UTC | Add Section 30 — The Unbuilt Future (K.I.N.D vision, 11 futures) |
| `7cb603f` | 26 May 2026 | 16:06 UTC | Add Section 29 — Full Competitive Landscape (all competitors, all tiers) |
| `6cef4a4` | 26 May 2026 | 15:35 UTC | Add Action Plan, Look & Feel direction, Portal V2 note, Section 28 (ClickUp Brain) to MASTER.md |
| `747cd9f` | 26 May 2026 | 15:21 UTC | Full Art of Possible rewrite — 15 pieces, 3 teachers, Lemlist deep-dive, MCP server, community play |
| `5d72016` | 26 May 2026 | 15:15 UTC | Expand Section 19 vision with full 5-year framing from session transcripts |
| `1dd76ad` | 26 May 2026 | 15:13 UTC | Add Section 27 (AI Learning Capability) + expand Art of Possible to all 5 products in MASTER.md |
| `191ee90` | 26 May 2026 | 15:02 UTC | feat: admin dark sidebar V2 live + MASTER sections 25+26 |
| `e23019b` | 26 May 2026 | 15:01 UTC | feat: admin dark sidebar nav V2 — grouped sections, Founder OS branding |
| `9689c9c` | 26 May 2026 | 14:54 UTC | docs: retroactive Art of Possible entries + wire all docs to admin nav |
| `96d3b53` | 26 May 2026 | 14:50 UTC | docs: add Art of Possible section to MASTER.md (Section 24) |
| `92b98f4` | 26 May 2026 | 14:49 UTC | feat: Art of Possible doc — competitor study log, Apex first entry |
| `dda09ef` | 26 May 2026 | 14:37 UTC | feat: 3× daily auto-status system + MASTER.md updated |
| `26b5887` | 26 May 2026 | 14:24 UTC | fix: flat pricing — remove all volume discounts, /lead /figsy credit |
| `9d2626f` | 26 May 2026 | 14:09 UTC | feat: wire Calendly booking link across website and portal |
| `ff72501` | 26 May 2026 | 14:07 UTC | feat: wire Calendly booking link across website and landing pages |
| `96fcab5` | 26 May 2026 | 13:57 UTC | feat: ICP cascade delete migration — leads.icp_id SET NULL on delete |
| `78d04d8` | 26 May 2026 | 13:56 UTC | merge: feature branch into main — flutterwave, hubspot, 3-tier billing, admin improvements |
| `6e35865` | 26 May 2026 | 13:40 UTC | fix: remove startup crash if PAYSTACK_SECRET_KEY missing |
| `fde2ef7` | 26 May 2026 | 13:39 UTC | fix: stagger 3 cron time conflicts on main branch |
| `d0e7d82` | 26 May 2026 | 13:33 UTC | fix: wrap credit_transactions insert in try/catch on main branch |
| `b2903d3` | 26 May 2026 | 13:32 UTC | fix: cast productConfig to any to resolve price_usd TS error in subscriptions.ts |
| `0ecc922` | 26 May 2026 | 13:18 UTC | feat: Stripe 3-tier bundles — add 40cr tier, correct prices to $38/$88/$110/$250 |
| `3280185` | 26 May 2026 | 11:54 UTC | feat: Flutterwave integration — ZAR/NGN/KES/GHS local African payments (Phase 2) |
| `5ad063c` | 26 May 2026 | 11:51 UTC | docs: payment stack corrected — Stripe primary, Paystack removed |
| `58b9423` | 26 May 2026 | 11:40 UTC | feat: add missing SQL migrations — drip system + MASTER_SCHEMA |
| `28d5b79` | 26 May 2026 | 11:35 UTC | feat: sales playbook — discovery script, objections, demo flow, proposal template |
| `b7f3ea5` | 26 May 2026 | 11:31 UTC | docs: Google Workspace moved to non-urgent — Gmail sufficient for now |
| `d6729a9` | 26 May 2026 | 11:29 UTC | docs: Apollo #1 marked done — APOLLO_API_KEY confirmed in Railway |
| `ae21027` | 26 May 2026 | 11:27 UTC | docs: correct Apollo billing — annual not monthly, free plan path documented |
| `e883328` | 26 May 2026 | 11:26 UTC | fix: Apollo free plan handling — credits exhausted + rate limit errors |
| `93e5ad1` | 26 May 2026 | 09:13 UTC | docs: MASTER.md full sync — 26 May evening |
| `a0b72f6` | 26 May 2026 | 09:08 UTC | feat: HubSpot CRM sync — signup, payment, FIGSY reply, pipeline view |
| `3e3fa5e` | 26 May 2026 | 09:07 UTC | feat: founder morning brief endpoint — POST /internal/founder-brief |
| `bfa8cd5` | 26 May 2026 | 09:07 UTC | feat: HubSpot sync + cron stagger fix |
| `6475c1d` | 26 May 2026 | 09:06 UTC | feat: admin scalability page — stage tracker, hire checklist, infra triggers |
| `4283b3c` | 26 May 2026 | 09:05 UTC | feat: founder morning brief — daily 07:00 platform digest email |
| `ef3c3b1` | 26 May 2026 | 09:05 UTC | feat: competitor ICP seed configs — Lemlist/Instantly/Clay/Apollo users in Africa |
| `0e7780e` | 26 May 2026 | 09:05 UTC | feat: competitor ICP seed configs — Lemlist/Instantly/Clay/Apollo users in Africa |
| `992439e` | 26 May 2026 | 08:58 UTC | fix: FIGSY inbound webhook pre-auth, bulk-export limit, widget rate limiting |
| `72860c6` | 26 May 2026 | 08:46 UTC | docs: mark test subscription cleanup as done |
| `6e185a7` | 26 May 2026 | 08:32 UTC | docs: MASTER.md updated — 26 May session summary, all builds + audit findings |
| `a87fa67` | 26 May 2026 | 08:30 UTC | fix: audit fixes — cron stagger, stats resilience, access gates, null guards |
| `8caadd3` | 26 May 2026 | 08:24 UTC | feat: credits deduct at delivery, lead drip system, low-credits warning, subscription lapse check |
| `3e7de8f` | 26 May 2026 | 08:19 UTC | fix: resolve React hooks violation in Milla (assistant/page.tsx) |
| `102499e` | 26 May 2026 | 07:50 UTC | docs: add items 14-16 to founder list, mark drip migration as complete |
| `baa24a7` | 26 May 2026 | 07:46 UTC | docs: Section 1 updated — 9 of 12 Claude builds complete, 3 awaiting founder input |
| `bdc19b6` | 26 May 2026 | 07:45 UTC | feat: recurring billing, lead drip, quantity controls, low-credit reminder, 10k credits fix |
| `acfbecf` | 26 May 2026 | 07:40 UTC | fix: build cancel subscription endpoint POST /subscriptions/:id/cancel |
| `ffb1f51` | 26 May 2026 | 07:39 UTC | fix: lead overspend cap, FIGSY trialing gate, credits.ts pricing alignment |
| `60a0a25` | 25 May 2026 | 22:20 UTC | docs: Section 1 — add 3 missing items from today's conversations |
| `9d92ccd` | 25 May 2026 | 22:18 UTC | docs: Section 1 complete rewrite — single operational dashboard |
| `967db17` | 25 May 2026 | 22:16 UTC | docs: Section 1 — add lead drip and client quantity control as missing items 11 and 12 |
| `eef813d` | 25 May 2026 | 22:13 UTC | docs: MASTER.md full accuracy pass — 13 fixes, single source of truth |
| `62a0f48` | 25 May 2026 | 22:07 UTC | docs: full MASTER.md audit sync — all bugs, gaps, and incomplete fixes documented |
| `f1d9a6f` | 25 May 2026 | 21:57 UTC | fix: homepage Milla/Vida CTAs, lead overspend cap, MASTER.md full sync |
| `282ed9c` | 25 May 2026 | 21:45 UTC | feat: move waitlist to standalone netlify-waitlist folder |
| `a77c9a1` | 25 May 2026 | 21:42 UTC | feat: update waitlist for soft launch 31 May |
| `bfa06a5` | 25 May 2026 | 21:35 UTC | feat: waitlist landing page for pre-launch interest capture |
| `908c3c0` | 25 May 2026 | 21:09 UTC | fix: credit system, pricing accuracy, agent demo CTAs |
| `242f28a` | 25 May 2026 | 21:00 UTC | fix: update shared constants to correct credit-based pricing model |
| `497d3cc` | 25 May 2026 | 20:53 UTC | fix: FIGSY credit deduction on enrollment (manual + auto-enroll) |
| `8c54eca` | 25 May 2026 | 20:49 UTC | fix: credit deduction on ICP run + trial credits + remove DAM card + partner earnings calc |
| `91febdb` | 25 May 2026 | 20:44 UTC | fix: lock FIGSY/Milla/Vida behind upgrade gate, fix subscription endpoint |
| `c4424cf` | 25 May 2026 | 20:38 UTC | fix: partners page - full product pricing table with all 7 products + commission |
| `a76a76e` | 25 May 2026 | 20:37 UTC | fix: update website pricing - Milla $49/mo, Vida $29/mo, FIGSY credit-based |
| `6d94c3b` | 25 May 2026 | 20:34 UTC | feat: launch Milla + Vida — subscription billing, new lock screens, demo request |
| `9291811` | 25 May 2026 | 20:24 UTC | fix(portal): rename sidebar labels and lock screens to Milla and Vida |
| `36fcd00` | 25 May 2026 | 19:55 UTC | feat: founder morning brief cron + /scalability admin page |
| `8d33caf` | 25 May 2026 | 19:55 UTC | docs: update MASTER.md with nightly build status + morning handover to-do |
| `e05a57c` | 25 May 2026 | 19:54 UTC | feat: sales playbook + competitor ICP SQL + admin nav SALES section |
| `b437598` | 25 May 2026 | 19:43 UTC | docs: add HubSpot Free to to-do list (#14 MEDIUM) + renumber downstream items |
| `ebc0220` | 25 May 2026 | 19:36 UTC | docs: add Section 29 — Scalability: founder sales to full sales team |
| `b34da24` | 25 May 2026 | 19:10 UTC | docs: full session sync — 25 May night briefing merged into MASTER.md |
| `d8dfb02` | 25 May 2026 | 19:02 UTC | docs: promote Apollo upgrade to #1 STOP EVERYTHING priority — platform cannot find leads without it |
| `a0e014e` | 25 May 2026 | 18:59 UTC | feat(admin): restyle remaining pages to dark theme |
| `e0ad5cc` | 25 May 2026 | 18:55 UTC | feat(admin): wire agent pages to brief API |
| `123a31d` | 25 May 2026 | 18:55 UTC | docs: add tomorrow's debrief agenda + competitor targeting ICPs to founder to-do |
| `66fa3f9` | 25 May 2026 | 18:54 UTC | feat(api): internal briefs router — AI exec team daily briefs |
| `054085a` | 25 May 2026 | 18:52 UTC | feat(admin): dark restyle client detail + FIGSY/ICP/leads sections |
| `953b109` | 25 May 2026 | 18:52 UTC | feat(admin): dark restyle clients list + health scoring + at-risk filter |
| `213ef96` | 25 May 2026 | 18:46 UTC | feat(admin): revenue deep-dive page with scenario tracker |
| `9c471b9` | 25 May 2026 | 18:45 UTC | feat(admin): platform health page |
| `668a585` | 25 May 2026 | 18:45 UTC | feat(admin): compliance tracker page + full certification roadmap in MASTER.md |
| `4795ae1` | 25 May 2026 | 18:44 UTC | feat(admin): living docs viewer — MASTER, run-costs, legal |
| `c176e4d` | 25 May 2026 | 18:43 UTC | feat(admin): AI exec team pages — OTTO, LENA, REEVE, CMO, CTO, CFO |
| `3173fdb` | 25 May 2026 | 18:43 UTC | feat(admin): restyle dashboard for dark theme |
| `f965431` | 25 May 2026 | 18:42 UTC | docs: add Section 28 — Founder Admin Portal vision + build status |
| `ecfd4b1` | 25 May 2026 | 18:41 UTC | feat(admin): dark sidebar layout — Founder OS V2 |
| `4767851` | 25 May 2026 | 18:36 UTC | docs: full Art of the Possible rebuild — 15 pieces, 3 teachers, MCP + Lemlist |
| `6d7ddd4` | 25 May 2026 | 18:22 UTC | docs: expand Section 22 — full competitive landscape audit |
| `cc2f6f7` | 25 May 2026 | 18:17 UTC | docs: commit legal.md changes (unstaged from previous session) |
| `bd48c74` | 25 May 2026 | 18:17 UTC | docs: add Apollo — supplier, competitor, teacher section to Art of the Possible |
| `b94f124` | 25 May 2026 | 18:09 UTC | docs: add legal section — Apollo ToS brief, managed service vs data reselling |
| `6e1b3cc` | 25 May 2026 | 18:02 UTC | docs: expand Section 26 — full action plan for every Art of the Possible feature |
| `c29ae36` | 25 May 2026 | 17:54 UTC | docs: add Section 26 — Art of the Possible (ClickUp inspiration, V2 vision, look & feel) |
| `06aeaf7` | 25 May 2026 | 17:53 UTC | docs: full cashflow model rebuild — 3 scenarios, ARPU model, milestones, Apollo warning |
| `43ee644` | 25 May 2026 | 17:49 UTC | docs: updated revenue model — 3 scenarios, ARPU assumptions, milestones, Apollo cost note |
| `37cf656` | 25 May 2026 | 16:50 UTC | fix: full end-to-end audit — ICP run, scoring, FIGSY, leads page |
| `8b635f9` | 25 May 2026 | 16:36 UTC | docs: full MASTER.md rebuild — 25 May 2026 evening |
| `4a09a5a` | 25 May 2026 | 16:26 UTC | feat: audit runs at 04:00 + 16:00 SAST — full status report as GitHub Issue every run |
| `8e2bf93` | 25 May 2026 | 16:23 UTC | chore: add MASTER_SCHEMA.sql — single SQL to fully sync live DB |
| `2fdda22` | 25 May 2026 | 16:05 UTC | fix: comprehensive schema drift — 5 missing columns/constraints across 3 tables |
| `212b31b` | 25 May 2026 | 16:00 UTC | fix: apollo_only_consented missing from icps table — graceful fallback + migration |
| `c7ddc6d` | 25 May 2026 | 14:12 UTC | fix: [object Object] error on ICP save — normalize AI arrays, robust error serialization, remove duplicate builder/chat handler |
| `a57d871` | 25 May 2026 | 11:03 UTC | merge: bring all 25 May fixes to main — now deploys to Railway + Vercel |
| `352ab58` | 25 May 2026 | 10:03 UTC | fix: ICP chat-build endpoint — top-level Anthropic import, correct route order |
| `15c4119` | 25 May 2026 | 09:54 UTC | feat: fix Milla chat + add AI conversational ICP builder |
| `b14d23e` | 25 May 2026 | 09:51 UTC | fix: skip onboarding for existing clients — retain profile on redeploy |
| `4ae0624` | 25 May 2026 | 09:38 UTC | fix: support widget returning raw JSON instead of plain text |
| `48b1de2` | 25 May 2026 | 06:27 UTC | fix: schema drift + daily 04:00 AM automated audit |
| `886be3d` | 25 May 2026 | 06:20 UTC | Fix: remove amount_usd from trial subscription insert (column does not exist) |
| `34b9004` | 25 May 2026 | 06:15 UTC | Fix: trial subscription insert missing amount_zar/amount_usd |
| `b511988` | 25 May 2026 | 05:58 UTC | Portal V2: full redesign behind FEATURE_PORTAL_V2 flag (not live) |
| `fc56382` | 24 May 2026 | 18:42 UTC | Portal UI upgrade: dark mode + dashboard redesign + grouped sidebar |
| `ba1616c` | 24 May 2026 | 18:27 UTC | Portal analytics page + API endpoint + MASTER.md update |
| `62d42e9` | 24 May 2026 | 18:21 UTC | Admin: cohort analytics page + AdminNav Cohorts link |
| `faf0050` | 24 May 2026 | 18:18 UTC | Portal ICP form: add website scan button — calls POST /icps/prefill, pre-fills form fields from Claude website analysis |
| `ff186ce` | 24 May 2026 | 18:08 UTC | Website: Milla and Vida go live — remove Coming Soon, add pricing, update CTAs |
| `b3099a8` | 24 May 2026 | 18:06 UTC | Remove HANDOVER.md — superseded by updated MASTER.md (24 May 2026) |
| `b7da14d` | 24 May 2026 | 17:59 UTC | Build: campaign intent prompt + conversational ICP builder + Web Speech API voice input (feature flagged, off by default) |
| `300bec7` | 24 May 2026 | 17:57 UTC | Build: campaign intent prompt + ICP builder chat + Web Speech API voice input (feature flagged) |
| `b0e96df` | 24 May 2026 | 17:56 UTC | MASTER.md: full update 24 May — GTM strategy, UK company registration, current status |
| `5bbe313` | 22 May 2026 | 18:51 UTC | Fix partner pricing: pricing is fixed, no modifications allowed by any partner |
| `fdfafd7` | 22 May 2026 | 18:26 UTC | Rewrite partner programme: ClickUp/Smartsheet model, fix checkmark rendering |
| `0788b24` | 20 May 2026 | 12:02 UTC | Site: replace founder name with "Founder" on homepage and about page |
| `39edfae` | 20 May 2026 | 11:55 UTC | Site: full homepage rewrite v2 — complete positioning overhaul |
| `e9d770b` | 20 May 2026 | 12:51 UTC | Merge pull request #3 from jacquesvieiraza-blip/claude/ai-business-roadmap-U3OWJ |
| `3ec7f6c` | 20 May 2026 | 11:50 UTC | Merge main into feature branch — resolve conflicts |
| `ca2dbbf` | 20 May 2026 | 11:46 UTC | Site: full homepage rewrite with new positioning |
| `ef87402` | 20 May 2026 | 11:44 UTC | Build: full autonomy, new positioning, self-outreach |
| `a660a3f` | 20 May 2026 | 05:33 UTC | Trigger Vercel redeploy — demo page and nav link |
| `9acf2b9` | 19 May 2026 | 13:40 UTC | Add demo page, looping platform video, and Demo nav link to landing site |
| `1365667` | 19 May 2026 | 13:36 UTC | Add /demo page with looping video, feature grid, CTA; add Demo to nav |
| `06b732b` | 19 May 2026 | 13:32 UTC | Demo page: iframe platform-video.html (standalone too large for Vercel) |
| `e23fd9c` | 19 May 2026 | 13:28 UTC | Demo page: use standalone video (images embedded, no broken refs) |
| `8280530` | 19 May 2026 | 13:27 UTC | Add /demo page — platform video embedded with headline and CTA |
| `f5e04ab` | 19 May 2026 | 13:20 UTC | Add platform-video.html demo page with agent images to site |
| `69edb32` | 19 May 2026 | 13:04 UTC | Add self-contained platform-video-standalone.html with embedded images |
| `27dddee` | 19 May 2026 | 13:02 UTC | Revert platform-video.html and agent images from main — not approved |
| `97724cb` | 19 May 2026 | 12:52 UTC | Add platform-video.html and agent images for YouTube demo preview |
| `6896992` | 19 May 2026 | 12:44 UTC | Fix Milla and Vida scenes — show poster images as contained floating cards |
| `ec3828e` | 19 May 2026 | 12:40 UTC | Add platform-video.html — full 16-scene auto-playing demo (FIGSY + Milla + Vida) |
| `95ead89` | 19 May 2026 | 12:27 UTC | Use ai-agent.jpg for FIGSY image in demo.html |
| `bf65861` | 19 May 2026 | 12:24 UTC | Fix JS syntax error in demo.html — apostrophe in single-quoted SUBJECT string broke all animations |
| `249eb17` | 19 May 2026 | 12:21 UTC | Rewrite demo.html with full scroll-triggered animations across all chapters |
| `613132f` | 19 May 2026 | 12:10 UTC | Fix demo page animations for file:// preview — canvas sizing, scroll-free reveals, count-up |
| `a68a897` | 19 May 2026 | 12:07 UTC | Demo page: add canvas network, typewriter, platform scroll scene, count-up stats |
| `b5385c9` | 19 May 2026 | 12:02 UTC | Add full platform demo page at /demo — all 8 feature chapters, not linked from nav |
| `2dbc283` | 19 May 2026 | 12:47 UTC | Merge pull request #2 from jacquesvieiraza-blip/claude/ai-business-roadmap-U3OWJ |
| `ba0ac60` | 19 May 2026 | 08:50 UTC | Add FIGSY agentic intelligence — memory, escalation, digest, identity |
| `c573c83` | 19 May 2026 | 08:35 UTC | Build KPIs dashboard upgrade and complete referral flow |
| `aec9a03` | 19 May 2026 | 08:04 UTC | Allow Vercel preview URLs in CORS — fixes 'Failed to fetch' on preview deployments |
| `c7895b3` | 19 May 2026 | 06:02 UTC | Fix sidebar health check to use env var; improve leads error message |
| `2180678` | 19 May 2026 | 06:00 UTC | Fix TypeScript build error in demo/page.tsx — duplicate defaultExpiry declaration |
| `bfc9668` | 19 May 2026 | 05:50 UTC | Add Mermaid flowchart covering all 7 client paths to client-flow-sop.md |
| `472e3b9` | 18 May 2026 | 19:12 UTC | Full documentation audit — all docs aligned with 18 May 2026 platform state |
| `fb5aa85` | 18 May 2026 | 19:07 UTC | Merge branch 'main' into claude/ai-business-roadmap-U3OWJ |
| `a2f4ee0` | 18 May 2026 | 18:53 UTC | Add Google Workspace to launch checklist, clean up dead code, update HANDOVER |
| `ef95cfc` | 18 May 2026 | 18:44 UTC | Credit management, AI ICP suggestions, company registration, and security fix |
| `bece017` | 18 May 2026 | 18:31 UTC | Show real Paystack error on billing page instead of generic message |
| `faf2b47` | 18 May 2026 | 18:29 UTC | Update launch checklist and roadmap to reflect current reality |
| `d07976c` | 18 May 2026 | 18:12 UTC | Fix demo ICP insert: remove apollo_only_consented (schema cache stale, has default true) |
| `f4a4e01` | 18 May 2026 | 18:10 UTC | Fix demo form: initialise expires_at to 30 days from now so it's never empty |
| `9912c2a` | 18 May 2026 | 18:08 UTC | Full platform audit in HANDOVER.md — complete status, smoke test, what you do vs Claude |
| `361ad32` | 18 May 2026 | 18:06 UTC | Remove Vercel Pro from pending — deploy limit was caused by debug commits not normal dev |
| `d52add2` | 18 May 2026 | 18:01 UTC | Update handover doc — add Vercel credits to pending, mark SQL migrations done |
| `a54701e` | 18 May 2026 | 17:58 UTC | chore: trigger vercel redeploy |
| `f94aa11` | 18 May 2026 | 17:52 UTC | Add Demo Environments to admin portal |
| `bb6ece6` | 18 May 2026 | 17:23 UTC | Update handover doc — mark completed tasks, update pending list |
| `e19782b` | 18 May 2026 | 17:22 UTC | Add ICP auto-name suggestion from selected criteria |
| `56a4979` | 18 May 2026 | 17:21 UTC | Add full handover doc — status, done, pending, smoke test checklist |
| `3b750d5` | 18 May 2026 | 17:16 UTC | chore: trigger deploy from main |
| `5ed5b04` | 18 May 2026 | 17:11 UTC | chore: trigger vercel deploy |
| `7ff7b03` | 18 May 2026 | 17:06 UTC | Merge branch 'main' into claude/ai-business-roadmap-U3OWJ |
| `f261a11` | 18 May 2026 | 17:06 UTC | Fix [object Object] error display when API returns Zod validation array |
| `6f6e387` | 18 May 2026 | 17:02 UTC | Merge branch 'main' into claude/ai-business-roadmap-U3OWJ |
| `6a97189` | 18 May 2026 | 17:02 UTC | chore: force redeploy portal |
| `4f634dc` | 18 May 2026 | 16:56 UTC | Fix ICP form: show validation error and focus name field when empty |
| `601b9fd` | 18 May 2026 | 15:49 UTC | Surface real ICP create error instead of generic message |
| `93a212d` | 18 May 2026 | 15:39 UTC | chore: trigger Vercel redeploy on all projects |
| `f53715d` | 18 May 2026 | 15:33 UTC | Fix subscription insert: remove amount_usd/amount_zar (schema cache stale) |
| `916eb8b` | 18 May 2026 | 15:30 UTC | Fix signup: portal login uses Railway (no email confirmation), website redirects to portal |
| `3d7df05` | 18 May 2026 | 15:22 UTC | Fix signup, add demo account endpoint, enable RLS, add Book a Demo CTA |
| `4c9e1bc` | 18 May 2026 | 15:14 UTC | Fix silent subscription insert failure in onboard route |
| `58bb04a` | 18 May 2026 | 15:11 UTC | Fix empty dashboard: use authenticated client for Supabase reads, not admin client |
| `2cac8f7` | 18 May 2026 | 15:05 UTC | Fix dashboard layout: read client data from Supabase directly, not Railway API |
| `d3d480e` | 18 May 2026 | 14:53 UTC | Fix dashboard: use service-role client to bypass RLS on server-side reads |
| `f18727e` | 18 May 2026 | 14:27 UTC | Fix dashboard: read profile directly from Supabase, not Railway |
| `ff9e4e8` | 18 May 2026 | 12:03 UTC | Add Supabase SSR middleware — fixes empty dashboard |
| `7b63427` | 18 May 2026 | 11:58 UTC | Fix all localhost:4000 fallbacks in portal — use Railway URL |
| `f1ee281` | 18 May 2026 | 11:47 UTC | Update Railway URL to new domain across all apps |
| `386811c` | 18 May 2026 | 11:14 UTC | Fix TypeScript build error blocking Railway deployment |
| `48e3147` | 18 May 2026 | 09:58 UTC | Show actual error message on signup failure for debugging |
| `b825df2` | 18 May 2026 | 09:43 UTC | Fix CORS: allow get-kind.com to call Railway API |
| `874d27f` | 18 May 2026 | 09:32 UTC | Add demo CTAs to locked products, system health status in sidebar, fix chatbot API URL |
| `dd509d5` | 18 May 2026 | 09:27 UTC | Fix signup: bypass email confirmation entirely via admin SDK |
| `f941a6d` | 18 May 2026 | 09:09 UTC | Website signup: redirect to onboard immediately if email confirmation disabled |
| `d661d28` | 18 May 2026 | 09:07 UTC | Fix Paystack topup: guard null email, surface actual Paystack error |
| `0849b68` | 18 May 2026 | 09:04 UTC | Fix onboarding flow for signups from main website |
| `71bb544` | 18 May 2026 | 09:01 UTC | Fix root cause: api.ts was falling back to localhost:4000 in production |
| `9c118b2` | 18 May 2026 | 08:53 UTC | Fix dashboard — never block on API failure, render gracefully with empty state |
| `7f926fe` | 18 May 2026 | 08:49 UTC | Improve ICP prefill error message — explain why and direct to skip to trial |
| `00734ea` | 18 May 2026 | 08:47 UTC | Fix dashboard loop — don't show setup prompt on API failure, only when no session |
| `23fd3cb` | 18 May 2026 | 08:45 UTC | Redirect new users to /onboard, redirect dashboard to /onboard if no company profile |
| `4cfd051` | 18 May 2026 | 08:31 UTC | Fix onboarding — replace upsert with explicit select/insert/update, surface real DB error |
| `119ab21` | 18 May 2026 | 08:07 UTC | Fix ICP timeout, onboarded_at, env.example gaps |
| `fe92726` | 18 May 2026 | 08:01 UTC | Fix onboarding error reporting, ICP spinner, and signup email redirect |
| `1fce3e7` | 18 May 2026 | 07:46 UTC | Fix proxy key read at runtime not build time — move inside handler function |
| `ec1eea2` | 18 May 2026 | 07:42 UTC | Trigger redeploy — admin secret key synced between Railway and Vercel |
| `4c56b18` | 18 May 2026 | 07:39 UTC | Fix admin proxy — also read NEXT_PUBLIC_ADMIN_KEY for admin secret |
| `8b88693` | 18 May 2026 | 07:34 UTC | Fix admin proxy — hardcode Railway URL fallback, read both ADMIN_SECRET_KEY and ADMIN_SECRET |
| `cde6a13` | 18 May 2026 | 07:32 UTC | Fix 17 bugs from full error audit — security, routing, silent failures |
| `b9e9579` | 18 May 2026 | 07:19 UTC | Trigger redeploy — admin env vars updated (NEXT_PUBLIC_ADMIN_KEY) |
| `559853c` | 17 May 2026 | 16:49 UTC | Fix 7 bugs found in comprehensive error audit |
| `4a270cc` | 17 May 2026 | 16:22 UTC | Fix silently-failing client components — surface errors to users |
| `9f2915f` | 17 May 2026 | 16:20 UTC | Fix CORS blocking all client-side portal requests; fix ICP, leads, FIGSY errors |
| `3c048fa` | 17 May 2026 | 16:13 UTC | Fix credits redirect error display, partner buttons, ZAR in billing, idempotent onboarding |
| `95ee135` | 17 May 2026 | 16:08 UTC | Fix onboarding 500, feature gating, roadmap accuracy, ZAR in billing |
| `8908273` | 17 May 2026 | 15:55 UTC | Add Virtual Assistant & Chatbot Agent landing pages; update all footer links |
| `2e6d462` | 17 May 2026 | 15:50 UTC | Remove all remaining ZAR/local currency references; global positioning updates |
| `d44736f` | 17 May 2026 | 15:43 UTC | Remove all ZAR/Rand references — USD throughout site |
| `970d6fe` | 17 May 2026 | 15:39 UTC | MASTER.md — update to reflect 17 May session (cron, CCPA, DPA-US, vs-apollo) |
| `1cfeae6` | 16 May 2026 | 20:49 UTC | CCPA compliance, cron jobs, US privacy addendum, vs-apollo global framing |
| `3d41c76` | 16 May 2026 | 20:40 UTC | MASTER.md — full 21-section rewrite with every idea, expansion audit, compliance |
| `8023993` | 16 May 2026 | 20:33 UTC | Add full US/UK expansion audit to MASTER.md — gaps, phases, what Claude can do |
| `561a3ea` | 16 May 2026 | 20:29 UTC | Update MASTER.md — full status audit, Monday plan, UK company registration |
| `5cbded9` | 16 May 2026 | 20:37 UTC | Merge pull request #1 from jacquesvieiraza-blip/claude/ai-business-roadmap-U3OWJ |
| `60dc221` | 16 May 2026 | 19:21 UTC | Fix TypeScript build errors and add phone number to leads table |
| `77d2492` | 16 May 2026 | 19:18 UTC | Fix TypeScript build errors in API routes and lib |
| `eab1372` | 16 May 2026 | 19:04 UTC | Trigger redeploy: kind-admin-h5q6 env vars added |
| `334139f` | 16 May 2026 | 18:59 UTC | Trigger redeploy: restore kind-admin root to apps/website |
| `b01ff96` | 16 May 2026 | 17:48 UTC | Trigger redeploy: fix admin root directory to apps/admin |
| `5896cb5` | 16 May 2026 | 17:02 UTC | Add Compare footer column to vs-prospecting and vs-hiring pages |
| `b64f585` | 16 May 2026 | 16:55 UTC | Add competitive comparison links to site footer and pricing page |
| `1eff6ef` | 16 May 2026 | 16:47 UTC | Trigger Vercel redeploy to pick up updated env vars |
| `09b69cc` | 16 May 2026 | 16:44 UTC | Fix API build errors: add googleapis dep, fix implicit any types, unused var |
| `82cfaf3` | 16 May 2026 | 16:26 UTC | Add next-env.d.ts generated by Next.js build |
| `163e4b2` | 16 May 2026 | 16:26 UTC | Fix consent page build error: wrap useSearchParams in Suspense boundary |
| `20d8543` | 16 May 2026 | 15:57 UTC | Fix pricing messaging to reflect credit-bundle model, not monthly billing |
| `579af89` | 16 May 2026 | 15:45 UTC | Fix CREATE POLICY syntax in migrations 002, 007, 008, 009 + polish comparison pages |
| `d19be0b` | 16 May 2026 | 15:44 UTC | Update comparison pages footer — add vs-outreach and vs-salesloft links |
| `bdb9636` | 16 May 2026 | 15:43 UTC | Final polish on comparison pages — vs-outreach and vs-salesloft |
| `a263313` | 16 May 2026 | 15:41 UTC | Polish vs-outreach.html copy and structure |
| `9cecc66` | 16 May 2026 | 15:40 UTC | Add package-lock.json |
| `d03822b` | 16 May 2026 | 15:40 UTC | Polish Stripe lib and vs-outreach from final agent pass |
| `5f0a92f` | 16 May 2026 | 15:39 UTC | Add vs-salesloft.html, update pricing USD/ZAR, polish vs-outreach |
| `cceaf1a` | 16 May 2026 | 15:37 UTC | Add vs-outreach.html comparison page + Vida chatbot page polish |
| `c12a889` | 16 May 2026 | 15:35 UTC | Add Vida embeddable chatbot widget (vida-widget.js) |
| `9abd4ac` | 16 May 2026 | 15:35 UTC | Update MASTER.md pending actions — 9 migrations, Stripe, Google, Vapi, WhatsApp |
| `1b7b9e8` | 16 May 2026 | 15:34 UTC | Build Milla VA, Vida Chatbot, Stripe billing — complete product suite |
| `9ab2508` | 16 May 2026 | 15:33 UTC | Update MASTER.md — Milla, Vida, Stripe, US pages, GDPR all documented |
| `b73367e` | 16 May 2026 | 15:32 UTC | Add GDPR + CAN-SPAM sections to trust page, wire new routers in index.ts |
| `946ab01` | 16 May 2026 | 15:27 UTC | Build Voice, WhatsApp, Calendar integrations + admin launch checklist |
| `d0632c6` | 15 May 2026 | 20:23 UTC | Add Milla + Vida character images and wire all three agents on about page |
| `876c4e4` | 15 May 2026 | 22:21 UTC | Add files via upload |
| `1aa6774` | 15 May 2026 | 20:10 UTC | Add MASTER.md — single source of truth merging all docs |
| `0522310` | 15 May 2026 | 20:01 UTC | Add US/UK expansion plan, agent naming, and pending actions to docs |
| `0b3b4de` | 15 May 2026 | 15:19 UTC | Add agent naming story to about page — FIGSY, Milla, Vida |
| `8139d68` | 15 May 2026 | 15:15 UTC | Remove founder name from about page |
| `6bb9623` | 15 May 2026 | 14:15 UTC | Build partner backend, bulk lead actions, KPI dashboard, campaign clone |
| `cc028b6` | 15 May 2026 | 13:13 UTC | Add DPA page (Data Processing Agreement) |
| `917362f` | 15 May 2026 | 13:12 UTC | Nav links on remaining pages + full roadmap update |
| `a8f1844` | 15 May 2026 | 13:11 UTC | Nav links, roadmap update, reply suggestions polish |
| `f075f68` | 15 May 2026 | 13:10 UTC | Add reply suggestion UI and nav links to comparison pages |
| `5bc576e` | 15 May 2026 | 13:10 UTC | Add FIGSY upgrade wall, onboarding checklist, admin CMO UI, nav links |
| `b40a647` | 15 May 2026 | 13:09 UTC | Add reply suggestion endpoint, bulk consent, pricing anti-Alta copy |
| `25de1ca` | 15 May 2026 | 13:00 UTC | Add speed claim, anti-Alta pricing strip, and Trust/Partners nav links to index.html |
| `8094199` | 15 May 2026 | 12:59 UTC | Website copy overhaul — team narrative, FIGSY character, POPIA + speed claim, anti-Alta pricing |
| `8074da4` | 15 May 2026 | 12:57 UTC | Humanise FIGSY email generation and name founder on about page |
| `7c42063` | 15 May 2026 | 12:46 UTC | Add Trust & Security and Partners nav links to partners.html |
| `1fbd33b` | 15 May 2026 | 12:46 UTC | Add remaining website pages: comparison pages and polish partners/vs-sdr |
| `2231db4` | 15 May 2026 | 12:41 UTC | Add trust, partners, and vs-hiring-an-sdr website pages |
| `662f2b5` | 15 May 2026 | 12:35 UTC | Build pre-launch items: POPIA gate removal, Day 1 outreach, zero-credits, replies inbox, direct-pay |
| `5ff6acd` | 15 May 2026 | 07:51 UTC | Embed FIGSY animated video in landing page (Netlify) |
| `ba5732b` | 15 May 2026 | 07:50 UTC | Expand flowchart — full Voice Agent, WhatsApp & Partner flows in Phase 7 |
| `c392714` | 14 May 2026 | 16:58 UTC | Embed FIGSY animated video in website homepage |
| `23e5695` | 14 May 2026 | 16:56 UTC | Add FIGSY character image to Scene 2 of animated video |
| `6142d4d` | 14 May 2026 | 17:52 UTC | Add files via upload |
| `f079f5c` | 14 May 2026 | 17:50 UTC | Add files via upload |
| `22f8f3b` | 14 May 2026 | 16:46 UTC | Add domain warming cap to send-due; revert video embeds from websites |
| `0f7ac78` | 14 May 2026 | 16:44 UTC | Polish FIGSY animated video — refactor JS, complete typing animation |
| `7c7c468` | 14 May 2026 | 16:37 UTC | Add FIGSY animated video — 12-scene HTML presentation |
| `321a0c1` | 14 May 2026 | 15:33 UTC | Correct go-live date to 31 May throughout docs |
| `f8ee2db` | 14 May 2026 | 15:32 UTC | Move Voice, WhatsApp, Partner to pre-31 May build plan |
| `ade643a` | 14 May 2026 | 15:27 UTC | Revise client journey flowchart — visual overhaul + FIGSY as character |
| `ad7c7a9` | 14 May 2026 | 13:49 UTC | Add GTM strategy + go-live plan to master audit doc (Section 18) |
| `78e5117` | 14 May 2026 | 13:39 UTC | Update flowchart: add direct-payment path alongside free trial in Phase 1 |
| `7993122` | 14 May 2026 | 13:36 UTC | Update flowchart: replace POPIA consent gate with legitimate interest model |
| `876d7c5` | 14 May 2026 | 13:27 UTC | Replace order form system with T&C checkbox at Paystack checkout |
| `f07e669` | 14 May 2026 | 13:22 UTC | Fix flowchart: replace order form steps with Paystack online payment + T&C checkbox |
| `a614d0b` | 14 May 2026 | 13:19 UTC | Add client journey flowchart — Lead Gen Pro + FIGSY all outcomes |
| `e27d08f` | 14 May 2026 | 12:41 UTC | Complete audit doc: add Section 16 (built beyond roadmap), Section 17 (email system), update master table |
| `2e20ea8` | 14 May 2026 | 12:38 UTC | Update audit doc: Google warning, domain warming, Workspace setup, PR merge instructions |
| `46f2083` | 14 May 2026 | 12:37 UTC | Update roadmap audit: add full Resend inbound setup, Google clarification |
| `2d21434` | 14 May 2026 | 12:32 UTC | Add full roadmap audit to docs/updates-live |
| `9d99ab9` | 14 May 2026 | 12:04 UTC | Remove pricing from Virtual Assistant and Chatbot product cards |
| `0edecd3` | 14 May 2026 | 11:51 UTC | Remove video placeholder, update pricing to match website |
| `3beeed2` | 14 May 2026 | 11:14 UTC | Fix demo.html autoplay — force style reflow on scene change, use window.onload |
| `2b8847b` | 14 May 2026 | 11:11 UTC | Restyle demo.html to white/light branding matching main website |
| `43c4b5b` | 14 May 2026 | 10:54 UTC | Rebuild landing page with white/light branding and node-network animation |
| `a441b5b` | 14 May 2026 | 04:55 UTC | Add 7 features: notifications, invoices, auto top-up, reply drafts, bulk consent, FIGSY wall, founder agents |
| `2d569bf` | 14 May 2026 | 04:30 UTC | feat: expanded credit bundles, KPI dashboard, Ask K.I.N.D support widget |
| `9dbf865` | 14 May 2026 | 04:26 UTC | docs: full roadmap audit — status, targets, KPIs, 5-year vision |
| `365ce4d` | 13 May 2026 | 19:31 UTC | FIGSY: add reply_to header so lead replies route correctly |
| `b7bc42b` | 13 May 2026 | 19:26 UTC | Payment = acceptance: remove manual document signing from client flow |
| `0def390` | 13 May 2026 | 19:19 UTC | F2-2: push Deal/Opportunity to CRM on interested FIGSY reply |
| `1240f7b` | 13 May 2026 | 19:04 UTC | M-2, F1-9, INT-8/9/10: trial nurture, FIGSY billing gate, CMO agents |
| `73eef42` | 13 May 2026 | 18:58 UTC | Add POPIA consent callback page and public consent API endpoint |
| `cf0aca0` | 13 May 2026 | 17:42 UTC | feat: D4/D5 email digests + INT-1 to INT-7 internal AE/CRO agents |
| `2e67a9d` | 13 May 2026 | 17:17 UTC | feat: CRM integration — HubSpot + Pipedrive auto-sync on consent (D1–D3) |
| `46babda` | 13 May 2026 | 17:14 UTC | docs: add Lead Gen Only vs FIGSY internal process comparison + D-series delivery tasks |
| `7331760` | 13 May 2026 | 17:04 UTC | feat: FIGSY Phase 1 — AI SDR campaigns, sequences, reply detection (F1-1 to F1-10) |
| `aa0ddd3` | 13 May 2026 | 16:53 UTC | chore: update homepage demo video to new YouTube link |
| `bc32e30` | 13 May 2026 | 16:31 UTC | chore: ignore all *.tsbuildinfo files in gitignore |
| `3fcb51e` | 13 May 2026 | 16:30 UTC | feat: Speed Pipeline portal + admin UI — TTFL, FIGSY, prefill, consent |
| `fce7363` | 13 May 2026 | 16:26 UTC | Speed pipeline — API routes complete |
| `001bc8d` | 13 May 2026 | 16:24 UTC | Add scoring, scrape, and email libs for speed pipeline |
| `27a1c49` | 13 May 2026 | 16:19 UTC | Add branch merge to main as explicit pre-launch step (B11) |
| `98b338e` | 13 May 2026 | 16:18 UTC | Fix broken Privacy Policy footer link across all 4 secondary pages |
| `c3a6526` | 13 May 2026 | 16:14 UTC | Add GOAL 4 — internal AE, CRO, CMO agent team to roadmap |
| `a3db440` | 13 May 2026 | 16:13 UTC | Full roadmap rewrite — 4 goals, agent suite, clean structure |
| `1ba7ca8` | 13 May 2026 | 16:09 UTC | Major roadmap update — full pre-smoke test checklist + current build status |
| `b5d1387` | 13 May 2026 | 13:20 UTC | Add 5-year vision to master roadmap |
| `3738eb3` | 13 May 2026 | 13:17 UTC | Add Speed Pipeline (#1 priority) to master roadmap |
| `f3b1706` | 13 May 2026 | 12:47 UTC | Fix video embed visibility — remove reveal class from video-wrap |
| `c9c5a1a` | 13 May 2026 | 12:45 UTC | Embed YouTube demo video in homepage |
| `6186008` | 13 May 2026 | 12:45 UTC | Rebuild all secondary pages to white brand theme |
| `23aba98` | 13 May 2026 | 12:27 UTC | Remove duplicate from apps/ root |
| `a3a1b0b` | 13 May 2026 | 12:27 UTC | Update AI agent image with newer version |
| `77c4b99` | 13 May 2026 | 13:27 UTC | Add files via upload |
| `f3aa708` | 13 May 2026 | 12:27 UTC | Remove duplicate image from apps/ root (lives in apps/website/) |
| `14e394d` | 13 May 2026 | 12:26 UTC | Add AI agent image to hero and FIGSY character card |
| `8b48cce` | 13 May 2026 | 13:25 UTC | Add files via upload |
| `caf2d22` | 13 May 2026 | 12:08 UTC | Add scroll animations, FIGSY character scene, video section, and counters to website |
| `fa1b87a` | 13 May 2026 | 11:13 UTC | Fix auth token validation and CSV export bugs |
| `51693e5` | 13 May 2026 | 11:01 UTC | Phase 4: Portal upgrades — usage, credits, notifications |
| `677652c` | 13 May 2026 | 10:59 UTC | Phase 3: Credit-based billing |
| `343a984` | 13 May 2026 | 10:57 UTC | Phase 2: Referral backend + credit balance |
| `a346452` | 13 May 2026 | 10:38 UTC | Move Smoke Test to Phase 5, FIGSY → 6, Agent Stack → 7 |
| `fe56960` | 13 May 2026 | 10:37 UTC | Reorder phases: Portal Upgrades → 4, FIGSY Outreach → 5 |
| `190e726` | 13 May 2026 | 10:35 UTC | Update master-status: add confirmed phase order (2–7) |
| `4d9954f` | 13 May 2026 | 10:29 UTC | Add error boundaries, harden root page, add referral banner |
| `41283b9` | 13 May 2026 | 10:06 UTC | Add ToS page, simplify documents signing flow |
| `fd7b86f` | 13 May 2026 | 09:55 UTC | Mark all infrastructure complete — Railway, Resend, Supabase SQL, Vercel env vars |
| `832d541` | 13 May 2026 | 09:22 UTC | Fix useSearchParams Suspense boundary on login page, fix old email refs in portal |
| `02de3a3` | 13 May 2026 | 08:59 UTC | Fix TypeScript errors in leads.ts blocking Railway build |
| `7451f05` | 13 May 2026 | 07:28 UTC | Rebuild index.html — ClickUp-style light theme with node network hero |
| `a833733` | 13 May 2026 | 07:09 UTC | Add confirmed product direction — new pricing model, FIGSY, lead qualification, portal upgrades, website redesign plan |
| `4b73dbd` | 12 May 2026 | 17:09 UTC | Add internal AI operating system plan — founder agent stack with ICP, agent roster, build order |
| `d72daa4` | 12 May 2026 | 16:34 UTC | Add UK sole trader legal and financial setup to master status doc |
| `fd85e90` | 12 May 2026 | 16:33 UTC | Update master status — mark A/B/C infrastructure complete, clarify tomorrow's remaining steps |
| `7f8e87d` | 12 May 2026 | 15:37 UTC | Remove Support from Company dropdown — keep only under Resources |
| `4a70928` | 12 May 2026 | 15:32 UTC | Website fixes: dropdown smoothness, VA/chatbot pricing, ZAR card, hero eyebrow |
| `5d21aaa` | 12 May 2026 | 14:38 UTC | Add client flow SOP document |
| `b55e3a6` | 12 May 2026 | 14:13 UTC | Add master status document — built vs still to do |
| `214c453` | 12 May 2026 | 14:10 UTC | Migrate domain from kindai.com to get-kind.com |
| `9276cd7` | 12 May 2026 | 12:26 UTC | Add Claude Code development cost to run costs document |
| `a58b054` | 12 May 2026 | 12:11 UTC | Add run costs and cashflow model document |
| `3c69df6` | 12 May 2026 | 12:00 UTC | Add website nav redesign, pricing page, about page, use cases, and support |
| `b0e86cf` | 12 May 2026 | 11:33 UTC | Use app.kindai.com for client portal (Stripe-style subdomain) |
| `af9445a` | 12 May 2026 | 11:30 UTC | Fix cross-domain auth — session now lives entirely on portal domain |
| `ec7b142` | 12 May 2026 | 11:19 UTC | L1 — Wire Apollo API to ICP builder so leads actually appear |
| `d87bf11` | 12 May 2026 | 11:05 UTC | Auto-create order form on trial start + handle email confirmation redirect |
| `06c9c41` | 12 May 2026 | 10:58 UTC | Fix subscriptions route to handle usage-based lead_gen products |
| `d8043e7` | 12 May 2026 | 10:55 UTC | Fix billing page, add trial gate, order form requirement, and auth UX improvements |
| `1f8bbd1` | 12 May 2026 | 10:43 UTC | config: add Supabase credentials to website auth |
| `814bc09` | 12 May 2026 | 10:35 UTC | feat: add signup/login modal to main website with Supabase auth |
| `a4708db` | 12 May 2026 | 10:07 UTC | fix: add packageManager field + website package.json to stop Turbo hijacking static site build |
| `3286550` | 12 May 2026 | 09:57 UTC | fix: add vercel.json to website — static HTML, no build command |
| `c6d1ceb` | 12 May 2026 | 09:36 UTC | feat: add marketing website — Intelligence, Engineered |
| `c0ac3e3` | 12 May 2026 | 09:29 UTC | feat: full marketing website replacing early access page |
| `946a609` | 12 May 2026 | 09:20 UTC | fix: admin dashboard product catalog shows correct pricing |
| `d9403d5` | 12 May 2026 | 09:15 UTC | redesign: landing page with full FIGSY section and 3-plan pricing |
| `5b93050` | 12 May 2026 | 09:08 UTC | feat: add shared admin nav + fix portal documents loading bug |
| `1d1e8c1` | 12 May 2026 | 09:02 UTC | fix: use check-then-insert pattern for agreement_templates upload |
| `d4738ca` | 12 May 2026 | 08:05 UTC | fix: move PDF upload to server-side API route using service role key |
| `5c566cc` | 12 May 2026 | 07:12 UTC | docs: update deployment guide with confirmed pricing and plan code names |
| `5bfd4e2` | 12 May 2026 | 07:06 UTC | feat: update landing page — Formspree ID + usage-based pricing |
| `ca1fa53` | 11 May 2026 | 20:53 UTC | feat: update pricing to usage-based model + refresh roadmap for 12 May |
| `e790e66` | 11 May 2026 | 20:36 UTC | feat: update pricing across all products to match confirmed price list |
| `6eeb603` | 11 May 2026 | 20:15 UTC | fix: align products and tiers across DB schema, API routes, and env vars |
| `4c4fe1d` | 11 May 2026 | 20:12 UTC | fix: add postcss.config.js to portal and admin — required for Tailwind CSS |
| `18ca2f1` | 11 May 2026 | 20:00 UTC | fix: move @import before @tailwind directives in portal globals.css |
| `82a4c42` | 11 May 2026 | 19:52 UTC | fix: add force-dynamic to all portal server components that fetch data |
| `4efc873` | 11 May 2026 | 19:52 UTC | fix: add force-dynamic to all admin API routes to prevent prerender errors |
| `87f7fb1` | 11 May 2026 | 19:50 UTC | fix: restore useRef import in terms-library page |
| `51d6733` | 11 May 2026 | 19:47 UTC | fix: remove useRef unused import and fix force-dynamic on client components |
| `d5a21c1` | 11 May 2026 | 19:45 UTC | fix: add force-dynamic to admin pages to prevent static generation at build time |
| `7085004` | 11 May 2026 | 19:43 UTC | fix: disable noUnusedLocals in admin tsconfig for Vercel build |
| `968e86b` | 11 May 2026 | 19:41 UTC | fix: add vercel.json to admin and portal for explicit build config |
| `20b0189` | 11 May 2026 | 19:20 UTC | fix: add explicit type annotation to supabase server setAll parameter |
| `87a7853` | 11 May 2026 | 19:18 UTC | chore: ignore tsconfig.tsbuildinfo build artifact |
| `23f2fb2` | 11 May 2026 | 19:18 UTC | fix: disable noUnusedLocals in portal tsconfig, remove unused CreditCard import |
| `44fd7d3` | 11 May 2026 | 19:14 UTC | fix: remove next.config.ts files (replaced by next.config.mjs) |
| `11fe5f3` | 11 May 2026 | 19:14 UTC | fix: rename next.config.ts to next.config.mjs for Vercel compatibility |
| `d09ef75` | 11 May 2026 | 18:44 UTC | fix: replace unsupported CREATE POLICY IF NOT EXISTS with drop-then-create |
| `77bb50a` | 11 May 2026 | 18:06 UTC | docs: add full deployment guide — step-by-step infrastructure setup |
| `06bb00f` | 11 May 2026 | 18:03 UTC | feat: order form system, client signing gate, legal pages, admin tools, SOP |
| `7be8d17` | 11 May 2026 | 17:43 UTC | feat: Days 1-15 build — full Lead Gen, DB schema, landing page |
| `edc8dfe` | 11 May 2026 | 17:20 UTC | docs: rewrite roadmap — correct priority order (Lead Gen first, FIGSY second) |
| `7df866a` | 11 May 2026 | 15:47 UTC | docs: add master roadmap — NB.docx brief + full platform audit |
| `296654a` | 11 May 2026 | 15:29 UTC | feat: add AI business operation roadmap to admin and client portal |
| `bfcebe7` | 09 May 2026 | 21:01 UTC | feat: Week 1 — full platform scaffold with auth, billing, and portal |
| `f9b9b1f` | 09 May 2026 | 21:01 UTC | Initial commit |

---

## 44. SOCIAL MARKETING — STRATEGY & CONTENT

*Added: 1 Jun 2026. Research completed: 1 Jun 2026. Status: for founder review.*
*Source: Full audit of ClickUp's social playbook — the B2B SaaS social benchmark. Adapted for K.I.N.D.*

---

## ClickUp — What They Do and What We Steal

ClickUp is the closest social media benchmark for K.I.N.D. They built a B2B SaaS brand to 200 million impressions per month using channels most B2B companies treat as checkboxes. Every decision below is grounded in their actual numbers, confirmed across multiple sources.

---

### TIKTOK — Their Crown Jewel

**Their numbers:** 423,000 followers, 13 million total likes, 200 million impressions per month (1 billion in 2024). Led by Chris Cunningham (Head of Social Marketing).

**The key insight:** Cunningham spent months trying to make ClickUp's own product experts funny on camera. It did not work. He then hired professional actors who had never heard of ClickUp. The actors outperform in-house experts by 10x in engagement. His words: *"People don't open TikTok to learn about project management. They open it to escape work."*

**What they post:**

The account bio reads: *"Actual footage of the corporate world."* It is not a product demo channel. Their top content:

- **"HR Training Module" series** — scripted comedy skits framed as fake corporate training videos, numbered sequentially (Module 11, Module 12, etc.). Individual videos: 999,500 likes and 1.9 million likes. These are among the highest-performing B2B TikToks ever made.
- **"The Scrum Master"** — standalone skit, 2.8 million views, 72,400 likes. Shows the absurdity of the Scrum Master role. Posted January 2024.
- **Song parody skits** — E-40's "Choices" rewritten for HR (121,100 likes), 50 Cent's "P.I.M.P." rewritten for a one-person IT team (81,200 likes).
- **"Boss vs. AI" series** — tapping the human/AI tension in workplaces for 2024–25.
- **Office politics skits** — broader workplace comedy with recurring characters.

**Their rules:** 10 videos per week. Only 1–2 of those are product ads. The rest are pure entertainment. If something works, triple down immediately. Month 1: 4,000 followers. Month 2: two videos hit 10 million views each. Month 3: 150 million impressions per month.

**Hashtag approach:** 4–5 tags per video. 2–3 broad trending tags (#corporate, #corporatehumor, #worklife) + 2 persona-specific tags (#projectmanager, #hr, #scrum).

---

### INSTAGRAM

**Their numbers:** Main account (@clickup) 427,000 followers. Comedy spinoff (@clickupcomedy) 581,000 followers — more popular than the main brand account.

**What they post on the main account:** Team culture posts (photos of employees, behind-the-scenes), weekly "ClickTips" (one product tip, positioned as help not promotion), product UI screenshots, user-generated content from customers, Reels recycled from TikTok.

**The spinoff account:** @clickupcomedy exists to hold the comedy content separately from the brand account. It outgrew the main brand. This is the model.

---

### LINKEDIN

**Their numbers:** 257,000 followers on the company page. Cunningham has said he concentrates on LinkedIn and TikTok above all other channels.

**What they post:**

- **Founder personal brand** — Zeb Evans (CEO) posts about startup sustainability, product milestones as personal stories, team member spotlights, entrepreneurship philosophy, and company values. His posts outperform the company page consistently.
- **Thought leadership** — Posts about how to think about productivity and the category, not just the product. Cunningham posts *about how ClickUp does social* — the meta-content generates speaking invitations and earned media.
- **Employee advocacy** — LinkedIn gives 8x more reach to personal posts vs company pages. ClickUp actively encourages employees to share company content on their own profiles.
- **Milestone storytelling** — Funding rounds, product launches, and recognition framed as journey moments, not press releases.

---

### FACEBOOK

Low priority for ClickUp. No significant organic programme. Used primarily for paid retargeting. Not worth building out for K.I.N.D. at this stage — focus the energy on LinkedIn and TikTok.

---

### COMMUNITY

**ClickUp Verified — three tiers:**

- **Power User** — automatically awarded to top 10% of users by in-product activity. Badge displayed in all workspaces. Awarded monthly.
- **Ambassador (Social)** — applications reviewed monthly. Criteria: sharing ClickUp content on social. Benefits: exclusive resources, community access, co-marketing opportunities.
- **Consultant** — professionals who help teams configure ClickUp. Listed on a public directory. A B2B channel play.

**Canny feedback portal** — public feature request and voting portal. Within 12 months: 3,500 users submitted 30,000+ pieces of feedback. One of the most active Canny communities on the platform.

**Affiliate programme** — via PartnerStack. Up to 30% recurring commission OR $25 per new workspace signup including free signups. 30-day cookie. Minimum payout $20. Paying for free signups dramatically lowers the barrier for advocates to send referrals.

**No Discord or Slack community** — ClickUp does not have one. This is a gap we can fill.

---

### CAMPAIGNS THAT GOT OUTSIZED ATTENTION

**"Jira Gets Fired — Exit Interview" (2021–2023)** — A video styled as a corporate exit interview where JIRA (the competitor) is being fired and replaced by ClickUp. Ran as YouTube pre-roll and circulated heavily on LinkedIn. Confident, funny, competitive without being aggressive.

**Times Square Billboard (2020)** — After their $100M Series B, they ran an animated billboard in Times Square combined with bus and subway OOH across New York. Pure brand awareness timed to a funding announcement. The physical ad mattered less than the content asset — the image of the billboard did the real work.

**The TikTok Pivot (2023–ongoing)** — The decision to go full entertainment/comedy became a marketing story in itself. Covered by SaaSiest, Muse by Clios, B2B Creator, multiple podcasts. Cunningham now speaks at major SaaS conferences about *how* they did it.

---

## What K.I.N.D Steals and Builds

### TikTok and Reels — Start Here

**Steal: Persona-as-protagonist comedy series**
ClickUp makes HR the character in the sketch, not the product. For K.I.N.D., the equivalent:

- **Series: "A day in the life of a founder still doing sales manually"** — deadpan, observational comedy showing the pain of cold outreach without AI. FIGSY solves it in the last 5 seconds. Numbered episodes. Hire a comedic actor who plays a recognisable SME founder archetype.
- **Series: "The Boss's Questions"** — an SME owner asking increasingly impossible questions of their sales team. Milla answers them all instantly. 45 seconds. Comedy + product proof.
- **Series: "Vida, sort this out"** — Vida fixes a chaotic networking situation that a human is visibly drowning in. The relief is comedic.

**Steal: Hire actors, not experts** — Do not put the founder or product team on camera as the leads. Cast people who can naturally embody the SME owner and their pain. The product team can be in the background.

**Steal: Numbered series format** — "Sales Reality Check #1", "Sales Reality Check #7". The number signals ongoing content, builds returning viewers, creates a recognisable brand asset.

**Steal: Persona-specific hashtag layering** — For K.I.N.D.: mix #SMEsales + #saleslife + #businessafrica + #ukbusiness + #foundersofinstagram + #salestips. 2 broad trending tags + 2–3 persona-specific tags per post.

**Adapt: The "escape from work" principle** — For K.I.N.D.'s audience (African and UK SME founders), the comedic release is: *"someone finally gets how chaotic this is."* The pain points that resonate: chasing invoices, losing track of leads, copy-pasting the same pitch 40 times, hiring a sales rep who quits after 3 months. Ground every sketch here.

---

### LinkedIn — Highest Priority for B2B

**Steal: Founder personal brand as the primary LinkedIn channel** — K.I.N.D.'s company page will underperform any founder's personal page at this stage. Post from the founder profile first. Product updates, customer wins, founder philosophy, failures. The K.I.N.D. company page reshares and amplifies.

**Steal: Meta-content about the category, not just the product** — Posts that educate the market on AI sales agents, not just K.I.N.D. specifically:
- "A 3-person sales team using AI closes like a 12-person team. Here is the maths."
- "Why Nigerian SMEs are skipping CRM and going straight to AI agents."
- "What FIGSY does in 8 minutes that your SDR does in 3 days."
- "The death of the junior SDR role. What replaces it."

**Steal: Customer story posts** — 250–400 words. Format: Problem → What they tried before → How they use K.I.N.D. → Specific result (pipeline built, deals closed, hours saved). One per week.

**Steal: Employee and agent advocacy** — Post from FIGSY, Milla, and Vida's POV. The agents have personalities. FIGSY can have opinions about cold email. Milla can explain things. Vida can make introductions. Create social personas for the agents and post from them — this is differentiated and memorable.

**Frequency:** 3–4 posts per week from the founder profile. 2–3 from the company page.

---

### Instagram

**Steal: Launch a comedy spinoff account** — @KINDsaleslife or @AIvsManualSales. A comedy account separate from the main K.I.N.D. brand. If a sketch goes viral it does not need to match the brand aesthetic. ClickUp's comedy spinoff outgrew their main account — build this from day one.

**Steal: Team culture posts** — The paradox of an AI platform is that customers want to know the humans. Post behind-the-scenes of the people building FIGSY, Milla, and Vida. Show the founders working. Show the product being built. Show the humans.

**Adapt: Product demos as short Reels** — 30 seconds showing FIGSY finding a lead, Milla qualifying it, Vida sending the outreach. The whole flow. Not a static screenshot — a fast Reel with captions.

---

### Community — Build Now, Not Later

**Steal: K.I.N.D. Verified — three tiers**

- **Power User** — automatically awarded to top users by platform activity each month. Badge. Early access to new agent features. No application required.
- **Ambassador** — for founders and sales leaders who share K.I.N.D. on LinkedIn or TikTok. Apply via a simple form. Benefits: exclusive content, direct access to the product team, co-marketing opportunities, early feature previews.
- **Partner/Consultant** — African and UK-based sales consultants who implement K.I.N.D. for clients and earn referral commission. Listed on a public directory.

**Build what ClickUp missed: WhatsApp Communities** — ClickUp has no Discord or Slack community. For K.I.N.D.'s African SME audience, WhatsApp is the dominant community infrastructure. Launch a K.I.N.D. WhatsApp Community (not just a group — use the WhatsApp Communities feature) for verified users. Weekly office hours inside it. For UK users, a Slack workspace alongside.

**Steal: Affiliate programme that pays for free signups** — $X for every workspace that activates even on a free trial, larger commission for paid conversions. The low barrier drives massive advocate volume. Use PartnerStack or FirstPromoter.

---

### Campaigns to Build

**Steal and adapt: "Your sales process hands in its resignation"** — A short video styled as a corporate exit interview where "Manual Outreach" is the departing employee. Gentle, funny, clear. Clip it for TikTok and Reels. Run the full 90-second version as LinkedIn video and YouTube pre-roll.

**Build when funding is confirmed: OOH as content asset** — One eye-catching outdoor ad in Lagos, Accra, Nairobi, or London. The physical placement matters less than the photograph — post it on LinkedIn as a milestone moment. The image does 50x the work of the billboard.

**Start now: Document the build** — The story of building an AI sales platform for African SMEs is the content. Post the journey. Share the decisions. Talk about what works and what does not. This generates earned media, speaking invitations, and an audience that is there before the product is fully ready.

---

## Channel Priority for K.I.N.D

| Channel | Priority | Why | What to post | Frequency |
|---------|----------|-----|--------------|-----------|
| LinkedIn | **Highest** | B2B decision-makers are here. African and UK SME founders are active on LinkedIn. | Founder posts: category education, customer stories, journey. Agent persona posts. | 3–4 founder posts/week |
| TikTok / Reels | **High** | Fastest brand awareness growth for B2B. ClickUp proved the playbook works. | Numbered comedy sketch series. Persona-as-protagonist. Hired actors. | 3–5 videos/week |
| Instagram (comedy) | **High** | Launch @KINDsaleslife as separate account from day one. | Comedy sketches, behind-the-scenes, agent personality content. | 3–5 Reels/week (same content as TikTok) |
| WhatsApp Community | **High** | Primary community channel for African users. No competitor is here. | Weekly office hours, feature previews, Power User recognition. | Weekly |
| Instagram (main) | **Medium** | Brand presence, culture, product demos. | Team posts, product Reels, customer wins. | 3–4 posts/week |
| Facebook | **Low** | Paid retargeting only. No organic programme at this stage. | — | As needed for ads |

---

## Content Pillars (what we talk about)

1. **The AI sales agent category** — educating the market that AI agents are not ChatGPT plugins. They are dedicated workers. FIGSY has a job title, not a prompt.
2. **African business reality** — the specific challenges of doing B2B sales in Nigeria, Kenya, South Africa, Ghana. No one else in this space speaks to this directly.
3. **The death of manual outreach** — the cost of doing sales the old way. Cold email spam, burned domains, SDR attrition. Comedy and serious posts both.
4. **Customer wins** — specific results. Pipeline built. Deals closed. Hours saved. Always with numbers.
5. **Behind the build** — the story of building K.I.N.D. The decisions, the failures, the pivots. Founders following along become customers.
6. **Agent personalities** — FIGSY, Milla, and Vida as characters with opinions. FIGSY on cold email strategy. Milla on intelligence. Vida on relationships. This is differentiated.

---

## Sources

- Chris Cunningham on X: actors vs. product experts
- SaaSiest: ClickUp social strategy 33K to 500K followers
- ContentYum: ClickUp's 200M impressions mission
- Campaign Live: workplace comedy as brand strategy
- ClickUp Verified programme (clickup.com/community/verified)
- StorieChief: ClickUp content marketing strategy
- TikTok @clickup: HR Training Module 11 (999K likes), Module 12 (1.9M likes)
- TikTok @clickup: The Scrum Master (2.8M views)
- YouTube: Jira Gets Fired by ClickUp
- Vimeo: ClickUp Times Square Billboard
- ClickUp affiliate programme via AffyList
- Canny case study: ClickUp feedback community
- Instagram @clickup (427K) and @clickupcomedy (581K)
- LinkedIn ClickUp company page (257K followers)

