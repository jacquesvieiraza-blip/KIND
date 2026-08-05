// #613 — WHAT THE BANK ACTUALLY RECEIVED, versus what we asked for.
//
// ⚠️ THE DEFECT THIS EXISTS FOR. Every money row in this product records **the price we
// quoted**, never the amount Stripe settled. `routes/stripe.ts` writes `amount` from
// `session.metadata.amountUsd` (the figure we put INTO the checkout) and the subscription path
// writes `STRIPE_SUBSCRIPTIONS[product].priceUsd` — a hardcoded constant. Nothing anywhere
// reads `balance_transaction`.
//
// So a discount, a partial refund, a currency conversion or a disputed charge is **invisible**,
// and no figure in the console reconciles to the bank statement. On a $299 pack sold in USD
// into a GBP account the gap is real money: card fee ~1.5–3.25% plus Stripe's FX cut, so
// roughly **£210–£213 of a $299 arrives**. The console says $299.
//
// ── WHY ANNOTATION AND NOT A COLUMN ──────────────────────────────────────────────────────
//
// The honest fix is `credit_transactions.stripe_fee_usd` + `.net_usd` + `.settlement_currency`.
// **The schema is frozen** — no Supabase dashboard, no Postgres password, `DATABASE_URL` is a
// placeholder — so that migration cannot run, and a build that ends on "now press Run
// migrations" is not a plan (LAUNCH-PAD's standing constraint).
//
// So the settlement facts are appended to the row's EXISTING `note` text column. That is
// deliberately a lesser fix and it is recorded as one: the numbers are readable by a human and
// greppable, but they are **not queryable as numbers**, so no dashboard can SUM them. The day
// migrations return, the columns land and this annotation becomes the backfill source.
//
// ⚠️ AND IT IS BEST-EFFORT BY CONSTRUCTION. The client's money is credited BEFORE this runs and
// never depends on it. A Stripe outage, a rate limit or an expand failure must cost us a note,
// never a payment — the #349 class in reverse: this is the one write in the file that is
// allowed to fail silently, because the thing it annotates has already succeeded.

/** The parts of a Stripe balance transaction this module needs. Minor units, as Stripe sends. */
export type BalanceTxLike = {
  /** Gross, in the SETTLEMENT currency's minor unit. */
  amount?: number | null
  /** Stripe's cut, same unit. */
  fee?: number | null
  /** What lands in the account, same unit. */
  net?: number | null
  /** Settlement currency — what the BANK receives, not what the customer paid. */
  currency?: string | null
  /** Present when the charge currency differs from the settlement currency. */
  exchange_rate?: number | null
}

/**
 * Currencies Stripe treats as zero-decimal — their "minor unit" IS the unit.
 *
 * Dividing JPY by 100 turns ¥30,000 into ¥300 and makes the note quietly wrong in the one
 * direction nobody checks. Short list on purpose: these are the ones a UK/US business actually
 * meets. An unknown currency falls through to /100, which is right for every currency in this
 * list's complement that we are plausibly paid in.
 */
const ZERO_DECIMAL = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'])

/** Minor units → major units, respecting zero-decimal currencies. */
export function majorUnits(minor: number | null | undefined, currency: string | null | undefined): number {
  const n = Number(minor ?? 0)
  if (!Number.isFinite(n)) return 0
  return ZERO_DECIMAL.has(String(currency ?? '').toLowerCase()) ? n : n / 100
}

const money = (n: number, cur: string) => {
  const c = cur.toUpperCase()
  const sym = c === 'USD' ? '$' : c === 'GBP' ? '£' : c === 'EUR' ? '€' : ''
  return `${sym}${n.toFixed(2)}${sym ? '' : ' ' + c}`
}

/**
 * The one-line settlement fact, appended to a ledger row's note.
 *
 * Shape is pinned by test because it is the ONLY machine-readable form these numbers have
 * while the schema is frozen — a future backfill will parse exactly this string, so changing
 * it casually orphans the rows written before the change.
 *
 * Returns null when the transaction carries nothing worth recording, so a caller never writes
 * an empty annotation that looks like a measurement.
 */
