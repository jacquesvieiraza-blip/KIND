# 🔍 PRE-LAUNCH AUDIT — 12 Jun 2026 (16:20 UTC)

> Verified against git, code, builds, tests — not memory. For the Monday Company-Engine launch + the 19 Jun launch.

## ✅ GREEN — verified healthy
| Check | Result |
|-------|--------|
| Production `main` | Untouched — `93d2158` (pre-session) |
| Working tree | Clean, all pushed |
| API typecheck | PASS |
| API tests | **16 / 16 pass** |
| Migration order | ✅ `companies` table created before the `clients.company_id` FK |
| Auto-provision risk | ✅ Removed — now opt-in (`POST /company/provision`); existing accounts untouched on page open |
| Denise price in code | ✅ `$39` everywhere |
| Company endpoints | 12 routes live (overview · provision · seats · allocate · credit-requests · decide · pool/topup · accept-invite · winning-plays ×3) |

---

## 🔴 CRITICAL FINDING #1 — "launch the Command Centre" is entangled
**You cannot cleanly merge *just* the Command Centre to `main`.**
- `staging` is **133 commits ahead of `main`** (the entire Wave-1/2 + Tier-3 + V2 release train).
- This session's work also **modified the default sidebar** to add Templates / Sequence Builder / Deliverability / Company / Activity links + the status bar — these are **unconditional** (not flag-gated), so they'd show to **every** production client.
- So merging `staging → main` **or** the feature branch → `main` launches **far more than the Command Centre**.

**The two options:**
- **A — Launch the whole batch** (V2 nav + status bar + activity + deliverability + company engine + Denise $39). It's all built & tested on staging. Bigger surface, but one merge. Contradicts the "one push before the 19th" plan.
- **B — Isolated launch (recommended for your stated goal):** Claude builds a clean **`company-engine-prod`** branch *from `main`* containing only: the company-engine backend (`company.ts`, `admin.ts` company_demo, `seed-company.ts`, `index.ts` mount), the company **page**, the layout agent-gating, a minimal **Company** sidebar link (without the rest of the nav redesign), and **Denise $39**. You review + merge that one branch → only the Command Centre + Denise go live. Everything else stays on staging.

➡️ **Decision needed: A or B.** (Your repeated direction = B — only the Command Centre before the 19th.)

## 🔴 CRITICAL FINDING #2 — owners can't self-fund the pool on production
- `POST /company/pool/topup` is **staging-only** (returns 403 in prod) and there is **no Stripe → pool** path yet.
- So on production a real owner **cannot pay to fund their pool**. For Monday's demo you can **admin-fund** it (the demo seed sets a 40k pool; a real client can be admin-funded), but a self-service paying launch needs **Stripe → pool billing**. → **Claude build.**

## 🔴 CRITICAL FINDING #3 — Denise Stripe price object still $99
Code says `$39`; the **Stripe price object** is unchanged. Until you create a `$39/mo` price and update `STRIPE_PRICE_DENISE_MONTHLY`, **Denise checkout charges $99.** → **Founder, before any Denise sale.**

---

## 🟡 FOUNDER — outstanding before the 19th (full list in FOUNDER-ACTIONS.md)
**Company-engine launch:** run `20260612_company_engine.sql` on **prod** Supabase · merge the chosen branch → `main` · enable `company` flag · create $39 Denise Stripe price · (Stripe pool products when billing lands).
**Keys (data moat — you flagged these):** ✉️ **`partners@apollo.io`** reseller agreement · 🔑 create **Hunter** key (~$49/mo) · 🔑 free **PDL** key. *(All code is wired + dormant — they switch on the moment the key is set.)*
**Launch-critical:** D9 deliverability 10/10 · legal pack #10–14 (ICO/SR01/registered office/WHOIS/LinkedIn) · Go/No-Go Thu 18 · smoke tests T3–T7, T9, T10.

## 🤖 CLAUDE — outstanding before the 19th
1. **Isolated `company-engine-prod` branch** (if you pick B) — *next, on your go*
2. **Stripe → company pool billing** (real funding)
3. Invite email delivery · owner drill-down
4. Fix smoke-test failures same-day

## 🟢 After the 19th
Wave-4 keys (WhatsApp/Vapi/Clearbit) · videos · Y16 · outcome pricing · finish company-engine 🟡/🟢 items · the staging review queue.

---

### Bottom line
The Command Centre is **built, safe, and tested on staging**. The only things between it and a **production launch Monday** are: **(1)** your A-vs-B call on *how* it merges (entanglement), **(2)** Stripe → pool billing for real payment (Claude), **(3)** the prod migration + merge + flag + $39 Stripe price (founder). Keys (Apollo/Hunter/PDL) are **launch-by-19th**, not Command-Centre blockers.
