# 🌅 Morning Fix-Log — overnight portal audit + fixes (9→10 Jun)

**What I did:** full data-flow audit of every portal page (4 parallel agents: metric-consistency · leads→campaign→inbox flow · agent/account pages · API counter sweep), then fixed the highest-impact issues in **build-verified batches pushed to `main`**. Each batch was checked with a real `next build` / API typecheck (the thing that would've caught last night's crash).

---

## ✅ FIXED & LIVE ON MAIN (verified)

**Crashes / "looks-fake" (most visible):**
- **Marketplace crash** — server-component `onError` removed (the `/dashboard/marketplace` "Something went wrong").
- **Marketplace fake agents** — Lena & Tony were "buyable" but don't exist → now **"Coming soon"** (non-buyable); FIGSY "Included" → **"Pay per result"**.
- **Agent Grid cards** — added `object-top` + larger avatar (heads were centre-cropped).
- **3 avatar crashes** guarded (`from_email[0]`/`first_name[0]` threw on empty values) — inbox + replies.
- **Fabricated "Suggest Campaigns" counts** — was showing `total×0.4` / `×0.3` made-up numbers → now only real signals.
- **Usage credit-history** showed raw `usage`/`referral_bonus` strings → now proper labels.

**The core disease — numbers not reconciling (your emails-sent + leads-used complaints):**
- **ALL campaign counters now reconcile from source** on `/figsy/campaigns` + `/campaigns/:id` — `emails_sent`, `replies_total`, `replies_interested`, `opted_out`, `meetings_booked`, `leads_enrolled` are corrected up to the real row counts. The Dashboard sums these, so its numbers now match reality.
- **Usage "Leads used: 0" fixed** — two root causes: (1) a billing-period start in the *future* made everything show 0 → now clamped; (2) it excluded opted-out leads you'd already been charged for → now counted.

**Plumbing / links ("information doesn't flow"):**
- `/replies/all` now exposes lead **id + linkedin_url** → the **LinkedIn chip works** (was always blank) and **reply→lead** is possible.
- Added a **reply→campaign link** in the replies detail.

**Correctness:**
- Fixed **5 wrong/insecure API URL fallbacks** (`api.kindai.co.za` wrong domain; `http://` not `https://`) across settings/invite/leads/referral.

---

## 🚩 LAUNCH-CRITICAL — verify before ST1 (only you can)
**Confirm `supabase/migrations/20260603_schema_reconcile.sql` is applied in PROD Supabase.** The reply classifier writes `'hot'`/`'warm'`/`'cold'`; the *original* CHECK constraint rejects those. If the reconcile migration isn't applied, **every reply insert fails → classification silently breaks → "0 replies" everywhere.** This is the SMOKE_TEST pre-flight keystone. (Confirmed in code that `'hot'` is the correct value — not a bug to "fix" in queries.)

---

## 💳 BILLING CORRECTNESS — MUST FIX BEFORE CLIENTS TOUCH THE PRODUCT (audit 14 Jun, verified vs live code)
> Action day **Tue 16** (🤖 build, 🧍 Stripe + sign-off). Gates the Fri-19 launch. The deck is correct; the **code diverges from it.** Every claim below cites a file:line.
>
> **§3 design — SIGNED OFF (Jacques, 14 Jun):** one lead = one charge = one wallet, decided by an explicit **`clients.plan` (`'lead_gen' | 'figsy'`)** flag. Lead-Gen plan → $1 from the lead-gen pool. FIGSY plan → $3 from the FIGSY pool, **lead included**, lead-gen pool never touched. Outreach enrollment stops charging (the $3 already paid for lead + outreach).

