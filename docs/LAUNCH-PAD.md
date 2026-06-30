# 🚀 K.I.N.D — LAUNCH PAD

**As of: 30 June 2026** · post-launch (live since 18 Jun) · currency **USD**

> **Status key:** ✅ done · 🔧 next build · ⏸ gated (waiting on an external clock or trigger) · 🛑 blocker
> **Owner:** 🧍 you · 🤖 me · 🤝 both
> **Four-doc contract:** LAUNCH-PAD (this) = daily execution · PRODUCT-INVENTORY = status · KIND-MASTER = strategy/why · V2-TRACKER = future

---

## 📌 WHERE AM I — two fronts, nothing else

| Front | One-line state | The single gate |
|-------|----------------|-----------------|
| **① Outreach ourselves** (sell K.I.N.D) | Product is walked & working. No build left. | ⏸ **Instantly warmth ~90%** — your external clock |
| **② Operate a paid client + team** | Screens all walked (Sections A+B 🟢). The machinery isn't ready. | 🛑 **#211 sending engine** (clients still share one domain) |

> Everything below hangs off these two. If a task doesn't move Front ① or Front ②, it's noise.

---

## ① FRONT ONE — OUTREACH OURSELVES

**Build is done.** Walkthrough proved the product. This front is now warmth + your setup — **no engineering blocks it.**

### ⏸ Gated on Instantly warmth (you confirm ~90% inbox health)

