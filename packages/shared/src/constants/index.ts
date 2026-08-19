// ─────────────────────────────────────────────────────────────────────────────
// K.I.N.D Pricing — LOCKED. Never change without authorisation.
// Lead Gen:   $1/credit flat (no volume discounts — annual plans only)
// FIGSY:      $3/outreach-credit flat (no volume discounts — annual plans only)
// Milla VA:   $49/month flat   ⚠️ NOT SOLD — see #414 below; kept as the historic ladder only
// Vida Chat:  $29/month flat   ⚠️ NOT SOLD
// Bundle:     $69/month (Milla + Vida)   ⚠️ NOT SOLD
// ─────────────────────────────────────────────────────────────────────────────
//
// ⚠️ #414 — WHAT IS CURRENTLY SOLD, AND WHAT THE BLOCKS BELOW ACTUALLY ARE.
//
// **The model, founder-locked 24–25 Jul (ONE WALLET):** one dollar wallet per client · the
// first purchase is **the onboarding pack with `PACK_LEADS` approved leads included** — the
// price is `PACK_PRICE_USD`, **$299 since 3 Aug** (this comment said $99 until 6 Aug, which
// is the retired figure and exactly the drift R11 exists to stop) — then a flat
// `LEAD_PRICE_USD` per approved lead · reviewing is FREE (leads arrive masked; only the
// client's 👍 ever spends) · no time limit on paid leads · a dead email is never charged.
//
// The `figsy.description` below read *"FIGSY handles replies, objections, follow-ups and
// meeting booking"* — describing self-serve automation we do not sell, on a per-credit model
// we no longer run. It is corrected in place.
//
// ── AND THE CORRECTION THAT MATTERS MORE THAN THE COPY ───────────────────────────────────
//
// #414 is filed as *"the last thing a client reads before their card is charged"*. **That is
// not what this string is.** Verified 29 Jul: **nothing in this repo renders `.description`
// from `PRICING` or `PRODUCTS`** — the only importers are `lib/stripe.ts`, which reads
// `.bundles` (numbers only), and `admin/cockpit/page.tsx`, whose import is unused.
//
// What a client actually reads at checkout comes from the **Stripe DASHBOARD product**
// attached to `price: params.priceId`; the one inline description we control says only
// `product_data: { name: 'K.I.N.D wallet top-up' }`. **So no code change here can fix the
// checkout copy — that is a founder edit in the Stripe dashboard.** Fixing this file removes
// a false claim from the codebase; it does not, on its own, close #414.

export const PRICING = {
  // ✅ UN-RETIRED (#420/#394, 9 Jul) — the $1 tier is BACK as the REVEAL tier of the
  // per-qualified-lead model: leads arrive masked; $1 (credit_balance) unmasks the
  // email (try_charge_reveal_credit); +$3 FIGSY work = $4 fully-worked. Bundles are
  // prepaid reveal packs. (Was retired by #284 when the site sold FIGSY-only.)
  // trial_credits/trial_days below are LEGACY (#425/#431 — signup now grants a
  // 20-reveal + 5-work welcome mix with no expiry; no trials in the model).
  lead_gen: {
    name: 'K.I.N.D AI — Lead-Gen (the database)',
    // #414 — WAS: "$1 reveals a lead". That was the retired two-tier ladder ($1 reveal + $3
    // work), superseded by ONE WALLET / flat $4 on 24 Jul. Quoting a price we no longer
    // charge is the same defect as the FIGSY line, one field up.
    description: 'Net-new, ICP-matched, verified B2B contacts — suppression-checked, CRM-deduped and scored 0-100. You see every lead masked and free; approving one is what costs $4.',
    credit_rate_usd: 1.00,
    bundles: [
      { credits: 20,  price_usd: 20  },
      { credits: 40,  price_usd: 40  },
      { credits: 100, price_usd: 100 },
    ],
    trial_credits: 20,
    trial_days: 14,
  },
  figsy: {
    // FIGSY is the ENGINE UNDER Milla&Vida, not a product you buy (pivot locked 22 Jul).
    // The name is kept because `STRIPE_PRICE_FIGSY_*` env vars and existing Stripe Price
    // objects key off this block — renaming it here would not rename them, and the two
    // drifting apart is worse than an out-of-date label.
    name: 'FIGSY — AI Outreach SDR',
    // #414 — WAS: "FIGSY handles replies, objections, follow-ups and meeting booking."
    // We do not sell self-serve automation that handles objections. We run the outbound as a
    // managed service and the client approves each lead. One sentence, only what is true.
    // ⚠️ "Reviewing is free" IS NOT OPTIONAL IN THIS SENTENCE, and the gate is what noticed.
    // The 3-Aug rewrite to the $299 offer dropped it, and `pricing-copy.test.ts` failed with
    // the reason attached: it is "the single most misread thing about the model" — leads
    // arrive masked and cost nothing to look at, so a client who believes browsing costs
    // money does not browse, and nothing downstream ever happens. Kept, and the founder's
    // new wording kept around it.
    description: 'We run your outbound, fully onboarded: we find and score your buyers, you approve the ones you want, and we do the outreach — sending from day one on your own warmed inbox, which is yours to keep. Reviewing is free — $299 includes your first 100 approved leads, then $4 per approved lead.',
    credit_rate_usd: 3.00,
    bundles: [
      { credits: 20,  price_usd: 60  },
      { credits: 40,  price_usd: 120 },
      { credits: 100, price_usd: 300 },
    ],
  },
} as const

