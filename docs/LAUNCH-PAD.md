# 🚀 K.I.N.D — LAUNCH PAD (the readiness tracker)

**As of: 26 June 2026** · post-launch (live since 18 Jun) · currency **USD**
**🎯 The aim: get to two clear milestones — (1) I can SELL & onboard, (2) clients can run on the product safely. Track every essential item to those, honestly.**

> 🧭 **Four-doc contract:** **LAUNCH-PAD** (this) = the road to ready, item by item · **PRODUCT-INVENTORY** = product status / the walkthrough · **KIND-MASTER** = strategy + why · **V2-TRACKER** = future.
> **Status key:** ✅ done + verified · 🔧 building / next · 🔴 not started · ⏸ waiting on you or an external clock.  **Owner:** 🧍 you · 🤖 me · 🤝 both.
> **No fake dates.** Readiness = these items flipping to ✅, not a guessed calendar. The only external clock is Instantly's ~2-week warm (below) — and you confirm it, I don't assume it.

---

## 📌 WHERE AM I — the 20-second answer
- **Milestone 1 — READY TO SELL & ONBOARD:** 🔧 — **0/5 fully done, 2 in progress.** Outreach list seed built (≥2,000 pull Mon) · 4-step sequence drafted (you load) · walkthrough in progress · **gated on Instantly warmth.**
- **Milestone 2 — CLIENTS RUN ON THE PRODUCT:** 🔴 early — T1 + T2a + T2b done. **WED = build the whole client system** (T4/211 engine · T2c · T3 · 243 · 212 · T5 · verify-pause). Engine needs your 2 decisions (mailbox markup + Resend→per-client).
- **In flight / next:** the **📅 Mon/Tue full-business sprint** (section below) + the **pink walkthrough** — Section A (you click-walk) Mon, Section B (demo account) Tue; I fix breakages + flip dots.
- **Open PR:** **#803** — Mon/Tue sprint plan + runlist (docs) — *awaiting your clean merge.* **Merged → LIVE this session:** homepage de-clutter (#797, 259 🟢) · product-page dashboards (#798, 254 🟢) · hero fix (#799/#800) · pricing compare-table (255 🟢) + social-proof scaffold (253 🟢, hidden-until-data) + memory rule (#801) · green-verify (#802) · data-residency (#795) · nav/footer (#796) · audit/legal/global (#782/#783) · competitor sweep (#784). **Outreach list built** (179-row seed + ICP, delivered as files). **Stack: PDL→Hunter→Clearbit; 243 router = Tue.**

