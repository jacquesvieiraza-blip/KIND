import { describe, it, expect } from 'vitest'
import {
  toResult, toUnanswered, summarise, headline, rank, SHOW_LIMIT,
  type CheckResult, type Finding,
} from './integrity-checks'

// The judgement half of the integrity check, tested without a database.
//
// The draft this replaces mixed queries and judgement, imported a module that did not exist,
// never compiled — and was reported to the founder as a working tool. Splitting them means
// the part that decides "how bad is this and what do I say" is provable on its own.
//
// The rules under test are the ones that make an integrity report trustworthy:
//   • zero is REPORTED, never hidden — "we asked, the answer was no" is the point
//   • a check that ERRORS is never "clean" — that is the exact silent-success bug shape
//   • an unanswered check outranks "all clear" in the headline

const base: Omit<Finding, 'affected'> = {
  key: 'k', question: 'q?', defect: '#123',
  cleanVerdict: 'Nothing found — this never fired.',
  badVerdict: (n: number) => `${n} affected, here is what to do.`,
  severity: 'critical',
}

describe('zero is reported, not hidden', () => {
  it('an empty finding renders as CLEAN with the clean wording', () => {
    const r = toResult({ ...base, affected: [] })
    expect(r.severity).toBe('clean')
    expect(r.count).toBe(0)
    expect(r.verdict).toBe('Nothing found — this never fired.')
  })

  it('a clean check keeps its question and defect, so the report shows WHAT was asked', () => {
    // Silence reads as "not checked". The question must survive a clean result.
    const r = toResult({ ...base, affected: [] })
    expect(r.question).toBe('q?')
    expect(r.defect).toBe('#123')
  })
})

describe('a non-empty finding carries its severity and its ids', () => {
  it('uses the bad wording with the real count', () => {
    const r = toResult({ ...base, affected: ['a', 'b', 'c'] })
    expect(r.severity).toBe('critical')
    expect(r.count).toBe(3)
    expect(r.verdict).toContain('3 affected')
  })

  it('reports the TOTAL even when the id list was capped by the query', () => {
    // A query that caps at 500 must not report 500 as though it were the whole truth.
    const r = toResult({ ...base, affected: ['a', 'b'], total: 4210 })
    expect(r.count).toBe(4210)
    expect(r.verdict).toContain('4210')
  })

  it('never returns more than SHOW_LIMIT ids, so a huge result cannot blow up the response', () => {
    const many = Array.from({ length: 500 }, (_, i) => `id-${i}`)
    const r = toResult({ ...base, affected: many })
    expect(r.affected).toHaveLength(SHOW_LIMIT)
    expect(r.count).toBe(500)          // the COUNT is still honest
    expect(r.affected[0]).toBe('id-0')
  })
})

describe('a check that errors is UNKNOWN — never clean', () => {
  it('reports unknown, and says out loud not to read it as clean', () => {
    const r = toUnanswered('k', 'q?', '#1', new Error('table missing'))
    expect(r.severity).toBe('unknown')
    expect(r.verdict).toContain('UNANSWERED')
    expect(r.verdict).toContain('do NOT read it as clean')
    expect(r.verdict).toContain('table missing')
  })

  it('handles a thrown non-Error without losing the reason', () => {
    expect(toUnanswered('k', 'q?', '#1', 'connection refused').verdict).toContain('connection refused')
  })

  it('an unknown check is NOT counted as clean in the summary', () => {
    // The whole failure mode this guards: a broken check inflating the "all clear" count.
    const s = summarise([toUnanswered('k', 'q', '#1', new Error('x'))])
    expect(s.unknown).toBe(1)
    expect(s.clean).toBe(0)
  })
})

describe('the headline tells the truth about what it could not see', () => {
  const mk = (severity: CheckResult['severity']): CheckResult =>
    ({ key: 'k', question: 'q', defect: 'd', severity, count: severity === 'clean' ? 0 : 1, affected: [], verdict: 'v' })

  it('critical wins over everything', () => {
    expect(headline(summarise([mk('critical'), mk('high'), mk('unknown')]))).toContain('CRITICAL')
  })

  it('high when there is no critical', () => {
    expect(headline(summarise([mk('high'), mk('clean')]))).toContain('1 problem')
  })

  it('an UNANSWERED check outranks "all clear" — the report must not claim completeness', () => {
    const h = headline(summarise([mk('clean'), mk('clean'), mk('unknown')]))
    expect(h).toContain('incomplete')
    expect(h).not.toContain('No damage found in live data.')
  })

  it('only says everything is fine when everything actually ran and passed', () => {
    expect(headline(summarise([mk('clean'), mk('clean')]))).toBe(
      'No damage found in live data. Every bug we fixed was caught before it hurt anyone.')
  })

  it('medium alone reads as tidy-up, not danger', () => {
    expect(headline(summarise([mk('medium'), mk('clean')]))).toContain('tidy')
  })
})

describe('ranking — worst first, and a clean check still shows', () => {
  const mk = (key: string, severity: CheckResult['severity']): CheckResult =>
    ({ key, question: 'q', defect: 'd', severity, count: 0, affected: [], verdict: 'v' })

  it('orders critical → high → unknown → medium → clean', () => {
    const out = rank([mk('e', 'clean'), mk('d', 'medium'), mk('c', 'unknown'), mk('b', 'high'), mk('a', 'critical')])
    expect(out.map(r => r.key)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('unknown sorts ABOVE medium — a blind spot matters more than housekeeping', () => {
    const out = rank([mk('medium', 'medium'), mk('unknown', 'unknown')])
    expect(out[0].key).toBe('unknown')
  })

  it('never drops a check', () => {
    const input = [mk('a', 'clean'), mk('b', 'critical'), mk('c', 'clean')]
    expect(rank(input)).toHaveLength(3)
  })

  it('does not mutate the input array', () => {
    const input = [mk('a', 'clean'), mk('b', 'critical')]
    rank(input)
    expect(input[0].key).toBe('a')
  })
})
