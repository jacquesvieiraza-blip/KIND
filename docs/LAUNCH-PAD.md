# 🚀 K.I.N.D — LAUNCH PAD

**As of: 8 July 2026 · 7-pass deep audit + 3-question verdict → 67 findings (#338–#404) in MILESTONE 0.** This page = the four milestones and what to do right now. Nothing else lives here.
**History → KIND-MASTER session log · status of record → PRODUCT-INVENTORY · future → V2-TRACKER · find any doc → DOC-MAP · full audit → `docs/AUDIT-8JUL-DEEP.md`.**

**Board:** 🟢105 verified · 🩷88 live-not-walked · 🟣4 approved · 🟡25 on branch · 🔴182 not built · ⏸6 blocked · Σ410 *(live count: `scripts/count-inventory.sh`)*

> **⚠️ How code goes live (until the GitHub flag is appealed):** merging does NOT deploy. Every change ships by: **merge the PR → `git pull` → `railway up --detach --service "<svc>"`** (`@kind/api` · `@kind/portal` · `@kind/admin` · `KIND`=website). Appeal filed at `support.github.com/contact/account-flagged` — when it clears, auto-deploy returns.

---

> **⚠️ 7 Jul PM — MILESTONE 0 (below) now outranks this plan.** The money audit opened 8 must-fix holes; the two unlocks (GitHub appeal ✅ sent, Smartlead) still run in parallel, but M0 closes before any real client.

## 📅 TODAY — 7 July (the plan, in order)
**The whole #306–#328 audit is closed + live — the product is safe. Nothing is blocked on Claude. Tomorrow = UNBLOCK the two big gates + VERIFY what's live. Top to bottom; each block is independent, so a slip on one doesn't stall the rest.**

**☀️ FIRST 30 MIN — the two unlocks (highest leverage — they free up everything else):**
1. **Send the GitHub flag appeal** — `support.github.com/contact/account-flagged` (paste the drafted reply from 6 Jul). → when it clears, auto-deploy returns and the manual `railway up` ends. *(infra)*
2. **Sort Smartlead access** — sign up / grab the API key. **This is THE last M2 gate (#211)** — the moment I have it I start the multi-day per-client-sending build. *(M2)*
3. **Glance at Instantly warm-up %** — the one M1 gate. If ≥90% → jump to the M1 fire-drill (§① below). If not, leave it, it's a clock. *(M1)*

**🕙 MID-MORNING — ✅ Sitting A DONE 7 Jul:**
4. ~~Walk `admin.get-kind.com`~~ — walked; 13 dots flipped 🩷→🟢. Remaining: deploy PR #978 (funnel fix) → re-walk #291 green; #279/#289/#290 need data/wiring before they can go green. *(M3)*

**🕐 MIDDAY — two config toggles (Sitting B, 10 min):**
5. In Railway set **`PDL_API_KEY`**; in Resend enable **`email.bounced`** + **`email.complained`** events. → verifies #243 + #267. *(M2/M3)*

**🕒 AFTERNOON — prove the money (Sitting C, when you have a live account):**
6. The **$60 live money walk** (#28b) — steps in **§② below**. Nobody has ever run this end-to-end; it's the difference between "should work" and "proven." *(M2)*

**Realistic target:** both unlocks sent + admin walked green. If tomorrow only produces "Smartlead access + GitHub appeal in," that's a great day — those two move M2 and the infra more than anything else.

---

## ⚡ THE FULL RUNLIST (reference — tomorrow's plan pulls from this)

| # | Action | Who |
|---|--------|-----|
| 1 | ✅ ~~Whole #306–#328 audit~~ — 23 items merged + deployed + live. Product is safe. | — |
| 2 | ✅ ~~**Sitting A** — walk the admin~~ — DONE 7 Jul: 13 dots 🩷→🟢; 4 held back (#291 bug-fixed PR #978 · #279/#289/#290 need data/wiring) | — |
| 3 | **Sitting B** — 2 toggles: `PDL_API_KEY` in Railway · Resend `email.bounced`+`email.complained` events | 🧍 |
| 4 | **Sitting C** — the $60 live money walk (list in M2 below) | 🧍 |
| 5 | **Send GitHub flag appeal** (drafted, in chat 6 Jul) → restores auto-deploy | 🧍 |
| 6 | **Give Smartlead access** → unblocks #211, the last M2 gate → 🤖 I build | 🧍→🤖 |
| 7 | **Watch Instantly warm-up** weekly → at ≥90%, run the M1 fire-drill below | 🧍 |

---

# ⓪ MILESTONE 0 — MONEY-PATH INTEGRITY (opened 7 Jul · Fable audit · BLOCKS M2)

**WHERE IT STANDS (8 Jul): a 7-pass deep audit blew M0 wide open — the original 8 (#330–#337) hold, but the SURROUNDING product has ~67 confirmed rocks logged as 🔴 #338–#404.** The enrollment *charge* is genuinely safe; almost everything around it (subscriptions, the send outcome, crons, tenant isolation, the agents, the dashboards, the claims) is partial/inert/broken. Full evidence: **`docs/AUDIT-8JUL-DEEP.md`**. **Nothing runtime-proven — the auditor had no prod/staging access; §D SQL + §N tests are the proof instruments.** No real client until the CRITICAL tier is fixed-or-hidden and runtime-proven.

**Original 8 — real status:** #330/#331/#332/#333 ✅ complete · #334 ◐ UI honest but Paystack backend residue (#352) · #335 ◐ inert, knowledge UI disabled (#346) · #336 ◐ inert, `?ref=` dropped (#355) · #337 ◐ ④ SA-name not done (#400).

**AUDIT REGISTER — 67 findings by tier (owner: 🤖 Claude · 🧍 Founder · 🤝 Both). Full text in PRODUCT-INVENTORY #338–#404.**

- **🔴🔴 CRITICAL (13) — fix or hide before ONE client:** #338 phantom sends · #339 blind alarm · #340 sub-status→active · #341 cancel-doesn't-cancel · #342 lapse cron 500s daily · #343 no cron singleton · #344 kill-switch gap · #345 lookalike IDOR · #346 #335 inert · #347 approve-queue dead · #348 guarantee inoperable · #349 ~140 unchecked money writes · #350 visitor_sessions anon-readable *(confirmed prod)*.
- **🔴 HIGH (29):** #351 partner commission · #352 auto-topup double-charge · #353 trial-expiry spam · #354 double-send · #355 #336 unearnable · #356 consent ungated · #357 MRR $0 · #358 fake scores · #359 WhatsApp forgeable webhook · #360 WhatsApp not multi-tenant · #361 Calendar crashes · #362 Vida no knowledge · #363 seed-leads clobber · #364 demo pollutes metrics · #365 fake KPI injection · #366 50-lead ceiling · #367 reveal-down silent · #368 Calendar OAuth CSRF · #369 Vapi fail-open · #370 partners ilike-injection · #371 racy grants · #372 pool credits destroyed · #373 prod constraint gaps · #374 intent-signals drain · #375 self-outreach dead sends · #376 delivery overdraw · #377 support black hole · #378 hallucinated availability · #379 webhook catch→200 · #403 "autonomous replies" false.
- **🔴 MEDIUM (13):** #380 missing tables · #381 dev webhooks dead · #382 churn scoring dead · #383 missing send-counter RPC · #384 dead portal buttons · #385 fake overage panel · #386 onboarding double-submit · #387 referral attrib swallowed · #388 LinkedIn limbo · #389 migration hygiene · #390 observability gaps · #391 cron JSONB clobber · #392 AB resolves on 0 data · #393 data-moat dup rows · #404 Lena dead (not mounted).
- **🔴 LOW (10):** #394 $1 residue · #395 Milla mock UI · #396 Denise false claims · #397 HubSpot dead code · #398 Wise "integration" · #399 integrations shell · #400 #337④ SA-name · #401 lying dots (corrected) · #402 auth/observability nits.

**🧍 YOUR 5-min facts that de-risk ~10 items (audit §D read-only SQL):** the `subscription_status` enum (#342) · the four idempotency uniques (#351/#354/#373/#386) · missing tables (#380/#381/#382) · `amount_usd` null (#357) · **Railway API replica count** (#343) · is `apps/landing` deployed (#394). Run those → paste outputs → ~10 rocks move from suspected to confirmed.

**DECISION PENDING (you):** Scope A (FIGSY-only, hide the rest — *recommended*) · Scope B (+ billing/referrals) · Scope C (full surface). Detail in `AUDIT-8JUL-DEEP.md §O`. Once chosen, 🤖 builds the CRITICAL tier as small verified PRs — **#338 phantom-send + #339 blind-alarm first** (they gate visibility of everything else).

**🧭 RECOMMENDATION (8 Jul · full reasoning in `AUDIT-8JUL-DEEP.md §4-10`):** **Scope A + the deterministic-workflow architecture.** The audit proves the root cause is *engineering* (state advances without verifying provider/DB success; fail-open; AI in the authority path) — **not** "AI is bad." So: **AI drafts/scores/classifies only; deterministic software decides + fails closed; state advances only after verified success; every risky flow becomes a state machine.** This directly prevents ~40 of the 67 findings; the rest need copy/legal rewrites, feature builds, prod-DB ops, and tests. **ML is not the fix — deterministic control-flow + provider/DB success checks + tests + bounded AI is.** Build order = the **Top-20 controls** in `AUDIT-8JUL-DEEP.md §10`, starting #338 + #339. One real client is safe on Scope A **after** the Top-20 + runtime proof on staging (§K).

---

### 🎯 THE 3-QUESTION VERDICT (8 Jul · fresh code re-read, not memory · code-confirmed, not runtime-proven)

**Q1 · Do all our agents do what we say — and can they develop more?** **HALF do. Every real one can extend.**
- **REAL:** FIGSY (lead engine + sequence writer) · Milla (daily brief + doc-RAG chat) · Denise (drafts, human sends) · Nora (admin co-pilot) · Casey (internal chat).
- **FALSE / broken (all logged):** Vida "learns your business / no hallucinations" (no knowledge layer, `vida.ts:46` → #362) · Vida/WhatsApp "connect your number" (one global number → #360) · Calendar "auto-books" (`googleapis` in no package.json → crashes → #361) · Denise "trained on your closed-won / confirms meetings" (#396) · Milla "connects CRM/Gmail" (fabricated mock → #395) · **FIGSY "handles replies autonomously" (draft-only → #403)** · **Lena (dead, not mounted → #404)**.
- **Develop more:** YES for every real agent — good architecture; the false claims are *build gaps* (Vida can reuse Milla's RAG; Denise can ingest deals), not walls.

**Q2 · Is a client getting what they paid for?** **PARTIALLY — and the core step can fail silently.** Leads DO source now (keys set) but ~50/run not "250M" (#366); scores real but degrade to fake-50 on AI error (#358); **the outreach email advances to "sent" whether or not Resend actually sent it (`figsy.ts:540` → #338)** — the prospect may get nothing and the dashboard says sent; copy is generic because the client can't enter their knowledge (#346); replies are drafts not autonomous (#403); no auto-booking (#361). **Biggest gap: the email may never send and nobody knows.**

**Q3 · Do we get paid for what we give?** **Correct AT enrollment; leaks + drifts everywhere around it.**
- ✅ Enrollment charge is atomic, fail-closed, charge-before-send (`chargeFigsyEnroll` #332).
- 🔴 **Pay-and-get-nothing:** the $3 is taken before the send, and the send is phantom (#338) → **credit spent, no email, no alert.**
- 🔴 **Books lie:** credit-ledger inserts are swallowed (`figsy.ts:611/639` → #349) → wallet moves, ledger doesn't reconcile.
- 🔴 **Subscriptions:** charge-after-cancel (#341) + active-on-failed-card (#340).
- **Bottom line: we are not reliably paid for exactly what we give, and can't fully trust our own records of it.**

**One-line truth:** FIGSY is a real engine that under-delivers on its promises and can silently fail to send the one thing it charges for; the other agents are a mix of real and oversold; the money is correct at enrollment but leaks and drifts around it. The two fixes that move all three answers most: **#338 (send checks its result) + #346 (flip knowledge UI on)**.

**The money model (locked):** every client = FIGSY plan · **$3 = 1 credit = 1 lead ENROLLED** (FIGSY works the prospect start-to-finish; browsing leads is free) · bundles 20/$60 · 40/$120 · 100/$300 · 20 free trial credits at signup.

**The fixes (🤖 Opus builds → Fable verifies → 🧍 you merge + `railway up`):**

| # | Fix | Why it can't wait |
|---|-----|-------------------|
| #330 | Staging DB missing the FIGSY charge function | preview shows "credits never drop" — it's lying, not the product |
| #331 | Cap the trial drip | $0 signup receives enriched leads forever; we pay PDL/Hunter per lead |
| #332 | Fail-closed charging + race fix | a DB hiccup = enrolled + emailed, $3 never taken, silently |
| #333 | Stripe retry on failed grant | client pays, gets nothing, Stripe told "all good" — trust-killer |
| #334 | Grey out dead auto-top-up | the toggle promises a safety net that can never fire (Paystack gone) |
| #335 | Feed `figsy_knowledge` into outreach | emails know the prospect but not the client's business — the pain→impact→solution gap |
| #336 | Referral: purchase-gated, 15 FIGSY credits | today: farmable via free fake signups, paid in a dead wallet |
| #337 | Sweep: uncharged insert · low-credit warning · source-down alert · prompt/doc residue | the quiet leftovers that bite later |

**🧍 YOUR three (10 min total):**
1. Railway → `@kind/api` → set **`PDL_API_KEY`** + confirm **`HUNTER_API_KEY`** — *without these the product finds ZERO leads (startup-check's own words). Discovery = PDL primary + Hunter email-reveal; Apollo is NOT used.*
2. Run the staging SQL I'll hand you with #330's PR (one paste into the kind-staging Supabase).
3. Merge the M0 PRs as they land + `railway up` per PR instructions.

**M0 is DONE when:** the chosen scope's CRITICAL + relevant HIGH items (#338–#402) are fixed-or-hidden AND runtime-proven on staging (audit §N tests) · `/engine/leads/test` proves PDL+Hunter sourcing · the $60 walk shows a credit visibly drop. *(The original 8 fixes above are shipped; the register #338–#402 is the real remaining gate.)*

---

# ① MILESTONE 1 — Send OUR OWN outreach (sell K.I.N.D with K.I.N.D)

**WHERE IT STANDS: build 100% done. Nothing left for Claude. The only gate is the Instantly warm-up clock — yours.**

**Done + verified (don't re-check):** engine works end-to-end · 1,461-person verified US list (`kind_instantly_import.csv`, off-repo) · 4 emails + 1 LinkedIn sequence written (`docs/content/our-outreach-us-uk.md`) · CAN-SPAM footer with the real postal address · cold domain `gettingkind.com` SPF/DKIM/DMARC verified · site live at the single $3 FIGSY price · product signs clients up on that same plan (#284).

**The fire-drill (all 🧍 you · no code · strict order):**

| Step | Action | Done when |
|---|--------|-----------|
| 🛑 GATE | Instantly warm-up ≥90% (#198) — check the dashboard weekly | seed sends show ≥90% inbox placement |
| 1 | Upgrade Instantly plan (≥1,500 send capacity) | paid plan active |
| 2 | Import the 1,461 list | all rows in, 0 errors |
| 3 | Paste the 4 emails + footer from `our-outreach-us-uk.md` §4 | Day 0/3/8/10 steps created (+ Day-6 LinkedIn manual) |
| 4 | mail-tester.com check (#101) | 10/10, SPF/DKIM/DMARC aligned |
| 5 | Test-send 10–20 | lands Primary · bounce <2% · spam <0.3% |
| 6 | 🚀 **FIRE** (#127) | campaign running; watch reply rate (≥5% d3 / ≥10% d7) |

**Honest risk:** none in the code — only the clock slipping because nobody checks the warm-up.

---

# ② MILESTONE 2 — A paying client runs it themselves

**WHERE IT STANDS: SAFE as of 6 Jul (the whole 17-hole audit is live in prod) — but NOT READY. One big gate: Smartlead.**

**What "safe" means (shipped + live 6 Jul):** admin behind a login · API can't be drained by strangers · every FIGSY send is charged · Stripe can't be tricked into minting credits · refunds/chargebacks claw credits back · unsubscribes actually stop · pause doesn't lie about billing · no client starves another's sending · credit pools are race-proof · portal stopped making false promises.

**What still blocks taking money (in order):**

| # | Blocker | Why it matters | Who |
|---|---------|----------------|-----|
| 🛑 1 | **#211 Smartlead — per-client sending isolation** | today every client sends from ONE shared identity; one bad client poisons everyone's deliverability. THE gate. | 🧍 access → 🤖 multi-day build |
| 2 | **$60 live money walk (#28b)** | nobody has pushed real money through the whole loop yet: top-up → pool fund → rep allocate → delivery/enroll deduct → deactivate returns to pool → counters reconcile | 🧍 |
| — | ✅ ~~#326 Settings lies · #324/#325/#327/#328 hardening~~ — all shipped + live in the #306–#328 audit (🩷). | — |
| 3 | Later depth (not client-blocking): #212 sequence depth · #199 monitoring | small | 🤖 |

**M2 is DONE when:** Smartlead isolation live · the $60 walk reconciles clean. *(Security + honesty already shipped.)*

---

# ③ MILESTONE 3 — The admin cockpit we run the business from

**WHERE IT STANDS: WALKED 7 Jul — 13 screens verified honest + live → flipped 🟢. Four data-backed shells held back (they render honestly but have no real data yet) + one bug fixed. That's the whole remaining gap.**

**✅ Sitting A — DONE 7 Jul.** Walked `admin.get-kind.com`; each screen loaded + showed honest data. **13 dots flipped 🩷→🟢:** #272 Cockpit · #274/#288/#294 Sales Channel · #287/#295/#296/#297 Finance · #281/#292/#293 Clients · #304 Engine cron history · #275 Nora ("she replies").

**🩷 Held back on purpose (built + live but NOT verifiable-green yet — no real data / not wired):**
- **#291 GTM funnel** — had a >100% conversion bug (Trial→Paid 367%); **fixed in PR #978** (cohort math). Flips 🟢 once deployed + re-walked.
- **#279 Engine deliverability graph** — honest empty axes; waits on the reporting endpoint (bounce/complaint % per day).
- **#289 NPS** — endpoint + card shell exist but migration not run + 0 clients to survey.
- **#290 Sentry error tracking** — not wired yet (no `@sentry` in the tree).

**Stays empty on purpose (correctly labelled):** Ops inbox-pool + AE lenses + deliverability data — they wait for Smartlead (#211/#270/#271/#276/#280).

**M3 is DONE when:** #291 re-walked green post-deploy · #279/#289/#290 built + fed data · the Smartlead-fed shells get their data after #211.

---

## 📌 Standing notes (the only extras this page keeps)

- **Demo prep (before any face-to-face):** create the demo BEFORE the meeting · test the magic-link "Open Demo" flow first · never reopen an expired demo · steer around Knowledge/Team/Integrations ("coming soon") · don't quote the demo form's numbers.
- **Env sanity before any real send (the "warm and nothing happens" trap):** `RESEND_API_KEY` · `ADMIN_SECRET_KEY` · `ANTHROPIC_API_KEY` · `RESEND_WEBHOOK_SECRET` · `FIGSY_COLD_FROM` · `TRACKING_URL` — one-click check: `/engine/env` (header-key gated).
- **Detail on any item:** PRODUCT-INVENTORY by ID (#306–#328 = the two audit waves) · why/history: KIND-MASTER session log · procedures: `client-flow-sop.md`.