| Step | Owner |
|------|-------|
| Confirm Instantly inbox health ~90% (#198) | 🧍 you |
| Upgrade Instantly plan (250 → enough for 1,461) | 🧍 you |
| Import 1,461 contacts (`kind_instantly_import.csv`) | 🧍 you |
| Load the 4-step sequence (`docs/content/our-outreach-us-uk.md`) | 🧍 you |
| mail-tester 10/10 (#101) | 🧍 you |
| Test-send 10–20 → **first outreach fired (#127)** | 🤝 both |

**✅ Already done:** 1,461 verified list · gettingkind.com SPF/DKIM/DMARC · `FIGSY_COLD_FROM` set · GA4 live · Stripe credit purchase verified.

**Front ① done when:** Instantly warm + first real send out.

---

## ② FRONT TWO — OPERATE A PAID CLIENT + TEAM

The UI is fully walked. What's left is the real machinery, **in priority order**:

### 🛑 Gate 1 — THE SENDING ENGINE (#211) · the #1 blocker

| Reality (audit 30 Jun) | Owner |
|------------------------|-------|
| Today **every client sends from ONE shared Resend domain** (`figsy.ts` → Resend, single `FIGSY_COLD_FROM`). No per-client isolation, no warmed dedicated domains, no mailbox rotation. | — |
| Smartlead is **Phase 1 only** (read-only API check); Phases 2–6 (per-client isolated + warmed sending) **not built**. | 🤖 |
| **Why it blocks paid clients:** one client's spam complaints poison everyone else's deliverability. Cannot safely onboard a paying client until this is isolated. | 🛑 |

### 🛑 Gate 2 — PROVE MONEY FLOW ($60 live walk, #28b)

| Step | Owner |
|------|-------|
| Code is verified to deduct (lead `increment_client_credits`, FIGSY `increment_figsy_credits` — atomic). **Never walked with real money.** | ✅ code |
| **Add $60 to a LIVE account → run real leads → confirm EVERY credit movement:** pool fund (Stripe) · rep allocate (debits pool) · request approve (pool→rep) · lead deduct 1-per · **deactivate-return** · usage counters reconcile. | 🤝 both |
| One run clears all billing-correctness pinks at once (#166–171, #58, #238, #190) + #28/#8/#170 + #111 live booking. **Scheduled — critical, not today.** | 🤝 both |

### 🔧 Gate 3 — Wed 1 Jul M2 BUILD DAY (nothing starts until you say go)

| Build | Owner |
|-------|-------|
| **Lead Gen retirement** → single FIGSY product: retire `lead_gen` plan + pool, simplify `billing-rules.ts` (still dual today), fix pool top-up `creditType` (#55c), rewrite pricing page | 🤖 |
| **#55a Company-Engine RLS** — DB-enforce isolation on `leads` + `figsy_campaigns/enrollments/replies/sent_emails` (today API-only → a team isn't DB-isolated) | 🤖 |
| **#108b** — deactivating a rep must **return unused credits to the pool** (today one-way out) | 🤖 |
| Per-client send cap (T3, 50/day) · FIGSY sequences depth (#212) · multi-source data router (#243) | 🤝 |
| Harden (T5): monitoring/alerting (#199 — none today) · cron run-visibility · Smoke Test 2 (#100) · remove dead Paystack code (#237 — already legacy, not in checkout) | 🤝 |

### ⏸ Gated on first live campaign / first charge

| Item | Owner |
|------|-------|
| Walkthrough Section C — 16 behavioural items (open-rate · reply-triggers · charge fires) | 🤝 |
| Walkthrough Section D — 14 self-certify items · Xero connect (#196) at first paying client | 🧍 |

**Front ② done when:** engine isolates each client + money flow proven live + Sections C/D green.

---

## 🗓️ THIS WEEK'S CALENDAR

| When | What | Owner |
|------|------|-------|
| **Wed 1 Jul** | M2 build day (Gate 3 above) — say go first | 🤝 |
| **Thu–Fri 3–4 Jul** | Record product demo + Drop 01 (#129); Claude preps demo company + shooting setup; upload/publish | 🤝 |
| **Fri 4 Jul** | Generate all 12 weeks of LinkedIn posts (clock starts Mon 7 Jul). Hard rules: **no pricing · no traction numbers · safe claims only**; fallback CTAs for missing pages | 🤝 |

**Content guardrails (founder-locked):** pricing in flux → block · videos record Fri so no video posts before then · hold posts that need unbuilt pages (Milla demo data, CRM claim, partners page, 50-page playbook).

---

## 🧍 YOUR STANDING LIST (only you)

| Item | When |
|------|------|
| Confirm Instantly warmth ~90% | the Front ① unblocker |
| Upgrade Instantly + import 1,461 | when warm |
| **$60 to a live account** for the money walk | the Front ② proof |
| BetterContact API key (#243 router) | Wednesday |
| Google OAuth (#126) · Flutterwave (#136) · Legal pack (#102) | own track |

---

## 🔑 GO-LIVE CONFIG — verify in Railway (these fail SILENTLY if unset)

- **Customer can pay:** `STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` · `STRIPE_PRICE_*` (API + Portal) · `ADMIN_SECRET_KEY`
- **Lead engine delivers:** `PDL_API_KEY` · `HUNTER_API_KEY` · `ANTHROPIC_API_KEY`
- **FIGSY sends:** `RESEND_API_KEY` · `ADMIN_SECRET_KEY` (cron no-ops without it) · `FIGSY_COLD_FROM` · `RESEND_WEBHOOK_SECRET` · `TRACKING_URL`
- ⚠️ **Audit flag:** missing `RESEND_API_KEY` logs emails as "sent" but sends nothing — verify it's set in prod.

---

## ✅ Done this session (30 Jun) — for the record (status of record = PRODUCT-INVENTORY)

- Walkthrough **Section A (17 🟢)** + **Section B (7 🟢)** complete; **24 items greened**.
- Fixes shipped: #828 · #831 · #833 · #835 · #840 (demo reps) · #839 (admin toast).
- Inventory **rebuilt + re-sectioned** (board now script-true: 🟢89 · 🩷35 · 🟣4 · 🟡21 · 🔴115 · ⏸5 · Σ269).
- #28b billing **verified in code**; $60 live walk scheduled as the real proof.
- Logged real gaps: #28b, #55c, #55d, #78b, #80b, #108b, #113b.

---

*Open this → two fronts → do the next item in order. Status flips → PRODUCT-INVENTORY only. Why → KIND-MASTER. Future → V2-TRACKER.*
