# 🎯 K.I.N.D — FORWARD ROADMAP + RISK REGISTER (future detail ONLY)

> 🗓️ **28 Jun note:** content below is future-detail and still accurate in shape; a **hygiene trim of this doc is PARKED** (founder decision 26 Jun — low priority vs the daily docs). Current truth always lives in PRODUCT-INVENTORY / LAUNCH-PAD. The 26 Jun yellow/red audit + 190 fix are logged in KIND-MASTER, not here.

> **AUTHORITY (operating system — see root `CLAUDE.md`):** future detail only — roadmap rationale, risks, learning engine, GTM, steals, moat. **No current build statuses or daily execution here.** For current status → `PRODUCT-INVENTORY.md`; for current execution → `LAUNCH-PAD.md`; for strategy → `KIND-MASTER.md`.

> **🧭 Four-doc contract:** **V2-TRACKER** *(this doc)* = future roadmap, risks, rationale, steals — **no live status** · **LAUNCH-PAD** = daily execution · **PRODUCT-INVENTORY** = status (one dot, one owner) · **KIND-MASTER** = strategy + session log. **Conflict rule:** future truth = here; status = PRODUCT-INVENTORY; daily = LAUNCH-PAD; strategy = KIND-MASTER. No fifth core doc.
> 1. **[`KIND-MASTER.md`](./KIND-MASTER.md)** — strategy + decisions + session log *(product LAUNCHED 18 Jun)*
> 2. **[`PRODUCT-INVENTORY.md`](./PRODUCT-INVENTORY.md)** — **THE status list: every item on the 5-state colour system — 🟢 live+verified · 🩷 live, not yet walked · 🟣 approved+locked · 🟡 built, pending review · 🔴 not built, with owner (see the colour dashboard at the top of that doc).** If you want to know what exists and what's left — go there, not here.
> 3. **This file** — the FUTURE detail behind the inventory's 🔴 items: risk register · learning-engine blueprint · GTM/content plan · steals catalog. **No build statuses live here anymore.**
>
> **📅 THE PLAN (locked 12 Jun · ✅ both ships DONE):** ① ✅ Mon 15 — Company Command Centre + payments → production · ② ✅ **LAUNCHED 18 Jun** · ③ **NOW = post-launch:** seller engine (196–204) · the Company-Engine completion · warmup (198) · everything else here.

