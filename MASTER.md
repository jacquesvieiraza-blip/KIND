# K.I.N.D — MASTER DOCUMENT
**Single source of truth. Last updated: 2 June 2026**
**Business: UK registration pending (Companies House) · Platform: Africa-first, world-ready**

---

## TABLE OF CONTENTS

0. [Daily Brief](#-section-0--daily-brief)
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
13. [Revenue Targets & KPIs](#13-revenue-targets--kpis)
14. [Cashflow Model](#14-cashflow-model)
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

---

## 🗓️ SECTION 0 — DAILY BRIEF
*Rewritten at the end of every session. Always current. Read this first — nothing else matters until this is clear.*
*Claude protocol: read Section 0 before touching anything. Update Section 0 as the last action of every session. Commit immediately.*

---

### 📅 SESSION DATE — 2 June 2026 (WEBSITE + PORTAL — Agent Image Redesign)
**One-line summary:** Replaced all three agent images with Pixar/Disney 3D cartoon style characters (FIGSY, Milla, Vida) — consistent soft lavender backgrounds — and added staggered float animations across website and portal. Built hero playfulness (Alta-style floating balls), wired playbook email form to real API, added portal subscriber capture endpoint.

**WHAT WAS BUILT:**
| Area | Detail |
|------|--------|
| Agent images | New Pixar-style 3D portraits: FIGSY (man, earpiece), Milla (glasses, dark hair up), Vida (wavy hair, warm smile). Soft lavender background. 1024×1536. Deployed to `apps/website/` and `apps/portal/public/agents/` |
| Float animations | `@keyframes agent-float` — 14px vertical bob, 4s ease-in-out. Staggered delays (0s / -1.35s / -2.7s). Hover pauses float + purple glow. Applied to: website hero cards, portal AgentSidePanel, figsy-chat h-40 card, onboarding h-52 card |
| Hero card labels | Alta-style dark translucent label bar on each hero card: FIGSY \| AI Sales Agent, Milla \| AI Virtual Assistant, Vida \| AI Chat Agent. `backdrop-filter: blur(10px)` |
| Hero playfulness | Alta-style floating background balls — 5 purple/violet 3D radial-gradient spheres drifting slowly behind hero content. Hero background updated from `#f0f4ff` (blue) to `#faf5ff` (lavender — brand correct) |
| Playbook form | Wired `submitPlaybook()` to `POST /api/public/subscribe` — real fetch, loading state, error handling |
| Subscribe API | New `/api/public/subscribe` endpoint — saves to Supabase `subscribers` table, emails founder via Resend |
| `prefers-reduced-motion` | All new animations (agent float, hero balls) respect the media query |

**BRAND DECISION LOCKED:**
- Brand colour is **purple/violet** (not electric blue). Hero background, ball colours, card shadow all updated.
- Agent character style locked as **Pixar 3D animated** — NOT photorealistic photos.
- Animations apply **website AND portal** consistently.

**DALL-E PROMPTS (saved for regeneration):**
- FIGSY: `3D animated film character portrait, Pixar and Disney style render. Confident white man, late 30s, short neat dark hair, light stubble, strong jaw, confident smile, small wireless earpiece. Wearing a crisp dark navy blazer over a white shirt. Very soft light lavender and pale lilac background, almost white, with extremely subtle out-of-focus bokeh dots, airy and minimal. No text. 8K Pixar quality.`
- Milla: same style, white woman early 30s, dark hair up, thin-frame glasses, navy blazer, same lavender background.
- Vida: same style, white woman late 20s, wavy light brown hair down, warm smile, no glasses, navy blazer, same lavender background.

**REMAINING — Claude build queue:**
- [ ] D-ID talking animation — upload FIGSY/Milla/Vida to d-id.com → generate 5s idle loop → swap `<img>` for `<video autoplay loop muted playsinline>` — test FIGSY first
- [ ] Portal agent animations on remaining pages: KPI page large displays, knowledge page large displays — investigate if containers are actually large enough
- [ ] Hero orb colours — currently still blue (`rgba(37,99,235,...)`). Could update to purple to match brand. Deferred.
- [ ] Blog article pages — cards currently link to `href="#"` (by design for now)
- [ ] Website audit residual items from Groups A/B/D

**FOUNDER CRITICAL — still blocking billing:**

### 📅 SESSION DATE — 1 June 2026 (evening — WEBSITE)
**One-line summary:** Marketing-website session — built company/content pages (story, values, blog, playbook), restored full trust.html compliance (POPIA·GDPR·CAN-SPAM·CCPA·email infra·"what we don't do"), then ran a full 27-page deep audit and fixed every inconsistency (nav, CTA, domain, links, placeholders).

**WEBSITE — what was built/fixed tonight:**
| Area | Detail |
|------|--------|
| New pages | `story.html` (anonymous origin, 2023→2026 timeline), `values.html` (4 value cards + in-practice), `blog.html` (6-article index), `playbook.html` (lead magnet + email capture, JS thank-you) |
| trust.html restored | Full compliance content back in new layout: POPIA, Data Sovereignty (Cape Town), GDPR, **CAN-SPAM (US)**, **CCPA/CPRA (California)**, Email Infrastructure (Resend/SPF/DKIM/DMARC/warming), Security, "What we don't do" (6 commitments) |
| Nav — global fix | Full hover dropdown nav (Products/Demo/Use Cases/Resources/Company/Pricing) now consistent on ALL pages. Fixed: agent pages had no nav; inner pages used click (not hover); pricing/about/support/use-cases had diverged nav missing Demo link + old dropdowns |
| CTA consistency | Every nav primary button standardized to **"Start 14-day trial"** (was a mix of "Start free", "Start free trial", "Start 14-day trial") |
| Domain unify | All login/signup/terms/privacy links → canonical `app.get-kind.com` (was raw `kindportal-production.up.railway.app` on ~18 pages) |
| Legal fix | dpa.html entity/governing-law contradiction fixed — aligned to "Jacques Vieira trading as K.I.N.D / England and Wales" (matched terms.html + dpa-us.html) |
| Content fixes | Removed all visible `[PLACEHOLDER]` tokens (trust/blog/playbook); demo-video.html "12.8 reply rate" → "12.8% reply rate"; terms.html absolute → relative links; Resources dropdown promo dark bg (text was invisible) |
| Audit method | 4 parallel deep-dive agents covering all 27 pages + final verification sweep: 0 broken internal links, 0 visible placeholders, correct competitor names on all vs-* pages, all nav CTAs correct |

**WEBSITE — known/remaining (for founder section-by-section smoke test):**
- blog.html article cards link to `href="#"` — no individual article pages exist yet (by design for now)
- playbook.html email form has `// TODO: wire to email service` (Mailchimp/ConvertKit) — captures but does not yet send
- Trust-bar / stats numbers on agent pages are illustrative (e.g. "2,400+ meetings booked") — confirm or replace with real data
- Video pages (figsy-video, platform-video, demo-video, platform-video-standalone) are standalone embeds with no nav/footer by design

---

### 📅 SESSION DATE — 2 June 2026
**One-line summary:** Full session build — 3 TS fixes, complete Partner Programme, PWA live on Railway, verification audit (15 working / 3 stubs), billing prices corrected, MASTER pricing corrected, Stripe products confirmed by founder.

**HOSTING NOTE — CRITICAL:** Railway ONLY. Portal, admin, and API all deployed on Railway. There is no Vercel. Any reference to Vercel in this document is an error that has not yet been corrected. Do not follow Vercel instructions.

---

### ✅ WHAT WAS BUILT THIS SESSION (2 June 2026)

#### Fixes
| Fixed | Detail |
|-------|--------|
| `ignoreBuildErrors: true` removed from portal | Was hiding 3 TypeScript crashes in production. All 3 fixed immediately. |
| 3 TypeScript errors fixed | Morning audit — 0 errors across all 3 apps after fix |
| Billing page prices corrected | Lead Gen $20/$40/$100, FIGSY $20/$40/$100 — code had $38/$88/$60/$110/$250 (wrong) |
| MASTER pricing model corrected | Removed fictional Starter/Growth tiers — real model is credit bundles + Milla/Vida monthly only |
| PWA offline page missing `'use client'` | Build failed on Railway — fixed immediately, redeployed |

#### Partner Programme (fully built)
| Built | Detail |
|-------|--------|
| Sandbox auto-provisioning | Admin approves partner → real client account created (`is_demo=true`, 100 credits, SaaS ICP, all 4 products on Starter, Apollo runs in background) |
| Partner Hub sandbox card | Portal `/dashboard/partner` — status, expiry, one-click magic link login |
| Admin sandbox column | "Live" badge if provisioned, "Provision" button if not |
| Day 2 / 7 / 14 drip emails | Fire automatically on partner approval — `sendPartnerDripEmail()` |
| Partner pricing page | `/dashboard/partner/pricing` |
| Onboarding step 6 | Updated with real sandbox details |

#### Portal improvements
| Built | Detail |
|-------|--------|
| Milla language badges | Page header strip: English / Francais / Kiswahili / Hausa. Also on upgrade screen. |
| OnboardingChecklist refresh | Heading "Launch your AI Revenue OS". All indigo replaced with portal purple `#7C3AED`. |
| OnboardingBanner component | Trial / awaiting_payment states, urgency colouring, dismissable |
| Dashboard new-user greeting | "Your AI Revenue OS is ready. Build your ICP and FIGSY handles outreach — no SDR required." |

#### Docs
| Built | Detail |
|-------|--------|
| `DEPLOYMENT_GUIDE.md` | All Paystack refs replaced with Stripe throughout |
| `client-flow-sop.md` | Paystack replaced with Stripe throughout, date updated |

#### Stripe (confirmed by founder)
| Done | Detail |
|------|--------|
| Milla product created | prod_UcjOFe7esiG2Xa — Milla Virtual Assistant ($49/mo) |
| Vida product created | prod_UcjOB0KZXHlmSy — Vida Chatbot Agent ($39/mo) |
| 6 credit bundle products exist | Lead Gen 20/40/100 + FIGSY 20/40/100 — all $1/credit |

#### PWA (Progressive Web App) — live at app.get-kind.com
| Built | Detail |
|-------|--------|
| PWA manifest | `apps/portal/src/app/manifest.ts` — shortcuts, theme `#7C3AED`, standalone display |
| App icons | `icon.tsx` + `apple-icon.tsx` — purple K, 512px + 180px Apple touch |
| Service worker | `public/sw.js` — cache-first static, network-first nav, API bypass, offline fallback |
| Offline page | `app/offline/page.tsx` — branded, retry button |
| PWARegister | SW registered on mount |
| PWAInstallBanner | Add to Home Screen prompt — Android native + iOS share-sheet guide, dismissable |
| Root layout | Viewport meta, manifest, apple-web-app-capable, push notifications ready (iOS 16.4+) |
| iPhone install | Safari → `app.get-kind.com` → Share → Add to Home Screen → full-screen app |
| PWA mockup | `docs/pwa-mockup.html` — visual: home screen, dashboard, install flow, push notification |

#### Verification audit (15 confirmed working, 3 confirmed stubs)
| Item | Result |
|------|--------|
| KPI time range filters | Built |
| Reply from inbox | Built |
| Consent token security | Cryptographic |
| Campaign pause emails | Wired |
| Weekly report email | Wired |
| Sequence branching | Built |
| Admin cohort analytics | Real data |
| Milla chat persistence | Built |
| Mobile responsive layout | Built |
| NotificationBell | On-design |
| AgentSidePanel images | Working |
| Knowledge base page | On-design |
| Developer portal (P3-1) | Working |
| Proposals + e-sign (P3-4) | Working |
| Visitor de-anon (P3-7) | Working — needs `CLEARBIT_API_KEY` in Railway |
| AI personalised images (P2-13) | STUB — static SVG only, no DALL-E wired |
| Social signals (P2-14) | STUB — no social API connected |
| FIGSY vertical modes (P3-2) | STUB — no structured vertical branching |

---

### ✅ ALREADY DONE — CONFIRMED (do NOT repeat these)

These are confirmed complete. Do not attempt to redo any of them.

| Item | Status |
|------|--------|
| Apollo API key in Railway | Done |
| `RESEND_API_KEY` in Railway | Done |
| Railway build green | Done |
| All SQL migrations (subscriptions, drip, cascade, credit race) | Done |
| Stripe account created + 6 credit product prices configured | Done |
| Stripe keys in Railway | Done |
| `NEXT_PUBLIC_STRIPE_PRICE_*` credit bundle vars in Railway Portal service | Done — NOTE: Railway, NOT Vercel |
| UK company registration (Companies House) | In progress |
| HubSpot account + `HUBSPOT_API_KEY` in Railway | Done |
| Resend inbound webhook + `RESEND_WEBHOOK_SECRET` in Railway | Done |
| `FIGSY_KIND_CLIENT_ID` in Railway | Done |
| Calendly link wired site-wide | Done |

---

### 🔴 FOUNDER — YOUR TO-DO LIST (IN PRIORITY ORDER)

**PRIORITY 1 — Billing is broken without these. Do these first.**
| # | Task | Where |
|---|------|-------|
| 1 | Add 8 Stripe `price_xxx` IDs to Railway | Stripe → each product → click price row → copy `price_` ID. 6 credit bundle IDs → Railway Portal service as `NEXT_PUBLIC_STRIPE_PRICE_*`. Milla monthly ID → Railway API service as `STRIPE_PRICE_MILLA_MONTHLY`. Vida monthly ID → Railway API service as `STRIPE_PRICE_VIDA_MONTHLY`. You already have Milla's `price_xxx` — need 7 more. |
| 2 | Run `20260527_stripe_subscription_id.sql` | Supabase SQL Editor |
| 3 | Set `ADMIN_SECRET_KEY` in Railway API service | Any strong random string |
| 4 | Run meetings_booked migration | Supabase SQL Editor: `ALTER TABLE public.figsy_campaigns ADD COLUMN IF NOT EXISTS meetings_booked integer NOT NULL DEFAULT 0;` |

**PRIORITY 2 — Your account:**
| # | Task | Where |
|---|------|-------|
| 5 | Add credits to `jacques.vieiraza@gmail.com` | Admin portal → your account → grant credits |

**PRIORITY 3 — Infra:**
| # | Task | Where |
|---|------|-------|
| 6 | Railway health check | Railway → API service → Settings → Health Check path: `/health` |
| 7 | UptimeRobot | uptimerobot.com — free — monitor API `/health` every 5 mins, SMS alert |
| 8 | Railway plan check | Confirm you are not on hobby/starter — upgrade to production if needed |

**PRIORITY 4 — Systems upgrades (revenue-critical at scale):**
| # | Task | Cost | Why |
|---|------|------|-----|
| 9 | Upgrade Resend to paid | $20/mo | Free plan = 100 emails/day cap — FIGSY hits this fast |
| 10 | Upgrade Apollo to Basic | $49/mo | Free plan = 50 credits/month — barely enough for demos |
| 11 | Google Workspace | ~$12/mo | When first client or first hire |

**PRIORITY 5 — Feature flags (5 min each in Railway env vars):**
| Variable | What it unlocks |
|----------|----------------|
| `FEATURE_PORTAL_V2=true` | Portal V2 redesign |
| `FEATURE_CAMPAIGN_INTENT=true` | Campaign intent signals |
| `FEATURE_ICP_BUILDER=true` | ICP Builder chat |
| `CLEARBIT_API_KEY=<key>` | Visitor de-anonymisation (built, just needs key) |

**PRIORITY 6 — Integrations (built, need credentials):**
| # | What | Env vars needed |
|---|------|----------------|
| 12 | WhatsApp outreach | `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_VERIFY_TOKEN` — Meta 3-7 day approval. START THE APPLICATION NOW if not started. |
| 13 | Google Calendar OAuth | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` + `GOOGLE_REDIRECT_URI` |
| 14 | Vapi.ai Voice | `VAPI_API_KEY` + `VAPI_PHONE_NUMBER_ID` + `VAPI_ASSISTANT_ID` + `VAPI_WEBHOOK_SECRET` |

**PRIORITY 7 — Legal:**
| # | Task | Cost |
|---|------|------|
| 15 | ICO data protection registration | £40/yr |
| 16 | UK Companies House registration | In progress — ~£50 |
| 17 | Open Wise Business account | Free — wait until UK company number arrives |
| 18 | SEIS advance assurance | Free to apply — before any investor conversation |
| 19 | Trademarks: K.I.N.D + FIGSY + Milla + Vida at UK IPO | ~£320 total |
| 20 | SeedLegals IP assignment + shareholders agreement | ~£600 |

**PRIORITY 8 — Smoke tests:**
| # | Task |
|---|------|
| 21 | Run Section 18 Tests 1–4 step by step with Claude — report failures as `T1-Step8 — what you saw` |

**PRIORITY 9 — GTM (after smoke tests pass):**
| # | Task |
|---|------|
| 22 | 10 warm personal outreach messages (LinkedIn / WhatsApp) |
| 23 | G2 listing (free) |
| 24 | Capterra listing (free) |
| 25 | Product Hunt launch — Claude writes the copy |
| 26 | LinkedIn content programme — Claude writes weekly, you post |
| 27 | First 5 paying clients |

---

### 🤖 CLAUDE BUILD QUEUE

**Immediate — no blockers:**
| # | Task | Est. |
|---|------|------|
| 1 | Smoke test fixes — real-time during Section 18 | <15 min each |
| 2 | Onboarding checklist end-to-end verify | 1h |
| 3 | S4 Scheduled report emails — cron exists, email not yet wired | ~4h |
| 4 | W2 Signal tokens in FIGSY sequences | ~1 day |
| 5 | Push notifications backend — VAPID keys + subscription endpoint | ~1 day |
| 6 | P5 Chat history persistence — AskFigsyButton resets on reload | ~2h |
| 7 | P6 NotificationBell theme — mismatches dark sidebar | ~30 min |

**Your decision needed before Claude can build:**
| # | Task | Decision required |
|---|------|------------------|
| 8 | P2-13 AI personalised images | Use DALL-E? ~$0.04/send |
| 9 | P2-14 Social signals | Which API? LinkedIn has ToS risk |
| 10 | P3-2 FIGSY vertical modes | Confirm vertical list (SaaS / Agency / E-comm / etc.) |

**At 10+ clients:**
| # | Build |
|---|-------|
| C10 | 3-type memory model — split `figsy_memory` into episodic + long-term + preference |
| C11 | Deliverability dashboard — SPF/DKIM/DMARC, bounce rate, blacklist per domain |
| C12 | Email score pre-send — flag weak copy before it fires |
| C13 | Adaptive send volume — auto-adjust based on domain health |
| C14 | Intent signal detection — job changes, funding, hiring trigger outreach |
| C15 | Client morning brief email — extend founder brief to all active clients |
| C16 | Multi-model toggle per campaign — Haiku (volume) vs Sonnet (quality) |

**At 20+ clients:**
| # | Build |
|---|-------|
| C17 | Configurable agent triggers — UI-driven cron scheduling |
| C18 | A/B subject line testing — auto-pick winner after 50 sends |
| C19 | Conditional sequence branching — warm reply triggers different path |
| C20 | Waterfall enrichment — Apollo → PDL → Hunter → Clearbit |
| C21 | Kanban deal view |
| C22 | File approval workflow |
| C23 | ICP auto-refinement |

**Year 2:**
| # | Build |
|---|-------|
| C24 | Multi-agent orchestration (FIGSY + OTTO + LENA parallel) |
| C25 | FIGSY Memory v2 with pgvector |
| C26 | Pipeline forecasting |
| C27 | In-portal client messaging |
| C28 | Realtime dashboard (Supabase realtime) |
| C29 | Proposal + e-sign |
| C30 | Mobile app (iOS + Android) |
| C31 | MCP server (K.I.N.D as AI infrastructure) |
| C32 | 500+ FIGSY skill library |

---

### 🏗️ KNOWN TECHNICAL DEBT

| # | Debt | Severity |
|---|------|----------|
| 1 | Duplicate routes `/leads/consent/bulk` + `/leads/bulk-consent` — same functionality, different params | Medium |
| 2 | Exchange rate hardcoded R19/$ — update monthly at 50+ clients | Low |
| 3 | Sequence branching — UI built, API wiring pending | Medium |
| 4 | Meetings booked — metric visible, not yet linked from Hot replies to booking rate | Medium |
| 5 | Real open-rate tracking — currently estimated heuristic, not true pixel tracking | Medium |

---

### ⚠️ MASTER ERRORS STILL TO FIX (Vercel references and stale content)

These errors exist elsewhere in MASTER.md (Sections 1–36) and have NOT been corrected yet. Note them here so they are not acted on:

| Location | Error | Correct fact |
|----------|-------|--------------|
| Section 21 Key Decisions table | "Hosting: Supabase af-south-1 + Railway + Vercel" | Railway ONLY — no Vercel |
| Section 17 Tech Stack / Quick Reference | Table shows Vercel as portal host | Remove / replace with Railway |
| Older "done" list entries | "NEXT_PUBLIC Stripe vars in Vercel" | These are in Railway Portal service |
| Section 1 Current Status | Portal hosting listed as "Vercel — kind-portal" | Railway |
| Section 0 historical entries (28 May "Today — Step by Step") | References "Check Vercel portal + admin both deploy successfully" | Stale — Railway only |
| Stale "Today — Step by Step (28 May 2026)" section | Entire step-by-step for 28 May is obsolete | Archive or remove |
| Stale "Week Ahead" table (26–31 May) | Sprint plan for a completed week | Update to current |
| Stale "Open Blockers" section | Most blockers from 28 May are resolved | Update |

---

### 🔒 KEY DECISIONS LOCKED THIS SESSION

| Decision | Outcome |
|----------|---------|
| Hosting | Railway ONLY — Portal, Admin, API. No Vercel. Confirmed and noted as MASTER error. |
| Billing prices | $1/credit across all bundles. Lead Gen: $20/$40/$100. FIGSY: $20/$40/$100. |
| Pricing model | Credit bundles + Milla ($49/mo) + Vida ($39/mo) monthly add-ons. No subscription tiers (Starter/Growth were fictional). |
| PWA | Live at app.get-kind.com — Safari Add to Home Screen confirmed working on iPhone. |
| Partner sandbox | Auto-provisioned on approval — real client, `is_demo=true`, 100 credits, SaaS ICP, all 4 products. |
| Stubs (no decision yet) | P2-13 (AI images), P2-14 (social signals), P3-2 (FIGSY vertical modes) — all await founder decision. |

---

### 📌 SECTION 0 PROTOCOL

**Jacques: read Section 0 only at the start of each session. Tell Claude what got done from the founder to-do list. Claude reads Section 0, then starts work.**
**Claude: rewrite Section 0 as the LAST action of every session. Commit immediately. Never leave it stale.**


#### 9–11 May 2026 — Platform Scaffold
| Built | Detail |
|-------|--------|
| Full monorepo scaffold | Turborepo, TypeScript — portal, admin, API, website |
| Supabase auth | Signup, login (email confirmation removed later) |
| Express API | Auth, clients, leads, subscriptions, Paystack routes |
| Portal pages | Login, onboard, dashboard, billing, settings, leads, assistant, chatbot |
| Full DB schema | subscriptions, icps, leads, opt_out_blocklist, assistant_messages, chatbot_configs, usage_metrics + RLS |
| ICP CRUD + activate | Full routes |
| Leads routes | Stats, list, create, status update, opt-out, AI email draft, CSV export |
| Lead scoring | Claude Haiku 0–100 + reasoning |
| POPIA consent email | + callback |
| Weekly Monday digest | Cron |
| Bulk consent send | Up to 100 leads |
| Order form system | Client signing gate in admin |
| Terms library | Admin page |
| Legal pages | Terms, Privacy, POPIA, DPA, DPA-US on website |
| Deployment guide | `docs/DEPLOYMENT_GUIDE.md` |

#### 17–18 May 2026
| Built | Detail |
|-------|--------|
| Demo Environments | Admin tool — creates real user + client, runs Apollo ICP, magic link, extend/expire |
| AI ICP Suggest | "Suggest ICP with AI" → Claude Haiku fills form |
| Credit management | Admin grant/refund credits per client + full transaction history |
| Company reg + VAT fields | Portal settings + admin client detail |
| RLS fix — credit_transactions | CRITICAL security fix — was exposing cross-client financial data |
| Referral flow | `?ref=` persistence, `/clients/referrals`, credit audit trail |
| KPIs dashboard | Parallel fetch, pipeline funnel, industry benchmarks |

#### 19 May 2026
| Built | Detail |
|-------|--------|
| FIGSY agent memory | `figsy_memory` table, refresh endpoint, cron |
| FIGSY weekly digest | Monday email includes FIGSY stats |
| FIGSY escalation alerts | Auto-pauses campaigns <1% reply rate — `paused_low_performance` status |
| FIGSY identity card | Named agent UI, live stats, green pulse in portal |
| Demo page `/demo` | 8 feature chapters, scroll-triggered animations |
| Platform video | `platform-video.html` — 16-scene auto-playing demo (FIGSY + Milla + Vida) |
| Client flow Mermaid chart | `docs/client-flow-sop.md` — 7 client paths |

#### 20 May 2026
| Built | Detail |
|-------|--------|
| Homepage rewrite V2 | New positioning — FIGSY Reasoning Loop, POPIA trust, Start/Scale/Dominate |
| Pricing page | Start/Scale/Dominate tiers |
| About page | Founder Belief, Dogfooding, AI Revenue Team |
| `generateSequenceWithMemory` | FIGSY self-improvement using campaign history |
| Milla morning brief cron | 07:30 UTC to all active clients |
| Milla anomaly detection cron | 08:30 UTC |
| FIGSY auto-replenish cron | 05:00 UTC |
| K.I.N.D self-outreach cron | Monday 06:00 UTC — Apollo search auto-enrols prospects |
| `/stats/platform` | Public endpoint — live platform stats |
| 12 cron jobs at this point | Final count grew to 19 by 26 May |

#### 22–24 May 2026
| Built | Detail |
|-------|--------|
| Partners page rewrite | ClickUp/Smartsheet model — fixed pricing, commission-based |
| Campaign intent prompt | Feature flagged — `FEATURE_CAMPAIGN_INTENT=true` |
| Conversational ICP builder | Feature flagged — `FEATURE_ICP_BUILDER=true` |
| Web Speech API voice input | Mic button on both above — Chrome/Safari/Edge |
| ICP website scan | "Scan website" → `/icps/prefill` → pre-fills from URL |
| Admin cohort analytics | `/admin/cohorts` — monthly grouping, activation/conversion/churn |
| Portal analytics page | `/dashboard/analytics` — 6-month trends, ICP breakdown, score distribution |
| Stripe billing wired | Fully activates on `STRIPE_SECRET_KEY` env var |
| Portal dark mode + UI upgrade | Dashboard redesign + grouped sidebar |
| Portal V2 full redesign | SidebarV2, Mission Control — behind `FEATURE_PORTAL_V2=true` |
| Milla + Vida on website | Removed Coming Soon, added pricing, updated CTAs |

#### 25 May 2026 — Massive Admin Build
| Built | Detail |
|-------|--------|
| Schema drift fixes | `apollo_only_consented`, `amount_usd` removed, 5 missing columns fixed |
| Signup hotfix | `amount_zar` NOT NULL constraint fix — all new signups work |
| Daily automated audit | `.github/workflows/daily-audit.yml` — runs 04:00 + 16:00 SAST, opens GitHub Issue on failure |
| `MASTER_SCHEMA.sql` | Single SQL to fully sync live DB — eliminates all schema drift |
| **Admin dark theme** | Full rollout — all pages restyled to dark-first design |
| **Admin Founder OS V2** | Dark sidebar, grouped sections, Founder OS branding |
| **Admin AI exec team pages** | `/agents/otto`, `/lena`, `/reeve`, `/cmo`, `/cto`, `/cfo` — agent identity cards + brief API |
| **Admin living docs viewer** | `/docs/*` — renders MASTER, run-costs, legal as markdown |
| **Admin compliance tracker** | `/compliance` — full certification roadmap (SOC2, ISO 27001, ISO 42001) |
| **Admin platform health page** | `/health` — system-wide monitoring |
| **Admin revenue deep-dive** | `/revenue` — scenario tracker |
| **Admin dark restyle** | Clients list, client detail — health scoring, at-risk filter, credit management |
| **Internal briefs router** | `POST /internal/briefs/*` — AI exec team daily briefs |
| **Waitlist landing page** | Pre-launch interest capture (`netlify-waitlist/`) |
| **Milla + Vida billing launch** | Lock screens, demo request, pricing ($49/$39) in portal |
| **Sales playbook** | `docs/sales-playbook.md` — discovery script, objections, demo flow, proposal |
| Art of the Possible (Sections 24–28) | 15 pieces, 3 teachers, MCP vision, full competitor study |
| AI Learning capability doc | Section 27 |
| ClickUp Brain deep-dive | Section 28 (32 in current numbering) |

#### 26 May 2026
| Built | Detail |
|-------|--------|
| **3× daily auto-status system** | `platform_status` table, `POST /internal/status/snapshot`, Admin `/status` page, crons at 07:10/12:00/19:00 SAST |
| **Stripe 3-tier credit bundles** | 40cr tier added — Lead Gen: $20/$38/$88 · FIGSY: $60/$110/$250 |
| **Flutterwave integration** | ZAR/NGN/KES/GHS local African payments — Phase 2, code complete |
| **ICP cascade delete migration** | `leads.icp_id SET NULL` on ICP delete — HIGH debt resolved |
| **Calendly booking link wired** | Website + landing + portal |
| **HubSpot CRM full sync** | `lib/hubspot.ts` — signup→contact, payment→deal, FIGSY reply→timeline |
| **Admin HubSpot pipeline** | `/hubspot` — Kanban by stage, setup guide if key absent |
| **Founder morning brief** | `POST /internal/founder-brief` — daily 07:05 SAST dark HTML email |
| **Admin scalability page** | `/scalability` — stage tracker, hire checklist, infra triggers |
| **Competitor ICP seed configs** | `supabase/seeds/competitor_icps.sql` — Lemlist/Instantly/Clay/Apollo users in ZA/NG/KE/GH/EG |
| Lead drip system | `delivered_at` on leads, `daily_drip_rate` per client, 08:10 UTC cron |
| Credits deduct at delivery | 1 credit per lead when drip delivers |
| Low credit warning | Daily 07:40 UTC — emails clients at 1–4 credits |
| Subscription lapse check | Daily 09:00 UTC — marks lapsed, emails client |
| Milla hooks crash fixed | React hooks violation resolved |
| Milla/Vida access gates | `active` only — trialing removed |
| FIGSY trial expiry gate | Backend rejects expired trialing subs |
| Cancel subscription | `POST /subscriptions/:id/cancel` |
| Recurring billing webhooks | subscription.create + charge.success handlers |
| Admin credit grant cap | 500 per grant max |
| Full system audit | 45 issues found, 14 fixed this session |
| FIGSY inbound webhook fix | `/replies/inbound` moved before `requireAuth` |
| Bulk export row cap | 5,000 rows + `X-Export-Truncated` header |
| Widget rate limiting | 20 req/IP/min on Vida public widget |
| Apollo free plan error handling | Clean 402/429 — safe to use free plan |
| **ClickUp competitive audit** | Section 24 — full feature comparison + steal-now S1–S8 |
| **Apex competitive audit** | Section 25 — "AI Revenue OS" positioning steal |
| **Full competitor landscape** | Section 26+33 — 31 competitors, 7 tiers |
| **Art of the Possible queue** | Section 27 — 30 build items, 4 tiers |
| **Visual roadmap flowchart** | `docs/roadmap-flowchart.html` — Day 1–5 with pass/fail branches |
| **Visual client journey flowchart** | `docs/client-flow-visual.html` — all 7 client paths |
| **5-day sprint plan** | 26–31 May documented |

#### 27 May 2026 — Overnight Build
| Built | Detail |
|-------|--------|
| **Credit race condition fix** | Unique index on `credit_transactions.reference` + atomic `increment_client_credits()` RPC — double-spend impossible. Migration: `20260526_credit_race_condition_fix.sql` — **user confirmed run** |
| **Startup env check** | `apps/api/src/lib/startup-check.ts` — refuses to boot if CRITICAL vars missing, logs all var status |
| **AI reply 7-category upgrade** | 🔥 Hot / 🌤️ Warm / ❄️ Cold / 🚫 Opted out / 👤 Wrong person / ✈️ OOO / ❓ Other. Backward compatible. |
| **Admin Unibox** | `/unibox` — all FIGSY replies across all clients, filter by category, hot-sorted, limit 200 |
| **Portal reply inbox upgrade** | Emoji labels, actionable summary bar, priority sort |
| **Self-serve Stripe subscriptions** | Milla ($49/mo) + Vida ($39/mo) → Stripe checkout → webhook → DB activation |
| **Stripe webhook handlers** | subscription.created/updated → DB upsert · deleted → cancelled · payment_failed → log |
| **Paystack fully removed from billing UI** | Stripe-only portal. Paystack API routes preserved for legacy data only. |
| **Milla upgrade screen** | "Unlock Milla — $49/month →" → `/dashboard/billing`. Demo option retained. |
| **Vida upgrade screen** | "Unlock Vida — $39/month →" → `/dashboard/billing`. Demo option retained. |
| **Homepage hero rewrite** | "Stop chasing leads. Let FIGSY book them." — website + landing |
| **Full 4-test smoke suite** | Section 18 — 57 steps across Test 1–4 |
| **Sections 28–34 restored** | Pulled from `main` — Art of Possible deep dives, Compliance, Competitor Targeting, AI Learning, ClickUp Brain, Full Competitive Landscape (917 lines), The Unbuilt Future |
| **Daily Brief system** | Section 0 — living top-of-file, rewritten every session |
| **MASTER.md full audit** | 170+ commits cross-referenced. All stale entries fixed. |
| **Section 5 portal/admin/website audit** | Cross-referenced actual code vs MASTER. Fixed: website 16→22 pages (listed all 22). Admin 7→13 routes (added /founder, /playbook, /terms-library, /hubspot, /scalability, /unibox). Portal 15 routes fully listed with routes. |

#### 2 June 2026 — Full Session Build
| Built / Fixed | Detail |
|---------------|--------|
| **`ignoreBuildErrors` removed + 3 TS fixes** | Was hiding production crashes — all fixed, 0 errors |
| **Billing prices corrected** | Lead Gen $20/$40/$100, FIGSY $20/$40/$100 (was wrong) |
| **MASTER pricing model corrected** | Removed fictional Starter/Growth tiers |
| **Partner sandbox auto-provisioning** | `provisionPartnerSandbox()` — real client, 100 credits, SaaS ICP, 4 products, Apollo background |
| **Partner Hub card** | Portal `/dashboard/partner` — status, expiry, magic link login |
| **Admin sandbox column** | "Live" badge + "Provision" button |
| **Partner drip email sequence** | Day 2/7/14 — `sendPartnerDripEmail()` |
| **Partner pricing page** | `/dashboard/partner/pricing` |
| **Milla language badges** | 🇬🇧 English · 🇫🇷 Français · 🇰🇪 Kiswahili · 🇳🇬 Hausa — header strip + upgrade screen |
| **OnboardingChecklist refresh** | "Launch your AI Revenue OS" heading, all purple `#7C3AED` |
| **OnboardingBanner component** | Trial / awaiting_payment, urgency states, dismissable |
| **Dashboard new-user greeting** | Revenue OS framing |
| **DEPLOYMENT_GUIDE.md** | Paystack → Stripe throughout |
| **client-flow-sop.md** | Paystack → Stripe throughout |
| **Stripe products confirmed** | Milla (prod_UcjOFe7esiG2Xa) + Vida (prod_UcjOB0KZXHlmSy) created by founder |
| **Verification audit** | 15 items confirmed working, 3 confirmed stubs (P2-13, P2-14, P3-2) |
| **PWA manifest** | `apps/portal/src/app/manifest.ts` — shortcuts, theme `#7C3AED`, standalone |
| **App icons** | `icon.tsx` + `apple-icon.tsx` — purple K, 512px + 180px Apple |
| **Service worker** | `public/sw.js` — cache-first static, network-first nav, API bypass, offline fallback |
| **Offline page** | `app/offline/page.tsx` — branded, retry button |
| **PWARegister + PWAInstallBanner** | SW registered on mount. Add to Home Screen prompt — iOS + Android |
| **Root layout** | Viewport meta, manifest, apple-web-app-capable, push notifications ready (iOS 16.4+) |
| **PWA mockup** | `docs/pwa-mockup.html` — visual: home screen, dashboard, install flow |
| **Railway deployed** | Merged to main, build error fixed (`'use client'`), live at app.get-kind.com |

#### 1 June 2026 — Stripe Products + Billing Price Fix
| Built / Fixed | Detail |
|---------------|--------|
| **Billing page prices corrected** | Lead Gen: $20/$40/$100 · FIGSY: $20/$40/$100 (was $38/$88 and $60/$110/$250 — all now $1/credit) |
| **Milla + Vida Stripe products confirmed** | prod_UcjOFe7esiG2Xa (Milla) + prod_UcjOB0KZXHlmSy (Vida) created by founder |
| **MASTER pricing model corrected** | Removed fictional Starter/Growth subscription tiers. Real model: credit bundles only + Milla/Vida monthly add-ons |
| **OnboardingChecklist purple refresh** | Portal purple #7C3AED throughout — heading "Launch your AI Revenue OS" |
| **OnboardingBanner component** | Trial / awaiting_payment banner with dismiss + urgency states |

#### 28 May 2026 — Admin Redesign + FIGSY Gating + Admin Portal Playbook
| Built / Fixed | Detail |
|---------------|--------|
| **Admin portal full visual redesign** | Sidebar navigation (dark `#0F0929` purple) replacing flat navy top bar. Portal-matching warm lavender gradient body. Inter font. All 13 pages updated. |
| **Admin card style** | All cards → `bg-white/80 backdrop-blur rounded-2xl border-white/60 shadow-sm`. Tables: purple-50 dividers, `hover:bg-purple-50/30`. |
| **Admin colour system** | All `#0066FF` → `#7C3AED`. All `bg-gray-50` page wrappers removed. Purple accent throughout. |
| **AdminSidebar component** | `apps/admin/src/components/AdminSidebar.tsx` — replaces top nav bar. 13 nav items, purple active state. K.I.N.D logo pill. Live status indicator. |
| **Layout shell** | `apps/admin/src/app/layout.tsx` → provides sidebar + gradient shell. All pages strip their own `<AdminNav />` calls. |
| **Pre-existing JSX bugs fixed** | 10+ missing `</div>` closing tags in Playbook, Demo, Roadmap, Scalability, Terms Library pages — these were bugs in the original source. All fixed. TypeScript clean. |
| **AskFigsyButton lead-gen gating** | Non-FIGSY subscribers: lead-gen helper mode only. Different greeting, placeholder, status label, sends `mode: 'lead_gen'` to API. Upgrade strip → `/dashboard/billing`. FIGSY subscribers: full access, unchanged. `hasFigsy` prop from layout (was already being computed). |
| **Section 36 — Admin Portal Playbook** | Full how-to guide for every admin route. Daily workflow, common task recipes, when to use what. |

#### 27 May 2026 — Portal Facelift + API Wiring + ClickUp Steals (Evening Session)
| Built / Fixed | Detail |
|---------------|--------|
| **Full portal code audit** | 94 issues found across 20 files — critical bugs, old colours, mock data, undefined CSS classes |
| **Sidebar — complete rebuild** | Larger agent photos: w-14 h-14 main card, w-10 h-10 in dropdown. Dropdown restored. Lead Gen as primary section (always shown). Agents as subscription upgrades (gated). Beta badge removed. |
| **Sidebar active-nav bug fixed** | "People" + "ICP Builder" both highlighted simultaneously — fixed with `exact: true` flag. `/dashboard/leads` now uses exact match only. Account nav also fixed (startsWith + '/'). |
| **Locked agent routing bug fixed** | Clicking locked FIGSY/Milla/Vida → was going to billing. Now routes to each agent's own page (upgrade banner). |
| **SupportWidget + AskFigsyButton collision fixed** | Both were `fixed bottom-6 right-6` — stacked on same pixel. SupportWidget removed from layout.tsx entirely. |
| **SupportWidget.tsx deleted** | Orphaned file — not imported anywhere. Removed. |
| **TrialExpiredOverlay CTA button fixed** | `bg-[#F5F0FF]0` artifact (invisible button) → `bg-[#7C3AED]` — upgrade flow now visible. |
| **Global colour replacement — 32 files** | All `#0066FF` old blue → `#7C3AED` violet. All `#001f4d`/`#003080` dark navy → warm dark violet `#1A0F47`/`#0F0929`. |
| **brand-500/brand-600 undefined Tailwind classes fixed** | `brand-500` → `[#7C3AED]`, `brand-600` → `[#6D28D9]`, `brand-700` → `[#5B21B6]` across 7 pages — buttons, spinners, focus rings all now visible. |
| **Tailwind config updated** | Full `brand` colour scale added: 50 (warm peach) → 900 (sidebar dark). `kind-gradient` + `kind-gradient-vivid` background images added. |
| **Warm brand palette applied** | Page bg: `linear-gradient(135deg, #FFF5EE → #EDE6FF)`. Sidebar: `#1E1152 → #160D3D` (softer deep violet). Cards: `bg-white/80 backdrop-blur border-purple-100/60` across all 25 dashboard pages. |
| **FIGSY page: 🤖 emoji → real photo** | Agent identity card now shows `figsy.png` with ring + pulse dot. Unlock wall + empty state also updated. |
| **Chatbot default colour fixed** | Default widget colour was `#0066FF` (old blue) → now `#7C3AED`. All new chatbots default to brand violet. |
| **Agent photo correct cropping** | `object-cover object-top` on all agent images — faces show correctly. |
| **Meetings Booked metric added** | KPIs page — violet hero card, benchmark vs Alta AI 3–5% target. |
| **Sequence branching UI added** | Campaign `[id]` page — `on_reply: stop/skip_next/continue` visual branch pills between steps. |
| **AskFigsyButton dark theme** | `#0F0929` dark pill, real FIGSY photo, violet user messages. |
| **Dashboard rebuilt as Mission Control** | Single command view: hero row, 5-stat command bar, active campaigns + hot replies columns. |
| **AskFigsyButton → real /figsy/chat API** | P1 complete — replaces mock setTimeout. Full error handling. Chat persists in-session. |
| **Co-pilot approval queue badge** | Amber "Co-pilot: review before send" badge on active campaigns when mode = copilot (Alta steal) |
| **Knowledge base all 7 tabs → API** | P2 complete — Pitch/Keywords/Signals/Messaging/DNC/Context/Prompts all GET on load, POST on save. Spinners, success/error toasts. |
| **Campaign [id] sequence save → API** | P3 complete — `saveSequence()` calls `PUT /figsy/campaigns/:id/sequence`. Audience + settings + archive all wired. |
| **api.ts gets `put()` method** | P4 complete — `api.put<T>(path, body, token)` added alongside existing get/post/patch/delete_ |
| **CommandPalette (Cmd+K)** | S1 complete — brand palette, 12 nav items, grouped sections, full keyboard nav (↑↓ Enter Esc), registered in layout.tsx |
| **ActivityFeed component** | S2 complete — 6 event types, relative timestamps, skeleton loading, integrated into dashboard home |
| **Shareable /share/[token] dashboard** | S3 complete — public read-only, outside auth group, OG image, K.I.N.D branding, 4 metric cards + SVG chart |
| **Demo Playbook (Section 35)** | Full live sales demo script — 10 scenes, narration, smoke test coverage map, objection responses, 30-min agenda, pre-demo setup checklist, post-demo reset. Inspired by Rachel at Alta. |
| **AskFigsyButton restricted to lead-gen mode** | Floating FIGSY widget on portal shows limited "lead gen helper" capability — full FIGSY features require subscription upgrade (see FIGSY gating decision below) |

---

### 🐛 ALL BUGS FIXED — COMPLETE LOG

| Bug | Date Fixed | How |
|-----|-----------|-----|
| RLS missing on `credit_transactions` | 18 May | Re-enabled — was exposing cross-client financial data |
| Email confirmation blocking signup | 18 May | Removed — signup now instant |
| ICP chat build — top-level Anthropic import | 25 May | Fixed import, correct route order |
| `[object Object]` error on ICP save | 25 May | Normalize AI arrays, robust error serialization |
| Milla chat broken | 25 May | Fixed |
| Schema drift — 5 missing columns | 25 May | MASTER_SCHEMA.sql + migration |
| `amount_zar` NOT NULL signup failure | 25 May | Hotfix — all new signups now work |
| Schema drift — `amount_usd` removed | 25 May | MRR calculations restored |
| Apollo search — no results on strict filters | 26 May | 3-pass fallback: full → remove consent → remove size |
| Lead overspend — drip exceeding limits | 26 May | `maxLeads` cap + `leads_per_run` respected |
| FIGSY credit deduction on enrollment | 26 May | Manual + auto-enroll both deduct correctly |
| FIGSY trial expiry gate | 26 May | Backend rejects expired trialing subs |
| Milla hooks crash on load | 26 May | React hooks violation — all hooks before conditionals |
| FIGSY inbound webhook — always 401 | 26 May | Moved before `requireAuth`, protected by `RESEND_WEBHOOK_SECRET` |
| `sub.clients` null guard | 26 May | Prevents crash in trial expiry handler |
| Stats endpoint — blank on any error | 26 May | `Promise.allSettled` prevents cascade failure |
| Widget — no rate limiting | 26 May | 20 req/IP/min in-memory limiter |
| TypeScript unused imports | 26 May | `icps.ts` cleaned |
| ICP delete orphaning leads | 26 May | `ON DELETE SET NULL` migration — HIGH debt resolved |
| Credit double-spend TOCTOU race | 27 May | Unique DB index + atomic RPC — two concurrent requests cannot both credit same reference |
| Paystack on billing page | 27 May | Removed entirely — Stripe-only |
| Milla/Vida linked to wrong page | 27 May | Both now → `/dashboard/billing` with correct pricing |
| Stale Paystack refs in MASTER.md | 27 May | All 8+ locations fixed in full audit |
| Cron count wrong in docs (19 → 16) | 27 May | Corrected — actual cron.ts has 16 jobs. The 3 "status snapshot" crons were planned but never built. |
| ICP cascade delete debt — shown as open | 27 May | Marked fixed in technical debt section |
| Sections 28–34 missing from branch | 27 May | Restored from `main` |
| **PAYSTACK_SECRET_KEY marked CRITICAL in startup-check** | 27 May | **Fixed** — Paystack removed; was causing API to refuse boot if key absent. Moved to optional. |
| **Login page hardcoded API URLs (2 instances)** | 27 May | **Fixed** — Now uses `NEXT_PUBLIC_API_URL` env var with Railway URL as fallback |
| **Admin Unibox TypeScript error** | 27 May | **Fixed** — Supabase join type cast via `unknown` — no runtime impact, build now clean |
| **analytics + cohorts pages marked ✅ Live** | 27 May | **Fixed in MASTER** — Pages never existed. Stale `.next` type cache was misleading. Both marked ⏳ Not built. |
| **Stale `.next` type cache files** | 27 May | **Cleaned** — Deleted 3 stale cached type files (analytics, v2, icp/builder) from portal `.next/types` |
| **Sidebar: People + ICP Builder both active** | 27 May (this session) | `exact: true` flag on `/dashboard` and `/dashboard/leads` nav items — startsWith was matching parent as prefix of child |
| **Locked agent routes to billing** | 27 May (this session) | Routes now go to agent's own page (upgrade banner), not `/dashboard/billing` |
| **SupportWidget + AskFigsyButton overlap** | 27 May (this session) | SupportWidget removed from layout entirely — AskFigsyButton is sole floating widget |
| **TrialExpiredOverlay CTA button invisible** | 27 May (this session) | `bg-[#F5F0FF]0` → `bg-[#7C3AED]` — was caused by `bg-blue-50` partial match on `bg-blue-500` during global replacement |
| **brand-500/brand-600 undefined classes in 7 pages** | 27 May (this session) | Global replace — buttons, spinners, focus rings all visible now |
| **FIGSY identity card showing 🤖 emoji** | 27 May (this session) | Replaced with real `figsy.png` photo on agent card, unlock wall, and empty state |
| **Chatbot default colour #0066FF** | 27 May (this session) | New chatbots default to `#7C3AED` — old blue was client-facing in embed widget |
| **Admin portal broken JSX (10+ missing `</div>`)** | 28 May | Playbook ScriptBlock, Table, IcpContent, DiscoveryContent, DemoContent, ObjectionContent, ProposalContent, FollowUpContent + page wrappers in Roadmap/Scalability/Terms — all fixed |
| **AskFigsyButton no gating** | 28 May | Non-subscribers now get lead-gen mode only — upgrade strip shown. `hasFigsy` prop wired from layout. |
| **Admin nav bar cramped / mismatched** | 28 May | Replaced with dark sidebar — all 13 nav items visible, portal-matching design |

---

---

### 🤖 CLAUDE — MY BUILD QUEUE

**✅ COMPLETED THIS SESSION (28 May):**
| # | Build | Status |
|---|-------|--------|
| ✅ | Admin portal full visual redesign | Done — sidebar, gradient, purple accents, all 13 pages |
| ✅ | AdminSidebar component | Done — `apps/admin/src/components/AdminSidebar.tsx` |
| ✅ | AskFigsyButton lead-gen gating | Done — `hasFigsy` prop, mode flag to API, upgrade strip |
| ✅ | Admin pre-existing JSX bug fixes | Done — 10+ broken closing divs in Playbook/Demo/Roadmap/Scalability/Terms |
| ✅ | Section 36 — Admin Portal Playbook | Done — full how-to for all 13 routes + recipes |
| ✅ | MASTER.md full audit + update | Done — cross-referenced all current state |

**✅ COMPLETED PREVIOUS SESSION (27 May — full day):**
| # | Build | Status |
|---|-------|--------|
| ✅ | Full portal code audit (94 issues) | Done — all critical bugs fixed |
| ✅ | Sidebar rebuild — larger photos, dropdown, subscription-aware | Done |
| ✅ | Global colour cleanup — 32 files | Done |
| ✅ | Soft warm palette applied (matches brand image) | Done |
| ✅ | FIGSY page: real photo, sequence branching UI | Done |
| ✅ | Dashboard Mission Control rebuild | Done |
| ✅ | Meetings Booked metric (Alta benchmark) | Done |
| ✅ | SupportWidget deleted (orphaned) | Done |
| ✅ P1 | AskFigsyButton → real `/figsy/chat` API | Done — real API call, full error handling |
| ✅ P1b | Co-pilot approval queue badge | Done — amber badge on active campaigns in copilot mode |
| ✅ P2 | Knowledge base all 7 tabs → API | Done — GET on load, POST on save, all tabs |
| ✅ P3 | Campaign sequence/audience/settings/archive → API | Done — all 4 actions wired |
| ✅ P4 | `api.put()` method | Done |
| ✅ S1 | CommandPalette (Cmd+K) | Done — keyboard nav, grouped, brand palette |
| ✅ S2 | ActivityFeed component | Done — integrated into dashboard home |
| ✅ S3 | Shareable /share/[token] dashboard | Done — public, OG image, outside auth group |

**REMAINING — PORTAL:**
| # | Build | What | Priority |
|---|-------|------|----------|
| P5 | Chat history persistence | AskFigsyButton resets on page reload — needs `/figsy/chat/history` endpoint | 🟡 Medium |
| P6 | NotificationBell theme | Still uses white/gray (mismatches dark sidebar) | 🟡 Medium |

**🔴 ALTA COMPETITIVE — Build these before next demo:**
*Source: Jacques' live Alta demo (Rachelle Shapiro, 27 May 2026). 28 screenshots + Fathom transcript. Section 20 has full feature map.*

**Round 1 — SHIPPED 27 May 2026:**
| # | Build | What | Status |
|---|-------|------|--------|
| W1 | **Live ICP count "wow moment"** | Debounced Apollo preview — "X matching leads found" banner, 800ms after input. Live Apollo data. | ✅ Done — shows count. Upgrade to names → W13 |
| W2 | **Signal tokens in FIGSY sequences** | `{{signal_*}}` tokens in email copy — recent hire, funding, job change. AI picks best signal per lead. | ⏳ Pending — 1 day |
| W3 | **Intent filters in ICP builder** | 4 signal buttons: recently funded / hiring SDRs / headcount growth / new executive. Apollo funding + keyword fields. | ✅ Done |
| W4 | **CRM on all plans** | Confirm HubSpot ungated in settings. Code audit confirmed: no plan gate exists. | ✅ Already ungated |
| W5 | **LinkedIn `in` badge on every lead** | `in` badge in LinkedIn blue on all leads in table. Apollo already returns `linkedin_url`. | ✅ Done |
| W6 | **Social proof slot on login page** | 3 logo slots + testimonial placeholder below login form. Drop real logo when T36 is done. | ✅ Done |
| W7 | **Demo wow-moment narration update** | Update Section 35 demo script with W1 as Scene 1. "Watch this number. Type your ICP. This is live." | ⏳ After W1 ships to prod |

**Round 2 — SHIPPED 27 May 2026:**
| # | Build | What | Status |
|---|-------|------|--------|
| W8 | **Proactive home screen** | Purple gradient "Who should FIGSY target today?" card, 3 live stat chips, quick action strip. | ✅ Done |
| W9 | **Campaign templates library** | Was already built. Expanded with Unresponsive Revival + Inbound Qualify templates. | ✅ Already existed + expanded |
| W10 | **Editable FIGSY prompt per campaign** | Custom instructions textarea in campaign settings. Stored in campaign `settings` JSONB. | ✅ Done |
| W11 | **Daily send quota slider** | 1–200 slider per campaign (default 50). | ✅ Done |
| W12 | **Quality gate / Co-pilot toggle** | "✋ Co-pilot mode — review before send" amber checkbox in campaign settings. | ✅ Done |
| W13 | **ICP preview: 3 real contact names** | API returns `{count, samples[]}`. Contact cards: avatar initial · name · title·company · `in` badge. | ✅ Done |
| W14 | **Email style training (textarea)** | Paste 2–3 best emails in Settings → FIGSY adapts tone. Stored in localStorage. | ✅ Done |
| W15 | **Unresponsive revival campaign type** | Revival filter on leads page (scored-not-contacted). 53% benchmark banner. Revival template added. | ✅ Done |
| W2 | **Signal tokens in FIGSY sequences** | `generateSequence` detects best signal (tech stack → industry → score_reasoning). Step 1 MANDATORY opens with it. | ✅ Done |
| Unibox | **Two-way reply from admin Unibox** | `ReplyForm` client component + `/api/reply` admin Route Handler via Resend + service role. | ✅ Done |
| W7 | **Demo narration update (Section 35)** | Scene 1 scripted: "Watch this number." Apollo live preview as opening argument. Recovery scripts included. | ✅ Done |

**NEXT UP (smoke tests + steals):**
| # | Build | What | Time |
|---|-------|------|------|
| C1 | Run smoke tests T1–T4 | Founder runs, Claude fixes any failures | <15 min each |
| C5 | S4: Scheduled report emails | Weekly client digest — cron already exists, just needs wiring | 4h |
| C6 | "AI Revenue OS" positioning rewrite | Website, pricing, landing, demo pages — Apex steal | 2h |
| C7 | Wire Calendly URL site-wide | 5 min — needs URL from T22 | 5 min |
| C8 | Wire UK company number into footer + legal | 5 min — needs number from T23 | 5 min |
| C9 | Update `docs/client-flow-sop.md` | Stale since 18 May — Paystack refs, outdated paths | 30 min |

**At 10+ clients:**
| # | Build | What |
|---|-------|------|
| C10 | 3-type memory model | Split `figsy_memory` → episodic + long-term + preference |
| C11 | Deliverability dashboard | SPF/DKIM/DMARC status, bounce rate, blacklist check per domain |
| C12 | Email score pre-send | Score sequence before it fires — flag weak copy |
| C13 | Adaptive send volume | Auto-adjust daily sends based on domain health |
| C14 | Intent signal detection (upgrade of W2/W3) | Job changes, funding, hiring → auto-trigger FIGSY outreach without manual ICP update |
| C15 | Client morning brief email | Extend founder brief to all active clients |
| C16 | Multi-model toggle per campaign | Haiku (volume) vs Sonnet (quality) per campaign |

**At 20+ clients:**
| # | Build | What |
|---|-------|------|
| C17 | Configurable agent triggers | UI: "Run at 9am Mon–Fri" — replaces hardcoded cron |
| C18 | A/B subject line testing | Split test, auto-pick winner after 50 sends |
| C19 | Conditional sequence branching | If warm reply → different follow-up path |
| C20 | Waterfall enrichment | Apollo → PDL → Hunter → Clearbit |
| C21 | Kanban deal view | Visual pipeline for own sales + client stages |
| C22 | File approval workflow | Client approves copy before FIGSY sends |
| C23 | ICP auto-refinement | AI analyses reply data → suggests ICP improvements |

**Year 2:**
| # | Build |
|---|-------|
| C24 | Multi-agent orchestration (FIGSY + OTTO + LENA parallel) |
| C25 | FIGSY Memory v2 with pgvector |
| C26 | Pipeline forecasting |
| C27 | In-portal client messaging |
| C28 | Realtime dashboard (Supabase realtime to frontend) |
| C29 | Proposal + e-sign |
| C30 | Mobile app (iOS + Android) |
| C31 | MCP server (K.I.N.D as AI infrastructure) |
| C32 | 500+ FIGSY skill library |

---

### 📋 TODAY — STEP BY STEP (28 May 2026)

> Demo Playbook is Section 35. Admin Portal Playbook is Section 36. Read both before doing anything.

**Deploy (do first — 10 min):**
1. Merge `claude/ai-business-roadmap-U3OWJ` → `main` on GitHub
2. Check Railway build is green after merge
3. Check Vercel portal + admin both deploy successfully
4. Confirm `RESEND_API_KEY` is in Railway

**Before Test 1:**
4. Create new Gmail — never used on K.I.N.D before

**Run Test 1 — Core Platform (Section 18, Steps 1–17):**
> See also Section 35 Scene 1–6 for demo narration of each step.

**Run Test 1 — Core Platform (Section 18, Steps 1–17):**
> See also Section 35 Scene 1–6 for demo narration of each step.
5. Sign up at `app.get-kind.com` with new Gmail
6. Complete onboarding (company name, industry, country, phone, website)
7. Confirm welcome email + POPIA notice in Gmail inbox
8. Go to Leads → Build ICP → click "Suggest with AI" → check it pre-fills
9. Save ICP → confirm leads start appearing
10. Check lead scores (0–100) and reasoning visible
11. Click one lead → Send POPIA consent → status changes to `consent_sent`
12. Go to FIGSY in sidebar → confirm upgrade/lock screen shows (not FIGSY dashboard — you haven't unlocked)
13. Press Cmd+K → confirm command palette opens, keyboard nav works
14. Go to Billing → confirm credit balance visible, Stripe buy buttons show
15. Go to Admin → confirm test client appears in client list
16. Admin → Unibox → confirm page loads (may be empty — that's fine)
17. Admin → grant yourself 100 credits → confirm balance updates in portal
18. Logout → login again → confirm session persists correctly

**Report failures as:** `T1-Step8 — what you saw` → I fix in <15 minutes

---

### 📅 WEEK AHEAD

| Day | Date | Action | Owner |
|-----|------|--------|-------|
| Day 1 | Wed 28 May | Test 1 — Core Platform (17 steps). Fix all failures. | Both |
| Day 2 | Thu 29 May | SQL agent unlock → grant credits → Test 2 — Agents (17 steps) | Both |
| Day 3 | Fri 30 May | Stripe prices in Railway → stripe_subscription_id SQL → Test 3 + 4 (23 steps) | Both |
| Day 4 | Sat 31 May | All tests green → Claude builds S4 (weekly report email) + S5 (AI Revenue OS rewrite) | Claude |
| Day 5 | Sun 1 June | Review live. GTM prep. UK registration. First 5 client targets. Scope C10–C16. | Jacques |
| Week 2 | 2–7 June | First paid client. FIGSY self-outreach running. Build C10 (3-type memory). | Both |

---

### 🚨 OPEN BLOCKERS

| # | Blocker | Owner | Blocking |
|---|---------|-------|---------|
| B1 | `RESEND_API_KEY` — confirm set in Railway | Jacques | Test 1 email steps (Steps 6) |
| B2 | `MASTER_SCHEMA.sql` — confirm run in Supabase | Jacques | Schema integrity |
| B3 | `20260527_stripe_subscription_id.sql` — not yet run | Jacques | Test 3 (Milla/Vida checkout) |
| B4 | Stripe price IDs for Milla ($49) + Vida ($39) | Jacques | Test 3 |
| B5 | Stripe account not yet fully activated | Jacques | Test 3 + all live payments |
| B6 | UK company not yet registered | Jacques | Stripe proper + credibility |
| B7 | `FIGSY_KIND_CLIENT_ID` not set | Jacques | Self-outreach does nothing |
| B8 | `docs/client-flow-sop.md` stale (18 May) | Claude | Documentation accuracy |
| B9 | `docs/DEPLOYMENT_GUIDE.md` has stale Paystack refs | Claude | New team member confusion |

---

### 🔒 KEY DECISIONS — LOCKED

| Decision | Outcome | Date |
|----------|---------|------|
| Payment processor | Stripe (primary) + Flutterwave (Phase 2). Paystack removed — requires SA entity. | 27 May |
| Milla pricing | $49/month recurring via Stripe | 27 May |
| Vida pricing | $39/month recurring via Stripe | 27 May |
| Smoke test order | Test 1 → 2 → 3 → 4 — in order, no skipping | 27 May |
| Build sequence | Zero new features until all 4 tests pass | 27 May |
| Art of Possible steals S1–S3 | ✅ Built 27 May evening — S4 + S5 queued for Day 4 (31 May) | 27 May |
| AskFigsyButton (floating widget) | Shows on all portal pages for all users. Mode: lead-gen helper only. Full FIGSY features (campaigns, inbox, knowledge, sequences) require FIGSY subscription — upgrade wall enforced. | 27 May |
| Apex positioning | "AI Revenue OS" — apply after smoke tests | 27 May |
| LinkedIn automation | Will not build — ToS risk, permanent ban | Locked |
| AI provider | Claude Haiku (volume) + Sonnet (quality) | Locked |
| Data source | Apollo.io | Locked |
| Hosting | Supabase af-south-1 + Railway + Vercel | Locked |
| Business registration | UK — Companies House | Locked |
| CRM | HubSpot push only — built-in CRM Year 2 | Locked |

---

### 📌 SECTION 0 PROTOCOL — HOW THIS WORKS

**This section = the entire conversation history in one place.**
**Jacques: read only this section at the start of each session.**
**Claude: update this section as the LAST action of every session, then commit.**

**Claude must do at end of every session:**
1. Add everything built to "Everything Built" table under today's date
2. Add every bug fixed to "All Bugs Fixed"
3. Tick off completed founder tasks, add new ones
4. Tick off completed Claude tasks, move done items out of queue
5. Rewrite "Tomorrow — Step by Step" for next session
6. Update "Week Ahead" dates
7. Update "Open Blockers" — close resolved, add new
8. Update "Key Decisions" with anything locked today
9. Commit + push immediately — this is the last commit of every session

**Jacques at start of every session:**
1. Read Section 0 only
2. Tell Claude what got done from Founder To-Do (tick off T-items)
3. Claude reads Section 0, updates it, then starts work

**Why this exists:** Across multiple conversation windows and context resets, things get dropped. Section 0 is the immune system — it cannot be stale because it is rewritten, not appended.

---

### 🎯 BENCHMARKS — ALWAYS CHECK AGAINST THESE

#### Alta AI SDR — Performance Benchmark
*Our performance checkpoint. Every FIGSY metric should aim to beat or match Alta.*

| Metric | Alta AI SDR | K.I.N.D FIGSY | Gap |
|--------|-------------|--------------|-----|
| Reply rate | 18–24% | Not yet tracked | Track in KPIs |
| Meeting-booked rate | **3–5%** | Not tracked | 🔴 Need to build tracking |
| Sequence logic | Behaviour-based branching (replied/opened/clicked) | Linear 3-step (Day 1/4/9) | 🟡 Branching UI built, API pending |
| Personalisation | Role + company + recent signal | Role + company | Gap — add signal detection |
| Multi-channel | Email + LinkedIn + Phone | Email only (Voice/WhatsApp blocked pending creds) | Gap — credentials needed |

**What we've done to close the gap (this session):**
- ✅ Meetings Booked metric now visible on KPIs page with "Alta: 3–5%" benchmark
- ✅ Sequence branching UI added (`on_reply: stop/skip_next/continue`) — API wiring pending
- ✅ Dashboard Mission Control — single-screen view of all metrics (was split across 4 pages)

**Still needed vs Alta:**
- Track meetings booked from Hot replies (requires `/figsy/replies` Hot count → booking rate)
- Real open-rate data (currently estimated heuristic)
- Intent signal detection (hiring, funding, job changes → trigger outreach)

---

#### ClickUp — Design/UX Benchmark
*Our look and feel checkpoint. Every portal interaction should feel as fluid as ClickUp.*

| Feature | ClickUp | K.I.N.D Status | Priority |
|---------|---------|----------------|----------|
| **Command palette** (Cmd+K) | ✅ Core UX — power users live in it | ✅ Built — `CommandPalette.tsx`, Cmd+K registered in layout | ✅ Done 27 May |
| **Activity feed** | ✅ Everything has a timeline | ✅ Built — `ActivityFeed.tsx`, integrated into dashboard home | ✅ Done 27 May |
| **Single priority view** | ✅ One screen, zero navigation | ✅ Built (Mission Control dashboard) | ✅ Done 27 May |
| **Soft warm palette** | ✅ Airy, light, non-harsh | ✅ Applied (warm peach→lavender gradient) | ✅ Done 27 May |
| **Agent photos as real faces** | ✅ Human faces build trust | ✅ Real PNG photos in sidebar + widgets | ✅ Done 27 May |
| **Shareable dashboards** | ✅ Read-only `/share/:token` link | ✅ Built — `/share/[token]/page.tsx`, public route, OG image | ✅ Done 27 May |
| **Scheduled report emails** | ✅ Weekly digest to team | ⚠️ Cron exists, email not wired | S4 — next up |
| **This week vs last week** | ✅ Always shown | ❌ Not built | C13 — after 10 clients |
| **Modular widget layout** | ✅ Drag and rearrange | ❌ Not built | Year 2 |

**Steal-now list status:**
- **S1 ✅ DONE:** Command palette — `CommandPalette.tsx`, Cmd+K, keyboard nav, 12 nav items, brand palette.
- **S2 ✅ DONE:** Activity feed — `ActivityFeed.tsx`, 6 event types, integrated into dashboard home.
- **S3 ✅ DONE:** Shareable dashboards — `/share/[token]`, public, OG image, outside auth group.
- **S4 ⏳ NEXT:** Scheduled report emails — Weekly digest from cron that already exists. 4 hours.
- **S5 ⏳ NEXT:** "AI Revenue OS" positioning rewrite — Apex steal. Website, pricing, demo pages. 2 hours.

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

## 📅 5-DAY PLAN — 26–31 MAY 2026

---

### TONIGHT — 26 May (Tuesday)
**Read MASTER.md on GitHub. Make notes. Come back tomorrow ready.**

**You — 15 minutes max (clear the launch blockers before bed)**

| # | Task | Time | Exact steps |
|---|---|---|---|
| 1 | **Stripe webhook secret** | 2 min | Stripe → Developers → Webhooks → Add endpoint → URL: `https://kindapi-production-e64c.up.railway.app/stripe/webhook` → Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` → Copy signing secret → Railway → `STRIPE_WEBHOOK_SECRET` |
| 2 | **Upgrade Resend to paid** | 2 min | resend.com/billing → Pro ($20/mo) — free plan = 100 emails/day ceiling, FIGSY hits this immediately |
| 3 | **Fix 4 Stripe prices** | 10 min | Stripe → Products → archive old 40cr + 100cr prices (Lead Gen + FIGSY). Recreate flat: Lead Gen 40cr=$40, 100cr=$100, FIGSY 40cr=$120, 100cr=$300. Copy 4 new price IDs → Railway: `STRIPE_PRICE_LEADGEN_40`, `STRIPE_PRICE_LEADGEN_100`, `STRIPE_PRICE_FIGSY_40`, `STRIPE_PRICE_FIGSY_100` |

**If #1–3 not done tonight, do them first thing tomorrow before the smoke test.**

---

### DAY 1 — 27 May (Wednesday)
## SMOKE TEST + WHATSAPP APPLICATION + OUTREACH START

**Three parallel tracks. This is your most important day.**

---

#### TRACK 1: LAUNCH BLOCKERS (first, 5 min)

Before anything else — confirm these are done:

| Check | Where |
|---|---|
| `STRIPE_WEBHOOK_SECRET` set | Railway → KIND API → Variables |
| Resend is on paid plan | resend.com/billing → shows "Pro" |
| 4 Stripe prices are flat rate | Stripe → Products → check 40cr + 100cr prices |
| `supabase/migrations/20260526_platform_status.sql` run | Supabase → SQL Editor |

If any are missing — do them now before continuing.

---

#### TRACK 2: WHATSAPP BUSINESS API APPLICATION (morning — 20 min to apply, 3–7 days to approve)

**Start this first. It runs in the background while everything else happens. The clock starts when you apply.**

**⚠️ CRITICAL REQUIREMENTS — read before you start:**

| Requirement | Detail |
|---|---|
| **Dedicated phone number** | Must be a number NOT currently registered to any WhatsApp account (personal or business). Once you assign it to the Business API, it cannot be used for regular WhatsApp. Get a new SIM or use a number you don't use on WhatsApp. A +27 South African number is recommended for local clients. |
| **Meta Business Manager account** | Must exist first. Go to business.facebook.com — create one if you haven't already. Use the business name "KIND AI" or "K.I.N.D". |
| **Business verification documents** | Meta will ask for proof of business. Prepare one of: UK company registration number (when it arrives) OR bank statement showing business name OR utility bill with business name/address. |
| **Display name** | Must match or be clearly related to your business name. Use "KIND AI" — will be reviewed and approved by Meta. |
| **IMPORTANT — what WhatsApp Business API can and cannot do** | ✅ CAN: Vida inbound chatbot, client notifications (credits, campaign alerts), warm follow-ups to opted-in contacts. ❌ CANNOT: Cold outreach to new prospects. WhatsApp has strict anti-spam policies — using it for cold email-style sequences will get the account banned. FIGSY uses email for cold outreach. WhatsApp is for inbound and existing client comms only. |

**Step-by-step application (20 minutes):**

| Step | Action |
|---|---|
| 1 | Go to **developers.facebook.com** → Log in with your Facebook/Meta account |
| 2 | Click **My Apps** → **Create App** |
| 3 | Select app type: **Business** → Next |
| 4 | App name: `KIND AI` → Enter your business email → Create App |
| 5 | In the app dashboard → **Add a Product** → Find **WhatsApp** → Click Set Up |
| 6 | Click **Start using the API** |
| 7 | Under **Step 1: Add phone number** → Add a Phone Number |
| 8 | Enter the dedicated number you set aside → Verify via SMS or call |
| 9 | Set display name: `KIND AI` → Set category: `Business Services` |
| 10 | **Business Verification**: Settings → Business Settings → Security Centre → Start Verification |
| 11 | Upload business document (company reg / bank statement) → Submit |
| 12 | Wait for approval email from Meta (3–7 business days) |

**When approved, you get 3 things → all go into Railway:**
```
WHATSAPP_TOKEN=            ← permanent system user token from Meta
WHATSAPP_PHONE_NUMBER_ID=  ← shown in WhatsApp setup dashboard
WHATSAPP_VERIFY_TOKEN=     ← you choose this string yourself (e.g. kind_webhook_2026)
```

**The code is already written. Once these 3 vars are in Railway, Vida's WhatsApp integration goes live.**

---

#### TRACK 3: SMOKE TEST (morning — 45–60 min)

**Do every step yourself, as a real paying client. No shortcuts.**

| Step | What you do | What must happen | If it fails |
|---|---|---|---|
| 1 | go to get-kind.com → click Sign Up | Lands on app.get-kind.com/login | Tell me — routing |
| 2 | Email + password → Sign Up | Goes straight to /onboard — NO confirmation email | Tell me — auth |
| 3 | Company name, industry, country → Start free trial | Dashboard loads with company name in sidebar | Tell me — onboard |
| 4 | Leads → Build ICP → "Suggest ICP with AI" | Claude fills form fields within 5 seconds | Tell me — AI suggest |
| 5 | Save & Find Leads | Real leads with scores (0–100) within 2 minutes | Tell me — Apollo |
| 6 | Select one lead → Send POPIA consent | Status changes to `consent_sent`, email sent | Tell me — Resend/consent |
| 7 | Leads table → Export CSV | File downloads, correct columns | Tell me — export |
| 8 | Billing → buy smallest credit pack | Stripe opens → pay → returns → credit balance updates | Tell me — Stripe webhook |
| 9 | Portal → FIGSY | Locked screen: Upgrade + Book a Demo | Tell me — gate |
| 10 | Portal → Milla | Locked screen | Tell me — gate |
| 11 | Portal → Vida | Locked screen | Tell me — gate |
| 12 | Sidebar bottom | Green pulsing dot "All systems operational" | Tell me — health |
| 13 | Admin → Demo Envs → Create Demo | Leads populate → Open Demo → portal opens as demo client | Tell me — demo env |
| 14 | Admin → Clients → your account → Grant 50 credits | Balance updates, transaction in history | Tell me — admin grant |
| 15 | Sign out → sign back in | Dashboard loads clean, no loop | Tell me — session |

**Report format:** "Step [N] failed — [what happened]" + screenshot. I fix and redeploy. You retest that step only.

---

#### TRACK 4: OUTREACH (afternoon — 1–2 hours)

**Run this regardless of smoke test status. Don't wait for 100% pass.**

**10 warm personal messages — LinkedIn or WhatsApp personal**

Who: people who know you, know you're building, would be curious. Ex-colleagues. Business contacts. Anyone who's asked "how's the startup going?" B2B founders or sales leaders go first.

**Message template (make it sound like you, not a pitch):**
> *"Hey [name] — finally launched the thing I've been building. It's an AI SDR for B2B — finds the leads, writes the emails, handles the replies. Fully managed, no setup needed. Got 5 minutes? Happy to show you a quick demo or just send a link."*

Target: 10 sent. Aim for 3 replies. Anyone who says yes → book immediately.

**LinkedIn post #1**
Admin → CMO Tools → copy the drafted post → change the first line to your voice → post now.

---

**Claude — running all of Day 1:**
- Fix every smoke test issue in real time as you report them
- AI reply categorisation (hot / warm / cold / wrong person / OOO)
- Unified reply inbox (Unibox) — first pass
- Deliverability dashboard — first pass
- Homepage hero rewrite

---

### DAY 2 — 28 May (Thursday) — FIXES + MOMENTUM

**You**

| Task | Notes |
|---|---|
| **Report remaining smoke test issues** | Screenshot + step number. I fix while you move on. |
| **WhatsApp: check Meta Business Verification status** | business.facebook.com → Security Centre → check if docs submitted successfully |
| **Follow up on Day 1 outreach** | Check replies. Anyone who said yes/maybe → book the call immediately. Don't let it go cold. |
| **5 more outreach messages** | Second wave — slightly cooler contacts. People you haven't spoken to in a while who run B2B companies. |
| **Book first discovery call** | If anyone said yes on Day 1 — calendar it. Calendly link is live. |

**If a call is booked:** Admin → Sales Playbook → read the discovery script before you go in.

**Claude — Day 2**
- All smoke test fixes deployed
- Waterfall enrichment (Apollo → PDL → Hunter fallback)
- Email score pre-send check
- Technical debt: duplicate route cleanup

---

### DAY 3 — 29 May (Friday) — FIRST CALLS + PIPELINE

**You**

| Task | Notes |
|---|---|
| **Run discovery call(s)** | Sales Playbook script. Goal: understand their lead gen pain. Book a demo follow-up. Listen — don't pitch on call 1. |
| **Follow up on non-replies** | 2 days no reply → one follow-up: *"Did this land? Happy to send a loom instead."* |
| **LinkedIn post #2** | Admin → CMO Tools |
| **UK Companies House number** | If it arrives → paste to me → footer + legal updated in 10 min |
| **WhatsApp: check application progress** | Look for approval email from Meta. If no response after 5 business days, resubmit documents. |

**Claude — Day 3**
- Adaptive send volume (auto-reduce per domain if health dips)
- Proposal template (ready for first prospect close to signing)
- Technical debt: credit race condition wrapper

---

### DAY 4 — 30 May (Saturday) — REVIEW + PREP

**You (30 min)**

| Task | Notes |
|---|---|
| **Count the week** | Messages sent. Replies. Calls booked. Calls done. Any yes? |
| **Admin → /status** | Check platform snapshot — any anomalies? |
| **Check FIGSY self-outreach** | Admin → your client → FIGSY campaigns → did Monday self-outreach fire? What's the reply rate? |
| **3 LinkedIn comments** | Comment on 3 posts from potential prospects or sector leaders. Presence, not pitching. |
| **Prep for Monday calls** | If calls booked for next week — one sentence of prep per person. |

**Claude — Day 4**
- Cron job log review — any silent failures?
- Week 2 outreach batch prep (5 more names + refined messages)
- Build queue overflow

---

### DAY 5 — 31 May (Sunday) — REST + MONDAY SETUP

**You**

| Task | Notes |
|---|---|
| **Rest** | Don't build. |
| **Write 10 names for Week 2** | Just a list on paper — who are you messaging Monday morning? |
| **Optional: re-read MASTER.md** | Make notes for the session Monday. |

**Claude — Sunday**
- Build queue
- Week 2 FIGSY campaign refinement based on what's resonating in your outreach
- Any outstanding fixes

---

## BY END OF 31 MAY — TARGETS

| Target | Done? |
|---|---|
| Platform blockers cleared (Stripe webhook, Resend, prices) | — |
| Supabase platform_status migration applied | — |
| Smoke test: all 15 steps passing | — |
| WhatsApp Business API application submitted | — |
| 15+ outreach messages sent | — |
| 3+ replies received | — |
| 1+ discovery call booked | — |
| LinkedIn: 2 posts + 3 comments | — |
| FIGSY self-outreach running (auto-fires Mondays) | ✅ Live |
| All smoke test fixes deployed | — |

**WhatsApp expected live date: ~5–6 June** (3–7 business days from Day 1 application)

---

## MY BUILD QUEUE — NEXT 5 DAYS (Claude)

| # | What | Why | Day |
|---|---|---|---|
| 1 | **Fix all smoke test issues** | Blocking launch | Day 1–2 real-time |
| 2 | **AI reply categorisation** | hot / warm / cold / wrong person / OOO — each routes differently | Day 1 |
| 3 | **Unified reply inbox (Unibox)** | All campaign replies across all clients in one admin view | Day 1–2 |
| 4 | **Deliverability dashboard** | Spam rate, inbox %, DNS health per domain — in Platform Health | Day 1–2 |
| 5 | **Homepage hero rewrite** | Sharper copy for cold visitors | Day 1 |
| 6 | **Waterfall enrichment** | Apollo → PDL → Hunter — 20–40% more leads per ICP | Day 2–3 |
| 7 | **Email score pre-send** | Score sequence quality before it fires | Day 3 |
| 8 | **Adaptive send volume** | Auto-reduce per mailbox if domain health dips | Day 3–4 |
| 9 | **Technical debt — duplicate routes** | Clean before scale | Day 4 |
| 10 | **Technical debt — credit race condition** | DB transaction wrapper for credit deduction | Day 4 |
| 11 | **Proposal template** | Ready when first prospect is close | Day 3 on demand |
| 12 | **Week 2 outreach refinement** | Sharpen FIGSY campaign based on what's resonating | Day 4–5 |

---

## WHAT'S NOT ON MY LIST (and why)

| Item | Why not now | When |
|---|---|---|
| Email warmup infrastructure | Need to decide on provider first (Lemwarm, Mailreach, or self-hosted pool) — ask me and we'll pick one together | Phase 2 |
| WhatsApp code changes | Already built — waiting for your 3 env vars from Meta | When Meta approves |
| LinkedIn automation | ToS risk — always off the table | Never |
| Milla + Vida launch | July — after first 5 clients | July 2026 |
| MCP server | Phase 3 | 20+ clients |
| Conditional sequence branching | Phase 2 | Core loop proven |
| Mobile app | Year 2 | — |
| Revenue forecasting | Needs live data | Year 2 |

---

## QUICK REFERENCE — EVERY LINK YOU NEED

| What | URL |
|---|---|
| Website | get-kind.com |
| Client Portal | app.get-kind.com |
| Admin | admin.get-kind.com |
| API | kindapi-production-e64c.up.railway.app |
| Supabase | supabase.com → kind project |
| Railway | railway.app → KIND API |
| Vercel | vercel.com → kind-portal + kind-admin |
| Stripe | dashboard.stripe.com |
| Resend | resend.com |
| Apollo | app.apollo.io |
| HubSpot | app.hubspot.com |
| Calendly | calendly.com/jacques-vieiraza/30min |
| Sales Playbook | admin.get-kind.com/docs/sales-playbook |
| Admin Status | admin.get-kind.com/status |
| Demo Envs | admin.get-kind.com/demo |
| Meta Developers | developers.facebook.com |
| Meta Business Manager | business.facebook.com |

---

*Updated: 26 May 2026 evening — WhatsApp application added, full 5-day plan*

---

## 📅 5-DAY PLAN — 26–31 MAY 2026

---

### TONIGHT — 26 May (Tuesday)
**Read MASTER.md on GitHub. Make notes. Come back tomorrow ready.**

**You — 15 minutes max (clear the launch blockers before bed)**

| # | Task | Time | Exact steps |
|---|---|---|---|
| 1 | **Stripe webhook secret** | 2 min | Stripe → Developers → Webhooks → Add endpoint → URL: `https://kindapi-production-e64c.up.railway.app/stripe/webhook` → Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` → Copy signing secret → Railway → `STRIPE_WEBHOOK_SECRET` |
| 2 | **Upgrade Resend to paid** | 2 min | resend.com/billing → Pro ($20/mo) — free plan = 100 emails/day ceiling, FIGSY hits this immediately |
| 3 | **Fix 4 Stripe prices** | 10 min | Stripe → Products → archive old 40cr + 100cr prices (Lead Gen + FIGSY). Recreate flat: Lead Gen 40cr=$40, 100cr=$100, FIGSY 40cr=$120, 100cr=$300. Copy 4 new price IDs → Railway: `STRIPE_PRICE_LEADGEN_40`, `STRIPE_PRICE_LEADGEN_100`, `STRIPE_PRICE_FIGSY_40`, `STRIPE_PRICE_FIGSY_100` |

**If #1–3 not done tonight, do them first thing tomorrow morning before the smoke test.**

**Claude — tonight**
- Homepage hero rewrite (new punchy copy, Apex framing)
- AI reply categorisation prep
- Smoke test issue log template ready

---

### DAY 1 — 27 May (Wednesday) — SMOKE TEST + OUTREACH START

**This is the most important day. Two things and nothing else.**

---

#### PART 1: SMOKE TEST (morning — 45–60 min)

**Before you start:** Confirm #1–3 from last night are done. Check Railway has `STRIPE_WEBHOOK_SECRET` set.

**Also do first (2 min):**
- Supabase → SQL Editor → run `supabase/migrations/20260526_platform_status.sql`

**Run every step yourself, as a real paying client:**

| Step | What you do | What must happen | If it fails |
|---|---|---|---|
| 1 | Go to get-kind.com → click Sign Up | Lands on app.get-kind.com/login | Tell me — routing issue |
| 2 | Enter email + password → Sign Up | Goes straight to /onboard — NO confirmation email | Tell me — auth config |
| 3 | Fill company name, industry, country → Start free trial | Dashboard loads with your company name in the sidebar | Tell me — onboard flow |
| 4 | Go to Leads → Build ICP → click "Suggest ICP with AI" | Claude fills the form fields automatically within 5 seconds | Tell me — AI ICP suggest |
| 5 | Adjust ICP → Save & Find Leads | Real leads appear with scores (0–100) within 2 minutes | Tell me — Apollo search |
| 6 | Select one lead → Send POPIA consent | Confirmation shows, lead status changes to `consent_sent` | Tell me — Resend or consent route |
| 7 | Leads table → Export CSV | File downloads, opens in Excel, correct columns | Tell me — export route |
| 8 | Sidebar → Billing → buy smallest credit pack | Stripe checkout opens. Pay. Returns to portal. Credit balance updates. | Tell me — Stripe webhook |
| 9 | Portal → FIGSY page | Shows locked screen with "Upgrade" and "Book a Demo" buttons | Tell me — subscription gate |
| 10 | Portal → Milla page | Shows locked screen | Tell me — subscription gate |
| 11 | Portal → Vida page | Shows locked screen | Tell me — subscription gate |
| 12 | Sidebar bottom | Green pulsing dot — "All systems operational" | Tell me — health check |
| 13 | Admin → Demo Envs → Create Demo | Leads populate → click Open Demo → portal opens as demo client in new tab | Tell me — demo env creation |
| 14 | Admin → Clients → find your test account → Grant 50 credits | Balance updates on client record, transaction appears in history | Tell me — admin grant |
| 15 | Sign out → sign back in | Dashboard loads cleanly — no redirect loop, no blank screen | Tell me — session handling |

**How to report:** Screenshot + which step number. I fix and redeploy within minutes. Re-run that step only.

---

#### PART 2: OUTREACH (afternoon — 1–2 hours)

**Start this regardless of smoke test results. Run them in parallel.**

**10 warm personal messages — LinkedIn or WhatsApp**

Who to message: people who already know you, know you're building something, would be curious. Ex-colleagues. Business contacts. Friends who run B2B companies. Anyone who's asked "how's the startup going?"

**The message (adapt the tone to how you talk to each person):**
> *"Hey [name] — been building something for the past few months and finally launched. It's an AI SDR for B2B companies — finds the leads, writes the emails, handles the replies. Managed for you, no setup. 5 minutes to show you? Happy to do a quick call or just send a link."*

**Do NOT send a deck. Do NOT send a pitch. Send a message that sounds like you.**

Target: 10 messages sent by end of day. Aim for 3 responses.

**LinkedIn post #1**
- Admin → CMO Tools → copy today's drafted post
- Read it. Change the first line to sound like your voice.
- Post it. No scheduling. Post it now.

---

**Claude — running Day 1**
- Fix every smoke test issue as you report them. Real-time.
- Build: unified reply inbox (Unibox) — first pass
- Build: deliverability dashboard — first pass
- Build: AI reply categorisation (hot / warm / cold / wrong person / OOO)

---

### DAY 2 — 28 May (Thursday) — FIXES + MOMENTUM

**You**

| Task | Notes |
|---|---|
| **Report any remaining smoke test issues** | Anything still broken from yesterday — send me the screenshot |
| **Follow up on Day 1 outreach** | Check replies. Respond to anyone who engaged. If someone said "yes" or "maybe" — book a call immediately. Don't let it go cold. |
| **Send 5 more outreach messages** | Second wave — slightly cooler contacts. People you haven't spoken to in a while but who run B2B businesses. |
| **Book first discovery call** | If anyone said yes from Day 1 — get it in the calendar. Calendly link is live and wired. |
| **Apply Supabase migration if missed** | `supabase/migrations/20260526_platform_status.sql` — if not done Day 1 |

**If a call is booked:** Admin → Sales Playbook — read the discovery script before you go in. It has the exact questions and the demo flow.

**Claude — Day 2**
- All remaining smoke test fixes deployed
- Build: waterfall enrichment (Apollo → PDL → Hunter fallback)
- Build: email score pre-send check (score sequence quality before it fires)
- Technical debt: duplicate route cleanup

---

### DAY 3 — 29 May (Friday) — FIRST CALLS + PIPELINE

**You**

| Task | Notes |
|---|---|
| **Run discovery call(s) booked** | Use Sales Playbook script. Goal: understand their current lead gen. Book a demo follow-up. Do NOT pitch on the first call. Listen. |
| **Follow up on all outreach** | Anyone who hasn't replied after 2 days — one follow-up message: *"Did this land? Happy to send a quick loom instead."* |
| **LinkedIn post #2** | Admin → CMO Tools → second post of the week |
| **UK Companies House number** | If approved — paste it to me, I wire it into footer + legal pages in 10 minutes |
| **Review the week so far** | What's working in outreach? What response are you getting? Tell me and I'll sharpen the FIGSY campaign targeting accordingly. |

**Claude — Day 3**
- Build: adaptive send volume (auto-reduce per mailbox if domain health dips)
- Build: homepage hero rewrite deployed
- Prepare: proposal template for first prospect who's close to signing
- Technical debt: credit race condition wrapper

---

### DAY 4 — 30 May (Saturday) — REVIEW + PREP

**You (30 min)**

| Task | Notes |
|---|---|
| **Count the week** | Outreach messages sent. Replies received. Calls booked. Calls done. Any "yes"? |
| **Check admin dashboard** | Admin → /status — what's the platform showing? Any anomalies? |
| **Check FIGSY self-outreach** | Admin → Clients → your own client → FIGSY campaigns — did Monday's self-outreach fire? What's the reply rate? |
| **Write 3 LinkedIn comments** | Find 3 posts from potential prospects or sector leaders. Leave a comment. This is presence-building, not pitching. |
| **Prep for Monday calls** | If any discovery calls are booked for next week — re-read the Sales Playbook and prep one sentence about their specific business before the call. |

**Claude — Day 4**
- Any build items that need deploying
- Review cron job logs for any silent failures
- Prepare: week 2 outreach batch (5 more names + messages) so Monday starts immediately

---

### DAY 5 — 31 May (Sunday) — REST + MONDAY SETUP

**You**

| Task | Notes |
|---|---|
| **Rest** | You've had a big week. Don't build on a Sunday unless you want to. |
| **Optional: read MASTER.md again** | See if anything from your notes this week needs updating. Come back with a list. |
| **Write 10 names for Week 2 outreach** | Just a list on paper — who are the 10 people you'll message Monday morning? |

**Claude — Sunday**
- Build queue items
- Week 2 outreach FIGSY campaign refined (based on Day 3 feedback on what's resonating)
- Any outstanding fixes

---

## BY END OF DAY 31 MAY — WHAT WE NEED TO HAVE

| Target | Status |
|---|---|
| Smoke test: all 15 steps passing | — |
| Platform blockers cleared (Stripe webhook, Resend, prices) | — |
| 15+ outreach messages sent | — |
| 3+ replies received | — |
| 1+ discovery call booked | — |
| LinkedIn: 2 posts + 3 comments done | — |
| FIGSY self-outreach running (auto-fires Monday) | ✅ Already live |
| All smoke test issues fixed and redeployed | — |

---

## MY BUILD QUEUE — NEXT 5 DAYS (Claude)

In priority order. Working through these in parallel with your smoke test and outreach.

| # | What | Why | Target day |
|---|---|---|---|
| 1 | **Fix all smoke test issues** | Blocking launch | Day 1–2 as you report them |
| 2 | **AI reply categorisation** | Extend auto-pause: hot/warm/cold/wrong person/OOO — each routes differently | Day 1 |
| 3 | **Unified reply inbox (Unibox)** | Admin view of all campaign replies across all clients | Day 1–2 |
| 4 | **Deliverability dashboard** | Spam rate, inbox %, DNS health per sending domain — in Platform Health | Day 2 |
| 5 | **Homepage hero rewrite** | Sharper copy for cold visitors — Apex-inspired framing | Day 1 |
| 6 | **Waterfall enrichment** | Apollo → PDL → Hunter fallback — 20–40% more leads from same ICP | Day 2–3 |
| 7 | **Email score pre-send** | Score sequence before it fires — flag weak emails before they go out | Day 3 |
| 8 | **Adaptive send volume** | Auto-reduce per mailbox if domain health dips (Woodpecker model) | Day 3–4 |
| 9 | **Technical debt — duplicate routes** | Deprecate `/leads/consent/bulk` vs `/leads/bulk-consent` | Day 4 |
| 10 | **Technical debt — credit race condition** | Wrap credit deduction in DB transaction | Day 4 |
| 11 | **Proposal template** | Ready for first prospect close to signing | Day 3 (on demand) |
| 12 | **Week 2 outreach refinement** | Refine FIGSY campaign based on what's resonating in your personal outreach | Day 4–5 |

---

## WHAT'S NOT ON MY LIST (and why)

| Item | Why not now |
|---|---|
| Email warmup infrastructure | Requires a third-party warmup pool service — needs a decision on which one (Lemwarm, Mailreach, etc.) before I can build the integration. Ask me and we'll decide together. |
| LinkedIn automation | ToS risk — always off the table |
| Milla + Vida launch | July — not touching these until after first 5 clients |
| MCP server | Phase 3 — after 20+ clients |
| Conditional sequence branching | Phase 2 — after core loop proven |
| Mobile app | Year 2 |
| Revenue forecasting | Needs live data — Year 2 |

---

## QUICK REFERENCE — EVERY LINK YOU NEED

| What | URL |
|---|---|
| Website | get-kind.com |
| Client Portal | app.get-kind.com |
| Admin | admin.get-kind.com |
| API | kindapi-production-e64c.up.railway.app |
| Supabase | supabase.com → kind project |
| Railway | railway.app → KIND API |
| Vercel | vercel.com → kind-portal, kind-admin |
| Stripe | dashboard.stripe.com |
| Resend | resend.com |
| Apollo | app.apollo.io |
| HubSpot | app.hubspot.com |
| Calendly | calendly.com/jacques-vieiraza/30min |
| Sales Playbook | admin.get-kind.com/docs/sales-playbook |
| Admin Status | admin.get-kind.com/status |
| Demo Envs | admin.get-kind.com/demo |


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

### Credit Bundles (current model)

| Product | Credits | Price USD | Price ZAR |
|---|---|---|---|
| K.I.N.D AI — Lead Gen Pro | 20 | $20 | R380 |
| K.I.N.D AI — Lead Gen Pro | 40 | $38 | R722 |
| K.I.N.D AI — Lead Gen Pro | 100 | $88 | R1,672 |
| FIGSY Advanced | 20 | $60 | R1,140 |
| FIGSY Advanced | 40 | $110 | R2,090 |
| FIGSY Advanced | 100 | $250 | R4,750 |

**Phase 2 billing evolution:** Credit bundles → recurring monthly subscription model once value is proven.

---

## 13. REVENUE TARGETS & KPIs

### Month-by-Month MRR Targets

| Month | Target MRR (USD) | New Clients | Cumulative |
|---|---|---|---|
| May 2026 (launch) | $2,500 | 5 | 5 |
| Jun–Jul 2026 | $8,000 | 15 | 20 |
| Months 5–6 | $26,000 | 40 | 60 |
| Months 7–12 | $100,000 | 140+ | 200+ |

### Core KPIs (check every Monday)

| KPI | Target | Red Flag |
|---|---|---|
| TTFL (Time to First Lead) | < 2 hours | > 4 hours |
| Trial → Paid conversion | > 40% | < 25% |
| Month 1 churn | < 5% | > 10% |
| FIGSY reply rate | > 8% | < 3% |
| ICP built within 24h of signup | > 80% | < 60% |
| At-risk clients (no ICP after 3 days) | 0 | > 2 |

---

## 14. CASHFLOW MODEL

### Fixed Monthly Tech Costs

| Service | Plan | Cost/mo |
|---|---|---|
| Supabase | Pro (af-south-1 required) | $25 |
| Vercel | Pro | $20 |
| Railway | Usage-based | $10–20 |
| Apollo.io | Free now (50 credits/mo) → Monthly Basic ($99/mo) when client 1 pays → Annual ($49/mo) when MRR covers $588 upfront | $0 → $99 |
| Google Workspace | Business Starter (hello@get-kind.com) | $12–18 |
| Resend | Free → Pro at scale | $0–20 |
| Domain | Annual | ~$1 |
| **Total floor (excl. Claude Code)** | | **$167–203/mo** |

**Variable costs per lead:** ~$0.009

**Break-even: 2 clients.**

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

## 24. ART OF POSSIBLE — PRODUCTS WE STUDY

*Products we study, what we learn, and how we respond. Not a threat list — an inspiration log.*
*Full detail in: `docs/art-of-possible.md` (also readable at Admin → Docs → Art of Possible)*

> **The one rule:** Build the foundation. Prove the loop. Then build the palace.
> **Gate:** 20+ paying clients with the core loop proven before any V2 feature is touched.

| # | Product | Category | Key Lesson | Status |
|---|---------|----------|------------|--------|
| 1 | Apex (apex.host) | Autonomous AI assistant | "Acts, doesn't just respond" — copy framing | 🟡 Actions pending |
| 2 | ClickUp | Project management SaaS | Command centre UI, multiple views, Cmd+K | ✅ Design built |
| 3 | Lemlist | Email outreach | Personalised images, template library, community | 🟡 Phase 2-3 |
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

### The 15 Pieces — What Gets Built Post 20 Clients

| # | Piece | What it is | Build time | When |
|---|-------|-----------|-----------|------|
| 1 | Multiple views | Kanban + heatmap + timeline for leads | 2–3 days | Phase 2 |
| 2 | Command palette | Cmd+K — New ICP, Pause FIGSY, Hot leads | 1–2 days | Phase 2 |
| 3 | Real-time activity feed | Live events: email sent, reply, score, interested | 3 days | Phase 3 |
| 4 | Notification centre | Bell + red badge + slide-out panel | 3 days | Any time |
| 5 | Status bar | Sidebar bottom — FIGSY stats, credits, health | 4 hours | **First** |
| 6 | Custom lead fields | `custom_fields jsonb` per client | 4–5 days | On request |
| 7 | Visual automation builder | React Flow — triggers, actions, if/then | 2–3 weeks | Phase 5 (50+ clients) |
| 8 | ICP that learns itself | AI insight bullets from reply patterns | 2 days | Phase 4 (3mo data) |
| 9 | Personalised images | HTML-to-image per prospect in Day 1 email | 2 days | Phase 3 |
| 10 | Sequence template library | Pre-built FIGSY sequences by ICP type | 3 days | Phase 2 |
| 11 | Voice morning brief | Milla reads 90-sec audio at 7:30am | 1 day | Post Milla live |
| 12 | Benchmarks | "Your industry averages 7.1% — you're at 11%" | 2 days | Phase 4 (20+ clients) |
| 13 | White-label / Agency | Agencies manage 5–10 clients in one view | 1 week | On first request |
| 14 | **MCP server** | K.I.N.D as AI infrastructure — see below | 3–5 days | Phase 4 |
| 15 | Mobile PWA | manifest + push notifications | 2 days | Phase 3 |

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

## 25. COMPLIANCE CERTIFICATIONS ROADMAP

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

## 26. COMPETITOR TARGETING STRATEGY

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

## 27. AI LEARNING CAPABILITY — BUILT, PLANNED, VISION

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

## 28. CLICKUP BRAIN — WHAT WE STUDIED, WHAT WE ADOPTED, WHAT'S NEXT

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
| Milla | Brain Notetaker + Knowledge Agent | VA: answers questions, runs morning brief, drafts documents | July 2026 |
| Vida | Automation Agent — inbound | Chatbot: qualifies website visitors, WhatsApp handler | July 2026 |
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
*Last updated: 27 May 2026*

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
| 3 | Lemlist | Email outreach | Personalised images, template library, community | 🟡 Phase 2-3 |
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

### The 15 Pieces — What Gets Built Post 20 Clients

| # | Piece | What it is | Build time | When |
|---|-------|-----------|-----------|------|
| 1 | Multiple views | Kanban + heatmap + timeline for leads | 2–3 days | Phase 2 |
| 2 | Command palette | Cmd+K — New ICP, Pause FIGSY, Hot leads | 1–2 days | Phase 2 |
| 3 | Real-time activity feed | Live events: email sent, reply, score, interested | 3 days | Phase 3 |
| 4 | Notification centre | Bell + red badge + slide-out panel | 3 days | Any time |
| 5 | Status bar | Sidebar bottom — FIGSY stats, credits, health | 4 hours | **First** |
| 6 | Custom lead fields | `custom_fields jsonb` per client | 4–5 days | On request |
| 7 | Visual automation builder | React Flow — triggers, actions, if/then | 2–3 weeks | Phase 5 (50+ clients) |
| 8 | ICP that learns itself | AI insight bullets from reply patterns | 2 days | Phase 4 (3mo data) |
| 9 | Personalised images | HTML-to-image per prospect in Day 1 email | 2 days | Phase 3 |
| 10 | Sequence template library | Pre-built FIGSY sequences by ICP type | 3 days | Phase 2 |
| 11 | Voice morning brief | Milla reads 90-sec audio at 7:30am | 1 day | Post Milla live |
| 12 | Benchmarks | "Your industry averages 7.1% — you're at 11%" | 2 days | Phase 4 (20+ clients) |
| 13 | White-label / Agency | Agencies manage 5–10 clients in one view | 1 week | On first request |
| 14 | **MCP server** | K.I.N.D as AI infrastructure — see below | 3–5 days | Phase 4 |
| 15 | Mobile PWA | manifest + push notifications | 2 days | Phase 3 |

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

*Written: 27 May 2026. Use this for every demo. Run it first as a smoke test — same steps.*
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

### 🛠️ PRE-DEMO SETUP (Do this once, not during the demo)

| # | Task | Why it matters |
|---|------|----------------|
| S1 | Sign up at `app.get-kind.com` with a REAL email you check | Welcome email is part of the demo |
| S2 | Complete onboarding fully — company name, industry, country | Dashboard shows your company — looks real |
| S3 | Run the SQL in Section 18 Test 2 to unlock FIGSY + Milla + Vida | All three agents accessible |
| S4 | Admin → grant yourself **10,000 credits** | Unlimited during demo |
| S5 | Build one real ICP — your actual target market | Leads that look relevant during demo |
| S6 | Let leads load (15–20 min after ICP saved) | Live data in the pipeline |
| S7 | Create one campaign — named "Demo Campaign" | Something to show in FIGSY |
| S8 | Upload one document to Milla (your pitch deck PDF, or a 1-page brief) | Milla has context to answer from |
| S9 | Save a Vida chatbot config (bot name: "Kind Assistant", simple greeting) | Embed code is visible and copyable |
| S10 | Open demo in a clean Chrome window — no dev tools, no extensions visible | Looks like a client environment |
| S11 | Zoom in to 110% in browser — everything slightly larger, easier to read on screen share | Professional presentation |
| S12 | Close all tabs except the portal | No distractions in the browser bar |

> **Note:** Once setup is done, this environment is permanently ready. You never rebuild it. You just open a tab and go.

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

#### SCENE 10 — The Share Link (30 sec)
*URL: `/share/[token]`*
*Smoke Test: (S3 — built this session)*

**Say:** *"Last thing — if you have investors, a sales manager, or a board you report to, you don't need to add them as users. You share a link."*

Open a shareable dashboard link.

**Say:** *"Read-only. No login. Shows campaign performance, reply rates, pipeline value. Professional. Shareable in a WhatsApp in 5 seconds."*

---

#### SCENE 11 — The Close (1 min)

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

