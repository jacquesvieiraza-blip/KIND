// ══════════════════════════════════════════════════════════════════════════════════════════
// J23-C2 · THE FALSE RECONCILIATION CLAIM IN calendar.ts (LR 21)
//
// REQ: *"Reconciliation claim in calendar.ts corrected."* RED: *"The false comment stands."*
//
// ── THE SENTENCE ────────────────────────────────────────────────────────────────────────
//
// *"Recording BOOKED_UNVERIFIED is honest about the missing calendar entry, countable as the
// outcome it is, and **reconcilable by verifyBooking() once an event id exists**."*
//
// 🛑 NOTHING CALLS `verifyBooking`. The function is real and correct, and its only references
// in this repository are its own definition and its tests. There is no cron, no operator
// control, no webhook and no route that hands it a meeting id and an event id — so no event id
// ever comes to exist for one of these rows, and a meeting recorded here stays
// BOOKED_UNVERIFIED for ever.
//
// ── WHY A COMMENT IS WORTH AN ITEM ──────────────────────────────────────────────────────
//
// It reads as a reassurance — the state is temporary, something will tidy it — and it sits at
// exactly the point where a person is deciding whether to build the thing that would. A
// sentence saying the work is already handled is how the work does not get done, and it was
// the only statement in that file about what happens to these meetings afterwards.
//
// ⚠️ NO-TOUCH: the meeting-confinement frozen test, and the founder's 29-Aug ruling in the same
// block. Neither is touched — this item changes one comment and asserts one fact about the
// codebase.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const CAL = readFileSync(join(__dirname, '../routes/calendar.ts'), 'utf8')
const REPO_SRC = join(__dirname, '../../..')

/** Every source file in the product — walked, so a new caller anywhere is seen. */
function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === 'dist' || name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) sources(p, out)
    else if ((p.endsWith('.ts') || p.endsWith('.tsx')) && !p.includes('.test.')) out.push(p)
  }
  return out
}

describe('J23-C2 · the claim is corrected, and the fact behind it is asserted', () => {
  it('🛑 THE FALSE CLAUSE IS GONE FROM THE LIVE SENTENCE', () => {
    // ⚠️ THE STRUCK TEXT SURVIVES AS A QUOTATION, deliberately — this repo never deletes what
    // it corrected. What must not survive is the claim as an ASSERTION, so this checks the
    // sentence it was part of rather than the words in isolation.
    expect(CAL, 'the live sentence still promises a reconciliation')
      .not.toContain('countable as\n    // the outcome it is, and reconcilable by verifyBooking()')
    expect(CAL, 'the correction does not record what it replaced')
      .toContain('~~"and reconcilable by verifyBooking() once an event id exists."~~')
  })

  it('🛑 AND IT SAYS WHAT IS TRUE — a capability, not a process', () => {
    expect(CAL).toContain('NOTHING CALLS `verifyBooking`')
    expect(CAL).toMatch(/stays BOOKED_UNVERIFIED for ever/)
    expect(CAL).toMatch(/reconciliation is not a process anybody runs/)
  })

  it('🛑 THE FACT IS TRUE TODAY — nothing in the product calls `verifyBooking`', () => {
    // 🛑 THE LOAD-BEARING ASSERTION. The comment is only correct while this is; if somebody
    // builds the reconciliation, this goes red and the comment has to be corrected again —
    // which is the right way round for a claim about what the codebase does.
    // ⚠️ COMMENT-STRIPPED, AND THAT IS NOT A CONVENIENCE. The correction above NAMES
    // `verifyBooking()` in prose — twice — so a scan of raw text finds calendar.ts calling
    // itself and the guard fails against the sentence explaining why nothing calls it.
    const strip = (t: string) => t
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n')
      .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
      .join('\n')
    const callers = sources(REPO_SRC)
      .filter(p => !p.endsWith('meeting-truth.ts'))
      .filter(p => /\bverifyBooking\s*\(/.test(strip(readFileSync(p, 'utf8')).replace(/verifyBookingToken\s*\(/g, '')))
      .map(p => p.slice(p.indexOf('src/')))
    expect(callers, 'something calls verifyBooking now — the comment must be corrected again')
      .toEqual([])
  })

  it('and the function it names still exists — a comment about a deleted function is a different bug', () => {
    const MT = readFileSync(join(__dirname, 'meeting-truth.ts'), 'utf8')
    expect(MT).toContain('export async function verifyBooking(meetingId: string, googleEventId: string)')
    expect(MT).toContain("state:           'BOOKED',")
  })

  it('🛑 NO-TOUCH HELD — the founder\'s 29-Aug ruling in the same block is unchanged', () => {
    // The ruling this comment sits under is founder-locked and is not what the item corrects.
    expect(CAL).toContain('K.I.N.D APPLICATION auth/authorisation failure  → fail closed, NO booking, NO meeting')
    expect(CAL).toContain('GOOGLE calendar auth / connection failure       → never make the prospect disappear')
    expect(CAL).toContain('⚠️ WE NEVER PRETEND IT IS VERIFIED: no event id is invented, verified_at stays NULL,')
  })

  it('🛑 AND THE BEHAVIOUR IS UNTOUCHED — this item changed a comment and nothing else', () => {
    // The booking is still recorded on a Google-side failure, which is the whole ruling.
    //
    // ⚠️ BOTH CALL SITES, COUNTED. There are two — the not-connected door and this catch — and
    // asserting the shape once passed while one of them was disabled, because the other still
    // matched. A guard that a second occurrence can satisfy is a guard about the file, not
    // about the line.
    expect((CAL.match(/const fallback = await recordUnverifiedBooking\(/g) ?? []).length,
      'one of the two unverified-booking records was disabled').toBe(2)
    expect(CAL).toContain("authFailure ? 'google_auth_failed' : 'google_unavailable')")
  })
})