_Last updated: 25 Jun 2026 (POST-LAUNCH — product live since 18 Jun) — **25 Jun: 🌍 TWO-TRACK GTM decided (US/EMEA via our own outreach · Africa via partners) → new "🌍 MARKET STRATEGY" section below (evidence · risks · Instantly/Smartlead tool-fit VERIFIED · aggregator→coverage mapping); supersedes "Africa-first, US deferred." Item 243 aggregator research → BetterContact. Our US/UK outreach pack drafted (`content/our-outreach-us-uk.md`).** · **24 Jun: Partner Portal v2 DEMO shipped (#712) + Alex agent · steal 227 logged (#715) · THE ENGINE 211 Phase 1 DONE — Smartlead key live + connectivity verified (read-only, admin-gated). Next = Phase 2 (SendingProvider seam, previewed).** · **THE ENGINE (item 211) is the strategic centre: integrate Smartlead (primary) + Instantly (backup/own outreach); full spec in the "⚙️ THE ENGINE" section below.** The 12-Jun "Mon 15 / Fri 19" plan is done → dated history. · Prior — 22 Jun — **DELIVERABILITY reframed: it's REPUTATION, not content.** 194 reopened (real Gmail → Promotions/Spam despite mail-tester 10/10); #623 hardened cold content (pixel/footer off cold sends); the real fix is a **warmup tool ~1–2 wks → new item 198 (founder action MON 22).** Also logged: 197 partner-programme unify (rate later LOCKED 20%+5%, 19 Jun). · Prior — 17 Jun 2026 — **launch = Fri 19; Thu 18 = Go/No-Go (likely GO).** Today: 186/187/188 shipped · the metrics saga closed (193/194/195 — real opens + Analytics fixed; root cause was a missing `opened_at` migration) · mail-tester 10/10 · *(NOTE 23 Jun: an earlier line here claimed a `kind-ops` company-ops repo was "built" — FALSE; no such repo exists. The company-ops/SOP layer → **Notion**, item 204, not yet set up.)* · item 196 (HMRC-grade sales ledger) logged · KIND-MASTER history split into `KIND-MASTER-ARCHIVE.md` · a colour status-dashboard added to PRODUCT-INVENTORY. The 🔴 roadmap below is unchanged in shape. · Prior: 14 Jun — **this doc lives on `main`** (consolidated off the held `claude/kind-carson-MYhSl` branch so the trackers travel with the live code). **14 Jun website work shipped to `main` (live, Cloudflare):** The Drop revamped to a Monday-style show/podcast layout · main-page polish · Demo removed from top nav site-wide → "Live Demo" in Resources (inventory items 93 · 118). Portal/agents untouched — still post-19. · _Prior (13 Jun, on `MYhSl`):_ aligned to the inventory's 4-state colour system; invoicing decision locked (USD · no VAT until benchmark · Stripe-issued). **113a agent-panel rule BUILT** (FIGSY/Milla/Vida/Denise conversational + acts-in-place via `liveChatEndpoint`; endpoints `/milla/chat` `/denise/chat` `/casey/chat` + existing `/vida/help`). **Casey wired live on `/v2/setup`.** **"AI Family" cards BUILT** (#125). New planned website items: 162 Prompt Library · 163 Product Videos hero._

**Owner:** 🧍 founder · 🤖 Claude · 🤝 both

---

# ░ WHAT'S BUILT — MOVED ░
> **🚨 15 Jun — THE WHOLE PRODUCT IS LIVE.** #502 (merged via #564) was a superset of its dev branch — it shipped the Company Engine + design screens 80–91 + **all 20 R-wave features R1–R20** to prod. **PRs #506–#525 are redundant → close, don't merge.** 3 owed prod migrations: R2 `daily_brief_enabled` · R15 `figsy_knowledge` · R20 `job_changed_at`. **Active focus = the FEATURE-VERIFICATION WALK** (LAUNCH-PAD §13) — confirm every live feature works with real data **by THU 18 (founder away Fri 19)**; anything broken drops 🟢→🔴 and gets fixed same-day. **MON 15 closed out:** Company Engine + R1–R20 live · 3 R-train migrations run · Hunter+PDL keys set · 21 redundant PRs closed · Denise $39 · terms docs uploaded.
> The full Wave 1/2/Tier-3 release tables + Company Engine + shell/staging status live ONLY in **[`PRODUCT-INVENTORY.md`](./PRODUCT-INVENTORY.md)**.
> Staging environment details (URLs, login, review protocol): **[`STAGING-REVIEW.md`](./archive/STAGING-REVIEW.md)**.

---

# ░ BUILD & LAUNCH PLAN (official — re-locked 12 Jun) ░
**Ship rule for every item:** build on branch → `next build` verify → founder reviews → **founder says "go live"** → merge to `main` → smoke test. **Nothing reaches the live client site until the founder says go live.**

**🏢 PHASE 0a — COMPANY ENGINE + PAYMENTS → PRODUCTION, MON 15 JUN (re-ordered 12 Jun — the ONLY early ship):** Command Centre · seats/budgets · request→approve · invites · winning plays · Stripe pool billing. Prod flag exposes `company` only; remaining engine pieces (routing 38 · calendars 41 · manager role · offboarding) follow post-19.

**▶️ PHASE 0b — LAUNCH (Fri 19):** the proven live core loop (signup→ICP→leads→FIGSY→reply→meeting). No other new builds — D9 + legal + smoke tests + Go/No-Go Thu 18 → launch Africa-only.

**🎨 PHASE 2 — V2 EXPERIENCE (post-19, on the engine — includes the entire built-and-waiting staging queue, inventory §2B), in order:** 1 Vida bubble · 2 Casey onboarding→Conversational setup · 3 Milla Notetaker · 4 Strong dashboards · 5 Integrations Hub · 6 Sequence Builder · 7 Smart Inbox (fixes "inbox isn't right") · 8 Lead-capture Forms.

> **🎨 Design-review locks (12–13 Jun) — build to these previews:** Sequence Builder → `previews/sequence-builder-v2.html` (brand recolor) · Inbox → `previews/inbox-v2.html` (Gmail-style) · Agent cards → `previews/agents-v2.html` ("AI Family") · Client invoicing → `previews/invoice-v1.html` + `invoices-list.html` (#34a — 🔒 **USD · no VAT until benchmark · Stripe-issued, we only display**). **📅 Tue 16 — agent side-panel (113a): PROTOTYPE APPROVED 13 Jun** (`previews/agent-panel-conversational.html`) — every screen shows the right agent in the right rail, **conversational like FIGSY**, input **renders in-place + takes action** (no navigate-away). Scope = **all 5 agents: FIGSY, Milla, Vida, Denise, Casey**; Denise + Casey each need a chat endpoint, Casey needs wiring into the panel picker. Full verdict ledger: `PRODUCT-INVENTORY.md` → DESIGN-REVIEW LEDGER.

**🧠 PHASE 3 — INTELLIGENCE/MOAT (Month 2+):** MCP server · Memory v2 · ICP-that-learns · benchmarks · the 15 Pieces.

**Order logic:** launch the proven loop first → company engine (biggest money + per-rep foundation) → experience layer on it → intelligence.

---

# ░ ⚙️ THE ENGINE — the deliverability / sending architecture (item 211 · researched + decided 23 Jun) ░
> **THE foundation of the product (RULEBOOK §12).** Without warmed, inbox-landing email: **SMB dead · mid-market can't scale · enterprise won't touch us.** The AI is the differentiator; the ENGINE is what it stands on. **Status of record: PRODUCT-INVENTORY item 211.** Build spec lives here.

## ✅ Decision: INTEGRATE Smartlead (do NOT build the infra)
Researched 23 Jun (sourced). The whole funded AI-SDR market (Apollo, Outreach, Artisan, 11x) **integrates** the sending-infra layer — building it (domain provisioning, SPF/DKIM/DMARC at scale, a credible warmup network, IP rotation, reputation monitoring) is a multi-year product in itself. **Don't rebuild the hardest wheel.**
- **Smartlead = primary** — the one platform doing BOTH our modes via one API + white-label.
- **Instantly = fallback** — strong API V2 + unlimited warmup, but **NO white-label** (can't brand for SMB clients) + less programmatic provisioning.
- **Alta** (competitor) = **connect-your-own-mailbox** ("a Rep" = the client's own identity) — confirms the big-account model. *(Inferred; their help-centre blocks crawlers.)*

## The two operational models (segmented by ACV — mirrors the data strategy §13/§14)
- **A — MANAGED (SMB, low ACV):** K.I.N.D drives Smartlead **SmartSenders** → provisions + auto-warms mailboxes/domains per client (~$4–9/mailbox/mo, DNS auto-set, live 24–48h). **Bundled + marked up. Zero client setup.** *(Same spine as bundled PDL+Hunter for SMB.)*
- **B — CONNECT-YOUR-OWN (mid-market/enterprise, high ACV):** attach the client's own Google/Outlook/SMTP via `POST /email-accounts/save`. **They bring infra + BYO Apollo key.** *(Same spine as BYO-Apollo for company/partner.)*
- **FIGSY's AI sits on top of both.** Per-client isolation via white-label `client_id` (~$29/mo/client).

## 🚫 Non-negotiable deliverability rules (baked into the build)
- **1 dedicated sending domain per client — NEVER shared** (>0.30% complaint rate poisons everyone on the pool).
- **Never cold from the primary domain** — separate sending domains/subdomains so a spam wave can't burn the main brand.
- **Per-client warmup mandatory:** 3–6 wks new domain · 2–3 wks new mailbox · keep running forever at ~2:1 warmup:cold.
- **Volume math:** ~30–50 sends/mailbox/day · ~2–3 inboxes/domain · 350/day ≈ ~10 inboxes · 700/day ≈ ~20 (~$5/mailbox/mo).

## Smartlead spec (verified)
- REST API `server.smartlead.ai/api/v1` (key auth). `POST /email-accounts/save` = create/connect SMTP/IMAP/OAuth account; warmup configurable per account; campaigns/leads/analytics API-driven. **SmartSenders** = DFY pre-warmed mailboxes (auto MX/SPF/DKIM/DMARC). White-label add-on **~$29/mo/client workspace** + `client_id` scoping. API on **Pro ~$94/mo**; unlimited inboxes + warmup.

## 🏗️ BUILD PLAN (phases — start 7pm, via PREVIEW)
1. **Spike/eval** — Smartlead API (Pro) + white-label; verify BOTH modes on staging (provision a SmartSender mailbox + connect a test Google mailbox; toggle warmup).
2. **`SendingProvider` interface** — thin, swappable abstraction in the API: `provisionMailbox` · `connectMailbox` · `enableWarmup` · `send` · per-client (`client_id`) scoping.
3. **Wire FIGSY's cold send** through the provider — replace/augment the Resend-shared cold path with per-client warmed, isolated sending.
4. **Onboarding fork** (ties items 174–176): SMB → managed (provision) · company/partner → connect-your-own.
5. **Reply capture** — route replies via Smartlead inbound → reconcile with the product unibox (item 112).
6. **Deliverability monitoring** — per-client placement · complaint rate · warmup status, surfaced in admin.

## 🧍 Open decisions (founder)
- Confirm **Smartlead** as primary (vs Instantly fallback).
- **Markup model** for SMB managed mailboxes.
- **Migration** of existing Resend clients → the engine.

---

# ░ 🌍 MARKET STRATEGY — TWO-TRACK GTM (decided 25 Jun · founder) ░
> **The frame for ALL go-to-market.** Strategy of record → KIND-MASTER; this is the future-detail + market evidence behind it. Triggered by the 25 Jun data research (item 243 aggregator study + US/EMEA market scan).

## The decision
**Match the GTM motion to how each market actually buys:**
- **🌍 US / UK / EMEA → OUR OWN OUTREACH (direct, product-led).** Data-rich + deliverability-driven + automatable → our FIGSY engine produces pipeline here. We *dogfood* — "we used FIGSY to land you" is the demo. **This is the fast-cash track.**
- **🌍 AFRICA → DIRECT (data-powered) + PARTNERS *(sharpened 25 Jun — NOT partners-only)*.** **Two routes:** (1) **direct** — stack ALL data sources in a waterfall (item 243) to build enough African coverage to run our OWN outbound there; (2) **partners** — relationship-led, cover what data can't reach + price-sensitive/relationship buyers. **Data is the Africa-direct unlock; partners are the residual + the moat.** *(244: African data is real, not empty — 1,360 SA founders on PDL alone — just thinner, so direct goes as far as data reaches.)*

## Why this is right (the evidence, 25 Jun)
**The prize is in US/EMEA.** AI-SDR market ≈ **$5.8B (2026) → $17.6B (2030), ~32% CAGR**; North America ≈ **39% of global** (US = 84% of NA). EMEA is a deep second pool (Cognism ~200M contacts, lemlist 450M+).
**Cold B2B outreach is legal where we'd send:** US (CAN-SPAM, opt-out) · **UK** (PECR corporate-subscriber exemption — friendliest) · **Ireland · France · Netherlands** (GDPR legitimate interest). ⚠️ **Germany (UWG §7) + Poland = strict/consent** → not first targets. **→ Lead with US · UK · IE · FR · NL.**
**Deliverability is THE moat — and it's what we already bet on (211).** Google/Yahoo Feb-2024 rules (spam <0.3%, DKIM+SPF+DMARC) → warmed inboxes ~91% inbox-placement vs ~68% unwarmed; *"only one platform treats deliverability as core infrastructure."* The whole market's #1 pain is our chosen foundation.
**Africa = channel country.** Research: reseller/partner channels are *"particularly well suited to the African business landscape"* — local trust, lower CAC, partners fill the localization gap. 85% of African enterprises increasing digital spend; SaaS +25%/yr. Maps 1:1 onto our 20%/5% partner model (items 200/213–226/233).

## 🔌 Tool fit — are Instantly + Smartlead OK with this? (founder Q, 25 Jun)
**Yes — the two-track plan fits them BETTER than Africa-first did; both are US/EMEA-native cold-email platforms.** Keep the split clear:
- **Instantly = OUR own outreach (198) to win clients.** Built *for* cold B2B outreach (unlike HubSpot, which bans it), with its own warmup network + mailbox provisioning on US-friendly domains. Pointing it at US/UK/EMEA plays to its strengths. Constraint is **compliance discipline** (DMARC/SPF/DKIM + one-click unsubscribe + spam <0.3%), not geography.
- **Smartlead = the CLIENT-facing engine (211).** Purpose-built for our exact model: **one master account → unlimited isolated client sub-accounts** (own mailboxes/campaigns/reporting) + **white-label add-on (~$100–200/mo)** = per-client domain isolation so Client A's complaints never poison Client B. Geography-agnostic for sending; DATA coverage isn't its job (that's our 243 layer).
- **✅ VERIFIED 25 Jun (read their actual policy pages — RULEBOOK §1.0):**
  - **Smartlead** — cold/legitimate outreach is the product's *intended use* (Fair Use Policy: legitimate use "will not cause breach"); prohibits spamming / mailbox-for-spam / warmup abuse; compliance handled at infra level (built-in unsubscribe + global block lists + **SmartServers isolated sending**). **White-label reseller is a sanctioned PAID feature** (~$29/client, isolated infra) = our exact model. ✅ No client-mixing *if* we keep 1 domain/client (the isolation is built-in; we must configure it). *(Sources: smartlead.ai/fair-use-policy · /new-terms-and-conditions · /customized-white-labelling.)*
  - **Instantly** — built *for* cold outreach (vs HubSpot which bans it). **Hard rules we must bake in (Instantly Sending Policy):** domains **≥1 month old** with public WHOIS → legal pages · accurate From/To/Reply-To · **≤30 sends/inbox/day post-warmup** · **spam <0.3% · hard-bounce <2% · inbox >80–85%** · comply with each recipient country's law (CAN-SPAM US; GDPR legit-interest UK/IE/FR/NL; careful DE/PL). Violations → rate-limit or suspension. *(Source: instantly.ai/instantly-sending-policy.)*
  - **Net:** both are fine with the two-track plan; the binding constraints are **operational discipline** (auth, ≤30/inbox/day, verify lists for low bounce, 1 domain/client, per-country compliance), not capability. **Open (commercial, not blocking):** confirm white-label per-client cost at our scale on a Smartlead thread.

## ⚠️ The risks (be honest)
1. **AI-SDR backlash / bubble** — 50–70% churn, open rates ~18%, "AI spam" fatigue, ≥1 vendor predicted to shut/pivot by Sept 2026. **Winning approach = human-in-the-loop + deep personalization, NOT volume.** Our "honest, quality-not-volume" brand (the blog) is the antidote — we must *walk* it.
2. **We have NO data edge in US/EMEA** — incumbents (Apollo 275M, ZoomInfo, Cognism) own data there. **Our wedge = engine (deliverability-first infra) + vertical AI brain + brand + price + dogfood proof.** Don't compete head-to-head on data or features.
3. **Deliverability is now do-or-die** — the crackdown means we torch ourselves if we outreach before the domain is warm (198) + engine solid. **Sequence is locked: warm → sell.**
4. **Focus dilution** — two motions on a small team. Mitigant: partners are self-running once recruited (front-load recruit, then low-touch); our outreach is the continuous motion.

## How the data layer (item 243) FEEDS each track — coverage answer
The aggregators (Clay / BetterContact / FullEnrich) are **enrichment, not discovery** — they lift email/phone fill-rate on leads we already found; they don't find net-new leads.
- **US/EMEA = coverage SOLVED.** Aggregator (BetterContact rec) **+ Apollo (BYOK) + Cognism (EMEA) + PDL** = near-complete coverage → **our outreach machine has all the fuel it needs.** This is the "match Alta's 50+ sources" move — done with ONE integration. **Coverage is NOT the blocker for the direct track.**
- **Africa = real but ~52× thinner.** ⚙️ **MEASURED 25 Jun (item-244 live test, same ICP — Founder/CEO/Owner, 11–50):** PDL has **1,360 South African** vs **71,123 US** matching people. So SA discovery is **NOT empty** (real cos: SimplePay, Puzzl, etc.) — just ~52× smaller. Enough to *seed* partner-led selling; too thin to feed a high-volume automated machine the way the US can. **Confirms the two-track split with real numbers** (Africa→partners on volume + buying culture; US→our direct machine on depth).
- **The real gap is EMAIL REVEAL, not discovery — and it's universal.** On the free PDL *search* tier, both SA and US return the person but **gate the email** (`work_email` comes back as a boolean presence flag). So the actual address needs an **enrichment step** (PDL Enrichment — 100 free credits / Hunter / BetterContact), everywhere — *not* an Africa problem. This sharpens item 243: the data layer's job is **email-reveal/enrichment**, since discovery (PDL) already works. *(Known bug to fix in the 243 build: `waterfallEnrich` currently treats PDL's boolean `work_email` as a real email instead of falling through to Hunter.)*
- **→ 243 build implication:** the router runs **PDL Full (sourcing) + Hunter (reveal)** across both tracks; Cognism/aggregator widening is future. Apollo is retired from the data path. (Detail: `APOLLO-ENGINE.md §3A`.)

## What it changes in the roadmap
- **211 (engine) + 198 (warmup)** rise from "foundation" to **"the unlock for the big market"** — the entry ticket, not optional.
- **Our own outbound machine = the fast-cash track:** US/UK ICP + lead lists (243 + Apollo/Cognism) · US/EMEA FIGSY sequences (242/212) · the offer/demo (129) · dogfood (132) → built DURING the warmup window so we fire the day the domain's warm.
- **Africa partner recruiting (233 + PARTNER GTM below)** = **email + brand-led (stealth — NO founder identity/LinkedIn)**: source an African agency DB (243) → email the pitch via the warmed domain (198).
- **Content/ICP need US + EMEA variants** — the blog + FIGSY copy are Africa-flavoured today.
- **Park behind first revenue:** the heavy parallel builds (120 memory · 144 Denise-deep · 141 MCP · 145 churn · 157/158) — not on the path to first cash.

*Sources (25 Jun web research): MarketsandMarkets + Fortune Business Insights (AI-SDR market size) · Overloop + litemail (cold-email legality by country) · MarTech (Google/Yahoo bulk-sender rules) · CustomerThink + Digital Applied (AI-SDR backlash) · Landbase (2026 GTM wedge) · UnifyGTM (deliverability moat) · Limio (African reseller channel) · Knowlee (EMEA data providers).*

## ⏸ PARKED — Qualified competitor analysis (Manus, 25 Jun)
A competitor teardown of **Qualified.com** (enterprise, Salesforce-native, *inbound* AI SDR "Piper") + a 9-epic borrow/build roadmap + Claude Code handoff. Built **outside-in from public pages only** (no access to our code/strategy). **Founder decision (25 Jun): PARKED — focus our own product first; revisit later.** Full analysis lives in **Google Drive** (`KIND_vs_Qualified_Analysis_and_Claude_Code_Handoff.docx` + `kind_qualified_claude_code_handoff.zip`), not imported (its `backlog.json`/`ROADMAP.md` structure would clash with our four-doc system).
- **Why parked:** it's an **inbound/enterprise** program — opposite of our outbound-first, sell-fast, two-track plan. Most of it isn't on the path to first revenue. It even gets our family wrong (Tony in, Casey out).
- **It really maps to ONE agent — Vida** (our inbound web/WhatsApp agent). Treat the whole doc as **Vida's future inbound spec**, to revisit once outbound is driving traffic.
- **3 cheap wins to mine when we revisit:** fix website timing inconsistency (10min/24h/5d) · a "K.I.N.D vs Qualified" comparison page · start capturing real proof as clients land (ties our credibility rule).
- **Useful as-is:** independent outside-in confirmation that (a) our positioning is distinct, (b) our proof gap is visible even externally.

---

# ░ 🤝 THE SELLER ENGINE — Partners + AEs on ONE foundation (V2 SPEC · logged 18 Jun) ░
> **Founder thesis (18 Jun):** a **partner** and an **Account Executive (AE)** are the *same primitive* — a **seller** who refers, manages, and earns on clients **staying alive**. Build the foundation **once**, branch only on **paid vs free**. This is the channel/sales engine that sits on top of the live Company Engine (#88). **Status lives in PRODUCT-INVENTORY: 196 (ledger) · 197 (partner model) · 200 (the portals/foundation) · 201 (hire founding AE) · 202 (the document/legal pack) · 203 (THE BUILD).** Detail (the "why/how") lives here. **Gated post-launch — do not build before first revenue.**
> **Phase 1 of 203 — commission-engine module** *(status of record: PRODUCT-INVENTORY item 203):* the **pure commission-engine module** (`apps/api/src/lib/comp-engine.ts`) — the single home for "20/5/5" (Land 20% · Retain 5% · Expand 5%; AE base + 60/40 + ramp guarantee 100/100/75/75; partner 20%+5% no base) — merged (#666), **USD**, **33 vitest tests passing**, **not yet wired** to Stripe/DB/portals. Next phases (founder-gated, need the **203 repo + auth/hosting** decision): Stripe webhooks → attribution → engine → admin P&L portal → partner portal → AE portal → founder-approved payouts.

## 1. The primitive: one "seller seat", two types
| | **Partner** | **AE (Account Executive)** |
|---|---|---|
| Relationship | External channel (refers + white-labels) | Employed (internal closer) |
| Pays for the tool? | **YES** — pays for their own seat/use | **NO** — free seat (employed sales kit) |
| Earns | 20% acquisition + **5% on renewal** (item 197) | 20% land / 5% retain / 5% expansion + 5% multi-seat + 5% partner override (AE comp plan, `docs/hiring/`) |
| Both | refer · manage a book · **earn on retention** · get a portal + demo envs + sell-through-the-product | (same) |

**One seat model, one `seat_type` flag (`partner_paid` | `ae_free`).** Everything else is shared. This is the whole architecture insight — don't build two systems that drift.

## 2. Three surfaces on the one foundation
1. **Partner portal** — onboard → refer → manage book → see earnings/statements.
2. **AE portal** — same shape, free seat, comp dashboard tied to the AE plan + quota/attainment.
3. **Admin (for both)** — one internal console to onboard / approve / manage / pay every seller, partner or AE.

## 3. What every seller gets (shared capabilities)
- **Portal**: profile · **their documents** (agreements, comp plan, collateral) · **their book** (clients they own) · pipeline · **earnings + payout statements** · referral link/codes.
- **Demo environment(s)**: provision a seeded demo per seller to run **live demos** while selling (re-uses the 188 demo-seed engine).
- **Sell *through* the product (dogfood)**: the seller gets ICP → FIGSY → outreach access to **source their own pipeline** with K.I.N.D itself. (Free for AEs; for partners this is part of what they pay for.)
- **Enablement**: onboarding pack · scripts · collateral · training.

## 4. The money — same spine, on purpose
- **Partner (197):** 20% acquisition (one-time) **+ 5% retention (recurring)** → rewards *keeping clients alive*.
- **AE (comp plan):** dollar new-MRR quota (ramped) · 20% land / 5% retain / 5% expansion on **collected** MRR · +5% multi-seat kicker · +5% partner override · greater-of guarantee 100/100/75/75 (month-1 onboarding-gated) · accelerators (1.25× / 1.5×) · **earned-when-collected** · windfall review. Tool: `docs/hiring/KIND-AE-commission-calculator.html`.
- **Both** are retention-weighted → the seller wins when the client stays. **Earned-when-collected** makes month-to-month MRR safe (no clawback drama).

## 5. The document & legal layer (item 202 — needed BEFORE issuing seats)
- **AE pack:** employment offer · **compensation agreement** (the comp plan as a signable, localized schedule — base/variable/quota filled per market) · NDA · IP / invention assignment · the calculator as the modeling tool.
- **Partner pack:** **partner agreement** (commission terms · white-label / territory terms) · NDA · referral + payout terms · data-processing terms.
- **Shared:** commission schedule · payout cadence · **earned-when-collected / no-clawback clause** · refund/chargeback handling · acceptable-use.
- **Onboarding doc pack** per seller type (what they sign, in what order).
- *(Lives in `docs/hiring/` + a partner equivalent; status tracked as inventory 202. NOT a canonical tracker.)*

## 6. Payout & reconciliation
- Earnings computed from **collected** MRR → **reconcile to the sales ledger (196)** → accounting platform.
- Statements render in each portal; admin approves/exports payouts.

## 7. Build phases (sequence — post-launch, gated on first clients)
1. **Model & docs lock (no code):** finalize 197 partner model + the AE plan + **draft all agreements (202)** + reset the calculator default quota (~$480/mo founding AE).
2. **Discovery & schema:** audit today's partner portal + admin (what's incoherent); design the **shared seller seat** (`partner_paid` | `ae_free`), data model, and the payout/commission engine.
3. **Admin first:** one console to onboard / approve / manage / pay both seller types.
4. **Partner portal rebuild:** coherent flow (onboard → refer → manage → earn → statements) + **demo provisioning** + **sell-through-product** access.
5. **AE portal:** same foundation, free seat, comp dashboard tied to the plan (quota · attainment · accelerators · earnings).
6. **Payout reconciliation** to the 196 ledger + accounting.
7. **Enablement:** collateral · scripts · training, per seller type.

## 8. Dependencies / gates
- Needs **196** (sales ledger) for real payouts · **197** model locked · **202** agreements drafted before any seat is issued.
- Re-uses: **188** demo-seed (for demo envs) · the **Company Engine #88** seat/budget machinery (a seller seat is a cousin of a rep seat) · **partners.ts** (existing referral/commission code).
- **Gated post-launch** — first warm the domain (198) and land clients; then stand up the seller engine. Don't build before revenue.

---

# ░ 🤝 PARTNER GTM — recruiting 10 partners (logged 23 Jun) ░
> **Future-detail home for partner recruitment. Execution → LAUNCH-PAD; status → PRODUCT-INVENTORY (197/200).** Goal: **10 activated agency partners in year 1** (~1/mo). At ~10 clients/partner/mo that's the unicorn lever — ~100 clients without ~1,000 cold prospects (*"1 agency partner ≈ 10 clients/month, fastest lever, nearly free"*). **Founder-led + warm → runnable NOW, before the cold domain warms.**

**Partner ICP:** agencies/operators who already own SMB trust + want recurring income without building product — marketing/lead-gen/web/digital agencies · consultants · BPOs · vertical specialists (trade playbooks = their wedge) — across SA → NG → KE → GH.
**The pitch:** *"Add a recurring revenue line, zero build. Sell our AI sales team to the SMB clients you already have — 20% upfront + 5% every month they stay. We give you the demo, dashboard, playbooks — and you can use our tool to find clients."*
**Channels (ranked) — ⚠️ STEALTH-CONSTRAINED (25 Jun): NO founder LinkedIn / no public founder identity (employer would issue notice on a leak).** ① **dogfood email** — source an African agency DB (243 engine) → FIGSY emails the pitch via the warmed domain (faceless brand) · ② Demmy + warm referrals (private intros only) · ③ inbound (PARTNER-BRIEF page + monthly demo) · ④ communities (brand, not founder). *(Founder-led LinkedIn removed — reinstate only if/when the founder can go public.)*
**Funnel:** target agency → demo (portal + forecaster + product) → sign agreement → onboard (sandbox + certify) → **first client landed.** Count *activated* partners, not signups.
**Plan to 10:** now build recruiting assets (portal preview + income forecaster + pitch) + land 2–3 from Demmy/warm; wks 2–6 founder outbound to ~50 agencies (dogfood list) → ~1/mo. **10 good agencies > 30 dormant referrers.**

# ░ 🎨 PARTNER PORTAL v2 — the spec (logged 23 Jun · status = item 200 + 213–226) ░
> **Build via PREVIEW (§11). Status → PRODUCT-INVENTORY.** The partner side is **substantially built** (`partners.ts` · `dashboard/partner` · admin · `005_partners.sql` · `comp-engine.ts` 20%+5%). v2 makes it amazing + recruiting-grade.
**⚠️ Honest data gap (item 220):** `partner_commissions` stores a flat `amount_zar`, **no type**, and **no per-client MRR** — so a split + book-value hero **can't be a frontend skin, they'd be fake (the 136a trap).** Backend step first: commission `type` + per-client MRR + ZAR→USD.
**Slices:** Slice 0 backend (**220**) → Slice 1 split/hero/book (**221/222/223**) → forecaster (**213**) + sell-through (**226**) → trust/docs (**224/225**).
**Think-bigger (the unicorn layer):** source-through-product (**214**) · client-health + churn-save (**215**) · AI assistant (**216**) · white-label/teams (**217**) · academy/cert (**218**) · CRM-lite/notifications (**219**).
**Preview approach:** first *visual* preview uses a **clearly-labelled demo partner** (real numbers need Slice 0); demo data is labelled, never presented as live.
**v2 DEMO portal (#712 · status of record: PRODUCT-INVENTORY item 200):** the full v2 DEMO portal at `/partner-preview` — 5 tabs (Overview · Pipeline · Sell&Grow · Documents · Assistant). Assistant agent = **Alex** (non-family channel agent, item 216) as a right-rail panel + co-pilot workspace. All labelled demo data. **Next = item 220** (commission `type` + per-client MRR + USD) → the Overview tab reads the partner's *real* numbers.

---

# ░ 🚨 RISK & FIX REGISTER (full-system audit · 10 Jun) ░
**From the all-systems audit (client portal · admin · website · API · docs). Red = act this week · Yellow = scheduled. Owner: 🧍 = founder must do · 🤖 = Claude fixes (branch → founder "go live").**

## 🔴 RED — this week (launch-critical)
| # | Item | Owner |
|---|------|-------|
| R1 | ✅ **DONE 11 Jun** — rotated the 2 crown-jewel keys (Stripe secret · Supabase service-role, both api+admin confirmed working). 4-Jun exposure neutralised; also kills any stale secret in the dead Vercel projects (Y16). | 🧍 |
| R2 | **ICO registration** — ico.org.uk, £40/yr (~10 min; penalty £400–4k) | 🧍 |
| R3 | **D9 deliverability 10/10** (mail-tester before launch) | 🧍 |
| R4 | ✅ **DONE** — DNC/Knowledge honest preview: coming-soon banner, all 7 broken saves disabled, employer-name placeholder rows cleared. _(no Smartsheet refs remain in app code)_ | 🤖 |
| R5 | ✅ **DONE** — website demo stats now labelled "Illustrative example" + every comparative claim dropped (2.7×/4×/vs-3%/+34%); blog claim fixed earlier. Branch-only (Cloudflare deploy gated on "go live"). | 🤖 |
| **R11** | **🔴 Company Engine RLS + Access Control — FAST-FOLLOW** (inventory 55a) — owner ONLY accesses command centre + all-reps data; reps see ONLY own data (leads, campaigns, calendar); reps cannot view other reps or command centre. Reps get low-credit alerts and can REQUEST top-up (owner approves/denies). **Founder's call 15 Jun: Company Engine ships LIVE Mon 15 without this; RLS added soon after — NOT a launch blocker.** Interim: owner gates rep access manually until RLS lands. Design + build RLS policies (Supabase row-level security) + ownership flags + UI visibility toggles + credit-request approval workflow. | 🤖 design · 🧍 review |
| R6 | **Apollo ToS / single-source dependence** — ⚠️ **CORRECTED 10 Jun: no "50-client" rule (that was invented). Reselling off one account violates ToS from client #1; enforcement discretionary.** Fix = structural: **(a) API Reseller agreement (`partners@apollo.io`) [primary]** or **(b) client-brings-own-key**. Multi-source (PDL ✅ wired, dormant) cuts vendor risk but isn't the compliance fix. Full detail in `KIND-MASTER.md` → MULTI-SOURCE DATA PLAN. | 🧍 |
| R7 | **💳 BILLING (14-Jun snapshot — SUPERSEDED 8 Jul).** ⚠️ This entry's "one lead = one charge = one wallet / double-charge is a fault" framing is REVERSED by the locked model: **$1 reveal + $3 work = $4 across TWO wallets is the intended per-qualified-lead product**, not a double-charge bug (see #420). The price-table reconciliation (166–173) shipped 🩷. Kept as dated history. | 🤝 |

## 🟡 YELLOW — scheduled (post-launch / quick wins)
| # | Item | Owner |
|---|------|-------|
| Y1 | ✅ **DONE** — rate-limited signup(10/min)·demo-request·subscribe(5/min)·unsubscribe(100/min, generous for compliance). _(OTP/demo-login has no K.I.N.D API endpoint — verified browser-side vs Supabase Auth.)_ | 🤖 |
| Y2 | ✅ **DONE** — FIGSY per-enrollment credit deduction now checked + sequential (balance then ledger; can't desync). | 🤖 |
| Y3 | ✅ **DONE** — counter increments replaced by `recomputeCampaignCounters()` (recompute-from-source, persist Math.max, error-checked) across all reply/opt-out/meeting + calendar paths. **+ data-integrity pass:** both autopilot crons (auto-pause `check-performance`, send-throttle `adaptive-send-check`) now recompute-then-decide → fixes the latent "drift to 0 wrongly pauses a healthy campaign" bug; persisting also heals reporting readers (admin aggregates, lookalike, figsy-tasks). | 🤖 |
| Y4 | ✅ **DONE** — Pending Review + In FIGSY pills now count real totals from `/leads/stats`. | 🤖 |
| Y5 | ✅ **DONE** — both directions: campaign→leads (`campaign_id` filter + banner + "View enrolled leads"), lead→campaign back-link, ICP→leads (already worked). | 🤖 |
| Y6 | ⏸ **DEFERRED post-launch** (founder call) — needs a DB table + migration; same bucket as the Knowledge backend. Settings prefs stay localStorage-only until then. | 🤖 |
| Y7 | ✅ **DONE** — Denise page gates on `denise`/`denise_addon` subscription (locked "Add to plan" screen). | 🤖 |
| Y8 | ✅ **DONE** — developer page MCP catalog now matches real `/mcp` tools (figsy_find_leads · figsy_get_campaign_stats · figsy_suggest_campaign · milla_ask). | 🤖 |
| Y9 | ✅ **DONE** — roadmap is now **admin-only**: client `/dashboard/roadmap` redirects to dashboard; all client nav/command-palette/CTA links removed. (Founder: clients must not see the roadmap.) | 🤖 |
| Y10 | ✅ **DONE** — Milla dead "Connect" buttons → disabled "Coming soon". | 🤖 |
| Y11 | ✅ **DONE** — Meetings card "No data yet" subtitle only shows when value is 0. | 🤖 |
| Y15 | ⏸ **POST-LAUNCH** (founder call, 10 Jun) — integration tests on the money/credit paths (credit deduction · ledger · KPIs); week-1 post-launch. Launch stays on `next build` + manual smoke tests. | 🤖 |
| Y12 | Failover standby drift — Render standby env parity unverified + `NEXT_PUBLIC_ADMIN_KEY` delete-vs-keep doc contradiction | 🧍🤖 |
| Y13 | D&O insurance (~£500–1k) · trademarks (UK IPO → ARIPO) — Month-2 legal ring | 🧍 |
| Y14 | Demo seeds write to prod DB (fine pre-launch) → separate staging/demo DB in Batch 2 | 🤖 |
| Y16 | ⏸ **NEXT WEEK (founder call 11 Jun) — kill the dead Vercel↔GitHub integration.** Vercel stopped being used ~1mo ago but `kind-portal` + `kind-admin` Vercel projects are STILL linked to the repo + building on every PR (not in repo code — dashboard-side). **Risk: stale secrets** possibly in the projects' env vars (esp. admin's `SUPABASE_SERVICE_ROLE_KEY`) — **today's key rotation neutralizes that.** Live site unaffected (domains → Railway). Steps: Vercel → delete/disconnect both projects · GitHub → repo Settings → GitHub Apps → Vercel → remove repo · confirm DNS → Railway. | 🧍 |

## 🌐 DATA-SOURCE STRATEGY (logged 10 Jun — the Apollo-risk mitigation)
> 📍 **Live status + step tracker lives in `KIND-MASTER.md` → "DATA SOURCES — MULTI-SOURCE PLAN".** This section is the background research/rationale.

**Finding:** Alta has **no public Apollo agreement** — their sub-processors (AWS/Twilio/Postmark/Slack) list no data vendor; they blend **50+ smaller/signal sources** (BuiltWith, SimilarWeb, StoreLeads, Crunchbase). Their answer to single-provider risk = diversification.
**Our path (in order):**
1. **Light up the already-built waterfall (#42)** — add **PDL** key (built-for-resale, solves the ToS problem) + **Hunter** key (~$49/mo): days of work, makes us 2–3-source. → post-launch quick win 🤖+🧍(keys)
2. **PDL Full is the primary discovery source** behind `searchPeopleWithFallback` (Apollo retired from the data path; Hunter for reveal; later Cognism w/ explicit reseller programme, ~$15–25k/yr, post-revenue).
3. **Signal sources** (website scans · LinkedIn CSV import · Crunchbase-style signals) — widen coverage with zero ToS exposure.
4. **Manus** — African-SMB deep-research fallback (the potential moat; async, needs dedup+verification). Post-launch.
**Posture goal: PDL Full + Hunter is the live stack; multi-source waterfall (Cognism/etc) is future, post-revenue.**

> **🆕 15 Jun — ACV-SEGMENTED DATA + ONBOARDING DECISION (full detail: `run-costs-and-cashflow.md` §13/§14).** Resolved how the data model meets onboarding: **bundle data for self-serve SMB** (friction kills conversion; data is only ~2% of cost) · **BYO-Apollo key for company/partner** accounts (low-friction at high ACV, de-risks scale, fixes ToS) — but **optional, not mandatory** until Apollo's reply forces it. Onboarding routes on **seats, not headcount** (1 = self-serve / 2+ = concierge), reads firmographics off the signup domain (PDL), and runs a **14-day company trial on bundled data before any implementation ask**. New inventory build items: **174** firmographics read · **175** seat-routing · **176** 14-day trial · **177** white-glove implementation. Also locked 15 Jun: **flat pricing** (Lead Gen $20/40/100 · FIGSY $60/120/300, $1/$3 flat — item 168 reconciles Stripe+portal to these).

---

# ░ PART 1 — CURRENT BUILD STATUS → MOVED TO THE INVENTORY ░
> Cosmetic fixes, shipped V2 screens, the Company Engine build state, and design-match gaps are all
> tracked in **[`PRODUCT-INVENTORY.md`](./PRODUCT-INVENTORY.md)** with 🟢/🟡/🔴 + owner. Open feedback items
> (e.g. agent-card crop #5, the Alta-style inbox rebuild) live there too (items 112, 125).
> The #88 model/positioning rationale (augment-not-replace · hybrid pricing · the four flows · the
> ★ winning-play library) remains below in Part 2 where it informs future slices.

# ░ PART 2 — FULL ROADMAP (101 items, by horizon) ░

## 🔴 NOW · PRE-LAUNCH (by Fri 19 Jun) → tracked in the inventory + master
> Launch-week items (smoke tests · D9 · legal pack · Go/No-Go · the Mon-15 company-engine ship) are
> tracked live in **`PRODUCT-INVENTORY.md` §2A + §3A** and `KIND-MASTER.md`. Not duplicated here.

## 📍 WEEK 1 (Jun 19–28) — 10 items
| # | What | Owner |
|---|------|-------|
| #19 | 10 warm outreach messages (network seed) | 🧍 |
| #20 | LinkedIn content 1/day | 🧍 |
| #21 | LinkedIn outreach activation (PhantomBuster) | 🧍 |
| #22 | Meta/WhatsApp API application (3–7d approval) | 🧍 |
| #23 | Record real product demo (16:9 + 9:16, Pixar family) | 🧍 |
| #24 | Replace homepage hero w/ real product loop | 🤖 ⏸ |
| #25 | Instrument GTM funnel (CAC, trial→paid) | 🤝 |
| #26 | Dogfood self-outreach + competitor ICP | 🧍 |
| #27 | Daily client briefing email | 🤖 |
| #28 | Pre-launch fresh-signup check | 🧍 |

## 📍 WEEKS 2–4 (Jun 29 – Jul 19) — 17 items
| # | What | Owner |
|---|------|-------|
| #29 | 2 design-partner slots (case study + logo) | 🧍 |
| #30 | Cut 9:16 social content | 🤖 |
| #31 | Record 3 onboarding Looms | 🧍 |
| #32 | Onboarding v2 + day-0/3/7 email | 🤖 |
| #33 | Populate proof block w/ real data | 🤖 |
| #34 | Activate Flutterwave (ZAR/NGN/KES/GHS) | 🧍 ⏸ |
| #34a | **Client invoicing — surface Stripe receipts in-portal.** 🔒 **DECISION LOCKED 13 Jun: USD billing · NO VAT until a financial benchmark · Stripe issues the receipt, we only pull & display it** (until the benchmark Stripe shows no VAT line; when we register, Stripe adds VAT automatically — no code change our side). **We build** an *Invoices* surface under **Company → Documents** pulling the client's Stripe invoices via API and listing date/number/amount (USD)/status + Download-PDF (Stripe hosted PDF). `previews/invoice-v1.html` = PDF/branding target; `previews/invoices-list.html` = in-portal list. *(inventory 136a)* | 🤖 |
| #35 | Launch YouTube channel | 🧍 |
| #36 | Wire playbook email form (Zoho) | 🤖 |
| #61a | Performance-guarantee clause (90-day) | 🤖 |
| #61e | Influencer/community distribution | 🧍 |
| #61g | Guarantee sharpened to 90d | 🤖 |
| #62b | "Revenue Playbook Session" onboarding call | 🤖 |
| #62c | Homepage outcome numbers (real data) | 🤖 ⏸ |
| #80 | **Speed-to-lead: Vida → instant FIGSY/Denise handoff** | 🤖 |
| #81 | Milestone share-to-LinkedIn cards | 🤖 |
| #82 | "Certified K.I.N.D Partner" badge + LinkedIn share | 🤖 |

## 🧠 AGENT TRAINING & INTELLIGENCE — THE LEARNING ENGINE (strategy · logged 10 Jun)
*The blueprint for turning the outcome data into a compounding advantage. Post-launch (P3 Intelligence/Moat). Upgrades #38/#40/#46 below into one system. **Launching IS step zero — you can't train on data you don't have yet.***

### Two honest truths (read first)
1. **"Training" ≠ fine-tuning.** For an LLM-agent product, outcomes come from the layers *around* the model — context, feedback loops, memory, measurement — not retraining weights. Fine-tuning is the LAST lever, not the first.
2. **For cold outreach, the model is ~¼ of the result.** The outcome stack is **targeting (right person) > deliverability (inbox) > timing > copy.** Don't pour all "AI training" energy into copy while targeting/list quality lag — keep the proportion honest.

### PHASE 1 — Foundations (the ROI ladder, cheapest + biggest first)
| Rung | What | Effort | ROI |
|---|------|--------|-----|
| ① **Context / RAG** ← start here | The **Train-FIGSY knowledge base** (UI exists, backend doesn't — built honest this session). Per client: value props · **proof points** (real numbers) · pain points · ICP language · do-not-say rules · **2–3 of the client's own best emails as few-shot** (the single biggest copy lever; Alta's "train-agent" field set). | Med | **Highest near-term** |
| ② **Outcome feedback loop** | Mine `outcome_events` (data floor #17b, built) for which subjects/angles/segments produce replies+meetings → feed winners back into the prompt, down-weight losers. "Training" by selection, not gradient descent — it compounds. | Med | Very high (the moat) |
| ③ **Evals / measurement** | No eval harness today (same gap as "no tests"). Build: reply-rate per variant · classification accuracy on real labelled replies · meeting-conversion by ICP. **Unlocks ①②** — without it every "improvement" is a guess. | Low–Med | Foundational |
| ④ **Memory** | #46 Memory v2 (pgvector) — FIGSY recalls *this client's* winning patterns across campaigns. Builds on ①②. | Med–High | High |
| ⑤ **Model routing** | Haiku for bulk drafting (correct); route the *reasoning-heavy* tasks (reply classification · ICP suggest · Denise proposals) to Sonnet/Opus. + prompt caching for cost. | Low | Real quality bump |
| ⑥ **Fine-tuning / distillation** | LAST. Only with a narrow repeatable task + **thousands of labelled examples** + a cost/latency reason. Not now — would be premature scaling of the AI stack. **Parked.** | — | Later |

### PHASE 2 — The Learning Engine (reinforcement learning, in practice)
**The unlock: the reward signal already exists** — every `outcome_events` row is a reward. You don't build the reward function, you already collect it:

| Event | Reward | Logged? |
|---|---|---|
| Opened | +0.1 *(weak — Goodhart risk)* | ✅ |
| Reply | +1 | ✅ |
| Hot/positive reply | +3 | ✅ |
| Meeting booked | +10 | ✅ |
| Deal closed | +50 | ✅ |
| Opt-out / spam / bounce | −2 / −5 / −1 | ✅ |

**2a — practical RL, no model training (ship first): contextual bandits.** It IS reinforcement learning, just without backprop.
- **Arms:** subject style · opening angle · send time/day · cadence · CTA type · ICP segment. (#38 A/B → upgrade to a bandit.)
- **Explore/exploit:** keep trying variants but shift volume toward winners automatically (**Thompson sampling** — handles small samples, vital early).
- **"Contextual" = the moat:** context = the lead's features (industry · seniority · **country** · size) → FIGSY learns *"fintech founders in Nigeria → angle X + short lowercase subject + Tue 9am wins."* A learned **policy** on **African data no competitor has.**

**Recall — the memory layer (two tiers):**
- **Per-client:** retrieve this client's past winning emails at generation time (in-context) → #46 pgvector.
- **Cross-segment (the moat — handle carefully):** anonymized, **aggregated** winning patterns across all clients per ICP segment → new clients inherit collective learning day one. **POPIA / data-isolation: aggregate patterns ONLY, never raw cross-client leakage.**

**Usage patterns — the *other* reward stream (about the product, not the emails):** which agents/features clients actually use (deepen vs cut) · which ICPs/queries they build (data-source + market priorities) · **activation + retention curves (the >85% 6-mo retention that killed 11x — the business's reward function).**

**2b → 2c — where real model training finally earns it:** 2b = reward model + offline policy evaluation (learn the policy properly). 2c = **10k+ labelled outcomes → DPO/RLHF to distill the winning-email policy into the generator** + distill Opus-grade classification into a cheap fast model. Reached by *running campaigns first.*

### The moat: the African outcome-data flywheel
More campaigns → more **African** B2B outcome data (Apollo/11x/Alta all optimise on US data) → better targeting+copy+timing *for African markets* → better outcomes → more clients. No US competitor can build it — they're not in the market. **The advantage isn't a smarter model; it's proprietary outcome data in markets the giants ignore.**

### Caveats that break naïve RL systems
1. **Goodhart** — optimize the deepest reliable signal (**replies/meetings, not opens**), or the bandit learns clickbait that craters replies.
2. **Sample size** — sparse cold-email data; lean on Bayesian/Thompson priors so 1 lucky reply doesn't "win."
3. **Deliverability confound** — a "winner" may just be a warmer domain that hour; control for it or you learn noise.
4. **Feedback delay** — meetings land days later; attribute rewards back to the earlier choices.

### Shape of the engine
```
outcome_events (rewards) ──► reward attribution ──► contextual bandit (policy)
        ▲                                                      │
        │                                              memory/recall (pgvector)
   every campaign                                              │
        │                                          FIGSY generation (few-shot winners)
        └──────────────── better outcomes ◄────────────────────┘
                     (compounds, African-specific)
```

### Build order (post-launch) & roadmap integration
**① Train-FIGSY knowledge backend → ③ evals → ② feedback loop → 2a bandit → ④ recall/Memory → ⑤ routing → (2c fine-tuning, much later).**
Upgrades existing items: **#38** A/B → contextual bandit · **#40** ICP auto-refine → reward-driven · **#46** Memory v2 → recall · **#37** intent · **#45** adaptive volume. None blocks the 19th.

---

## 📍 MONTH 2 (Late Jul–Aug · GATED 10+ clients) — 38 items
**Prereq: staging env. — already starting (this session).**

**Intelligence layer (#37–53, #59):**
| # | What |
|---|------|
| #37 | Intent signal detection |
| #38 | A/B subject testing |
| #39 | Client morning-brief email |
| #40 | ICP auto-refinement (L2 learning) |
| #41 | Conditional sequence branching |
| #42 | Waterfall enrichment (PDL/Hunter/Clearbit) ⏸ |
| #43 | Deliverability dashboard |
| #44 | Email spam-score pre-send |
| #45 | Adaptive send volume |
| #46 | **FIGSY Memory v2 (pgvector)** — our moat |
| #47 | Milla full-context CRM pull |
| #51 | Configurable agent triggers |
| #52 | Multi-model toggle per campaign |
| #53 | Inbox rotation / multiple sending domains |
| #59 | **MCP server** (distribution unlock) — **[Glean MCP Gateway demo 10 Jun] KEY INSIGHT: a context-backed MCP server beat bare off-the-shelf MCP 2.5× on quality + 30% fewer tokens → build #59 backed by CLIENT CONTEXT (Train-FIGSY knowledge · #46 Memory · outcome data), NOT thin API wrappers (those are commodity anyone clones; context = the moat). Per-tool entitlements + per-user/per-tool usage dashboard = our #88 owner controls (2b which-rep-gets-which-agent · 2c/2d usage dashboard = the "usage patterns" reward stream). Auth: API-key (Bearer) fine for SMB now; OAuth 2.1+PKCE is the enterprise upgrade. SKIP: MDM/SSO/50k-user rollout (Year-2 enterprise only).** |
| #49 | Product Hunt launch · #50 G2 listing |

**V2 portal redesign (the rest, on the per-rep foundation):**
| # | What | Where it stands (status of record → PRODUCT-INVENTORY) |
|---|------|--------|
| V2-3 | Conversational setup (chat w/ Casey) — **SPEC'D by Glean Auto Mode demo (10 Jun): client describes goal in a couple sentences → AI assistant configures the whole agent (ICP+sequences+knowledge+triggers), no forms. The activation unlock for Africa-SMB. Highest-value V2 build.** | started — `/v2/setup` runs a **live Casey chat** (`/casey/chat`, 13 Jun); the auto-config (ICP+sequences+knowledge from the conversation) is the remaining build, gated on founder voice/tone (item 121) |
| V2-8 | **AI Notetaker → action items (Milla)** | built → see PRODUCT-INVENTORY §2B — `/dashboard/notetaker` |
| V2-10 | **Casey** onboarding agent | backend ready — `/casey/chat` endpoint (`casey.ts`) + live panel on `/v2/setup` (13 Jun); persona/voice + full onboarding flow gated on founder input |
| V2-11 | **Vida help bubble (bottom-right)** | built → see PRODUCT-INVENTORY §2B — R3 `layout.tsx` |
| V2-12 | Strong client dashboards + Goals | Goals built on staging — R10 |
| #83 | Embeddable lead-capture Forms | 🟡 built → see PRODUCT-INVENTORY §2B — R12 |
| #84 | **Integrations Hub** (HubSpot/Pipedrive/Cal/WA/LinkedIn) | 🟡 built → see PRODUCT-INVENTORY §2B — `/dashboard/integrations` R24 |
| #89 | **Sequence Builder** (visual branching tree, multi-channel) | 🟡 built → see PRODUCT-INVENTORY §2B — `/dashboard/figsy/sequence-builder` R23 |
| — | Multi-channel Smart Inbox (= "inbox isn't right") | 🟡 built → see PRODUCT-INVENTORY §2B — R7 Unibox |

**Pulled into the #88 per-rep sprint (~Fri 26):** V2-7 invite · V2-9 Teams Hub (`/dashboard/team` R21 🔨) · V2-13 multi-provider calendar.

## 📍 MONTH 3 (Aug–Sep · GATED margin data) — 17 items
| # | What |
|---|------|
| #54 | **DENISE deep build** (auto-book · call-join notetaker · objections · proposal-from-transcript · Vapi voice #48) |
| #55 | **LENA — Customer Success** (retention/renewals/upsell) |
| #56 | **TONY — Operations** (pipeline hygiene, back-office) |
| #57 | Multi-agent orchestration (shared memory) |
| #58 | 500+ FIGSY skill library |
| #60 | Outcome pricing (per meeting) — gated ≥28% margin |
| #61 | Mobile app (iOS+Android) ⏸ |
| #62 | Built-in CRM (Kanban deal view) ⏸ |
| #63 | Pan-African design partners |
| #69 | Proposal + e-sign (Denise) |
| #70 | Meeting notetaker (Zoom transcribe) |

## 📍 YEAR 2 (2027 · Enterprise) — 9 items
| # | What |
|---|------|
| #64 | Platform cross-client intelligence (L4 benchmarks) |
| #65 | Data licensing marketplace |
| #66 | ICP auto-refine advanced (L3) · #67 Pipeline forecasting · #68 In-portal messaging |
| #71–#74 | ISO 27001 · ISO 42001 · SOC 2 · Vanta triple-cert |
| #75 | 3-type memory model · #76 Visitor de-anon · #77 Churn scoring · #78 Revenue forecasting · #79 Call intelligence |

## 🔒 ONGOING / PARALLEL
Legal (D&O, ODPC/NDPR, AI Risk Register, pen test, trademarks, VAT) · Funding (cloud credits→YC→revenue financing) · Tech-debt (delete Portal-V2, admin RLS refactor) · Master.md cleanup (15 contradictions) · Competitive watch (Revio).

## 🚀 GTM & CONTENT ENGINE — MARKETING INTENTIONS (logged 11 Jun — founder: "outreach alone won't cut it")
**The North-Star truth (founder, 11 Jun): cold outreach is necessary but NOT sufficient. Win = a 3-legged GTM.** This section = the clear intentions for the marketing conversation.

**The 3 legs:**
| Leg | What | State |
|---|---|---|
| **1 · Outbound** | FIGSY dogfood (cold email sells K.I.N.D) | running (warmup) |
| **2 · Content / Inbound** | **video · product drops · brand LinkedIn (anonymous handle) · blog** | **the missing leg — the focus** |
| **3 · Partners** | the Demmy model (1 good partner ≈ 10 clients/mo) | started · research = highest-leverage for Africa |

**Why content isn't optional:** when FIGSY's cold email lands, the prospect **googles K.I.N.D** — if they find videos + drops + an active brand presence + a credible brand → trust → reply; if nothing → ignored. **Content de-risks every cold email.** African B2B is **trust-driven** (research-verified) → content builds trust at scale + generates **inbound** so we're not hostage to cold volume (which the warmup cap limits anyway). Cold email resets each send; **content compounds.**

**The content engine — built vs the work:**
- ✅ **Infra built (🤖):** The Drop page (**now with a video slot per drop** — Drop 01 = 60-sec walkthrough) · Product Videos / "Watch" page (YouTube-embed-ready) · blog pages · the drops-cadence system.
- 🔴 **The content itself (🧍 founder-produced, published faceless under the brand):**
  - **VIDEO** — brand-voice walkthroughs (voiceover + screen, no face) + **one short video per drop** + demo clips. Highest-trust format; **Africa is video/mobile-first.**
  - **Brand LinkedIn / build-in-public (anonymous brand handle)** — cheapest, highest-trust channel for early-stage (Apex/Atlas steal). Post the drops, the African-first journey, the wins.
  - **Blog/SEO** (pages exist — keep publishing) · **YouTube channel #35** (10-video plan exists).

**The realistic minimum (don't over-scope — solo founder):** a weekly rhythm —
1. **Per product drop →** 60-sec walkthrough VIDEO + "we shipped X" LinkedIn post + email to list (one shipping moment = 3 content pieces).
2. **Brand building-in-public** on LinkedIn (anonymous handle — story · wins · journey).
That + outbound + partners = the motion.

**Product Drops = the flywheel** (velocity-as-marketing): ship fast → drop (page + video + post + email) → clients re-engage + prospects see momentum → "they ship fast AND show it" = the moat made visible. Cadence: **monthly**, never empty/stale. The in-product "What's New" feed (clients see momentum inside the portal = anti-churn) is a logged future enhancement.

**Positioning to carry through all content:** Africa-first · **augment-not-replace** (give every rep their own AI, not "fire the team") · POPIA/compliance moat · velocity moat · low per-seat price vs $500+/mo US tools · **"level up your whole team to your top performer."**

### 🎬 VIDEO ACTION PLAN (sharpened 11 Jun late — content based on the inventory)
**Principle: `the-drop.html` is BUILT and embed-ready; ⚠️ `product-videos.html` ("Watch") is **NOT in the repo** (audit 2 Jul — file doesn't exist; status of record = inventory #93 🟣 "Watch held"). The bottleneck is RECORDING, all 🧍. Record → upload to YouTube → paste the video ID → live. The PRODUCT-INVENTORY (Part A 53 live features + Part B0 release train) is the shot list: every shipped feature is video material; every merged release feeds a Drop with its own video.**

| # | Video | Source material (inventory) | Where it lands | When |
|---|-------|------------------------------|----------------|------|
| 1 | **Drop 01 walkthrough (60s)** — the launch drop | The live core loop: signup→ICP→leads→FIGSY→reply→meeting | `the-drop.html` Drop 01 slot + LinkedIn + email | record this week → live with launch 19 Jun |
| 2 | Onboarding demos (3 × ~60s Looms) | T1 signup flow · ICP builder · first campaign | `product-videos.html` + onboarding emails (#31) | this week |
| 3 | **Homepage hero loop (90s, silent)** | Same footage as #1, cut for autoplay | `index.html` hero (#24, currently ⏸ on this) | week 1 post-launch |
| 4 | FIGSY full demo (12–15 min) | FIGSY pages + campaign flow + Unibox | YouTube video 4 (plan in `youtube-plan.md`) + "Watch" page | week 1–2 |
| 5 | Per-drop walkthroughs (60s each, ongoing) | Each merged release wave = one Drop = one video — e.g. "Drop 02: Teams Hub + Notetaker + Sequence Builder" once founder approves/merges the staged releases | The Drop + LinkedIn + email | monthly cadence, never empty |
| 6 | Founder story + masterclasses | YouTube plan videos 7/9/10 | YouTube + "Watch" | weeks 2–4 |

**The flywheel restated:** staged releases (now previewable) → founder approves → merge wave = **Drop N** → 60-sec video + LinkedIn post + email = 3 content pieces per shipping moment. The release train IS the content calendar.

## ✨ MARKETING SITE — "THE DROP" + SITE IA (approved 10 Jun · PR #503 · post-launch)
- **"The Drop"** (`apps/website/the-drop.html`, built + founder-approved · **+ video slot per drop added 11 Jun** — Drop 01 = a 60-sec walkthrough, embed-ready) — a product-drop archive (Glean-style stacked cards) = **the honest replacement for the client-facing roadmap we hid (Y9)**: it celebrates what *shipped* (past-tense, real, live), not what's promised. **Each drop pairs a short video + feature cards** (video = the trust multiplier). **Cadence rule: never publish empty or stale** — launch it WITH the 19th as **"Drop 01"**, then a new drop ~monthly (it's a forcing function for the post-19th velocity). It's the public proof of the "velocity = moat" call + a recurring re-engagement touchpoint.
- **"Watch" / Product Videos** — ⚠️ **corrected 2 Jul (audit): `apps/website/product-videos.html` does NOT exist in the repo** (earlier "built + approved" claim was drift; status of record = inventory **#93 🟣 "Watch held"**). The intent stands: replaces the plain Demo link, built for the **founder's personal YouTube walkthroughs** (authentic "real run-throughs", YouTube-embed-ready) — but the page must be (re)built before anything can land on it. Authenticity > polish for the Africa-SMB trust market.
- **Lean footer** — keep it tight (4 honest columns + legal strip); every link = a real page. Do NOT copy Glean's enterprise sprawl. Existing site footer is already lean — grow it as we grow.
- **HELD (post-launch wiring step):** site-wide nav/footer rewire across ~40 pages — Demo→"Watch", add "The Drop". On PR #503, applied when founder says wire-it-in. Pages are orphan/unlinked until then (safe — can't surface).

---

# ░ PART 2C — FUTURE RELEASES (the 15 Pieces) + STEALS CATALOG + MCP ░
**Source: `docs/art-of-possible.md` (future-vision/inspiration log).** Gate: most are post-20-clients. ⚠️ that doc's old agent roster (REEVE/OTTO) is superseded → now Denise/Tony/Lena.

## The 15 Pieces (post-loop-proven build list)
| # | Piece | Effort | Trigger |
|---|-------|--------|---------|
| 1 | Multiple pipeline views — **Kanban** · score heatmap · timeline | 2–3d · 1d · 2d | post-20 clients |
| 2 | **Command palette (Cmd+K)** — "New ICP / Pause FIGSY / Hot leads" | 1–3d | any |
| 3 | Real-time activity feed (Supabase LISTEN/NOTIFY) | 3d | 10+ clients |
| 4 | Notification centre (bell + badge) | 3d | any |
| 5 | **Status bar** (sidebar bottom, live pulse) — "build first, near-zero effort" | 4h | now |
| 6 | Custom fields on leads (jsonb) | 4–5d | on request |
| 7 | **Visual automation builder** (React Flow, triggers/actions/conditions) | 2–3wk | 50+ clients |
| 8 | The ICP that learns itself (replies → "narrow your ICP?") | 2d | 3mo data |
| 9 | Personalised images in emails *(Lemlist)* | 2d | Phase 3 |
| 10 | Sequence template library by ICP *(Lemlist)* | 3d | Phase 2 |
| 11 | Voice-first morning brief (TTS) | 1d | after text brief |
| 12 | Network-effect benchmarks ("you're top 15%") | 2d | 20+ clients |
| 13 | White-label / agency channel | 1wk | first agency asks |
| 14 | **MCP server** — K.I.N.D as AI infra (search_leads/run_icp/enroll_lead/get_figsy_stats… map to existing API). Anthropic directory listing = distribution. New developer pricing tier. | 3–5d | 20+ clients |
| 15 | Mobile app (PWA first, then native) | 2d | w/ notifications |
| + | **Revenue Mission Control** (V2 vision: 3-col live ops centre — FIGSY · Pipeline · Intelligence) | — | V2 |

## 🥷 THE STEALS CATALOG (who we learn from → what we take)
| Source | What we steal |
|--------|---------------|
| **Alta** | Touch-Points tree + action library · template gallery · per-agent "Train" tabs · Performance dashboard + Prospect-Status funnel · Unibox reply-tags + "Help me reply" · saved-views + Reps column + "Suggest Campaigns" |
| **ClickUp** | Command palette · multiple views (Kanban/timeline/heatmap) · activity feed · status bar · 500+ skill library (#58) · Goals (KPI targets) · Forms (#83) · Integrations Hub (#84) |
| **Lemlist** | Personalised images · visual sequence builder (#89) · template library by ICP · **community play** (own "B2B outreach in Africa" content — start now, free) |
| **Monday** | Share-to-LinkedIn growth loop (#81/#82) · dense dashboards (V2-12) · Pixar-3D agent warmth (window closing — ship demo fast) |
| **Atlas** | Speed-to-lead 5-min handoff (#80) · 90-day performance guarantee (#61a/g) · influencer distribution (#61e) |
| **Instantly** | Domain warming · auto-pause low performers · adaptive send volume (#45) · inbox rotation (#53) |
| **Clay** | Waterfall enrichment (#42) · ICP-as-filter-layers |
| **Apollo** | Job-change alerts · sequence analytics · AI transparency ("why FIGSY wrote this") · intent signals |
| **Apex** | "Acts, doesn't just respond" framing · approval-mode→autonomy onboarding · digital-twin angle (Milla = AI Chief of Staff) · founder-as-demo on LinkedIn |
| **Glean** | Context/memory moat (#46 pgvector · #47 CRM pull · V2-8 notetaker) · cross-client benchmarks (#64) · **[demo 10 Jun — `youtu.be/ybyAZUJZsmM`] agent-per-workflow-step, dogfooded across the whole sales lifecycle** → (1) **research-driven personalization**: per-prospect research (web+internal mashup) BEFORE FIGSY drafts — copy upgrade, plugs into Train-FIGSY RAG + Manus; (2) **Call-Coaching agent** (score a rep's call recording vs criteria → next-call guidance) = the augment thesis as a feature → **new agent candidate for the per-rep engine #88**; (3) **CRM-auto-update-from-transcript** (tool-calling fills fields) → extends Milla Notetaker V2-8 + #47. **Skip:** legal-redline agent (enterprise, SMBs don't redline). Steal the workflow-decomposition logic, NOT the enterprise surface (Pipedrive≠Salesforce, Zoom≠Gong). · **[Auto Mode demo 10 Jun] → (4) AI-ASSISTED AGENT SETUP — describe goal in plain language → AI builds the agent (→ Casey V2-3/V2-10, the highest-value V2 build); (5) "Workflow vs Auto" = control-vs-flexibility product principle for our autonomy modes (autopilot vs gated copilot); (6) PERMISSION-SAFETY checked at create AND run, per-user data scoping → the guardrail to bake into #88 per-rep + the cross-segment recall moat (aggregate only, no raw leakage). VALIDATES (already built, don't rebuild): "watch it think" = our Thinking panel · approval-before-acting = our gated send queue · conversation starters = our agent-panel chips.** |
| **Revio** | Bundled coaching onboarding (#62b) · case-study specificity (#62c–e) |
| **Notion** (3.2, Jan-26) | **Branching-logic forms → item 205** · **template-gallery UX → 206** · **multi-currency admin rollups → 207** · agents (FIGSY/family 2/96/144 + 113a) · workers/API-sync+webhooks (203/83) · 2-way calendar (41) · per-page permissions (55a/200) · synced blocks/people-directory (56/88) · mail-to-pages (112). *(Researched 19 Jun.)* |
| **Hypo / Amplitude** (internal prospecting agent the founder uses; v3.5, Jun-26) | **Recency-weighted "hot user" ranking — activity *spiking* in last 30d, not static score → item 208** · **champion-experimentation signal** (engaged AND trying the AI/advanced surface → 208) · **prospecting play-artifact + progress tracker** (strategy + named targets + cadence + tick-through tracker → item 209) · **account org-threading** (one hot contact → the buying committee → 209). *Critique logged: ranking logic + org-map confidence must be transparent, and the spike must flow into the opener copy.* |
| **Amplemarket / MailerLite / Salesforce / Notion-Linear** | Intent signals (#37) · spam-score pre-send (#44) · AgentExchange marketplace (V2-5) + outcome pricing (#60) · MCP-native (#59) + slim sidebar (V2-6) |
| **Feature-comparison gap analysis (Jun-26 · Monday/ClickUp/Glean/Alta)** | **Already tracked / built (code-verified 16 Jun):** LinkedIn outreach (127) · voice/calling (96/144/178) · mobile (148) · A/B (97/113) · team = #88 · templates (70) · **shareable pipeline view (179 — built; status of record in PRODUCT-INVENTORY)**. **TRUE NEW (not built — status in inventory):** admin audit log (180) · enterprise SSO/SAML+SCIM (181) · Zapier/Make (182) · campaign kill-switch (183) · **public** uptime page (184, internal status already built) · **outbound** webhooks+event API (185, inbound infra already built). |

---

# ░ 📦 RED-ITEM BOX MAP — every not-built item, in independent boxes ░

> **The boxes rule (the #502 lesson — "open one box and everything falls out"):** every box is ONE self-contained, independently-shippable PR. No box depends on another to merge. Build to 🟡 on an **isolated branch** → **push to PREVIEW** (`staging` branch / `heartfelt-essence…railway.app`) → **founder previews + approves → 🟣** → ship to LIVE (`main`) → 🩷 → verify → 🟢. **(RULEBOOK §11 — client-facing work is previewed before it goes live; never merge-to-live unseen.)**
> **Status of record stays in `PRODUCT-INVENTORY`** — this is build *sequencing*, not status. (🟡 items go preview→approve→🟣 separately; this map is the 🔴 set.)
>
> **▶️ BUILD STATUS (16 Jun) — PAUSED for launch · RESUME MON 22 (post-launch):**
> - ✅ **B7** shipped → PR #583 (money-path tests, verified).
> - ⏳ **B2** partial — 179 (shareable view) was **already built** (code-verified, PR #584); **183 kill-switch + 180 audit log still queued**.
> - 🔴 **B1 · B3 · B4 · B5 · B6** not started.
> **Resume order Mon 22:** B2-remainder (183 → 180) → B1 → B3 → B5 → B6 → B4 — **one PR per box, held → 🟡, code-verify each item against the codebase first** (the 179 lesson). Paused now so launch focus stays on D9 + Thu Go/No-Go.

## 🤖 BUILDABLE NOW — Claude can take these 🔴→🟡 with no external dependency
| Box | Items | Independence |
|---|---|---|
| **B1 · Company-Engine fast-follows** | 106 invite-email · 107 owner drill-down · 108 budget-edit + offboarding · 109 manager role + owner↔rep notifs · 110 per-rep routing + CRM dedup | All inside `/dashboard/company` + company API; self-contained to #88. *(111 calendars split out — needs a provider.)* |
| **B2 · Trust & safety / compliance** | 183 kill-switch · 180 audit log · **186 record signup T&C acceptance** | Admin/trust/compliance surface; each ships alone. *(179 shareable view turned out already built.)* 183 doubles as a launch-safety net; 186 is a ~30-min compliance fix. |
| **B3 · Builder ecosystem** | 185 outbound webhooks + event API → then 182 Zapier/Make listing | Webhooks first; Zapier rides the same events. New surface, touches nothing live. |
| **B4 · Portal polish** | 113 A/B subject UI (backend 97 ready) · 114 Kanban polish · **187 sequence/template → apply-to-campaign (🚨 PULLED to Thu-18, email-first)** | 113/114 front-end only. **187** wires the Sequence Builder (82) + Templates (70) to actually save + apply to a campaign (new/existing) — pulled pre-launch by founder call. |
| **B5 · Onboarding/segmentation (§14)** | 174 firmographics read (PDL) · 175 seat routing · 176 14-day company trial | The onboarding fork; PDL keys already set. Independent of the agents. |
| **B6 · Lifecycle email + copy** | 135 onboarding-v2 emails + playbook form · 137 90-day guarantee + homepage outcome copy | Content/email; no deps. |
| **B7 · Money-path test harness** | 124 integration tests (credit/ledger/KPI) · 100 Smoke Test 2 scripts | Test-only — **zero prod risk**; also certifies the billing fix. |

## 🚧 BLOCKED — one input unlocks each (stays 🔴 until then)
| Item | Needs |
|---|---|
| 181 SSO/SAML + SCIM | 🧍 pick Auth0/WorkOS + account |
| 120 FIGSY Memory v2 / pgvector | 🧍 flip the pgvector switch (2 min) |
| 121 Casey onboarding | 🧍 voice/tone input |
| 126 social login go-live | 🧍 Google + Azure OAuth registration |
| 177 white-glove implementation | Apollo's reseller decision |
| 184 public status page | 🧍 Statuspage.io / BetterUptime account (~15 min) |
| 128 Meta/WhatsApp · 136 Flutterwave · 104 Hunter/PDL keys | 🧍 external accounts/keys |
| 116 Activity-feed home widget · 119 Revenue Mission Control | design review first (core screen) |
| 178 voice ("speak") chat | Vapi/voice infra decision + design |

## 🧱 BIG EPICS — own multi-week boxes, sequenced in V2 (NOT "now")
143 Learning Engine · 144 Denise deep · 145 LENA + TONY · 146 orchestration + skill library · 139/140 intelligence (intent/bandit/adaptive/CRM-pull) · 141 context-MCP · 152 memory/forecasting/call-intel · 148 mobile app + CRM Kanban · 150 cross-client intel + data marketplace · 151 ISO/SOC2/Vanta · 153–161 P4 scale (client-count-gated).
> **⚡ PULLED FORWARD into the 23-Jun→7-Jul sprint (23 Jun):** the **effort/input-gated** subset — **120 · 121 · 141 · 144 · 145 · 157 · 158 · 165** — is no longer "later"; it's active in LAUNCH-PAD (their gate was hours or a founder input, not real clients). The genuinely **client/data/margin-gated** ones stay here: 143 (data) · 147 (margin) · 150/155/156/159/161 (scale) · 151 (enterprise) · 160 (demand).

## 🥷 STEAL-SOURCED (logged 22 Jun · RULEBOOK §9 — buildable-now unless noted)
**205** branching-logic forms (extends live item 71) · **206** template-gallery UX (70/162/56) · **207** multi-currency admin rollups (feeds 203) · **208** recency-weighted hot-lead ranking + champion signal (feeds 139 — 🧍 needs a behaviour-signal source) · **209** prospecting play-artifact + progress tracker + org-threading (FIGSY output UX) · **210** call-coaching agent (per-rep #88 / agent family) · **227** proactive next-best-action across the agent family (ClickUp Brain² — seeded by Alex's "recommends" cards). *Status of record = PRODUCT-INVENTORY.*

## 🧍 FOUNDER / CONTENT — not a Claude build
101 D9 · 102 legal (post-delivery) · 105 Go/No-Go · 122 kill dead Vercel · 127 outreach/LinkedIn · 129 demo video · 132 dogfood · 133 design-partners · 134 social cuts · 138 influencer · 142 Product Hunt/G2.

## ▶️ Recommended order (post-launch, ONE PR per box, held → 🟡)
**B7** (tests, zero risk) → **B2** (trust quick-wins) → **B3** (ecosystem) → **B5** (onboarding) → **B1** (company fast-follows) → **B6** (copy) → **B4** (polish). Pre-Fri-19 the focus stays on the Go/No-Go gates; boxes start after launch unless the founder pulls one forward.

---

# ░ PART 3 — DOC INDEX (stop the sprawl) ░
**This file = FUTURE detail / roadmap rationale only** (not a status tracker — status lives in PRODUCT-INVENTORY). Map:
- `KIND-MASTER.md` — strategy bible / session log (links here)
- `CLIENT_FLOW.html` / `CLIENT_FLOW_PER_REP.html` — the journey + #88 per-rep design
- `portalv2preview.html` / `portal-v2-layout.md` — the 8 V2 cosmetic concepts
- `SMOKE_TEST.md` — T1–T10 detail · `DEPLOY-CHECKLIST.md` — deploy steps · `legal.md` — legal pack
- `MASTER_TODO.md` / `EVERYTHING.md` — **older/overlapping → fold into this tracker, then archive.**