> ⚠️ **The honest headline (code-audited 28 Jun):** the product is **built end-to-end** — signup→pay→source→enrich→score→deliver→charge→**FIGSY sends via Resend**→replies all work in code. **We are NOT behind on building.** The real risk is **go-live CONFIG that fails SILENTLY** (Stripe price IDs, the send cron's `ADMIN_SECRET_KEY`, `FIGSY_COLD_FROM`) + **unverified Railway env** — the app runs "green" while payments/cron/cold-domain can be quietly dead. **Status = code-complete, config-UNVERIFIED.** Smartlead/211 is NOT "zero sending" — basic sending already runs on Resend; 211 only adds **per-client isolated + warmed** mailboxes (deliverability/scale). Instantly warmth = the one external clock.
>
> 🔑 **Before any go-live claim, verify Railway env against the 🔑 GO-LIVE CONFIG section below.**

## 📅 THE WEEK — MON→FRI, DAY BY DAY
**Mon–Tue = M1 (ready to outreach OUR clients).** **Wed = M2 (build the client system).** **Thu–Fri = record + upload demos.** Only **Instantly warmth** is allowed to still be waiting. Owner: 🧍 founder · 🤖 Claude · 🤝 both.

### ▶ MONDAY 29 JUN — M1 (our outreach)
1. **Outreach list → ≥2,000 names** 🤖 — Apollo pull (US SMB/Mid-Market), dedupe vs the 179.
2. **Start enrichment → verified emails** 🤖 — run the list through our live PDL→Hunter.
3. **Walkthrough — Section A (23 click-walk)** 🤝 — founder click-walks portal screens (`PINK-WALK-CHECKLIST.md`); Claude fixes ❌ live + flips dots.
4. **Company — business training** 🧍.
5. **Deliverability config** 🧍 — cold-domain env (`FIGSY_COLD_FROM`/`REPLY_TO`/`TRACKING_URL`) + DNS SPF/DKIM/DMARC.
6. ✅ **Payment config** — Stripe Price IDs set on both API + Portal Railway services; credit purchase verified working 29 Jun (PR #807).

### ▶ TUESDAY 30 JUN — M1 (our outreach)
1. **Finish enrich → Instantly-ready CSV** 🤖 — export the contactable leads ready to import to Instantly.
2. **Sequence → load into Instantly** 🧍 — the drafted 4-step dogfood + free-sample.
3. **Walkthrough — Section B (8 demo-account)** 🤝 — Claude provisions a demo company; founder walks Command Centre 55 · provisioning 59 · rep flows 106–111.
4. **Company — Xero/accounting + banking + Wise rails** 🧍🤝.
5. **mail-tester 10/10 (101)** 🧍 + **test-send 10–20 leads** to validate before volume.
- **END OF TUE = M1 DONE.** Only **198 Instantly warmth** still waiting → then **127 first outreach fired** (cold = burns the rig).

### ▶ WEDNESDAY 1 JUL — M2 (build the client system)
1. **T4 / 211 — the engine** 🤝 — *(basic sending already works via Resend; this adds per-client **isolated + warmed** mailboxes for deliverability/scale)*. Smartlead: provision → warm → sending seam → credit alignment → test. **2 decisions: mailbox markup + Resend→per-client.** Spans past Wed.
2. **T2c — Kill Paystack** 🤖 — remove router + ZAR paths; Stripe-only.
3. **T3 — Per-client send cap + N+1 batch enroll** 🤖 — daily cap (50/day, configurable).
4. **243 — Multi-source source-router** 🤝 — PDL→Hunter→Clearbit + BetterContact (key from founder).
5. **212 — Context-rich FIGSY sequences** 🤖.
6. **T5 — Harden** 🤝 — dead-control cleanup (88/230/122) + unrun migrations (182/185) + monitoring (199) + Smoke Test 2 (100).
7. **55a — Company-engine RLS** 🤖 — DB-enforced rep-data isolation (before any multi-rep client).
8. **Verify Pause/M2** 🤝 — re-walk to confirm pause stops Stripe billing → 🔧→🟢.

### ▶ THU–FRI 3–4 JUL — RECORD + UPLOAD VERIFIED DEMOS
1. **Record demos** 🧍 — founder films per `RECORDING-SHOOTING-SCRIPT.md` (item 129); Claude provisions the demo company first.
2. **Demo-page prep (HTML only)** 🤖 — `demo.html` is video-ready; The Drop/blog/home need a small video-embed block. *(rec: consolidate on demo.html now, /watch later.)*
3. **Upload + publish** 🤝 — verified videos into demo + Drop + blog + home; flip 129/130/163 as they go live.

### ⏳ TRACKED / GATED — time-based or trigger-gated
- **198 Instantly warmth** 🧍 — the one allowed waiter (gates our first send).
- **Section C walkthrough (27 behavioural items)** 🤝 — fire on the first real campaign; can't click-walk.
- **258 data residency** 🤝 — trigger-gated: build same-day on the first US/UK client.
- **Pitch-strengtheners (NOT blocking the sale, post-first-client):** 131 GTM funnel instrumentation · 133 design-partner case study + logo · 137 90-day guarantee · 135 onboarding-v2 emails. Flagged so they're not lost; do after first client/results.
- **Doc hygiene** 🤖 — archive `AUDIT-24JUN-RECONCILIATION.md`; relabel Alta numbers in the pitch decks (anytime).

---

## 🔑 GO-LIVE CONFIG — verify in Railway (code is built; these fail SILENTLY if unset)
*From the 28-Jun hard-code audit. The app boots "green" even when these are missing — confirm each on the live deploy. This lives HERE now, not in a side doc.*

**(A) Customer can pay** — ⚠️ not enforced at startup:
`STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` (endpoint `https://<api>/stripe/webhook`) · API price IDs `STRIPE_PRICE_LEADGEN_20/40/100` + `STRIPE_PRICE_FIGSY_20/40/100` + `STRIPE_PRICE_{MILLA,VIDA,DENISE}_MONTHLY` · portal twins `NEXT_PUBLIC_STRIPE_PRICE_*` (Buy button reads these) · Stripe Prices in **USD** · `ADMIN_SECRET_KEY`.

**(B) Lead engine delivers** — we run PDL+Hunter, NOT Apollo:
`PDL_API_KEY` + `HUNTER_API_KEY` (required for us) · `ANTHROPIC_API_KEY` (scoring) · `APOLLO_API_KEY` = optional, not needed.

**(C) FIGSY sends a client email** — ⚠️ cron + from-domain fail silently:
`RESEND_API_KEY` (else records "sent" but sends nothing) · `ADMIN_SECRET_KEY` (else the 2-hourly send cron silently no-ops) · `FIGSY_COLD_FROM` (else cold mail poisons get-kind.com) · `RESEND_WEBHOOK_SECRET` (else replies rejected).

**Our-own-outreach (Instantly rig):** cold-domain DNS **SPF/DKIM/DMARC** · mail-tester **10/10** (101) · Instantly health ~90% + inbox test (198).

---

## 🎯 MILESTONE 1 — READY TO SELL & ONBOARD A CLIENT
*What has to be true before you can confidently speak to, demo, and sign a client.*

| # | Item | Status | Owner | Done when |
|---|------|:--:|:--:|-----------|
| — | **Walkthrough complete** — every live element verified 🟢 or fixed; nothing broken/half-baked reachable by a client | 🔧 | 🤝 | inventory has no broken-in-live; all 🩷 walked to 🟢 or 🔴 |
| 198 | **Instantly domains warm** — your outreach rig | ⏸ | 🧍 | health ~90% **+ inbox-placement test passes** (101/194) — *you confirm* |
| — | **Outreach list built** — **🔧 seed built: 179 rows (158 active) US SMB/Mid-Market, your competitor-customer Excel + Claude additions + ICP, delivered as files.** Enrich→verified-email volume via 243. | 🔧 | 🤝 | verified-email list loaded into the system |
| — | **Sequence loaded** into Instantly (dogfood + free-sample CTA) — **🔧 4-step sequence DRAFTED + delivered; founder loads into Instantly (no Claude access to Instantly).** | 🔧 | 🧍 | sequence + list attached in Instantly, ready to fire |
| 127 | **First outreach fired** — low, ramped → replies → demos — *gated on Instantly warmth* | 🔴 | 🤝 | first **US** send out, on warm domains |

**Milestone 1 blockers:** the walkthrough (trust) + Instantly warmth (reach). Neither needs the product's sending engine — so **you can be sell-ready well before Milestone 2.**

---

## ⚙️ MILESTONE 2 — CLIENTS RUN ON THE PRODUCT SAFELY
*What has to be true before a paying client sends through the product itself (not your Instantly rig).*

| Tier | Item | Status | Owner | Done when |
|---|------|:--:|:--:|-----------|
| T1 | **Safety** — per-user rate limits · CRM dedup fail-closed (#753) | ✅ | 🤖 | *done + verified 25 Jun* |
| T2a | **Region default** fixed (no ZA default) + voice copy (#754) | ✅ | 🤖 | *done* |
| T2b | **Currency stored in USD** (`amount_usd`, #756) | ✅ | 🤖 | *done + migration run* |
| T2c | **Kill Paystack** — remove router + ZAR write paths (subs = 0, cleared) — **✅ APPROVED, build WED (remove entirely)** | 🔴→🔜 | 🤖 | Paystack code gone; Stripe-only |
| M2 | **Pause stops Stripe billing** — BUILT #769 · migration RUN on prod 28 Jun (pause calls Stripe `pause_collection`; 190 folded in) — **⚠️ showed ❌ on 26-Jun walk; RE-VERIFY Wed** | 🔧 | 🤝 | re-walk confirms a paused sub stops the Stripe charge → then ✅ |
| T3 | **Per-client send cap + N+1 batch enroll** — cap is global today (clients starve each other) — **✅ APPROVED, build WED (default 50/client/day, configurable)** | 🔴→🔜 | 🤖 | each client/rep has its own daily cap; 1,000-lead enroll doesn't time out |
| T4 | **211 — the engine:** per-client **isolated + warmed** sending (Smartlead) — *basic sending already live via Resend; this is the deliverability/scale layer.* **build STARTS WED** (2 decisions: mailbox markup + Resend→per-client) | 🔴→🔜 | 🤝 | a client sends from an isolated, warmed sender — verified |
| T5 | **Harden** — **dead-control cleanup + monitoring (199) + Smoke Test 2 (100) = WED** (M2 harden) | 🔴 | 🤝 | an outage pages you; all paths pass; no dead controls live |

**⛔ Do NOT put paying clients on the product's sending path until T3 + T4 are done.** **⛔ Do NOT onboard US/EMEA *paying* clients until T2c is done** (still modelled with ZAR paths).

---

## 🛠️ TOOL READINESS — Instantly + Smartlead (tracked, not assumed)
*The two tools the whole plan hinges on. Audited from code/records 26 Jun — no assumptions.*

| Tool | Powers | Real status (audited 26 Jun) | What's left | Owner |
|------|--------|------------------------------|-------------|:--:|
| **Instantly** | 🅐 **YOUR** outreach (Milestone 1) | ⏸ **Ordered ~23 Jun, warming. NOT confirmed warm** — no health % or inbox-placement test on record. | You confirm ~90% health + run the inbox test (101/194) | 🧍 |
| **Smartlead** | 🅑 per-client **isolated+warmed** sending (211 / T4) — *NOT basic sending; clients already send via Resend today* | 🔴 read-only stub (`lib/smartlead.ts`). Phase 1 of 6. | Build Phases 2–6: provision + warm per-client mailboxes + sending seam | 🤝 |

> Truth: **Instantly = warming-unconfirmed** (the clock); **Smartlead = dormant** — but client sending is NOT blocked on it (Resend handles sending today). Smartlead is the *isolation+warmth* upgrade. We will not call the system "ready" until the GO-LIVE CONFIG is verified in Railway and the rows above flip ✅.

---

## 🔭 DEPTH TRACK — runs during the Instantly warm window (not a Milestone-1 blocker)
*We run thin: engine today = PDL (discovery) + Hunter (reveal) + Clearbit-free (domains) + Apollo (BYO-key). Use the warm wait to deepen.*

| # | Item | Status | Owner | Done when |
|---|------|:--:|:--:|-----------|
| 243 | **Lead-source depth** — PDL→Hunter→Clearbit + BetterContact → source router — **scheduled WED** (BetterContact key from founder) | 🔴→🔜 | 🤝 | a US ICP returns verified emails at 80%+ coverage |
| 212 | **Context-rich sequences** — 4–6 steps, ≤50-word opener using the lead's real data — **scheduled WED** (depends on 243) | 🔴→🔜 | 🤖 | a sent email visibly uses lead context, not a template |

---

## ⏸ PARKED — not on the path to either milestone
*Nothing builds unless it's a Milestone-1/2 item, the walkthrough, or the depth track. Everything else waits until the system is solid and a real client/revenue pulls it in. Full status of each → PRODUCT-INVENTORY.*
- **Feature builds:** 120 memory · 144 Denise-deep · 141 context-MCP · 145 LENA/TONY · 157/158 images+voice-brief · 162 prompt library.
- **Partner / seller engine:** 197 · 200 · 203 · 213–226 · 228 (whole partner UI/comp). Stealth recruiting 233 = list-build only.
- **Channels:** 96 Vapi · 128 WhatsApp · 178/229 voice — off the cash path.
- **Later / gated:** 139/143 · 147 · 150–161 · 165 · 55a RLS · 181 enterprise SSO · **258 regional data residency** (trigger-gated: framework pre-built → provision + test + go-live **same day** on the 1st US/UK client → runbook `docs/DATA-RESIDENCY-PLAYBOOK.md`).

---

## 🧍 YOUR STANDING LIST (decisions + keys only you can do)
- **Confirm warmth:** Instantly health % + inbox test (the Milestone-1 unblocker).
- **Keys:** 126 Google OAuth · 136 Flutterwave · 58 Denise price · **BetterContact key (for Tue 243 source-router)**. *(Hunter/PDL ✅ · Smartlead key ✅ live.)*
- **Decisions:** **211 mailbox markup + Resend→per-client (the 2 Wed engine decisions)** · 196 accounting platform (Xero/QB) + VAT · v2/Casey wire-or-cut (T5).
- **Legal (own track):** 102 pack · SEIS · DPAs · trademark.

## 🏢 THIS WEEK — COMPANY OPS SETUP (founder, added 28 Jun)
*Get the business backend right alongside the product/demo work.*
- **Run the company business training** (the business-model / how-we-operate session).
- **Set up the business backend properly:** accounting platform (196 — pick + connect, USD reporting, VAT threshold) · banking/invoicing flow · expense + payout rails (Wise for partner/AE commission) · bookkeeping cadence.
- Done-when: accounting platform live + reconciled to Stripe revenue; training delivered.

---

## 🗂️ MOVED OUT — full sight, nothing lost
*LAUNCH-PAD holds only the road to the two milestones. Everything else lives in PRODUCT-INVENTORY (the full board) with its true status. "Moved out" only means "not on the path right now."*

| What | Now lives in | Why |
|------|--------------|-----|
| Live core product (agents, lead engine, billing, admin, infra — 1–56, 92, 104, 195, 244) | PRODUCT-INVENTORY | Already live; the walkthrough re-verifies it |
| 🩷 live-not-walked (59 · 80 · 106–114 · 245/246 · R-wave 60–79) | The walkthrough (PRODUCT-INVENTORY) | These ARE the walkthrough |
| Feature builds · partner/seller engine · channels · intelligence/scale | ⏸ PARKED + V2-TRACKER | Not on the path to either milestone |
| Founder EPICs (231 content · 232 legal · 234 SEIS · 103 Apollo · 117 drop) | 🧍 founder-owned + inventory | You drive these |

> **Safety net:** PRODUCT-INVENTORY is the full 254-item board. If it's not here, it's still there with its true dot. This doc is only ever "the road to ready."

---
*Rhythm: open this → see the two milestone scoreboards → do the next 🔧 item in order. Product status flips in PRODUCT-INVENTORY (the only place status is edited). Why → KIND-MASTER. Future → V2-TRACKER.*