// ⚠️ LEGACY — NONE OF THESE FOUR PRODUCTS IS CURRENTLY SOLD. Retired by the 22-Jul pivot,
// and the block below still describes the self-serve SaaS it replaced. What these two names
// actually are now:
//
//   • **Milla** is the CLIENT PORTAL — the only console a client logs into (`apps/portal`,
//     the `(milla)` route group). It is not a $49/mo "AI Virtual Assistant" you can buy; it
//     is the surface the thing we DO sell is delivered through.
//   • **Vida** is OUR OPERATOR CONSOLE — `apps/admin`, the screen the founder runs the
//     business from. It is not a $29/mo website chatbot, and it is not sold to anyone.
//   • **Denise** ($39) and the **bundle** ($69) are likewise not on sale. Denise's code
//     exists and is demoable; it returns as a per-lead layer in M4, not a subscription.
//
// What IS sold (price re-locked 3 Aug): the managed outbound service, fully onboarded — $299
// includes the first 100 approved leads, then $4 per approved lead. See `PRICING` above.
//
// THE STRIPE PRICE OBJECTS BEHIND THESE ARE DORMANT, NOT GONE. `lib/stripe.ts` exposes
// `STRIPE_SUBSCRIPTIONS` keyed milla/vida/denise against `STRIPE_PRICE_*_MONTHLY` env vars,
// and the `/stripe/subscribe` route and the subscription webhook still work end to end. So a
// live Price ID in the Stripe dashboard could still take a payment for a product we do not
// sell. Retiring them is a Stripe-dashboard action, not a code edit.
//
// ⚠️ AND A CORRECTION TO THIS FILE'S OWN #414 NOTE ABOVE, verified 29 Jul: that note claims
// "the only importers are `lib/stripe.ts` … and `admin/cockpit/page.tsx`". **Wrong on both
// counts.** `lib/stripe.ts` imports `PRICING` only and never touches `PRODUCTS` —
// `STRIPE_SUBSCRIPTIONS` is an independent literal that hardcodes its own env-var names and
// duplicates these prices (49/29/39), so the two can drift and nothing would notice. And
// `PRODUCTS` has FOUR importers, not one: `admin/cockpit`, `(dashboard)/chatbot` and
// `(dashboard)/assistant` (all three dead imports, two of them removed in this PR) plus
// `(dashboard)/marketplace`, which genuinely RENDERS `$49/mo`, `$29/mo` and `$39/mo` on a
// page selling all three as subscriptions. No client can reach it — `middleware.ts` redirects
// every signed-in client out of `(dashboard)` to `/milla` — which is why this is stale copy
// rather than a live overcharge. The narrower claim the note makes about `.description` does
// hold: nothing renders that field.
//
// KEPT, NOT DELETED — CORE-MAP rule 3 is founder-locked ("nothing gets deleted"). Marked so
// nobody reads $49/mo off this block and believes we sell it.
export const PRODUCTS = {
  virtual_assistant: {
    name: 'Milla — AI Virtual Assistant',
    description: 'Internal AI assistant trained on your documents and tone. Handles Q&A, drafts, briefings.',
    price_usd: 49,
    billing: 'monthly' as const,
  },
  chatbot: {
    name: 'Vida — AI Chatbot Agent',
    description: 'Website chatbot that qualifies leads 24/7 and alerts you when someone is hot.',
    price_usd: 29,
    billing: 'monthly' as const,
  },
  // Denise — The Closer. Price LOCKED at $39/mo (founder, 3 Jul — resolving the
  // $39-portal vs $99-website conflict, #301). This is now the single source of
  // truth; the portal imports it. (The static website HTML must be synced by hand.)
  denise: {
    name: 'Denise — The Closer',
    description: 'Warm follow-up on quiet prospects, confirms meetings, drafts proposals.',
    price_usd: 39,
    billing: 'monthly' as const,
  },
  bundle: {
    name: 'Milla + Vida Bundle',
    description: 'Both AI team members at a discount.',
    price_usd: 69,
    billing: 'monthly' as const,
    saves_usd: 9,
  },
} as const

