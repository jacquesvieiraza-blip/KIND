import { describe, it, expect } from 'vitest'
import {
  toResult, toUnanswered, summarise, headline, rank, SHOW_LIMIT,
  countsAsCannotSend, countsAsDoubleGrant, isMbfAccount,
  type CheckResult, type Finding,
  isRealClient, excludeDemoRows, demoLookupFailed,
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

// ── THE THREE THAT GOT IT WRONG ON THE FIRST LIVE RUN ────────────────────────────
//
// Every one of these was judgement inlined in a query, where nothing could test it. They are
// pure now, and each test is the exact live case that produced a false finding.

describe('countsAsCannotSend — a demo is not a stranded client', () => {
  it('EXCLUDES a demo account', () => {
    // The live run reported CRITICAL: "1 client has PAID and cannot send" — about the demo.
    // Demos cannot send BY DESIGN: is_demo is a hard stop and every address is .invalid.
    expect(countsAsCannotSend(true)).toBe(false)
  })

  it('still counts a real client', () => {
    expect(countsAsCannotSend(false)).toBe(true)
  })
})

describe('countsAsDoubleGrant — a purchase is required, not just a balance', () => {
  it('does NOT flag a client who never paid us', () => {
    // The live case: a client with wallet money from a manual grant, zero purchases. The bug
    // being looked for cannot have touched them — there was no payment to double-grant.
    expect(countsAsDoubleGrant(0, 0)).toBe(false)
    expect(countsAsDoubleGrant(0, 50)).toBe(false)
  })

  it('DOES flag a client who paid and still holds an unspent pack', () => {
    // That is the real signature: they paid, and got both the 100 free leads and the dollars.
    expect(countsAsDoubleGrant(1, 0)).toBe(true)
    expect(countsAsDoubleGrant(1, 99)).toBe(true)
  })

  it('does not flag a client who has worked past the pack — the balance is legitimately theirs', () => {
    expect(countsAsDoubleGrant(1, 100)).toBe(false)
    expect(countsAsDoubleGrant(2, 250)).toBe(false)
  })
})

describe('isMbfAccount — match the name, not one exact string', () => {
  it('matches the live account name', () => {
    // The live account is "MBF Demo". An exact match on "MBF Holdings" reported that it did
    // not exist, while it was sitting in the client list.
    expect(isMbfAccount('MBF Demo')).toBe(true)
    expect(isMbfAccount('MBF Holdings')).toBe(true)
  })

  it('is case-insensitive, because a name typed by hand will not be consistent', () => {
    expect(isMbfAccount('mbf demo')).toBe(true)
    expect(isMbfAccount('Mbf Holdings Ltd')).toBe(true)
  })

  it('does not match an unrelated client', () => {
    expect(isMbfAccount('Acme Corp')).toBe(false)
    expect(isMbfAccount('K.I.N.D')).toBe(false)
  })

  it('handles a missing name rather than throwing mid-report', () => {
    expect(isMbfAccount(null)).toBe(false)
    expect(isMbfAccount(undefined)).toBe(false)
    expect(isMbfAccount('')).toBe(false)
  })
})

// ── DEMOS ARE NOT FINDINGS ────────────────────────────────────────────────────────────
//
// On the first live run, three of eight checks fired on demo accounts and all three were
// wrong — the worst being a CRITICAL *"a client has paid and cannot be delivered"* about an
// account that cannot send BY DESIGN. The founder's point, and it is the whole risk: a check
// that cries wolf about invented companies is a check you learn to ignore, and then it misses
// the real one.
describe('isRealClient / excludeDemoRows', () => {
  const demos = new Set(['demo-1', 'demo-2'])

  it('a demo client is never a finding', () => {
    expect(isRealClient('demo-1', demos)).toBe(false)
    expect(isRealClient('demo-2', demos)).toBe(false)
  })

  it('a real client still is', () => {
    expect(isRealClient('real-1', demos)).toBe(true)
  })

  it('drops only the demo rows and keeps the rest intact', () => {
    const rows = [
      { client_id: 'real-1', id: 'a' },
      { client_id: 'demo-1', id: 'b' },
      { client_id: 'real-2', id: 'c' },
      { client_id: 'demo-2', id: 'd' },
    ]
    expect(excludeDemoRows(rows, demos).map(r => r.id)).toEqual(['a', 'c'])
  })

  it('with no demos at all, nothing is dropped', () => {
    // The empty case matters: a fresh system with zero demos must not silently lose findings.
    const rows = [{ client_id: 'real-1', id: 'a' }, { client_id: 'real-2', id: 'b' }]
    expect(excludeDemoRows(rows, new Set())).toHaveLength(2)
  })

  it('every row being a demo yields nothing — which is CLEAN, not hidden', () => {
    const rows = [{ client_id: 'demo-1', id: 'a' }, { client_id: 'demo-2', id: 'b' }]
    expect(excludeDemoRows(rows, demos)).toHaveLength(0)
  })
})

describe('demoLookupFailed', () => {
  it('says the report is UNANSWERED, and explicitly says NOT clean', () => {
    // If we cannot tell demos from real clients, a green report is a lie in both directions.
    const msg = demoLookupFailed(new Error('connection refused'))
    expect(msg).toContain('UNANSWERED')
    expect(msg).toContain('not clean')
    expect(msg).toContain('connection refused')
  })
})
