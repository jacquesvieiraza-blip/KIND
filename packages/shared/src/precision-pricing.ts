// ⚑ 8 Oct — THE PRECISION MODEL'S PRICE, THE SAME FOR EVERY CLIENT (founder GO, 8 Oct).
//
// A one-off setup fee, paid by card before we start, then one price for each meeting that is
// held, charged to the card on file after it takes place. A meeting that does not happen is not
// charged; a client who cancels with less notice than PRECISION_CLIENT_NOTICE_HOURS, or does not
// attend, is charged as if it were held.
//
// The website has no build step, so these figures are typed on its pages, and
// website-money-claims.test.ts holds every page to them (working method rule 7: money a client
// can read is derived, never typed in two places that can drift). Billing does not charge these
// yet: the R166 programme payment is still what the code takes, and that is the next change.

/** The one-off setup fee, in pounds sterling. */
export const PRECISION_SETUP_FEE_GBP = 1000

/** The price of one held meeting, in pounds sterling. */
export const PRECISION_PER_HELD_MEETING_GBP = 500

/** How much notice a client gives to cancel a meeting without it being charged. */
export const PRECISION_CLIENT_NOTICE_HOURS = 24

/** A whole-pound figure the way the website writes it: 1000 → "£1,000". */
export function formatGbpWhole(gbp: number): string {
  return '£' + Math.round(gbp).toLocaleString('en-GB')
}