export const SUPPORTED_COUNTRIES = [
  'South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Egypt',
  'Rwanda', 'Tanzania', 'Uganda', 'Senegal', "Cote d'Ivoire",
] as const

// ⚠️ LEGACY — THERE IS NO TRIAL. Retired with the self-serve model (#425/#431): signup grants
// a welcome mix with no expiry, and the money model is $99-then-$4. Verified 29 Jul that
// `TRIAL_DAYS`, `trial_days` and `trial_credits` are read by NOTHING outside this file.
// Kept rather than deleted (CORE-MAP rule 3, founder-locked) and marked so nobody wires a
// 14-day clock back in believing it is current.
export const TRIAL_DAYS = 14

export const SCORE_THRESHOLDS = {
  high:   80,
  medium: 50,
} as const

// ── THE MONEY MODEL — ONE SOURCE OF TRUTH, READABLE FROM BOTH SIDES ─────────────────────────
//
// Founder-locked 3 Aug: the first purchase is **$299 = the fully-onboarded pack with 100
// approved leads included**, then a flat **$4 per approved lead**. Reviewing is free.
//
// ⚠️ THE PRICE MOVED 99 → 299 ON 3 AUG, AND THE REASON IS THE WHOLE POINT. At $99 the founder
// funded roughly **$78 of every engine-acquired client** and carried the churn bet personally:
// acquiring one costs ~$143 (Apollo $65 + verification $8 + AI writing $70) and month-one
// setup costs ~$134 (a pre-warmed Smartlead inbox at $45/MONTH so they send on day one, plus
// 200 records sourced $56, their own domain $12/yr, their own Google mailbox $7/mo, AI $7 and
// Stripe) — against $99 in. **A client who quit after month one cost him $78 in cash.** At
// $299 the client funds their own acquisition, their own setup and the founder's onboarding
// time: day-one position is **+$18.50 even after full acquisition cost**, a quitter costs
// nothing, and a stayer is profitable from the first day rather than the second month.
//
// ⚠️ DISCOUNTS ARE FOUNDER DISCRETION AND LIVE ONLY IN STRIPE. $299 is the list price. The
// founder may discount any individual client by hand in the Stripe dashboard. **No discount
// logic belongs in code, on the website, or in the product** — a discount that ships as a
// constant is a price change nobody decided.
//
// ⚠️ WHAT DID NOT MOVE: `PACK_LEADS` is still 100 and `LEAD_PRICE_USD` is still 4. Only the
// door price changed. Anything that reads "100 included" or "$4 a lead" is still correct.
//
// ⚠️ WHY THEY MOVED HERE (#563, 29 Jul). These three numbers used to live ONLY in
// `apps/api/src/lib/onboarding-pack.ts` — which the portal cannot import, because it depends on
// `@kind/shared` and nothing else. So every client-facing sentence about the money was
// HAND-TYPED, and that is exactly how the $99 starter card came to read *"Fund your wallet.
// Each approved lead is a flat $4"* — a sentence with two false halves, on the screen a client
// reads immediately before paying: after #562 the $99 does not fund the wallet (it buys the
// pack), and the first 100 approvals are not $4 (they are included).
//
// `onboarding-pack.ts` now RE-EXPORTS these rather than declaring its own, so the API and the
// client can never disagree about the price. A copy in two places is how the last lie started.
//
// Cost basis behind $299 (docs/run-costs-and-cashflow.md §1, re-derived 3 Aug against
// confirmed vendor prices): pre-warmed Smartlead inbox $45/mo so they send on day one · 200
// records sourced at $0.28 = $56 · their own branded domain $12/yr · their own Google mailbox
// $7/mo · working the 100 they approve ≈ $7 · Stripe $10.50 ≈ **$134**, leaving ~$165 against
// the ~$143 it cost to find them.
//
// ⚠️ THE OLD BASIS IS KEPT, NOT DELETED (CORE-MAP rule 3): "$56 · working ≈ $6 · Stripe $3.17
// · first month of their inbox $4.50 ≈ $70, leaving ~$29 on the $99." Its **$4.50 inbox line
// was the error** — it assumed a warmed inbox could be had for $4.50/month. Confirmed 3 Aug
// that a pre-warmed Smartlead mailbox is **$45/month**, ten times that, which is why the $99
// never actually covered a client and why the transition onto their own $7 Google box at
// ~day 21–29 exists: it caps the $45 to month one.

