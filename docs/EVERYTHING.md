# K.I.N.D — EVERYTHING

> ✅ **THIS IS THE WORKING SOURCE OF TRUTH (updated 5 Jun 2026).** Read this first, update this first. `MASTER.md` is now a historical archive only. Where the two disagree, THIS document wins.
> **Protocol:** at the start of a session read this file; at the end of a session update it and commit.

---

## 🗓 SESSION STATE — 7 Jun 2026 (latest — read this first)

> Launch was targeted Mon 8 Jun. **Deferred until Smoke Test 2 passes.** This session = pre-launch sprint: built the real email + reply pipeline end-to-end, fixed the launch-blocker (leads had no emails), added the compliance suppression guard, ran most of Smoke Test 1.

### THE BIG FIXES (this session) — all on `main`, deployed to Railway
- **Launch-blocker SOLVED — leads now get real emails.** Apollo's *search* API never returns emails by design. Enriching by name fails (last names are masked, `La***n`). Fix: store each person's Apollo `apollo_id` during search, then enrich via `bulk_match` **by id** → returns real verified emails. Proved live (`gabe.larsen@atonom.ai` revealed). Files: `apollo.ts` (`bulkMatchEmails`), new `lead-delivery.ts` (`enrichAndDeliverLeads` — only charges credits for leads that actually get an email).
- **FIGSY reply pipeline — built end-to-end, VERIFIED LIVE.** FIGSY sends → prospect replies → reply lands in portal Inbox classified 🔥 Hot. Stack: Resend inbound subdomain `reply.get-kind.com` (MX → `inbound-smtp.eu-west-1.amazonaws.com`), Svix HMAC-SHA256 webhook auth, body fetched via `GET /emails/receiving/{id}` (webhook is metadata-only). `FIGSY_REPLY_TO=figsy@reply.get-kind.com`.
- **Compliance suppression guard — hard-coded, cannot be disabled.** New `suppression.ts`: floor list `smartsheet.com, brandfolder.com, outfit.io, slopeapp.com` + `SUPPRESSED_DOMAINS` env. Enforced at **all 6 outreach paths** (sequence send, day-1 batch, auto-enroll, ICP run, consent endpoint, drip).
- **ICP run made async** — portal's 15s timeout was killing the synchronous run. Route now fires-and-forgets, returns `{started:true}` instantly, portal polls at 8s/20s/40s.
- **Schema drift fixed on live DB** — `lead_status` is a native Postgres ENUM; missing values caused 22P02. `ALTER TYPE ADD VALUE` for all statuses incl. `opted_out`. CSV export `.neq('status','opted_out')` removed.
- Settings page white-screen crash (team fetch 500 → `.map` on non-array) — guarded.
- Usage counter now counts `delivered_at` (reconciles with credits charged), not `created_at`.
- Error logging: Supabase errors are plain objects → log `e?.message||e?.details||e?.hint||e?.code` not `String(err)` (`[object Object]`).

