import { describe, it, expect, vi, beforeEach } from 'vitest'

// THE REPLY CHAIN — one test per defect, each written so it FAILS against the old code.
//
// These drive the real functions against a mocked database, not a re-implementation of the
// logic. That distinction is the whole reason #566 survived eighteen green tests: the suite
// called the pure function with 99 while the route handed it 100.

type Row = Record<string, unknown>

let leadsByEmail: Row[] = []
let leadsError: { message: string } | null = null
let blocklistError: { message: string } | null = null
let enrolError: { message: string } | null = null
let leadUpdError: { message: string } | null = null

const upserts: Row[] = []
const updates: Array<{ table: string; patch: Row }> = []
const alerts: Array<{ kind: string; subject: string; lines: string[] }> = []

function makeQuery(table: string) {
  const q: Record<string, unknown> = {}
  const chain = () => q
  // `ilike` added 29 Aug (BUILD-003 item 6): the provider-eviction blocker matches
  // `leads.email` case-insensitively, because leads store the raw address (HC-1/F10) and an
  // opt-out that misses on case is an opt-out nobody ever actions.
  for (const m of ['select', 'eq', 'in', 'not', 'order', 'limit', 'gte', 'ilike']) q[m] = chain
  // `select(...).eq(...).limit(...)` is awaited directly — resolve as a thenable.
  q.then = (resolve: (v: unknown) => void) => {
    if (table === 'leads') resolve({ data: leadsByEmail, error: leadsError })
    else resolve({ data: [], error: null })
  }
  q.upsert = async (row: Row) => {
    upserts.push({ table, ...row })
    return { error: table === 'opt_out_blocklist' ? blocklistError : null }
  }
  q.update = (patch: Row) => {
    updates.push({ table, patch })
    const u: Record<string, unknown> = {}
    const err = table === 'figsy_enrollments' ? enrolError : table === 'leads' ? leadUpdError : null
    for (const m of ['eq', 'in']) u[m] = async () => ({ error: err })
    return u
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => makeQuery(t) } }))
vi.mock('./alerts', () => ({
  sendFounderAlert: vi.fn(async (kind: string, subject: string, lines: string[]) => {
    alerts.push({ kind, subject, lines })
  }),
}))

import {
  parseFromAddress, isUnusable, findLeadMatches, suppressOptOut, alertDroppedReply,
  REPLY_LOOKUP_STATUSES, REPLY_ACTIVE_STATUSES, describeBodyFetch,
} from './reply-ingest'

beforeEach(() => {
  leadsByEmail = []; leadsError = null
  blocklistError = null; enrolError = null; leadUpdError = null
  upserts.length = 0; updates.length = 0; alerts.length = 0
})

// ── R1 ────────────────────────────────────────────────────────────────────────────────
// The worst of the five. `.eq('email', x).maybeSingle()` ERRORS on more than one row, so a
// prospect worked by two clients produced `lead = null` and a silent 200 — the reply was
// gone forever. Two clients prospecting the same person is ordinary; the pool is shared.
describe('R1 — a reply matching leads at TWO clients', () => {
  it('returns EVERY match, not one, and not none', async () => {
    leadsByEmail = [
      { id: 'lead-a', client_id: 'client-1' },
      { id: 'lead-b', client_id: 'client-2' },
    ]
    const matches = await findLeadMatches('shared@prospect.com')
    expect(matches).toHaveLength(2)
    expect(matches.map(m => m.client_id).sort()).toEqual(['client-1', 'client-2'])
  })

  it('still works for the ordinary single-client case', async () => {
    leadsByEmail = [{ id: 'lead-a', client_id: 'client-1' }]
    expect(await findLeadMatches('one@prospect.com')).toHaveLength(1)
  })

  it('an unknown address is empty, NOT an error', async () => {
    expect(await findLeadMatches('stranger@nowhere.com')).toEqual([])
  })

  it('THROWS when the lookup itself fails — never silently returns none', async () => {
    // A failed lookup that returns [] is indistinguishable from "nobody matched", and that
    // is precisely how a real reply gets dropped behind a 200.
    leadsError = { message: 'connection reset' }
    await expect(findLeadMatches('x@y.com')).rejects.toMatchObject({ message: 'connection reset' })
  })
})

