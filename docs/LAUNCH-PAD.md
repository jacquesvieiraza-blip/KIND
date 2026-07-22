# 🚀 K.I.N.D — LAUNCH PAD

> The **one** day-to-day page: what to do now · who owns it · where it stands. One line per item.
> Status of record → **PRODUCT-INVENTORY** · why/history → **KIND-MASTER** · future detail → **V2-TRACKER** · deep audits → **AUDIT-8JUL-DEEP.md** (code) + **AUDIT-8JUL-STALE-SWEEP.md** (docs) · M0 punch-list → **MILESTONE-0-CHECKLIST.md**.

**THE PLAN (reset 9 Jul PM, founder-locked):** **Sell FIGSY. Only FIGSY. Now.** One offer: **$1 the lead (reveal) + $3 FIGSY works it = $4 per qualified lead. No subscriptions, no contracts.** Website + portal are CUT to FIGSY-only — the agent family (Milla · Vida · Denise · Tony) comes **down** (not masked, not "coming soon"); it returns only after **3 months of paid, verified clients**. The UI look & feel does NOT change — we remove surfaces and fix words, no redesign.
> **↳ 21-Jul UPDATE (founder-locked) — this supersedes THE PLAN's "family comes down" framing:** the **freeze is lifted** and the product is now **three agents — FIGSY (priority 1, live) · MILLA (Brain, coming soon) · VIDA (Host/inbound, coming soon)**; Denise + Tony fold into Milla. Docs (PRODUCT-INVENTORY + this doc) **re-grouped by agent** (see THE BUILD PATH below). The full homepage redesign (#1079) was **reverted** (dropped the nav/footer, orphaning every page); instead the **family section was added as an add-on above the footer on the professional homepage (#1082) + the pricing bundle was fixed to the real two-wallet model (#1083)** — both **LIVE 21 Jul**, preview-approved, #469 → 🩷. Portal + purchasable surfaces stay FIGSY-only for now; Milla/Vida return as real builds per the build path, not subscriptions.

# 🎯 SPRINT — first paying client in 30 days (started 9 Jul)
**Rule: a line gets on this list ONLY if it blocks the first paying client. A box is done or it isn't — no colours, no percentages. Every PR names its line. Ticking the box IS the doc update.**

