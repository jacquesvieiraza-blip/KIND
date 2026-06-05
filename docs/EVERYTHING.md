# K.I.N.D — EVERYTHING

> ✅ **THIS IS THE WORKING SOURCE OF TRUTH (updated 5 Jun 2026).** Read this first, update this first. `MASTER.md` is now a historical archive only. Where the two disagree, THIS document wins.
> **Protocol:** at the start of a session read this file; at the end of a session update it and commit.

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
| 21 | Homepage reel is old (FIGSY-only) | ⏳ | swapped embed → platform-video.html (FIGSY/Milla/Vida; no dedicated Denise scene yet) |
| 22 | Company page "doesn't show Denise" (repeated) | ⏳ | code correct (verified GitHub); **website deploy/cache lag** — hard-refresh + check Railway website service |
| 23 | Portal agent-switcher dropdown not discoverable | ✅ | Sidebar: labeled "Switch" strip + "4 agents · switch or unlock →" hint |
| 24 | Denise demo button 400'd (enum missing) | ✅ | demo-request.ts enum + productNames + denise |
| 25 | Vida $39 stale in chatbot page + stripe comment | ✅ | → $29 |
| 26 | DB CHECK rejected figsy_addon/denise_addon | ✅ | migration 011 + schema constraint extended |

### DEEP AUDITS RUN 5 Jun (evidence-based, not memory)
- **Website audit (exhaustive):** 0 broken links/anchors/buttons, all dropdowns 4 agents + working promo blocks, logo correct everywhere, no fabricated aggregate stats, USD throughout. Fixed: figsy trio strip, chatbot+denise footers, .dd-promo CSS on 4 pages.
- **Portal audit (exhaustive):** Denise verified wired end-to-end across 14-step client journey (signup→billing→Stripe→webhook→workspace→API). Logo all `/logo-k.png`. Agent-panel routes all correct. Pricing now consistent. 4 bugs found + fixed (above).

### ⚠️ KNOWN-OPEN (honest)
- **#21 reel** — platform-video.html shows FIGSY/Milla/Vida; **no dedicated Denise animated scene** (text mentions her). Full Denise reel scene = follow-up build (delicate animation).
- **Video reels** demo-video/platform-video contain illustrative reply-rate numbers (8.2%/12.8%) in mockup notifications — founder to decide keep vs remove (no-fake-news judgement).
- **Africa-First positioning** still in Resources playbook + vs-* pages + values — 🔁 founder decision (US/global vs Africa-first vs dual).
- **Deploy/cache:** website is a separate Railway service; it lags the portal. Several "still broken" reports are stale cache, not code. Verify Railway website-service deploy = latest `main`; purge CDN; hard-refresh.

### Still open on FOUNDER (🧍) before launch
1. **Denise go-live:** create Stripe product + $99/mo price → `STRIPE_PRICE_DENISE_MONTHLY` on Railway; **run migration `011_denise.sql`**.
2. **TIER 0 credential rotation** (all keys exposed 4 Jun).
3. **Check Railway website-service deploy** is on latest `main` + purge cache.
4. **Free cloud credits F1** (Microsoft/Google/AWS).
5. **Launch checklist** — DNS, dogfood account, Calendly, ICO, SR01, smoke tests ×2, LinkedIn lockdown → Monday.

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
| 1 | Rotate exposed credentials — TIER 0 (full list in Part 2 / Ring 3) | 🧍 | ⬜ FIRST |
| 2 | Move `FEATURE_PORTAL_V2=true` API → Portal service | 🧍 | ⬜ |
| 3 | Create dogfood account → ping Claude | 🧍 | ⬜ |
| 4 | Grant FIGSY + credits, set `FIGSY_KIND_CLIENT_ID` + `booking_url` | 🤖 | ⬜ (on #3) |
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
| 15 | **Sat** smoke test 1 (57-step suite, `docs/SMOKE_TEST.md`) → log `T#-Step#` | 🧍 | ⬜ |
| 16 | **Sun** smoke test 2 → confirm fixes | 🧍 | ⬜ |
| 17 | Fix smoke failures same-day | 🤖 | ⬜ |
| 17b | **Raw outcome-event capture — append-only log (THE DATA FLOOR).** ✅ DONE — `outcome_events` table + `logOutcomeEvent()` (append-only, fire-and-forget). Coverage: send · reply · opt_out · meeting_booked (FIGSY flow + calendar /book). | 🤖 | ✅ |
| 18 | **MON — LAUNCH both markets, multiple campaigns** | 🤝 | ⬜ |

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