// ── R2 / R3 ───────────────────────────────────────────────────────────────────────────
describe('R2 / R3 — an unusable reply is a finding, not a silent 200', () => {
  it('flags an empty body', () => {
    expect(isUnusable({ fromEmail: 'a@b.com', body: '' })).toBe('no_body')
  })

  it('flags a whitespace-only body — the Resend fetch failing looks exactly like this', () => {
    expect(isUnusable({ fromEmail: 'a@b.com', body: '   \n\t ' })).toBe('no_body')
  })

  it('flags a missing sender', () => {
    expect(isUnusable({ fromEmail: '', body: 'hello' })).toBe('no_sender')
  })

  it('passes a real reply through', () => {
    expect(isUnusable({ fromEmail: 'a@b.com', body: 'Yes, Tuesday works' })).toBe(false)
  })

  it('alerts the founder, and the alert names where to GO and find it', async () => {
    await alertDroppedReply('the body arrived empty', {
      fromEmail: 'lost@prospect.com', subject: 'Re: quick question',
      provider: 'resend', providerMessageId: 'em_123',
    })
    expect(alerts).toHaveLength(1)
    const text = alerts[0].subject + '\n' + alerts[0].lines.join('\n')
    expect(text).toContain('lost@prospect.com')
    expect(text).toContain('em_123')       // findable in the provider
    expect(text).toContain('resend')
  })
})

// ── R6 ────────────────────────────────────────────────────────────────────────────────
// A hot reply sets the enrollment to `replied`. The lookup filtered to
// ['enrolled','in_progress'], so the SECOND reply matched nothing, arrived with no
// enrollment, and skipped every hot path — no client push, no founder alert, no CRM deal,
// no counter. The most valuable reply in the funnel is usually the second one.
describe('R6 — a second reply from someone who already replied', () => {
  it('the lookup includes `replied`', () => {
    expect([...REPLY_LOOKUP_STATUSES]).toContain('replied')
  })

  it('and still includes the two active states', () => {
    expect([...REPLY_LOOKUP_STATUSES]).toEqual(
      expect.arrayContaining(['enrolled', 'in_progress']))
  })

  it('but ACTIVE stays only the two that are actually sending', () => {
    // These must not collapse into one another: `replied` means "attach a reply to it",
    // NOT "this sequence is still sending".
    expect([...REPLY_ACTIVE_STATUSES]).toEqual(['enrolled', 'in_progress'])
    expect([...REPLY_ACTIVE_STATUSES]).not.toContain('replied')
  })
})

// ── R7 ────────────────────────────────────────────────────────────────────────────────
// All three writes were unchecked. The blocklist is the single suppression source the send
// path consults, so a silent failure means we keep emailing someone who told us to stop.
describe('R7 — the opt-out writes are checked, and a failure is escalated', () => {
  it('writes all three when everything works, and reports ok', async () => {
    const r = await suppressOptOut('stop@prospect.com', ['enrol-1'])
    expect(r.ok).toBe(true)
    expect(r.failures).toEqual([])
    expect(upserts.map(u => u.table)).toContain('opt_out_blocklist')
    expect(updates.map(u => u.table)).toEqual(
      expect.arrayContaining(['figsy_enrollments', 'leads']))
    expect(alerts).toHaveLength(0)
  })

  it('a FAILED BLOCKLIST WRITE is reported and alerted — this is the one with a legal edge', async () => {
    blocklistError = { message: 'permission denied for table opt_out_blocklist' }
    const r = await suppressOptOut('stop@prospect.com', ['enrol-1'])
    expect(r.ok).toBe(false)
    expect(r.failures.join(' ')).toContain('blocklist')
    expect(alerts).toHaveLength(1)
    const text = alerts[0].subject + '\n' + alerts[0].lines.join('\n')
    expect(text).toContain('stop@prospect.com')       // names the person, so it is actionable
    expect(text).toContain('NOT suppressed')          // says plainly that mail will continue
  })

  it('a failed enrollment write is reported but says the blocklist DID hold', async () => {
    enrolError = { message: 'deadlock detected' }
    const r = await suppressOptOut('stop@prospect.com', ['enrol-1'])
    expect(r.ok).toBe(false)
    expect(alerts[0].lines.join('\n')).toContain('blocklist write succeeded')
  })

  it('collects EVERY failure rather than stopping at the first', async () => {
    blocklistError = { message: 'a' }; enrolError = { message: 'b' }; leadUpdError = { message: 'c' }
    const r = await suppressOptOut('stop@prospect.com', ['enrol-1'])
    expect(r.failures).toHaveLength(3)
  })

  it('with no enrollment it still suppresses — the blocklist is what stops mail', async () => {
    const r = await suppressOptOut('stop@prospect.com', [])
    expect(r.ok).toBe(true)
    expect(upserts.map(u => u.table)).toContain('opt_out_blocklist')
    expect(updates.map(u => u.table)).not.toContain('figsy_enrollments')
  })
})

