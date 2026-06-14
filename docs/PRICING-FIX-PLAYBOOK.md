# Pricing & Billing Fix Playbook

> Status: **AUDIT COMPLETE — NOT YET IMPLEMENTED**
> Owner: Jacques · Target action day: **Tuesday**
> Rule: nothing merges to the launch branch until every box in §7 is ticked.

This document is the single source of truth for the billing fixes. It was written
after reading the actual code (not the deck, not memory). Every claim below cites a
file and line so it can be verified independently before a single character is changed.

---

## 0. TL;DR (read this first)

The deck is correct. The **code is not**. Three separate problems, in priority order:

1. **Three price tables disagree with each other.** The "LOCKED" constants file, the
   Stripe charge config, and the client portal display all show *different* prices for
   the same FIGSY bundles. A client can be shown `$100`, charged `$250`, while the
   "canonical" file says `$300`. This is a legal/chargeback problem, not just a typo.
2. **FIGSY clients are double-charged.** Every delivered lead charges the lead-gen pool
   ($1). If the client is running FIGSY, the *same lead* also charges the FIGSY pool
   ($3). Net `$4`/lead. The deck promises FIGSY `$3` is all-in (lead **included**).
3. **The bundle is structurally impossible today.** Lead delivery is capped by the
   *lead-gen* balance only. A FIGSY-only client (FIGSY credits, zero lead-gen credits)
   gets **zero leads delivered**. So "buy FIGSY, get leads + agent" cannot happen.

Plus three smaller items: Denise priced at `$99` (should be `$39`), the FIGSY credit
deduction has a race condition, and there's **no multi-currency support** (new ask).

---

## 1. The intended model (from you — this is the spec)

- **Lead Gen — $1/lead (standalone).** Client buys leads only. Charged from the
  lead-gen pool. Gets a *taster* of FIGSY (sample outreach), nothing more.
- **FIGSY — $3/lead (all-in bundle).** The $3 **includes** the lead discovery **and**
  the outreach + booking. Charged from the FIGSY pool. **Must not** also charge the
  lead-gen pool.
- **Agents are separate monthly subscriptions:** Milla $49, Vida $29, Denise **$39**.
- A lead is charged **once**, from **one** pool, decided by the client's plan.

---

## 2. Verified findings (with receipts)

### 2.1 — Three conflicting price tables  🔴 BLOCKER

| Bundle        | `constants/index.ts` (claims "LOCKED, flat") | `stripe.ts` (what Stripe actually charges) | `billing/page.tsx` (what the client SEES) |
|---------------|:--:|:--:|:--:|
| FIGSY 20      | **$60**  | $60  | **$20** ❌ |
| FIGSY 40      | **$120** | **$110** ❌ | **$40** ❌ |
| FIGSY 100     | **$300** | **$250** ❌ | **$100** ❌ |
| Lead Gen 20   | $20  | $20  | $20 ✅ |
| Lead Gen 40   | **$40**  | **$38** ❌ | $40 |
| Lead Gen 100  | **$100** | **$88** ❌ | $100 |

- Canonical: `packages/shared/src/constants/index.ts:15-31` (header line 4 literally says
  *"$3/credit flat — no volume discounts"*, yet Stripe gives volume discounts).
- Charged: `apps/api/src/lib/stripe.ts:20-31`.
- Displayed: `apps/portal/src/app/(dashboard)/dashboard/billing/page.tsx:65-74`.

**Decision required from you:** which table is the truth? Recommended: the constants
file ($1 flat, $3 flat, no volume discounts — matches the deck). Everything else gets
reconciled to it, and the real Stripe Price objects get re-created to match.

### 2.2 — FIGSY double-charge  🔴 BLOCKER

- `apps/api/src/routes/icps.ts:150-154` — on every run, `enrichAndDeliverLeads()` charges
  **$1 from the lead-gen pool** (`credit_balance`) per delivered lead.
- `apps/api/src/routes/icps.ts:171-181` — **if** `AUTO_OUTREACH_ENABLED === 'true'` **and**
  the client has an active `figsy_campaign`, each of those *same leads* is passed to
  `autoEnrollLead()`, which charges **$1 FIGSY credit ($3 value)** from
  `figsy_credits_remaining` (`apps/api/src/lib/figsy.ts:907-925`).
- Net for a FIGSY client: **$1 + $3 = $4 per lead.** Deck says $3, lead included.

### 2.3 — Bundle structurally impossible  🔴 BLOCKER

- `apps/api/src/routes/icps.ts:151-152` — `deliverNow` is capped by `credit_balance`
  (lead-gen pool **only**). A FIGSY-only client with `figsy_credits_remaining = 100` and
  `credit_balance = 0` delivers **0** leads. Delivery must become pool-aware.

