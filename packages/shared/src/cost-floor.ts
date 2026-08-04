// #614 — WHAT THIS BUSINESS COSTS TO RUN, AS CODE RATHER THAN AS TYPED-IN NUMBERS.
//
// ⚠️ THE DEFECT. `cockpit/page.tsx` computed the founder's margin from two literals typed into
// the page — `estCostPerClient = 95` and `estStack = 690` — and `revenue/page.tsx` rendered a
// four-row "cost stack" table of hardcoded strings (`'~$138'`, `'~$220'`, `'~$180'`, `'~$150'`).
// Both were honestly labelled *"estimate until Xero connects"*, and both were **wrong**: $690
// against a real floor nearer $350, and that $138 infra line is the very number the founder
// caught on 3 Aug as overstated by $87/mo.
//
// The cost model that IS maintained lives in `docs/CASHFLOW-LAB.html`, where every line is an
// editable box the founder has corrected against real invoices. The console ignored it. So the
// doc's numbers live here, the pages read these, and a **drift test parses the doc** and fails
// if the two disagree. Two places holding the same number is a bug; two places where one is
// provably derived from the other is a contract.
//
// ⚠️ IT LIVES IN `@kind/shared`, NOT IN `apps/api`, and that is load-bearing: the ADMIN app
// cannot import from `apps/api` (separate package), which is exactly how #563 happened — every
// client-facing money sentence was hand-typed because the constants were unreachable, and each
// one became a lie the moment the model changed.
//
// ── EVERY LINE CARRIES HOW WE KNOW IT ────────────────────────────────────────────────────
//
// `verified` = read off a real invoice or a code constant. `estimate` = plausible, unconfirmed.
// `unverified-secondary` = researched 4 Aug from search results because **gov.uk, ICO,
// Companies House, Stripe, Xero and Wise were all unreachable** from that session (network
// policy 403). That tag is not decoration: the $138 line was tagged *verified* while being
// wrong by $87/mo for weeks, and **a confident label on an unread number is worse than no
// number** — it is what stopped everyone who read it afterwards from re-checking. Nothing here
// may be re-tagged `verified` without somebody opening the actual page.

export type CostBasis = 'verified' | 'estimate' | 'unverified-secondary'

export type CostLine = {
  /** Matches the input id in docs/CASHFLOW-LAB.html — the drift test joins on this. */
  id: string
  label: string
  usdPerMonth: number
  basis: CostBasis
  /** Why this number is what it is, in one sentence. */
  note: string
}

/** What runs whether we have one client or a hundred — the platform. */
export const PLATFORM_LINES: CostLine[] = [
  { id: 'f_servers', label: 'Servers + database', usdPerMonth: 51, basis: 'verified',
    note: 'Railway $15.59 + Supabase $35, off the actual bills 3 Aug. This line read $138 and was tagged verified — overstated by $87/mo. Railway bills by usage, so this is the idle rate.' },
  { id: 'f_apollo', label: 'Apollo — our hunting', usdPerMonth: 0, basis: 'estimate',
    note: 'Drops to the free plan 3 Sep; August is paid, so 2,500 credits are already bought.' },
  { id: 'f_smartlead', label: 'Smartlead — main account', usdPerMonth: 0, basis: 'estimate',
    note: 'Deferred until a client is in the works — it exists to send FOR clients. Returns at ~$94.' },
  { id: 'f_hunter', label: 'Hunter — email fallback', usdPerMonth: 0, basis: 'estimate',
    note: 'Idle = $0. Re-activates at ~$34 the month a sourcing run happens.' },
  { id: 'f_claude', label: 'Anthropic — Claude API', usdPerMonth: 10, basis: 'estimate',
    note: 'Runtime scoring + writing at our own volume; most AI cost is counted per-lead.' },
  { id: 'f_resend', label: 'Resend', usdPerMonth: 0, basis: 'estimate',
    note: 'Free tier from 3 Aug. A volume ceiling, not a free lunch — ~3,000/mo and ~100/day.' },
  { id: 'f_instantly', label: 'Instantly — Growth (warmup only)', usdPerMonth: 37, basis: 'estimate',
    note: 'Warmup is the one part of the bundle we do not already own; our own engine sends.' },
  { id: 'f_sendinfra', label: 'Google Workspace — 4 sending mailboxes', usdPerMonth: 28, basis: 'verified',
    note: 'Bought 3 Aug. Must be Google-direct — vendor mailboxes expose no SMTP credentials.' },
  { id: 'f_zoho', label: 'Zoho Mail — the human mailbox', usdPerMonth: 3, basis: 'estimate', note: 'hello@get-kind.com, the address a human replies from.' },
  { id: 'f_domains', label: 'Domains', usdPerMonth: 5, basis: 'estimate', note: 'Four domains divided by twelve.' },
  { id: 'f_failover', label: 'Failover — Render standby + CF load balancer', usdPerMonth: 12, basis: 'estimate',
    note: 'Being cancelled — insurance on an empty house. DNS must be repointed off the load balancer FIRST or the live product goes down.' },
]

