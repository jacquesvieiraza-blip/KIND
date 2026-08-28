# 🎯 K.I.N.D — FORWARD ROADMAP + RISK REGISTER (future detail ONLY)

> # 🚧 HISTORICAL FENCE — READ BEFORE YOU QUOTE ONE LINE OF THIS DOCUMENT
>
> **This page is restored historical roadmap material plus future thinking. It is NOT a record of current truth, and nothing in it may be used as current authority.**
>
> **Where current truth actually lives:**
> | For | Go to | Never here |
> |---|---|---|
> | **Founder rulings / the locks** | [`PRODUCT-RULES.md`](./PRODUCT-RULES.md) — **wins every conflict** | ✋ |
> | **Current launch execution** | [`LAUNCH-PAD.md`](./LAUNCH-PAD.md) | ✋ |
> | **Current implementation status (the dots)** | [`PRODUCT-INVENTORY.md`](./PRODUCT-INVENTORY.md) | ✋ |
>
> **The rule, stated once:** a statement on this page from an earlier era is **NOT current truth unless a current rule or status entry explicitly revalidates it.** If this page and any of the three above disagree, **this page loses** — every time, without argument.
>
> **Known superseded language you WILL find below.** These are left in deliberately — the repo chains history, it does not delete it — and none of them is current:
> - **earlier launch dates, and "already launched" phrasing** → the launch is **25 Aug** (**R57**, 20 Aug, unconditional)
> - **Milla / Vida described as "coming soon"** → they are the live portals of the managed model (**AR1**); the Milla homepage is **live** (**R59**, #697)
> - **a 10-step sequence cap** → the cap is **7** (**D14**, ruled 6 Aug; `MAX_STEPS = 7`)
> - **booking marked "Soon"** → that wording is historical. **Current booking status must be read from PRODUCT-INVENTORY (#44 / #361), not from this document.**
> - **the old Smartlead/Instantly sender architecture** → **D1 as amended 30 Jul (#577)**: our own engine sends our outreach; Instantly is a warm-up utility on Growth
> - **Apollo described as retired** → **AR5**: *"Apollo is OURS. PDL + Hunter are the CLIENTS'"* — the founder overruled the "retired" audit on 1 Aug
> - **blanket compliance wording** ("GDPR & POPIA compliant") → **R56**: we do not award ourselves compliance verdicts, and residency is stated in both halves — **stored Dublin `eu-west-1`, processed Railway US West**
>
> ⚠️ **This fence is a fence, not an edit.** The body below has **not** been re-fact-checked and has **not** been rewritten — that was deliberate (founder, 21 Aug). Treat every current-state sentence in it as historical until you have checked it against the three docs above.

> 🔄 **RESTORED VERBATIM — 21 Aug 2026.** The 21-Aug "S1" cut reduced this doc to a 690-word skeleton and lost the working roadmap the founder actually uses — the three-product future (R39), agent capability specs, Alta parity, the J&J steals, the Milla & Vida future and the market history. This body is the pre-cut file restored byte-for-byte from git; **that skeleton is not deleted, it lives in git history** (`346b54dd:docs/V2-TRACKER.md`).
> **This doc is future detail — roadmap · risks · steals.** The 25th-cut execution list stays in [`LAUNCH-PAD.md`](./LAUNCH-PAD.md) and never moves here.

> 🗓️ **28 Jun note:** content below is future-detail and still accurate in shape; a **hygiene trim of this doc is PARKED** (founder decision 26 Jun — low priority vs the daily docs). Current truth always lives in PRODUCT-INVENTORY / LAUNCH-PAD. The 26 Jun yellow/red audit + 190 fix are logged in KIND-MASTER, not here.

> **AUTHORITY (operating system — see root `CLAUDE.md`):** future detail only — roadmap rationale, risks, learning engine, GTM, steals, moat. **No current build statuses or daily execution here.** For current status → `PRODUCT-INVENTORY.md`; for current execution → `LAUNCH-PAD.md`; for strategy → `KIND-MASTER.md`.

> **🧭 Four-doc contract:** **V2-TRACKER** *(this doc)* = future roadmap, risks, rationale, steals — **no live status** · **LAUNCH-PAD** = daily execution · **PRODUCT-INVENTORY** = status (one dot, one owner) · **KIND-MASTER** = strategy + session log. **Conflict rule:** future truth = here; status = PRODUCT-INVENTORY; daily = LAUNCH-PAD; strategy = KIND-MASTER. No fifth core doc. **Money model of record → [`CASHFLOW-LAB.html`](./CASHFLOW-LAB.html)** (#556). *(26 Jul: `BUILD-STATUS.md` had become a fifth status doc and is retired → `archive/BUILD-STATUS-26JUL.md`, #555.)*
> 1. **[`KIND-MASTER.md`](./KIND-MASTER.md)** — strategy + decisions + session log *(product LAUNCHED 18 Jun)*
> 2. **[`PRODUCT-INVENTORY.md`](./PRODUCT-INVENTORY.md)** — **THE status list: every item on the 5-state colour system — 🟢 live+verified · 🩷 live, not yet walked · 🟣 approved+locked · 🟡 built, pending review · 🔴 not built, with owner (see the colour dashboard at the top of that doc).** If you want to know what exists and what's left — go there, not here.
> 3. **This file** — the FUTURE detail behind the inventory's 🔴 items: risk register · learning-engine blueprint · GTM/content plan · steals catalog. **No build statuses live here anymore.**
>
> **📅 THE PLAN (locked 12 Jun · ✅ both ships DONE):** ① ✅ Mon 15 — Company Command Centre + payments → production · ② ✅ **LAUNCHED 18 Jun** · ③ **NOW = post-launch:** seller engine (196–204) · the Company-Engine completion · warmup (198) · everything else here.

_Last updated: **15 Aug 2026** (docs audit — THE POST-LAUNCH BUILD PHASES added as the top section; the 25 Jun line below kept as history) — prior: 25 Jun 2026 (POST-LAUNCH — product live since 18 Jun) — **25 Jun: 🌍 TWO-TRACK GTM decided (US/EMEA via our own outreach · Africa via partners) → new "🌍 MARKET STRATEGY" section below (evidence · risks · Instantly/Smartlead tool-fit VERIFIED · aggregator→coverage mapping); supersedes "Africa-first, US deferred." Item 243 aggregator research → BetterContact. Our US/UK outreach pack drafted (`content/our-outreach-us-uk.md`).** · **24 Jun: Partner Portal v2 DEMO shipped (#712) + Alex agent · steal 227 logged (#715) · THE ENGINE 211 Phase 1 DONE — Smartlead key live + connectivity verified (read-only, admin-gated). Next = Phase 2 (SendingProvider seam, previewed).** · **THE ENGINE (item 211) is the strategic centre: integrate Smartlead (primary) + Instantly (backup/own outreach); full spec in the "⚙️ THE ENGINE" section below.** The 12-Jun "Mon 15 / Fri 19" plan is done → dated history. · Prior — 22 Jun — **DELIVERABILITY reframed: it's REPUTATION, not content.** 194 reopened (real Gmail → Promotions/Spam despite mail-tester 10/10); #623 hardened cold content (pixel/footer off cold sends); the real fix is a **warmup tool ~1–2 wks → new item 198 (founder action MON 22).** Also logged: 197 partner-programme unify (rate later LOCKED 20%+5%, 19 Jun). · Prior — 17 Jun 2026 — **launch = Fri 19; Thu 18 = Go/No-Go (likely GO).** Today: 186/187/188 shipped · the metrics saga closed (193/194/195 — real opens + Analytics fixed; root cause was a missing `opened_at` migration) · mail-tester 10/10 · *(NOTE 23 Jun: an earlier line here claimed a `kind-ops` company-ops repo was "built" — FALSE; no such repo exists. The company-ops/SOP layer → **Notion**, item 204, not yet set up.)* · item 196 (HMRC-grade sales ledger) logged · KIND-MASTER history split into `KIND-MASTER-ARCHIVE.md` · a colour status-dashboard added to PRODUCT-INVENTORY. The 🔴 roadmap below is unchanged in shape. · Prior: 14 Jun — **this doc lives on `main`** (consolidated off the held `claude/kind-carson-MYhSl` branch so the trackers travel with the live code). **14 Jun website work shipped to `main` (live, Cloudflare):** The Drop revamped to a Monday-style show/podcast layout · main-page polish · Demo removed from top nav site-wide → "Live Demo" in Resources (inventory items 93 · 118). Portal/agents untouched — still post-19. · _Prior (13 Jun, on `MYhSl`):_ aligned to the inventory's 4-state colour system; invoicing decision locked (USD · no VAT until benchmark · Stripe-issued). **113a agent-panel rule BUILT** (FIGSY/Milla/Vida/Denise conversational + acts-in-place via `liveChatEndpoint`; endpoints `/milla/chat` `/denise/chat` `/casey/chat` + existing `/vida/help`). **Casey wired live on `/v2/setup`.** **"AI Family" cards BUILT** (#125). New planned website items: 162 Prompt Library · 163 Product Videos hero._ (Superseded by the M0 reset, 8 Jul — see MILESTONE-0-CHECKLIST.)

**Owner:** 🧍 founder · 🤖 Claude · 🤝 both

---

# ░ 🗺️ THE POST-LAUNCH BUILD PHASES — every future item, phased by EVIDENCE (founder-ordered 15 Aug: "log it in V2") ░

> Compiled 15 Aug from a full sweep of every doc in the repo — the four core docs, all 13 marketing docs, the strategy/ops/reference docs, all 172 🔴 inventory items and the steals ledger. **Nothing below is invented: every item and every gate is quoted from its own doc.** Status of record stays in PRODUCT-INVENTORY; this section is the ORDER. The full annotated version lives in the "The Next Builds" artifact (15 Aug).
>
> **The one law:** phases are **triggered by evidence, never by date** (the GTM-STRATEGY rule, applied to builds). A phase starts when its trigger fires.
>
> ### 📣 EVERY FINISHED PHASE IS A DROP — R37, the shout-out-loud rule
> **Founder-ruled 15 Aug:** *"we need to shout out loud about the things we do. and this is the reason for the part of the site called The Drop… when we launch and finish a full phase we write about it. we link it to the site. this is such good food for marketing."* So: **launch itself, and each phase completion below, ships with a Drop write-up** — the Project writes it (brand-voiced, R27/R30 rules apply), a Drop card lands on `the-drop.html` (site edit = founder-worded per P12, freeze refreshed per R28's pattern), and the LinkedIn post + future YouTube/TikTok clip point at it. One shipping moment = three content pieces — the flywheel the 11 Jun GTM section below already named, now bound to the phase ladder.

### ⛓️ 20 AUG ADDITIONS — R57 makes this section LOAD-BEARING (founder: *"we launch regardless of the state 25th August… I want all actions for after launch. All future builds documented."*)
The date is unconditional (R57). Anything that misses the 25th lands HERE, documented — never a delay. Added from the 20 Aug session (36 PRs):

- **Rename `apollo_consented` → the honest name** (and `ICP.apollo_only_consented`). #676 documented it as *"the real fix, too big for launch week"* — 28 sites carry the canonical warning comment until then. Phase 1, first quiet week. 🤖
- **Testimonial truth sweep** — `figsy.html` carries invented customers ("CFO · Series B SaaS · Cape Town", "Thabo Nkosi · Takealot"). Flagged 20 Aug during P13, out of that pass's scope. R30 (stats only from a checkable source) reaches these the day a prospect asks. May be superseded by the P30 homepage rebuild — check before building. 🤖 + 🧍 ruling
- **Counsel rider (H30), two items from P13:** ① `dpa.html:296` commits to Standard Contractual Clauses — confirm the paper exists or amend the contract; ② the DPA is framed POPIA-first while data now sits in Ireland — GDPR is the primary regime; restructure is counsel's, not an agent's. 🧍
- **Backup posture, two micro-actions:** ① one Supabase support message confirming backup storage region (the site now says same-region on inference from the dashboard); ② decide whether to pay for PITR — the tab is beta/unenabled today, and the site deliberately does not claim it. 🧍
- **Per-client retention controls** — the site PROMISED "your retention settings" and no such setting exists (deleted 20 Aug, #685). If clients ask for it, it becomes a real Phase-2 build: a retention window per client, enforced by a cron, shown in Milla. Never rebuild the sentence before the feature. 🤖
- **Google OAuth verification, the post-submission half** — L2/P47 (pre-25) gets the domain moved and the submission in; Google's review lands on its own clock. Completing verification, removing the test-user bridge, and the 100-user cap retirement are post-launch by nature. R55 context: #684. 🤝
- **🎨 WEBSITE CONSISTENCY PASS — the homepage and the other 28 pages are now two different sites (founder-logged 20 Aug, post-P30).** The new homepage is the GPT design: Inter-stack fallback type, its own spacing and component language. The other 28 pages are the old system: Outfit/Plus Jakarta headings, kind.css components. Fonts don't match across pages; sections don't match within pages. *"lots of inconsistencies."* The pass: pick ONE design language (the founder's call — the new homepage is the likely winner), then sweep every page's type, spacing and components to it, page by page, each previewed before live. Not launch-blocking; logged, not scheduled. Item #698. 🧍 ruling + 🤖 build
- **🛠️ DAY 1 POST-LAUNCH — THE OPERATING-MODEL SESSION (R60, founder standing order).** Before any new build: outline how we operate, from the Founder-Operator OS html (his), the R58 corrections, and 20 Aug's own failure record — reference-verbatim over reinterpretation, preview before ritual, assert every splice, environment splits caught in CI not on the founder's laptop, the right model for the job. *"i cant work like this. its slow. it burns. it is not scalable."* 🧍 + 🤖
- **`/health` commit check → ship ritual** — #673 built it; fold `curl /health | jq .commit` vs `git rev-parse --short origin/main` into `ship.sh` so every deploy self-verifies. Small. 🤖

### ⛓️ 20 AUG — FIGSY OBSERVABILITY + MODEL ROUTING (R58, founder-ruled post-launch: *"none of this is live now. all post launch for review"*)

Three documents drove this: an M&V routing brief, the Founder-Operator OS, and a **challenge brief** that ordered the first review re-audited rather than accepted. The founder then ran a second challenge himself. **Everything below was designed, three items were built and REVERTED unbuilt on his ruling** — nothing here is live, and the sequence is a proposal for post-launch review, not a queue.

**The finding that reorders the whole thesis.** The problem is not that model costs go unlogged. It is that **the decision which produced a booked meeting is destroyed by the next rescore** (`scoring.ts:173` — single mutable columns, overwritten in place). Metering an implementation that cannot remember its own decisions instruments the wrong thing. The founder's words: *"That is much more strategically important than token metering."*

**The immutable chain, and what a rescore does to it.**

```text
leads                          ← current_decision_id (convenience, mutable)
  ├─► lead_decisions           IMMUTABLE, insert-only. Rescore INSERTS B; A untouched.
  │     score · reasoning · model · prompt_version · evidence_version · run_id
  │        │ decision_id  [FK, ON DELETE RESTRICT — never SET NULL]
  │        ▼
  ├─► approvals / figsy_enrollments   ← decision_id PINNED AT APPROVAL, never recomputed
  │        │ enrollment_id  [FK, RESTRICT]
  │        ▼
  │     figsy_replies          ← needs enrollment_id ADDED; today it has none
  │        ▼
  │     calendar_bookings → MEETING_BOOKED
  └─► model_runs (run_id)      ← cost/latency, joined via run_id, never on this path
```

Under this shape a rescore between approval and booking is harmless: the enrolment still points at A because the pin was taken at approval and nothing rewrites it, so the meeting attributes to A while the lead's *current* view correctly shows B. **Both answers true, no collision.** Three properties carry it, and each is a place it fails silently: the pin is never recomputed · FKs `RESTRICT` not `SET NULL` · `figsy_replies` gains `enrollment_id`.

**The sequence — for review, not authorised.**

| Order | Items | Gate |
|---|---|---|
| First (smallest, no model touched) | **#686** website release proof · **#687** single `$4` source · **#688** A2a additive lineage | Founder review |
| Then, one pass | **#690** registry + adapter · **#691** durable `model_runs` | #692 settled first |
| Then | **#689** A2b full history · **#693** approve/reject attribution | Reason taxonomy is a product decision |
| Evidence | **#695** shadow evaluation | Needs #688–#691 live |
| Last | **#696** dynamic routing | Founder approval **task by task** — it changes which leads a client is charged $4 for |

**Decisions only the founder can make:** #692 (is `outcome_events` a ledger or a log — it currently claims both) · #693's reason taxonomy (six chips vs ten, on the screen where clients spend money) · #696's per-task quality floors · #689's `evidence_snapshot` vs hash, which needs a real row-size measurement first.

**Two things already true that must not be rebuilt:** evidence-before-model is the existing pattern, and suppression/jurisdiction/country checks are already deterministic with no LLM. **And Nexus is not the router** — see #694; they are opposites on the tenant fence and must never share a table.

**From the Founder-Operator OS, separately:** §09 *founder absence mode* is a page of writing with no code (deputy · technical guardian · continuity runbook) and is the section whose absence costs something if he is unavailable — the rest of that document is Notion, not repo. §51 *Current Operating State* is a real screen but would be a hand-typed dashboard until #691 exists. §55's *"400 accepted leads × $4"* is a **planning assumption with an owner and a date**, not a product constant — only the `$4` is a constant (#687), and conflating the two was my error, corrected by the founder.

## Phase 0 — THE CURRENT VERSION'S OWN WORK (not a phase gate — it ships before/with client #1)
**#651 — the industry/purpose sequencing engine.** R38-amended + R39: sequencing is **core to all three products and serves the client**, never an add-on and never operator-only tooling. v1 = templates by industry AND purpose (meeting-gen · event invite · reactivation) · **date-aware cadence that counts BACK from an event date** · per-campaign depth 3/5/7 (5 only as the default). Later rungs: winning-plays-feed-templates (needs live send data), call/LinkedIn steps as those channels unlock (#475/#388), auto-tuned depth (P2's Nexus), the visual flow builder (P3's client surface).

## Phase 1 — PROVE IT · trigger: client #1 in the works → paying
The unlock chain A22→A23→#550 (runbooked) · **#452/#450/#451 multi-engine sourcing** (line-11 ruling: "fires the moment line 10 ticks") · **flip `TRAINING_LIVE`** (#346/#74 — backend built, UI disabled, outreach generic until it flips) · #192 activation instrumentation + stall rescue (churn plan wave 1) · #28b real-money walk + #559 sales walk · billing truth #341/#357 **via #431's ruling (mostly a DELETE — retire subscription machinery)** · #647 MRR-ZAR settle · **referral/partner money bugs #479/#355/#351/#370 BEFORE the first partner or referral exists** · free reach #142/#49/#50 (G2 · Capterra · Product Hunt) · #415's doc rebuild on real rates. Riding along, no build: A11 walks resume ~25 Aug; the 20→200 depth test on client 1 ("the first thing to test").

## Phase 2 — DEEPEN IT · trigger: client #1 retained, proof accumulating
#191 value dashboard ("here's your return") · #190 pause-instead-of-cancel + win-back · **WhatsApp client pings (§2b below — opt-in clients only, never prospects)** · **#212 sequence rebuild** ("rebuild before we scale sends", cap stays 7) · #437 why-now + #438 conversational ICP intake (the two cheapest Jack&Jill steals; #440+ stay cost-modelled-first) · onboarding tour phases 0–4 + 6 Learning Centre (planned to the line; founder input = record 6 videos, unlisted YouTube) · #233 partner-list sourcing through our own engine (openers drafted, brand-sent) · **Advanced tier #608 — SOLD BEFORE BUILT, unchanged** · marketing gates: the R2 decision (its own gate: client #1 + A11 money walks), the 3 demo clips, the first R31 monthly stats post.

## Phase 3 — COMPOUND IT · trigger: 4 clients · ~400 approvals/mo (the R15/R16 line)
**First hire = customer success (R16)** → #276 per-staff logins + #204 Notion trigger · **Lena pulled forward** #145/#293 (both the churn plan and the salary plan name her the priority agent) · **Nexus auto-tuning ON** (§2 below — cost-model first) · **the paid-ads gate opens** (R24/R7: 3+ clients · floor covered · message proven · tracking installed — the 4-week Meta plan is pre-written) · **the company GitHub org migration** (scratch test first; the founder's 26 Aug intent) · seller engine wiring #203/#200/#202 (comp engine built+tested, unwired; agreements before any seat) · the glide path's co-pilot stage.

## Phase 4 — SCALE IT · trigger: ~10 clients, real outcome data flowing
The intelligence layer #37–53/#143/#120 (RAG → evals → outcome feedback → contextual bandit → pgvector — the reward signal is already logged) · **#476 the unified agent brain ("THE moat"), per-client-fenced** · #141/#59 context-backed MCP server (the Glean 2.5× insight; directory listing = distribution) · the 15 Pieces in their pre-ranked order (status bar → notification centre → Kanban → Cmd+K) · #160/#217 white-label ("never build without a waiting customer") · **#258 data residency — pre-build the region resolver, provision same-day on the first US/UK client** · #475 voice (per-minute cost model first) · #181/#151 enterprise pack · the glide path's self-serve stage.

## The clean-up shelf — settle, don't build (raises doc-trust, the org-migration's own goal)
Deletes wearing red dots: #431's subscription retirement · #404 lena.ts (mount or delete) · the parked WhatsApp/Vapi routes whose deletion closes security holes #359/#369 for free. Doc-truth: four docs (PARTNER-BRIEF · sales-playbook · client-flow-sop · SALARY-BREAKEVEN) still carry the retired ladder/trial in their bodies; GTM-ONE-PAGE + founder-led-system still treat the newsletter as live vs R29; README-marketing carries pre-R22 naming; the paid-ads landing target is the parked beehiiv page. Orphans to re-home: Meeting-Prep agent · custom lead fields · analytics-provider decision · inbox pool buffer model · the "time saved per rep" owner KPI.

## Decisions only the founder can make (each blocks one phase item, none block launch)
Advanced tier price/shape (safely held by "sell before build") · R2 public posting + channel · analytics provider (or log-to-DB until volume) · inbox pool on-demand vs standing buffer · client-API-key vs vendor data agreements (#432 rides it) · B2's 30-min cost-floor verification.

---

# ░ 💼 THE THREE-PRODUCT FUTURE — one engine, three ways to pay (R39, founder-ruled 15 Aug) ░

> ⛓️ **This section was "THE TWO-MODEL FUTURE — Base + Advanced" (founder-locked 31 Jul, #608). R39 (15 Aug) did not replace that lock — it FILLED it.** Advanced was a locked shape with deliberately empty contents; it is now **P2 Coaching**, and a third product joined the ladder. The 31-Jul text is kept verbatim below because its candidate list already named what P2 turned out to be ("higher-touch operator time", "the brain"). Full ruling + the founder's words → `PRODUCT-RULES.md` R39.
>
> | | **P1 · MANAGED** *(live)* | **P2 · COACHING** *(the second paid product)* | **P3 · FULL SaaS** *(later)* |
> |---|---|---|---|
> | **Price** | $4/approved lead · $299 start incl. 100 | Everything in P1 + added items at a **higher set per-lead price** ($8 is the founder's EXAMPLE, not locked) | **Monthly + a usage rate** — the one subscription in the model |
> | **Billing shape** | Usage only, never monthly | **Usage only, never monthly** | Subscription + usage |
> | **Who operates** | We do (Vida); client approves in Milla | Same, **plus a named operator close to the business** | **The client operates it themselves** |
> | **Sequencing** | Full engine (#651), we wield it | Full engine + **Nexus auto-tuning ON** (it learns their best depth/cadence) | Full engine, **client-wielded** — the Alta-style visual flow is P3's surface |
> | **Coaching** | Free layer as today (Coaching page · Milla chat · help-me-reply) | **The product** — plays delivered, industry best practice, strategy input | Self-guided: plays library in the tool |
> | **Client touches sequences?** | **No — locked** | **No — locked** | **Yes — that is the unlock** |
>
> **The one philosophy across all three: the client pays when they approve.** P3's subscription is the single deliberate exception, and only because the client is running the machine themselves.
> **Not a product:** white-label for agencies is a **channel** (how others sell P1). **Launch marketing:** P2 and P3 each ship with their own Drop write-up in Resources (R37 as extended 15 Aug).

*Strategy and the decision itself live in **KIND-MASTER**; this is the future detail only. The 31-Jul two-model text follows, unedited:*

**The shape that is locked:** two packages, **one engine**. Base is today's managed service — $299 onboarding pack with 100 approved leads included, then $4 per approved lead, reviewing free, approve as the only money event. Advanced is a second entitlement tier on the *same* pipeline.

**Sold before it is built, on purpose.** Advanced does not get constructed until a real buyer has said yes and a real price has survived a real conversation. Building it first is how you end up with a tier nobody asked for — and this repo already has an inventory full of that lesson.

**Candidate content for Advanced — NONE of it decided, all of it drawn from things the engine can already nearly do:**
- a higher included-lead count, or a standing monthly allowance rather than a pack
- **the brain** — the 14 items redesignated to THE BRAIN under the engine on 1 Aug (#606): doc-RAG, pgvector memory, the learning engine, per-client pattern recognition. This is the most defensible candidate because it compounds per client and cannot be copied by a competitor without the same history.
- higher-touch operator time (a named operator, faster turnaround, strategy input)
- Nexus auto-tuning switched on — currently built, fenced and default-deny per client

**The open questions, all founder's:** the price points · whether Advanced is *more leads*, *more attention*, or *more intelligence* · whether Base keeps the pack shape or moves to a standing allowance. **Do not resolve these in code.**

**⚠️ The constraint that shapes any answer:** revenue per client is a **throughput dial we operate** — approvals scale with what we surface and what the mailboxes can send. More approvals need more mailboxes (~$6/mo each), which is cheap and linear, so a client approving more is *good for us*, not a cost problem. Any Advanced design should lean on that rather than fight it.

# ░ 🎯 AGENT CAPABILITY SPECS — the feature set per agent (founder-locked 9 Jul) ░

> **Features only — pricing lives in the money model (#420).** This is the **MILESTONE 0** build scope for each agent's capabilities (founder-ruled 9 Jul: M/V/D features belong in M0): what each does today vs what it will do. FIGSY is the live qualification engine; **Milla · Denise · Vida capabilities are 🔴 M0 — #427/#428/#429 in LAUNCH-PAD Phase 2** (kept "coming soon" on the site until built one at a time; only the account-level agent products #2/#3/#4 stay parked M4). Inventory status items: **FIGSY** = M0 build · **Milla** #427 · **Denise** #428 · **Vida** #429. Nothing here changes a status dot.

## FIGSY — qualified B2B lead sourcing *(the core qualification engine — the "qualified lead" metric belongs here)*
**Current (M0 — live/building):** ICP-matched B2B lead sourcing · AI lead score 0–100 · personalised outreach per lead · follow-up sequences (≤10 steps, #212) · reply tracking + drafts for approval · booking link in every email · GDPR/PECR-compliant workflow · CRM dedup + CSV export.
**Soon:** books meetings into calendar (#361) · LinkedIn outreach (#388).

## Milla — lead intelligence layer *(turns a qualified lead into an **understood** lead — not "AI that answers questions")*
**Current (built):** business-knowledge + document recall · ask-anything grounded answers · what's-converting insights.
**🔴 M0 build scope (per-lead layer, #427):** explains why this lead is a fit · matches the lead to the right product/service · identifies likely pain points · suggests the best outreach angle · pulls relevant company context into the lead card · adds source-backed reasoning where possible · creates "what to say to this lead" notes · highlights similar past wins / converting patterns · flags weak-fit or risky leads before outreach · suggests which offer/message to use.

## Denise — sales action layer *(turns a qualified lead into a **ready-to-send sales motion** — not "AI that writes emails")*
**Current (built):** objection handling · proposal drafts · follow-up until the deal closes.
**🔴 M0 build scope (per-lead layer, #428; boundary R2 — FIGSY owns cold→first-reply, Denise owns reply→close):** writes the first outreach message · creates a 3-step follow-up pack · suggests the next best action · generates objection replies · prepares call notes · writes proposal intro/context · creates post-call follow-up drafts · summarises buyer intent · recommends urgency level · flags deals that need chasing · suggests when to stop following up · turns Milla's insights into actual sales copy.

## Vida — inbound qualification layer *(turns website + WhatsApp visitors into **qualified leads**)*
**Current (built):** website chat widget · WhatsApp inbound · 24/7 visitor qualification + capture.
**🔴 M0 build scope (inbound engine, #429):** qualifies inbound visitors against the same ICP rules · captures name/company/email/phone/need · scores inbound leads 0–100 · detects urgency + buyer intent · filters out spam + bad-fit enquiries · summarises the conversation · suggests the next best reply · routes hot leads for immediate follow-up · adds booking link when appropriate · pushes qualified inbound into CRM/export · hands off to Denise for follow-up copy · hands off to Milla for company-specific context.

---

# ░ 🆚 ALTA PARITY — the two gaps to a COMPLETE product (21 Jul competitive teardown) ░

> **Context (founder-driven, 21 Jul):** compared K.I.N.D's agents to **Alta** (altahq.com — $25M Series A, ~$15M ARR, Snowflake/Deel/Atlassian). Alta = three coordinated agents on a **unified data layer**: **Katie** (outbound: email + LinkedIn + **phone**, signal-based targeting), **Alex** (inbound qualify **+ AI voice calls** + calendar booking + routing), **Luna** (analytics/ops layer — A/B, pattern detection, **self-optimises** messaging/timing/targeting, connects HubSpot/Salesforce + 50 tools). **The question was not pricing — it was capability completeness.** Verdict: on raw capability Alta wins outright today; our answer is not to out-feature on breadth but to reach *completeness* on our three roles + the shared brain.
>
> **Most of parity is already documented** — FIGSY multi-channel (LinkedIn #388) + calendar auto-book (#361, ~90% coded) + signal/why-now (#437) · Vida inbound engine (#429) + knowledge layer (#362) · Milla intelligence (#427) + pgvector (#120) + the Jack&Jill deepening (#437–443). FIGSY even holds Luna-style primitives already (`figsy_memory` learns the winning angle/subject · A/B · auto-pause · Monday digest). **Two capabilities are net-new and NON-OPTIONAL for parity — logged 🔴 in the inventory:**

## #475 — VOICE / AI calling *(the missing channel)*
Alta's Katie cold-calls and Alex qualifies inbound **by voice**; K.I.N.D has **zero** — Vapi is a stub (#369 webhook fails open, never wired). **Scope:** (a) FIGSY outbound AI voice call as a sequence step/channel; (b) Vida inbound voice qualification. **Needs:** a real Vapi (or equivalent) integration · consent + call-recording compliance (GDPR/POPIA) · a per-minute cost model vs the $4/lead margin (voice minutes can blow the unit economics — model first). A complete 2026 GTM product has a voice channel; ours doesn't.

## #476 — UNIFIED DATA LAYER / shared agent brain *(THE moat)*
Alta's real strength isn't three agents — it's **one shared data layer**: every signal from Katie/Alex feeds Luna, and Luna re-tunes them automatically. K.I.N.D's FIGSY/Milla/Vida/Denise are **islands** — handoffs are *referenced* (#429) but the shared layer was never designed. **Scope:** one signal/event store every agent reads + writes (leads · replies · calls · intent · outcomes) · **Milla reasons across it** (cross-agent memory, not just uploaded docs — ties #120 pgvector + the #2 "cross-agent memory" gap) · FIGSY/Vida **act** on Milla's signals · a self-optimise loop (angle/timing/targeting) across the whole motion (ties the Jack&Jill #439/#440 learning loop). **This is the single thing that turns three tools into one complete product.** Biggest hole in the docs — design it before claiming "integrated family."

> **Both queue behind the SPRINT (first paying client).** Logged now so completeness is a build path, not a blind spot. Full agent-vs-agent matchup in KIND-MASTER 21-Jul session log.

# ░ 🥷 JACK & JILL STEAL — FIGSY: from workflow-executor to commercial judgment (captured 10 Jul · items #437–#443 · parked behind SPRINT line 10) ░

> **The one lesson:** separate *understanding* from *execution* — understand the seller → the market → each buyer → decide → act → observe → learn. Full founder brief in chat 10 Jul; Fable audited every claim against code the same day.
>
> **What the audit found:** FIGSY is NOT the dumb executor the brief assumes — he already holds early foundations: per-lead `score_reasoning` written at sourcing (shown to no one) · client-level `figsy_memory` (best subjects, winning angle, episodic/longterm/preference — read by `generateSequenceWithMemory`) · reply classification WITH reasoning + sequence branching on replies + human-approved AI drafts · Monday digest/auto-pause/suggest-campaign coaching primitives. The gap is *deepening to per-prospect and surfacing it*, not "add judgment."

**Build order (Fable-ruled — cheapest-to-real first, NOT the brief's order):**
1. **#437 why-now surfaced** (S–M — reasoning already stored; show it + event signals; AFTER quotas #423)
2. **#438 ICP interview → living customer model** (M — conversational intake over existing chat + `icps`)
3. **#439 widen the learning loop** (M — more writers into `figsy_memory`: objections, persona win-rates, angle-vs-meeting-quality)
4. **#440 per-prospect buyer memory** (L — ⚠️ cost-model first: per-interaction LLM calls vs $4/lead margin)
5. **#442 autonomous reply conversations** (XL — ⚠️ highest-risk surface; approval-queue-first, autonomy earned)
6. **#443 two-sided seller×buyer intelligence** (V2 architecture; depends on #440)
- **#441 coaching mode** (S–M) slots anywhere post-line-10; boundary note: brief assigns coaching to Milla — Milla is down 3 months, so it lives inside FIGSY or waits.

**Load-bearing risks (why parked):** sprint bleed (lines 8–10 open — the 9-Jul reset exists because scope-before-revenue killed momentum) · unit economics (#440/#442 multiply LLM calls per prospect) · autonomous replies = the send-integrity class just hardened (phantom sends/kill-switch/consent) · why-now signals ride PDL spend with quotas #423 still 🔴 · Milla-boundary contradiction.

# ░ 🛝 MILLA&VIDA FUTURE — what's PAST the 14-day managed build (22 Jul pivot · future detail only) ░

> **Context:** the 22-Jul pivot (full decision in KIND-MASTER session log) sells a **managed/concierge service** on the existing FIGSY engine — **Vida** = the operator console (WE run the loop), **Milla** = the client portal (client reviews masked leads + 👍/✕ approves), **Nexus** = the per-client private learning brain. The 14-day build (#477–#490, tracked in PRODUCT-INVENTORY + LAUNCH-PAD) delivers the managed MVP. **This section holds only what lives BEYOND those 14 days** — the roadmap rationale, not status (status = PRODUCT-INVENTORY). Nothing here is a build ticket yet.

## 1. The glide path — managed → co-pilot → self-serve (no migration, ever)
The whole point of the model: **the product never changes, only *who clicks 👍 approve* does.** Same portal, same engine, same masked-lead → approve → reveal → work → book loop along all three stages:
- **Managed (the 14-day build):** the operator (us, in Vida) runs everything; the client just reviews outcomes in Milla. Client Zero = us.
- **Co-pilot (next):** the client starts clicking 👍 on their own leads in Milla while we still run sourcing/sequences in Vida. Only the approve action moves to the client — no data migration, no re-onboarding, no new SKU.
- **Self-serve (later):** the client drives their own ICP builder + campaigns; Vida becomes oversight/support. This is where the *original* self-serve SaaS vision lands — but now the client arrives at it having already seen the product deliver, so we never sold a promise we couldn't keep.
- **Why it's safe:** because approve-then-reveal + the $4-on-👍 money spine are identical at every stage, a client can sit anywhere on the glide path and the billing, trust gate, and UI are unchanged. We move a client one notch when *they* are ready, not on a migration deadline.

## 2. Nexus auto-tuning — the per-client brain that sharpens itself
Nexus (per-client, private, never shared across clients — the #476 unified-data-layer thesis, scoped to one tenant) starts in the 14-day build as **read + surface** (why this lead fits, what's converting). Post-build it earns **auto-tuning**: every 👍/✕ and every reply teaches that client's Nexus which angle/subject/persona/timing lands, and it re-tunes *that client's* sourcing + sequences automatically (the Luna-style self-optimise loop from #439/#440, fenced to one client). **The dogfood flywheel:** our own Client-Zero approvals sharpen our own Nexus → better outreach → more clients → their approvals sharpen theirs. Cost model first (per-interaction LLM spend vs the $4/lead margin — same guard as #440).

## 2b. WhatsApp client notifications — opt-in pings, never outreach *(founder idea, logged 15 Aug on his "log it")*
The moment worth capturing: **clients answer WhatsApp in minutes and email in days.** A hot reply sitting unread in Milla is the product's value going stale, so post-revenue the product pings the client's WhatsApp — *"a hot reply just landed, open Milla"* — via the WhatsApp Business API (Twilio/360dialog-class BSP, pennies per message, template pre-approval required). **The fence that makes this permanently safe: WhatsApp is an OPT-IN channel — clients only, never prospects.** Meta bans numbers for unsolicited B2B messaging and UK PECR treats WhatsApp like SMS (stricter than email), so this can never become an outreach arm of the engine; it is a retention/latency feature riding the existing alert points (hot reply · leads-ready · meeting booked). Company-side WhatsApp Business app (free, its own number) runs separately for onboarding/support chat and needs no build.

---

## 🏢 PROJECT 1 POST-LIVE — MIGRATE TO A COMPANY GITHUB ORG *(founder-ruled 6 Aug; this is the only full home for it)*

> **Founder's ruling, 6 Aug:** *"on the 26 August I want to run this like a PRO. and the system with 4 docs is insane. so i want to migrate post live."* And the reason, in his words: *"the docs drift and i have to constantly remind you to fix the docs. i have not read a doc for 2 weeks because i dont trust it."*
>
> **⚠️ Ruled the same day: NOTHING about how we work changes before live.** The board/issues idea was examined at length on 6 Aug and parked whole. This section is a plan, not a queue — nothing here starts before send-day.

### Why an ORG and not this account
Two reasons, both independent of workflow:
1. **The company should own its own asset.** The entire codebase currently sits on a personal login that is **flagged and getting no support response**. If GitHub ever escalates that flag, the business loses access to its own product with no recourse. This is the founder's own `jacques@kindoutreach.com` logic applied to the repo — *"i paid for it. i need it."*
2. **A fresh org is the only remaining chance of reviving CI.** The flag killed Actions on 3 Jul (788 runs before it, zero since) and support is unresponsive — **D2 is ruled a dead end**. Whether the flag follows an org is **unknown and must be tested, not assumed**.

### The 30-minute scratch test — FIRST, before anything real moves
New org → scratch repo → one hello-world workflow → one scratch Railway connection. This answers **both** unknowns before a single byte of the real repo moves: does Actions run, and can Railway re-authorize on an org.
- **Flag does not follow** → migrate; the five dead robots come back (tests-on-PR, doc-lint, autoflip, audits, website failover).
- **Flag follows** → the org still buys reason ① above; decide then whether it is worth it for ownership alone.

### ⚠️ Why the repo transfer is PARKED until after live
A transfer requires **re-authorizing Railway's GitHub connection on the new org — and third-party app authorization is exactly what the flag blocks** (it is the same error that locked the Supabase dashboard). If that link breaks, **merging stops deploying** and we cannot ship a fix to the live product until it is rewired. That is the one failure mode that can stall the launch itself. Not caution — evidence.

### The target shape
| Layer | Home | Note |
|---|---|---|
| **Work** — builds, bugs, walks, rulings, steals | **Issues** + a board (Backlog · Next · Current · In progress · In review · Done) | Capturable from the founder's phone in ~20 seconds, which is the gap nothing currently fills |
| **Deadlines** | **Milestones** with progress bars | Nothing like it exists today |
| **Status ladder** | **Labels** — incl. `live-unverified` vs `verified` | GitHub's "Done" only means *merged*; 🩷-vs-🟢 must survive the move or the whole ladder is lost |
| **Knowledge** | **A docs library** — cashflow, research, runbooks, decisions | See the sorting rule below |

### The sorting rule — the founder's own words, 6 Aug
> **"if it has a done it's a card; if it has no done it's a doc."**

Work has a finish line and becomes an **issue**. Knowledge is consulted, never finished, and stays a **doc**: the cashflow model, competitive research and steal analysis, the send-day runbook, the decisions log. **The docs that kept burning us were the STATUS docs** — hand-maintained copies of "where things stand." Those are what the migration kills. The knowledge docs were never the problem, and the best of them are code-bound already (`cost-floor.ts` ↔ the cashflow drift test).

### Migration order
1. The 30-minute scratch test (above) — **the gate on everything else**
2. Transfer the repo to the org — PRs, commits and issues all move with it
3. **Only OPEN work becomes cards.** Not 592 rows of history — the four docs are archived in the repo, frozen and readable forever
4. One week running both, then the status-doc machinery retires

## 3. Sending — ⚠️ NO LONGER FUTURE. It is the launch blocker. *(corrected 26 Jul)*
> **🛑 This section was wrong and it cost us weeks.** It said the operator would send from **Smartlead's own UI** while API automation waited for "the future" — so sending never got built, and the docs read as though that was a plan rather than a hole. **Founder overruled it 26 Jul:** *"instantly smartlead getting clients is everything… inbox the full way"* and *"we use our own product for us."* **Sending is not future detail — it is LAUNCH-PAD Block A**, tracked as **#211 → #547–#553** in PRODUCT-INVENTORY. **Instantly is OURS, Smartlead is the CLIENTS', and both run inside the product.** ⚠️ **SUPERSEDED 30 Jul — the founder amended #577 after walking the Instantly bundle.** **OUR OWN ENGINE sends our outreach** (FIGSY writes, `mailer.ts` + `sending-inbox.ts` deliver over SMTP, our unibox catches replies); **Instantly is demoted to a WARMUP UTILITY on the Growth tier** — HyperGrowth's API was only ever needed to drive a sender we no longer use. Smartlead-for-clients is unchanged. Kept, not deleted, because the chain is the record: see PRODUCT-RULES → the #577 chain.
>
> What genuinely remains future once Block A lands: per-client inbox **pool management and reporting depth** inside Vida (stock, provisioning queue, day-29 branded-inbox switches — #280), multi-provider routing beyond Smartlead+Instantly, and automated warmup orchestration. **Phase 1 (done)** = key live + read-only connectivity, admin-gated, zero sending. Everything past that is now launch work, not roadmap.

## 3b. 📥 RECEIVED FROM LAUNCH-PAD (26 Jul) — real work, none of it gets us live
The LAUNCH-PAD rewrite (#555–#557) moved everything that does not unblock a first paying client. It lives here so it can't go missing; **status for each still sits on its own inventory row.**
- **#515 — Milla passwordless sign-in (magic link + SMS).** Email + password works today. Blocked on two founder decisions: an SMS provider (none contracted — Twilio/Vonage cost plus a SA sender ID) and the security call on link-only login (token TTL, single-use, device binding). A no-login surface that can **spend money** is not a thing to ship casually.
- **🧠 Nexus, the whole family (#511a–#511f).** All twelve items are built and live, every tuning path **default-deny** behind a per-client kill-switch, a confidence gate and the `assertSameClient` fence. Nothing about it blocks a first client; the auto-tuning depth (§2 above) is where it goes next.
- **Data-engine widening #450 #451 #452** — fires when the pilot pays.
- **Alta parity #475 (voice/AI calling) · #476 (unified data layer)** — the competitive gaps, §"🆚 ALTA PARITY" above.
- **Jack & Jill steals #437–#443** — commercial-judgment deepening, §"🥷 JACK & JILL STEAL" above.
- **#494 qualification gate · #495 ICP versioning · #491 per-cron alerting · #349 money-write sweep verify · #373/#389 migration hygiene** — real, on their inventory rows, not launch-blocking. *(#491 was pulled BACK onto LAUNCH-PAD Block C: once real clients are sending, a silently dead cron is a client who stopped being worked and nobody knew.)*
- **The expired 14-day map (Day 0 → Day 14) and the retired money walk** ($1 reveal + $3 held + capture-on-booking + release-if-never-booked + the 72h TTL) → **KIND-MASTER history**, not here. They are decisions, not roadmap.

## 4. Old Blocks 3–5 (the per-agent upgrades) — folded here, still valid, now post-managed
The 22-Jul 5-block roadmap is superseded as the *organizing frame*, but its Block 3–5 **upgrade detail survives as forward roadmap** (each queues behind the managed MVP + first paying client, founder-picked order): FIGSY multi-channel (**LinkedIn #388**, **voice/AI calling #475**) · the **Jack&Jill deepening** (#437–#443 — why-now, per-prospect memory, coaching, autonomous replies) · **Alta parity** (#475 voice · #476 unified data layer) · Milla intelligence depth (#427 + #120 pgvector) · Vida inbound engine (#429). None are managed-MVP blockers; all are how the managed service compounds into the complete product once revenue funds the hours.

# ░ 🅧 MILLA &amp; VIDA — TWO-SIDED · PARKED / SUPERSEDED (14 Jul) — kept for history ░
> **🛑 FOUNDER DECIDED AGAINST (14 Jul).** The two-sided "problem marketplace" is **PARKED** — it risked a Checkatrade-style liquidity game + a site rename, off-strategy for a hyper-focused lead product. **Verdict: one product (FIGSY — qualified leads in/out, with a brain); borrow Jack &amp; Jill *ideas* as FIGSY features, not its marketplace *shape*.** Milla → the **Brain add-on** (#427); Vida → the **Inbound-Qualification add-on** (#429, NOT a marketplace); Denise → the **Sales-Action add-on** (#428). Build path → LAUNCH-PAD "THE BUILD PATH". The original two-sided spec is preserved below as history — **do not build.**

## The model
- **Milla** = the **business side** — the *current* portal, powered by **FIGSY**, with **two lead sources** feeding one pipeline.
- **Vida** = the **demand side** — a new, free front door where a person/company **states a problem** and gets matched to a business that solves it.
- **FIGSY** = the shared engine (sourcing, matching, outreach, reasoning).
- **Why it's powerful:** the demand side is *anyone with a problem* — dentist, photographer, "cut my grass" — so the customer base broadens from B2B-only to any problem-holder. A Vida user is a **free, consented, in-market lead** (the antidote to cold/scraped lists). **Discipline: go deep in ONE vertical before serving all — a matcher that matches everything matches nothing.**

## Decisions (2026-07-11)
- **Layer onto the existing 50-page portal — no conversation-first rewrite.**
- **Spec now; build Vida after the first paying Milla client** (no supply to match against before then). Don't stall the sprint.
- **Billing:** Vida side free always. Milla pays per **accepted** Vida match (premium reveal, existing credit rails, charge-on-accept — a bad match must never auto-charge). FIGSY outbound unchanged — the **$299 pack then $4 per approved lead** *(this said "$1 reveal / $3 work", the ladder retired 24 Jul)*. No success-based billing yet.
- **Honesty guardrail (the 3,341 lesson):** never claim "a database of X problems" until counted live; sell FIGSY (real today), pitch Vida matches as *filling*, not full.
- **Success metric:** time-to-first-good-match.

## SPEC 1 — Milla (business portal · items #457–#459, #460–#462)
Three additive, preview-first changes: (1) rename FIGSY surface → "Milla, powered by FIGSY"; (2) new **Overview** home = two engines (FIGSY outbound *current* / Vida inbound *new*) → one pipeline; (3) new **"Vida matches"** bucket in the existing inbox (`leads.source='vida'`, prioritised over cold). Matcher reuses `figsy_knowledge` "pain points solved" as the match key. Vida matches never enter `lead_pool`.

## SPEC 2 — Vida (demand portal · item #463)
New, free, lightweight front door. **Look &amp; feel locked: Jack &amp; Jill's exact layout in K.I.N.D colours (`#7C3AED`/`#1E0A5C`/`#F5F0FF`), simple, not overworked.** Flow: conversational problem intake → structured brief → small **ranked** set of matches → **consent-gated** connect (intro/quote/call). Housed as a route-group in the existing app (shared auth), not a new app. Cost centre funded by Milla — LLM matching only, no PDL/Hunter enrichment on this side.

### Login &amp; profile capture (items #466–#467 · added 12 Jul, fact-checked)
Founder ask: log in via LinkedIn, capture current company as the onboarding foundation (mirrors Jack &amp; Jill's candidate flow).

- **What's real:** LinkedIn's self-serve login is **"Sign In with LinkedIn using OpenID Connect."** Verified 12 Jul — its scopes (`openid`, `profile`, `email`) return **name, email, profile photo only.** It does **not** return current employer, job title, or work history. That data sits behind LinkedIn's full Profile API, gated by their **Partner Program** — an approval relationship (mostly granted to ATS/HR platforms), not a self-serve integration. **This is a feasibility constraint, not a build task** — there is no guarantee K.I.N.D gets approved, or on what timeline.
- **What Jack &amp; Jill likely actually does:** LinkedIn login for identity/auth; the company/role detail candidates see in the inbox almost certainly comes from **Jack's own intake conversation** (candidates self-report), not a scrape of the OAuth response.
- **The persona conflict:** a mandatory LinkedIn-only gate fits the B2B/professional-services slice of Vida (a facilities manager) but works against the **consumer broadening** that's the whole point of Vida (a homeowner who wants their lawn cut has no reason to have a usable LinkedIn profile). Flagged as a genuine contradiction between two ideas from the same session, not resolved by picking one — resolved by scoping LinkedIn correctly (below).
- **Decision:** **#466** LinkedIn is **one optional login method** (alongside email/Google) for identity/trust — never mandatory, never the only door. **#467** Company/context ("who do you work for / is this for you or your business") is captured **inside the intake conversation** (#463), self-reported — works identically for a business user and a consumer, no external API dependency. **LinkedIn Partner Program access for real company-lookup enrichment stays a separate, PARKED, low-confidence line** — worth applying for, not worth planning around until approved.

## SPEC 3 — Website (item #464)
Two doors: "Find help — free" (Vida) · "Get matched demand + FIGSY" (business). One-line model: problems meet the right people; matched, consented, **no scraping / no cold-blast** (the differentiator). Business pitch **leads with FIGSY (real today)**, Vida framed as *filling* not full. Vida per-vertical SEO landing pages ("describe your [X] problem") for later demand acquisition. Pricing honest; no fabricated proof.

## SPEC 4 — Admin (item #465)
Read-only: Vida demand pool by category · match/accept rate · **time-to-first-good-match** (health metric) · "problems we solve" audit per business · Vida→Milla conversion + revenue (real-paying-only, #1073) · consent/audit trail (POPIA/GDPR) · matcher kill-switch.

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
>
> ### 🟢 THE SPEC BELOW IS GOOD. IT IS NOW LAUNCH WORK, NOT ROADMAP *(26 Jul)*
> This research held up — nothing in it needs redoing. What changed is that it is no longer "later": it is **LAUNCH-PAD Block A**, broken into buildable items. **Read the phase list below as the design; read PRODUCT-INVENTORY #547–#553 as the tickets.** The mapping:
> `BUILD PLAN 2` (the `SendingProvider` seam) → **#548** · `3` (wire the cold send per-client) → **#547** · `4` (onboarding fork / provision) → **#550** · `5` (reply capture reconciled with the unibox) → **#551** · `6` (deliverability monitoring surfaced) → **#552** · warmup + the first-send ladder → **#553** (with #198) · our own rig inside the product → **#549**.
>
> **Two founder locks that override the segmentation below** *(26 Jul)*: **① Instantly = OUR outreach, Smartlead = the CLIENTS'** — Instantly is no longer "the fallback we can't white-label", it is the rig we run our own prospecting on, **and it runs inside our own product** (*"we use our own product for us"*, no CSV hand-off). **② Non-negotiable rule 1 below — one dedicated sending domain per client, NEVER shared — is currently VIOLATED in production**: `figsy.ts:26` is a single module-level `FROM` constant, so today every client shares one Resend address. That is the violation #547 exists to close, and it is why "no inbox = no send, no silent fallback" is written into the ticket.
>
> **Still owed by the founder before #548 can be specified:** confirm the **~$40/client/month** Smartlead workspace figure (it sets the ~13-approval floor in `CASHFLOW-LAB.html`), and hand over the **Instantly credentials + whether the rig is warm**.

## ✅ Decision: INTEGRATE Smartlead (do NOT build the infra)
Researched 23 Jun (sourced). The whole funded AI-SDR market (Apollo, Outreach, Artisan, 11x) **integrates** the sending-infra layer — building it (domain provisioning, SPF/DKIM/DMARC at scale, a credible warmup network, IP rotation, reputation monitoring) is a multi-year product in itself. **Don't rebuild the hardest wheel.**
- **Smartlead = primary** — the one platform doing BOTH our modes via one API + white-label.
- **Instantly = fallback** — strong API V2 + unlimited warmup, but **NO white-label** (can't brand for SMB clients) + less programmatic provisioning.
- **Alta** (competitor) = **connect-your-own-mailbox** ("a Rep" = the client's own identity) — confirms the big-account model. *(Inferred; their help-centre blocks crawlers.)*

## The two operational models (segmented by ACV — mirrors the data strategy §13/§14)
- **A — MANAGED (SMB, low ACV):** K.I.N.D drives Smartlead **SmartSenders** → provisions + auto-warms mailboxes/domains per client (~$4–9/mailbox/mo, DNS auto-set, live 24–48h). **Bundled + marked up. Zero client setup.** *(Same spine as bundled PDL+Hunter for SMB.)*
- **B — CONNECT-YOUR-OWN (mid-market/enterprise, high ACV):** attach the client's own Google/Outlook/SMTP via `POST /email-accounts/save`. **They bring infra + BYO key.** *(Same spine as BYO-key for company/partner.)*
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
| Earns | ⛓️ **CURRENT (R47):** **$0 of the $299 · $0 on the included first 100 approvals · then 25% of paid approved-lead spend**, for the lifetime of the account while that attributed client stays active and spending. *(Historical, superseded 19 Aug: ~~20% acquisition + 5% on renewal (item 197)~~.)* | 20% land / 5% retain / 5% expansion + 5% multi-seat + 5% partner override (AE comp plan, `docs/hiring/`) |
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

# ░ 🤝 PARTNER GTM — 3–5 STRONG partners (founder-ruled 10 Jul; supersedes "10 in year 1") ░
> **Future-detail home for partner recruitment. Execution → LAUNCH-PAD; status → PRODUCT-INVENTORY (197/200).**

**⚖️ FOUNDER RULING 10 Jul — depth over volume, same as the client strategy: target 3–5 partners but STRONG, not 10 thin ones.** Sequencing: partner recruiting **starts AFTER the SPRINT finishes** (line 10 — the founder works partners personally once the machine is proven); during the sprint the only partner work is the founder quietly listing warm candidates.

**The "strong" bar (a partner must clear ALL of these — otherwise pass):**
1. **≥10 active B2B SMB clients** on retainers today (real book, not a promise)
2. **Sells outcomes** (retainers ≥~$500/mo) — used to charging for results, so $4/qualified-lead is an easy story
3. **Commits to 1 pilot client in their first 30 days** — activation is the test; signups without a pilot don't count
4. **Weekly working cadence** with the founder for the first month

**What 3–5 strong partners are worth (per §5f economics):** each ≈ ~10 clients over 1–2 quarters → **30–50 retained clients ≈ $2.4k–4k/mo at $80 conservative, $4.8k–8k/mo at the $160 Growth blend — at ~$0 cash CAC** (comp = 20% + 5% revenue-share on collected, comp-engine already built). One strong partner outperforms ~1,000 cold prospects.

**The sell to the partner:** *"Add a recurring revenue line, zero build. Your clients already trust you — FIGSY does the work, you keep 20%+5% of everything they spend, and your dashboard shows it accruing live."* Proof pack = line-9's own campaign results (K.I.N.D landed via FIGSY) + the client case studies from the first 5–10 (§5f).

**Motion (founder-led, in order):** ① list ~15–20 warm candidates (Demmy chain + own network — private intros only, stealth constraint below) → ② 15-min demo (portal + partner hub + FIGSY's own results) → ③ pilot: partner puts ONE of their clients through the product → ④ sign (partner agreement #435 — ⚠️ needs its legal sign-off before external signing) → ⑤ activate (referral code + commission tracking live in product) → ⑥ weekly cadence for month 1. **Count ACTIVATED partners (pilot client landed), not signups.**

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

> **🆕 15 Jun — ACV-SEGMENTED DATA + ONBOARDING DECISION (full detail: `run-costs-and-cashflow.md` §13/§14).** Resolved how the data model meets onboarding: **bundle data for self-serve SMB** (friction kills conversion; data is only ~2% of cost) · **BYO-Apollo key for company/partner** accounts (low-friction at high ACV, de-risks scale, fixes ToS) — but **optional, not mandatory** until Apollo's reply forces it. Onboarding routes on **seats, not headcount** (1 = self-serve / 2+ = concierge), reads firmographics off the signup domain (PDL), and runs a **14-day company trial on bundled data before any implementation ask**. New inventory build items: **174** firmographics read · **175** seat-routing · **176** 14-day trial · **177** white-glove implementation. Also locked 15 Jun: **flat pricing** (Lead Gen $20/40/100 · FIGSY $60/120/300, $1/$3 flat — item 168 reconciles Stripe+portal to these). (SUPERSEDED 8 Jul — pricing is per-qualified-lead; no trials)

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
- **[4-Aug, #610] Multi-mailbox sending (4+ boxes/client):** blocked on the frozen schema (`client_inboxes_one_live_per_kind` + `kind` CHECK). The day migrations return: ONE migration widens the index, boxes 3+4 (already warm, App Passwords saved) plug in, rotation (built in Prompt 30) simply sees more boxes. Until then: 2 boxes + the cap ladder 30→50/day ≈ the modelled ~100/day.


---

# ░ 📌 THE 25TH CUT — PARKED POST-LIVE *(moved here 21 Aug evening, founder-ordered: "if the build or the fix is not to aid the live state it moves post live")* ░

> Every item below was on the launch artifact's board and failed the one test — *does it aid the live state on the 25th?* None is forgotten; none is worked before launch. The artifact mirrors this list until the 25th, then dies; this page is the home.

## ▶ THE RUNNING ORDER *(founder-set 22 Aug, after the launch build merged)*

> **Priority is part of the record, not a preference to be re-derived later.** The founder set this order deliberately: the first two sessions after launch fix HOW HE OPERATES and HOW THE COMPANY READS, before anything new is built. Numbers 6–11 are improvements to things that now work — none is a gap in the live product.
>
> The **Parked builds** immediately below are a separate list: whole builds that already have verified prompts. They are not part of this ladder and are picked up when their day comes.

| # | Post-live work | Kind |
|---|---|---|
| **1** | **Founder-Operator OS — the operational fix** *(incl. hiring / scale triggers)* | **FIRST session after launch** |
| **2** | Website consistency / cleanup *(incl. the Milla + Vida homepage)* | Second session |
| **3** | Forecasting — the numbers we plan against, and what we track | Ongoing discipline |
| **4** | Founder economics / cashflow calculators refresh *(all three together)* | Feeds 3 |
| **5** | Cost / economics audits — Anthropic · Hunter · Stripe · Google | Feeds 4 |
| **6** | Website intelligence — later | Improvement |
| **7** | ICP / targeting evolution — later | Improvement |
| **8** | Proof / acquisition optimisation — later | Improvement |
| **9** | FIGSY evolution — later | Improvement |
| **10** | Reply / handoff evolution — later | Improvement |
| **11** | Vida / operator scaling — later | Improvement |

## Parked builds *(each already has a verified prompt in the launch artifact — reuse it when its day comes)*
- **P34's screens — PR #1427, OPEN and PARKED.** The merged half (#1426: table, routes, prompt consumers) is verified **inert** in production — the brief only reaches a prompt once a client approves one, and without the screens nobody can. Decision on merge day: merge #1427 as-is (was gate-green 21 Aug) or rebuild against then-current main.
- **P35 — the Proof Pack** (founder-only outcomes report in `vida/reports`; HTML only — no PDF lib exists).
- **P36 — Social Intent v1** (client-owned inbound; the "employer floor" term correction is already in its prompt).
- **P37 — CRM v1 — HELD** harder than parked: requires the founder to first record R-CRM-DOWNSTREAM in PRODUCT-RULES (verified absent, 21 Aug).
- **P45 — the Warm-Reply Cockpit** (upgrades the live `/milla/replies` + `/vida/unibox`; must reuse the freebusy LIB, not the two dead calendar routes).
- **P46 — the Bad-Egg Log** (alert taxonomy pinned at 9 kinds; ships WITH its nav link).

## 1. FOUNDER-OPERATOR OS — THE OPERATIONAL FIX *(the FIRST working session after launch, before any product expansion)*

⛓️ **This supersedes the one-line entry that read *"Founder-Operator OS — PR #1436, still open"*.** The PR is still open and is **not** simply to be merged: the operational fix comes first, and the PR is then judged against it.

**The purpose is not a feature.** It is to fix how the founder actually operates K.I.N.D across Notion and the tools around it — where an idea goes, who owns it, and how anyone knows what happened to it.

⚠️ **AND THE FOUNDER OS ALONE IS NOT ENOUGH — the realisation that produced the architecture below (adopted 23 Aug).** An attention layer with nothing underneath it becomes a second copy of the company: it starts holding client records, then money, then product truth, and every one of those already has a home. K.I.N.D needs **TWO LINKED LAYERS**, and the distinction between them is the whole design:

| | |
|---|---|
| **COMPANY OPERATING MAP** | the whole company — functions · systems of record · owners · key outcomes · key measures · triggers · hiring and ownership transfer |
| **FOUNDER OPERATING SYSTEM** | what the founder personally needs to pay attention to and execute **now** |

**The Founder OS is NOT the company database. It is the founder's operating and attention layer over the systems underneath.** Everything from §1b to §1k is the adopted base for that first working session — **ADOPTED, not research**: it is the model to design and implement, and it does not change the founder-set order of the ladder above it.

**The operating chain, end to end:**

`IDEA` → `RECORD` → `CLASSIFY` → `PARK / PRIORITISE` → `OWNER` → `ACTION` → `STATUS` → `COMPLETION / LEARNING`

**The property being built for** — the test any design has to pass:

> **one home · one owner · one state · one next action · one trigger · one history trail**

⚠️ **The Founder-Operator OS visual is a KEY design and operating reference, and its location needs correcting rather than repeating.** Verified 22 Aug against the merged `main`:
- **`docs/mv-previews/founder-operator-os-v8.html` is NOT on `main`.** It exists only on the **PR #1436 branch** (`claude/log-founder-operator-os`), so it lives nowhere a session starting from `main` would find it. Landing that file is part of this work.
- **`docs/design-reference/founder-operator-os-v8.png` does not exist anywhere in the repo** — not on `main`, not on the PR branch. `docs/design-reference/` holds ten website screenshots and nothing else. If the founder holds that image outside the repo, bringing it in is part of this work; recording the path as though it were already here would be the kind of sentence that reads true and is not.

### 1a. HIRING AND SCALE TRIGGERS — a core operating control, not a loose future idea

The OS must make these **operational**, not merely written down. Each is a question the founder should never have to re-answer under pressure:

- **When the founder stops absorbing a function personally** — the point at which doing it himself stops being the cheap option.
- **What actually triggers a hire** — workload, client volume, revenue, operational pressure; the threshold named in advance rather than felt in arrears.
- **Which role comes next, and why that one** — the ordering, with its reasoning attached.
- **What that person owns** — the function moving across, not a list of tasks.
- **How responsibility moves founder → owner** — the handover itself, so the founder is not the fallback owner forever.
- **The two failure modes, both explicit:** hiring **too early** (paying for capacity the work does not need) and hiring **only after founder overload** (by which point the decision is made badly, under strain, and usually late).

⚠️ The **partner and team economics the founder already uses to think about hiring live in the three calculators at #4, whose outputs are NOT canon until refreshed.** Hiring triggers and those numbers are one conversation.

**THE COMPANY OPERATING MAP IS ALSO THE FUTURE ORG CHART (adopted 23 Aug).** Today most functions in §1e read `OWNER: FOUNDER`. Later the same rows read `OWNER: CLIENT SUCCESS LEAD`, `OWNER: SALES OWNER`, `OWNER: ENGINEERING OWNER`. ⚠️ **Do not redesign the company when a hire happens — transfer ownership of a function inside the existing operating model.** A company that reorganises itself around each new person has no operating model, only a current arrangement.

**Hire on repeated evidence, never on one busy week.** The two failure modes are named above; these are the six conditions that together justify the transfer:
- a **real, durable function** exists — not a pile of tasks that happen to co-occur
- the **workload recurs** rather than spiking once
- the **founder is becoming the bottleneck**, demonstrably
- **service, response or queue quality is degrading, or visibly about to**
- the **economics support it** — evidenced from #4 and #5, not estimated
- **ownership can be cleanly transferred**, because §1e already says what the function owns


### 1b. THE OPERATING ARCHITECTURE *(adopted 23 Aug — the base for pass 1)*

```
FOUNDER / CEO
      ↓
FOUNDER OS / NOTION
attention · prioritisation · current work · ownership · next action · triggers
      ↓
VIDA   |   REPO / GITHUB   |   ACCOUNTING   |   GOOGLE WORKSPACE
      ↓
clients   |   product   |   money   |   communication
      ↓
CLAUDE / GPT help operate and review across those systems
```

**Hiring and capacity sits across the whole architecture**, watching for the moment a founder-owned function should transfer to another owner (§1a).

### 1c. THE SIX SYSTEMS, AND THE BOUNDARY EACH ONE HOLDS

The boundaries are the point. Every one of them exists because the alternative is a second copy of something that already has a home.

**1 · NOTION / FOUNDER OS — where the founder RUNS the company day to day.**
Owns: the company dashboard · `NOW` · `NEXT` · `WAITING` · `PARKED` · `RESEARCH` · `DONE / LEARNED` · owner · next action · blocked by · trigger · real due dates · operating history · company function · hiring and scale triggers · the weekly operating review.
⚠️ Does **NOT** own: a full CRM · the full customer record · the accounting ledger · a duplicate Product Inventory · a duplicate V2 · duplicate repo truth.
> **NOTION OWNS THE FOUNDER'S ATTENTION, NOT EVERY PIECE OF COMPANY DATA.**

**The Notion data model starts SMALL — two databases, and only two.**

*A. Work database.* Each actionable operating item carries: title · company function · source · classification · state · why it matters · revenue/retention/expansion/system-quality relevance · owner · next action · blocked by · trigger · **a due date only when the date is real** · source link · history and outcome. States: `NOW` · `NEXT` · `WAITING` · `PARKED` · `RESEARCH` · `DONE / LEARNED`.

*B. Company Functions database.* The ten functions in §1e, each recording: purpose · current owner · system of record · key outcome · key measures · current health · current work · hiring/ownership-transfer trigger · likely next owner when the function leaves the founder.

⚠️ **Do not create more Notion databases until real use proves they are needed.** A schema invented ahead of the work is a guess that has to be maintained.

**THE FOUNDER HOME / COCKPIT.** The default operating page surfaces, in this order — **COMPANY TODAY** (revenue · clients · acquisition · money · product · operations · risk/legal · capacity), then **YOUR ATTENTION** (the six states), then **TRIGGERS** (counsel deadline · customer follow-up · monthly finance review · hiring threshold approaching · backup drill · contract or compliance trigger · an external dependency waking up).
> **The success test: the founder knows what matters without reading the repo tree.**

**2 · VIDA — the CLIENT operating system.** Vida remains and evolves as the system of record for the client lifecycle: `PROSPECT → PROOF → OPPORTUNITY → PAID CLIENT → ONBOARDING → ACTIVE → EXPANSION → RETAINED / LOST`. It owns operational customer truth — identity · the proof journey · targeting and client state · payment and client state where already modelled · campaigns · approved leads · replies · meetings · client health · delivery activity · expansion and use · operational client economics.
⚠️ **DO NOT build a second CRM in Notion.**
> **VIDA OWNS THE CUSTOMER. THE FOUNDER OS OWNS WHAT THE FOUNDER NEEDS TO DO ABOUT THE CUSTOMER.**

*The worked example, because this is the boundary most likely to be eroded.* Vida holds: *Acme Ltd · proof completed · paid · 67/100 leads used · campaign live · 3 replies · 1 meeting.* The Founder OS holds only: *Acme — targeting mismatch needs founder call · state `NOW` · next action: call the client · trigger: client confirms correction · source: Vida / Acme.* **No duplicate CRM record anywhere.**

**3 · VIDA — MANAGEMENT FINANCE / OPERATING ECONOMICS.** Vida may become the management-finance cockpit: **revenue** ($299 onboarding · post-100 $4 lead revenue · future expansion revenue) · **spend** (PDL · Hunter · Apollo · Anthropic · mailbox and domain · Instantly · Stripe actual fees · other fixed and variable operating costs) · **unit economics** (revenue per client · sourcing cost per client · acquisition cost · gross contribution · free-proof acquisition cost · approved leads per client · post-100 usage) · **forward view** (expected revenue · expected variable spend · client count · affordability · hiring affordability · cash-pressure and runway indicators where the data supports them).
⚠️ **VIDA IS MANAGEMENT AND OPERATING FINANCE. It is NOT automatically the statutory accounting ledger.**

**4 · ACCOUNTING / BOOKKEEPING — a separate system owns the books:** real bank transactions · bookkeeping · reconciliations · tax · filed and statutory accounts · the accounting ledger itself. Vida's operating numbers should eventually **reconcile to** those actuals.
⚠️ **Do not rebuild statutory accounting inside Notion, and never present management-finance metrics as the legal books.**

**5 · REPO + GITHUB — product and engineering truth.** Owns code · Product Inventory · V2 · Product Rules · KIND-MASTER · DOC-MAP · runbooks · technical evidence · compliance evidence · PR and build history. ⚠️ **The repo is NOT the founder's daily operating interface.**
> **THE REPO HOLDS PRODUCT TRUTH AND EVIDENCE. THE FOUNDER OS TELLS THE FOUNDER WHERE ATTENTION GOES.**

*The Product Inventory / V2 boundary, stated so it cannot be misread:* **do not copy either wholesale into Notion.** Product Inventory answers *what exists and what state is it in*. V2 answers *what future work is adopted, parked or research*. The Founder Execution Queue answers *what actually gets worked next* — and only the third of those is work. A green Inventory row is **reference**. A V2 research idea is **research**. An unresolved live defect **may become `NOW`**; an adopted V2 item **may become `NEXT`**.
> ⚠️ **DOCUMENT EXISTENCE NEVER EQUALS WORKLOAD.**

**6 · GOOGLE WORKSPACE — communication and calendar reality:** email · calendar · actually-scheduled meetings · the collaboration surfaces already in use. ⚠️ It does **not** own company prioritisation, CRM, product truth or founder execution state. The Founder OS and Vida may surface relevant actions and outcomes **without duplicating Workspace data**.

**CLAUDE / GPT — workers and reviewers, never systems of record.** They may investigate · classify · reconcile · build · review · analyse · prepare evidence · help maintain the operating model. They do **not** own founder priorities · roadmap adoption · merge authority · canonical truth · client state · accounting truth. ⚠️ **The existing merge and review protocol is unchanged by any of this.**

### 1d. THE COMPANY FUNCTIONS — every founder hat, made explicit

For each function the map answers five questions: **what does it exist to achieve · where does its truth live · what numbers show whether it is healthy · what current work belongs to it · when does the founder stop owning it.**

| # | Function | Outcome it exists for | Truth lives in | Owner today |
|---|---|---|---|---|
| **1** | **Strategy / CEO** | right priorities, decisions, capital and attention allocation | Founder OS + canonical repo decisions | Founder |
| **2** | **Marketing / Growth** | qualified demand enters K.I.N.D consistently | marketing operating docs + Founder OS actions | Founder |
| **3** | **Sales / CRM** | the right prospects become paying clients | **Vida** | Founder |
| **4** | **Client Onboarding / Success** | clients reach value, understand the service, stay engaged and retained | **Vida** | Founder |
| **5** | **Delivery / Acquisition Ops** | approved leads · conversations · meetings · campaign outcomes | **Vida** | Founder |
| **6** | **Product / Engineering** | K.I.N.D works and improves deliberately, without losing coherence | **Repo / GitHub** *(Claude workflow supports execution and review)* | Founder |
| **7** | **Finance** | know what is earned, spent, affordable and scalable | Vida operating finance + accounting actuals | Founder |
| **8** | **Legal / Compliance / Risk** | commercial and legal obligations are visible, triggered and controlled | repo legal/compliance evidence *(counsel provides external legal support)* | Founder |
| **9** | **People / Capacity** | hire when the function is real and the economics justify the transfer | Founder OS + operating metrics + finance evidence | Founder |
| **10** | **Company Knowledge** | truth is findable **without** documents becoming the daily operating interface | DOC-MAP + the canonical repo *(holds the knowledge architecture)* | Founder |

⚠️ **ONE ACCOUNTABLE OWNER PER FUNCTION — SUPPORT IS NOT CO-OWNERSHIP.** Three rows above first read *"Founder + the Claude workflow"*, *"Founder + counsel"* and *"Founder / repo architecture"*, which contradicted the property this whole design is built on (§1j): **one owner**. Two names in an owner field is not a shared responsibility, it is an unassigned one — and the moment something goes wrong, neither name is answerable. Corrected, and the supporting relationships kept where they belong:

- **Product / Engineering** — the **founder owns it**; the **Claude workflow supports** execution and review. Claude is a worker and reviewer, never a system of record or an owner (§1c).
- **Legal / Compliance / Risk** — the **founder owns it**; **counsel provides external legal support**. External expertise advises; it does not carry the obligation.
- **Company Knowledge** — the **founder owns it**; **DOC-MAP and the canonical repo hold the knowledge architecture**. A system of record stores truth; it cannot be accountable for it.

Every function above therefore has exactly **one accountable owner**, and today every one of them is the founder — which is the honest picture of a single-founder company, and precisely what §1a's ownership transfer is designed to change one row at a time.

Measures worth recording where they apply: marketing — prospects · replies · proof starts · CAC · channel yield. Onboarding/Success — activation · time-to-value · proof-to-paid · retention · response time.

### 1e. DOC-MAP BECOMES THE SOURCE REGISTRY

⚠️ **The first post-launch reconciliation starts from DOC-MAP — not from reading V2 top to bottom.** Every mapped document and folder gets one classification:

| | Class | What it can produce |
|---|---|---|
| **A** | **EXECUTION SOURCE** | may contain current actionable work — LAUNCH-PAD · adopted V2 items · unresolved Inventory items · current marketing actions · legal and commercial deadlines · active runbooks |
| **B** | **GOVERNING TRUTH** | defines rules and decisions; **does not automatically create work** — PRODUCT-RULES · KIND-MASTER decisions · frozen strategy |
| **C** | **EVIDENCE / SYSTEM REFERENCE** | proves how something works; **creates work only when it reveals an actual issue** — CORE-MAP · schema drift · ENVIRONMENT · compliance evidence |
| **D** | **HISTORY / ARCHIVE / FROZEN** | context from the past; **never creates work unless deliberately revived** — artifacts · archive · superseded docs · historical bundles |

> 🛑 **HARD RULE: DOCUMENT EXISTENCE ≠ WORK.**

### 1f. RUNBOOKS ARE DORMANT UNTIL THEIR TRIGGER FIRES

A runbook that is visible every day is noise every day. Each one sleeps until its trigger: **SEND-DAY-RUNBOOK** → send day / the first-send event · **BACKUP-RESTORE-DRILL** → the scheduled monthly drill · **LEGAL / COMPLIANCE ACTION** → counsel response · customer request · filing date · incident · contract milestone. **The Founder OS surfaces the triggered action, never the dormant runbook.**

### 1g. THE FOUNDER EXECUTION QUEUE — what gets worked next

1. **live risk** — customer failure · money · sending · data
2. **customer obligation** / retention risk
3. **revenue-producing work already committed**
4. **expansion · capacity · revenue growth**
5. **material system improvement**
6. **everything else stays parked or research**

A **dependency may move an item upward** when it unlocks several more important items. ⚠️ **Nothing enters the queue merely because it exists in Inventory, V2 or any other document — it must first be classified as actionable.**

### 1h. HOW THIS GETS IMPLEMENTED — five passes, in order

**PASS 1 — DESIGN THE OPERATING MODEL.** Founder + GPT discussion first. Finish and challenge the visual Company Operating Map, then walk it against real scenarios: the founder has an idea · a client complains · Claude returns a PR · a payment or cost changes · a legal item appears · a partner needs action · a task blocks · a product defect appears · a research idea appears · a hiring threshold approaches. ⚠️ **Do not build until the model makes sense to the founder.**

**PASS 2 — BUILD THE NOTION SHELL, BY HAND.** Only the base: the Work database · the Company Functions database · the founder dashboard and views · triggers and reviews. **No heavy automation.**

**PASS 3 — RECONCILE THE EXISTING COMPANY.** A Claude **READ-ONLY** sweep beginning at DOC-MAP, classifying the corpus into actionable · governing truth · evidence/reference · history/archive · research, and extracting **only genuine current actions**. GPT reviews independently; the founder decides only the genuinely ambiguous priority and adoption questions; the Founder OS is seeded with real current company state. ⚠️ **Do not import the repo into Notion.**

**PASS 4 — MAP VIDA PROPERLY.** Audit what Vida already holds for CRM · prospect and client lifecycle · onboarding · delivery · replies · meetings · client economics · operational finance, and identify the genuine gaps. ⚠️ **Do not rebuild existing capability just because the operating model is new.**

> #### 🔴 KNOWN GAP CARRIED INTO PASS 4 — ABANDONED SIGNUP HAS NO VIDA RECORD *(founder-accepted 24 Aug, at launch)*
>
> **Accepted launch behaviour, decided knowingly.** The 24 Aug first-run change made authentication the only thing that happens before a client enters K.I.N.D: Milla collects the account facts conversationally, and the `clients` row is written at the moment the client confirms her understanding. A consequence follows directly from that, and the founder accepted it rather than papering over it:
>
> **Someone who signs up, enters Milla and leaves before confirming remains an auth user with no `clients` row — so that person does not appear in Vida at all.** Previously they would have left a half-filled row behind, because the old `/onboard` form wrote one before they had entered the product.
>
> **What this means, plainly:** abandoned-signup visibility and follow-up are **incomplete**. We cannot see, count, chase or learn from the people who signed up and stopped. Whatever that number is, today it is invisible.
>
> ⚠️ **Do NOT solve this by inserting a partial or placeholder `clients` row.** The founder ruled it out by name: no invented company name, no placeholder country (the table defaults `country` to `'South Africa'`, which is precisely the silent fiction being refused), and no weakening of the required fields to let a half-finished signup through. A record that exists only to be visible is a record that lies about a customer.
>
> **What Pass 4 must decide:** the proper representation of a **prospect who is not yet a client** — whether that is a distinct prospect concept, a lifecycle state, an auth-side view, or something else entirely. That is a CRM-model question, and it belongs to the Vida audit, not to a launch patch.
>
> **This is NOT a launch blocker.** It is recorded here so it is a decision waiting to be made rather than a discovery someone makes later by wondering where the signups went.

**PASS 5 — AUTOMATE ONLY PROVEN MOVEMENTS.** Use the system manually first. Then consider automating the movements that proved useful — client risk → founder action · PR merged → work-state update · counsel response → a `WAITING` item wakes · monthly finance snapshot → review trigger · hiring threshold → capacity warning. ⚠️ **No clever automation before the manual model works.**

### 1i. DO NOT ADD SOFTWARE FOR THE SAKE OF IT

⚠️ **Do not assume K.I.N.D needs Salesforce · HubSpot · Jira · Monday · Asana · ClickUp · another finance dashboard · another CRM** simply because companies often have them. Use the systems already present wherever one can genuinely own the function. If evidence later shows a system cannot do its job, alternatives are researched under the adoption filter — not adopted because they are familiar.

### 1j. SUCCESS CRITERIA — how we know the redesign worked

- the founder opens **one operating page** and knows what matters
- the founder **does not read the repo tree** to discover work
- every actionable item has **one home · one owner · one state · one next action · one trigger**, and **links back to its real source and history**
- **client truth is not duplicated outside Vida**
- **product truth is not duplicated outside the repo**
- **statutory accounting truth is never confused with management finance**
- **research cannot silently become roadmap**
- **dormant docs and runbooks do not create noise**
- **hiring triggers become visible before overload**, not after it
- **a new team member can inherit a function without the operating model being redesigned**

This preserves, rather than replaces, the property already settled above: **one home · one owner · one state · one next action · one trigger · one history trail.**

### 1k. THE CENTRAL OPERATING RULE

> ## **THE UNDERLYING SYSTEMS HOLD THE TRUTH. THE FOUNDER OS TELLS THE FOUNDER WHERE ATTENTION GOES.**

> 🛑 **AND AFTER THE OPERATIONAL REDESIGN, THE FOUNDER MUST NOT NEED TO INSPECT THE REPOSITORY TREE TO DISCOVER WHAT WORK EXISTS.**

## 2. WEBSITE CONSISTENCY / CLEANUP *(second session after launch)*

**The site is already strong. This is not a redesign, and it is not pre-launch work.** The goal is that it reads as **one coherent company and one coherent product** rather than pages written at different times.

One end-to-end pass covering: **messaging · terminology · page structure · tone · visual hierarchy · CTA language · pricing and product explanation · the Milla description · the Vida description · the K.I.N.D description** — every one of them checked against the **settled launch product model**, not against an earlier era.

### 2a. HOMEPAGE — MILLA + VIDA, SIDE BY SIDE *(J&J-style)*

The main homepage concept: the two as the **paired core system**, shown together rather than as separate features.

- **Milla** learns the client — their business, their core ICP, their campaign intent.
- **Vida** is how K.I.N.D operates and delivers the work.

This belongs to the consistency pass and comes **after** the operational fix, not before it.

## 3. FORECASTING *(the numbers we plan against — and what makes them real)*

⚠️ **EVERY NUMBER BELOW IS A WORKING PLANNING ASSUMPTION, NOT PROVEN K.I.N.D TRUTH.** They are written down so planning has a starting point and so that later, when real data disagrees, the disagreement is visible instead of quietly reinterpreted.

**Contact volume per paying customer**
- **Initial planning assumption: ~250–400** properly targeted prospective customers contacted per paying K.I.N.D customer.
- **Stronger target once the proof motion is working: ~100–200** prospects per paying customer.

**Acquisition rate**
- **2–5 new paying clients / month** — realistic early acquisition.
- **5–10 / month** — very good early performance.
- **10–15 / month** — strong evidence the proposition and the acquisition motion are working.
- **Initial operating target: prove 5 paying clients / month, consistently.**

**Free-acquisition economics** *(as fenced by AR17/AR18, live in the code from 22 Aug)*
- **$300 / month** free-acquisition PDL budget, separate from paid delivery.
- **PDL $0.28** per sourced external record.
- **Max 40 PDL records** per unpaid proof prospect.
- **Therefore max $11.20 PDL exposure** for a full two-pass proof prospect.
- **Pool-first can reduce the actual cost** — owned records cost $0 and never touch the 40.

**Paid-client principle.** As paying customer volume proves the economics, the founder **deliberately raises funded acquisition and sourcing capacity**. The current ceilings are safety while the model is unproven — they are **not permanent caps**, and nothing raises them automatically.

### 3a. THE RULE THAT DECIDES WHICH NUMBER WINS

> **Industry benchmarks inform planning. K.I.N.D's own observed funnel data becomes the primary evidence as soon as enough real data exists — and an external benchmark must never silently replace it.**

### 3b. WHAT WE TRACK *(K.I.N.D's own funnel — the primary evidence)*

prospects contacted · meaningful replies and conversations · proof starts · **proof pass 1 outcomes** · refinements · **proof pass 2 outcomes** · **$299 conversions** · prospect → paid conversion · acquisition spend per customer · **PDL cost per customer** · approved leads per client · **post-100 $4 lead usage** · retained and active customers · monthly new customers.

### 3c. MONTHLY INDUSTRY BENCHMARK TRACKING *(the secondary evidence)*

Track monthly, and compare month on month: **cold email reply rates · meeting booking rates · follow-up contribution · sales close rates · prospect-to-customer conversion · major outbound trend changes.**

Translate any meaningful change into what it implies for K.I.N.D's forecasting — and write the translation down, so a moved benchmark never arrives as an unexplained new assumption.

## 4. FOUNDER ECONOMICS / CASHFLOW CALCULATORS REFRESH *(one job, all three together)*
⚠️ **Their current outputs are NOT canon until this is done — including the partner model the founder has already used to think about hiring.**
Refresh **[`hiring/KIND-AE-commission-calculator.html`](./hiring/KIND-AE-commission-calculator.html)**, **[`hiring/KIND-partner-calculator.html`](./hiring/KIND-partner-calculator.html)** and **[`hiring/KIND-team-pnl-calculator.html`](./hiring/KIND-team-pnl-calculator.html)** **together**, against verified current economics: **$299** onboarding package · **first 100 approved leads included** · **$4** thereafter · **$8/client/month** inbox + domain · **Instantly $37/mo as a FIXED company-wide warm-up cost, never per client** · **Smartlead dormant — the stale $45/client month-one assumption removed** · **PDL $0.28/record** · **free-proof acquisition economics (40 records / $11.20 per prospect, $300/mo ceiling)** · preview economics · **Hunter UNKNOWN** where unverified · **Anthropic UNKNOWN** where unverified · **Stripe actual / variable fees read from Stripe's own reporting — never a guessed fixed percentage** · fixed vs per-client costs kept apart · partner commission and share economics.
Refreshed together because they share inputs: correcting one and not the others is how the $45 Smartlead line survived inside the $299 cost basis while `cost-floor.ts` already said Smartlead was $0.

## 5. COST / ECONOMICS AUDITS *(what turns the UNKNOWNs above into numbers)*
Post-live, verify and model each properly — every one of these currently sits in a calculator as an estimate or a blank:
- **Anthropic / Claude real operational cost** — call sites · models · `max_tokens` · call frequency · retries · logging · caching · batching and streaming · **live vs dead paths** (a call site nothing reaches costs nothing, and counting it inflates the floor).
- **Hunter — the exact K.I.N.D usage pattern.** Finder, Verifier, or both. The plan is known; which endpoints we actually consume is not.
- **Stripe — actual and variable reporting**, read off the dashboard, rather than the guessed flat percentage the calculators currently carry.
- **Google / mailbox — reconcile the separate ~$28 charge** against the $8/client/month figure the model uses.

### 6–11 — parked improvements *(from the 22-Aug launch-coherence build, #700 · AR17/AR18)*
*Everything below was deliberately cut from the free-proof and Milla-understanding work so the 25th could hold. Each is an improvement to something that now WORKS, not a gap in it.*

**6. WEBSITE INTELLIGENCE — LATER**
- **Website intelligence beyond targeting.** `/icps/prefill` reads the site once, takes the first 3,000 characters, proposes ICP fields and stores nothing. It informs WHO we find, never WHAT we say. Deeper reading — product detail, positioning, proof — is post-live.
- **Case-study and testimonial extraction.** Proof reaches FIGSY only when the client states it and permits it. Pulling named customers or metrics off a website automatically needs the permission conversation designed first; the flag exists (`proof[].permitted`), the extractor does not.
- **Automated contradiction detection** — noticing that what a client says now disagrees with what they said before, or with their site.

**7. ICP / TARGETING EVOLUTION — LATER**
- **ICP version history** — which ICP version sourced which leads is not recorded.
- **Multiple ICPs and multiple live campaigns.** Launch is one core ICP → one active campaign → one motion, enforced at activation. Orchestrating several is a product expansion.
- **Richer negative targeting.** There is still **no exclusion field of any kind** in the ICP: no excluded companies, titles, industries or domains. A client's *"anyone except our existing customers"* has nowhere to go. `bad_fit` is captured as prose for a human to read, and no filter applies it.
- **Richer geography** — country is the only unit. *"Manufacturers in the Midlands"* becomes *United Kingdom*.
- **Job-function and company-type targeting** — neither is expressible in the five fields the engine actually targets on.

**8. PROOF / ACQUISITION OPTIMISATION — LATER** — ⚠️ the launch rule **20 → one refinement of the SAME core ICP → 20 → a human** does NOT change now; this is about learning from real data whether it should ever evolve.
- **Proof conversion analytics · trial scoring · automated "materially wrong" detection · adaptive proof-batch sizing · deeper acquisition learning · acquisition-cost optimisation.** The free-proof motion ships with human judgement deciding whether a second pass missed. Measuring and automating that judgement is the post-live work; the founder ruled human operation acceptable at launch.

**9. FIGSY EVOLUTION — LATER**
- **Regeneration of frozen sequence copy.** Copy is written at enrolment and kept. Change the campaign intent or the grounding afterwards and already-enrolled leads keep their original wording, including unsent steps 2 and 3. Safe at launch because the reflect-back summary happens before enrolment — but there is no rewrite action.
- **Operator copy editing.** Vida can Release or Reject a queued draft. It cannot edit the words or ask for a rewrite.

**10. REPLY / HANDOFF EVOLUTION — LATER** — ⚠️ launch stays: any reply stops the sequence · Claude classifies · FIGSY never auto-replies · a K.I.N.D human takes over.
- **Autonomous reply handling and reply orchestration.** Any reply stops the sequence and a person takes over. FIGSY never auto-replies, never negotiates, never promises, never discounts — and that stays true until it is deliberately changed.
- **Advanced automated outcome handoff.** The client gets context with their meeting because a person writes it. Automating that is post-live.

**11. VIDA / OPERATOR SCALING — LATER** — deeper operator tooling · review and readiness improvements · complex readiness scoring · scaling the human operating layer · Founder-Operator OS evolution, AFTER the first operational fix at #1.
- **Operator scaling automation** — everything above assumes the founder is the operator.

### Smaller parked items *(from the 21-Aug cut — each is small, none is urgent)*
- **W1 phases 2–3** — the other 23 site pages · the Drop's 4:3 crop risk · the Nexus sub-brand-or-converge decision.
- **Welcome-transcript capture** (P34 follow-on; own privacy surface).
- **The brief-message removal control** (one stale "3 prospects" line sits in the founder's own thread; O3 forbids a hand delete).
- **The email morning-brief's two defects** — `en-ZA` date locale (contradicts R62) and its button pointing at the retired `/dashboard`.

## Cleanups from the 21-Aug full-system verification *(zero broken clicks found; these are the two structural findings)*
- **Retire or fence the old `/dashboard` page family** — fully functional, reachable only by typed URL since login redirects to `/milla`; it is the layer that keeps misleading build prompts (the figsy-chat near miss).
- **Review the ~40 orphan endpoints** no screen calls (`scripts/dead-surfaces.sh` is the catalogue; webhooks/cron rows are legitimate).

---

## 💡 23 AUG — POST-LAUNCH PRODUCT IDEAS / RESEARCH BANK

> **These are ideas to research, discuss and challenge after launch. Logging an idea does not adopt it. Interesting does not mean roadmap. External success does not make something right for K.I.N.D. The founder must explicitly decide whether an idea is adopted or rejected.**

⚠️ **THIS IS NOT THE NUMBERED LADDER ABOVE, AND MUST NEVER BE READ AS AN EXTENSION OF IT.** Nothing in this bank has a priority, a date, an owner, an approved build or an automatic follow-on. The ladder at 1–11 is committed work in a founder-set order; everything below is **research only**. An entry here appearing next to a committed item is a coincidence of the page, not a claim about its importance.

### The decision filter — how anything here becomes work

> **RESEARCH → DISCUSS → CHALLENGE → FILTER THE NOISE → THE FOUNDER DECIDES: ADOPT OR REJECT**

A future change must earn its place through a **material** improvement in at least one of:

| | |
|---|---|
| **REVENUE** | it makes money, or makes money more likely |
| **RETENTION** | clients stay who would otherwise leave |
| **EXPANSION** | existing clients justifiably spend more |
| **SYSTEM QUALITY** | the system is genuinely better, not merely different |

**If it does none of those, it stays research.** ⚠️ And *"system quality"* is **not a loophole for cosmetic churn** — a redesign that changes how something looks without changing what it does has not earned anything.

---

### 1. CALENDAR / MEETINGS

**1.1 Calendar connection is hidden in Settings — NOT ADOPTED.**
Observed: the integration exists, and a brand-new client may never learn they need to go and find it. Idea to research: surface Calendar connection contextually **from the Meetings area as well**, with Settings remaining the deeper configuration home. The underlying hypothesis is the general one: *if a feature is important to getting value from K.I.N.D, the client should not have to know where we hid it.*

**1.2 Keep the Meetings list, and explore a calendar view beside it — NOT ADOPTED.**
⚠️ **Record no assumption that the list view should be replaced** — it is useful. The idea is a proper visual calendar **alongside** it, with familiar patterns (Google Calendar) as *inspiration, not something to copy literally*. Views to research: day · week · month. The questions that would decide it: does it make booked meetings easier to understand · does it make K.I.N.D's outcome more tangible · does it improve engagement with the Meetings area?

**1.3 Meetings as an outcome surface — NOT ADOPTED.**
Research whether Meetings should become one of the clearest places a client sees **K.I.N.D activity → real conversation → booked meeting**. The aim would be to make acquisition outcomes *visible*, rather than making Meetings feel like another admin screen.

### 2. GUIDED NEW-CLIENT ONBOARDING — NOT ADOPTED

Founder observation: a new starter should not be expected to discover every important panel, button and workflow themselves.

⚠️ **Do not record this as a traditional product tour.** The stronger concept is **USE REAL PRODUCT ACTIONS TO GET THE CLIENT OPERATIONAL** — the onboarding should make the important actions actually happen, not point at controls.

A journey to research: meet Milla → tell Milla about the business → confirm what Milla understands → see who Milla finds → react to proof → connect Calendar → understand Meetings → complete required setup → understand what K.I.N.D GO means → become operational.

Research goals: reduce setup abandonment · make hidden functionality discoverable · start the important Milla conversations · reach proof faster · improve activation, comprehension and retention · ensure the client experiences the product's real journey.

⚠️ **Do NOT turn this into a hard technical gate.** Whether steps are required, optional or skippable is a **future founder decision**, not something this entry settles.

### 3. GLEAN.COM — RESEARCH AND INSPIRATION, NOT AUTHORITY

⚠️ **Glean is an external product reference and nothing more. It is NOT roadmap authority, and "copy Glean" is not recorded anywhere in this bank.** K.I.N.D is a different company, product and market.

The transferable question: **what can K.I.N.D learn from a product that carries substantial complexity underneath while keeping the user-facing experience relatively simple?**

Central hypothesis to research: **THE CLIENT SHOULD FEEL THE OUTCOME, NOT THE MACHINERY.** K.I.N.D already has considerable machinery — Milla · Vida · PDL · Apollo · Hunter · scoring · proof fences · money gates · campaign state · FIGSY · SMTP · reply classification · review queues · human controls — and the client should not need to understand any of it.

**3.1 Context as a possible moat — NOT ADOPTED.** Research whether Milla's accumulated understanding of a client becomes an **enduring context layer** rather than disposable onboarding information: business understanding · core ICP · targeting · FIGSY grounding · campaign intent · permitted proof · reply context · meeting context · future campaign learning. ⚠️ **Permission boundaries remain mandatory — Milla may know more than any downstream feature is permitted to use.** The thought worth testing: models and providers change; high-quality accumulated understanding of a client may prove more durable than either.

**3.2 One obvious front door — NOT ADOPTED.** Explore whether Milla increasingly feels like the natural way in: talk → understand → recommend the next meaningful action → move into the real workflow. ⚠️ Guard: **do not turn Milla into a configuration dashboard.**

**3.3 Stage-aware home / next action — NOT ADOPTED.** Explore whether the client experience should know where the client is and surface the most meaningful next action. *Examples only, not copy:* continue telling Milla about your business · confirm what Milla understands · see who Milla found · tell us what is not a fit · connect your Calendar · complete your setup · your campaign is waiting for K.I.N.D review · your first meetings are here. The deciding question is the filter's: does it improve activation, comprehension, retention or revenue?

**3.4 Guided real onboarding — NOT ADOPTED.** Cross-references §2. The research lesson: people may understand a product better by **accomplishing real work** than by completing a button tour.

**3.5 Meetings as visible value — NOT ADOPTED.** Cross-references §1.2 and §1.3. Research whether Meetings can become a clearer proof surface for the outcome K.I.N.D creates.

**3.6 One continuous journey.** Review future UX friction across the whole chain: Milla conversation → business understanding → ICP → proof → feedback → payment → campaign readiness → K.I.N.D GO → outreach → replies → meetings → learning. Unnecessary transitions and disconnected workflows are research points. The goal to investigate: **one coherent acquisition journey rather than several disconnected mini-products.**

**3.7 Progressive disclosure.** Explore keeping the machinery underneath while exposing complexity only where it is genuinely useful. An ordinary client should not normally have to operate or understand: provider routing · PDL vs Apollo vs Hunter · SMTP infrastructure · scoring implementation · money fences · internal review queues · model selection · infrastructure controls. The principle to test: **the client talks naturally about their business; K.I.N.D operates the complexity.**

**3.8 Human-in-the-loop as a strength.** Research supports treating governance and human judgement as *positive* product qualities — which aligns with what K.I.N.D already does: the client contributes and corrects · Milla learns · K.I.N.D owns GO · humans own judgement-heavy work. ⚠️ **This entry changes no current control rule.** It is recorded as support for the philosophy, not as licence to loosen or tighten anything.

**3.9 Visible value / proof.** Explore making genuine K.I.N.D evidence increasingly visible — once genuinely observed: prospects contacted · proof starts · proof → paid conversion · approved leads · replies · meetings · time to first qualified conversation · acquisition cost · lead cost · client outcomes where permission exists. ⚠️ **Never invent proof. Never use a customer name, testimonial, case study, metric or outcome without permission** — the same rule the product already enforces at `proof[].permitted`.

**3.10 Same context across capabilities.** Explore avoiding isolated intelligence silos: business understanding → targeting → FIGSY → replies → meetings → campaign learning → future campaign. The question: can future capabilities **strengthen one accumulated understanding** rather than each starting from zero?

**3.11 Website — lead with the proposition, not the plumbing.** Research input for the committed website-consistency work at **#2 in the ladder above** — input, *not* an approved website change. A hierarchy worth testing: what K.I.N.D understands → what K.I.N.D does for the client → the outcome → the evidence → technical depth underneath, for buyers who want it.

**3.12 Website — real product visuals.** Explore using real, controlled product moments rather than generic AI/SaaS artwork: Milla learning → masked proof → client feedback → campaign readiness → Vida operating → meeting booked. ⚠️ Feeds the future Milla + Vida homepage discussion **only if adopted**.

**3.13 Proof architecture.** As K.I.N.D earns real evidence, research whether measurable outcomes should become a stronger storytelling layer in the product and on the site. ⚠️ **Use K.I.N.D's real evidence.** Industry benchmarks may contextualise; they must never substitute for K.I.N.D data — the same rule already set at **#3b/#3c** in the ladder.

**3.14 Start narrow; expand only from the core loop.** ⚠️ **Critical guard: do NOT read another company's feature breadth as a reason to add features.** The core loop is: understand the business → identify the right people → prove fit → the client commits → K.I.N.D operates → conversation / meeting → learn. **Any future expansion must earn its place against that loop.**

**3.15 Land and expand — depth in an existing client.** Once K.I.N.D genuinely works for a client, research whether more value comes from deepening that relationship: more approved leads · additional campaigns · additional audiences · different outcomes · geography · business units · deeper acquisition operation. ⚠️ **None of these is an approved build. Customer behaviour and economics must pull K.I.N.D there** — the pull is the evidence, not the idea.

**3.16 K.I.N.D runs on K.I.N.D.** Use K.I.N.D's own acquisition operation as a learning laboratory: what targeting works · what proof converts · what messaging works · where prospects hesitate · what consumes operator time · what may deserve future automation. ⚠️ **Internal dogfooding is useful learning evidence. It is not automatically customer proof**, and must never be presented as such.

**3.17 Visible product momentum.** Explore whether a simple periodic explanation of meaningful improvements helps adoption and discoverability. ⚠️ **Do not commit to monthly releases, a fixed cadence or high-volume updates — and never create change merely to demonstrate activity.**

**3.18 Work where the user already is.** Longer-term research: some K.I.N.D actions or outcomes may eventually be better surfaced inside the tools a client already uses — Calendar · Meetings · email · other workflows. ⚠️ **Logging this authorises no integration build.**

**3.19 WHAT NOT TO COPY — recorded explicitly, because the temptation is the point.** K.I.N.D should **not** automatically adopt: enterprise platform complexity · exposed model selectors · agent marketplaces · customer-built workflow engines · giant admin consoles · deep technical configuration · integration quantity for its own sake · high release volume for its own sake. **K.I.N.D must remain K.I.N.D.**

**3.20 Complexity caution.** More capability also buys: slower interfaces · harder configuration · inconsistent behaviour · feature overload · lower adoption. The principle to test: **simplicity may need to be a hard product constraint rather than a design preference.**

### 4. OBSERVED LIVE — MILLA'S "LOST THAT RESPONSE" APPEARS, THEN THE ANSWER ARRIVES ANYWAY

⚠️ **THIS IS NOT AN IDEA. It is a defect observed on a real journey, logged here because this is the post-launch home and it is not a launch blocker.** Sections 1–3 above are research; this one is a thing that happened. Do not read "NOT ADOPTED" onto it — nothing has been decided, and no fix is approved.

**Observed (25 Aug, live Milla onboarding/chat).** The chat displayed *"Milla lost that response — please send your last answer again."* — and the response then appeared to recover on its own, with no resend from the user.

**Why it matters.** The sentence asks the client to act at the exact moment the system is recovering by itself. During onboarding that is confusing at best; at worst the client resends and the same answer is submitted twice, which nobody has yet checked is harmless.

**What is known.** The message is one server response — `millaReplyFailed()` in `apps/api/src/routes/icps.ts`, a `503` with `retryable: true`, raised for six categories of unusable model reply (`TRUNCATED · UNEXPECTED_STOP · NO_TOOL_CALL · MULTIPLE_TOOL_CALLS · WRONG_TOOL · INVALID_SHAPE`). **What is NOT known is why the answer then appeared without a resend** — nobody has yet established whether something retried, whether a slower response landed late, or whether the client's screen simply caught up.

**Questions an investigation would have to answer, none of them settled here:**
- What actually recovered it — a retry, a late response, or the UI?
- Does the error state CLEAR correctly once the answer arrives, or does the sentence sit under a reply that already worked?
- Is a resend at that moment SAFE, or can the same answer be submitted twice?
- Should a `retryable: true` failure be surfaced to the client at all before the recovery path has been given its chance?
- Is the copy honest? It says *"lost"* about something that was not, in this instance, lost.

⚠️ **Classification: post-launch UX / reliability debt. NOT a launch blocker (25 Aug).** ⚠️ **Nothing here authorises a change to the chat, the retry behaviour or the copy.** The decision filter above applies unchanged: the founder decides whether this becomes work. 🤖


### 5. OBSERVED LIVE — PASS-2 DESK DEBT, AND TWO AUDITS NOBODY HAS RUN

⚠️ **AS WITH SECTION 4, THESE ARE NOT IDEAS.** They are things seen or established during the 25 Aug launch journey and filed here because they are not launch blockers. Nothing is decided; the decision filter above applies.

**5.1 The "What's off about this batch?" control is tiny and disconnected.** Observed on the proof desk: the refinement control that drives the entire pass-1 → pass-2 journey reads as an afterthought next to the cards it refines. Related debt seen in the same sitting: the **Milla / lead-grid split** makes it unclear where the conversation ends and the batch begins, **Latest / Earlier set** labelling needs to be unmissable rather than a small heading, and the **Milla right panel sizing/layout** does not hold its proportions. ⚠️ **All four are presentation. None changes what the server does**, and the pass-2 fences behind them are separately guarded.

**5.2 Duplicate-submit and recovery behaviour.** Chains **4** above: if the client resends after a "lost that response", is the same answer submitted twice, and does anything deduplicate it? Unestablished.

**5.3 Incident-specific Hunter credit audit — NOT DONE.** The historical free-proof incident should have consumed no Hunter credit (proof deliberately never enriches), but nobody has read the Hunter account to confirm it. ⚠️ **An assumption is not an audit** — the point of the line is that it is unverified.

**5.4 PDL within-run backfill — an open economic question.** When a run's returned records are thinned by the client gates, should the run buy more to reach the cap, or deliver short? Both answers cost something: buying more spends the fence, delivering short gives the client less than the run was authorised for. **No decision has been taken and none should be inferred.**

**5.5 PDL skip / rejection instrumentation.** `skipped` is counted in `runIcpJob` and never written to `icp_run_outcomes`, so when a run returns records and inserts none, **nothing records WHICH gate ate them** — budget cap, suppression, blocklist, this-client duplicate or insert failure all look identical afterwards. Directly related to **R67**'s retention work.

**5.6 Willingness-to-pay and value perception.** Feeds the commercial pack (LAUNCH-PAD § BEFORE FRIDAY'S PARTNER MEETING, M5/M6) as evidence. ⚠️ **Research only — PR1's $299 lock stands until the founder rules on the evidence.**

⚠️ **Classification: post-launch debt and research. None of it is a launch blocker (25 Aug).** 🤖


### 6. COMMERCIAL SHAPE — TWO THINGS DISCUSSED THAT HAVE NO HOME ANYWHERE ELSE

⚠️ **IDEAS, NOT DECISIONS.** Both were raised in the 25 Aug commercial conversation and neither is logged in any current doc. 🏷️ **POST-LAUNCH IDEA / REVIEW ITEM.** ⚠️ **PR1's $299 lock stands** — nothing here changes price, and the decision filter at the top of this bank applies unchanged.

**6.1 Should Milla recommend a VOLUME and a SPEND, not just a targeting?** Today the client tells Milla who to reach and the money conversation happens elsewhere — `sales-playbook.md` maps recommended volumes for a *human* seller, and the product does not. The idea is that Milla, having just proved she can find this client's people, is the natural place to say *"for what you want, this is roughly the volume and roughly the monthly spend"*. ⚠️ **Every open question is open:** whether a recommendation from the system reads as help or as an upsell · whether being wrong about it damages the trust the proof just built · what it would be computed from · whether it belongs in the proof desk or in billing. **Nothing is designed, nothing is approved.**

**6.2 The long-term move away from a flat $299 entry.** Raised as a direction, not a plan: the $299 pack plus $4-per-approved-lead is right for launch, and the founder's own framing was that it is not necessarily the shape of the business in a year. ⚠️ **This is not a pricing proposal and must never be cited as one.** What it is: a standing instruction that the pricing model gets **re-examined against real unit economics and real willingness-to-pay evidence** once there is data — the evidence for which is being gathered as **M5/M6** in the LAUNCH-PAD commercial pack. ⚠️ **A change to price is a founder ruling and a PR1 chain, and neither has happened.**

**6.3 CRM REACTIVATION — the client's own dead pipeline as a lead source.** With the client's **explicit permission**, K.I.N.D may later use their CRM as a source: **closed-lost · dormant · stale opportunities**. K.I.N.D **revalidates** whether the opportunity deserves a new campaign before anything is enrolled. ⚠️ **Why it matters economically — stated structurally, because the absolute version is not true.** The client **already owns the source CRM identity**, so **K.I.N.D does not incur the ORIGINAL provider acquisition cost** for it. ⚠️ **That is NOT the same as a zero-cost lead, and no zero-cost rule exists.** Revalidation, enrichment, work/AI, sending and other processing **may still cost money**, and none of it has been measured. The lever is *"one cost category is removed"*, never *"this lead is free"*. ⚠️ **PRICING IS NOT DECIDED and must not be inferred:** same **$8 target rate**, or a **reduced reactivation rate**. Neither has been chosen. ⚠️ **Suppression, opt-out and DNC rules always apply** — a dead opportunity is still a person, and permission from the client is not consent from the prospect.

**6.3b CRM SUPPRESSION / ADVISOR INTELLIGENCE.** The same permissioned CRM connection that makes **6.3** possible also tells K.I.N.D who **must not** be contacted — existing customers, live opportunities another team already owns, accounts in dispute, anyone the client has their own reason to protect. ⚠️ **This is a safety lever before it is a margin lever:** emailing a client's own live account as if it were a cold prospect is the kind of mistake that ends the relationship. It also makes K.I.N.D an **advisor** rather than a list vendor — *"these 40 are already yours, these 12 are in play, here are the 180 genuinely worth a campaign."* **Nothing designed, nothing built.** K.I.N.D's own global suppression, opt-out and DNC rules apply on top and are never weakened by anything a CRM says.

**6.4 V2 SOCIAL / INTENT SIGNALS.** May improve **timing · qualification · conversion · acquisition win rate · campaign performance**. A better win rate lowers effective CAC and retains more margin. **Not priced, not designed, not built.**

**6.5 MUCH LATER — explore removing the $299 upfront fee entirely.** Recorded as a direction only. ⚠️ **This is NOT a plan and NOT a proposal.** The $299 is founder-locked (**PR1**) and **R68** deliberately left it untouched while moving the recurring price. Any change is a founder ruling and a PR1 chain.

**6.6 THE POST-LAUNCH MARGIN LEVERS — the whole list in one place, so none of them is quietly lost.** Each one is an *idea*; none is priced, designed or approved.
- **CRM reactivation** (§6.3) — removes the original provider acquisition cost, never the whole cost
- **Reusable owned inventory** — every paid identity retained and re-served when eligible (**R67**); the second client to use a record costs nothing to acquire
- **Better sourcing efficiency** — moving records-per-approved-lead down from 7× is worth more per point than any price change
- **Social / intent signals** (§6.4) — better win rate lowers effective CAC
- **Retention** — the cheapest revenue is a client who stays; the partner's 25% is deliberately recurring for exactly this reason (**R47**)
- **Premium expansion** — the top of the value ladder, deliberately **not designed or priced** (LAUNCH-PAD § the commercial pack)

⚠️ **Classification: post-launch commercial research. Not a launch blocker (25 Aug).** 🤖


### 6b. THREE MORE FROM THE 24–25 AUG SITTING — POST-LAUNCH, NOT BLOCKERS

⚠️ **Ideas and known debt, not decisions.** 🏷️ **POST-LAUNCH IDEA / REVIEW ITEM.**

**6b.1 A SHARED AGENT-IDENTITY REGISTRY, so Milla and FIGSY cannot drift screen by screen.** Onboarding and Milla must be coherent — **correct agent name, face, voice and role** on every surface a client sees. ⚠️ **The risk is structural, not cosmetic:** surfaces currently **hard-code their own agent assets**, so nothing stops two screens showing different names or portraits for the same agent, and nothing fails when they do. The idea is **one registry plus a guard** — identity resolved from a single place, with a check that fires when a surface invents its own. **Nothing designed, nothing built.**

**6b.2 `check.sh` / workspace preflight — an unbuilt package `dist` masquerades as hundreds of TypeScript errors.** When a workspace package has not been built, the type-checker reports failures **all over unrelated code**, and the real cause — one missing `dist` — is invisible in the noise. ⚠️ **This costs debugging time on the one gate the repo actually has**, and it wastes it at exactly the moment someone is trying to ship. A preflight that builds workspace packages first, or that names the missing `dist` plainly, is the fix. **Logged, not built.**

**6b.3 Conversational refinement after launch, once it is safe.** The launch-safe control is deliberately blunt: an **explicit batch-level "not a fit / refine"** action, whose fences are already guarded. The better long-term product is **LLM/tool-driven conversational refinement** — the client says what was wrong in their own words and Milla adjusts. ⚠️ **Deliberately after launch:** conversational refinement widens what a client can change without a human seeing it, and the pass-2 fences exist precisely because that was risky. **Not designed, not approved.**

⚠️ **Classification: post-launch product and tooling debt. None is a launch blocker (26 Aug).** 🤖


### 7. THE FOUNDER OPERATING MODEL — POST-LAUNCH ACTION #1

⚠️ **THIS IS NOT THE FOUNDER OS PRODUCT. Do not confuse the two — the confusion is the whole reason this section exists.** What follows is the **immediate internal operating system for running K.I.N.D**: how the founder decides, in what cadence, with which model doing what. The **commercial Founder OS product** is a separate, much-later idea (§7.3).

**7.1 What the operating model has to cover.** Priority setting · daily cadence · weekly cadence · idea capture · fix capture · **launch-critical / post-launch / V2 classification** · founder decision authority · **GPT research, challenge and review** · **Claude inspect / build / report — never merge** · **Fable / independent second eyes where useful** · **founder merge authority** · SHA and deployment verification · economics · customer and product feedback loops · launch/production control · repo and document reconciliation · unresolved-risk tracking · commercial experiments · Vida control surfaces · Company Money.

⛓️ **Most of the model authority is ALREADY RULED and must not be re-invented here** — **R65** (pause is default; only the founder's "go" starts a build), **CLAUDE.md Protocol v1 rule 20** (merge is never Claude's; founder routes through independent review), **R61** (every PR ships with its command), **R60** (day-1 post-launch redesign of how we operate). This section is the **operating shape around those rules**, not a replacement for them.

**7.2 Artefacts to locate and reconcile BEFORE anything is rebuilt.** ⚠️ **Verified 26 Aug at `e62c6c8c`: none of these are in the repo.** They exist outside it and must be found, versioned and connected rather than re-created from memory —
- `KIND_Founder_Operator_OS_Post26_Preview_v8 (1).html`
- `founder-operator-os-v8.png`
- `KIND_company_operating_map_v1.html`
- **The branded partner-only earnings page** being prepared for the Friday partner discussion. ⚠️ **HARD CONSTRAINT: it must NEVER expose K.I.N.D internal costs, margins, tax, cash or house-client economics.** A partner sees their own earnings and nothing else.
- **The partner calculator** (`hiring/KIND-partner-calculator.html`) still carries the superseded 20%+5% model (**PR10**, chained). Rebuilding it is **future artifact work**, not part of any current task.

**7.3 MUCH LATER — Founder OS as a commercial product.** Only ever *after* the operating model above is proven in real use on this company. ⚠️ **Not a launch item, not costed, and explicitly excluded from launch economics** (LAUNCH-PAD § BEFORE FRIDAY'S PARTNER MEETING).

⚠️ **Classification: post-launch operating work. Action #1 the day after launch, not before (26 Aug).** 🧍/🤖

---

### 🛑 THE IDEA-BANK CLOSING RULE

**K.I.N.D does not change for the sake of changing.**

Interesting products, competitor growth, attractive interfaces, new AI capabilities and customer suggestions can all justify **RESEARCH**. **None of them justifies ADOPTION by itself.**

Before an idea becomes work:

> **RESEARCH → DISCUSS → CHALLENGE → FILTER THE NOISE → THE FOUNDER DECIDES: ADOPT OR REJECT**

An adopted change must materially support at least one of **REVENUE · RETENTION · EXPANSION · SYSTEM QUALITY**, and must remain consistent with K.I.N.D's underlying philosophy.

---

---

# ░ 📥 27 AUG — THE FOUNDER IDEA BANK (FI-01 … FI-69) — master control record ░

⛓️ **WHY THIS SECTION EXISTS.** On 27 Aug the founder listed sixty-nine ideas, directions and supersessions that existed **only in chat**. A ruling that lives only in a transcript is a ruling that will be contradicted — the transcript is not read at session start and cannot be grepped, which is exactly how #549 was contradicted on 6 Aug. This section is the **master backlog entry for every one of them**; where an item has a canonical home elsewhere, the home is named and the detail lives there, not here.

⚠️ **NOTHING HERE IS BUILT, AND NOTHING HERE IS LAUNCH SCOPE** unless the *Canonical home* column says LAUNCH-PAD. Reading an item here is not permission to build it. Every entry is **LOGGED**, not started.

⚠️ **THE PROGRAMME COMMERCIAL MODEL (FI-26 … FI-45) CONTRADICTS THE CURRENT LOCKED PRICING** ($299 pack · 100 included · $4 per approved lead). Both are preserved. The reconciliation is **PRODUCT-RULES R74**, and it is a founder decision, not a documentation one.

**Classification used below:** `FOUND` (already correctly recorded — left alone) · `PARTIAL` (existed, completed here) · `MISSING` (added here) · `CONFLICT` (both sides preserved, founder must decide) · `SUPERSEDED` (older direction kept, chained forward).

---

## A · SOURCING — post-launch / V2

| ID | Item | Class | Canonical home | Notes · open questions |
|----|------|-------|----------------|------------------------|
| **FI-01** | **Sourcing attainment.** Move from ~**7 sourced → 1 usable/accepted** toward ~**1.5 → 1**, long-term as close to **1:1** as real data allows. Major economics/workflow project. **Does not block launch.** | CONFLICT | V2 (here) · `run-costs-and-cashflow.md` | ⚠️ The 7:1 figure appears nowhere in the repo as a sourcing ratio — the only `7:1` hit is unrelated (`PARTNER-BRIEF.md`). So the **baseline is unverified in-repo**; it is the founder's field observation. Conflicts with **FI-29** (1:1 for commercial planning) unless the two are read as *today's reality* vs *planning assumption* — **FOUNDER RECONCILIATION REQUIRED** |
| **FI-02** | **Vida Lead Pool operator view** — counts · filters · provenance · usability · contactability · what can actually be served. | MISSING | V2 (here) | Builds on the #1458 pool/geography/provenance contract. No operator surface exists today |
| **FI-03** | **Vida suppression / DNC visibility** — operator view of suppression, DNC and opt-out state/inventory. | MISSING | V2 (here) | `opt_out_blocklist` exists in schema; no operator view reads it |
| **FI-04** | **Acquisition-memory operator visibility.** Keep **acquisition_memory**, the **reusable serving pool** and **suppression/DNC/opt-out** as three visibly separate concepts. **Do not collapse them.** | MISSING | V2 (here) | A real design constraint, not a feature: they answer different questions (what we bought · what we may serve · who we must never contact) |
| **FI-05** | **Future sourcing architecture.** Pool first → **Apollo** when it can produce a complete usable lead cheaply → **PDL** as fallback/completion → pool all eligible K.I.N.D-owned reusable data. | PARTIAL | V2 (here) · PRODUCT-RULES **R49**, **R73** | Pool-first is R49 and is BUILT. The Apollo-before-PDL ordering is new and **reverses the current launch boundary (AR5)** — post-launch only |
| **FI-06** | **Apollo economics planning case.** 1,050 contacted · Apollo $65/mo · 2,500 credits · 1 contactable = 1 credit → 1,050 used, 1,450 left · 2 clients → **≈$32.50 data CAC/client**. PDL comparison: 1,050 × $0.28 = **$294** → **$147/client**. | MISSING | `run-costs-and-cashflow.md` ← detail · V2 (here) ← index | **A planning example, never a guaranteed runtime outcome.** Key insight: **Apollo was parked for geography/completeness reliability, NOT for poor economics** |
| **FI-07** | **Post-launch Apollo optimisation** — as an optimisation source, a search/discovery source, and a cheaper complete-data source where reliable. | MISSING | V2 (here) | Requires the geography problem proved on 27 Aug to be solved first: Apollo's no-credit search returns only `has_country` booleans, never a country value |
| **FI-08** | **Provider-neutral routing** on cost · completeness · geography · reliability · actual usable output. **Do not hard-code artificial provider/client segmentation long-term.** | MISSING | V2 (here) | ⚠️ Directly supersedes **AR5** (`audience === 'house' ? 'apollo' : 'pdl'`) as a long-term shape. AR5 remains current truth for launch |
| **FI-09** | **Additional future acquisition sources** — LinkedIn · social · YouTube · other public/intent sources, where rights and economics permit. Goal is **timing, fit, win rate and margin**, not raw volume. | PARTIAL | V2 (here) · V2 §data-engine widening (**#452**) | #452 already covers "2–3 discovery engines beyond PDL". This extends it to intent/social sources and restates the goal as margin, not volume |

## B · LAUNCH / PROOF / OPERATING

| ID | Item | Class | Canonical home | Notes · open questions |
|----|------|-------|----------------|------------------------|
| **FI-10** | **Recurrent proof runtime failure** — the full path: proof claim → job dispatch → pool lookup → paid-provider guard → failure boundary → `icp_run_outcomes` persistence → Milla summary → portal terminal state. **Has happened more than once. Do not mark resolved without repo evidence.** | PARTIAL | **LAUNCH-PAD** ← current work · PRODUCT-RULES **R72③** | R72③ already carries the terminal-state defect as OPEN. The end-to-end path is now named in LAUNCH-PAD so it cannot be closed a segment at a time |
| **FI-11** | **Paid-provider go-live rule.** `PAID_PROVIDERS_ENABLED` stays **OFF** through safe proof testing. Before the first deliberate real sourcing test: enable **only** under controlled K.I.N.D house use, founder-approved, accepting real spend. | MISSING | **LAUNCH-PAD** · PRODUCT-RULES **R66** | R66 is the zero-spend guard; this is the **controlled exit condition** from it, which was never written down |
| **FI-12** | **Pre-launch cleanup** — delete fake/test accounts and data so production starts clean. **First**: audit which are fake, inspect cascade records, identify launch evidence to preserve, and only then delete, **with founder approval**. | PARTIAL | **LAUNCH-PAD** · `SEED-WIPE-PLAN.md` | A seed-wipe plan already exists; this adds the **audit-before-delete** discipline and the founder-approval gate |

## C · FUNNEL / PREMIUM PRODUCT

| ID | Item | Class | Canonical home | Notes · open questions |
|----|------|-------|----------------|------------------------|
| **FI-13** | **Booked → paying conversion tracking**, for both K.I.N.D acquisition and client programmes: accepted/contacted → booked → held → opportunity/proposal → paying. | PARTIAL | PRODUCT-RULES **R69** · V2 (here) | R69 already requires booked → held → paying tracked separately. **New here:** the *opportunity/proposal* stage |
| **FI-14** | **~15% booked → paying.** **Planning hypothesis only — must NOT be locked as a benchmark.** | MISSING | V2 (here) | Recorded deliberately as a hypothesis so it cannot later be quoted as a rate |
| **FI-15** | **Premium conversion-coaching product.** Core K.I.N.D = targeting → approved leads → outreach → **booked meeting**. Premium layer = booked → held → opportunity → **won customer**. | MISSING | V2 (here) | ⚠️ Extends past **MEETING_BOOKED**, which CLAUDE.md holds as the hard downstream product boundary. **The boundary move is a founder decision** |
| **FI-16** | **Milla/AI conversion coaching** — diagnose funnel leakage · learn which ICPs, messages and meetings convert · coach before and after meetings. Likely **subscription/premium economics**, not per-lead. | MISSING | V2 (here) | Depends on FI-13 data existing first |

## D · GLEAN / CONTEXT / MULTI-PLAYER AI

| ID | Item | Class | Canonical home | Notes · open questions |
|----|------|-------|----------------|------------------------|
| **FI-17** | **Glean investigation** as a possible context layer under Milla — internal K.I.N.D knowledge, later premium client CRM context, sales notes, calls, documents. **Not a dependency. Not a replacement for Milla.** | PARTIAL | V2 §competitor bank · V2 (here) | ⚠️ V2 already states *"Glean is an external product reference and nothing more… NOT roadmap authority"*. This entry does not change that — it logs an **investigation**, and the non-dependency wording is carried through deliberately |
| **FI-18** | **⭐ K.I.N.D Multi-player AI (VERY IMPORTANT V2/PREMIUM).** A team workspace where **multiple humans and multiple AI agents** work from one shared company/customer context — reps, founders, managers, marketers. Shared intelligence across targeting · outreach · meetings · objections · CRM outcomes · coaching. | MISSING | V2 (here) | Nearest existing relative is **#476 "unified data layer / shared agent brain (THE moat)"** — this is the **human-plus-agent workspace** on top of it, which #476 does not describe |
| **FI-19** | **Multi-player AI core features** — interactive dashboard · proactive task management · team chat · shared AI context · role-aware collaboration. | MISSING | V2 (here) | Strong strategic fit with **FI-25** (Slack as the front door) |

## E · MODEL ROUTING / AI ECONOMICS

| ID | Item | Class | Canonical home | Notes · open questions |
|----|------|-------|----------------|------------------------|
| **FI-20** | **Internal model routing** — cheaper/faster models for routine work; frontier models where intelligence changes the outcome (nuanced ICP reasoning · conversion diagnosis · meeting coaching · multi-source synthesis · high-stakes decisions). | FOUND | V2 §"FIGSY observability + model routing" (**R58**, 20 Aug) | Already recorded as post-launch. The five frontier-worthy cases are added here as the concrete list R58 lacked |
| **FI-21** | **AI economics controls** — retrieval-first context · caching · context reuse · token budgets · escalation rules · cost monitoring **per workflow, per customer, per agent**. | PARTIAL | V2 §R58 · V2 (here) | Per-customer and per-agent cost attribution is new |

## F · ENGINEERING OPS

| ID | Item | Class | Canonical home | Notes · open questions |
|----|------|-------|----------------|------------------------|
| **FI-22** | **CodeRabbit evaluation** as an independent second machine reviewer after Claude-generated PRs. Assess security/privacy · GitHub integration · pricing · false-positive rate · usefulness for migrations, security review and runtime review. **Do not adopt automatically — this is evaluation work.** | MISSING | V2 (here) | Relevant to Protocol r20 (merge is never Claude's): a second machine reviewer is **not** a substitute for the founder's authorisation or GPT-5.6 review |

## G · MILLA VOICE

| ID | Item | Class | Canonical home | Notes · open questions |
|----|------|-------|----------------|------------------------|
| **FI-23** | **Milla voice** — speech-to-text · spoken responses · seamless voice/text switching inside the same conversation and context. | PARTIAL | V2 **#475** (voice / AI calling) · V2 (here) | #475 is **outbound AI calling**; this is **Milla's own conversational voice**, a different feature. Both kept |

## H · SLACK

| ID | Item | Class | Canonical home | Notes · open questions |
|----|------|-------|----------------|------------------------|
| **FI-24** | **Slack integration (initial idea)** — internal communication layer for operational events, alerts, team discussion, future agent activity. | MISSING | V2 (here) | Existing Slack hits in the repo are environment/config references, not a product direction |
| **FI-25** | **Slack as the primary interaction layer (stronger direction).** Clients and internal team talk to Milla directly · review/approve work · request refinements · ask for intros/next actions · receive briefings · discuss campaign and meeting outcomes · trigger workflows · keep humans **and** AI agents in one conversation. **Architecture: Slack = front door / conversational work surface · Portal = deeper dashboard / control surface.** Especially for team accounts. | MISSING | V2 (here) | ⚠️ **Materially changes where the product lives.** Strong fit with **FI-18/FI-19**. Open question: how the **Jack + Jill Milla shell** relates to a Slack front door — the two must not become two competing product surfaces |

## I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction

> ⚠️ **THE WHOLE OF THIS BLOCK CONFLICTS WITH CURRENT LOCKED PRICING AND IS NOT BUILT.** Current truth remains **$299 pack · first 100 approvals included · $4 per approved lead**. The supersession is recorded as **PRODUCT-RULES R74** and requires a founder decision to become current. Nothing in this block may be quoted to a client.

| ID | Item | Class | Canonical home | Notes · open questions |
|----|------|-------|----------------|------------------------|
| **FI-26** | **Programme pricing** anchored around **~$450 per targeted booked meeting**, replacing flat $4/approved lead as the commercial anchor. | CONFLICT | PRODUCT-RULES **R74** ← the supersession · V2 (here) | **FOUNDER RECONCILIATION REQUIRED** against the 3 Aug $299/$4 lock |
| **FI-27** | **Automatic volume discounts** at higher programme volume. Normal flow must not depend on manual negotiation. | CONFLICT | PRODUCT-RULES **R74** | ⚠️ Contradicts the 3 Aug lock in `constants/index.ts`: *"No discount logic belongs in code, on the website, or in the product."* **FOUNDER RECONCILIATION REQUIRED** |
| **FI-28** | **Contribution-margin protection ≈ 70%**, eventually a **real money guard**, not spreadsheet commentary. | MISSING | `run-costs-and-cashflow.md` · V2 (here) | Arithmetic recorded in run-costs: at 250:1 and 1:1 sourcing, PDL alone is ~$70 of a ~$135 COGS ceiling |
| **FI-29** | **Commercial sourcing assumption = 1:1** (1 provider result ≈ 1 usable/contacted lead). **Supersedes the old 2:1 / 7:1 commercial planning logic.** | SUPERSEDED | `run-costs-and-cashflow.md` · V2 (here) | Chains **FI-01**. In code the old 2:1 still lives as `PACK_SOURCE_TARGET = PACK_LEADS × 2` — unchanged, and now flagged |
| **FI-30** | **Milla meeting target** — the client tells Milla how many targeted booked meetings they want. | MISSING | V2 (here) | No such input exists |
| **FI-31** | **Starting recommendation: 250 leads per targeted booked meeting** (10 meetings → ~2,500 leads). Not a guarantee. | CONFLICT | PRODUCT-RULES **R69** · V2 (here) | ⚠️ **DIRECT CONFLICT WITH R69 (26 Aug)**, which locks the centre case at **~150 accepted prospects per booked meeting**, range 100–250, and makes **250–300 with no booked meeting a campaign-review trigger**. Seeding at 250 sits **at the review threshold**. **FOUNDER RECONCILIATION REQUIRED** |
| **FI-32** | **Client-specific learning** — replace the seed benchmark with the client's actual lead→booked performance once evidence is sufficient. | FOUND | PRODUCT-RULES **R69** | R69 already says real data supersedes the benchmark. No change needed |
| **FI-33** | **Performance deterioration → stop/review.** Never blindly recommend more spend. | FOUND | PRODUCT-RULES **R69** | R69: *"do NOT automatically tell the client to buy more."* Already locked |
| **FI-34** | **Benchmark transparency** — show the starting benchmark **and** the client's actual benchmark. | MISSING | V2 (here) | Extends R69 from an internal planning rule to a **client-facing disclosure** |
| **FI-35** | **Client-facing programme calculator** — targeted meetings · recommended leads · automated discount · programme price · effective cost per targeted meeting · average customer value · meeting→client conversion · expected clients · expected revenue · ROI · starting benchmark · actual benchmark. **No guarantees.** | MISSING | V2 (here) | ⚠️ Must obey R69's *"never promise X leads = Y meetings"* and R71's no-guarantee discipline |
| **FI-36** | **50/50 payment** — 50% upfront authorises bounded sourcing/preparation; 50% at **Approve & Go Live**. | MISSING | PRODUCT-RULES **R74** · V2 (here) | No programme, deposit or go-live concept exists in schema |
| **FI-37** | **Programme-level approval** — one approval, not thousands of individual paid-lead approvals. | SUPERSEDED | PRODUCT-RULES **R74** | Supersedes **FI-65** |
| **FI-38** | **Controlled execution batches** after Go Live, ~**250 leads**, batch size **configurable**. | MISSING | V2 (here) | Today `start-work.ts` tops a desk to 200 with no batch entity |
| **FI-39** | **Batch progression** — healthy batch continues automatically; material problem auto-pauses for review. | MISSING | V2 (here) | |
| **FI-40** | **Client Pause Programme control** — must stop **sourcing and sending**. | MISSING | V2 (here) | No client-level sourcing pause exists; campaign pause ≠ sourcing pause |
| **FI-41** | **Material ICP change auto-pauses future sourcing** until reconfirmed or reviewed. | MISSING | V2 (here) | `PATCH /icps/:id` writes and nothing else |
| **FI-42** | **Programme authority** — no sourcing or spend outside explicit programme authority. | PARTIAL | V2 (here) · **PR #1459** | PR1A removed the unattended nightly top-up — the first step toward this. The authority object itself does not exist |
| **FI-43** | **Unused programme value never expires.** | PARTIAL | V2 (here) | Credits already never expire (no expiry logic anywhere). **Programme value** is a different concept and is unrepresentable today |
| **FI-44** | **Refund/payment boundary** — first 50% non-refundable once sourcing is authorised; second 50% not charged if paused before Go Live. | MISSING | PRODUCT-RULES **R74** · legal sweep **FI-56** | ⚠️ Terms currently describe the wallet/$4 model. Legal copy change required before this is real |
| **FI-45** | **If K.I.N.D cannot deliver** authorised undelivered value, **make the client whole** for it. | MISSING | PRODUCT-RULES **R74** · **FI-56** | Only a Stripe refund claw-back exists today |

## J · MEETING TRUTH / CALENDAR

| ID | Item | Class | Canonical home | Notes · open questions |
|----|------|-------|----------------|------------------------|
| **FI-46** | **Booked and Held are separate metrics.** | PARTIAL | PRODUCT-RULES **R69** · V2 (here) | R69 tracks them as separate rates; the **schema cannot express it** — `calendar_bookings.status` is `pending\|confirmed\|cancelled` |
| **FI-47** | **New state: Booked — unverified** (prospect agreed a date/time, no native verification). | MISSING | V2 (here) | Requires a CHECK-constraint widening |
| **FI-48** | **Meeting counting rules** — reschedules count once · duplicates, spam and outside-ICP do not count · **no-show stays Booked, not Held**. | MISSING | V2 (here) | The definition of BOOKED MEETING itself: *qualified prospect inside the approved ICP agrees a specific date/time and is recorded through the K.I.N.D campaign* |
| **FI-49** | **Native Microsoft/Outlook calendar support.** | MISSING | V2 (here) | ⚠️ Does not exist in any form — the only `outlook` token in the repo is a CRM integration id |
| **FI-50** | **Other calendars** — client booking-link fallback where native support is unavailable. | PARTIAL | V2 (here) | A booking-link path exists (`/book/[token]`); it is not positioned as the fallback tier |
| **FI-51** | **Manual meeting confirmation** — client can later mark **Held** or **No-show**. | PARTIAL | V2 (here) | `no_show_at` exists (operator-set); client-side confirmation does not |

## K · MILLA / VIDA PRODUCT SURFACES

| ID | Item | Class | Canonical home | Notes · open questions |
|----|------|-------|----------------|------------------------|
| **FI-52** | **Proof Pass-2 exhaustion must create a real Vida/human handoff**, not customer-facing copy alone. | PARTIAL | **PR #1460** (open, unmerged) · PRODUCT-RULES **R72** | Built and under review: persisted review state, single operator alert, Vida visibility and a resolve control. **Not merged, migration not applied** |
| **FI-53** | **Preserve the Milla Jack-and-Jill conversational shell.** Programme actions execute **around** the conversation. Do not redesign unnecessarily. | MISSING | V2 (here) | Recorded as a **standing design constraint** on all programme work |
| **FI-54** | **Preserve the Vida conversational/operator shell**; add evidence and controls around it. | MISSING | V2 (here) | Same constraint, operator side |
| **FI-55** | **Vida programme cockpit** — programme state · batch state · payment state · remaining programme value · sourcing authority · pause/review reason. | MISSING | V2 (here) | Depends on FI-36 … FI-42 existing |

## L · PUBLIC / PRODUCT TRUTH SWEEP

| ID | Item | Class | Canonical home | Notes · open questions |
|----|------|-------|----------------|------------------------|
| **FI-56** | **Full-system sweep when the programme model is implemented** — website pricing · public calculator · Terms · legal/payment/refund/pause language · FAQs · onboarding · emails · notifications · help · demo video · reporting labels · tests · fixtures · seed/demo data. | MISSING | V2 (here) | The 27 Aug audit found the old model in **43 files**, including `apps/website/terms.html` and `apps/portal/src/app/(legal)/terms/page.tsx`. ⚠️ **Legal copy is the highest-risk surface** |
| **FI-57** | **Re-record the demo video** — the current Pick / Not-a-fit + $4 paid flow becomes false under the programme model. | MISSING | V2 (here) · `RECORDING-SHOOTING-SCRIPT.md` | Only after FI-26 is decided |

## M · PARTNER

| ID | Item | Class | Canonical home | Notes · open questions |
|----|------|-------|----------------|------------------------|
| **FI-58** | **Partner commission = 25% of programme CONTRIBUTION**, not 25% of gross programme revenue. | CONFLICT | PRODUCT-RULES **R47**, **R74** | ⚠️ **R47 currently pays 25% of the $4 approved-lead spend**, and `PARTNER_COMMISSION_PER_LEAD_USD` is derived from `LEAD_PRICE_USD`. Changing the price silently changes partner earnings. **FOUNDER RECONCILIATION REQUIRED** |
| **FI-59** | **"Programme contribution" must be defined explicitly** before implementation. **Not invented here.** | MISSING | V2 (here) | **OPEN QUESTION owned by the founder.** Until defined, FI-58 cannot be built or quoted to a partner |

## N · LAUNCH PROVIDER TRUTH

| ID | Item | Class | Canonical home | Notes · open questions |
|----|------|-------|----------------|------------------------|
| **FI-60** | **PDL remains the launch external sourcing provider.** | FOUND | PRODUCT-RULES **AR5** | Current truth, enforced in `provider-boundary.ts` |
| **FI-61** | **Apollo live API remains parked for launch.** | FOUND | PRODUCT-RULES **AR5** · **R66** | Enforced by the fail-closed paid-provider guard |
| **FI-62** | **Eligible K.I.N.D-owned Apollo pool data remains usable** under normal geography, provenance, quality and suppression safeguards. | FOUND | PRODUCT-RULES **R73** | R73 (27 Aug) and `POOL_ELIGIBLE_SOURCES = ['pdl','apollo']`. **No change needed** |

## O · VALUE PROPOSITION / RECOMMENDATIONS

| ID | Item | Class | Canonical home | Notes · open questions |
|----|------|-------|----------------|------------------------|
| **FI-63** | **BDR comparison** — K.I.N.D is **sales capacity the customer funds upfront**. **Never imply guaranteed meeting outcomes.** | PARTIAL | V2 (here) · PRODUCT-RULES **R69** | The no-guarantee half is R69. The positioning sentence is recorded here for the first time |
| **FI-64** | **Evidence-driven recommendations** — increasingly client-specific rather than generic industry assumptions. | FOUND | PRODUCT-RULES **R71** | R71: recommendations must rest on observed data and never be phrased as guarantees |

## P · EXPLICITLY SUPERSEDED — preserve as history, do not build

> ⚠️ **These are recorded so nobody rebuilds them, and NOT deleted so the chronology survives.** Each names what replaced it.

| ID | Superseded direction | Superseded by | Notes |
|----|----------------------|---------------|-------|
| **FI-65** | Individual paid-lead **Accept → charge** at live scale | **FI-37** (one programme-level approval) | The per-lead charge (`try_charge_wallet`) is **still current truth today** and still the only money model in code |
| **FI-66** | **One-by-one replacement approval** at live scale | **FI-38/FI-39** (controlled batches, auto-progression) | |
| **FI-67** | The old **7:1 sourcing assumption** | **FI-29** (1:1 for commercial planning) | ⚠️ In code the live assumption is **2:1** (`PACK_SOURCE_TARGET`), not 7:1 — see FI-01 |
| **FI-68** | **Flat $4 pricing at all volumes** | **FI-26/FI-27** (programme price + automatic volume discounts) | ⚠️ **STILL CURRENT TRUTH UNTIL R74 IS DECIDED.** `LEAD_PRICE_USD = 4` |
| **FI-69** | **Source-first / pay-on-outcome** mechanics | **FI-36** (50/50 authorised programme) | |

### ⛓️ The "do not change pricing yet" reconciliation

Earlier in the 27 Aug session the founder instructed: *"Do not change pricing. Do not change Stripe. Do not change `$4` logic yet."* That instruction was **scoped to PR1A and PR2** and is **not** a decision to keep flat-$4 permanently. The **later programme-model direction (FI-26 … FI-45) supersedes flat-$4 as the intended commercial architecture**, while flat-$4 **remains the current built and locked truth** until R74 is decided. Both are true at once: *don't change it yet* and *it is not the destination*. **The chronology is preserved deliberately — neither statement is deleted.**

---

## 🛑 NOTHING ABOVE IS LAUNCH SCOPE *(founder-restated 22 Aug, when this list was written)*

Every item on this page is parked. **No entry above converts into launch scope**, and reading one here is not permission to build it. Launch remains exactly:

**25 Aug 2026** · **one core ICP** · **one active campaign** · **one live sequence / motion** · **20 → refine the SAME ICP → 20 → a human** · **$299 onboarding pack** · **first 100 approved leads included** · **$4 after the first 100** · **K.I.N.D-only GO** · **human reply ownership** · **the current provider and money boundaries**.

His reason for the whole shape, recorded because it explains every deferral above: *"correctness and control matter more than automation"* — the founder wants to learn how clients actually behave before any of this is made more efficient.
