# 🚀 K.I.N.D — LAUNCH PAD

> The **one** day-to-day page: what to do now · who owns it · where it stands. One line per item.
> Status of record → **PRODUCT-INVENTORY** · why/history → **KIND-MASTER** · future detail → **V2-TRACKER** · deep audits → **AUDIT-8JUL-DEEP.md** (code) + **AUDIT-8JUL-STALE-SWEEP.md** (docs) · M0 punch-list → **MILESTONE-0-CHECKLIST.md**.

**THE PLAN (locked 8 Jul):** **one price logic across the whole family — per qualified lead. No subscriptions, no contracts, no order-forms.** Ladder: **$1 reveal → +$3 FIGSY = $4 → +$1 Milla = $5 → +$1 Denise = $6**; **Vida inbound $3** + same add-ons → $4/$5. Sell **FIGSY + Lead-Gen** now; **Milla · Vida · Denise · Tony STAY on site + portal marked "coming soon" + greyed** (built in **M4**, never deleted). **Milestone 0 is the gate** — make FIGSY + Lead-Gen *honest → work fully → proven* before one real client.

**Board:** 🟢111 · 🩷92 · 🟣3 · 🟡23 · 🔴206 · ⏸5 · **Σ440**  ·  live count: `scripts/count-inventory.sh`

> **📍 STATUS OF RECORD = PRODUCT-INVENTORY (the script-counted board).** This doc no longer carries per-item status dots — they drifted every time the inventory changed. LAUNCH-PAD now lists only **what's next + who owns it**; for the live status of any `#id`, read PRODUCT-INVENTORY. The board number above is the one figure kept in sync (validated by `count-inventory.sh --check`).