/**
 * What the COMPANY costs, as opposed to the platform. Added 4 Aug after the founder asked
 * *"what other expenses should i be aware of… UK company tax"* and the honest answer was that
 * none of this had ever been modelled anywhere in the repo — no VAT, no corporation tax, no
 * Companies House, no ICO fee, no accountant, no insurance.
 *
 * ⚠️ EVERY LINE HERE IS `unverified-secondary`. See the file header.
 */
export const COMPANY_LINES: CostLine[] = [
  { id: 'c_ico', label: 'ICO data protection fee', usdPerMonth: 5, basis: 'unverified-secondary',
    note: '~£47/yr Tier 1 by direct debit. LEGALLY REQUIRED before processing prospect data — a named person at a company is personal data even in B2B. A pre-launch item, not a post-revenue one.' },
  { id: 'c_ch', label: 'Companies House — confirmation statement', usdPerMonth: 6, basis: 'unverified-secondary',
    note: '~£50/yr digital (rose from £34 on 1 Feb 2026). Filing accounts is free; filing them LATE is an automatic £150–£1,500 and doubles two years running.' },
  { id: 'c_acct', label: 'Accountant', usdPerMonth: 100, basis: 'unverified-secondary',
    note: '~£60–£90/mo compliance-only. Needed at the first year-end whether or not money came in.' },
  { id: 'c_soft', label: 'Accounting software', usdPerMonth: 70, basis: 'unverified-secondary',
    note: 'Xero Comprehensive ~£50/mo (£55 from 1 Sept) — the cheap tiers cannot do multi-currency, and we bill USD into a GBP account. Check FreeAgent first: free for life with a NatWest/RBS/Mettle account, a £660/yr question.' },
  { id: 'c_ins', label: 'Professional indemnity insurance', usdPerMonth: 25, basis: 'unverified-secondary',
    note: '~£150–£300/yr for £1m cover. Not legally required, but B2B clients routinely demand it in contract.' },
]

export const ALL_FIXED_LINES: CostLine[] = [...PLATFORM_LINES, ...COMPANY_LINES]

export const PLATFORM_FLOOR_USD = PLATFORM_LINES.reduce((s, l) => s + l.usdPerMonth, 0)
export const COMPANY_FLOOR_USD = COMPANY_LINES.reduce((s, l) => s + l.usdPerMonth, 0)
export const TOTAL_FLOOR_USD = PLATFORM_FLOOR_USD + COMPANY_FLOOR_USD

/** Per-client, per-month delivery cost — the client's own sending mailbox and domain. */
export const PER_CLIENT_MONTHLY_USD = 8

/**
 * All-in card cost as a fraction of every dollar in.
 *
 * ⚠️ 5%, NOT 3.5%, AND THE DIFFERENCE IS FX. We charge in USD (`lib/stripe.ts:144`) and bank
 * in GBP, so every sale pays the card fee (1.5% UK · ~3.25% international) PLUS Stripe's
 * currency conversion — realistically 4.3–6.0% all-in, i.e. roughly £210–£213 of a $299
 * actually arrives. The old 3.5% modelled the card fee alone and silently ignored the
 * conversion. The real rate is in the founder's own Stripe dashboard; until read, an estimate.
 */
export const STRIPE_ALL_IN_PCT = 5

/** One line for a surface that wants to say how confident a number is. */
export function basisLabel(b: CostBasis): string {
  switch (b) {
    case 'verified': return 'off a real invoice'
    case 'estimate': return 'estimate — needs confirming'
    case 'unverified-secondary': return '⚠️ unverified — researched from search results, not the vendor’s own page'
  }
}