### SMOKE TEST 1 — STATUS (`docs/SMOKE_TEST.md`, 57-step)
| Test | Area | Status |
|------|------|--------|
| **T2** | Lead sourcing (Apollo search → enrich by id → real emails delivered) | ✅ done & verified |
| **T3** | FIGSY send ✅ · reply → 🔥 Hot in Inbox ✅ | ✅ mostly — **step 13 left** |
| **T3-13** | Pause campaign → send again → **no** further emails go out | ⬜ NEXT |
| **T4** | Book meeting (Google Cal / "Mark as booked") → `meetings_booked` increments | ⬜ |
| **T5** | Stripe: buy credits (added once) · replay webhook (idempotent) · Milla subscribe unlocks / non-sub 403 | ⬜ |
| **T6** | Vida chatbot: embed snippet · purple bubble · visitor reply · lead captured | ⬜ |
| **T7** | Non-Milla client does **not** receive Milla morning briefs | ⬜ |
| **T1** | Signup → onboard gate | ⬜ **parked for last** (founder's call) |

### OPEN CODE FIXES (logged, not launch-blockers)
- "Sign emails as {name}" setting — FIGSY currently invents a signer name per email (Thandeka/Thabo) because the prompt passes company but not sender name.
- Relabel "Pipeline Value" as an estimate.
- ICP Builder "New ICP" scroll fix; notifications panel clip.
- **Deliverability (launch-critical):** SPF/DKIM/DMARC alignment + domain warmup — FIGSY mail lands in Promotions/Spam.

### FOUNDER ACTIONS (you)
- Set `AUTO_OUTREACH_ENABLED=true` on Railway API for launch (default OFF so test runs don't email real people).
- Registered office → service address (home address on `terms.html` is priority).
- Cloudflare WAF rule (AS46582) · TIER-0 credential rotation · DNS · Denise $99/mo Stripe price (`STRIPE_PRICE_DENISE_MONTHLY`) · migration 010.

### CANONICAL AGENT GENDERS
**FIGSY = he/him (male).** Milla, Vida, Denise, Casey = she/her (female).

### DELIVERABLES THIS SESSION
- `docs/demo-walkthrough-script.html` — 12-scene client demo talk track (On screen / Say this / Why it lands / Tip). FIGSY he/him throughout.
- Staging-environment docs (build V2 without touching live clients).

---

## 🗓 SESSION STATE — 6 Jun 2026

### KEY DECISIONS LOCKED (6 Jun)
- **app.get-kind.com = HTTPS enforced, padlock confirmed.** Railway forwards plain HTTP internally; fixed by using `x-forwarded-proto/host` in middleware + auth/callback. GoDaddy CNAME updated to new Railway target.
- **Dogfood account (hello@get-kind.com) = FULLY SET UP.** All 4 agents active, 999,999 credits on both pools, subscriptions to 2099, no trial banner.
- **Portal V2 = concepts only (not live).** 9 UI concepts documented in `docs/portal-v2-preview.html` — agent card grid, thinking state, conversational setup, config panel, marketplace, slim sidebar, invite teammate, AI notetaker, Teams Hub. Nothing is live yet.
- **DB schema drift noted.** `product_type` is an ENUM in production but text+CHECK in repo migrations. Reconcile Wednesday.
- **3 portal bugs fixed:** (1) FIGSY archive 404 → `PATCH /figsy/campaigns/:id {status: 'archived'}`. (2) Save settings wrong method/field → `PATCH` + `review_required`. (3) ICP suggest crashes on JSON fences → strip code fences before `JSON.parse`.
- **Smoke test = Saturday, pending.** ICP Builder → source leads → FIGSY campaign → test send.

---

## 🗓 SESSION STATE — 5 Jun 2026

### KEY DECISIONS LOCKED (5 Jun)
- **Denise = full transactional agent, $99/mo, LIVE** (not "coming soon"). Premium closer tier.
- **Logo = `logo-k.png` image** (from homepage), everywhere — website + portal. No ⚡ emoji.
- **Colors = homepage palette, `#7C3AED` canonical.**
- **Currency = USD ($).** Africa = founding-story/proof only.
- **Homepage walkthrough reel = `platform-video.html`** (multi-agent), not figsy-video.html.

### ISSUE LOG — every item the founder raised 5 Jun (not from memory; from the session)
Status: ✅ fixed in code (on `main`) · ⏳ fixed, awaiting website-service deploy/cache · ❓ needs founder · 🔁 decision

| # | Founder raised | Status | Where |
|---|----------------|--------|-------|
| 1 | Pipeline calculator showed Rand not $ | ✅ | pipeline-calculator.html (JS + initial values) |
| 2 | about.html#denise link / needs Denise pic | ✅ | about.html (Denise card, denise.png, #denise anchor) |
| 3 | Logo inconsistent (⚡ emoji vs image) | ✅ | all 36 website pages → logo-k.png |
| 4 | Colors inconsistent (7 purples) | ✅ | → #7C3AED site-wide |
| 5 | Remove "Meet the agents" duplicate on about | ✅ | about.html (section removed) |
| 6 | Vida price wrong ($39) | ✅ | Sidebar.tsx + billing → $29 |
| 7 | Partner deck Rand pricing | ✅ | deck/page.tsx → USD $20/$40/$100 |
| 8 | "Three agents" / Denise missing in copy | ✅ | story, demo, platform-video, index, founder quote |
| 9 | Denise missing on homepage "every role" | ✅ | index.html added Denise card |
| 10 | Denise missing on story.html family | ✅ | story.html added Denise + mother intro |
| 11 | Denise needs her own dedicated page | ✅ | **denise.html created**; Products dropdown + footer → denise.html |
| 12 | Add Denise pricing on site + portal | ✅ | pricing.html $99/mo live; billing $99/mo |
| 13 | Portal: no Denise, logo wrong, e2e unclear | ✅ | portal logo→image; Denise wired sidebar/layout/agents/billing/workspace/API |
| 14 | Railway build failing (duplicate brace) | ✅ | agents/page.tsx fixed; builds green |
| 15 | Denise = full transactional agent @ $99 | ✅ | API route, Stripe cfg, migration 011, workspace page |
| 16 | demo tab nothing about Denise | ✅ | demo.html "Four teammates" + Denise card |
| 17 | Resources/Products dropdown promo block had no colour | ✅ | **.dd-promo CSS missing on 4 pages** — real bug, fixed |
| 18 | Portal Denise page showed FIGSY on right | ✅ | AgentColumn renders Denise panel on /dashboard/denise |
| 19 | "No agent on right talking" on Denise page | ✅ | AgentColumn Denise side-panel + hasDenise wired |
| 20 | figsy trio strip / footers missing Denise | ✅ | figsy trio + chatbot/denise footers |
| 21 | Homepage reel is old (FIGSY-only) | ✅ | embed → platform-video.html + **dedicated Denise scene** (Vida→Denise→KPI, gold, "Live now · $99/mo") |
| 22 | Company page "doesn't show Denise" (repeated) | ✅(code) | code correct + verified; was **website deploy/cache lag** — `version.txt` marker added to verify deploy |
| 23 | Portal agent-switcher dropdown not discoverable / "very bad" | ✅ | redesigned: clean card + full-width "Switch agent ▾" bar (old cramped strip removed) |
| 24 | Denise demo button 400'd (enum missing) | ✅ | demo-request.ts enum + productNames + denise |
| 25 | Vida $39 stale in chatbot page + stripe comment | ✅ | → $29 |
| 26 | DB CHECK rejected figsy_addon/denise_addon | ✅ | migration 011 + schema constraint extended |
| 27 | Africa-First positioning → GLOBAL | ✅ | swept 25+ pages; playbook→"The B2B Outbound Playbook"; African blog article kept |
| 28 | #62a trained-on hook · #62d "Revenue Blueprint Session" | ✅ | FIGSY+Denise trained-on lines (no fake numbers); 29 demo CTAs renamed |
| 29 | #17b outcome-event data floor | ✅ | send/reply/opt_out/meeting_booked (FIGSY + calendar paths) |
| 30 | R420k Rand in reel KPI mockups | ✅ | → $420k (all 3 reel files) |

### DEEP AUDITS — TWO FULL SWEEPS, 5 Jun (evidence-based, not memory)
- **Website sweep ×2:** 0 broken links/anchors/buttons; all dropdowns 4 agents + working promo blocks; logo correct; USD throughout; positioning global. Final sweep found 1 bug (R420k) → fixed. **Now: 0 confirmed issues.**
- **Portal sweep ×2:** Denise wired end-to-end across full client journey (signup→billing→Stripe→webhook→workspace→API); logo all `/logo-k.png`; agent-panel routes correct; pricing consistent; switcher clean; build green. **Final sweep: 0 confirmed issues.**

### ⚠️ KNOWN-OPEN (honest — decisions made / by design)
- **Reel mockup numbers** (reply-rate 8.2%/12.8%) — ✅ DECISION: KEEP as illustrative demo UI; swap for real numbers once #17b data flows. Not fake-news (clearly in-product demo).
- **Homepage outcome numbers (#62c)** — hold the slot, populate with REAL numbers post-launch (no fabrication).
- **Deploy/cache:** website is a separate Railway service that lags the portal. `get-kind.com/version.txt` is the live-vs-code check. Server already sends `no-cache` on HTML.

---

## 🧭 FUTURE UPDATES — RANKED (high → low). Every item. ✅ done · ⬜ todo · ⏸ gated · 🚫 won't.
> Derived view of everything still ahead, ordered by priority band. Details/specs live in their original sections below.

### P0 — LAUNCH-BLOCKING (before Monday)
1. ⬜ Finish **Smoke Test 1** (T1 fresh signup→onboarding · T2 steps 8–9 · T3 FIGSY send→reply→hot · T4 booking · T5 billing · T6 Vida widget · T7 Milla cron hygiene) → log `T#-Step#`
2. ⬜ **Smoke Test 2** — full re-run of T1–T7, confirm fixes, green everywhere
3. ⬜ 🤖 Fix smoke-test failures same-day
4. ⏳ Rotate remaining **TIER-0 creds** (Apollo ✅): `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `HUBSPOT_API_KEY`, `ADMIN_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
5. ⬜ **Fix deploy pipeline** — `KIND System Audit` fails every push; make Railway auto-deploy `main` reliably (no manual reconnect)
6. ⬜ **Strip launch-blocking debug** — ICP banner `diag·`/`body:` lines, API `BUILD MARKER`, `previewCount` diagnostics
7. ⬜ Denise go-live: $99/mo Stripe price → `STRIPE_PRICE_DENISE_MONTHLY`
8. ⬜ Run migration `010_crm_dedup.sql`
9. ⬜ DNS `app`/`api`/`admin`/`status`.get-kind.com → then `NEXT_PUBLIC_API_URL` + Resend webhook
10. ⬜ Confirm Calendly `kind-ai-demo/new-meeting` live
11. ⬜ Reconcile DB schema drift (`product_type` ENUM vs text+CHECK)
12. ⬜ Verify all 4 agent images are Pixar-3D (only swap any photoreal)
13. 🚫 **Do NOT enable `FEATURE_PORTAL_V2`** (breaks live portal); delete dormant V2 + flag
14. ⬜ **Legal before launch:** ICO £40 · SR01 suppression · registered office + service address · WHOIS privacy · LinkedIn lockdown · SEIS advance assurance
15. ⬜ Free cloud + AI credits — Microsoft/Google/AWS (F1, zero downside)
16. ⬜ **MON — LAUNCH** both markets, multiple campaigns

### P1 — WEEK 1 POST-LAUNCH
17. ⬜ 10 warm outreach messages (network)
18. ⬜ LinkedIn content 1/day via anonymous brand handle
19. ⬜ Activate LinkedIn outreach — run `20260602_linkedin_queue.sql` + PhantomBuster keys
20. ⬜ Start Meta/WhatsApp Business API application (3–7 day window)
21. ⬜ Record real product demo ("shoot once, cut many", 16:9 + 9:16)
22. ⬜ #44 Replace homepage hero animation with real product loop (blocked on demo)
23. ⬜ Instrument GTM funnel (channel→reply→demo→close, CAC, trial→paid)
24. ⬜ Activate dogfood self-outreach engine + point FIGSY at competitor-switcher ICP
25. ⬜ Daily client briefing email (Apex steal)
26. ⬜ One pre-launch fresh-signup check (since smoke test uses dogfood acct)

### P2 — WEEKS 2–4
27. ⬜ Open 2 design-partner slots (case study + logo)
28. ⬜ Cut social content from demo footage (9:16)
29. ⬜ Record 3 onboarding Loom videos
30. ⬜ Onboarding v2 + day-0/3/7 email sequence
31. ⬜ Populate proof block + homepage outcome numbers with REAL data (#31/#62c — no fabrication)
32. ⬜ Activate Flutterwave (needs key — ZAR/NGN/KES/GHS)
33. ⬜ Launch YouTube channel (10-video plan exists)
34. ⬜ Wire playbook email form (ConvertKit/Mailchimp)
35. ⬜ #61a/g Performance-guarantee clause in terms.html (define "qualified meeting", refund mechanics, min volume)
36. ⬜ #61e Atlas steal — influencer/community distribution (1–2 SA + 1–2 US communities; find our Dan-Martell)
37. ⬜ #61g Atlas steal — sharpen guarantee to "90-day results or you don't pay"
38. ⬜ #62b Revio steal — bundle "Revenue Playbook Session" (30-min) into onboarding
39. ⬜ Scheduled report emails (S4 steal)

### P2.5 — COSMETIC (batch after Smoke Test 1)
40. ⬜ Sidebar: ICP Builder above People
41. ⬜ Agent cards — consistent length + layout
42. ⬜ ICP banner — "20,000+ available · we deliver your 20/run"
43. ⬜ Agent panel — every agent uses FIGSY layout
44. ⬜ Signup screen — ClickUp-style (Continue with Google, consent checkboxes)

### P3 — MONTH 2 (10+ clients; intelligence layer + V2 portal)
**Intelligence (37–53 in Part 1):**
45. ⬜ #37 Intent signal detection
46. ⬜ #38 A/B subject testing
47. ⬜ #39 Client morning-brief email
48. ⬜ #40 ICP auto-refinement (L2 learning layer)
49. ⬜ #41 Conditional sequence branching
50. ⬜ #42 Waterfall enrichment (Apollo→PDL→Hunter→Clearbit; needs keys)
51. ⬜ #43 Deliverability dashboard (SPF/DKIM/DMARC + bounce + blacklist)
52. ⬜ #44 Email score pre-send
53. ⬜ #45 Adaptive send volume
54. ⬜ #46 **FIGSY Memory v2 (pgvector)**
55. ⬜ #47 Milla full-context CRM pull
56. ⬜ #48 Vapi voice calling
57. ⬜ #49 Product Hunt (with proof)
58. ⬜ #50 G2 listing (5 reviews)
59. ⬜ #51 Configurable agent triggers
60. ⬜ #52 Multi-model toggle per campaign
61. ⬜ #53 Inbox rotation / multiple sending domains (Instantly steal)
62. ⬜ #59 **MCP server** (pulled fwd from M3 — distribution unlock)
**V2 portal redesign (`portal-v2-preview.html`):**
63. ⬜ V2-1 Agent card grid (High)
64. ⬜ V2-2 Agent thinking/working state (High)
65. ⬜ V2-6 Slim sidebar + top-right header (High)
66. ⬜ V2-7 Invite teammate / growth loop (High)
67. ⬜ V2-8 AI Notetaker → action items / Milla (Critical)
68. ⬜ V2-9 Teams Hub (Critical)
69. ⬜ V2-3 Conversational agent setup (Medium)
70. ⬜ V2-4 Structured agent config panel (Medium)
70b. ⬜ V2-10 **Casey — Onboarding agent** (non-family, portal-only, `casey.png`, guides setup — ClickUp-style) (High)

### P4 — MONTH 3 (agent family + platform)
71. ⏸ #54 **DENISE deep build** (#1 next agent) — Calendly auto-book · call-join transcription/notetaker · live objection extraction · proposal draft from transcript · pipeline follow-up · persona prompt · admin card
72. ⏸ #55 **LENA**
73. ⏸ #56 **OTTO**
74. ⏸ #57 Multi-agent orchestration (shared memory)
75. ⏸ #58 500+ FIGSY skill library
76. ⏸ #60 **Outcome pricing** (per meeting booked) — GATED on ≥28% gross margin data
77. ⏸ #61 Mobile app (iOS + Android)
78. ⏸ #62 Built-in CRM (persistent prospect DB / Kanban deal view)
79. ⏸ V2-5 Agent marketplace ("Meet your AI Revenue Team")
80. ⏸ #63 Pan-African design partners (NG/KE/GH/EG/RW)
81. ⏸ #64 Platform-level cross-client intelligence (L4 moat)
82. ⏸ #65 Data licensing marketplace
83. ⏸ #66 ICP auto-refinement advanced
84. ⏸ #67 Pipeline forecasting
85. ⏸ #68 In-portal messaging
86. ⏸ #69 Proposal + e-sign
87. ⏸ #70 Meeting notetaker

### P5 — YEAR 2 (certifications + enterprise)
88. ⏸ #71 ISO 27001 (~£15–25k)
89. ⏸ #72 ISO 42001 AI Governance (~£10–15k)
90. ⏸ #73 SOC 2 Type II (~$50k, Vanta)
91. ⏸ #74 Triple-cert via Vanta (~70% shared controls)
92. ⏸ #75 3-type memory model (episodic/long-term/preference)
93. ⏸ #76 Visitor de-anonymisation (Clearbit)
94. ⏸ #77 Churn-risk scoring
95. ⏸ #78 Revenue forecasting
96. ⏸ #79 Call intelligence

### ONGOING — legal · funding · ops · tech-debt
- **Legal (Part 2):** D&O insurance (~£500–1k, M2) · ODPC Kenya/NDPR (first NG/KE client) · AI Risk Register (free, start now) · pen test (~£2–5k, M3) · trademarks K.I.N.D+FIGSY+Milla+Vida (~£320, M2–3) · IR35/contractor IP (first hire) · SeedLegals IP (~£600, at raise) · VAT at £90k · annual confirmation statement + accounts + CT return.
- **Funding (Part 5C):** F1 cloud credits (now) · F2 SA ecosystem (5–10 clients) · F3 YC/accelerators (paying clients) · F4 revenue-based financing (predictable MRR) · F5 influencer lever (ongoing). Revisit raise vs bootstrap at 20–30 paying clients.
- **Tech-debt (6 Jun):** delete dormant Portal-V2 + flag · Apollo validated keyword/tech picker · tighten ICP-builder prompt (no prose keywords) · admin proxy hardcoded URL · commit signing (Unverified warnings).
- **MASTER.md cleanup (Part 8):** 15 contradictions to reconcile (Vercel refs, launch-day, Vida price, pricing tables, cron count, agent timing, LinkedIn "never", duplicate sections, Calendly personal link, done/pending conflicts, cashflow, us.app remnants, eu-west-1, fake "built" routes, old smoke test).

### ⏸ BLOCKED — needs credentials only (no build) — Part 4
Milla/Vida Stripe price IDs · Flutterwave key · HubSpot key · Vapi · WhatsApp (Meta) · Google Calendar OAuth · Clearbit · PhantomBuster · Cloudflare CDN · Render standbys + UptimeRobot.

### ✅ STEALS ALREADY DONE (reference — do not rebuild)
Command palette · activity feed · shareable dashboards · sequence-branching UI · Meetings-Booked KPI · Mission Control · agent photos · warm palette · AskFigsyButton · benchmark · anomaly alerts · Unibox two-way · demo narration · "AI Revenue OS" hero · pipeline/ROI calculator (#61f) · "clone yourself" figsy hero (#61c) · cold-CRM re-engagement (#61d) · "trained on" hook (#62a) · "Revenue Blueprint Session" CTAs (#62d) · vertical landing pages (#62e) · 90-Day Pipeline Guarantee band (#61a) · "$20" entry number (#61b).
📌 NOT stealing: Glean "platform/layer" narrative (we're product-level — breaks honest positioning).

---

## 🏁 PRE-LAUNCH SPLIT — what's yours, what's mine, what I'm waiting on

### 🤖 CLAUDE — DONE (code complete, on `main`, verified by 2 sweeps)
Website (logo, colors, USD, 4-agent consistency, denise.html, global positioning, reel+Denise scene, dd-promo, trio/footers, pricing) · Portal (Denise transactional end-to-end: sidebar/switcher, layout access, AgentColumn panel, workspace, agents card, billing $99) · API (denise routes, Stripe config, demo-request) · DB (migration 011 + schema) · #17b data floor · #62a/#62d steals.

### 🤖 CLAUDE — REMAINING (gated on founder, not blocking launch)
- **#17 Fix smoke-test failures** — Sat/Sun, after your smoke tests (the core weekend loop).
- **#4 Grant FIGSY + credits, set `FIGSY_KIND_CLIENT_ID` + `booking_url`** — after you create the dogfood account (#3).
- **#44 Replace homepage hero animation with real product loop** — after you record real demo footage.
- **#62c Homepage outcome numbers** — after first real results.

### 🧍 FOUNDER — before Monday (your list)
1. **Denise go-live (2 steps left):** create $99/mo Stripe price → `STRIPE_PRICE_DENISE_MONTHLY` on Railway API service + redeploy. (Migration 011 ✅ done.)
2. **TIER 0 credential rotation** — Apollo ✅ rotated 6 Jun; rest still pending (FIRST).
3. **Confirm Railway website-service** deployed latest `main` (check `get-kind.com/version.txt`).
4. ~~Move `FEATURE_PORTAL_V2=true`~~ 🚫 **DO NOT — breaks the working portal (dormant V2 build). Launch on V1.**
5. ~~Create dogfood account~~ ✅ Done 6 Jun (hello@get-kind.com).
6. **Run migration `010_crm_dedup.sql`** (011 already done).
7. **DNS** `app`/`api`/`admin`/`status`.get-kind.com → then update `NEXT_PUBLIC_API_URL` + Resend webhook.
8. **Confirm Calendly** live · **ICO** £40 · **SR01** suppression · **registered office** · **WHOIS privacy** · **LinkedIn lockdown**.
9. **Free cloud credits F1** (Microsoft/Google/AWS — zero downside).

### ⏳ WHAT I'M WAITING ON YOU FOR (to fully finish)
1. ~~**Dogfood account**~~ ✅ Done — hello@get-kind.com set up 6 Jun.
2. **Smoke test 1 results** → so I can fix any failures same-day (#17) — the main Sat work.
3. **(Optional) real demo footage** → to replace the homepage animation.
Everything else of mine is done.

### 🗓 WEEKEND → MONDAY (your plan, mapped)
- **Sat AM (you):** run · clean · finish your to-do items · do Denise Stripe step + credential rotation + DNS.
- **Sat PM:** **smoke test 1** (57-step, `docs/SMOKE_TEST.md`) → log `T#-Step#` failures → ping me, I fix same-day.
- **Sun:** confirm fixes · **smoke test 2** · refine · green on all fronts.
- **Mon:** 🚀 **LAUNCH** both markets, multiple campaigns.

---

## CANONICAL FACTS (the reconciled truth — supersedes any stale value in MASTER)

- **Launch:** MONDAY, both markets (US + Africa), multiple campaigns.
- **Region:** ONE URL `app.get-kind.com`, ONE Cape Town DB (Supabase af-south-1). US served from Cape Town.
- **Hosting:** Railway ONLY. No Vercel. (Portal, API, Admin, Website = 4 Railway services.)
- **Billing:** Stripe primary. Flutterwave Phase 2 (code-complete, needs key). Paystack REMOVED.
- **Pricing:** Lead Gen $1/credit (20/40/100 = $20/$40/$100). FIGSY $3/credit (20/40/100 = $60/$120/$300). Milla $49/mo. Vida **$29/mo** (NOT $39). **Denise $99/mo** (decided 5 Jun — premium closer). Bundle $69/mo.
- **Currency:** USD ($) globally. Africa-first as founding story/proof angle only — not pricing or positioning.
- **Cron jobs:** 16 live (the 3 status-snapshot crons were planned, never built).
- **Agents:** FIGSY (The Opener · AI SDR) · Milla (The Brain · VA) · Vida (The Connector · Chatbot) · **Denise (The Closer · AI AE · $99/mo) = LIVE & transactional as of 5 Jun** (own page, billing, workspace, API). LENA/OTTO = Month 3.
  - ⚠️ **Denise go-live needs 2 FOUNDER actions:** (1) create Stripe product + $99/mo recurring price → add `STRIPE_PRICE_DENISE_MONTHLY` to Railway; (2) run migration `011_denise.sql`.
- **Models:** Sonnet 4.6 (Milla, FIGSY) + Haiku 4.5 (scoring, scraping).
- **Run cost floor:** ~$125/mo. Break-even: 2 clients (infra) / 5 (all-in). Margin 95%+.
- **Brand purple:** `#7C3AED` everywhere. No stray hex variants.
- **Logo:** `logo-k.png` image on every page nav. No ⚡ emoji.
- **Positioning:** GLOBAL (decided 5 Jun). US + Africa are the first markets, not the brand identity. Lead global; "Africa-first" removed from chrome/taglines. Targeted African blog content retained.

---

# PART 1 — ACTIONABLE (everything to do, by timeframe + owner)

Owner key: 🧍 Founder · 🤖 Claude · 🤝 Both. Status: ⬜ TODO · ⏸ DEFERRED (trigger noted) · ✅ DONE.

## 🚨 THIS WEEK — launch
| # | Item | Owner | Status |
|---|------|-------|--------|
| 1 | Rotate exposed credentials — TIER 0 (full list in Part 2 / Ring 3) | 🧍 | ⏳ Apollo key rotated 6 Jun (was leaked in chat); rest pending |
| 2 | ~~Move `FEATURE_PORTAL_V2=true` API → Portal service~~ | — | 🚫 **DO NOT ENABLE — would break the working portal.** The flag swaps live V1 for the *dormant, incomplete* Portal-V2 build (Part 3). Launch on V1. The V2 *redesign* (see §V2 BUILDS) is separate new Month-2 work. TODO Wed: delete the dead build + flag so it can't be flipped by accident. |
| 3 | Create dogfood account → ping Claude | 🧍 | ✅ hello@get-kind.com — all 4 agents, 999,999 credits |
| 4 | Grant FIGSY + credits, set `FIGSY_KIND_CLIENT_ID` + `booking_url` | 🤖 | ✅ Done via SQL 6 Jun |
| 5 | Merge branch `claude/ai-business-roadmap-U3OWJ` | 🧍 | ⬜ READY — branch is up to date |
| 6 | Run migration `010_crm_dedup.sql` | 🧍 | ⬜ |
| 7 | DNS: `app` / `api` / `admin` / `status`.get-kind.com (Railway + CNAME) | 🧍 | ⬜ |
| 8 | After DNS: update `NEXT_PUBLIC_API_URL` (Portal+Admin) + Resend inbound webhook URL | 🧍 | ⬜ |
| 9 | Confirm Calendly `calendly.com/kind-ai-demo/new-meeting` live | 🧍 | ⬜ |
| 10 | ICO registration — ico.org.uk £40/yr | 🧍 | ⬜ before launch |
| 11 | SR01 home-address suppression (free) | 🧍 | ⬜ |
| 12 | Registered office + director service address (~£20-50/yr) | 🧍 | ⬜ |
| 13 | Domain WHOIS privacy verify | 🧍 | ⬜ |
| 14 | LinkedIn lockdown (don't accept Bradley-type requests; no K.I.N.D on personal) | 🧍 | ⬜ |
| 15 | **Sat** smoke test 1 (57-step suite, `docs/SMOKE_TEST.md`) → log `T#-Step#` | 🧍 | ⏳ **BARELY STARTED** — only T2 steps 5–7 (ICP→leads→charge) PASSED 6 Jun. **T1 (fresh signup/onboarding) NOT run** (used dogfood). T3–T7 outstanding. See §SMOKE-TEST STATE below. |
| 16 | **Sun** smoke test 2 → confirm fixes | 🧍 | ⬜ NOT STARTED (full second pass of T1–T7) |
| 17 | Fix smoke failures same-day | 🤖 | ⬜ |
| 17b | **Raw outcome-event capture — append-only log (THE DATA FLOOR).** ✅ DONE — `outcome_events` table + `logOutcomeEvent()` (append-only, fire-and-forget). Coverage: send · reply · opt_out · meeting_booked (FIGSY flow + calendar /book). | 🤖 | ✅ |
| 18 | **MON — LAUNCH both markets, multiple campaigns** | 🤝 | ⬜ |

## ✅ DONE THIS SESSION (6 Jun — verified in repo)
- **HTTPS enforced site-wide** — `middleware.ts` checks `x-forwarded-proto`, returns 308 redirect to https. `auth/callback/route.ts` uses forwarded host/proto for origin. GoDaddy CNAME updated. Padlock confirmed in incognito.
- **3 portal bugs fixed:** FIGSY archive (404 → PATCH), save settings (wrong method + `copilot_mode` → `review_required`), ICP suggest (JSON code fence crash).
- **Dogfood account fully set up** — 999,999 credits (lead gen + FIGSY), all 4 agents active, subscriptions to 2099. SQL fixes: product_type::cast + `alter type add value 'denise'`.
- **🟢 LEAD SOURCING FIXED END-TO-END — 7 stacked bugs, all verified live (Apollo returns ~72k for the dogfood ICP). This was the single biggest risk to launch — it would have given EVERY client zero leads.** Fixes in `apps/api/src/lib/apollo.ts`:
  1. industries → `q_organization_keyword_tags` (was literal `q_keywords` → near-zero)
  2. tolerant company-size mapping (`toEmployeeRange`) — handles AI-emitted "2–10" etc.
  3. preview count reads top-level `total_entries` (was `pagination.total_entries` → always 0)
  4. endpoint → `/mixed_people/api_search` (old `/mixed_people/search` = HTTP 422 deprecated)
  5. base URL → `/api/v1` (bare `/v1` = Apollo internal API → HTTP 200 with 0 results)
  6. **removed `icp.keywords` from literal `q_keywords`** — builder emitted prose ("manual outreach pipeline building…") → 0
  7. `tech_stack` dropped from search (auto-gen junk, not valid Apollo UIDs)
  - Also: rendered the previously-invisible **Run-result banner**; added preview diagnostics (to be stripped — see §CLEANUP).
- **🔑 TIER-0: Apollo master key was pasted in chat → ROTATED.** New key live on Railway. (Add to credential-rotation log, Ring 3.)
- **DEPLOY PIPELINE root cause found** — the `KIND System Audit` GitHub Action fails on every push to main and Railway's auto-deploy is unreliable; the API served a stale build for hours until a manual GitHub **disconnect/reconnect** forced it to pull `main`. See §DEPLOY PIPELINE below.
- **Portal V2 concepts** — `docs/portal-v2-preview.html` (9 concepts: card grid, thinking state, chat setup, config panel, marketplace, slim sidebar, invite teammate, AI notetaker, Teams Hub). `docs/portal-v2-layout.md` spec. None live.
- **⚠️ SCHEMA DRIFT NOTED:** `product_type` is ENUM in production, text+CHECK in repo. Reconcile Wednesday.

---

## 🧪 SMOKE-TEST STATE (6 Jun — honest)
Two full passes planned: **Smoke Test 1 (Sat)** and **Smoke Test 2 (Sun)**, each = all 7 tests in `docs/SMOKE_TEST.md`. Current reality:
| Test | Steps | Status |
|------|-------|--------|
| T1 — Signup → Onboarding → gate | 1–4 | ⬜ **NOT DONE** (skipped — used pre-set dogfood acct; fresh signup never exercised) |
| T2 — ICP → Leads | 5–9 | ⏳ **5–7 ✅** (built ICP, sourced real leads, credits dropped) · **8–9 ⬜** (2nd-ICP "Set active", CSV export) |
| T3 — FIGSY → reply → hot | 10–13 | ⬜ NOT DONE |
| T4 — Booking + KPI | 14 | ⬜ NOT DONE |
| T5 — Billing | 15–17 | ⬜ NOT DONE |
| T6 — Vida widget | 18 | ⬜ NOT DONE |
| T7 — Milla/cron hygiene | 19 | ⬜ NOT DONE |
**→ Smoke Test 2 (full re-run): NOT STARTED.** Start Pass 1 at **T1 with a fresh email** — that's the first thing a real client hits Monday and it has never run end-to-end.

## 🧹 CLEANUP (do before launch / before clients see it)
- Strip ICP preview-banner debug lines (`diag ·`, `body:`) — `apps/portal/.../leads/icp/page.tsx`.
- Remove API startup `BUILD MARKER` line — `apps/api/src/index.ts`.
- Remove the `previewCount` diagnostic envelope once stable — `apps/api/src/lib/apollo.ts` / `routes/icps.ts`.

## 🛠 DEPLOY PIPELINE (must fix — caused hours of stale-build pain 6 Jun)
- **Symptom:** pushes to `main` reach GitHub but Railway keeps serving an old build (and env-var changes only redeploy the *old* commit). Required a manual GitHub disconnect/reconnect on `@kind/api` to pull latest.
- **Likely cause:** `.github/workflows/daily-audit.yml` ("KIND System Audit") fails on **every** push; if any Railway service has "Wait for CI" on (both were off this time) it blocks deploys — but auto-deploy was unreliable regardless.
- **TODO:** (a) repair or make non-blocking the `KIND System Audit` workflow so checks go green; (b) confirm Railway auto-deploy fires on every `main` push for `@kind/api` and `@kind/portal`; (c) keep a build marker pattern for verifying live builds.

## 🎨 COSMETIC BACKLOG (batch after Smoke Test 1 — logged 6 Jun)
1. Sidebar: move **ICP Builder above People** (Lead Gen section).
2. **Agent cards** — standardise length + layout across all agents.
3. ICP preview banner — show "20,000+ available · we deliver your 20/run" instead of the raw scary count.
4. **Agent panel** — every agent (Milla/Vida/Denise) uses the FIGSY layout: large Pixar portrait, name+role, suggestion chips, intro message, "Ask … anything" input.
5. **Signup screen** — ClickUp-style: "Seconds to sign up!", Continue with Google, clean name/email/password, marketing-consent + data-transfer-outside-UK consent checkboxes.

## 🟣 V2 BUILDS — Month-2 portal redesign (`docs/portal-v2-preview.html`)
> NEW redesign — NOT the dead `FEATURE_PORTAL_V2` flag. 10 concepts:
1. Agent card grid (dashboard home) — *High*
2. Agent thinking/working state — *High*
3. Conversational agent setup — *Medium*
4. Structured agent config panel (Role/ICP/Tone/Schedule/Knowledge) — *Medium*
5. Agent marketplace ("Meet your AI Revenue Team") — *Month 3*
6. Slim sidebar + top-right header (profile dropdown: Usage/Billing/Settings/Team/API) — *High*
7. Invite teammate (header + modal) — growth loop — *High*
8. AI Notetaker → action items (Milla) — *Critical*
9. Teams Hub (members, activity, per-person agent usage) — *Critical*
10. **Casey — Onboarding agent** — a dedicated **non-family** support agent (à la ClickUp's "Onboarding Assistant") that guides new clients through setup (business profile → ICP → first leads → first campaign). NOT one of the FIGSY/Milla/Vida/Denise revenue family. **PORTAL ONLY — never on the website.** Warm Pixar-3D style (own identity). Image: `apps/portal/public/agents/casey.png` (added by founder 6 Jun). Lives on the setup/onboarding dashboard (`docs/setup-dashboard-preview.html`). Backend agent + chat surface. — *High* — **NEW 6 Jun**

## ✅ DONE THIS SESSION (4 Jun — verified in repo)
- terms.html sub-processor bug (Paystack/Vercel → Stripe/Railway) · AAA arbitration §12
- privacy.html honest residency (Cape Town; US enterprise on request) + purple fix
- Homepage dual-market trust bar + OG · Pricing USD strip
- #45 proof block (removed fabricated "4/8" stat → honest Live state)
- #46 homepage throughline (founder-approved, live)
- Deployment SOP single-region + dual-region future rule
- Region architecture locked; MASTER US section + risk flags reconciled
- Earlier 4 Jun: company number ×4, FOUNDER_EMAIL, Resend inbound, Stripe 8 price IDs + pricing fix, Calendly 40+ buttons, API build crash, CRM dedup built, 3 blog articles, YouTube plan, SEIS+trademark draft, chat backup

## 🟥 WEEK 1 POST-LAUNCH
| # | Item | Owner |
|---|------|-------|
| 19 | 10 warm outreach messages (network) | 🧍 |
| 20 | LinkedIn content 1/day via **anonymous brand handle** (dogfood story) | 🧍 |
| 21 | Activate LinkedIn outreach — run `20260602_linkedin_queue.sql` + `PHANTOMBUSTER_API_KEY` + `PHANTOMBUSTER_LINKEDIN_AGENT_ID` | 🧍 |
| 22 | Start Meta/WhatsApp Business API application (3–7 day window) | 🧍 |
| 23 | Record real product demo — "shoot once, cut many" (16:9 + 9:16) | 🧍 |
| 24 | #44 — replace homepage animation with real product loop | 🤝 (blocked on #23) |
| 25 | Instrument GTM funnel (channel→reply→demo→close, CAC, trial→paid) | 🤝 |
| 26 | Activate dogfood self-outreach engine + point FIGSY at competitor-switcher ICP | 🧍 |

## 🟧 WEEKS 2–4
| # | Item | Owner |
|---|------|-------|
| 27 | Open 2 design-partner slots (case study + logo) | 🧍 |
| 28 | Cut social content from demo footage (9:16) | 🤝 |
| 29 | Record 3 onboarding Loom videos | 🧍 |
| 30 | Onboarding v2 + Loom slots + day-0/3/7 email sequence | 🤖 (gated on run-through) |
| 31 | Populate proof block with real dogfood numbers (#45 block is built) | 🤖 |
| 32 | **Website consistency pass** — ✅ DONE 5 Jun: logo (35 pages), colors (#7C3AED), Denise site-wide, demo/platform-video/story/pricing/values/about | 🤖 ✅ |
| 33 | Activate Flutterwave (needs key — ZAR/NGN/KES/GHS) | 🧍 |
| 34 | Launch YouTube channel (10-video plan exists) | 🧍 |
| 35 | Wire playbook email form (needs provider: ConvertKit/Mailchimp) | 🤝 |
| 36 | "AI Revenue OS" positioning · ✅ DONE — **Hero Option B LIVE** on index.html ("You close the deals. We'll bring you the meetings."). Draft retained for pricing/deck reframe. | 🤖 |
| 61a/g | **Performance guarantee** · ✅ DONE (branch) — **90-Day Pipeline Guarantee** band live on pricing.html. ⚠️ **FOUNDER TODO:** add matching clause to terms.html defining "qualified meeting", refund mechanics, min lead volume — copy currently points to ToS. | 🤝 |
| 61b | **The one number we own** · ✅ DECIDED & LIVE — **"$20"** (true entry price, pay-per-result; NOT $29). Applied to homepage hero. Roll into pricing/deck next. | 🤝 |
| 61c | **Atlas steal #3 — "Clone yourself" framing** · ✅ DONE (branch) — figsy.html hero rewritten "learns the way you sell… writes every email in your own voice." Original wording, not Atlas's. | 🤖 |
| 61d | **Atlas steal #4 — Cold CRM re-engagement angle** · ✅ DONE (branch) — new "The list you gave up on is still worth money" section on figsy.html (drop-in list → re-open → warm ones return). Original copy. | 🤖 |
| 61e | **Atlas steal #5 — Influencer/community distribution** · Identify 1–2 SA SMB communities (Startup Grind CPT, specific trades/services forums) + 1–2 US equivalents. Pursue co-marketing or endorsement. Dan Martell is Atlas's real acquisition channel — we need ours. | 🧍 |
| 61f | **Atlas steal #6 — Pipeline / ROI calculator** · ✅ DONE + LINKED — `pipeline-calculator.html`. User enters own leads + deal value; sliders w/ conservative defaults (8%/40%/25%, founder-approved) + "estimate, not a promise" disclaimer. Now in the Use Cases dropdown across 24 pages. | 🤖 |
| 61g | **Atlas steal #7 — 90-day guarantee framing** · Sharpen the guarantee from "30-day money back" to "90-day results guarantee — your pipeline grows or you don't pay." 90 days gives enough campaign data to show results; stronger commitment signal than 30 days. | 🤝 |
| 62a | **Revio steal #1 — "Trained on closed-won deals" credibility hook** · ✅ DONE — honest "trained on" line on figsy.html ("trained on your business, your ICP, every campaign") + denise.html ("trained on relationship selling + your closed-won deals"). NO fabricated numbers — real-number slot populates as data comes in. | 🤖 |
| 62b | **Revio steal #2 — Coaching layer bundled into onboarding** · Add a "Revenue Playbook Session" (30-min call) to KIND onboarding flow — founder or agent walks new client through campaign setup, ICP targeting, and first sequence. Especially important for SA market. Reduces churn, increases perceived value, creates personal relationship. | 🧍 |
| 62c | **Revio steal #3 — Homepage outcome numbers** · 2–3 concrete client outcome stats on the homepage as soon as first clients produce results: meetings booked, reply rates, revenue generated. "30,065 leads last month" style specificity. Do NOT fabricate — hold the slot, populate when real. | 🤝 |
| 62d | **Revio steal #4 — "Revenue Blueprint Session" demo framing** · ✅ DONE — renamed 29 demo CTAs site-wide (15 files) "Book a Demo" → "Book a Revenue Blueprint Session". | 🤖 |
| 62e | **Revio steal #5 — Vertical niche landing pages** · ✅ DONE + LINKED — `for-estate-agents.html`, `for-insurance-brokers.html`, `for-financial-advisers.html`. Vertical pain + FIGSY solution + POPIA/FAIS note, original copy. Now in the Use Cases dropdown across 24 pages. US equivalents = phase 2. | 🤖 |
| — | **Denise on homepage + image wiring** · ✅ DONE — founder uploaded Denise.png; renamed→`denise.png` (website) + moved→`portal/public/agents/denise.png`; generated transparent `denise-cut.png`; added "Coming soon — Denise, The Closer" gold teaser to index.html after the agent hero. Fixed leftover "THE CLOSER" rail label (static + JS) → "THE OPENER". | 🤖 |

## 🟨 MONTH 2 — intelligence layer (Tier 2 build queue, 10+ clients)
37 Intent signal detection · 38 A/B subject testing · 39 Client morning brief email · 40 ICP auto-refinement · 41 Conditional sequence branching · 42 Waterfall enrichment (Apollo→PDL→Hunter→Clearbit; needs PDL+Hunter keys) · 43 Deliverability dashboard (SPF/DKIM/DMARC+bounce+blacklist) · 44 Email score pre-send · 45 Adaptive send volume · 46 **FIGSY Memory v2 (pgvector)** · 47 Milla full-context CRM pull · 48 Vapi voice calling · 49 Product Hunt (with proof) · 50 G2 listing (5 reviews) · 51 Configurable agent triggers · 52 Multi-model toggle per campaign · 53 Inbox rotation / multiple sending domains (Instantly steal)

### MEMORY = THE MOAT — architecture + the data floor (clarified 5 Jun)

**Two threads, do not conflate them:**
- **Thread A — the Learning Stack (what gets smarter, the product):** L1 per-client memory ✅ BUILT (`figsy_memory`: best subjects, winning angles, reply rates) → L2 ICP auto-refinement (monthly AI review of who actually replies, ~Month 6, 10+ clients) → L3 adaptive per-campaign (real-time A/B within a campaign) → L4 platform/cross-client intelligence (benchmarks, predictive ICP — Year 3, 500+ clients).
- **Thread B — the substrate (how it's stored, the plumbing):** flat `figsy_memory` table today → pgvector (semantic embeddings) → 3-type split (episodic / long-term / preference). Build at ~10 clients. **Plumbing does NOT make FIGSY smarter on its own — it only lets L2–L4 scale. Do not pull engineering here before client volume exists.**

**Our moat is rarer than Glean's — and that changes the strategy.** Glean's moat is per-customer context (locks in each client, no benefit to the next). Ours is **outcome data** (who replied/converted, which angle, which African vertical) — a **cross-customer** moat where every client makes the platform smarter for the next one in their industry. Glean doesn't have that network effect. But it only exists *if we capture the data to feed it.*

**THE DATA FLOOR (item 17b — pre-launch, the one irreversible thing):** an **append-only raw outcome-event log** — every lead, send, exact reply text, timing, and outcome, stored row-level and **never discarded or pre-aggregated away.** L4 in 2028 can only learn from data we start keeping in 2026. Aggregates (`avg_reply_rate_30d`, `last_winning_angle`) are summaries — you **cannot back-fill** the granular truth you threw away. Cheap on one Cape Town DB. This is the only memory work that must ship before the first campaign sends.

**The accelerant rule:** you do NOT accelerate the moat by building the top of the stack faster. Pre-revenue, memory compounds on N — one client's memory is worthless. **The accelerant = (1) capture raw data at full fidelity now, (2) get clients.** The smart layers (L2–L4, pgvector, 3-type) are worthless without volume and a dangerous distraction before it. Build the *capture* layer early; build the *smart* layers at 10+ clients.

## 🟦 MONTH 3 — agent family + platform (Tier 3/4)
54 **DENISE** (the closer — PULLED FORWARD, see priority spec below) · 55 **LENA** · 56 **OTTO** · 57 Multi-agent orchestration (shared memory) · 58 500+ FIGSY skill library · 59 **MCP server** (K.I.N.D as AI infrastructure) · 60 **Outcome pricing ("per meeting booked") — GATED, see spec below** · 61 Mobile app iOS+Android · 62 Built-in CRM (persistent prospect DB / Kanban deal view) · 63 Pan-African design partners (NG/KE/GH/EG/RW) · 64 Platform-level cross-client intelligence · 65 Data licensing marketplace · 66 ICP auto-refinement advanced · 67 Pipeline forecasting · 68 In-portal messaging · 69 Proposal + e-sign · 70 Meeting notetaker

### #54 DENISE — the closer (PRIORITY: #1 build after launch stabilises — pulled forward from Month 3)

**Decision (5 Jun): DENISE goes next.** Not LENA, not OTTO — DENISE first, built deep. Reason: she extends FIGSY's *existing* pipeline instead of opening a new front. FIGSY currently dies at the exact seam "meeting booked → human takes over." DENISE eats that seam. That one handoff is worth more than launching LENA + OTTO shallow. Codename was REEVE; renamed DENISE.

**Persona / storyline (her character — load-bearing for tone, copy, and prompt):**
DENISE is the closer. Named after the founder's mother — a woman who **built a successful sales business from the ground up** and is a **huge, warm, unforgettable personality** in the room. That's the character: she's the one who walks into the deal and people *remember her*. Not a slick, pushy closer — a relationship closer. She makes the prospect feel handled, follows up like she genuinely cares (because the person she's modelled on did), and never lets a warm lead go cold. Confident, warm, a little bit of charm, zero desperation. The kind of salesperson who closes because people *like* her, not because she cornered them.
- **Voice:** warm authority. Big personality, but never loud or salesy. "Let's get you sorted" energy.
- **Why this matters commercially:** FIGSY opens the door; DENISE is who you'd actually want walking through it. The persona is the product — clients aren't buying "an AE agent," they're buying *Denise*.

**Role & capabilities (from MASTER, confirmed):**
- Books the discovery call to Calendly **automatically** (removes today's manual founder handoff)
- Joins the discovery call as an **AI notetaker** — surfaces objections live
- **Drafts the proposal from the call transcript**
- Follows up the pipeline — chases warm leads so none go cold
- The handoff seam she owns: `Meeting booked → DENISE` (today the client takes over here)

**Why deep-not-shallow:** the whole bet is that DENISE *feels* like a real closer. A half-built AE that just dumps a Calendly link is not Denise — it's a worse FIGSY. Build the notetaker + objection-surfacing + proposal-draft loop properly or don't ship her.

**Build checklist (post-launch, ahead of LENA/OTTO):** Calendly auto-book on positive FIGSY reply · call-join + transcription (notetaker) · live objection extraction · proposal draft from transcript · pipeline follow-up sequencer · DENISE persona/system prompt (the storyline above, written tight) · admin `/agents/denise` identity card.

---

### #60 Outcome pricing — spec (DO NOT BUILD YET — gated on data + cash)

**Decision (5 Jun): parked. Not now. We need wins, then data, then a data-informed call.**
Reason it waits is not the code — it's that outcome pricing moves result-risk onto K.I.N.D, and a pre-revenue company offering outcome pricing is offering free labour with extra steps. Build only after: (a) paying wins on credit pricing, (b) dogfood + real campaigns give the one number this whole model needs.

**The one number that unlocks it:** *average credits consumed to produce one booked meeting.* Without it, the price is a guess.
- If ~8 credits → cost ≈ $24 → charge $40 → ~40% margin. Works.
- If ~20 credits → cost ≈ $60 → charge $40 → lose $20/meeting. Bankrupts at scale.
- **Margin floor to proceed: 28% gross.** Below that, do not enable.

**It is a separate menu, NOT an add-on. Client picks ONE plan, never both:**
| Plan | Client pays | Risk bearer |
|---|---|---|
| Credit (live today) | $1/action (Lead Gen), $3/conversation (FIGSY) | Client eats the waste |
| Outcome (this item) | $0 per action — pays ONLY on result | K.I.N.D eats failed outreach |

**Critical rule — no double-charge across the pipeline:** on the outcome plan, a client running Lead Gen→FIGSY is billed for the **final outcome only (the meeting)**. The per-qualified-reply price ($15) exists *strictly* for Lead-Gen-only clients who never touch FIGSY. Never charge reply + meeting on the same prospect.
- Lead Gen (standalone, outcome plan): **$15 / qualified reply** (intent signal, not "unsubscribe"). Anchor: agencies charge $35–80.
- FIGSY (outcome plan): **$40 / confirmed meeting**. Anchor: human SDR = $75–200.

**"Confirmed" must be machine-decided, never a human judgment call** (or every charge becomes an argument): calendar event created via the FIGSY booking link = billable, full stop. No-shows are NOT refunded (stated in ToS — same logic as Intercom not refunding re-opened tickets). Cancellation after booking = still billable.

**Build checklist when greenlit (Month 3+):** `outcome_events(id, client_id, type, metadata, billed_at, amount)` table · Calendly/Cal.com webhook → confirm → Stripe charge · reply-qualifier LLM call at inbound · Stripe metered billing switch · pricing-page toggle behind flag · ToS clause (no no-show refunds).

## 🔵 YEAR 2 — certifications + enterprise
71 ISO 27001 (~£15–25K) · 72 ISO 42001 AI Governance (~£10–15K) · 73 SOC 2 Type II (~$50K, Vanta) · 74 Triple-cert via Vanta (~70% shared controls) · 75 3-type memory model · 76 Visitor de-anonymisation (Clearbit) · 77 Churn-risk scoring · 78 Revenue forecasting · 79 Call intelligence

---

# PART 2 — ⚖️ LEGAL & COMPLIANCE RING-FENCE (4 rings)

### 🔵 RING 1 — Corporate & Personal Shield
✅ Ltd formed (17260532, England & Wales) · ✅ Limited-liability shield · ✅ Employment ring-fence (after-hours/personal-kit; Smartsheet clause 17.2 reviewed+accepted) · ✅ `docs/legal/legal-pack.md`
⬜ SR01 home-address suppression · ⬜ Registered office + director service address · ⬜ WHOIS privacy · ⬜ LinkedIn lockdown / anonymous brand-only coverage · ⬜ All public contact = business email · ⬜ Press attributed to "K.I.N.D team" · ⬜ **D&O insurance** (~£500–1,000/yr, Month 2)
📌 Hard floor: PSC director name is permanently public — cannot be removed.

### 🟢 RING 2 — Data Protection
✅ UK GDPR + DPA 2018 + Data Use & Access Act 2025 · ✅ POPIA · ✅ NDPR + Kenya DPA 2019 · ✅ CCPA/CPRA + US state laws (dpa-us.html catch-all) · ✅ DPA published + DPA-US · ✅ Data residency locked (Cape Town; US on request) · ✅ Data classification T1–T4 · ✅ Sub-processor register consistent (fixed 4 Jun)
⬜ **ICO registration** (£40/yr — before launch) · ⏸ ODPC Kenya / NDPR DPCO (first NG/KE client)

### 🟠 RING 3 — Information Security
✅ RLS all tables (credit_transactions fixed) · ✅ API auth (requireAuth + requireAdminKey) · ✅ Strict CORS · ✅ JWT refresh · ✅ TLS 1.3 / AES-256 · ✅ Secrets in Railway env only (rule) · ✅ Incident response plan + register (4 Jun logged) · ✅ BCP (RTO 4h / RPO 24h / daily backups 30-day) · ✅ `docs/legal/it-security-pack.md`
⬜ **Rotate exposed credentials (TIER 0):** `STRIPE_SECRET_KEY`(sk_live) → `SUPABASE_SERVICE_ROLE_KEY` → `DATABASE_URL` (password exposed) → `SUPABASE_ANON_KEY` → `ANTHROPIC_API_KEY` · `RESEND_API_KEY` · `RESEND_WEBHOOK_SECRET` · `APOLLO_API_KEY` · `HUBSPOT_API_KEY` · `ADMIN_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` → Paystack test keys (hygiene)
⬜ AI Risk Register (free, start now — ISO 42001 foundation) · ⏸ Pen test (~£2–5K, Month 3) · ⏸ SOC 2 / ISO 27001 / ISO 42001 (Year 2)

### 🟣 RING 4 — Contractual & IP
✅ Client T&Cs (liability capped 3-mo fees, no-refund, England & Wales) · ✅ AAA arbitration for US clients · ✅ IP ownership (company owns code/brand/agent names/dataset)
⬜ **SEIS advance assurance** (free, draft ready — file soon) · ⏸ Trademarks K.I.N.D+FIGSY+Milla+Vida (~£320, Month 2–3, before PR) · ⏸ IR35/contractor IP-assignment (first hire) · ⏸ SeedLegals IP assignment (~£600, at raise) · ⬜ VAT registration at £90k threshold · ⬜ Annual confirmation statement + accounts + CT return

---

# PART 3 — WHAT'S BUILT (live inventory — do not rebuild)

**Platform:** Supabase+RLS, auth (no email-confirm), 16 cron jobs, TSC clean.
**Lead Gen:** ICP builder, AI ICP Suggest, ICP website scan, Apollo 3-pass, Claude scoring, leads table, opt-out blocklist, POPIA consent, first-leads email, weekly digest, drip 10/day, CRM dedup (HubSpot+Pipedrive — needs migration 010).
**FIGSY:** 19 API endpoints, campaign CRUD, 3-step sequences, reply classification, FIGSY Memory, Unibox two-way, opt-out, CRM push, escalation, identity card, weekly digest, paused_low_performance, self-outreach cron.
**Milla:** doc RAG + source attribution (subscription billing wired — awaiting price IDs confirm in T5).
**Vida:** config/embed/WhatsApp (subscription wired).
**Billing:** Stripe credit + subscriptions, auto-topup, trial overlay, credits-at-delivery, overspend fix, low-credit warning, subscription-lapse.
**Admin (13 routes):** /, clients, clients/[id], demo, launch, roadmap, cmo, founder, playbook, terms-library, hubspot, scalability, unibox (+ analytics, revenue, compliance, partners, etc. per repo).
**Portal (15 routes):** login, onboard, dashboard, leads, figsy (+ linkedin queue UI), assistant, chatbot, documents, kpis, usage, billing, billing/confirm, roadmap, referral, settings.
**Website (30+ pages):** homepage, about, pricing, support, terms, privacy, trust, dpa, dpa-us, use-cases, partners, story, values, blog, playbook, figsy, chatbot-agent, virtual-assistant, demo, demo-video, figsy-video, platform-video(+standalone), vs-apollo, vs-outreach, vs-salesloft, vs-hiring-an-sdr, vs-prospecting-manually.
**Other:** PWA (install banner, push-ready), Demo Environments, 7 internal Founder Agent endpoints, Partner Programme, Founder morning brief 07:05 SAST, Cloudflare Pages CDN (built, needs activation), Portal V2 (built, dormant — `FEATURE_PORTAL_V2`).
**LinkedIn outreach backend:** built (`lib/linkedin.ts`, 4 routes, queue migration, portal UI) — needs PhantomBuster keys + SQL run. *(Supersedes the old "never build LinkedIn" decision.)*

---

# PART 4 — BLOCKED (needs credentials only, no build)
⏸ Milla + Vida subscriptions — Stripe price IDs (verify) · ⏸ Flutterwave — key · ⏸ HubSpot — `HUBSPOT_API_KEY` · ⏸ Voice — Vapi keys · ⏸ WhatsApp — Meta approval + number · ⏸ Google Calendar OAuth — `GOOGLE_CLIENT_ID/SECRET/REDIRECT` · ⏸ Clearbit visitor de-anon — `CLEARBIT_API_KEY` · ⏸ LinkedIn auto-dispatch — PhantomBuster keys · ⏸ Cloudflare CDN failover — `CLOUDFLARE_API_TOKEN/ACCOUNT_ID` · ⏸ Render standbys + UptimeRobot.

---

# PART 4B — STAGING ENVIRONMENT (set up BEFORE first V2 work post-launch)

> **Why:** once real clients are live on production, every V2 feature and future launch must be built + smoke-tested on staging before it touches main. Clients can't be the ones who find the bugs. This costs ~$10–15/mo extra on Railway and takes ~20 minutes to set up.

## Architecture

```
feature branch → auto-deploy → staging (staging.app.get-kind.com)
                                  ↓ smoke test passes
                              merge to main → production (app.get-kind.com)
```

Three isolated pieces — staging never shares any data or keys with production:
- **Railway staging services** (Portal + API, pointing at `staging` branch)
- **Supabase `kind-staging` project** (separate DB — no client data, no cross-contamination)
- **Stripe test-mode keys** (staging always test mode; production always live mode)

## Setup checklist (one-time, ~20 min, do BEFORE first V2 branch merges)

### Step 1 — Supabase staging project
- [ ] Create new project: `kind-staging` in Supabase (af-south-1, same region)
- [ ] Run all migrations (001 → latest) in staging SQL editor
- [ ] Save `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` — these are staging-only values

### Step 2 — Railway staging services
- [ ] In Railway: duplicate the `@kind/api` service → rename `kind-api-staging`
  - Set source branch: `staging`
  - Update all env vars to staging values (staging Supabase URL/keys, Stripe test keys, `NODE_ENV=staging`)
  - Set `PORT` to a different value if needed (Railway handles this automatically)
  - Custom domain: `api-staging.get-kind.com` (or use the Railway-generated URL)
- [ ] In Railway: duplicate the `@kind/portal` service → rename `kind-portal-staging`
  - Set source branch: `staging`
  - Update `NEXT_PUBLIC_API_URL` → staging API URL
  - Update `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` → staging values
  - Update all `NEXT_PUBLIC_STRIPE_PRICE_*` → Stripe **test-mode** price IDs
  - Custom domain: `staging.app.get-kind.com`

### Step 3 — Create `staging` branch in GitHub
- [ ] `git checkout -b staging && git push -u origin staging`
- [ ] On Railway: both staging services watch this branch (auto-deploy on push to `staging`)

### Step 4 — Verify
- [ ] Push a harmless change to `staging` branch → both Railway staging services rebuild
- [ ] Visit `staging.app.get-kind.com` → sign up with a test email → dashboard loads
- [ ] Confirm no production DB rows affected (check Supabase production project — should be untouched)

## Development workflow (every V2 feature from here)

```
1. Build on a feature branch  (e.g. claude/v2-agent-cards)
2. Push feature branch → open PR into `staging`
3. Staging Railway auto-deploys
4. Run smoke test on staging.app.get-kind.com
5. Pass → merge staging → main → production auto-deploys
```

## What never changes on this rule
- **Production = `main` only.** No direct pushes to main for V2 work.
- **Staging DB is throwaway.** Wipe and re-seed any time — no client data ever lives there.
- **Stripe always test-mode on staging.** No live charges on staging, ever.
- If a hot fix is needed in production (security, broken live path), it goes: `hotfix/branch` → test on staging → fast-merge to main. Never patch production directly.

## Cost
- 2 extra Railway services (~$10–15/mo, sleep when idle)
- 1 extra Supabase project (free tier covers staging easily)
- Total: ~$10–15/mo — cheaper than one client churn event

---

# PART 5 — COMPETITIVE STEAL-NOW (action items extracted from §20/24/25/26/33)
✅ Already taken: command palette, activity feed, shareable dashboards, sequence-branching UI, Meetings-Booked KPI, Mission Control, agent photos, warm palette, AskFigsyButton, benchmark, anomaly alerts, Unibox two-way, demo narration.
⬜ Now (zero/low build): "AI Revenue OS" positioning (Apex) · daily client briefing (Apex, Month 1) · scheduled report emails (S4).
⏸ Later: 3-type memory (10+), configurable agent triggers (20+), multi-model toggle (20+), Kanban deal view (20+), waterfall enrichment (Clay), inbox rotation (Instantly), multichannel single-agent (Reply.io), intent signals (Amplemarket), email warmup infra, pre-send inbox-placement test, personalised images per lead, template/recipe library, MCP server.
📌 NOT stealing: Glean "platform/layer" narrative (we're product-level — would break honest positioning).

---

# PART 5B — COMPETITIVE LANDSCAPE + STRATEGIC POSITION (synthesised 5 Jun)

> Source: deep research run 5 Jun covering Glean, Monday.com, ClickUp, Notion, Linear, Salesforce Agentforce, Intercom Fin, and macro SaaS AI pricing data. youratlas.com added 5 Jun (see §Atlas below).

## What the outside world shipped (May–Jun 2026)

| Company | What they shipped | Strategic signal |
|---|---|---|
| **Glean ($7.2B)** | Enterprise Graph (memory + connectors + personal + org graphs + governance). "Enterprise AI coworker" — proactively manages tasks, runs multiple workstreams, personalises per employee. Agent Development Lifecycle (ADLC) framework. Full MCP adoption. | Context always wins. The agent with the most context beats on quality every time. |
| **Monday.com** | Full relaunch as "AI Work Platform." Native agents any team member can configure — draft campaigns, qualify leads, close support, onboard, process POs, 24/7. Claude + OpenAI + MS365 Copilot via single AI Platform Gateway. | "Agents sit inside a single structured platform with context across the entire business." General-purpose, context-native. |
| **ClickUp** | Acquired Codegen (Cursor competitor). "Super Agents" — autonomous project completion, 500+ work skills, human-level memory that learns from every interaction. 3,000 internal AI agents at 3:1 AI:human ratio. **Laid off 22% of staff.** Million-dollar bands for 100x humans who manage AI systems. | Most aggressive "agents replace headcount" bet. General-purpose. |
| **Notion** | Custom Agents (team-wide bots on schedules + triggers). MCP-native: Linear, HubSpot, Figma, Slack, Attio CRM. "Notion Workers" hosted runtime — agents run sandboxed custom code, no server needed. | Workspace = the agent runtime. MCP is the wiring. |
| **Linear** | Linear Agent: triages new work, assesses it, routes to the right team, Code Intelligence (controlled codebase access). The PM tool becomes the intelligence layer that directs work. | Product intelligence, not just tracking. |
| **Salesforce** | AgentExchange — agent marketplace. "$6 trillion digital labour market." $2/AI conversation (vs $30–50 human agent cost). Agentforce on Slack up 300% since Jan 2026. | Outcome pricing at enterprise scale. Pricing by result, not seat. |
| **Intercom Fin** | $0.99 per fully-resolved support ticket. Zero cost if unresolved. Pure outcome model. Working. | The clearest pricing proof point in the market — outcome pricing is proven and live. |

## Macro numbers (5 Jun 2026)
- 40% of enterprise apps will have task-specific agents by end of 2026 (was <5% in 2025)
- 50%+ of B2B sales teams will be smaller than in 2025
- AI handling 40–60% of initial customer interactions
- Outcome-based pricing: <10% adoption today → projected dominant model by 2027
- Credit wallets + usage-based already standard: 43% of SaaS on hybrid models → 61% projected by year end

## Five strategic reads for K.I.N.D

**1. We launched on the right pricing curve.** Credit wallets, usage-based, per-action — every major player is migrating toward this. We launched there. Outcome pricing (#60) is the right next step — Intercom and Salesforce proved the model. It stays gated until we have margin data, but the direction is confirmed.

**2. The warmth window is narrow — use it now.** Monday/Notion/ClickUp all now talk about "agents as team members." We've had named personalities and a family narrative since Day 1 (Pixar 3D, named by founder's family). That emotional layer is actually a *stronger* narrative than corporate "agent platform" language — but the window where we look differentiated (not just different) is shrinking as everyone humanises their agent UX. Differentiate on warmth *now*, before it becomes table stakes.

**3. MCP is being pulled forward — it's distribution, not just product.** Glean, Notion, Linear, Salesforce are all wiring MCP natively. Item #59 (MCP server — K.I.N.D as AI infrastructure) was Month 3. Given this signal, it moves to Month 2. Being MCP-compatible means other tools' agents (Notion, Linear, Slack) can call K.I.N.D agents without a K.I.N.D sales team. That is free distribution. **MCP is now Month 2, not Month 3.**

**4. Our defensible lane is specialisation, not breadth.** Monday and ClickUp are building general-purpose agent platforms. We're building a specialised revenue team: African market data, POPIA compliance, $20 entry point, named family agents. They cannot replicate the data moat or the compliance posture without years of presence. That specialisation is the lane — hold it, don't try to match their breadth.

**5. The risk is speed, not direction.** K.I.N.D's product direction is correct — the market is validating it in real time. The danger is the window where a small fast team can build what the big players haven't yet shipped into our market. That window is shrinking. DENISE (the "meeting booked → close" seam) is the highest-value next build because it extends the existing FIGSY pipeline — no new front opened, maximum leverage on what's already working.

## MCP pulled forward — updated
Item #59 MCP server moved from Month 3 → Month 2 (alongside pgvector and FIGSY v2). First milestone: K.I.N.D exposes a single MCP endpoint that lets external agents call FIGSY to start a campaign. That's the distribution unlock — no UI required, no sales call needed. A Notion agent or Linear bot can trigger a K.I.N.D campaign by calling one tool. Build after 10+ clients (so there's a pipeline to trigger).

---

## §Atlas — youratlas.com (researched 5 Jun 2026, deep scrape completed)

**What they are:** Done-for-you AI Revenue Engine. Agency model, not SaaS. $5,000+ setup, 7–14-day white-glove build, 90-day performance guarantee ("results or you don't pay" — minimum ad spend required, Atlas selects clients). Target: US appointment-driven service businesses (healthcare, trades, home services, clinics). Legal entity: AQX Global Corp. Founded 2024. ~74 employees. Pre-seed, BDev Ventures. Founder: Omer Jamal (third startup; ex-Scotiabank/TD/CIBC; previously DiscoverData acquired + Fortuna.ai fintech).

**Two agents (product architecture):**
1. **Demand Creation Agent** — launches streaming TV ad campaigns on Disney+, ESPN, Amazon in under 10 minutes. Positions local SMBs as national-scale advertisers without an agency.
2. **Demand Response Agent** — Voice AI answers every inbound call in <30 seconds + iMessage outreach (92% claimed open rate, contacts leads in 3 seconds) + CRM re-engagement of cold lists. GoHighLevel CRM integration documented (v1+v2 API).

**Claimed stats [unverified]:** 92% iMessage open rate vs 35% SMS · 300% more conversions · 10x ROAS · 30% lift in website conversion · saves up to 70% in costs · conversion drops 80% if lead not contacted within 5 minutes · 40% of leads come in nights/weekends. Case studies: law firm recovered $28K in 90 days from written-off leads; plumbing no-shows 28%→6% in 60 days; 4 appts in 7 days, 3 closed at $6K each.

**Public API:** apidocs.youratlas.com — campaigns, call records, bookings, knowledge base (file upload + URL extraction), GoHighLevel enrichment. They are building developer infrastructure alongside the agency service.

**Speed-to-lead simulator:** Interactive ROI calculator — input lead volume/contact rate/deal value → output revenue lost to slow follow-up. Clever top-of-funnel tool that pre-qualifies buyers before they ever book a demo.

**Distribution:** Dan Martell (SaaS Academy, Buy Back Your Time author, 3,000+ business clients). His endorsement is their primary acquisition channel. 10,000+ businesses claimed (some pages say 15,000 — take lower number).

**Where they beat us:** Voice AI (genuine moat for call-heavy services), iMessage channel (novel, high open rate), CTV ads (no-one else doing this for SMBs), done-for-you removes all friction, 90-day guarantee signals confidence, proper API/dev docs.

**Where we beat them:** Price ($29/mo vs $5,000+), self-serve, multi-agent ecosystem with shared memory, Milla, DENISE (coming), full revenue lifecycle vs appointment-booking only, SA+US vs US-only, live in minutes not 14 days.

**Strategic read:** Different buyer (appointment-driven services vs our SMB generalist), different price point, different model (DFY vs SaaS) — not a direct competitor. But their messaging is sharper and their tools (ROI calculator, performance guarantee) are worth stealing. Items #61a–61g capture the steals.

## §Revio — getrevio.com (researched 5 Jun 2026)

**What they are:** AI social selling CRM for Instagram/Facebook-native coaches, consultants, and creators. Scans existing follower base, scores leads by conversion likelihood, auto-sends personalised DMs, and acts as a real-time AI co-pilot suggesting exact replies based on closed-won deal transcripts. Human coaching layer bundled: live group calls + 1:1 onboarding + expert setup. Underlying product: SellByChatCRM (rebranded). LinkedIn ~4,026 followers — early stage. Dan Martell promoted them (same distribution channel as Atlas).

**Pricing:** ~$500/month (third-party source, medium confidence). No public pricing — gated behind "Growth Session" demo call. High-touch, consultative sales model. No self-serve.

**Channels:** Instagram + Facebook. LinkedIn "coming soon."

**ICP:** Solopreneurs and small teams (1–10) in the creator/coach/consultant economy who already have a social following. NOT traditional B2B outbound. NOT South Africa (no SA presence detected).

**Claimed stats [unverified]:** 50% conversion rate increase from chats to close · 30,065 IG leads generated in one month (customer case study) · $60K/month in 7 months (Dan Martell-cited).

**Where they beat us:** Depth of social selling workflow for Instagram-native creators; human coaching layer bundled in; battle-tested reply suggestions from closed deals; tight niche positioning.

**Where we beat them:** Autonomous agents vs co-pilot (human still sends with Revio); cold outbound (FIGSY can find leads without an existing audience); full revenue lifecycle vs DM-to-appointment only; $29/mo vs ~$500/mo; SA market uncontested; broader ICP.

**Watch signal:** LinkedIn integration is on their public roadmap. If they ship cold outbound via LinkedIn + email, they enter FIGSY's territory. Monitor their changelog (product.sellbychatcrm.com/changelog).

**Strategic read:** Indirect competitor — different buyer (creator economy vs SMB), different channel (social DMs vs email/outbound). Real risk is if they add B2B cold outbound. Steal their coaching model and case study specificity (items #62a–62e); ignore the rest for now.

---

# PART 5C — FUNDING STRATEGY (decided 5 Jun 2026)

> Triggered by "how do we get funding like Atlas/Revio?" The honest answer reframed the question.

**The core truth: Atlas and Revio were not funded on their product — they were funded on founder pedigree + influencer distribution.**
- **Atlas** raised pre-seed (BDev Ventures) on Omer Jamal's track record: 3rd-time founder, prior acquisition (DiscoverData), ex-Scotiabank/TD/CIBC. VCs at pre-seed back the *person*, not traction. Dan Martell then gave distribution.
- **Revio** is barely VC-funded; its growth engine is also Dan Martell, not a round.
- **Two levers, neither is the product:** (1) founder reputation, (2) influencer distribution.

**THE DECISION: do not chase funding yet. Bootstrap to traction first.**
Rationale: K.I.N.D is lean, software-only, $29/mo self-serve, near-zero marginal cost. Atlas runs ~74 employees burning hard *pre-revenue* — that only works because they raised; it is the opposite of our model. We can reach ramen-profitability without diluting. Traction is the only thing that gets an *unknown* founder a good term sheet anyway. This matches the standing strategy: "wins + data, then a data-informed decision."

**The tension to resolve — "invisible founder" vs investor reputation:**
Fundraising is reputation-driven; VCs back people they can meet. The "founder stays invisible" decision is **brand/customer-facing only.** You can pitch under your real name in a private investor process while keeping the public brand faceless. The two coexist — but you cannot raise while invisible to *everyone*. Separate the two deliberately.

**Routes, in priority order (when/if we choose to raise):**
| # | Route | Timing | Dilution | Notes |
|---|---|---|---|---|
| F1 | **Cloud + AI credits** (Microsoft for Startups Founders Hub, Google for Startups, AWS Activate) | **NOW — this week** | None | Tens of $K incl. model API spend. Directly extends runway (Anthropic + Railway burn). Zero downside. |
| F2 | **SA ecosystem** (Grindstone/Knife Capital, Startupbootcamp AfriTech, Founders Factory Africa, E Squared, 4Di, Kalon, HAVAÍC, Endeavor SA) | After 5–10 clients | Low / accelerator | Cape Town base is an advantage. Several take little/no equity, open doors. |
| F3 | **YC / remote accelerators** | After paying clients | ~7% standard | CPT + US AI-agents-for-SMBs fits thesis. Apply with traction. |
| F4 | **Revenue-based financing** | Once predictable MRR | None (debt) | Borrow against MRR. Better SaaS fit than VC. |
| F5 | **Influencer lever (the real insight)** | Ongoing — see #61e | None | Both competitors grew on ONE influencer (Dan Martell). Find the SA/US equivalent. Worth more than a seed round for our ICP. |

**Immediate action:** F1 (free credits) this week — zero downside, extends runway. Everything else is gated on client traction. Revisit the raise/bootstrap decision at 20–30 paying clients, from leverage not need.

---

# PART 6 — WILL NOT BUILD / PARKED
⏸ Collaborative docs · whiteboards · self-hosted · custom emoji · internal team chat · multi-year contracts (Never) · 50+ data sources (50+ clients) · African-language (after WhatsApp).
⚠️ **Note:** "LinkedIn automation — never build" is SUPERSEDED — backend is built and activates Week 1. Remove the contradictory "never" lines from MASTER (Part 8).

---

# PART 7 — RECURRING OPS (from §16, §35, §36)
**Daily:** open Admin / + /unibox + /founder brief. TTFL >4h → intervene.
**Before sales call:** create demo env, review demo playbook (11-scene script), bookmark magic link. Pre-demo setup S1–S12 (real signup, onboard, unlock SQL, 10,000 credits, real ICP, Demo Campaign, Milla doc, Vida config, clean browser).
**After every demo:** clear test leads, archive campaign, check credits, note breaks, log objections.
**Weekly (Fri):** KPI check, clients review, roadmap milestones, scalability, HubSpot deals. MRR behind → HubSpot follow-up. Past-due → email.
**Sales SOP (6 phases):** Qualification → Discovery (5 questions) → Demo → Proposal → Payment → Onboarding.

---

# PART 8 — ⚠️ CONTRADICTIONS TO FIX IN MASTER (cleanup backlog)
Found in the full read. None block launch; all should be cleaned so MASTER stops contradicting itself.

1. **Vercel still listed as a host** — §21 decisions table (L3803) literally says "Supabase + Railway + Vercel"; also L1199/1214/1775/3147 + Quick-Reference "NEXT_PUBLIC Stripe vars in Vercel ✅". → Railway only. Self-flagged at L1193–1207, not yet fixed.
2. **Launch day printed 3 ways** — §0 "MON LAUNCH" (correct) vs §19 "Launch Tuesday" (L3471) vs historical "Monday 8 June" (L1708). → Monday.
3. **Vida price $39 vs $29** — canonical $29 (corrected 3 Jun) but $39 still in Stripe product refs (L975/1395/1410), demo script (L7509), §32/§34. → $29.
4. **Pricing tables disagree** — §12 (L3023) shows $20/$38/$88 + $60/$110/$250 vs canonical $1/credit flat. → canonical.
5. **Cron count 16 vs 19** — §17/§0 say 19; bug log (L1488) + §1 say 16 (3 status crons never built). → 16.
6. **DENISE(REEVE)/LENA/OTTO Month 3 vs Year 2** — §0/§19 Month 3; §28/§32/§34 Year 2. → DENISE = #1 next build (pulled forward); LENA/OTTO = Month 3. (All MASTER "REEVE" refs = DENISE.)
7. **LinkedIn "never build" vs built** — backend exists + activates Week 1, but "never build" lines persist (L420/1772/2317/2936/§27). → built/activating.
8. **Duplicate sections** — 24/25/26/27/28 appear twice (draft L3988–4734 vs canonical L4735–6040); §27 means two different things. 5-day-plan printed twice (L2060 + L2354). → delete the draft/duplicate set + one 5-day plan.
9. **Calendly personal link残** — `calendly.com/jacques-vieiraza/30min` still in Quick-Ref (L2341/2588) though scrubbed everywhere else to `kind-ai-demo/new-meeting`. → neutral link (also a name-exposure risk — Part 2 Ring 1).
10. **"Done vs pending" conflicts** — FIGSY_KIND_CLIENT_ID / HubSpot / Calendly / migrations listed both ✅ (L1031) and ⬜ (§2/§10). → reconcile to actual Railway/Supabase state during launch.
11. **Cashflow §14** still lists "Vercel Pro $20" + "Apollo Basic $99" vs corrected (~$125 floor, Apollo $49–65). → corrected.
12. **us.app / separate-stack remnants** in the duplicated 5-day/quick-ref blocks (main copy already fixed). → single URL/DB.
13. **eu-west-1** stale note acknowledged (L419) — ensure no residual. → af-south-1.
14. **Admin cohort analytics / Portal Analytics** — some "Built" entries vs §1 "route does not exist" (never built). → not built.
15. **15-step smoke test** (old) vs 57-step suite (current). → 57-step `docs/SMOKE_TEST.md`.

---

# NUMBERS
| When | Clients | MRR |
|------|---------|-----|
| Launch (Mon) | 0 | £0 |
| Week 2–3 | 2–3 design partners | ~£2,500 |
| Month 1 | 5 (break-even all-in) | ~£4,000 |
| Month 2 | 20 + Product Hunt | ~£12,000 |
| Month 3 | 50 + agent family | ~£40,000 |
| Month 3+ | 100+ + platform intelligence | £100,000+ |
