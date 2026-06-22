# 💳 Billing-correctness smoke test (items 166–171 + 168 code)

> ✅ **COMPLETED / HISTORICAL (22 Jun).** Items **166–171 are LIVE in production** (merged #580 + migration run 16 Jun; one-charge-one-wallet, separate pools, Denise $39, atomic credits). This was the test record for that build — kept for history. `Last-checked: 22 Jun 2026`.

**Branch:** `claude/billing-correctness-166-173` · *(historical — merged)*.
**Migration:** `supabase/migrations/20260616_billing_correctness.sql` — run on **STAGING first, then PRODUCTION** (confirm the Supabase project name before each run, per the process lock).

## What changed (the model)
**One lead = one charge = one wallet**, keyed off the new `clients.plan` flag:
- **`lead_gen` plan** → charged **once at delivery**, $1 from `credit_balance`.
- **`figsy` plan** → **NOT charged at delivery**; charged **once at enrollment**, $3 (1 FIGSY credit) from `figsy_credits_remaining`, via the atomic `increment_figsy_credits` RPC.

## Pre-checks (after migration)
- [ ] `clients.plan` column exists, default `lead_gen`, CHECK in (`lead_gen`,`figsy`).
- [ ] Backfill correct: clients with a FIGSY campaign or FIGSY credits = `figsy`; others = `lead_gen`.
- [ ] `increment_figsy_credits(uuid,int)` RPC exists, `service_role` can execute, clamps at 0.

## Test cases
1. **Lead-gen client — no double-charge (166).** Run ICP → N leads delivered. **Expect:** `credit_balance` −N · `figsy_credits_remaining` unchanged · ledger rows `plan='lead_gen'`.
2. **FIGSY client — no double-charge (166, the headline).** Active campaign + `AUTO_OUTREACH_ENABLED=true`. Run ICP → N leads delivered + enrolled. **Expect:** `credit_balance` **unchanged** · `figsy_credits_remaining` −N · ledger rows `plan='figsy'`. **Per lead = 1 FIGSY credit ($3), NOT $4.**
3. **FIGSY-only client can deliver (167).** Client with `credit_balance=0` but `figsy_credits_remaining>0`. Run ICP. **Expect:** leads **deliver** (capped by FIGSY pool) — previously delivered 0.
4. **FIGSY pool exhausted — no free outreach.** `figsy_credits_remaining=0`. **Expect:** `autoEnrollLead` skips (logs "no FIGSY credits"), no enrollment, no send.
5. **Atomic FIGSY deduct (170).** Concurrent/rapid enrollments. **Expect:** `figsy_credits_remaining` and ledger count stay in lockstep (no desync), never negative.
6. **Daily drip pool-aware (167).** `/internal/leads/drip` for a FIGSY client caps by `figsy_credits_remaining`, for a lead-gen client by `credit_balance`.
7. **Prices reconciled (168).** Portal billing shows FIGSY **$60 / $120 / $300** and Lead Gen **$20 / $40 / $100**; `STRIPE_BUNDLES` (api) derives from `@kind/shared`. Billing panel reads **"FIGSY outreach — 1 FIGSY credit"** (no false "Outreach sent — No credit used") (171).

## 🧍 Founder step (168, gates verification)
- [ ] **Recreate the 6 Stripe Price objects** at the locked values: Lead Gen `$20/$40/$100`, FIGSY `$60/$120/$300`; set the env vars `STRIPE_PRICE_LEADGEN_20/40/100` + `STRIPE_PRICE_FIGSY_20/40/100`. Confirm checkout charges the locked price.

## Not in this PR (fast-follow)
- **173 — Admin FIGSY visibility + top-up.** Admin client view shows `credit_balance` only; surfacing `figsy_credits_remaining` + a top-up control needs the admin credits endpoint extended. Tracked, separate change.
- **172 — Multi-currency.** Own phase (does not block 166–171).

## Verified so far (in-sandbox)
- ✅ `@kind/api` type-check passes · ✅ `@kind/portal` type-check passes (TS 5.9.3).
- ⏳ Runtime/DB behaviour above must be run on staging — typecheck ≠ verified (RULEBOOK 1.6).
