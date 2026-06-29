# 🚀 K.I.N.D — LAUNCH PAD

**As of: 29 June 2026** · post-launch (live since 18 Jun) · currency **USD**

> **Status key:** ✅ done · 🔧 next build · ⏸ gated (waiting on external clock or trigger)
> **Owner:** 🧍 you · 🤖 me · 🤝 both
> **Four-doc contract:** LAUNCH-PAD (this) = daily execution · PRODUCT-INVENTORY = status · KIND-MASTER = strategy/why · V2-TRACKER = future

---

## 📌 WHERE AM I — right now

- **Milestone 1:** Walkthrough (Tue) is the only thing left to build. Everything else waits on **Instantly warmth** — an external clock, not a build.
- **Milestone 2:** Full build day Wednesday. Nothing starts until you say go.
- **One external clock:** Instantly warmth (~90% inbox health). You confirm it — I don't assume it.

---

## 🎯 MILESTONE 1 — READY TO SELL & OUTREACH OURSELVES

### ✅ Mon 29 Jun — DONE

| Item | Owner |
|------|-------|
| Outreach list — 1,461 verified emails (`kind_instantly_import.csv`, 6 columns) | ✅ |
| Deliverability — gettingkind.com DKIM/SPF/DMARC · `FIGSY_COLD_FROM` set · open tracking pixel live · GA4 added | ✅ |
| Stripe payment config — all price IDs set · credit purchase verified live | ✅ |
| Lead Gen retirement — decision locked (single FIGSY credit at $3); build is Wednesday | ✅ |

### 🔧 Tue 30 Jun — TOMORROW

| Item | Owner |
|------|-------|
| Walkthrough Section A — 20 portal screens click-walk (Claude fixes broken items live + flips dots) | 🤝 both |
| Walkthrough Section B — 8 company screens (Claude provisions demo company first) | 🤝 both |

### ⏸ Gated on Instantly warmth (external clock — you confirm ~90% health)

| Item | Owner |
|------|-------|
| Confirm Instantly inbox health ~90% | 🧍 you |
| Upgrade Instantly plan (250 → enough for 1,461 imports) | 🧍 you |
| Import 1,461 contacts into Instantly | 🧍 you |
| Load 4-step sequence into Instantly (`docs/content/our-outreach-us-uk.md`) | 🧍 you |
| mail-tester 10/10 (item 101) | 🧍 you |
| Test-send 10–20 leads | 🧍 you |
| **First outreach fired (item 127)** | 🤝 both |

**M1 done when:** walkthrough clean + Instantly warm + first send out.

---

## ⚙️ MILESTONE 2 — CLIENTS RUN ON THE PRODUCT SAFELY

### 🔧 Wed 1 Jul — FULL BUILD DAY (nothing starts until you say go)

| Item | Owner |
|------|-------|
| Kill Paystack (T2c / item 237) — Stripe-only, remove all ZAR/Paystack paths | 🤖 me |
| Per-client send cap (T3) — 50 emails/day per client, configurable | 🤖 me |
| Lead Gen retirement — retire `lead_gen` plan + `credit_balance` pool · simplify `billing-rules.ts` · rewrite pricing page to single FIGSY product at $3 | 🤖 me |
| Multi-source lead router (item 243) — PDL → Hunter → Clearbit → BetterContact | 🤝 both |
| Context-rich FIGSY sequences (item 212) — 4–6 steps, lead-data personalised opener | 🤖 me |
| Smartlead engine (T4 / item 211) — per-client isolated + warmed mailboxes (Phases 2–6) | 🤝 both |
| Company-engine RLS (item 55a) — DB-enforced rep-data isolation | 🤖 me |
| Harden (T5) — production monitoring (item 199) · dead-control cleanup · Smoke Test 2 (item 100) | 🤝 both |
| Verify pause stops Stripe billing (item 190) — built + migration run; walk to confirm | 🤝 both |

### ⏸ Gated on first live campaign

| Item | Owner |
|------|-------|
| Walkthrough Section C — 16 behavioural items (open rate shows · reply triggers action · charge fires correctly) | 🤝 both |

### ⏸ Gated on first charge

| Item | Owner |
|------|-------|
| Walkthrough Section D — 14 self-certify items | 🧍 you |
| Xero (item 196) — connect Stripe + Wise same day as first paying client | 🧍 you |

**M2 done when:** Smartlead engine live + all walkthrough sections green + first client charged correctly.

---

## 🎬 Thu–Fri 3–4 Jul — RECORD + UPLOAD DEMOS

| Item | Owner |
|------|-------|
| Claude provisions demo company + prepares shooting setup | 🤖 me |
| Record product demo + Drop 01 video (item 129) | 🧍 you |
| Upload + publish verified videos (demo.html · The Drop · home) | 🤝 both |

---

## 🧍 YOUR STANDING LIST (only you can do these)

| Item | When |
|------|------|
| Confirm Instantly inbox health ~90% | The M1 unblocker |
| Upgrade Instantly plan + import 1,461 contacts | When warm |
| **BetterContact API key** — needed for item 243 source router | Wednesday |
| Google OAuth (item 126) | When ready |
| Flutterwave activation (item 136) | When ready |
| Legal pack — ICO · SEIS · DPAs · trademark (item 102) | Own track |

---

## 🔑 GO-LIVE CONFIG — verify in Railway (these fail SILENTLY if unset)

**(A) Customer can pay:**
`STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` · `STRIPE_PRICE_*` (all price IDs on API + Portal) · `ADMIN_SECRET_KEY`

**(B) Lead engine delivers:**
`PDL_API_KEY` · `HUNTER_API_KEY` · `ANTHROPIC_API_KEY`

**(C) FIGSY sends a client email:**
`RESEND_API_KEY` · `ADMIN_SECRET_KEY` (cron silently no-ops without this) · `FIGSY_COLD_FROM` · `RESEND_WEBHOOK_SECRET` · `TRACKING_URL`

**Our-own-outreach (Instantly rig):** gettingkind.com SPF/DKIM/DMARC ✅ · mail-tester 10/10 ⏸ (gated on warmth) · Instantly health ~90% ⏸ (you confirm)

---

*Open this → two milestone scoreboards → do the next 🔧 item in order. Status flips → PRODUCT-INVENTORY only. Why → KIND-MASTER. Future → V2-TRACKER.*