### 2.4 — Denise price wrong  🟠

- `apps/api/src/lib/stripe.ts:36` → `priceUsd: 99` (should be **39**).
- `apps/api/src/lib/stripe.ts:18` comment → "$99/month" (should be **39**).
- `apps/portal/.../billing/page.tsx:100` → `price: 99` (should be **39**).
- Denise is **absent** from `packages/shared/src/constants/index.ts` PRODUCTS — add her.
- The real Stripe Price object behind `STRIPE_PRICE_DENISE_MONTHLY` must also be $39.

### 2.5 — "How credits work" panel is wrong  🟠

- `apps/portal/.../billing/page.tsx:303-306` tells the client:
  "Lead found — No credit used", "Outreach sent — **No credit used**",
  "Lead delivered — 1 credit consumed". The middle one is false: FIGSY outreach **does**
  cost 1 FIGSY credit (`figsy.ts:907-921`). The panel never mentions the FIGSY pool.

### 2.6 — FIGSY deduction has a race condition  🟡

- `apps/api/src/lib/figsy.ts:909-912` is a read-modify-write
  (`select … - 1 … update`). The lead-gen pool was already hardened with an atomic RPC
  (`increment_client_credits`, migration `supabase/migrations/20260526_credit_race_condition_fix.sql`).
  FIGSY never got the same treatment. Already flagged in `docs/MORNING-FIXLOG.md:44`.
  Two concurrent enrolls can both read the same balance and only decrement once.

### 2.7 — No multi-currency  🟠 (new requirement)

- Every price is hardcoded USD. Stripe checkout uses one fixed Price ID per bundle
  (`stripe.ts:41-49`, checkout at `:67-81`). Client cannot pick GBP / ZAR / etc.
- Webhook reads USD price from bundle config for partner commission
  (`stripe.ts:260-264`) — that path also assumes USD.

### 2.8 — Admin has no FIGSY visibility  🟡 (re-verify Tuesday)

- Prior audit: admin client pages show `credit_balance` only, never
  `figsy_credits_remaining`; no FIGSY top-up. Re-confirm against
  `apps/admin/src/app/clients/[id]/page.tsx` before fixing.

---

## 3. The core design decision (Point 1) — APPROVE BEFORE CODING

Recommended model: **one charge per lead, at delivery, from the client's active pool.**

- Determine the client's mode at delivery time: FIGSY mode = has active FIGSY campaign
  **and** FIGSY credits; otherwise Lead-Gen mode. (Cleaner long-term: an explicit
  `clients.billing_mode` column — decide Tuesday.)
- `enrichAndDeliverLeads()` becomes **pool-aware**: it caps delivery by the *active*
  pool's balance and deducts from *that* pool only (atomic RPC for both pools).
- `autoEnrollLead()` **stops charging entirely.** The FIGSY credit was already spent at
  delivery; enrollment is the bundled outreach the client already paid for. This is what
  removes the double-charge *and* fixes the cap bug in one move.

Why this shape: it makes "1 lead = 1 charge = 1 pool" true everywhere, matches the deck,
and keeps the existing two-pool schema. **Do not start coding §4.B until you sign off on
this paragraph.**

---

## 4. Execution plan (Tuesday) — ordered, each step independently verifiable

Work on branch `claude/cool-carson-mfebyb`. Commit per step. Do **not** merge mid-way.

### A. Reconcile the price tables (do this FIRST — everything depends on it)
1. Confirm the canonical numbers in `packages/shared/src/constants/index.ts` are the
   truth (FIGSY $60/$120/$300, Lead Gen $20/$40/$100, flat rate). Adjust if you want
   volume discounts — but pick ONE answer.
2. Update `apps/api/src/lib/stripe.ts:20-31` to match exactly. Fix the comments at
   `:7-13` and `:15-18`.
3. Update `apps/portal/.../billing/page.tsx:65-74` to match exactly.
4. **Recreate the real Stripe Price objects** in the Stripe dashboard so the env vars
   (`STRIPE_PRICE_FIGSY_40`, etc.) point at Prices whose amounts equal the table.
   *(Stripe Prices are immutable — you create new ones and swap the env var.)*
5. Single source of truth: make the portal import bundle prices from `@kind/shared`
   instead of hardcoding, so this can never drift again.

### B. Kill the double-charge + fix the bundle (the big one — needs §3 sign-off)
6. Make `enrichAndDeliverLeads()` pool-aware (param or detected mode): cap by active
   pool, deduct from active pool via atomic RPC. (`lead-delivery.ts:17-78`,
   `icps.ts:150-154`.)
7. Remove the credit deduction from `autoEnrollLead()` (`figsy.ts:907-925`) — enrollment
   no longer charges; the delivery charge already covered it.
