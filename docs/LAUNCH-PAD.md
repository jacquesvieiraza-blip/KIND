# 🚀 K.I.N.D — LAUNCH PAD

**As of: 8 July 2026 · 7-pass deep audit + 3-question verdict → 71 findings (#338–#407) in MILESTONE 0.** This page = the four milestones and what to do right now. Nothing else lives here.
**History → KIND-MASTER session log · status of record → PRODUCT-INVENTORY · future → V2-TRACKER · find any doc → DOC-MAP · full audit → `docs/AUDIT-8JUL-DEEP.md` · **M0 punch-list → `docs/MILESTONE-0-CHECKLIST.md`**.**

**Board:** 🟢105 verified · 🩷88 live-not-walked · 🟣4 approved · 🟡25 on branch · 🔴185 not built · ⏸6 blocked · Σ413 *(live count: `scripts/count-inventory.sh`)*

> **⚠️ How code goes live (until the GitHub flag is appealed):** merging does NOT deploy. Every change ships by: **merge the PR → `git pull` → `railway up --detach --service "<svc>"`** (`@kind/api` · `@kind/portal` · `@kind/admin` · `KIND`=website). Appeal filed at `support.github.com/contact/account-flagged` — when it clears, auto-deploy returns.

---

> **⚠️ 8 Jul — THE DEEP AUDIT CHANGED EVERYTHING. The product is NOT safe to sell yet.** The old "product is safe · just needs Smartlead" plan is **SUPERSEDED.** Decision (founder-locked): **sell FIGSY only; mark everything else "coming soon."** Focus = **MILESTONE 0**, and its FIRST task is **MOVE 1 — the full website + portal honesty sweep.** Move slow, get it right.

## ▶ RIGHT NOW (8 Jul, in strict order)
1. **🧍 Run the §D prod-DB SQL** (`AUDIT-8JUL-DEEP.md §D`) + confirm the Railway API replica count → turns ~10 suspected findings into confirmed facts (5 min).
2. **🤖 MOVE 1 — website + portal honesty sweep** (#405/#406, detail in M0 below): every element → keep / coming-soon / grey. Checklist first, then reviewable batches. **This is the first build work.**
3. **🤖 MOVE 2 — FIGSY reliability** (#338 + #339 first), each a small tested PR.
4. **🧍 Still valid, parallel:** GitHub flag appeal (restores auto-deploy) · Instantly warm-up watch (the M1 clock). *(Smartlead is the M2 gate — but M2 is blocked on M0, so it waits.)*

---

# ⓪ MILESTONE 0 — MAKE IT TRUE + RELIABLE (the gate to selling ANYTHING · was "money-path integrity" · BLOCKS M2)

**THE DECISION (8 Jul): sell ONE agent — FIGSY, the backbone — and mark everything else "coming soon." One reliable agent beats a half-unreliable system.** But FIGSY itself has faults that must be fixed first. So M0 = make the product HONEST, then RELIABLE, then PROVEN — before a single real client.

**▶ THE PLAN — 3 moves, in strict order (reordered 8 Jul):**
1. **MOVE 1 · MAKE IT HONEST — sweep the WHOLE website + portal, element by element.** Mark every not-real feature **"Coming soon" + greyed/disabled — DO NOT delete** (keep the code for M4). This is a **large sweep**, done first, before any FIGSY build. Deliverable: a page/screen checklist, then reviewable batches (website → portal).
2. **MOVE 2 · MAKE FIGSY RELIABLE.** Fix FIGSY's own faults — the **Top-20 controls** (`AUDIT-8JUL-DEEP.md §10`), starting **#338 (send actually sends before we charge) + #339 (alarms are real)**, then knowledge UI on (#346), no double-sends (#354), pagination (#366), honest reply/booking. Each a small, tested PR.
3. **MOVE 3 · PROVE + SELL.** Runtime-prove on staging (a credit spent, an email landed, a lead flowed), then sell FIGSY to ONE client.

**WHERE IT STANDS (8 Jul): a 7-pass deep audit + 3-question verdict — the original 8 (#330–#337) hold, but the SURROUNDING product has ~69 confirmed rocks logged as 🔴 #338–#406.** The enrollment *charge* is genuinely safe; almost everything around it (subscriptions, the send outcome, crons, tenant isolation, the agents, the dashboards, the claims) is partial/inert/broken. Full evidence: **`docs/AUDIT-8JUL-DEEP.md`**. **Nothing runtime-proven — no prod/staging access; §D SQL + §K tests are the proof instruments.** No real client until Moves 1+2 are done and Move 3 is proven.

**Original 8 — real status:** #330/#331/#332/#333 ✅ complete · #334 ◐ UI honest but Paystack backend residue (#352) · #335 ◐ inert, knowledge UI disabled (#346) · #336 ◐ inert, `?ref=` dropped (#355) · #337 ◐ ④ SA-name not done (#400).

**📋 WORKING PUNCH-LIST: [`docs/MILESTONE-0-CHECKLIST.md`](./MILESTONE-0-CHECKLIST.md)** — every website page, every portal screen, every FIGSY fix, checked off as done.

**⓪ M0 = FIGSY ONLY. These are the ONLY fixes for this milestone. Everything non-FIGSY → MILESTONE 4 (below). Full text of every item in PRODUCT-INVENTORY #338–#406.**

**MOVE 1 · HONEST-LAUNCH — SWEEP THE WHOLE WEBSITE + PORTAL, ELEMENT BY ELEMENT.** *(This is a LARGE body of work — the FIRST thing, before any FIGSY build.)*
- **Rule: DON'T DELETE anything. Mark not-real features "Coming soon" + grey/disable them.** (The #326/#334 pattern — badge + greyed + non-interactive.) Everything stays in the codebase for M4; it just can't be clicked or believed by a client today.
- **Scope = every element:** every page/section/claim/stat/CTA/button/form/modal/toggle/mock-screenshot on the **website** (`apps/website/*.html` + `apps/landing`) AND every screen/tile/button/tab on the **portal** (`apps/portal`).
- **Known targets (not exhaustive — the sweep finds the rest):** #348 guarantee · #359/#360 WhatsApp · #361/#368 Calendar · #362 Vida "knowledge/no-hallucination" · #369 Vapi · #394 $1 residue · #395 Milla connectors + mock UI · #396 Denise "closed-won/confirms" · #398 Wise · #399 integrations hub · #403 "autonomous replies" · #404 Lena · #385 fake overage panel · #384 dead portal buttons · #366 "250M" wording.
- **Deliverable first:** a page-by-page / screen-by-screen **SWEEP CHECKLIST** (every element → keep / coming-soon / grey / reword) so nothing is missed. Then execute in reviewable batches (website first, portal second).

**MOVE 2 · FIGSY RELIABILITY — the Top-20 controls, small tested PRs** *(start #338 + #339)*:
#338 send-before-charge · #339 checked alarm · #343 cron singleton · #344 kill-switch · #345 lookalike tenant · #346 knowledge UI ON · #347 approve-queue · #349 checked credit writes · #350 visitor_sessions · #353 trial-expiry once · #354 no double-send · #356 consent-gated · #358 score-fail quarantine · #363 seed-leads guard · #365 no fake KPI · #366 pagination · #367 reveal-down alert · #371 atomic grants · #373 FIGSY constraints · #374 intent-signal cap · #376 delivery clamp · #379 refund 500 · #383 send-counter RPC · #384/#385 dead FIGSY UI · #389 migration runner · #390 observability · #400 SA-name · #401 dots · #402 auth nits.

**MOVE 3 · PROVE → SELL.** Runtime-prove on staging, then sell FIGSY to ONE client.

**🧍 YOUR 5-min facts (audit §D read-only SQL) that de-risk M0:** idempotency uniques (#354/#373) · missing tables (FIGSY: figsy_sessions) · **Railway API replica count** (#343) · is `apps/landing` deployed (#394). *(enum/MRR/partner-unique are M4.)*

**DECISION LOCKED (8 Jul):** **Scope A — FIGSY only.** 🤖 builds Move 1 (one honest-copy PR) → Move 2 (#338 + #339 first). Each a small, tested, individually-verifiable PR.

**🧭 RECOMMENDATION (8 Jul · full reasoning in `AUDIT-8JUL-DEEP.md §4-10`):** **Scope A + the deterministic-workflow architecture.** The audit proves the root cause is *engineering* (state advances without verifying provider/DB success; fail-open; AI in the authority path) — **not** "AI is bad." So: **AI drafts/scores/classifies only; deterministic software decides + fails closed; state advances only after verified success; every risky flow becomes a state machine.** This directly prevents ~40 of the 67 findings; the rest need copy/legal rewrites, feature builds, prod-DB ops, and tests. **ML is not the fix — deterministic control-flow + provider/DB success checks + tests + bounded AI is.** Order = **Move 1 (coming-soon everything not real) → Move 2 (Top-20 controls, `§10`, starting #338 + #339) → Move 3 (prove on staging + sell)**. One real client is safe on Scope A **after** Moves 1+2 + runtime proof on staging (§K).

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

**The money model (locked):** every FIGSY client buys credits · **$3 = 1 credit = 1 lead ENROLLED** (FIGSY works the prospect start-to-finish; browsing leads is free) · bundles 20/$60 · 40/$120 · 100/$300 · 20 free trial credits at signup. *(PDL discovery + Hunter reveal keys — already set in Railway. Apollo not used.)*

**M0 is DONE when:** **Move 1** — every non-FIGSY feature marked "coming soon" (shipped) · **Move 2** — the FIGSY reliability items (Move-2 list above) fixed, **each with a regression test** · **Move 3** — proven on staging: a credit actually spent, an email that actually landed, a lead actually delivered. *(Originals: #330-333 done; #334/#335/#336/#337④ folded into Moves 1-2.)*

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

**⚠️ WHERE IT STANDS (8 Jul): NOT TRUE YET — M2 is BLOCKED ON M0.** A paying client cannot reliably use the product today: FIGSY can charge and not send (#338), copy is generic (#346), and several sold features aren't real. **M2 becomes true only after M0 Moves 1+2 land + Move 3 proves it on staging.** Smartlead (#211, per-client sending isolation) is the *next* gate after that. Old note (pre-audit): "SAFE 6 Jul, one gate: Smartlead" — superseded; the audit showed the product isn't yet trustworthy enough to sell.

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

**M3 is DONE when:** #291 re-walked green post-deploy · #279/#289/#290 built + fed data · the Smartlead-fed shells get their data after #211. *(Admin honesty: #364 exclude demo data from founder metrics lives here.)*

---

# ④ MILESTONE 4 — THE REST OF THE SYSTEM (everything NON-FIGSY · FROZEN until FIGSY ships)

**Why it exists:** we chose to sell FIGSY only. Every other agent, integration, and money-path that isn't FIGSY is **hidden ("coming soon") in M0 and BUILT here in M4 — later, deliberately, one at a time.** Nothing in M4 is touched until M0 is done and FIGSY is sold. **Status of every item = 🔴 in PRODUCT-INVENTORY; future build detail = V2-TRACKER.** In M0 these are made *honest* (hidden); M4 is where they're made *real*.

| Area | Findings (build these later) |
|---|---|
| **Subscriptions** (Milla/Vida/Denise monthly billing) | #340 status→active · #341 real Stripe cancel · #342 lapse cron · #357 MRR amount · #386 double-sub · #379(sub side) |
| **Partner + referral** | #351 commission (20/5 + clawback + unique) · #355 referral link + payout · #370 partner ilike · #372 pool credits · #387 attribution |
| **Auto top-up** | #352 (Stripe off-session port, or remove) |
| **Other agents — real builds** | Vida RAG/knowledge (#362) · WhatsApp multi-tenant (#359/#360) · Calendar googleapis + booking (#361/#368) · Voice/Vapi (#369) · Denise closed-won + confirm (#396) · Milla CRM/email connectors (#395) · LinkedIn/PhantomBuster (#388) · Lena mount (#404) |
| **Integrations / infra / ops** | #377 support inbox · #378 demo-request availability · #380 missing tables · #381 developer webhooks · #382 churn scoring · #391 cron JSONB · #392 A/B guard · #393 data-moat dedup · #397 HubSpot platform sync |

**M4 is DONE when:** each area is rebuilt on the deterministic architecture (state machine + provider-confirmed + tests) and its "coming soon" label is lifted — **one agent/area at a time, each proven before the next.**

---

## 📌 Standing notes (the only extras this page keeps)

- **Demo prep (before any face-to-face):** create the demo BEFORE the meeting · test the magic-link "Open Demo" flow first · never reopen an expired demo · steer around Knowledge/Team/Integrations ("coming soon") · don't quote the demo form's numbers.
- **Env sanity before any real send (the "warm and nothing happens" trap):** `RESEND_API_KEY` · `ADMIN_SECRET_KEY` · `ANTHROPIC_API_KEY` · `RESEND_WEBHOOK_SECRET` · `FIGSY_COLD_FROM` · `TRACKING_URL` — one-click check: `/engine/env` (header-key gated).
- **Detail on any item:** PRODUCT-INVENTORY by ID (#306–#328 = the two audit waves) · why/history: KIND-MASTER session log · procedures: `client-flow-sop.md`.
