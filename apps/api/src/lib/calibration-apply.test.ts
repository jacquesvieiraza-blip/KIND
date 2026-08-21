import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  narrowSizeBands, scoringFeedbackContext, bandIndex, SIZE_LADDER, ANTI_SIGNAL_MIN_COUNT,
} from './lead-feedback'

// ── CALIBRATION v1 — APPLY (P32 PR 2, 21 Aug) ──────────────────────────────────────────────
//
// Founder-ruled: *"a client who passed 'too big' on 3+ leads of a size band gets that band
// excluded from THEIR next sourcing run (client-scoped, never global, never touching the pool
// itself)"* — and, on how far to exclude, **that band and everything above it**, because "too
// big" means too big and excluding only the exact band leaves the larger ones flowing back.

const ICPS    = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
const SCORING = readFileSync(join(__dirname, 'scoring.ts'), 'utf8')
const codeOf = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const pass = (n: number, size: string, code: 'too_big' | 'too_small' = 'too_big') =>
  Array.from({ length: n }, () => ({ reason_code: code as never, company_size: size }))

describe('the guard is reading real files', () => {
  it('the sourcing route and the scorer are present and non-trivial', () => {
    expect(ICPS.length).toBeGreaterThan(20_000)
    expect(SCORING.length).toBeGreaterThan(5_000)
  })
})

describe('⚠️ RED PROOF 1 — 3× "too big" on 1,000+ excludes that band for THAT client', () => {
  const targeted = ['51–200', '201–500', '501–1,000', '1,000+']

  it('two passes change nothing — one bad afternoon is not an opinion', () => {
    const r = narrowSizeBands(targeted, pass(2, '1,000+'))
    expect(r.sizes).toEqual(targeted)
    expect(r.excluded).toEqual([])
  })

  it('THREE passes exclude the band — the founder\'s threshold, exactly', () => {
    const r = narrowSizeBands(targeted, pass(3, '1,000+'))
    expect(r.excluded).toEqual(['1,000+'])
    expect(r.sizes).toEqual(['51–200', '201–500', '501–1,000'])
    expect(r.reason).toMatch(/too big/)
    expect(ANTI_SIGNAL_MIN_COUNT).toBe(3)
  })

  it('⚠️ AND EVERYTHING ABOVE IT GOES TOO — the founder\'s ruling on scope', () => {
    // "Too big" at 501–1,000 must not leave 1,000+ flowing. Excluding only the exact band
    // would send them companies LARGER than the ones they just rejected.
    const r = narrowSizeBands(targeted, pass(3, '501–1,000'))
    expect(r.excluded).toEqual(['501–1,000', '1,000+'])
    expect(r.sizes).toEqual(['51–200', '201–500'])
  })

  it('"too small" works the other way — that band and everything below', () => {
    const r = narrowSizeBands(['1–10', '11–50', '51–200', '201–500'], pass(3, '11–50', 'too_small'))
    expect(r.excluded).toEqual(['1–10', '11–50'])
  })
})

describe('⚠️ RED PROOF 2 — ISOLATION: another client is untouched', () => {
  it('narrowing is a pure function of ONE client\'s rows', () => {
    // Client A passed three at 1,000+. Client B passed nothing. B's list is unchanged — and it
    // is unchanged BY CONSTRUCTION: there is no argument through which A's rows could reach B.
    const targeted = ['201–500', '1,000+']
    const a = narrowSizeBands(targeted, pass(3, '1,000+'))
    const b = narrowSizeBands(targeted, [])
    expect(a.excluded).toEqual(['1,000+'])
    expect(b.excluded).toEqual([])
    expect(b.sizes).toEqual(targeted)
  })

  it('⚠️ THE READ IS CLIENT-SCOPED IN THE ROUTE, not merely in the function', () => {
    // A pure function cannot leak. The query that feeds it can. This asserts the filter is on
    // the actual database read — the place where "client-scoped" would silently decay.
    const code = codeOf(ICPS)
    const i = code.indexOf("from('lead_feedback')")
    expect(i, 'the calibration read exists').toBeGreaterThan(0)
    const query = code.slice(i, i + 400)
    expect(query, 'scoped to this client').toMatch(/\.eq\('client_id', clientId\)/)
    expect(query, 'and to passes').toMatch(/\.eq\('action', 'pass'\)/)
  })

  it('⚠️ THE POOL IS NEVER TOUCHED — his NO-TOUCH, asserted', () => {
    // "never touching the pool itself". The narrowing sits between the pool serve and the PDL
    // search, and must not appear inside any lead_pool statement.
    const code = codeOf(ICPS)
    const i = code.indexOf("from('lead_feedback')")
    const j = code.indexOf('searchPeopleWithFallback(icpForSearch')
    expect(j, 'the narrowed ICP reaches the search').toBeGreaterThan(i)
    expect(code.slice(i, j), 'no pool write between the read and the search').not.toMatch(/lead_pool/)
  })
})