export function settlementNote(bt: BalanceTxLike | null | undefined): string | null {
  if (!bt) return null
  const cur = String(bt.currency ?? '').toLowerCase()
  if (!cur) return null
  if (bt.amount == null && bt.net == null) return null

  const gross = majorUnits(bt.amount, cur)
  const fee = majorUnits(bt.fee, cur)
  const net = majorUnits(bt.net, cur)
  const parts = [
    `gross ${money(gross, cur)}`,
    `stripe fee ${money(fee, cur)}`,
    `net ${money(net, cur)}`,
    `payout currency ${cur.toUpperCase()}`,
  ]
  // The FX rate only appears when a conversion actually happened. Printing "rate 1" on a
  // same-currency charge would imply a conversion took place and invite someone to model one.
  if (bt.exchange_rate != null && Number.isFinite(Number(bt.exchange_rate)) && Number(bt.exchange_rate) !== 1) {
    parts.push(`fx ${Number(bt.exchange_rate).toFixed(6)}`)
  }
  return `[settled: ${parts.join(' · ')}]`
}

/** Append the settlement fact to an existing note without destroying what is there. */
export function appendSettlement(existingNote: string | null | undefined, note: string): string {
  const base = String(existingNote ?? '').trim()
  if (base.includes('[settled:')) return base   // idempotent — a webhook retry must not double-stamp
  return base ? `${base} ${note}` : note
}

/** What we asked for, versus what arrived — the verdict the reconcile panel renders. */
export type ReconcileVerdict = 'match' | 'fee_only' | 'mismatch' | 'unknown'

/**
 * Does the ledger row agree with what Stripe settled?
 *
 * ⚠️ 'fee_only' IS THE EXPECTED HEALTHY STATE, and saying so is the point of this function.
 * The ledger records the price; the bank receives the price minus Stripe's cut. Those SHOULD
 * differ, and rendering that ordinary gap as a red "mismatch" on every single row would train
 * the reader to ignore the column — the same way a warn that blocks trains people to route
 * around a gate. A real mismatch is when the GROSS differs: a discount, a partial refund, or a
 * row recorded at a price the customer never actually paid.
 *
 * `unknown` when we could not read the settlement — never silently 'match'. An unmeasured row
 * is not a reconciled row (#576's rule, on a different number).
 */
export function reconcileVerdict(a: {
  ledgerAmountUsd: number | null | undefined
  grossMajor: number | null | undefined
  netMajor: number | null | undefined
  /** Settlement currency; a converted payout cannot be compared to a USD ledger figure. */
  settlementCurrency: string | null | undefined
}): { verdict: ReconcileVerdict; why: string } {
  const ledger = Number(a.ledgerAmountUsd ?? NaN)
  const gross = Number(a.grossMajor ?? NaN)
  const cur = String(a.settlementCurrency ?? '').toLowerCase()

  if (!Number.isFinite(ledger)) return { verdict: 'unknown', why: 'The ledger row carries no amount to compare.' }
  if (!Number.isFinite(gross)) return { verdict: 'unknown', why: 'Stripe returned no settlement for this payment — this is NOT evidence that it reconciles, only that we could not read it.' }

  if (cur && cur !== 'usd') {
    return {
      verdict: 'fee_only',
      why: `Settled in ${cur.toUpperCase()}, so the payout cannot be compared directly to the $${ledger.toFixed(2)} we recorded — the difference is the card fee plus the currency conversion. Expected, and exactly the gap the console has never shown.`,
    }
  }

  // A cent of float drift is not a discrepancy.
  if (Math.abs(gross - ledger) <= 0.011) {
    const net = Number(a.netMajor ?? NaN)
    if (Number.isFinite(net) && Math.abs(net - ledger) > 0.011) {
      return { verdict: 'fee_only', why: `Charged the full $${ledger.toFixed(2)}; $${(ledger - net).toFixed(2)} of it went to Stripe. This is the normal, healthy state — the ledger records the price, the bank receives the price minus the fee.` }
    }
    return { verdict: 'match', why: 'Gross and net both agree with the recorded amount.' }
  }

  return {
    verdict: 'mismatch',
    why: `We recorded $${ledger.toFixed(2)} but Stripe charged $${gross.toFixed(2)} — a ${gross > ledger ? 'larger' : 'smaller'} amount than the row claims. A discount, a partial refund, or a row written at a price the customer never paid. Read this one.`,
  }
}