describe('parseFromAddress', () => {
  it('reads Name <email>', () => {
    expect(parseFromAddress('Thabo Nkosi <thabo@acme.co.za>'))
      .toEqual({ email: 'thabo@acme.co.za', name: 'Thabo Nkosi' })
  })
  it('reads a bare address', () => {
    expect(parseFromAddress('thabo@acme.co.za'))
      .toEqual({ email: 'thabo@acme.co.za', name: null })
  })
  it('lowercases and trims — matching is case-sensitive at the database', () => {
    expect(parseFromAddress('  Thabo@ACME.co.za  ').email).toBe('thabo@acme.co.za')
  })
  it('strips quotes around a display name', () => {
    expect(parseFromAddress('"Nkosi, Thabo" <t@a.com>').name).toBe('Nkosi, Thabo')
  })
})

// ── P2-2 ──────────────────────────────────────────────────────────────────────────────
// R3 alerted, but the reason stayed in `console.error`. One message covered FOUR different
// situations and described three of them wrongly. Telling the founder "the prospect sent an
// empty email" when the truth is "Resend returned 500" points at the wrong thing entirely:
// one is a quirk to ignore, the other is our pipeline down with every reply being lost.
describe('P2-2 — describeBodyFetch says WHICH failure it was', () => {
  it('an HTTP failure names the status, and says it is OURS not the prospect', () => {
    const d = describeBodyFetch({ messageId: 'em_1', attempted: true, failure: 'Resend returned HTTP 500 for em_1. upstream error' })
    expect(d.why).toContain('could NOT be fetched')
    expect(d.detail).toContain('HTTP 500')
    expect(d.detail).toContain('not an empty email from the prospect')
    expect(d.detail).toContain('every reply is being lost')
  })

  it('a thrown request error is carried through verbatim', () => {
    const d = describeBodyFetch({ messageId: 'em_2', attempted: true, failure: 'The request to Resend for em_2 failed: ETIMEDOUT' })
    expect(d.detail).toContain('ETIMEDOUT')
  })

  it('a MISSING KEY says we never asked — the case the old wording lied about hardest', () => {
    // The fetch is guarded on RESEND_API_KEY. Without it the request never happens, and the
    // old alert still claimed the fetch "returned nothing".
    const d = describeBodyFetch({ messageId: 'em_3', attempted: false, failure: 'RESEND_API_KEY is not set, so the body fetch was never attempted.' })
    expect(d.why).toContain('we never asked')
    expect(d.detail).toContain('RESEND_API_KEY')
    expect(d.detail).toContain('Every reply will be affected')
  })

  it('a genuinely empty body is the ONLY case that says "empty"', () => {
    const d = describeBodyFetch({ messageId: 'em_4', attempted: true, failure: null })
    expect(d.why).toBe('the body arrived empty')
    expect(d.detail).toContain('may genuinely be an empty message')
  })

  it('the four readings are all DIFFERENT — that is the whole fix', () => {
    const whys = [
      describeBodyFetch({ messageId: 'x', attempted: true,  failure: 'HTTP 500' }).why,
      describeBodyFetch({ messageId: 'x', attempted: false, failure: 'no key' }).why,
      describeBodyFetch({ messageId: 'x', attempted: true,  failure: null }).why,
    ]
    expect(new Set(whys).size).toBe(3)
  })

  it('never blames the prospect when the failure was ours', () => {
    for (const f of ['HTTP 500', 'HTTP 429 rate limited', 'ETIMEDOUT']) {
      expect(describeBodyFetch({ messageId: 'x', attempted: true, failure: f }).why)
        .not.toContain('arrived empty')
    }
  })
})