**VERIFIED STATE (9 Jul):** ✅ **Phase 1 website truth sweep — LIVE + founder-walked → 13 items 🟢** (#405 #394 #408 #419 #430 #417 #418 #348 #403 #409 #366 #411 #416). Site now shows the honest per-qualified-lead model: **Lead-Gen $1 · FIGSY $4 ($1 reveal + $3 work) · no subs/trials/contracts**; Milla/Vida/Denise coming-soon; FIGSY calendar booking = "Launching". **⚠️ The site is ahead of the code** — `constants/index.ts` still encodes the old subscription model → **Phase 2 (money path #420–#431) builds what the site now sells.**

### 🔑 Legend
**Status:** 🔴 not built · 🟡 built, on a branch/PR · 🟣 approved on preview · 🩷 live, not verified · 🟢 live + verified · ⏸ blocked
**Owner:** 🤖 **Claude** (writes code, opens PRs) · 🧍 **You** (merge · deploy · give access · approve · run prod-SQL) · 🤝 **both**

### ⚠️ HOW THINGS GO LIVE — a merge is NOT a deploy
GitHub is flagged → auto-deploy is off. Each change ships **by hand**: **🧍** merge PR → **🧍** `git pull` → **🧍** `railway up --detach --service "<svc>"`.
Services: **website = `KIND`** · portal = `@kind/portal` · admin = `@kind/admin` · api = `@kind/api`. *(Claude can't deploy — no Railway access.)*

### ▶ DO NOW — in order (only the true next actions) · *updated 9 Jul PM — hand-off-ready*
| # | Task | Owner |
|---|------|:---:|
| 1 | **Merge PR #1017** (Phase-2 money core: masked delivery + $1 reveal + audit fixes — Fable-audited, 3 holes closed, 87/87 tests) → **run `supabase/migrations/20260709_reveal_charge.sql` on kind-staging then prod (BEFORE the deploys)** → `railway up --detach --service "@kind/api"` + `"@kind/portal"` → walk the 8-step test script in the PR body. *Merging fires the autoflip first run: `Flips: #421 #422 #423 #425` → 🩷 automatically.* | 🧍 |
| 2 | **Merge PR #1018** (M0 scope verify — 7 gray rocks pulled into the phases, docs-only) | 🧍 |
| 3 | **Build #212 sequence depth** (M0, founder-locked 9 Jul) — engine 3-step → ≤10-step. **Spec + verified file:line map in the #212 inventory row**; design read done (campaign `settings.steps` already N-step — the rails exist). | 🤖 |
| 4 | **Phase 2 remainder** — #424 (⚠️ needs founder rule: $3 once-per-lead-EVER vs per-campaign) · #431 retire subscription machinery · #426 10-step cap (ships with #212) · portal reveal top-up packs (in #406) | 🤖/🤝 |
| 5 | **Phase 1 Step 2 — portal truth sweep** (#406 #385 #384 #412 + named rocks #395/#396/#399) | 🤖 |
| 6 | FIGSY reliability — **#338 + #339 first**, then the Phase-3 list (incl. the 5 pulled-in rocks #391/#392/#375/#377/#378) | 🤖 |
| 7 | Held: `small-business-playbook.html` per-lead totals (your packaging) · legal #410/#413/#414/#407 (lawyer track) | 🤝 |

---

# ⓪ MILESTONE 0 — make FIGSY + Lead-Gen *honest → work fully → proven* · the gate to selling · owner 🤖 (you merge+deploy)

### 🟡 CRITICAL — LEGAL DOCS (factual fixes done 8 Jul · ⚖️ **still owe your + lawyer/accountant sign-off before external use** · legal is always critical)
Factual staleness (Apollo→PDL+Hunter, subscriptions→per-lead, REEVE/LENA/OTTO→Denise/Tony) **corrected in-doc**. The judgment calls (new data-rights position, HMRC/DPA/partner-contract wording) were **NOT auto-authored** — they carry review flags in each doc. **Do not use externally until signed off.**
| Item | Done (8 Jul) | ⚖️ Owed | Owner |
|---|---|---|:---:|
| #432 | `legal.md` — SUPERSEDE banner (Apollo moot; 250M/sends/subs flagged) | lawyer: fresh PDL+Hunter data-rights review | 🧍 |
| #433 | `legal/legal-pack.md` — DPA sub-processor list → PDL+Hunter+Flutterwave; REEVE/LENA/OTTO→Denise/Tony | legal review + match on-site /dpa | 🧍 |
| #434 | `legal/seis-advance-assurance-draft.md` — revenue → per-qualified-lead (no subs) | accountant/solicitor: confirm before HMRC filing | 🧍 |
| #435 | `legal/partner-agreement.md` — comp → collected per-lead revenue (MRR removed) | legal sign-off before signing partners | 🧍 |
| #436 | `legal/it-security-pack.md` + `key-rotation-runbook.md` — Apollo removed from registers | light review | 🧍 |

## PHASE 1 · TRUTH SWEEP — site + portal say ONLY what FIGSY + Lead-Gen ($1 reveal) actually do; everything else STAYS, marked "coming soon" + greyed. **Client-facing → preview first (§11).**

### STEP 1 — WEBSITE ✅ COMPLETE (9 Jul)
Shipped + founder-walked live → **13 items 🟢** in PRODUCT-INVENTORY: **#405 #394 #408 #419 #430 #417 #418 #348 #403 #409 #366 #411 #416.**
⏸ **Held — legal / lawyer track** (not shipped): **#410** (privacy/dpa/terms sub-processor Apollo→PDL+Hunter) · **#413** (Terms §5 rewrite to two-charge) · **#414** (Stripe checkout description) · **#407** (docs Apollo/250M cleanup ledger).

### STEP 2 — PORTAL up to date (same principle) — 🩷 SHIPPED, pending founder walk (PR #1021, Fable-audited 2 rounds)
Portal truth sweep live-not-verified → **7 items 🩷** in PRODUCT-INVENTORY: **#406 #385 #384 #412 #395 #396 #399.** Merge order: **#1021 → `railway up @kind/api` + `@kind/portal` → walk → then 🟢.**
| Item | What it is | Owner |
|---|---|:---:|
| #406 | Portal sweep — every screen: not-real → "coming soon" + grey. **Milla/Vida/Denise/Tony + notetaker greyed; agent subs (#26) unbuyable; billing shows only the two real wallets ($1 reveal · $3 FIGSY) + sells the REVEAL top-up packs ($20/$40/$100 — #420 un-retire). Named sub-rocks: #395 Milla mock "synced" UI · #396 Denise false claims · #399 integrations shell.** | 🤖 |
| #385 | Usage page "$1/lead overage" panel → wire it to the **REAL $1 reveal ledger** (was a fake panel) | 🤖 |
| #384 | Dead portal buttons (Export CSV, etc.) → wire or coming-soon | 🤖 |
| #412 | `proposals` portal screen missing from the sweep checklist → add it | 🤖 |

## PHASE 2 · MONEY PATH — build the two-charge model. Each a small **tested, staging-proven** PR. Spec = `run-costs-and-cashflow.md` §0.
| Item | What it is | Owner |
|---|---|:---:|
| **#420** | **TWO-CHARGE MONEY MODEL — $1 reveal + $3 work = $4** (umbrella #421–#426; two wallets; un-retire lead_gen as reveal tier) | 🤝 |
| #421 | Atomic `try_charge_reveal_credit` + fail-closed refund-on-failed-reveal (supersedes #376) | 🤖 |
| #422 | Reveal gating — mask email in browse; reveal only on the $1 charge | 🤖 |
| #423 | Sourcing quotas — PDL spent at *sourcing* (~$14/run); cap per client/day + regen cap (#374) | 🤖 |
| #424 | Charge-once-per-lead — per-lead idempotency + DB uniques ($1 once, $3 once) | 🤝 |
| #425 | Trial credit mix — reveal + work credits (20 free are FIGSY-only today) | 🤝 |
| #426 | Enforce 10-step sequence cap (bounds per-lead work cost) | 🤖 |
| #427 | Milla per-lead intelligence layer +$1 (FIGSY/Vida leads; reasons over paid PDL data — no new buys; separate from account-VA Milla, parked M4) | 🤖 |
| #428 | Denise per-lead action layer +$1 (reply→close scope; FIGSY owns cold→reply) | 🤖 |
| #429 | Vida inbound engine $3/qualified inbound + add-ons ($4/$5); spam-guard + "qualified" definition (R3) | 🤖 |
| #431 | Retire agent-subscription billing (reframes #340/#341/#342/#357/#386; ties #26) | 🤝 |

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
| #338 | FIGSY marks an email "sent" even if the send failed — charges $3 for nothing | 🤖 |
| #339 | The founder alarm can itself fail silently — you'd never know | 🤖 |
| #346 | Client can't enter their business knowledge → generic copy (turn the UI on) | 🤖 |
| #354 | No guard against sending the same email twice | 🤖 |
| #349 | ~140 money writes don't check for failure → the ledger can silently drift | 🤖 |
| #366 | Sourcing stops at ~50 leads (no pagination) *(wording half in Phase 1)* | 🤖 |
| #358 | If the AI scorer errors, every lead gets a fake score of 50 | 🤖 |
| #367 | If the email-reveal quota runs out, 0 leads deliver with no alert | 🤖 |
| #347 | "Approve before send" queue points at the wrong table → dead | 🤖 |
| #343 | Crons run on every server copy → duplicate sends | 🤖 |
| #344 | The kill-switch doesn't actually stop the cron sends | 🤖 |
| #345 | A client can pull another client's lookalike data (tenant leak) | 🤖 |
| #350 | The `visitor_sessions` table is publicly readable (data leak) | 🤖 |
| #353 | "Your trial has ended" email can send repeatedly | 🤖 |
| #356 | Consent emails aren't inside the outreach gate | 🤖 |
| #363 | `/admin/seed-leads` can overwrite real client leads | 🤖 |
| #365 | A demo endpoint can inject fake KPIs into a client dashboard | 🤖 |
| #371 | Welcome/trial credit grants aren't atomic (race → wrong balance) | 🤖 |
| #373 | Missing uniqueness constraints on FIGSY tables in prod | 🤖 |
| #374 | Intent-signal auto-enroll can drain the wallet unbounded *(ties #423)* | 🤖 |
| #376 | Delivery can overdraw credits (decrement not checked) *(→ superseded by #421)* | 🤖 |
| #379 | A Stripe refund path returns 500 instead of clawing credits back | 🤖 |
| #383 | Missing DB function to count FIGSY emails sent | 🤖 |
| #389 | No migration runner (prod schema is hand-pasted) — risky | 🤖 |
| #390 | No dead-letter/retry table — failures just vanish | 🤖 |
| #400 | "South-African-sounding name" prompt residue → make it global | 🤖 |
| #401 | A few inventory dots were lying → corrected | 🤖 |
| #402 | Small auth nits (team role unvalidated, seat enumeration) | 🤖 |
| #212 | **⬆ M2→M0 (founder-locked 9 Jul) · SEQUENCE DEPTH — engine sends 3 steps, site sells "up to 10"** — enrollment steps → jsonb array (≤10), stepper walks it + `wait_days`; enforce #426 cap in the builder API. **Full build spec in the #212 inventory row (code-verified file:line).** | 🤖 |
| #361 | **DIFFERENTIATOR — FIGSY books the meeting into your calendar** (founder-locked M4→M0): install googleapis + prospect-facing booking page. *#361a interim = booking-link "Launching"* | 🤝 |
| #368 | Calendar OAuth security (HMAC-sign state) — ships with #361 | 🤖 |
| #391 | ⛰️ *pulled in 9 Jul (scope verify)* — cron JSONB clobber can **resurrect a founder-set PAUSE** → sends resume unexpectedly (send-path integrity) | 🤖 |
| #392 | ⛰️ *pulled in 9 Jul* — A/B "winner" resolves on ZERO data if tracking unset → wrong copy auto-wins the send path | 🤖 |
| #375 | ⛰️ *pulled in 9 Jul* — self-outreach charges + cold-emails **placeholder addresses** → phantom charges + spam-trap risk to OUR sending reputation | 🤖 |
| #377 | ⛰️ *pulled in 9 Jul* — support black hole: client emails support → auto-reply phantom-sends, founder-forward suppressed. With ONE client, unacceptable | 🤖 |
| #378 | ⛰️ *pulled in 9 Jul* — demo-request auto-sends **invented availability times** to prospects (outward-facing honesty) | 🤖 |

## PHASE 4 · PROVE + SELL — prove on staging, then sell to ONE client · 🤝
🔴 a credit actually spent · an email that actually landed · knowledge visibly changes the copy · a real lead sources + reveals ($1) + sends ($3) · the alarm fires on a money failure.
| Item | What it is | Owner |
|---|---|:---:|
| #415 | **Do we make money?** — RESOLVED 8 Jul: ~$0.36/worked lead → ~91% margin at $4 (`run-costs-and-cashflow.md` §0). *Remaining = prove it live.* | 🧍 |
| #364 | ⛰️ *pulled in 9 Jul (scope verify)* — **demo/seed data pollutes the founder metrics** the proof reads from (CRO dashboard, active-paying counts). The Phase-4 "prove it" numbers must be demo-clean or the proof lies | 🤖 |
| — | **Walk the M0-original pinks** (#330–#334 + #337 are 🩷 live-not-verified) — the "fixed + tested" gate includes walking them; do it during the staging proof | 🧍 |

### M0 originals (#330–#337) — already shipped
| Item | What it is |
|---|---|
| #330 | Missing FIGSY-credit DB function — added |
| #331 | Free-trial client got leads forever — drip now drains |
| #332 | Enrollment now charges fail-closed (no free work) |
| #333 | Stripe under-grant fixed (client not short-changed) |
| #334 | Dead auto-top-up switch — greyed out |
| #335 | FIGSY knowledge-writing built — UI still off, see #346 |
| #336 | Referral bonus was farmable — purchase-gated |
| #337 | Money-path sweep |

**✅ M0 done when:** Phase 1 shipped (site + portal honest) · Phase 2 money path built **+ staging-proven** · Phase 3 fixed **+ tested** · Phase 4 proven on staging → one paying client.

---

# ① MILESTONE 1 — Send OUR OWN outreach · owner 🧍 (build done, only the warm-up clock)
| Step | Action | Done when |
|---|---|---|
| 🛑 GATE | Instantly warm-up ≥90% (#198) — check weekly | ≥90% inbox |
| 1 | Upgrade Instantly plan (≥1,500 send) | plan active |
| 2 | Import the 1,461 verified list | 0 errors |
| 3 | Paste 4 emails + footer (`content/our-outreach-us-uk.md`) | Day 0/3/8/10 built |
| 4 | mail-tester.com (#101) | 10/10 aligned |
| 5 | Test-send 10–20 | Primary · bounce <2% |
| 6 | 🚀 FIRE (#127) | running · reply ≥5% d3 |

---

# ② MILESTONE 2 — A paying CLIENT runs it · ⏸ BLOCKED on M0
| Item | What it is | Owner |
|---|---|:---:|
| #211 | Smartlead — per-client sending isolation (all clients share one identity today) | 🧍→🤖 |
| #28b | $60 live money walk — real money through the whole loop, counters reconcile | 🧍 |
| #212 | Sequence depth (not client-blocking) | 🤖 |
| #199 | Sending monitoring (not client-blocking) | 🤖 |
*Security + honesty for M2 already shipped 6 Jul (🩷).*

---

# ③ MILESTONE 3 — Admin cockpit · 🤝 mostly done (13 screens walked 🟢 on 7 Jul)
| Item | What it is | Owner |
|---|---|:---:|
| #291 | GTM funnel showed 367% — bug fixed (PR #978), re-walk after deploy | 🤝 |
| #279 | Deliverability graph — needs the bounce/complaint reporting endpoint | 🤖 |
| #289 | NPS — endpoint exists, migration not run + no clients yet | 🤖 |
| #290 | Sentry error tracking — not wired in | 🤖 |
| #364 | Demo data pollutes your founder metrics → exclude it | 🤖 |
*Ops inbox-pool / AE lenses / deliverability data wait on Smartlead (#211).*

---

# ④ MILESTONE 4 — EVERYTHING ELSE · all non-FIGSY findings · FROZEN until FIGSY ships · owner 🤖 (later)
In M0 these are made *honest* (kept, "coming soon"); **here** they're made *real* — one at a time, each proven before the next. Future build detail → V2-TRACKER. **The agents flipped 🔴 OUT OF PLAY in the inventory (Milla #2 · Vida #3 · Denise #4 · agent subs #26 · per-rep unlock #56 · family hub #125 · side-panel #113a · voice #96/#229 · notetaker #81 · Milla-render #248 · Denise seeds #58/#63/#73/#188) live here — code parked, portal-disabled via #406.**

> **🎯 Agent capability specs (founder-locked 9 Jul) — the M/V/D per-lead layer features are 🔴 MILESTONE 0, not here:** #427 (Milla) · #428 (Denise) · #429 (Vida) live in **M0 Phase 2 above** (see the M/V/D LAYER FEATURE SCOPE block); full spec → `V2-TRACKER` → AGENT CAPABILITY SPECS. Only the **account-level agent products** (Milla #2 · Vida #3 · Denise #4 and their listed sub-items) stay parked in this M4 section; the website shows all of it "coming soon" until built.

> **M4 FIGSY-relevance audit (8 Jul):** **#361 + #368 (calendar booking) sit in M0** — founder-locked differentiator. The rest are genuinely non-FIGSY **except** these **FIGSY-adjacent** ones, which stay M4 only because the features they belong to are *coming-soon at launch* — **promote any to M0 on your word:** #388 (LinkedIn channel) · #352 (FIGSY credit auto-top-up, currently disabled #334) · #391/#392/#393 (FIGSY A/B + adaptive-send + Campaign-Intelligence cluster) · #397/#399 (CRM-connect, behind the "CRM dedup" claim).

**Subscriptions (Milla/Vida/Denise billing)** — ⚠️ **RETIRING (#431):** the whole family moved to per-qualified-lead (#420). These five are no longer "fix" work — they become **delete the subscription machinery** (zero real subscribers).
| Item | What it is | Owner |
|---|---|:---:|
| #340 | Subscription goes "active" even on a failed/incomplete card | 🤖 |
| #341 | Cancelling a subscription doesn't actually cancel it in Stripe | 🤖 |
| #342 | The subscription "lapse" cron 500s every day | 🤖 |
| #357 | MRR is structurally $0 (the subscription amount is never stored) | 🤖 |
| #386 | Onboarding can double-submit a subscription | 🤖 |

**Partner + referral**
| Item | What it is | Owner |
|---|---|:---:|
| #351 | Partner commission math wrong (20% recurring, no clawback) | 🤖 |
| #355 | Referral link drops the `?ref=` → referral can't be earned | 🤖 |
| #370 | Partner lookup is injectable (`.ilike` on email) | 🤖 |
| #372 | `allocate_pool_to_rep` destroys pool credits | 🤖 |
| #387 | Referral attribution is swallowed | 🤖 |
| #398 | "Wise integration" — partner payouts are actually manual | 🤖 |

**Other agents — real builds**
| Item | What it is | Owner |
|---|---|:---:|
| #362 | Vida has no knowledge layer (sold "no hallucinations") | 🤖 |
| #360 | WhatsApp uses one global number — not per-client | 🤖 |
| #359 | WhatsApp webhook is forgeable (no signature check) | 🤖 |
| #369 | Voice/Vapi webhook fails open if the secret is unset | 🤖 |
| #396 | Denise false claims ("trained on closed-won / confirms meetings") | 🤖 |
| #395 | Milla page shows a fake "HubSpot/Gmail connected" mock | 🤖 |
| #388 | LinkedIn steps stuck (PhantomBuster not wired) | 🤖 |
| #404 | Lena agent is dead code (never mounted → 404) | 🤖 |

**Auto top-up + integrations + infra + ops**
| Item | What it is | Owner |
|---|---|:---:|
| #352 | Auto top-up can double-charge a card | 🤖 |
| #399 | Integrations hub — all 8 "Connect" tiles are dead | 🤖 |
| #397 | HubSpot platform sync is dead code | 🤖 |
| #375 | Our own self-outreach sends are dead | 🤖 |
| #377 | Support inbox auto-reply phantom-sends → black hole | 🤖 |
| #378 | `/ae/demo-request` hallucinates availability | 🤖 |
| #380 | Missing tables (`subscribers` / `whatsapp_messages`) | 🤖 |
| #381 | Developer webhooks section is dead (no table) | 🤖 |
| #382 | Churn scoring reads a column that's never written | 🤖 |
| #391 | Cron JSONB writes clobber each other | 🤖 |
| #392 | A/B test "wins" on zero data | 🤖 |
| #393 | Data-moat table gets duplicate rows (no dedup key) | 🤖 |

**✅ M4 done when:** each item is rebuilt (state machine + provider-confirmed + tests) and its "coming soon" is lifted — one at a time.

---

## 📌 Standing notes
- **Money model (LOCKED 8 Jul ~10pm, Fable-verified — per qualified lead, no subscriptions):** **$1 reveal → +$3 FIGSY = $4 → +$1 Milla = $5 → +$1 Denise = $6**; **Vida inbound $3** + same add-ons → $4/$5. **Two engines** (FIGSY outbound · Vida inbound) **× two layers** (Milla intelligence · Denise action). Charged once each per lead; no refund on outcome. Two wallets ($1 reveal `credit_balance` + $3 work `figsy_credits`); +$1 layers charged at enroll when toggled. Full stack $6 ≈ **~92% margin**; +$1 layers ≈ 95%+ (one Haiku call, reasons over already-paid PDL data). $1 gates Hunter+visibility; **PDL spent at sourcing → quotas, not the charge.** Spec = #420–#431. *(PDL+Hunter keys set. No Apollo.)*
  - **R1 (pricing marketing):** "Two engines. Two layers. One price: per qualified lead." Engine cards (FIGSY buyable · Vida coming-soon) + layer cards (Milla/Denise +$1) + comparison FIGSY·Vida·+Milla·+Denise. No "$/month" anywhere (#430).
  - **R2 (FIGSY/Denise boundary):** FIGSY owns **cold → first reply** (outreach copy + sequence); Denise owns **reply → close** (objections, proposals, post-call, chase).
  - **R3 (qualified-lead definition — needs founder+legal sign-off, ties #413):** ICP-match + verified contact + score ≥ threshold (~60); Vida = captured contact + ICP-fit + real intent, spam never billed.
- **Sell FIGSY + Lead-Gen only; everything else STAYS "coming soon."** The non-FIGSY agents are 🔴 OUT OF PLAY in the inventory (code parked M4) — NOT deleted from site/portal, just greyed + coming-soon (#405/#406). When they return they come back as **per-lead layers/engine (#427–#429), not subscriptions.**
- **Before any real send:** check `/engine/env` — `RESEND_API_KEY` · `ADMIN_SECRET_KEY` · `ANTHROPIC_API_KEY` · `RESEND_WEBHOOK_SECRET` · `FIGSY_COLD_FROM` · `TRACKING_URL`.
- **Architecture (locked):** AI drafts/scores; deterministic code decides + **fails closed**; state advances only after verified provider/DB success. Reasoning → `AUDIT-8JUL-DEEP.md §4–10`.
