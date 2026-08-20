import { isLaunchSendCountry } from '@kind/shared'

// ── HOW MANY LEADS HAVE NO COUNTRY — AND WHAT THAT COSTS ───────────────────────────────────
//
// `pecr.ts`'s `unknown_country` class carried the sentence *"sending, and counted so the volume
// is visible."* **It was never counted and never visible.** The class is an ALLOW, so `noteSkip`
// is never called for it; the only trace it ever left was a `console.warn` nobody reads.
//
// ⚠️ AND THE ENROL-SKIP CHIP CANNOT ANSWER THIS QUESTION EITHER, which is why this is a
// separate number rather than one more reason on that surface:
//
//   • the chip reads the LAST ENROL RUN only, for one selected client
//   • no enrol run has ever happened — `AUTO_OUTREACH_ENABLED` is off — so it renders nothing
//     at all, and would go on rendering nothing until send-day
//   • it counts leads that reached the enrol gate, not leads that EXIST
//
// The founder's question is about the book: *how many of my leads have no country?* On 20 Aug
// the answer was **166 of 206**, and the launch allowlist (R50) holds every one of them. That
// is the single number standing between the book and a first send, and no screen showed it.
//
// Pure and DB-free, for the same reason `enrol-skips.ts` and `pecr.ts` are: the sentence an
// operator reads is provable without a database, and its test must not need Supabase env vars.

export type CountryCoverage = {
  /** Leads examined. */
  total: number
  /** Leads with no usable country string at all. */
  missing: number
  /** Leads whose country IS in the launch allowlist — the only ones that can send today. */
  sendable: number
  /** Leads with a country that is real but not yet opened. */
  held: number
  /** True when the read hit its cap, so the numbers are a floor rather than the whole book. */
  capped: boolean
  /** The sentence an operator reads. Never a bare count. */
  line: string
}

/**
 * Tally a client's leads by whether we can send to them today.
 *
 * ⚠️ THREE BUCKETS, NOT TWO, and the distinction is the actionable part. "No country" is a data
 * problem — backfill it and those leads may become sendable. "Has a country we have not opened"
 * is a founder decision — no amount of enrichment changes it. Collapsing them into one
 * "can't send" number would tell somebody to go fix the wrong thing.
 */
export function countryCoverage(countries: readonly (string | null | undefined)[], capped = false): CountryCoverage {
  let missing = 0
  let sendable = 0
  let held = 0
  for (const c of countries) {
    const v = String(c ?? '').trim()
    if (!v) { missing++; continue }
    if (isLaunchSendCountry(v)) sendable++
    else held++
  }
  const total = countries.length
  return { total, missing, sendable, held, capped, line: coverageLine({ total, missing, sendable, held, capped }) }
}

/**
 * The words, kept beside the numbers so they cannot drift apart.
 *
 * ⚠️ IT NAMES THE CONSEQUENCE, NOT JUST THE COUNT. #620's whole lesson: *"3 skipped" with no
 * cause is the exact reading that sends somebody hunting a bug in the wrong place.* A bare
 * "166 missing" invites the same mistake — it looks like an enrichment nag rather than the
 * reason send-day would produce zero emails.
 */
function coverageLine(a: Omit<CountryCoverage, 'line'>): string {
  if (a.total === 0) return 'No leads yet.'
  const cap = a.capped ? ` (first ${a.total} leads)` : ''
  if (a.missing === 0 && a.held === 0) return `All ${a.total} leads can be sent to${cap}.`

  const parts: string[] = [`${a.sendable} of ${a.total} can be sent to${cap}`]
  if (a.missing > 0) {
    parts.push(
      a.missing === a.total
        ? `every one of the ${a.missing} has NO country, so the launch allowlist holds the entire book — fill the country in and they become sendable`
        : `${a.missing} have no country, so the launch allowlist holds them — fill the country in and they become sendable`,
    )
  }
  if (a.held > 0) {
    parts.push(`${a.held} are in countries we have not opened yet — enrichment will not change that, only opening the country will`)
  }
  return parts.join(' · ')
}

// ── THE CHIP AN OPERATOR ACTUALLY SEES ─────────────────────────────────────────────────────
//
// ⚠️ WHY THIS IS HERE AND NOT IN THE JSX. A test that reads `vida/page.tsx` as TEXT can prove a
// string is present; it cannot prove it renders. Wrapping the chip in `{false && …}` leaves
// every one of those strings in the file, and the first version of this item's guard passed
// with the render disabled — reproducing #620's exact failure (the count exists, no screen
// shows it) inside the guard written to prevent it.
//
// So the decision and the words move HERE, where they are ordinary values a test can assert.
// The JSX becomes a thin spread of what this returns. That does not make a text guard into a
// render proof — nothing short of rendering the page does — but it moves everything that CAN
// be proved to where it can be, and leaves the JSX with nothing to get wrong but the wiring.

export type CoverageChip =
  | { show: false }
  | { show: true; stop: boolean; text: string; title: string }

/**
 * Should the board show this, and in what words?
 *
 * SILENT ON A CLEAN BOOK, deliberately. A chip on every client becomes the line everyone learns
 * to skip — the same reason `recordEnrolSkips` writes nothing for a run that refused nobody.
 *
 * `stop: true` when NOTHING is sendable, because that is not a warning: it is send-day
 * producing no emails at all.
 */
export function coverageChip(c: CountryCoverage | null): CoverageChip {
  if (!c || c.total === 0) return { show: false }
  if (c.missing === 0 && c.held === 0) return { show: false }
  const parts = [`${c.sendable}/${c.total} sendable`]
  if (c.missing > 0) parts.push(`${c.missing} no country`)
  if (c.held > 0)    parts.push(`${c.held} country not open`)
  if (c.capped)      parts.push('capped')
  return {
    show: true,
    stop: c.sendable === 0,
    text: `${c.sendable === 0 ? '🛑' : '🌍'} ${parts.join(' · ')}`,
    title: c.line,
  }
}