/** Approvals included in the first purchase. */
export const PACK_LEADS = 100
/** What the pack costs the client, in USD. Founder-locked 3 Aug (was 99, 24–25 Jul). */
export const PACK_PRICE_USD = 299
/** Flat price per approved lead once the pack is used up, in USD. */
export const LEAD_PRICE_USD = 4

/**
 * PARTNER COMMISSION — 25% of paid LEAD SALES. Founder-locked 19 Aug 2026.
 *
 * His words, verbatim, because a paraphrase is a guess wearing a lock's authority:
 *
 *   • *"no 25% does not include the $299 nor the 100 leads we give. its everything after
 *      this or above this"*
 *   • *"lifetime. if they looking after their client its theirs."*
 *   • *"she earns on leads purchased not when they top up. because our calulators on leads
 *      not money in. we earn money when they buy leads. so thye need to be managing their
 *      customers to buy leads."*
 *
 * So the base is the $4 approval charge, GROSS — before card fees — and NOTHING else:
 * not the $299 pack, not the 100 approvals it includes, not a wallet top-up, not a
 * subscription renewal. Money arriving is not the event; a lead being bought is.
 *
 * ⚠️ THIS REPLACED THE OPPOSITE BEHAVIOUR. Until 19 Aug the commission fired on every
 * Stripe payment — the pack paid 20% and lead approvals paid nothing, the exact inverse of
 * the ruling. No commission row had ever been written (no client has ever paid), so nothing
 * needed unwinding; the three Stripe triggers were removed and one lead-sale trigger added.
 *
 * The rate is flat and lifetime, so it is a constant here rather than a per-seat column.
 * `partners.retain_rate` (R40's 8%/5%) still exists and is untouched — it governs the
 * legacy MRR model in `comp-engine.ts`, which nothing in the current money model calls.
 */
export const PARTNER_COMMISSION_PCT = 25

/** What one approved lead pays a partner, in USD. Derived — never type $1.00 anywhere. */
export const PARTNER_COMMISSION_PER_LEAD_USD = (LEAD_PRICE_USD * PARTNER_COMMISSION_PCT) / 100

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENCE LENGTH — ONE NUMBER, FOUR APPS
// ─────────────────────────────────────────────────────────────────────────────
//
// Founder-locked **7** (6 Aug, register R3/R10 — the earlier #426 asked for 10 and was
// superseded). It lives HERE rather than in `apps/api` because the admin app cannot import
// from the API (#563/#614) and the portal should not either — and the audit that produced
// this constant found the cost of that gap: **four different limits were live at once.**
//
//   • `sequence-quality.ts` blocked ACTIVATION at 7
//   • `operator.ts` let an operator SAVE 10 — so you could build an 8-step sequence, save it
//     happily, and only meet the wall when you pressed activate (#626's shape exactly)
//   • the Vida editor and the client's own editor each hard-coded a bare `7`, correct today
//     and silently wrong the day this number moves
//   • the client-facing Sequences page — linked in BOTH portal sidebars — capped at 3 and
//     told the client *"(max 3)"*
//
// while the website promised **10** on five pages. A client could read 10, be shown 3, and
// have 7 enforced. Nothing agreed with anything.
//
// ⚠️ IMPORT IT. Never re-type the digit — a literal is how this drifted the first time, and
// `website-step-claims.test.ts` now fails the build on a step-count claim that is not this
// number.
/** The most email steps a sequence may contain. Founder-locked 6 Aug (R3). */
export const MAX_SEQUENCE_STEPS = 7
