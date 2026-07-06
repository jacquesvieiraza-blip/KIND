# 🚀 K.I.N.D — LAUNCH PAD

**As of: 6 July 2026 PM · plan set for 7 July.** This page = the three milestones and what to do right now. Nothing else lives here.
**History → KIND-MASTER session log · status of record → PRODUCT-INVENTORY · future → V2-TRACKER · find any doc → DOC-MAP.**

**Board:** 🟢93 verified · 🩷92 live-not-walked · 🟣4 approved · 🟡21 on branch · 🔴119 not built · ⏸5 blocked · Σ334 *(live count: `scripts/count-inventory.sh`)*

> **⚠️ How code goes live (until the GitHub flag is appealed):** merging does NOT deploy. Every change ships by: **merge the PR → `git pull` → `railway up --detach --service "<svc>"`** (`@kind/api` · `@kind/portal` · `@kind/admin` · `KIND`=website). Appeal filed at `support.github.com/contact/account-flagged` — when it clears, auto-deploy returns.

---

## 📅 TOMORROW — 7 July (the plan, in order)
**The whole #306–#328 audit is closed + live — the product is safe. Nothing is blocked on Claude. Tomorrow = UNBLOCK the two big gates + VERIFY what's live. Top to bottom; each block is independent, so a slip on one doesn't stall the rest.**

**☀️ FIRST 30 MIN — the two unlocks (highest leverage — they free up everything else):**
1. **Send the GitHub flag appeal** — `support.github.com/contact/account-flagged` (paste the drafted reply from 6 Jul). → when it clears, auto-deploy returns and the manual `railway up` ends. *(infra)*
2. **Sort Smartlead access** — sign up / grab the API key. **This is THE last M2 gate (#211)** — the moment I have it I start the multi-day per-client-sending build. *(M2)*
3. **Glance at Instantly warm-up %** — the one M1 gate. If ≥90% → jump to the M1 fire-drill (§① below). If not, leave it, it's a clock. *(M1)*

**🕙 MID-MORNING — verify the admin is real (Sitting A, ~1 hr):**
4. Walk `admin.get-kind.com` — the 7 screens listed in **§③ below**; confirm each loads + shows honest data. Report back screen-by-screen and I flip ~23 dots 🩷→🟢. *(M3)*

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
| 2 | **Sitting A** — walk the admin (~23 dots 🩷→🟢, list in M3 below) | 🧍 |
| 3 | **Sitting B** — 2 toggles: `PDL_API_KEY` in Railway · Resend `email.bounced`+`email.complained` events | 🧍 |
| 4 | **Sitting C** — the $60 live money walk (list in M2 below) | 🧍 |
| 5 | **Send GitHub flag appeal** (drafted, in chat 6 Jul) → restores auto-deploy | 🧍 |
| 6 | **Give Smartlead access** → unblocks #211, the last M2 gate → 🤖 I build | 🧍→🤖 |
| 7 | **Watch Instantly warm-up** weekly → at ≥90%, run the M1 fire-drill below | 🧍 |

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
| 2 | **#326 Settings lies** (part of the #324–#328 batch) | Settings still says "Approve emails before sending — nothing goes out without you" while FIGSY auto-sends. A trusting client gets burned. Preview-first. | 🤖 |
| 3 | **$60 live money walk (#28b)** | nobody has pushed real money through the whole loop yet: top-up → pool fund → rep allocate → delivery/enroll deduct → deactivate returns to pool → counters reconcile | 🧍 |
| 4 | Hardening batch: #324 (key-in-URL) · #325 (Paystack /verify binding) · #327 (website false claims) · #328 ($1-plan residue) — plus later #212 depth · #199 monitoring | small, none client-blocking alone | 🤖 |

**M2 is DONE when:** Smartlead isolation live · #326 shipped · the $60 walk reconciles clean.

---

# ③ MILESTONE 3 — The admin cockpit we run the business from

**WHERE IT STANDS: built, honest, login-gated, re-audit clean. Zero verified — because you haven't walked it. That's the whole gap.**

**Sitting A — one pass at `admin.get-kind.com`, confirm each loads + shows honest data (~23 dots flip 🩷→🟢):**
1. **Cockpit** (#272) — KPIs, real system-health probe, real MRR
2. **Sales Channel** (#274/#288/#294) — partner lens real, AE lens says "sample"
3. **Finance/Revenue** (#287/#289/#295/#296/#297) — MRR · ARPU · invoices · refunds · renewals · NPS card · MRR-over-time
4. **Clients** (#281/#292) — list · drill-down · at-risk tile · usage sparkline
5. **Engine/Health** (#279/#304/#290) — deliverability graph · cron history · recent API errors
6. **Nora rail** (#275) — ask a question, get a reply
7. **GTM/Funnel** (#291)

**Stays empty on purpose (correctly labelled, don't fail it for this):** Ops inbox-pool + AE lenses + deliverability data — they wait for Smartlead (#211/#270/#271/#276/#280).

**M3 is DONE when:** the walk is complete (screens 🟢) and the Smartlead-fed shells get their data after #211.

---

## 📌 Standing notes (the only extras this page keeps)

- **Demo prep (before any face-to-face):** create the demo BEFORE the meeting · test the magic-link "Open Demo" flow first · never reopen an expired demo · steer around Knowledge/Team/Integrations ("coming soon") · don't quote the demo form's numbers.
- **Env sanity before any real send (the "warm and nothing happens" trap):** `RESEND_API_KEY` · `ADMIN_SECRET_KEY` · `ANTHROPIC_API_KEY` · `RESEND_WEBHOOK_SECRET` · `FIGSY_COLD_FROM` · `TRACKING_URL` — one-click check: `/engine/env` (header-key gated).
- **Detail on any item:** PRODUCT-INVENTORY by ID (#306–#328 = the two audit waves) · why/history: KIND-MASTER session log · procedures: `client-flow-sop.md`.
