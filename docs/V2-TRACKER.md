# 🎯 K.I.N.D — FORWARD ROADMAP + RISK REGISTER (future detail ONLY)

> **AUTHORITY (operating system — see root `CLAUDE.md`):** future detail only — roadmap rationale, risks, learning engine, GTM, steals, moat. **No current build statuses or daily execution here.** For current status → `PRODUCT-INVENTORY.md`; for current execution → `LAUNCH-PAD.md`; for strategy → `KIND-MASTER.md`.

> 🧭 **WHICH DOC AM I IN? Only THREE docs matter:**
> 1. **[`KIND-MASTER.md`](./KIND-MASTER.md)** — launch tracking (now → Fri 19) + strategy + session log
> 2. **[`PRODUCT-INVENTORY.md`](./PRODUCT-INVENTORY.md)** — **THE status list: every item on the 4-state colour system (locked 13 Jun) — 🟢 built+live · 🟣 approved+locked · 🟡 built, pending review · 🔴 not built, with owner.** If you want to know what exists and what's left — go there, not here.
> 3. **This file** — the FUTURE detail behind the inventory's 🔴 items: risk register · learning-engine blueprint · GTM/content plan · steals catalog. **No build statuses live here anymore.**
>
> **📅 THE PLAN (locked 12 Jun):** ① Mon 15 — Company Command Centre + payments → production (the only early ship) · ② Fri 19 — LAUNCH · ③ post-19 — everything else (the 25 release PRs, shell redesign, Alta inbox, the staging review queue).

_Last updated: 14 Jun 2026 — **this doc now lives on `main`** (consolidated off the held `claude/kind-carson-MYhSl` branch so the trackers travel with the live code). **14 Jun website work shipped to `main` (live, Cloudflare):** The Drop revamped to a Monday-style show/podcast layout · main-page polish · Demo removed from top nav site-wide → "Live Demo" in Resources (inventory items 93 · 118). Portal/agents untouched — still post-19. · _Prior (13 Jun, on `MYhSl`):_ aligned to the inventory's 4-state colour system; invoicing decision locked (USD · no VAT until benchmark · Stripe-issued). **113a agent-panel rule BUILT** (FIGSY/Milla/Vida/Denise conversational + acts-in-place via `liveChatEndpoint`; endpoints `/milla/chat` `/denise/chat` `/casey/chat` + existing `/vida/help`). **Casey wired live on `/v2/setup`.** **"AI Family" cards BUILT** (#125). New planned website items: 162 Prompt Library · 163 Product Videos hero._

**Owner:** 🧍 founder · 🤖 Claude · 🤝 both

---