> **📍 21 JUL — freeze lifted · docs re-grouped by agent · homepage live (#1079).** Full docs-vs-code audit run (4 code-verified passes); doc-lint green. *(Prior 14-Jul snapshot below still stands for the sprint DO-FIRST items — verify they're done before ticking.)*
> **📍 14 JUL RECONCILED STATE (founder back from sick — full audit run, doc-lint green; API + doc-lint suites green — exact test count unverified, don't quote a number).**
> **Merged while away:** #1070 tour auto-start · #1071 clean slate · #1072 pool move + P&L view fix · #1073 admin revenue honesty · #1074 Milestone X spec. **Open:** #1075 (docs, LinkedIn-login refinement — merge when ready).
> **Prod facts (counted, not remembered):** clients = **1** (hello@ only) · `lead_pool` = **85 owned Apollo records** (source='apollo', deduped from the 159 lead rows) · FIGSY has really sent **400 emails to 84 UK recipients** (Warmup 255 + SaaS Trial Push 145, all flagged consented, counters honest ±2). ⚠️ **Kill-switch state UNVERIFIED:** the 7-Jul sends imply `AUTO_OUTREACH_ENABLED` was 'true' then (the chokepoint defers without it), which contradicts the 11-Jul "no variable" Railway read — if it IS set and any enrollment is still due, sends can resume on their own. Check it (DO-FIRST ⓪).
> **🧍 DO FIRST (≈15 min, in order):** ⓪ Railway → @kind/api → Variables → read `AUTO_OUTREACH_ENABLED`; decide ON/OFF **on purpose** (OFF until line 9 is deliberate) · ① run `supabase/migrations/20260717_pool_pnl_exclude_house_demo.sql` in the Supabase editor — kills the phantom **$874** pool revenue · ② `railway up --detach --service "@kind/api"` + `"@kind/admin"` + `"@kind/portal"` (covers #1070/#1071/#1073 — idempotent, safe if some already shipped) · ③ verify: admin Clients reads **"Real Clients — 1"** · Money Path REVENUE OFF THE POOL = **$0** · incognito signup → tour auto-starts · ④ merge #1075.
> **THEN the week = lines 8a·① → 8b → 8c walk → 9 → 10 below. Nothing else.**

| ✓ | # | Line | Owner |
|---|---|------|:---:|
| ✅ | 1 | **Website cut to FIGSY-only** (homepage redesign + all pages rendered #1030/#1031 · auth buttons fixed #1036 · founder walked live 10 Jul) | 🤖 build · 🧍 deploy |
| ✅ | 2 | **Portal cut to FIGSY-only** (switcher/cards/pages+marketplace+What's New+Templates out #1033/#1034 · click-through sweep #1035 · founder walked live 10 Jul) | 🤖 build · 🧍 deploy |
| ✅ | 3 | **Billing sells $1 reveal top-ups** (Stripe price IDs wired · reveal + FIGSY cards live · founder walked both 10 Jul) | 🤖 + 🧍 |
| ✅ | 4 | **Credit counter shows BOTH wallets** (reveal + FIGSY pills, header + sidebar #1041 · founder walked live 10 Jul) | 🤖 |
| ✅ | 5 | **Revenue-report bug fixed** (`amount_usd` written on the Stripe sub webhook #1040 · deployed 10 Jul) | 🤖 |
| ✅ | 6 | **Merge PR #1019 + run its migrations** (merged · founder ran all 9 prod migrations · api+portal deployed 10 Jul) | 🧍 (10 min) |
| ✅ | 7 | **3 pricing rules ruled** (10 Jul) — reveal $1 charged **once per lead EVER** · work $3 charged **per campaign enrollment** · trial mix **20 reveal + 5 work** · **kill subscription machinery** (keep FIGSY entitlement rows) → builds #424/#425/#431 | 🧍 (3 lines) |
| ⬜ | 8a | **BUILD the money machine COMPLETE** (founder-ruled 10 Jul: all of it ships BEFORE the walkthrough) — 4 sub-steps below, tick each as it lands | 🤖 build · 🧍 buy+merge+deploy |
| ⬜ | 8a·① | 🧍 **Buy PDL credits** ($280 / 1,000 records) — the ONE thing money can't route around; everything else queues behind it | 🧍 |
| ✅ | 8a·② | **PR2 — portal onboarding + reveal push** #447 — **MERGED (#1057) + live**; founder walk happens inside line 8b | 🤖 done · 🧍 walk in 8b |
| ✅ | 8a·③ | **PR3 — admin Money Path** #448 **+ lead_pool & per-record P&L** (#449 parts 1–2) — **MERGED (#1057) + live** (founder used the page 11 Jul; pool = 85 owned Apollo). One owed SQL: the `20260717` P&L view fix (14-Jul DO-FIRST ①) | 🤖 done |
| ✅ | 8a·④ | **PR4 — pool-first sourcing = cross-client reuse** (#449 part 3) — **MERGED (#1057) + live**; pool-serve proven when the 85 Apollo records serve a matching ICP at $0 (part of 8b) | 🤖 done |
| ⬜ | 8b | **THEN one real end-to-end walkthrough** — ICP → source (pool-first) → reveal $1 (+2 drip) → enroll $3 → sequence sends → reply → every wallet + ledger moves right — founder walks it once, top to bottom. *Carried from 10 Jul: signup fixed #1047 · sourcing zero root-caused #444 · **money fences #445/#446 LIVE + battle-proven** (granted 10 → PDL empty → auto-refunded $0 lost, first live run)* | 🤝 |
| ⬜ | 8c | **GUIDED ONBOARDING TOUR** #454 — **CORE MERGED** (#1062 tour · #1063 F1–F4 fixes · #1064 V2-home · #1065/#1066 video thumbnails · #1070 auto-start); box ticks when the founder deploys portal (14-Jul DO-FIRST ②) + walks it as a fresh signup. (founder-ruled INTO the sprint 10 Jul: "a client needs this before we onboard anyone or demo — self-serve product") — a real next→next→next popup tour that FOLLOWS the client across screens: Welcome → Create ICP → Run → Review leads → **Reveal $1 (honest, balance shown)** → Select → Enrol $3 → Review sequence → Launch; + "keep FIGSY funded → billing" triggered prompt; + first-login video & permanent "Learn with FIGSY" section. Replaces the 3 dead legacy widgets. Spec = `docs/onboarding-tour-buildplan.md`. **Core (Phases 0–4) is the sprint scope; video/analytics/a11y (6–8) queue post-line-10.** Preview-first. | 🤖 build · 🧍 walk+ship |
| ⬜ | 9 | **FIGSY runs OUR outreach** — its own first campaign (it is its own case study); this IS acquisition channel ① (CAC ~$56–79/client, cashflow §5e) | 🤝 |
| ⬜ | 10 | **First paying client** | 🧍 sells · FIGSY works |
| ⬜ | 11 | **DATA-ENGINE WIDENING — queued, fires the moment line 10 ticks** (founder-ruled 10 Jul: critical, first-after-sprint — not sprint-blocking, so it queues here rather than jumping the line-10 gate) — **#452 more discovery engines** beyond PDL (Apollo free/BYOK · Cognism · aggregator per item-243 research) · **#451 Clearbit executed + reveal waterfall ENFORCED end-to-end** (PDL→Hunter→Clearbit) · **#450 free-Apollo-key merge** switched on | 🤖 build · 🧍 keys |

> **📐 The money machine spec (8a) — full flow, fences, onboarding + admin Money Path, and the locked numbers (k=2 · $300 cap · trial 10+2/reveal):** [money-path flowchart artifact](https://claude.ai/code/artifact/d7d22dab-d9ac-43e0-8ac3-c7a1ae08e65e). Unit economics + CAC = `run-costs-and-cashflow.md` §0 + §5e.

**Parked until a client pays (one line, no detail):** everything else — the agent family, marketplace, partner/referral growth work (3–5 strong partners → V2-TRACKER PARTNER GTM), admin nice-to-haves, the 440-item inventory (FROZEN, archive only), legal sign-offs ride the lawyer track in parallel. *(Data-engine widening #450/#451/#452 is NOT on this shelf — it's line 11 above, first out of the gate after line 10.)*

**Note (not sprint-blocking):** **#453 Demo mode** serves the **sales-demo motion** — an `is_demo` client runs a full loop (source → reveal → FIGSY drafts) at **$0** and can never email a real prospect, so the founder can demo live without cost or risk; the Money Path shows real economics only. Ships alongside the sprint, doesn't gate line 10.

**Board (frozen archive):** 🟢90 · 🩷148 · 🟣1 · 🟡18 · 🔴218 · ⏸5 · **Σ480** · live count: `scripts/count-inventory.sh`

### 🔑 Legend
**Status:** 🔴 not built · 🟡 built, on a branch/PR · 🟣 approved on preview · 🩷 live, not verified · 🟢 live + verified · ⏸ blocked
**Owner:** 🤖 **Claude** (writes code, opens PRs) · 🧍 **You** (merge · deploy · give access · approve · run prod-SQL) · 🤝 **both**

### ⚠️ HOW THINGS GO LIVE — a merge is NOT a deploy
GitHub is flagged → auto-deploy is off. Each change ships **by hand**: **🧍** merge PR → **🧍** `git pull` → **🧍** `railway up --detach --service "<svc>"`.
Services: **website = `KIND`** · portal = `@kind/portal` · admin = `@kind/admin` · api = `@kind/api`. *(Claude can't deploy — no Railway access.)*

### ▶ DO NOW = the SPRINT table at the top of this doc. Nothing else.
*(The founder rulings folded into it: line 7 = the 3 pricing rules · Templates ruled a FIGSY M0-build, parked behind line 10 · What's New ruled REMOVED (ships inside line 2) · the old DO-NOW's #406 rebuild is superseded by line 2's harder cut — agents come OUT, not "coming soon".)*

---

# 🧭 THE ROADMAP — 5 BLOCKS (22 Jul, founder-locked)
> **The runlist of record.** Tick a box the same session its PR merges (every PR names its block item, e.g. "Block 1.4 — calendar"). **Status of record stays in PRODUCT-INVENTORY** (IDs referenced per row) — these boxes track execution, not status. Per-agent capability detail → V2-TRACKER AGENT CAPABILITY SPECS. Blocks 1–2 = the 8 free days ($0, demo-mode provable); Blocks 3–5 = after payday, founder picks order.

## ⓪ THE GATE — the SPRINT still comes first
The SPRINT table at the top IS the immediate MVP. Its money steps (PDL · inboxes · fire outreach) wait for **payday (day 8)**; Blocks 1–2 fill those 8 days with $0 build so payday is go-live, not debugging. **Payday order: ① PDL $98 → ② reactivate Instantly (our outreach inboxes, ~4 wks warm) → ③ buy Smartlead pre-warmed inboxes (clients send day 1, #270 SOP) → ④ money-machine walk to the cent → ⑤ kill-switch ON, cap 20/day.**

## BLOCK 1 — FIGSY 100% (basic) · days 1–4 + payday
| ✔ | # | Item | Inventory IDs | Owner | Time |
|---|---|------|---------------|-------|------|
| ⬜ | 1.1 | Demo-mode walk — click-by-click full-loop test, free, finds bugs | #453 | 🤝 | Day 1 |
| ✅ | 1.2 | Docs reconcile — roadmap stamped as runlist + 11 stale dots flipped to code truth | — | 🤖 | Day 1 |
| ✅ | 1.3 | Bug sweep (12 fixes) — 11 were already fixed in code (verified line-by-line); #15 co-pilot review gate built + Fable-verified + shipped | #345 #354 #358 #365 #367 #375 #376 #383 #391 #392 #400 #15 | 🤖 | Days 1–2 |
| ✅ | 1.4 | Calendar booking — prospect self-serve booking page + CSRF fix built + Fable-verified + merged (🧍 walk needs Google OAuth creds on @kind/api) | #361 #368 | 🤖 | Days 2–3 |
| ⬜ | 1.5 | Send engine — per-client Smartlead sending, code staging-proven, dormant till inboxes bought | #211 #270 #271 | 🤖 | Days 3–4 |
| ⬜ | 1.6 | Discovery paging — kill the ~50-lead ceiling | #366 | 🤖 | Day 4 |
| ⬜ | 1.7 | Truth docs — Terms §5 · Stripe description · unit economics | #413 #414 #415 | 🤝 | Day 4 |
| ⬜ | 1.8 | PAYDAY switch-on — PDL + Smartlead pre-warmed + Instantly reactivated + fire outreach | #198 | 🧍 | Day 8 |

## BLOCK 2 — MILLA + VIDA 100% (basic) · days 4–8
| ✔ | # | Item | Inventory IDs | Owner | Time |
|---|---|------|---------------|-------|------|
| ⬜ | 2.1 | Milla knowledge — pgvector semantic memory (free) | #120 | 🤖 | Day 4 |
| ⬜ | 2.2 | Milla layer (+$1) — the locked 10-feature "understood lead" spec | #427 | 🤖 | Days 4–5 |
| ⬜ | 2.3 | Denise absorbed (+$1) — the locked 12-feature reply→close spec | #428 | 🤖 | Days 5–6 |
| ⬜ | 2.4 | Brain v1 — shared store all agents write, Milla reads (self-optimise = Block 4.4) | #476 | 🤖 | Day 6 |
| ⬜ | 2.5 | Vida engine ($3) — the locked 12-feature inbound-qualification spec, live on website chat | #429 | 🤖 | Days 6–7 |
| ⬜ | 2.6 | Vida knowledge — wired to Milla's memory (stops invented answers) | #362 | 🤖 | Day 7 |
| ⬜ | 2.7 | WhatsApp code-ready — HMAC + multi-tenant built, waits on Meta | #359 #360 | 🤖 | Day 7 |
| ⬜ | 2.8 | Meta application filed (free, starts their approval clock) | #128 | 🧍 | Day 7 |
| ⬜ | 2.9 | Full 3-agent demo walk + Fable verification pass | — | 🤝 | Day 8 |

## BLOCK 3 — FIGSY upgrades · ~2–3 wks after payday
| ✔ | # | Item | Inventory IDs | Owner | Time |
|---|---|------|---------------|-------|------|
| ⬜ | 3.1 | Deliverability 10/10 — warm rig + reputation to inbox-not-spam | #101 #198 | 🤝 | 1 wk |
| ⬜ | 3.2 | LinkedIn channel — daily touches via PhantomBuster, honest states | #127 #388 | 🤖 | 3 days |
| ⬜ | 3.3 | Smart sending — adaptive volume, inbox rotation, CRM pull | #140 | 🤖 | 3 days |
| ⬜ | 3.4 | Lead signals — job changes, hiring, tech stack on lead cards | #79 #247 | 🤖 | 3 days |
| ⬜ | 3.5 | Self-learning ICP — "narrow your ICP?" suggestions | #156 | 🤖 | 2 days |
| ⬜ | 3.6 | Visual sequence builder — drag-and-drop UI | #82 #155 | 🤖 | 3 days |
| ⬜ | 3.7 | Views + fields — score heatmap, timeline, custom fields | #153 #154 | 🤖 | 2 days |
| ⬜ | 3.8 | Voice calling — FIGSY calls prospects (Vapi $) | #475 #229 | 🤝 | 1 wk |

## BLOCK 4 — MILLA upgrades · ~1–2 wks
| ✔ | # | Item | Inventory IDs | Owner | Time |
|---|---|------|---------------|-------|------|
| ⬜ | 4.1 | Account VA — ask-anything on your docs + weekly brief (parked-M4 Milla, revived) | #2 | 🤖 | 3 days |
| ⬜ | 4.2 | AI notetaker | #81 | 🤖 | 3 days |
| ⬜ | 4.3 | Proposals + e-sign | #149 | 🤖 | 3 days |
| ⬜ | 4.4 | Brain self-optimise — tunes angles/timing across agents (the moat, full) | #476 | 🤖 | 1 wk |
| ⬜ | 4.5 | Real connectors — HubSpot/Gmail actually connected (kills the #395 mock) | #395 #399 | 🤝 | 1 wk |

## BLOCK 5 — VIDA upgrades · ~1–2 wks
| ✔ | # | Item | Inventory IDs | Owner | Time |
|---|---|------|---------------|-------|------|
| ⬜ | 5.1 | WhatsApp live — switch on when Meta approves | #128 #360 | 🤝 | Meta's clock |
| ⬜ | 5.2 | Voice inbound — Vida answers + qualifies by voice (Vapi $) | #475 #96 | 🤝 | 1 wk |
| ⬜ | 5.3 | Branching lead-capture forms | #205 | 🤖 | 2 days |
| ⬜ | 5.4 | Visitor intelligence — de-anonymise site visitors | #165 | 🤖 | 3 days |

> **Deferred by physics/money, not choice:** voice (Vapi $) · WhatsApp live (Meta's clock) · extra discovery engines needing paid keys (#450–#452 ride Block 3). Alta-parity detail → V2-TRACKER.

## 🅧 PARKED — the two-sided marketplace *(decided against 14 Jul)*
The Milla/Vida two-sided "problem marketplace" (old Milestone X · inventory #457–#467) is **PARKED** — it risked becoming a Checkatrade-style liquidity game and forcing a site rename, off-strategy for a hyper-focused lead product. The 2–3 good Jack & Jill *ideas* live on in FIGSY (②). Not deleted — superseded; revisit only after paid clients prove the core.

## ⚖️ PARALLEL — legal track *(always on, not sprint-blocking)*
Lawyer/accountant sign-offs (#432–#436 · #410/#413/#414) ride their own track — required before external use, never blocking the build.

---

# 📦 BACKLOG DETAIL — FIGSY honesty + the money machine *(mostly DONE — see BUILD PATH ① · money machine #420–#426 shipped in #1057; Phase-3 fixes → BUILD PATH ②)*

### 🟡 CRITICAL — LEGAL DOCS (factual fixes done 8 Jul · ⚖️ **still owe your + lawyer/accountant sign-off before external use** · legal is always critical)
Factual staleness (Apollo→PDL+Hunter, subscriptions→per-lead, REEVE/LENA/OTTO→Denise/Tony) **corrected in-doc**. The judgment calls (new data-rights position, HMRC/DPA/partner-contract wording) were **NOT auto-authored** — they carry review flags in each doc. **Do not use externally until signed off.**
| Item | Done (8 Jul) | ⚖️ Owed | Owner |
|---|---|---|:---:|
| #432 🟡 | `legal.md` — SUPERSEDE banner (Apollo moot; 250M/sends/subs flagged) | lawyer: fresh PDL+Hunter data-rights review | 🧍 |
| #433 🟡 | `legal/legal-pack.md` — DPA sub-processor list → PDL+Hunter+Flutterwave; REEVE/LENA/OTTO→Denise/Tony | legal review + match on-site /dpa | 🧍 |
| #434 🟡 | `legal/seis-advance-assurance-draft.md` — revenue → per-qualified-lead (no subs) | accountant/solicitor: confirm before HMRC filing | 🧍 |
| #435 🟡 | `legal/partner-agreement.md` — comp → collected per-lead revenue (MRR removed) | legal sign-off before signing partners | 🧍 |
| #436 🟡 | `legal/it-security-pack.md` + `key-rotation-runbook.md` — Apollo removed from registers | light review | 🧍 |

## PHASE 1 · TRUTH SWEEP — site + portal say ONLY what FIGSY + Lead-Gen ($1 reveal) actually do; everything else STAYS, marked "coming soon" + greyed. **Client-facing → preview first (§11).**

### STEP 1 — WEBSITE ✅ COMPLETE (9 Jul)
Shipped + founder-walked live → **13 items 🟢** in PRODUCT-INVENTORY: **#405 #394 #408 #419 #430 #417 #418 #348 #403 #409 #366 #411 #416.**
⏸ **Held — legal / lawyer track** (not shipped): **#410** (privacy/dpa/terms sub-processor Apollo→PDL+Hunter) · **#413** (Terms §5 rewrite to two-charge) · **#414** (Stripe checkout description) · **#407** (docs Apollo/250M cleanup ledger).

### STEP 2 — PORTAL up to date (same principle) — 🩷 SHIPPED, pending founder walk (PR #1021, Fable-audited 2 rounds)
Portal truth sweep live-not-verified → **6 items 🩷** in PRODUCT-INVENTORY: **#385 #384 #412 #395 #396 #399** (21-Jul audit fix: **#406 is still 🔴 — not built**, was wrongly grouped here). Merge order: **#1021 → `railway up @kind/api` + `@kind/portal` → walk → then 🟢.**
| Item | What it is | Owner |
|---|---|:---:|
| #406 🔴 | Portal sweep — every screen: not-real → "coming soon" + grey. **Milla/Vida/Denise/Tony + notetaker greyed; agent subs (#26) unbuyable; billing shows only the two real wallets ($1 reveal · $3 FIGSY) + sells the REVEAL top-up packs ($20/$40/$100 — #420 un-retire). Named sub-rocks: #395 Milla mock "synced" UI · #396 Denise false claims · #399 integrations shell.** | 🤖 |
| #385 🩷 | Usage page "$1/lead overage" panel → wire it to the **REAL $1 reveal ledger** (was a fake panel) | 🤖 |
| #384 🩷 | Dead portal buttons (Export CSV, etc.) → wire or coming-soon | 🤖 |
| #412 🩷 | `proposals` portal screen missing from the sweep checklist → add it | 🤖 |

## PHASE 2 · MONEY PATH — build the two-charge model. Each a small **tested, staging-proven** PR. Spec = `run-costs-and-cashflow.md` §0.
| Item | What it is | Owner |
|---|---|:---:|
| **#420** | **TWO-CHARGE MONEY MODEL — $1 reveal + $3 work = $4** (umbrella #421–#426; two wallets; un-retire lead_gen as reveal tier) | 🤝 |
| #421 🔴 | Atomic `try_charge_reveal_credit` + fail-closed refund-on-failed-reveal (supersedes #376) | 🤖 |
| #422 🔴 | Reveal gating — mask email in browse; reveal only on the $1 charge | 🤖 |
| #423 🔴 | Sourcing quotas — PDL spent at *sourcing* (~$14/run); cap per client/day + regen cap (#374) | 🤖 |
| #424 🔴 | Charge-once-per-lead — per-lead idempotency + DB uniques ($1 once, $3 once) | 🤝 |
| #425 🔴 | Trial credit mix — reveal + work credits (20 free are FIGSY-only today) | 🤝 |
| #426 🔴 | Enforce 10-step sequence cap (bounds per-lead work cost) | 🤖 |
| #427 🔴 | Milla per-lead intelligence layer +$1 (FIGSY/Vida leads; reasons over paid PDL data — no new buys; separate from account-VA Milla, parked M4) | 🤖 |
| #428 🔴 | Denise per-lead action layer +$1 (reply→close scope; FIGSY owns cold→reply) | 🤖 |
| #429 🔴 | Vida inbound engine $3/qualified inbound + add-ons ($4/$5); spam-guard + "qualified" definition (R3) | 🤖 |
| #431 🔴 | Retire agent-subscription billing (reframes #340/#341/#342/#357/#386; ties #26) | 🤝 |

### 🎯 M/V/D LAYER FEATURE SCOPE (founder-locked 9 Jul · features only, pricing = #420) — the full build list behind #427/#428/#429
> Build one at a time, phase by phase — not in one go. Status of record = inventory #427/#428/#429 (🔴). Full spec + FIGSY current-features → V2-TRACKER AGENT CAPABILITY SPECS.

**#427 · Milla — lead intelligence layer** *(qualified lead → **understood** lead)* · owner 🤖
1. Explains why this lead is a fit · 2. Matches the lead to the right product/service · 3. Identifies likely pain points · 4. Suggests the best outreach angle · 5. Pulls relevant company context into the lead card · 6. Adds source-backed reasoning where possible · 7. Creates "what to say to this lead" notes · 8. Highlights similar past wins / converting patterns · 9. Flags weak-fit or risky leads before outreach · 10. Suggests which offer/message to use.

**#428 · Denise — sales action layer** *(qualified lead → **ready-to-send sales motion**; R2: FIGSY owns cold→first-reply, Denise owns reply→close)* · owner 🤖
1. Writes the first outreach message · 2. Creates a 3-step follow-up pack · 3. Suggests the next best action · 4. Generates objection replies · 5. Prepares call notes · 6. Writes proposal intro/context · 7. Creates post-call follow-up drafts · 8. Summarises buyer intent · 9. Recommends urgency level · 10. Flags deals that need chasing · 11. Suggests when to stop following up · 12. Turns Milla's insights into actual sales copy.

**#429 · Vida — inbound qualification layer** *(website + WhatsApp visitors → **qualified leads**)* · owner 🤖
1. Qualifies inbound visitors against the same ICP rules · 2. Captures name/company/email/phone/need · 3. Scores inbound leads 0–100 · 4. Detects urgency + buyer intent · 5. Filters out spam + bad-fit enquiries · 6. Summarises the conversation · 7. Suggests the next best reply · 8. Routes hot leads for immediate follow-up · 9. Adds booking link when appropriate · 10. Pushes qualified inbound into CRM/export · 11. Hands off to Denise for follow-up copy · 12. Hands off to Milla for company-specific context.

## PHASE 3 · RELIABLE — fix FIGSY's own faults so it *works fully*. Each a small **tested** PR. **Do #338 + #339 first.**
| Item | What it is | Owner |
|---|---|:---:|
| #338 🩷 | FIGSY marks an email "sent" even if the send failed — charges $3 for nothing | 🤖 |
| #339 🩷 | The founder alarm can itself fail silently — you'd never know | 🤖 |
| #346 🔴 | Client can't enter their business knowledge → generic copy (turn the UI on) | 🤖 |
| #354 🩷 | No guard against sending the same email twice | 🤖 |
| #349 🔴 | ~140 money writes don't check for failure → the ledger can silently drift | 🤖 |
| #366 🔴 | Sourcing stops at ~50 leads (no pagination) *(wording half in Phase 1)* | 🤖 |
| #358 🩷 | If the AI scorer errors, every lead gets a fake score of 50 | 🤖 |
| #367 🩷 | If the email-reveal quota runs out, 0 leads deliver with no alert | 🤖 |
| #347 🩷 | "Approve before send" queue points at the wrong table → dead | 🤖 |
| #343 🔴 | Crons run on every server copy → duplicate sends | 🤖 |
| #344 🩷 | The kill-switch doesn't actually stop the cron sends | 🤖 |
| #345 🩷 | A client can pull another client's lookalike data (tenant leak) | 🤖 |
| #350 🔴 | The `visitor_sessions` table is publicly readable (data leak) | 🤖 |
| #353 🔴 | "Your trial has ended" email can send repeatedly | 🤖 |
| #356 🩷 | Consent emails aren't inside the outreach gate | 🤖 |
| #363 🔴 | `/admin/seed-leads` can overwrite real client leads | 🤖 |
| #365 🩷 | A demo endpoint can inject fake KPIs into a client dashboard | 🤖 |
| #371 🔴 | Welcome/trial credit grants aren't atomic (race → wrong balance) | 🤖 |
| #373 🔴 | Missing uniqueness constraints on FIGSY tables in prod | 🤖 |
| #374 🔴 | Intent-signal auto-enroll can drain the wallet unbounded *(ties #423)* | 🤖 |
| #376 🩷 | Delivery can overdraw credits (decrement not checked) *(→ superseded by #421)* | 🤖 |
| #379 🩷 | A Stripe refund path returns 500 instead of clawing credits back | 🤖 |
| #383 🩷 | Missing DB function to count FIGSY emails sent | 🤖 |
| #389 🔴 | No migration runner (prod schema is hand-pasted) — risky | 🤖 |
| #390 🔴 | No dead-letter/retry table — failures just vanish | 🤖 |
| #400 🩷 | "South-African-sounding name" prompt residue → make it global | 🤖 |
| #401 🔴 | A few inventory dots were lying → corrected | 🤖 |
| #402 🔴 | Small auth nits (team role unvalidated, seat enumeration) | 🤖 |
| #212 🩷 | **⬆ M2→M0 (founder-locked 9 Jul) · SEQUENCE DEPTH — engine sends 3 steps, site sells "up to 10"** — enrollment steps → jsonb array (≤10), stepper walks it + `wait_days`; enforce #426 cap in the builder API. **Full build spec in the #212 inventory row (code-verified file:line).** | 🤖 |
| #361 🩷 | **DIFFERENTIATOR — FIGSY books the meeting into your calendar** (founder-locked M4→M0): install googleapis + prospect-facing booking page. *#361a interim = booking-link "Launching"* | 🤝 |
| #368 🩷 | Calendar OAuth security (HMAC-sign state) — ships with #361 | 🤖 |
| #391 🩷 | ⛰️ *pulled in 9 Jul (scope verify)* — cron JSONB clobber can **resurrect a founder-set PAUSE** → sends resume unexpectedly (send-path integrity) | 🤖 |
| #392 🩷 | ⛰️ *pulled in 9 Jul* — A/B "winner" resolves on ZERO data if tracking unset → wrong copy auto-wins the send path | 🤖 |
| #375 🩷 | ⛰️ *pulled in 9 Jul* — self-outreach charges + cold-emails **placeholder addresses** → phantom charges + spam-trap risk to OUR sending reputation | 🤖 |
| #377 🔴 | ⛰️ *pulled in 9 Jul* — support black hole: client emails support → auto-reply phantom-sends, founder-forward suppressed. With ONE client, unacceptable | 🤖 |
| #378 🔴 | ⛰️ *pulled in 9 Jul* — demo-request auto-sends **invented availability times** to prospects (outward-facing honesty) | 🤖 |

## PHASE 4 · PROVE + SELL — prove on staging, then sell to ONE client · 🤝
🔴 a credit actually spent · an email that actually landed · knowledge visibly changes the copy · a real lead sources + reveals ($1) + sends ($3) · the alarm fires on a money failure.
| Item | What it is | Owner |
|---|---|:---:|
| #415 🔴 | **Do we make money?** — RESOLVED 8 Jul: ~$0.36/worked lead → ~91% margin at $4 (`run-costs-and-cashflow.md` §0). *Remaining = prove it live.* | 🧍 |
| #364 🔴 | ⛰️ *pulled in 9 Jul (scope verify)* — **demo/seed data pollutes the founder metrics** the proof reads from (CRO dashboard, active-paying counts). The Phase-4 "prove it" numbers must be demo-clean or the proof lies | 🤖 |
| — | **Walk the M0-original pinks** (#330–#334 + #337 are 🩷 live-not-verified) — the "fixed + tested" gate includes walking them; do it during the staging proof | 🧍 |

### M0 originals (#330–#337) — already shipped
| Item | What it is |
|---|---|
| #330 🩷 | Missing FIGSY-credit DB function — added |
| #331 🩷 | Free-trial client got leads forever — drip now drains |
| #332 🩷 | Enrollment now charges fail-closed (no free work) |
| #333 🩷 | Stripe under-grant fixed (client not short-changed) |
| #334 🩷 | Dead auto-top-up switch — greyed out |
| #335 🩷 | FIGSY knowledge-writing built — UI still off, see #346 |
| #336 🩷 | Referral bonus was farmable — purchase-gated |
| #337 🟡 | Money-path sweep |

**✅ M0 done when:** Phase 1 shipped (site + portal honest) · Phase 2 money path built **+ staging-proven** · Phase 3 fixed **+ tested** · Phase 4 proven on staging → one paying client.

---

# 📦 (folded into SPRINT line 9) — our own outreach = FIGSY RUNS IT (the product IS the channel)
> **Line 9 means dogfooding: K.I.N.D is a client of its own product.** The checklist to CONFIRM before firing — all inside FIGSY, not Instantly:
| Step | Action | Done when |
|---|---|---|
| 🛑 GATE | Money-machine walk (8b) proven + `AUTO_OUTREACH_ENABLED` flipped ON **deliberately** | walk done · switch ON |
| 1 | PDL credits bought (8a·①) + ICP for OUR target market (IT/SaaS per the locked GTM) | credits live · ICP saved |
| 2 | Domain state honest: gettingkind.com already carried the 400-send warm-up (7 Jul, 0 spam flags known) — set `FIGSY_WARMUP_START`/daily cap so ramp stays gentle | cap set |
| 3 | Sequence reviewed by you in the portal (FIGSY drafts, you approve the copy once) | copy approved |
| 4 | mail-tester.com on a test send (#101) | ≥9/10 |
| 5 | 🚀 Enrol the first batch — FIGSY sources → reveals → works, our own wallets pay the $1/$3 like any client (the case study IS the pitch) | running · watch replies + Outreach Scoreboard (#455/#1069) |

*(Legacy alternative kept for history: the old Instantly manual path — #198 warm-up ≥90%, 1,461-list import, `content/our-outreach-us-uk.md` sequences, #127. Superseded by dogfooding: if FIGSY can't run our outreach, it isn't sellable.)*

---

# 📦 (folded into SPRINT line 10) — a paying client runs it: what to CONFIRM before onboarding client #1
> The confirm-list for taking real money from a real client:
| ✓ | Confirm | Why |
|---|---|---|
| ⬜ | **#28b — the $60 live money walk**: real card → credits land → reveal $1 → work $3 → counters + ledger reconcile to the cent | the client's money must move exactly like the walk proved |
| ⬜ | **Demo ready**: a seeded `is_demo` account (#453) walks the full loop at $0 — your pitch environment (showcase re-seed = item 32) | you sell by showing, safely |
| ⬜ | **Tour walked** (8c): a fresh signup self-onboards without you in the room | self-serve product claim is true |
| ⬜ | **🧍 DECIDE — #211 Smartlead per-client sending isolation**: today ALL clients send through OUR shared identity. **Acceptable for client #1 or not — your explicit call**: their outreach reputation and ours are shared until #211 ships | the one real risk-acceptance for n=1; ship #211 before client #3+ regardless |
| — | ~~#212 sequence depth~~ (shipped ≤10 steps) · #199 sending monitoring (not client-blocking, queue post-client) | reference |
*Security + honesty gates already shipped 6 Jul (🩷).*

---

# 📦 BACKLOG DETAIL — admin cockpit *(mostly done, 13 screens walked; remainder is post-client polish)*
| Item | What it is | Owner |
|---|---|:---:|
| #291 🩷 | GTM funnel showed 367% — bug fixed (PR #978), re-walk after deploy | 🤝 |
| #279 🩷 | Deliverability graph — needs the bounce/complaint reporting endpoint | 🤖 |
| #289 🩷 | NPS — endpoint exists, migration not run + no clients yet | 🤖 |
| #290 🟡 | Sentry error tracking — not wired in | 🤖 |
| #364 🔴 | Demo data pollutes your founder metrics → exclude it | 🤖 |
*Ops inbox-pool / AE lenses / deliverability data wait on Smartlead (#211).*

---

# 📦 PARKED BACKLOG — everything non-FIGSY *(frozen until paid clients; account-level agents, subscriptions-to-delete, partner/referral, WhatsApp/voice, integrations, infra)*
In M0 these are made *honest* (kept, "coming soon"); **here** they're made *real* — one at a time, each proven before the next. Future build detail → V2-TRACKER. **The agents flipped 🔴 OUT OF PLAY in the inventory (Milla #2 · Vida #3 · Denise #4 · agent subs #26 · per-rep unlock #56 · family hub #125 · side-panel #113a · voice #96/#229 · notetaker #81 · Milla-render #248 · Denise seeds #58/#63/#73/#188) live here — code parked, portal-disabled via #406.**

> **🎯 Agent capability specs (founder-locked 9 Jul) — the M/V/D per-lead layer features are 🔴 MILESTONE 0, not here:** #427 (Milla) · #428 (Denise) · #429 (Vida) live in **M0 Phase 2 above** (see the M/V/D LAYER FEATURE SCOPE block); full spec → `V2-TRACKER` → AGENT CAPABILITY SPECS. Only the **account-level agent products** (Milla #2 · Vida #3 · Denise #4 and their listed sub-items) stay parked in this M4 section; the website shows all of it "coming soon" until built.

> **M4 FIGSY-relevance audit (8 Jul):** **#361 + #368 (calendar booking) sit in M0** — founder-locked differentiator. The rest are genuinely non-FIGSY **except** these **FIGSY-adjacent** ones, which stay M4 only because the features they belong to are *coming-soon at launch* — **promote any to M0 on your word:** #388 (LinkedIn channel) · #352 (FIGSY credit auto-top-up, currently disabled #334) · #391/#392/#393 (FIGSY A/B + adaptive-send + Campaign-Intelligence cluster) · #397/#399 (CRM-connect, behind the "CRM dedup" claim).

**Subscriptions (Milla/Vida/Denise billing)** — ⚠️ **RETIRING (#431):** the whole family moved to per-qualified-lead (#420). These five are no longer "fix" work — they become **delete the subscription machinery** (zero real subscribers).
| Item | What it is | Owner |
|---|---|:---:|
| #340 🔴 | Subscription goes "active" even on a failed/incomplete card | 🤖 |
| #341 🔴 | Cancelling a subscription doesn't actually cancel it in Stripe | 🤖 |
| #342 🔴 | The subscription "lapse" cron 500s every day | 🤖 |
| #357 🔴 | MRR is structurally $0 (the subscription amount is never stored) | 🤖 |
| #386 🔴 | Onboarding can double-submit a subscription | 🤖 |

**Partner + referral**
| Item | What it is | Owner |
|---|---|:---:|
| #351 🔴 | Partner commission math wrong (20% recurring, no clawback) | 🤖 |
| #355 🔴 | Referral link drops the `?ref=` → referral can't be earned | 🤖 |
| #370 🔴 | Partner lookup is injectable (`.ilike` on email) | 🤖 |
| #372 🔴 | `allocate_pool_to_rep` destroys pool credits | 🤖 |
| #387 🔴 | Referral attribution is swallowed | 🤖 |
| #398 🔴 | "Wise integration" — partner payouts are actually manual | 🤖 |

**Other agents — real builds**
| Item | What it is | Owner |
|---|---|:---:|
| #362 🔴 | Vida has no knowledge layer (sold "no hallucinations") | 🤖 |
| #360 🔴 | WhatsApp uses one global number — not per-client | 🤖 |
| #359 🔴 | WhatsApp webhook is forgeable (no signature check) | 🤖 |
| #369 🔴 | Voice/Vapi webhook fails open if the secret is unset | 🤖 |
| #396 🩷 | Denise false claims ("trained on closed-won / confirms meetings") | 🤖 |
| #395 🩷 | Milla page shows a fake "HubSpot/Gmail connected" mock | 🤖 |
| #388 🔴 | LinkedIn steps stuck (PhantomBuster not wired) | 🤖 |
| #404 🔴 | Lena agent is dead code (never mounted → 404) | 🤖 |

**Auto top-up + integrations + infra + ops**
| Item | What it is | Owner |
|---|---|:---:|
| #352 🔴 | Auto top-up can double-charge a card | 🤖 |
| #399 🩷 | Integrations hub — all 8 "Connect" tiles are dead | 🤖 |
| #397 🔴 | HubSpot platform sync is dead code | 🤖 |
| #375 🩷 | Our own self-outreach sends are dead | 🤖 |
| #377 🔴 | Support inbox auto-reply phantom-sends → black hole | 🤖 |
| #378 🔴 | `/ae/demo-request` hallucinates availability | 🤖 |
| #380 🔴 | Missing tables (`subscribers` / `whatsapp_messages`) | 🤖 |
| #381 🔴 | Developer webhooks section is dead (no table) | 🤖 |
| #382 🔴 | Churn scoring reads a column that's never written | 🤖 |
| #391 🩷 | Cron JSONB writes clobber each other | 🤖 |
| #392 🩷 | A/B test "wins" on zero data | 🤖 |
| #393 🔴 | Data-moat table gets duplicate rows (no dedup key) | 🤖 |

**✅ M4 done when:** each item is rebuilt (state machine + provider-confirmed + tests) and its "coming soon" is lifted — one at a time.

---

# 🅧 PARKED / SUPERSEDED (14 Jul) — Milla &amp; Vida two-sided marketplace *(founder decided against — Checkatrade risk + rename; ideas absorbed into FIGSY per BUILD PATH ②)*
> **The "X" is the SpaceX-style big swing — the next chapter, parked behind the sprint.** REFRAME of Milla/Vida into a two-sided marketplace: **Milla = the business portal** (current portal + FIGSY, two lead sources: FIGSY outbound *current* + Vida-matched inbound *new*) · **Vida = a free demand portal** where *anyone with a problem* (dentist · photographer · "cut my grass") is matched to a business that solves it. Broadens the customer base from B2B-only to any problem-holder; a Vida user is a free, consented, in-market lead. **→ DECIDED AGAINST 14 Jul (see header) — kept as history.**
> **Decisions (11 Jul):** layer onto the existing portal (NO rewrite) · spec now, build Vida after the 1st paying Milla client · Vida free / Milla pays per **accepted** match on the existing reveal rails · deep in ONE vertical first · never claim a "database of problems" until counted live.
> **Login (added 12 Jul, fact-checked):** LinkedIn is **one optional** Vida login method, never mandatory (a mandatory gate would block the "cut my grass" consumer persona this milestone exists to reach). Company/context is captured **inside the intake conversation**, self-reported — LinkedIn's self-serve OAuth returns name/email/photo only, NOT company/work history (that needs LinkedIn's gated Partner Program — parked, low-confidence, not planned around).
> **Tracked:** inventory **#457–#467** (🔴) · full four-spec detail → **V2-TRACKER** "MILLA &amp; VIDA — TWO-SIDED". **Nothing here starts until the SPRINT (first paying client) lands** — this is the destination, not the next sprint.

---

## 📌 Standing notes
- **Money model (LOCKED 8 Jul ~10pm, Fable-verified — per qualified lead, no subscriptions):** **$1 reveal → +$3 FIGSY = $4 → +$1 Milla = $5 → +$1 Denise = $6**; **Vida inbound $3** + same add-ons → $4/$5. **Two engines** (FIGSY outbound · Vida inbound) **× two layers** (Milla intelligence · Denise action). Charged once each per lead; no refund on outcome. Two wallets ($1 reveal `credit_balance` + $3 work `figsy_credits`); +$1 layers charged at enroll when toggled. Full stack $6 ≈ **~92% margin**; +$1 layers ≈ 95%+ (one Haiku call, reasons over already-paid PDL data). $1 gates Hunter+visibility; **PDL spent at sourcing → quotas, not the charge.** Spec = #420–#431. *(PDL+Hunter keys set. No Apollo.)*
  - **R1 (pricing marketing):** "Two engines. Two layers. One price: per qualified lead." Engine cards (FIGSY buyable · Vida coming-soon) + layer cards (Milla/Denise +$1) + comparison FIGSY·Vida·+Milla·+Denise. No "$/month" anywhere (#430).
  - **R2 (FIGSY/Denise boundary):** FIGSY owns **cold → first reply** (outreach copy + sequence); Denise owns **reply → close** (objections, proposals, post-call, chase).
  - **R3 (qualified-lead definition — needs founder+legal sign-off, ties #413):** ICP-match + verified contact + score ≥ threshold (~60); Vida = captured contact + ICP-fit + real intent, spam never billed.
- **Sell FIGSY + Lead-Gen only; everything else STAYS "coming soon."** The non-FIGSY agents are 🔴 OUT OF PLAY in the inventory (code parked M4) — NOT deleted from site/portal, just greyed + coming-soon (#405/#406). When they return they come back as **per-lead layers/engine (#427–#429), not subscriptions.**
- **Before any real send:** check `/engine/env` — `RESEND_API_KEY` · `ADMIN_SECRET_KEY` · `ANTHROPIC_API_KEY` · `RESEND_WEBHOOK_SECRET` · `FIGSY_COLD_FROM` · `TRACKING_URL`.
- **Architecture (locked):** AI drafts/scores; deterministic code decides + **fails closed**; state advances only after verified provider/DB success. Reasoning → `AUDIT-8JUL-DEEP.md §4–10`.
