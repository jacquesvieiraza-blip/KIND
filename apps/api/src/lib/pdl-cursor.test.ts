import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  cursorFingerprint, decideCursor, nextCursorState, exhaustedMessage, exhaustedAlertLines,
} from './pdl-cursor'

// #366 — A CLIENT'S SECOND MONTH MUST FIND NEW PEOPLE.
//
// The defect was one underscore: `pdlSearchPeople(icp, _page = 1, size = 50)` accepted a
// page and ignored it. Every run asked PDL for page 1, every result deduped against leads
// the client already had, and the run inserted zero — reported to the client as "no leads
// matched this ICP", a sentence about their targeting that was really about our paging.

const ICP = {
  job_titles:       ['Head of Sales', 'VP Sales'],
  seniority_levels: ['VP / Director'],
  company_sizes:    ['51–200'],
  geographies:      ['South Africa'],
  industries:       ['SaaS'],
}

describe('the fingerprint decides whether a stored cursor is still valid', () => {
  it('the same query fingerprints the same', () => {
    expect(cursorFingerprint(ICP)).toBe(cursorFingerprint({ ...ICP }))
  })

  it('REORDERING is not a change — a dragged list must not throw away paging', () => {
    expect(cursorFingerprint({ ...ICP, job_titles: ['VP Sales', 'Head of Sales'] }))
      .toBe(cursorFingerprint(ICP))
  })

  it('case and stray whitespace are not changes either', () => {
    expect(cursorFingerprint({ ...ICP, job_titles: ['  head of sales ', 'VP SALES'] }))
      .toBe(cursorFingerprint(ICP))
  })

  it('ADDING A COUNTRY IS a change — a token into the old result set is now wrong', () => {
    expect(cursorFingerprint({ ...ICP, geographies: ['South Africa', 'Kenya'] }))
      .not.toBe(cursorFingerprint(ICP))
  })

  it('removing an industry is a change', () => {
    expect(cursorFingerprint({ ...ICP, industries: [] })).not.toBe(cursorFingerprint(ICP))
  })
})

describe('deciding what to send PDL this run', () => {
  const fp = cursorFingerprint(ICP)

  it('a first-ever run sends no token and is not a reset', () => {
    expect(decideCursor(null, ICP)).toEqual({ token: null, reset: false, exhausted: false })
  })

  it('THE FEATURE: a stored token for the same query is sent back, so run 2 pages FORWARD', () => {
    const d = decideCursor({ pdl_scroll_token: 'tok-abc', pdl_scroll_query: fp }, ICP)
    expect(d.token).toBe('tok-abc')
    expect(d.exhausted).toBe(false)
  })

  it('a token from a DIFFERENT query is discarded, not replayed', () => {
    // Replaying it would return people from the audience they no longer target — which
    // reads as a working search delivering irrelevant leads. Worse than zero.
    const d = decideCursor({ pdl_scroll_token: 'tok-abc', pdl_scroll_query: 'old-fingerprint' }, ICP)
    expect(d.token).toBeNull()
    expect(d.reset).toBe(true)
  })

  it('a known-exhausted query is not asked again — it is reported', () => {
    const d = decideCursor({ pdl_scroll_query: fp, pdl_exhausted_at: '2026-07-27T00:00:00Z' }, ICP)
    expect(d.exhausted).toBe(true)
    expect(d.token).toBeNull()
  })

  it('WIDENING an exhausted ICP un-exhausts it — a wider audience really does hold more people', () => {
    const wider = { ...ICP, geographies: ['South Africa', 'Kenya'] }
    const d = decideCursor({ pdl_scroll_query: fp, pdl_exhausted_at: '2026-07-27T00:00:00Z' }, wider)
    expect(d.exhausted).toBe(false)
    expect(d.token).toBeNull()
    expect(d.reset).toBe(true)
  })
})