# ░ WHAT'S BUILT — MOVED ░
> **🚨 15 Jun — THE WHOLE PRODUCT IS LIVE.** #502 (merged via #564) was a superset of its dev branch — it shipped the Company Engine + design screens 80–91 + **all 20 R-wave features R1–R20** to prod. **PRs #506–#525 are redundant → close, don't merge.** 3 owed prod migrations: R2 `daily_brief_enabled` · R15 `figsy_knowledge` · R20 `job_changed_at`. **Active focus = the FEATURE-VERIFICATION WALK** (LAUNCH-PAD §13) — confirm every live feature works with real data **by THU 18 (founder away Fri 19)**; anything broken drops 🟢→🔴 and gets fixed same-day. **MON 15 closed out:** Company Engine + R1–R20 live · 3 R-train migrations run · Hunter+PDL keys set · 21 redundant PRs closed · Denise $39 · terms docs uploaded.
> The full Wave 1/2/Tier-3 release tables + Company Engine + shell/staging status live ONLY in **[`PRODUCT-INVENTORY.md`](./PRODUCT-INVENTORY.md)**.
> Staging environment details (URLs, login, review protocol): **[`STAGING-REVIEW.md`](./STAGING-REVIEW.md)**.

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
| R7 | **💳 BILLING MIS-WIRED — pre-client blocker (audit 14 Jun, Tue-16 fix).** Three faults vs the deck: (1) FIGSY clients **double-charged** $1+$3/lead; (2) FIGSY-only **bundle can't deliver leads** (delivery capped by lead-gen pool); (3) FIGSY price **shown $20/40/100, charged $60/110/250, "locked" $60/120/300** — next to a binding T&C checkbox (chargeback/legal risk). Plus no multi-currency. **Design SIGNED OFF: one lead = one charge = one wallet via `clients.plan`.** Tracked as inventory **166–173**; full plan in `MORNING-FIXLOG.md` → 💳 BILLING CORRECTNESS. **No merge to `main` until smoke green.** | 🤝 |

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
2. **Second discovery source** beside Apollo behind `searchPeopleWithFallback` (Apollo-first → PDL Search; later Cognism w/ explicit reseller programme, ~$15–25k/yr, post-revenue).
3. **Signal sources** (website scans · LinkedIn CSV import · Crunchbase-style signals) — widen coverage with zero ToS exposure.
4. **Manus** — African-SMB deep-research fallback (the potential moat; async, needs dedup+verification). Post-launch.
**Posture goal: "Apollo-first, multi-source" BEFORE the 50-client trigger.**

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
| # | What | Status |
|---|------|--------|
| V2-3 | Conversational setup (chat w/ Casey) — **SPEC'D by Glean Auto Mode demo (10 Jun): client describes goal in a couple sentences → AI assistant configures the whole agent (ICP+sequences+knowledge+triggers), no forms. The activation unlock for Africa-SMB. Highest-value V2 build.** | 🟡 started — `/v2/setup` runs a **live Casey chat** (`/casey/chat`, 13 Jun); the auto-config (ICP+sequences+knowledge from the conversation) is the remaining build, gated on founder voice/tone (item 121) |
| V2-8 | **AI Notetaker → action items (Milla)** | 🟡 built → see PRODUCT-INVENTORY §2B — `/dashboard/notetaker` |
| V2-10 | **Casey** onboarding agent | 🟡 backend ready — `/casey/chat` endpoint (`casey.ts`) + live panel on `/v2/setup` (13 Jun); persona/voice + full onboarding flow gated on founder input |
| V2-11 | **Vida help bubble (bottom-right)** | 🟡 built → see PRODUCT-INVENTORY §2B — R3 `layout.tsx` |
| V2-12 | Strong client dashboards + Goals | 🔨 Goals built on staging — R10 |
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
| Leg | What | Status |
|---|---|---|
| **1 · Outbound** | FIGSY dogfood (cold email sells K.I.N.D) | ✅ running (warmup) |
| **2 · Content / Inbound** | **video · product drops · brand LinkedIn (anonymous handle) · blog** | 🔴 **the missing leg — the focus** |
| **3 · Partners** | the Demmy model (1 good partner ≈ 10 clients/mo) | ✅ started · research = highest-leverage for Africa |

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
**Principle: the pages are BUILT and embed-ready (`the-drop.html` video slot · `product-videos.html` "Watch") — the bottleneck is RECORDING, all 🧍. Record → upload to YouTube → paste the video ID → live. The PRODUCT-INVENTORY (Part A 53 live features + Part B0 release train) is the shot list: every shipped feature is video material; every merged release feeds a Drop with its own video.**

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
- **"Watch" / Product Videos** (`apps/website/product-videos.html`, built + approved) — replaces the plain Demo link; built for the **founder's personal YouTube walkthroughs** (authentic "real run-throughs", YouTube-embed-ready). Authenticity > polish for the Africa-SMB trust market.
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
| **Amplemarket / MailerLite / Salesforce / Notion-Linear** | Intent signals (#37) · spam-score pre-send (#44) · AgentExchange marketplace (V2-5) + outcome pricing (#60) · MCP-native (#59) + slim sidebar (V2-6) |

---

# ░ PART 3 — DOC INDEX (stop the sprawl) ░
**This file = the live tracker.** Other docs are reference:
- `KIND-MASTER.md` — strategy bible / session log (links here)
- `CLIENT_FLOW.html` / `CLIENT_FLOW_PER_REP.html` — the journey + #88 per-rep design
- `portalv2preview.html` / `portal-v2-layout.md` — the 8 V2 cosmetic concepts
- `SMOKE_TEST.md` — T1–T10 detail · `DEPLOY-CHECKLIST.md` — deploy steps · `legal.md` — legal pack
- `MASTER_TODO.md` / `EVERYTHING.md` — **older/overlapping → fold into this tracker, then archive.**