describe('⚠️ RED PROOF 3 — a chip is optional: a pass with no reason changes nothing', () => {
  it('rows with no reason_code produce no narrowing', () => {
    const targeted = ['201–500', '1,000+']
    const rows = Array.from({ length: 9 }, () => ({ reason_code: null, company_size: '1,000+' }))
    expect(narrowSizeBands(targeted, rows).excluded).toEqual([])
  })

  it('a lead with an unknown company_size is ignored, not guessed at', () => {
    const rows = pass(5, 'enormous')
    expect(bandIndex('enormous')).toBe(-1)
    expect(narrowSizeBands(['1,000+'], rows).excluded).toEqual([])
  })
})

describe('the safety rail — narrowing can never empty a client\'s search', () => {
  it('⚠️ EXCLUDING EVERY TARGETED BAND IS ABANDONED, not obeyed', () => {
    // A client who rejects every band they target would otherwise get ZERO leads. "We listened
    // so hard you now receive nothing" is a worse outcome than continuing to look.
    const r = narrowSizeBands(['501–1,000', '1,000+'], pass(4, '501–1,000'))
    expect(r.sizes).toEqual(['501–1,000', '1,000+'])
    expect(r.excluded).toEqual([])
    expect(r.reason).toBeNull()
  })

  it('band matching tolerates provider punctuation', () => {
    // `leads.company_size` is provider text, not ours — "1,000+" and "1000+" are the same band.
    expect(bandIndex('1000+')).toBe(SIZE_LADDER.indexOf('1,000+'))
    expect(bandIndex('501-1000')).toBe(SIZE_LADDER.indexOf('501–1,000'))
  })
})

describe('the scoring prompt receives the client\'s recent feedback', () => {
  it('produces a line from structured codes', () => {
    const line = scoringFeedbackContext(pass(3, '1,000+'))
    expect(line).toMatch(/recently passed on leads for/)
    expect(line).toMatch(/too big \(3×\)/)
  })

  it('says nothing when there is nothing to say', () => {
    expect(scoringFeedbackContext(pass(1, '1,000+'))).toBeNull()
    expect(scoringFeedbackContext([])).toBeNull()
  })

  it('the scorer wires it into the prompt, fenced and best-effort', () => {
    const code = codeOf(SCORING)
    expect(code, 'the context reaches the prompt').toContain('${nexusBoost}${feedbackContext}')
    expect(code, 'scoped to this client').toMatch(/lead_feedback[\s\S]{0,300}\.eq\('client_id', clientId\)/)
  })

  it('⚠️ FREE TEXT NEVER REACHES THE MODEL', () => {
    // Same gate as the filter: the founder ruled free text is read by a human, not applied.
    // A prompt is an application.
    const rows = Array.from({ length: 9 }, () => ({
      reason_code: null, company_size: '1,000+', free_text: 'these are far too big',
    }))
    expect(scoringFeedbackContext(rows)).toBeNull()
    expect(codeOf(SCORING), 'free_text is not selected for scoring').not.toMatch(/select\('reason_code, free_text/)
  })
})