describe('what gets written back after a run', () => {
  const NOW = '2026-07-27T12:00:00.000Z'

  it('a fresh token is stored WITH the query it belongs to', () => {
    const s = nextCursorState(ICP, { scrollToken: 'tok-2', exhausted: false }, NOW)
    expect(s.pdl_scroll_token).toBe('tok-2')
    expect(s.pdl_scroll_query).toBe(cursorFingerprint(ICP))
    expect(s.pdl_exhausted_at).toBeNull()
  })

  it('exhaustion is stamped and the dead token dropped', () => {
    const s = nextCursorState(ICP, { scrollToken: null, exhausted: true }, NOW)
    expect(s.pdl_exhausted_at).toBe(NOW)
    expect(s.pdl_scroll_token).toBeNull()
  })

  it('exhaustion still records the FINGERPRINT — otherwise widening could never clear it', () => {
    // Without this the client widens their ICP, we still think they are finished, and the
    // silent zero comes back through the other door.
    const s = nextCursorState(ICP, { scrollToken: null, exhausted: true }, NOW)
    expect(s.pdl_scroll_query).toBe(cursorFingerprint(ICP))
    expect(decideCursor(s, { ...ICP, industries: ['SaaS', 'Fintech'] }).exhausted).toBe(false)
  })

  it('PDL returning a null token on a good page ends the walk cleanly', () => {
    const s = nextCursorState(ICP, { scrollToken: null, exhausted: false }, NOW)
    expect(s.pdl_scroll_token).toBeNull()
    expect(s.pdl_exhausted_at).toBeNull()   // not exhausted — just no token to carry
  })
})

describe('an exhausted ICP SAYS SO OUT LOUD', () => {
  it('the client is told the audience ended, never that they got nothing', () => {
    const m = exhaustedMessage(240)
    expect(m.toLowerCase()).toContain('end of this audience')
    expect(m).toContain('240')
  })

  it('it tells them the ONE thing that fixes it', () => {
    expect(exhaustedMessage(240).toLowerCase()).toContain('widen')
  })

  it('it never reads as an error or a bad day', () => {
    const m = exhaustedMessage(240).toLowerCase()
    expect(m).not.toContain('failed')
    expect(m).not.toContain('error')
    expect(m).not.toContain('sorry')
    expect(m).not.toContain('no leads matched')
  })

  it('it works before any lead has been held', () => {
    expect(exhaustedMessage(0)).not.toContain('0 of them')
  })

  it('the FOUNDER is told this client delivers zero next month unless someone acts', () => {
    const lines = exhaustedAlertLines('Acme', 'SA sales leaders', 240).join(' ')
    expect(lines).toContain('Acme')
    expect(lines).toContain('SA sales leaders')
    expect(lines).toContain('ZERO')
    expect(lines.toLowerCase()).toContain('widen')
  })

  it('the alert survives a client with no company name on the row', () => {
    expect(exhaustedAlertLines('', '', 0).join(' ')).toContain('A client')
  })
})

// ── THE WIRING. The pure functions above are worthless if nothing calls them — which is
// exactly how #1185 shipped "complete" with no caller. These read the real files.
describe('the paging is actually WIRED, not just written', () => {
  const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')
  // Comments quote the old code to explain the bug; a guard that forbids you from
  // describing what you fixed is a bad guard.
  const code = (p: string) => read(p).split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

  it('pdl-search exposes a paging call that returns the next token', () => {
    expect(code('./pdl-search.ts')).toContain('export async function pdlSearchPage')
  })

  it('the ignored `_page` parameter is GONE from pdl-search', () => {
    expect(code('./pdl-search.ts')).not.toMatch(/_page/)
  })

  it('the sourcing entry point accepts and returns a cursor', () => {
    const src = code('./apollo.ts')
    expect(src).toContain('pdlCursor')
    expect(src).toContain('pdlPage')
  })

  it('runIcpJob READS the stored cursor and WRITES the next one', () => {
    const src = code('../routes/icps.ts')
    expect(src).toContain('decideCursor')
    expect(src).toContain('nextCursorState')
  })

  it('runIcpJob records the exhausted outcome instead of a bare no_match', () => {
    expect(code('../routes/icps.ts')).toContain("'audience_exhausted'")
  })

  it('the run-outcome vocabulary separates a finished audience from a narrow one', () => {
    const src = code('./run-outcome.ts')
    expect(src).toContain('audience_exhausted')
    // Both must survive — collapsing them back into one status is the regression.
    expect(src).toContain('no_match')
  })

  it('the columns the cursor lives in are in the runnable migration list', () => {
    const src = readFileSync(join(__dirname, './pending-migrations.ts'), 'utf8')
    expect(src).toContain('pdl_scroll_token')
    expect(src).toContain('pdl_scroll_query')
    expect(src).toContain('pdl_exhausted_at')
  })

  it("the DB accepts the status we write — #342's lesson applied before it bites", () => {
    // icp_run_outcomes.status has a CHECK constraint. Writing 'exhausted' into a column
    // that only permits four values fails the insert and loses the outcome entirely.
    const src = readFileSync(join(__dirname, './pending-migrations.ts'), 'utf8')
    expect(src).toContain('icp_run_outcomes_status_check')
    expect(src).toMatch(/exhausted/)
  })
})
