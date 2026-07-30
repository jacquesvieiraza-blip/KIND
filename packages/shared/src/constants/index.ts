// ─────────────────────────────────────────────────────────────────────────────
// K.I.N.D Pricing — LOCKED. Never change without authorisation.
// Lead Gen:   $1/credit flat (no volume discounts — annual plans only)
// FIGSY:      $3/outreach-credit flat (no volume discounts — annual plans only)
// Milla VA:   $49/month flat
// Vida Chat:  $29/month flat
// Bundle:     $69/month (Milla + Vida)
// ─────────────────────────────────────────────────────────────────────────────
//
// ⚠️ #414 — WHAT IS CURRENTLY SOLD, AND WHAT THE BLOCKS BELOW ACTUALLY ARE.
//
// **The model, founder-locked 24–25 Jul (ONE WALLET):** one dollar wallet per client · the
// first purchase is **$99 = the onboarding pack with 100 approved leads included**, then a
// flat **$4 per approved lead** · reviewing is FREE (leads arrive masked; only the client's
// 👍 ever spends) · no time limit on paid leads · a dead email is never charged.
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
    description: 'We run your outbound: we find and score your buyers, you approve the ones you want, and we do the outreach. Reviewing is free — $99 includes your first 100 approved leads, then $4 per approved lead.',
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
// What IS sold (locked 24 Jul, ONE WALLET): the managed outbound service — $99 includes the
// first 100 approved leads, then $4 per approved lead. See `PRICING` above.
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