1. 🔴 **FIGSY double-charge.** Every delivered lead charges the lead-gen pool $1 (`lead-delivery.ts:64`, via `icps.ts:153`); if FIGSY is running (`AUTO_OUTREACH_ENABLED=true` + active campaign) the *same lead* also charges the FIGSY pool $3 (`figsy.ts:907-921`, via `icps.ts:171-181`) → **$4/lead.** Deck promises $3 all-in. **Fix:** make `enrichAndDeliverLeads()` read `clients.plan` + charge the one correct pool; remove the deduction in `autoEnrollLead()`.
2. 🔴 **Bundle is structurally impossible.** Delivery is capped by the lead-gen balance only (`icps.ts:151-152`). A FIGSY-only client (FIGSY credits, 0 lead-gen) delivers **0 leads** → pays for FIGSY, gets nothing. **Fix:** same pool-aware delivery; also ensure trial/welcome grants top up the FIGSY pool for FIGSY-plan clients (`icps.ts:186-197`, `:515-524`).
3. 🔴 **Three price tables disagree (legal/chargeback risk).** FIGSY 20/40/100: canonical `constants/index.ts:27-31` = **$60/$120/$300**; Stripe `stripe.ts:26-30` charges **$60/$110/$250**; portal `billing/page.tsx:70-74` *shows* **$20/$40/$100**. Lead-gen 40/100 also drift (constants $40/$100 vs Stripe $38/$88). Client can be shown $100, charged $250 — next to a binding T&C checkbox. **Fix:** pick ONE table (recommend constants), reconcile `stripe.ts` + portal to it, recreate the real Stripe Price objects, and have the portal import prices from `@kind/shared` so it can't drift again.
4. 🟠 **Denise $99 → $39.** `stripe.ts:18,36` + `billing/page.tsx:100` say 99; deck/`$117-stack` says 39. Add Denise to `constants/index.ts` PRODUCTS; recreate the Stripe Price at $39. *(Already on the LAUNCH-PAD Mon-15 list.)*
5. 🟠 **"How credits work" panel lies.** `billing/page.tsx:303-306` says "Outreach sent — No credit used" (false: FIGSY enrol costs 1 credit) and never mentions the FIGSY pool. Rewrite to the real model.
6. 🟡 **FIGSY deduction race** (= REMAINING #9): read-modify-write `figsy.ts:909-912` → add an atomic `increment_figsy_credits` RPC mirroring `20260526_credit_race_condition_fix.sql`.
7. 🟠 **Multi-currency (new ask).** All prices hardcoded USD; one fixed Stripe Price ID per bundle (`stripe.ts:41-49`). Client can't pick USD/GBP/ZAR. Decide: Stripe multi-currency Prices + `clients.preferred_currency`. **Reconcile with the Flutterwave path** (`flutterwave.ts:146-160`) which already does ZAR/NGN/KES/GHS, or the two diverge. May be its own phase — do not let it block fixes 1–5.
8. 🟡 **Admin has no FIGSY visibility.** Admin client pages show `credit_balance` only, never `figsy_credits_remaining`; no FIGSY top-up. Re-verify `apps/admin/.../clients/[id]/page.tsx`, then surface + add top-up. **→ Full audit + roadmap: [ADMIN-BOOKKEEPER-AUDIT.md](./ADMIN-BOOKKEEPER-AUDIT.md)** (13 gaps identified; P0/P1/P2 prioritization; MVP scope for bookkeeper use).

**Smoke test (Stripe TEST mode, `AUTO_OUTREACH_ENABLED=false` first):** (a) every displayed price == checkout price == constants; (b) Lead-Gen client → lead-gen pool drops, FIGSY pool untouched, one row/lead; (c) FIGSY-only client (0 lead-gen) → **leads deliver**, FIGSY pool drops, lead-gen untouched, **no $1+$3 double row**; (d) buy a FIGSY bundle → charged == shown, pool increments, webhook replay idempotent (`stripe.ts:228-233`); (e) Denise → $39 not $99; (f) admin shows FIGSY balance. **No merge to `main` until all green + screenshots.**

---

## 🟡 REMAINING (prioritised — for the daily smoke-test loop, NOT yet done)
1. **`roadmap` page** — ~80 features hardcoded as "Live"/"New" to clients. **Needs your call on what's actually shipped** — I won't guess and mislabel. (Not in the V2 sidebar, so lower reach.) Recommend: gate it, or mark honest statuses.
2. **Leads page tab pills** (Pending Review / In FIGSY) count from the loaded 50-row page, not totals → undercount past page 1. Fix = return per-status counts from `/leads/stats`.
3. **Missing links still open:** campaign→its leads (needs a `campaign_id` filter on `/leads`), lead→its campaign, ICP→its leads.
4. **Analytics** conflates "hot reply" = "meeting booked" (3 different definitions of meetings across pages).
5. **Settings** writing-style / notification prefs are **localStorage-only** (say "Saved" but aren't persisted server-side).
6. **`denise` page ungated** while every sibling agent gates on subscription.
7. **developer vs mcp** pages show two conflicting MCP tool catalogs.
8. **assistant** integrations panel is hardcoded "Connect" buttons that do nothing.
9. **Credit-balance desync risk:** FIGSY per-enrollment deduction swallows errors (figsy.ts) — can drift `figsy_credits_remaining` from the ledger. → **Folded into 💳 BILLING CORRECTNESS #6 (atomic RPC).**
10. **`INCLUDED_LEADS=100`** hardcoded (usage) — should reflect the client's real plan. → tie to the new `clients.plan` flag (💳 BILLING CORRECTNESS §3).

---

## ST1 guidance (fresh signup)
A brand-new account won't hit the billing-period edge cases — focus on: signup→onboarding→ICP→leads sourced+scored→campaign+enroll→drip. Mark anything off and send it; I'll fix in the PM batch before ST2.

_All fixes committed to `main` (commits up to the latest). Branch + main in sync._
