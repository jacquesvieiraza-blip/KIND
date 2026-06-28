# 🚀 K.I.N.D — LAUNCH PAD (the readiness tracker)

**As of: 26 June 2026** · post-launch (live since 18 Jun) · currency **USD**
**🎯 The aim: get to two clear milestones — (1) I can SELL & onboard, (2) clients can run on the product safely. Track every essential item to those, honestly.**

> 🧭 **Four-doc contract:** **LAUNCH-PAD** (this) = the road to ready, item by item · **PRODUCT-INVENTORY** = product status / the walkthrough · **KIND-MASTER** = strategy + why · **V2-TRACKER** = future.
> **Status key:** ✅ done + verified · 🔧 building / next · 🔴 not started · ⏸ waiting on you or an external clock.  **Owner:** 🧍 you · 🤖 me · 🤝 both.
> **No fake dates.** Readiness = these items flipping to ✅, not a guessed calendar. The only external clock is Instantly's ~2-week warm (below) — and you confirm it, I don't assume it.

---

## 📌 WHERE AM I — the 20-second answer
- **Milestone 1 — READY TO SELL & ONBOARD:** 🔧 in progress — **0 of 5 done** (the walkthrough is the live work; Instantly not yet confirmed warm).
- **Milestone 2 — CLIENTS RUN ON THE PRODUCT:** 🔴 early — **4 of 8 done** (T1 + T2a + T2b + M2); **M2/pause migration RUN on prod 28 Jun — pause now stops Stripe billing.** The engine (211) is still barely started.
- **In flight right now:** the **pink walkthrough** — you self-walking Group A (see `PINK-WALK-CHECKLIST.md`); I flip dots + fix breakages as you report.
- **Open PR:** **#789** (agents cards refine). **This session shipped (merged):** website audit/legal/global wording (#782/#783), competitor sweep + Alta removed (#784), "See how it works" fix (#785), agents → stacking cards + light bg (#786/#787), Clay steals logged (#788). **190 pause migration RUN on prod ✅.**

> ⚠️ **The honest headline:** we are **NOT near** "clients on the product." Smartlead has **zero sending built**; Instantly warmth is **unconfirmed**. This tracker now shows that truthfully so the warm date can't surprise us again.

---

## 🎯 MILESTONE 1 — READY TO SELL & ONBOARD A CLIENT
*What has to be true before you can confidently speak to, demo, and sign a client.*

| # | Item | Status | Owner | Done when |
|---|------|:--:|:--:|-----------|
| — | **Walkthrough complete** — every live element verified 🟢 or fixed; nothing broken/half-baked reachable by a client | 🔧 | 🤝 | inventory has no broken-in-live; all 🩷 walked to 🟢 or 🔴 |
| 198 | **Instantly domains warm** — your outreach rig | ⏸ | 🧍 | health ~90% **+ inbox-placement test passes** (101/194) — *you confirm* |
| — | **Outreach list built** — 200–500 US/UK leads (`content/our-outreach-us-uk.md` + engine) | 🔴 | 🤝 | list ready to load |
| — | **Sequence loaded** into Instantly (dogfood angle + free-sample CTA) | 🔴 | 🤖 | sequence + list attached, ready to fire |
| 127 | **First outreach fired** — low, ramped → replies → demos | 🔴 | 🤝 | first US/UK send out, on warm domains |

**Milestone 1 blockers:** the walkthrough (trust) + Instantly warmth (reach). Neither needs the product's sending engine — so **you can be sell-ready well before Milestone 2.**

---

## ⚙️ MILESTONE 2 — CLIENTS RUN ON THE PRODUCT SAFELY
*What has to be true before a paying client sends through the product itself (not your Instantly rig).*

| Tier | Item | Status | Owner | Done when |
|---|------|:--:|:--:|-----------|
| T1 | **Safety** — per-user rate limits · CRM dedup fail-closed (#753) | ✅ | 🤖 | *done + verified 25 Jun* |
| T2a | **Region default** fixed (no ZA default) + voice copy (#754) | ✅ | 🤖 | *done* |
| T2b | **Currency stored in USD** (`amount_usd`, #756) | ✅ | 🤖 | *done + migration run* |
| T2c | **Kill Paystack** — remove router + ZAR write paths (subs = 0, cleared) | 🔴 | 🤖 | Paystack code gone; Stripe-only |
| M2 | **Pause stops Stripe billing** — **BUILT #769 · migration RUN on prod 28 Jun** (pause calls Stripe `pause_collection`; 190 folded in) | ✅ | 🤝 | *migration run → a paused sub now stops the Stripe charge; pending one verification walk* |
| T3 | **Per-client send cap + N+1 batch enroll** — cap is global today (clients starve each other) | 🔴 | 🤖 | each client/rep has its own daily cap; 1,000-lead enroll doesn't time out |
| T4 | **211 — the engine:** per-client isolated + warmed sending (Smartlead) | 🔴 | 🤝 | a client sends from an isolated, warmed sender — verified |
| T5 | **Harden** — monitoring/alerts (199) · Smoke Test 2 (100) · dead-control cleanup | 🔴 | 🤝 | an outage pages you; all paths pass; no dead controls live |

**⛔ Do NOT put paying clients on the product's sending path until T3 + T4 are done.** **⛔ Do NOT onboard US/EMEA *paying* clients until T2c is done** (still modelled with ZAR paths).

---

## 🛠️ TOOL READINESS — Instantly + Smartlead (tracked, not assumed)
*The two tools the whole plan hinges on. Audited from code/records 26 Jun — no assumptions.*

| Tool | Powers | Real status (audited 26 Jun) | What's left | Owner |
|------|--------|------------------------------|-------------|:--:|
| **Instantly** | 🅐 **YOUR** outreach (Milestone 1) | ⏸ **Ordered ~23 Jun, warming. NOT confirmed warm** — no health % or inbox-placement test on record. | You confirm ~90% health + run the inbox test (101/194) | 🧍 |
| **Smartlead** | 🅑 the **CLIENT** engine (211, Milestone 2 / T4) | 🔴 **Connectivity only** — read-only stub, **zero sending built** (verified in `lib/smartlead.ts`). Phase 1 of 6. | Build Phases 2–6: provision + warm per-client mailboxes + the sending seam | 🤝 |

> This is the answer to "are we tracking these or assuming all's ok": **we're tracking them, and the truth is both are early.** Instantly = warming-unconfirmed; Smartlead = barely begun. We will not say "the system is warming" as if ready again — readiness is the rows above flipping ✅.

---

## 🔭 DEPTH TRACK — runs during the Instantly warm window (not a Milestone-1 blocker)
*We run thin: engine today = PDL (discovery) + Hunter (reveal) + Clearbit-free (domains) + Apollo (BYO-key). Use the warm wait to deepen.*

| # | Item | Status | Owner | Done when |
|---|------|:--:|:--:|-----------|
| 243 | **Lead-source depth** — add BetterContact (1 integration = 20+ providers) → source router | 🔴 | 🤝 | a US/EMEA ICP returns verified emails at 80%+ coverage |
| 212 | **Context-rich sequences** — 4–6 steps, ≤50-word opener using the lead's real data | 🔴 | 🤖 | a sent email visibly uses lead context, not a template |

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
- **Keys:** 126 Google OAuth · 136 Flutterwave · 58 Denise price. *(Hunter/PDL ✅ · Smartlead key ✅ live.)*
- **Decisions:** 211 mailbox markup + Resend-client migration · 196 accounting + VAT · v2/Casey wire-or-cut (T5).
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
