# 🚀 K.I.N.D — LAUNCH PAD

**As of: 7 July 2026 PM · admin walk banked + Fable money audit → MILESTONE 0 opened.** This page = the four milestones and what to do right now. Nothing else lives here.
**History → KIND-MASTER session log · status of record → PRODUCT-INVENTORY · future → V2-TRACKER · find any doc → DOC-MAP.**

**Board:** 🟢106 verified · 🩷84 live-not-walked · 🟣4 approved · 🟡21 on branch · 🔴123 not built · ⏸5 blocked · Σ343 *(live count: `scripts/count-inventory.sh`)*

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

**WHERE IT STANDS: the Fable end-to-end money audit (7 Jul) returned PASS-WITH-RISKS.** Nobody can forge a payment or mint credits — but 8 holes let value ship unpaid, hide the meter, or break a client's safety net. **No real client until M0 closes.** All 8 logged 🔴 as **#330–#337** (detail by ID in PRODUCT-INVENTORY).

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

**M0 is DONE when:** all 8 shipped + live · `/engine/leads/test` proves PDL+Hunter sourcing · a preview enrollment visibly drops a credit.

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
