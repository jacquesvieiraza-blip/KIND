import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  pickAbWinner, MIN_MEETINGS_TO_RESOLVE, MIN_POSITIVE_REPLIES_TO_RESOLVE,
  type VariantOutcome,
} from './ab-winner'

// ── P27 — THE A/B WINNER OPTIMISES MEETINGS, NEVER OPENS ───────────────────────────────────
//
// Founder, 21 Aug: *"the winner is decided by MEETINGS BOOKED per variant; where every variant
// has zero meetings, fall back to POSITIVE REPLIES per variant; opens are never the deciding
// signal."*
//
// ⚠️ THE OLD RULE WAS DEFENSIBLE AND STILL WRONG, which is why it survived. Ranking by open
// rate is the standard thing to do, the code was careful (it even guarded against resolving on
// zero tracking data), and the result was written IRREVERSIBLY — `ab_test_resolved: true`. A
// curiosity-gap subject beats an honest one on opens and loses on meetings. The old rule picked
// the curiosity gap and made it permanent for every future lead on that campaign.

const V = (o: Partial<VariantOutcome> & { label: string }): VariantOutcome => ({
  sends: 10, meetings: 0, positiveReplies: 0, opens: 0, ...o,
})

/** The OLD ranking, reproduced exactly from the line this change removed. */
function oldWinnerByOpenRate(vs: readonly VariantOutcome[]): string {
  let bestLabel = 'a'
  let bestRate = -1
  for (const v of vs) {
    const rate = v.opens / v.sends
    if (rate > bestRate) { bestRate = rate; bestLabel = v.label }
  }
  return bestLabel
}

describe('⚠️ RED PROOF — A has more opens, B has more meetings', () => {
  // The founder's scenario, verbatim: "a test where variant A has more opens and variant B has
  // more meetings — OLD code picks A, NEW code picks B".
  const A = V({ label: 'a', sends: 50, opens: 30, meetings: 0, positiveReplies: 1 })
  const B = V({ label: 'b', sends: 50, opens: 6,  meetings: 4, positiveReplies: 5 })

  it('the OLD open-rate ranking picks A — the variant that booked NOTHING', () => {
    expect(oldWinnerByOpenRate([A, B])).toBe('a')
    expect(A.meetings, 'and A booked zero meetings').toBe(0)
    expect(B.meetings, 'while B booked four').toBe(4)
  })

  it('the NEW ranking picks B, on meetings', () => {
    const d = pickAbWinner([A, B])
    expect(d).toEqual({ resolved: true, winner: 'b', basis: 'meetings' })
  })

  it('⚠️ AND OPENS CANNOT FLIP IT AT ANY MAGNITUDE', () => {
    // Not "meetings are weighted higher" — opens are not in the calculation at all. A variant
    // with a hundred times the opens still loses to one meeting.
    const huge = V({ label: 'a', sends: 50, opens: 50, meetings: 0, positiveReplies: 9 })
    const one  = V({ label: 'b', sends: 50, opens: 0,  meetings: 1, positiveReplies: 0 })
    expect(pickAbWinner([huge, one]).resolved && pickAbWinner([huge, one]).winner).toBe('b')
  })
})

describe('the fallback ladder', () => {
  it('with zero meetings anywhere, POSITIVE REPLIES decide', () => {
    const d = pickAbWinner([
      V({ label: 'a', opens: 40, positiveReplies: 1 }),
      V({ label: 'b', opens: 2,  positiveReplies: 6 }),
    ])
    expect(d).toEqual({ resolved: true, winner: 'b', basis: 'positive_replies' })
  })

  it('one meeting anywhere outranks every reply count', () => {
    // The ladder is meetings THEN replies, not a blend.
    const d = pickAbWinner([
      V({ label: 'a', positiveReplies: 20, meetings: 0 }),
      V({ label: 'b', positiveReplies: 0,  meetings: 1 }),
    ])
    expect(d).toEqual({ resolved: true, winner: 'b', basis: 'meetings' })
  })

  it('⚠️ NEITHER SIGNAL YET → the test stays OPEN, however many opens exist', () => {
    // The #392 lesson, moved onto the new signal. Resolving is irreversible, so resolving on
    // nothing is the one unrecoverable mistake this function can make.
    const d = pickAbWinner([
      V({ label: 'a', sends: 50, opens: 45 }),
      V({ label: 'b', sends: 50, opens: 40 }),
    ])
    expect(d).toEqual({ resolved: false, reason: 'no_signal_yet' })
  })

  it('a single variant never resolves — there is nothing to compare', () => {
    expect(pickAbWinner([V({ label: 'a', meetings: 9 })]).resolved).toBe(false)
  })

  it('the thresholds are the outcome signal, not the open signal', () => {
    expect(MIN_MEETINGS_TO_RESOLVE).toBe(1)
    expect(MIN_POSITIVE_REPLIES_TO_RESOLVE).toBe(3)
  })
})

describe('ties break on the earlier label — the winner must be stable between runs', () => {
  it('equal meetings keeps the earlier variant, as the old loop did', () => {
    const d = pickAbWinner([V({ label: 'a', meetings: 2 }), V({ label: 'b', meetings: 2 })])
    expect(d.resolved && d.winner).toBe('a')
  })
})

describe('the handler actually uses this, and no longer reads opens to decide', () => {
  // ⚠️ COMMENTS STRIPPED HARDER THAN stripCommentsForEnvScan DOES.
  // The ⛓️ block in the handler QUOTES the removed open-rate line verbatim, as the chain rule
  // requires. That record is not the code — but a guard that cannot tell them apart would go
  // red on its own tombstone, and the obvious "fix" would be to delete the record. Strip every
  // `//` to end of line and the assertion means what it says.
  const SRC = readFileSync(join(__dirname, '../routes/internal.ts'), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')

  it('⚠️ THE OPEN-RATE RANKING IS GONE FROM THE HANDLER', () => {
    // Comment-stripped: the ⛓️ block quoting the old code is a record, not the code.
    expect(SRC, 'the open-rate line').not.toMatch(/e\.opened_at\)\.length \/ emails\.length/)
    expect(SRC, 'and its opens-only threshold').not.toMatch(/MIN_OPENS_TO_RESOLVE/)
  })

  it('the handler calls pickAbWinner and selects lead_id to join meetings', () => {
    expect(SRC).toMatch(/pickAbWinner\(outcomes\)/)
    expect(SRC, 'lead_id is what joins a variant to its meetings').toMatch(/sent_at, lead_id/)
    expect(SRC, 'and the outcomes come from figsy_replies').toMatch(/meeting_booked_at/)
  })

  it('⚠️ NO-TOUCH — the pixel, opened_at writes and every send path are untouched', () => {
    // The founder's clause: the pixel's fate is his W4 ruling, not this change. `opened_at` is
    // still READ (reported in the log line) and still WRITTEN wherever it was before; it simply
    // stopped being the thing that decides.
    expect(SRC, 'opens are still gathered for reporting').toMatch(/opens: emails\.filter\(e => e\.opened_at\)/)
    const pixel = readFileSync(join(__dirname, 'deliverability.ts'), 'utf8')
    expect(pixel, 'the pixel module is untouched by this change').toContain('trackingPixelHtml')
  })
})
