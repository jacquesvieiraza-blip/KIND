// ═══════════════════════════════════════════════════════════════════════════════════════
// PROGRAMME MONEY — the split, and how it is written down.
//
// ⚑ 31 Aug (BUILD-004A-2B live walk). Lifted out of `ProgrammeWorkspace.tsx` for one reason:
// a defect this file exists to prevent CANNOT be caught by reading source as a string, and a
// component file full of JSX cannot be imported and RUN by the suite. The rule is arithmetic,
// so the guard has to do arithmetic.
//
// 🛑 THE DEFECT, FOUND LIVE ON MBF HOLDINGS. A $4,375 programme rendered:
//
//     Programme value   $4,375
//     Payment 1         $2,188
//     Payment 2         $2,188      → the two halves add up to $4,376
//
// Nothing stored or computed was wrong. `halves(437500)` returned `{ first: 218750,
// second: 218750 }` — exactly $2,187.50 each, summing exactly to the total. The formatter
// then rounded EACH HALF INDEPENDENTLY to whole dollars, and two half-cent roundings in the
// same direction put a dollar on the screen that nobody is charging.
//
// ⚠️ A CLIENT ADDS THE TWO NUMBERS. On a payment screen the arithmetic has to survive being
// checked by hand, because it will be.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * The two halves of a programme price, in cents.
 *
 * ⚠️ THE SECOND IS THE REMAINDER, NOT A SECOND DIVISION. On an odd number of cents
 * `half + half` would be a cent short of the total; taking the remainder means the two
 * figures always add back to the programme value exactly.
 *
 * ⚠️ THIS IS PRESENTATION-NEUTRAL AND UNCHANGED BY THE ROUNDING FIX. It was already correct
 * and nothing here has been altered for display purposes — the money model is untouched.
 */
export function halves(totalCents: number): { first: number; second: number } {
  const first = Math.floor(totalCents / 2)
  return { first, second: totalCents - first }
}

/**
 * A programme figure as a customer reads it.
 *
 * ⚠️ CENTS APPEAR ONLY WHEN THEY EXIST. `$4,375` stays `$4,375`; `$2,187.50` keeps its
 * cents rather than being rounded to `$2,188`. That is the whole fix: whole-dollar amounts
 * read exactly as they did before, and an amount carrying cents is no longer allowed to
 * pretend it doesn't.
 *
 * ⚠️ NOT "ALWAYS TWO DECIMALS". That would have reconciled too, and would have turned every
 * even programme value into `$4,800.00` — a cosmetic change to screens that were already
 * telling the truth. The narrowest fix is the one that only moves what was wrong.
 */
export function programmeMoney(cents: number): string {
  // Rounded first so a floating-point cent value cannot produce `$4,375.004`.
  const c = Math.round(cents)
  const hasCents = c % 100 !== 0
  return `$${(c / 100).toLocaleString(undefined, {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  })}`
}