8. Add an atomic `increment_figsy_credits` RPC (mirror the lead-gen one) for the FIGSY
   pool, used by delivery. New migration alongside `20260526_credit_race_condition_fix.sql`.
9. Trace the trial/welcome-bonus grants (`icps.ts:186-197`, `:515-524`) — make sure a
   FIGSY-mode client is granted FIGSY credits, not just lead-gen credits, or the bundle
   still can't run.

### C. Denise → $39
10. `stripe.ts:36` `priceUsd: 99 → 39`; fix comment `:18`. Add Denise to
    `constants/index.ts` PRODUCTS. `billing/page.tsx:100` `price: 99 → 39`. Recreate the
    Stripe Price behind `STRIPE_PRICE_DENISE_MONTHLY` at $39.

### D. "How credits work" panel honesty
11. Rewrite `billing/page.tsx:303-306` to state the real model: Lead delivered = 1
    lead-gen credit; FIGSY lead = 1 FIGSY credit (lead + outreach bundled, no separate
    lead-gen charge).

### E. FIGSY race condition
12. Covered by step 8 (atomic RPC). Remove read-modify-write at `figsy.ts:909-912`.

### F. Multi-currency (scope on Tuesday — may be its own phase)
13. Decide mechanism: Stripe Multi-Currency Prices (one Price, many currencies) vs.
    per-currency Price IDs. Recommended: Stripe's built-in multi-currency Prices +
    `currency` on the checkout session.
14. Add a currency selector to the portal; persist `clients.preferred_currency`.
15. Display prices in the chosen currency (needs a presentation rate or Stripe's
    localized amounts). Fix the partner-commission USD assumption (`stripe.ts:260-264`).
16. Mirror in the Flutterwave path (`apps/api/src/routes/flutterwave.ts`) which already
    handles African currencies — reconcile the two so they don't double up.

### G. Admin FIGSY visibility
17. Surface `figsy_credits_remaining` on admin client pages + a top-up action.
    Re-verify the gap first (`apps/admin/src/app/clients/[id]/page.tsx`).

---

## 5. Smoke test (run end-to-end before merge)

Keep `AUTO_OUTREACH_ENABLED=false` for the first pass (no real emails). Use a test client.

1. **Price parity:** load `/dashboard/billing`. Every displayed price == Stripe Checkout
   price == constants. Screenshot all three bundles + all three agents.
2. **Lead-Gen path:** client with lead-gen credits only, no FIGSY campaign. Run an ICP.
   Assert: `credit_balance` drops by #delivered; `figsy_credits_remaining` unchanged;
   exactly one `usage` row per lead in `credit_transactions`.
3. **FIGSY path:** client with FIGSY credits, active campaign, **zero** lead-gen credits.
   Run an ICP. Assert: leads **are** delivered (bundle works); `figsy_credits_remaining`
   drops by #delivered; `credit_balance` unchanged; **no $1 + $3 double row**.
4. **Purchase path:** buy a FIGSY bundle in Stripe test mode. Assert the charged amount
   equals the displayed amount and `figsy_credits_remaining` increments correctly
   (`stripe.ts:240-248`); replay the webhook → idempotent, no double credit (`:228-233`).
5. **Denise:** subscribe → charged $39, not $99.
6. **Currency (if F shipped):** repeat 1 & 4 in GBP and ZAR.
7. **Admin:** open the test client → FIGSY balance visible and correct.

---

## 6. Risk register

- **Money path.** Steps B and A change what customers are charged. Test in Stripe **test
  mode** only until §5 passes. Never point at live keys mid-change.
- **Stripe Prices are immutable.** You create new ones and swap env vars; you do not edit
  amounts in place. Keep the old Price IDs until the new ones are verified.
- **Existing balances.** If any real client already holds mis-priced credits, decide
  whether to honor or adjust *before* flipping prices.
- **Two payment providers.** Stripe **and** Flutterwave both credit the pools. Any pool
  logic change must be mirrored in `flutterwave.ts:146-160` or the two will diverge.

---

## 7. Merge checklist (all must be ✅)

- [ ] §3 design signed off by Jacques
- [ ] One canonical price table; constants == stripe.ts == portal == real Stripe Prices
- [ ] Double-charge gone (smoke test 3 shows single pool, single row)
- [ ] FIGSY-only client receives leads (bundle works)
- [ ] Denise = $39 everywhere incl. real Stripe Price
- [ ] "How credits work" panel matches reality
- [ ] FIGSY deduction atomic (no read-modify-write)
- [ ] Multi-currency: shipped & tested, OR explicitly deferred to a named follow-up
- [ ] Admin shows FIGSY credits
- [ ] Full §5 smoke test green, screenshots attached
- [ ] Flutterwave path reconciled with any pool changes
