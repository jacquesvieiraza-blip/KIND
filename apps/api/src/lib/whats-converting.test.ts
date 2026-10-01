// ⚑ 1 Oct (R180 · Coaching #2494) — WHAT'S CONVERTING: the plan gate, the "too early" floor, the
// findings counted from fixture rows, and the R136/R87 bans (no rate, no pool, no money) asserted
// on every string a client can read. Mocks only — no network, no provider, no spend.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const state = vi.hoisted(() => ({
  band: 'growth' as string | null, activated: false,
  tables: {} as Record<string, Array<Record<string, unknown>>>,
  meetings: [] as Array<{ id: string; leadId: string | null; scheduledAt: string; state: string; rescheduled: boolean }>,
  outcomes: new Map<string, { answer: string; label: string; note: string | null; at: string }>(),
  scope: { mode: 'ids', ids: [] as string[], programmeId: 'p-1' } as Record<string, unknown>,
  read: [] as string[],
}))
vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      state.read.push(t)
      let rows: Array<Record<string, unknown>> =
        t === 'programmes' ? (state.band ? [{ id: 'p-1', size_band: state.band, status: 'LIVE', created_at: '2026-09-01' }] : [])
        : t === 'coaching_activations' ? (state.activated ? [{ id: 'a-1' }] : [])
        : [...(state.tables[t] ?? [])]
      const q: Record<string, unknown> = {
        select() { return q }, eq() { return q }, neq() { return q }, order() { return q }, limit() { return q }, is() { return q },
        in(col: string, vals: unknown[]) { rows = rows.filter(r => vals.includes(r[col])); return q },
        then(r: (v: unknown) => unknown) { return Promise.resolve(r({ data: rows, error: null })) },
      }
      return q
    },
  },
}))
vi.mock('./current-outreach', () => ({ currentOutreachLeads: async () => state.scope }))
vi.mock('./meeting-truth', () => ({ meetingsForClient: async () => state.meetings }))
vi.mock('./meeting-outcome', () => ({ latestOutcomes: async () => state.outcomes }))

import {
  computeWhatsConverting, whatsConvertingFor, describeWhatsConverting, ownWords, roleOf,
  TOO_EARLY, NOT_IN_PLAN, type ConvertingInput,
} from './whats-converting'

/** Every client-visible string must pass this. R136: no rate, no pool, no limit. R87: no money. */
const BANNED = [/%/, /per ?cent/i, /\brates?\b/i, /\bratio\b/i, /\bpool\b/i, /\blimit\b/i, /\$|£|€/, /\b(contacted|sourced|emails? sent|people found)\b/i, /\d+\.\d/]
const assertClean = (s: string) => { for (const re of BANNED) expect(s, `"${s}" breaks ${re}`).not.toMatch(re) }

// ── The fixture: a Growth programme that has booked 4 meetings and had 6 positive replies ─────
const LEADS = [
  { id: 'l1', job_title: 'Head of Operations', seniority: 'head', industry: 'facilities services' },
  { id: 'l2', job_title: 'Operations Director', seniority: 'director', industry: 'Facilities Services' },
  { id: 'l3', job_title: 'VP Operations', seniority: 'vp', industry: 'Logistics' },
  { id: 'l4', job_title: 'Finance Director', seniority: 'director', industry: 'Facilities Services' },
  { id: 'l5', job_title: 'Financial Controller', seniority: 'manager', industry: 'Logistics' },
  { id: 'l6', job_title: 'Finance Manager', seniority: 'manager', industry: 'Retail' },
]
const rep = (lead_id: string, classification: string, body_text: string, received_at: string) => ({ lead_id, classification, body_text, received_at })
const REPLIES = [
  rep('l1', 'hot', 'Yes — happy to have a call next week.', '2026-09-03T10:00:00Z'),
  rep('l2', 'warm', 'Could you send me more information first?\n\nOn Mon, Kim wrote:\n> happy to jump on a call', '2026-09-04T10:00:00Z'),
  rep('l3', 'interested', 'Good timing, book a slot in my calendar.', '2026-09-10T10:00:00Z'),
  rep('l4', 'hot', 'Send me more information please.', '2026-09-05T10:00:00Z'),
  rep('l5', 'warm', 'Interesting. Let us talk.', '2026-09-06T10:00:00Z'),
  rep('l6', 'referral', 'Copying in my colleague who runs this.', '2026-09-07T10:00:00Z'),
  rep('l9', 'cold', 'No thanks.', '2026-09-07T10:00:00Z'),
]
const send = (lead_id: string, step: number, sent_at: string) => ({ lead_id, step, sent_at })
const SENDS = [
  send('l1', 1, '2026-09-01T09:00:00Z'), send('l2', 1, '2026-09-01T09:00:00Z'), send('l3', 1, '2026-09-01T09:00:00Z'),
  send('l3', 2, '2026-09-05T09:00:00Z'), send('l4', 1, '2026-09-01T09:00:00Z'), send('l5', 1, '2026-09-01T09:00:00Z'),
  send('l6', 1, '2026-09-01T09:00:00Z'), send('l6', 2, '2026-09-05T09:00:00Z'),
  // Sent AFTER the reply — it did not draw it.
  send('l1', 2, '2026-09-08T09:00:00Z'),
]
const MEETINGS = [
  { id: 'm1', leadId: 'l1', state: 'HELD' }, { id: 'm2', leadId: 'l2', state: 'HELD' },
  { id: 'm3', leadId: 'l3', state: 'BOOKED' }, { id: 'm4', leadId: 'l4', state: 'HELD' },
  { id: 'm5', leadId: 'l5', state: 'NO_SHOW' },
]
const FIXTURE = (): ConvertingInput => ({
  leads: LEADS, replies: REPLIES, sends: SENDS, meetings: MEETINGS,
  answers: new Map([['m1', 'next_step'], ['m2', 'next_step'], ['m4', 'not_now']]),
})

beforeEach(() => {
  state.band = 'growth'; state.activated = false; state.read = []
  state.tables = { figsy_replies: REPLIES, leads: LEADS, figsy_sent_emails: SENDS }
  state.meetings = MEETINGS.map(m => ({ ...m, scheduledAt: '2026-09-20T10:00:00Z', rescheduled: false }))
  state.outcomes = new Map([
    ['m1', { answer: 'next_step', label: '', note: null, at: '2026-09-21' }],
    ['m2', { answer: 'next_step', label: '', note: null, at: '2026-09-21' }],
    ['m4', { answer: 'not_now', label: '', note: null, at: '2026-09-21' }],
  ])
  state.scope = { mode: 'ids', ids: LEADS.map(l => l.id).concat('l9'), programmeId: 'p-1' }
})

describe("#2494 — the findings, counted from the client's own rows", () => {
  it('🛑 the fixture gives exactly these findings, in this order, every time', () => {
    const v = computeWhatsConverting(FIXTURE())
    expect(v.ready).toBe(true)
    expect(v.basis).toEqual({ positiveReplies: 6, meetings: 4 })
    expect(v.findings.map(f => f.text)).toEqual([
      '3 of your 4 meetings came from Operations leads.',
      // No seniority line: meetings head·director·vp·director (directors 2 of 4 is not more than
      // half), replies head 1 · director 2 · vp 1 · manager 2 — no majority either.
      '3 of your 4 meetings came from Facilities Services companies.',
      // l3 and l6 replied after their second email; l1's second email went AFTER its reply.
      '4 of your 6 positive replies came after your first email.',
      '3 of your 6 positive replies asked for a call or a time to talk.',
      '2 of your 6 positive replies asked for more detail first.',
      '2 of your 3 meetings so far agreed a next step.',
      'Both of your meetings that agreed a next step were with Operations leads.',
    ])
    // The same rows twice give the same answer.
    expect(computeWhatsConverting(FIXTURE())).toEqual(v)
  })

  it('a no-show is not a conversion, and a cold reply is not a positive one', () => {
    const v = computeWhatsConverting(FIXTURE())
    expect(v.basis.meetings).toBe(4)
    expect(v.basis.positiveReplies).toBe(6)
  })

  it("only the client's own words count toward a theme — our email quoted underneath does not", () => {
    expect(ownWords('Send more info.\n\nOn Mon 1 Sep, Kim wrote:\n> jump on a call')).toBe('Send more info.')
    expect(ownWords('Sure.\n> a call')).toBe('Sure.')
    // Two replies that quote OUR "call" line under their own words: without the cut they would
    // make "asked for a call" a finding; with it they do not.
    const quoted = '\n\nOn Mon, Kim wrote:\n> happy to jump on a call'
    const only = computeWhatsConverting({ ...FIXTURE(), meetings: [], replies: [
      rep('l2', 'warm', 'Send me more information.' + quoted, '2026-09-04T10:00:00Z'),
      rep('l4', 'hot', 'Interesting, tell me more information.' + quoted, '2026-09-05T10:00:00Z'),
      rep('l6', 'referral', 'Copying in my colleague.', '2026-09-07T10:00:00Z'),
    ] })
    expect(only.ready).toBe(true)
    expect(only.findings.some(f => /a call/.test(f.text))).toBe(false)
  })

  it('a job title becomes a function by keyword; an unknown title is left out, never guessed', () => {
    expect(roleOf('Chief Operating Officer')).toBe('C-level')
    expect(roleOf('Facilities Manager')).toBe('Operations')
    expect(roleOf('Astronaut')).toBeNull()
    expect(roleOf(null)).toBeNull()
  })

  it('the email step is the last one sent BEFORE the reply arrived', () => {
    // l1's second email moved to BEFORE its reply → step 1 drops to 3 of 6: no longer more than half.
    const v = computeWhatsConverting({ ...FIXTURE(), sends: [...SENDS, send('l1', 2, '2026-09-02T09:00:00Z')] })
    expect(v.findings.some(f => f.kind === 'step')).toBe(false)
  })

  it('a role that replies warmly but has not booked is named — with its count, nothing else', () => {
    const v = computeWhatsConverting({ ...FIXTURE(), meetings: MEETINGS.filter(m => m.id !== 'm4') })
    expect(v.findings.find(f => f.kind === 'role_replied_not_booked')?.text)
      .toBe('Finance leads replied positively 3 times but none has booked yet.')
  })
})

describe('#2494 — a pattern needs evidence', () => {
  it('🛑 below three positive outcomes the answer is "too early" — and nothing else', () => {
    const v = computeWhatsConverting({ leads: LEADS, replies: REPLIES.slice(0, 2), sends: SENDS, meetings: [], answers: new Map() })
    expect(v).toEqual({ ready: false, findings: [], note: TOO_EARLY, basis: { positiveReplies: 2, meetings: 0 } })
    expect(TOO_EARLY).toBe('Too early to say — this fills in as replies and meetings come in.')
  })

  it('one example is not a pattern: a 1-1-1 split says nothing about roles', () => {
    const leads = [
      { id: 'a1', job_title: 'Head of Operations' }, { id: 'a2', job_title: 'Finance Director' }, { id: 'a3', job_title: 'Sales Director' },
    ]
    const v = computeWhatsConverting({
      leads, replies: [], sends: [], answers: new Map(),
      meetings: leads.map((l, i) => ({ id: `m${i}`, leadId: l.id, state: 'BOOKED' })),
    })
    expect(v.ready).toBe(true)
    expect(v.findings.filter(f => f.kind === 'role')).toEqual([])
  })

  it('F1 says nothing about meetings moving forward until three have been answered', () => {
    const v = computeWhatsConverting({ ...FIXTURE(), answers: new Map([['m1', 'next_step'], ['m2', 'not_now']]) })
    expect(v.findings.some(f => f.kind === 'moved_forward')).toBe(false)
    // An unreadable F1 read is skipped, never guessed.
    expect(computeWhatsConverting({ ...FIXTURE(), answers: null }).findings.some(f => f.kind === 'moved_forward')).toBe(false)
  })
})

describe('🛑 R136 · R87 — no rate, no pool, no money, in anything a client can read', () => {
  it('every finding, the "too early" line and the plan line', () => {
    const fixtures: ConvertingInput[] = [
      FIXTURE(),
      { ...FIXTURE(), answers: new Map([['m1', 'not_fit'], ['m2', 'not_now'], ['m4', 'not_now']]) },
      { ...FIXTURE(), meetings: [] },
      { ...FIXTURE(), replies: REPLIES.map(r => ({ ...r, classification: 'hot' })) },
    ]
    const strings = fixtures.flatMap(f => { const v = computeWhatsConverting(f); return [...v.findings.map(x => x.text), v.note ?? ''] })
    expect(strings.length).toBeGreaterThan(10)
    for (const s of [...strings, TOO_EARLY, NOT_IN_PLAN]) assertClean(s)
  })

  it('RED PROOF for the scan itself — it catches each banned shape', () => {
    for (const bad of ['75% of meetings', 'a 3 percent reply rate', 'from a pool of 400', 'worth $4,000', 'of the 300 people contacted', '0.5 meetings']) {
      expect(BANNED.some(re => re.test(bad)), bad).toBe(true)
    }
  })
})

describe('#2494 — the plan gate (R180: Growth and above, or Full Coaching)', () => {
  it('🛑 Founders get 403 with the plan line — and their rows are never read', async () => {
    state.band = 'founders'
    expect(await whatsConvertingFor('c-1')).toEqual({ ok: false, status: 403, error: NOT_IN_PLAN })
    expect(NOT_IN_PLAN).toBe("What's converting comes with Growth or Full Coaching.")
    expect(state.read).not.toContain('figsy_replies')
  })

  it('no programme at all is the lowest tier, never unlocked on a guess', async () => {
    state.band = null
    expect(await whatsConvertingFor('c-1')).toMatchObject({ ok: false, status: 403 })
  })

  it('Growth, Enterprise and Founders-with-Full-Coaching get the findings from their own rows', async () => {
    for (const [band, activated] of [['growth', false], ['enterprise', false], ['founders', true]] as const) {
      state.band = band; state.activated = activated
      const r = await whatsConvertingFor('c-1')
      expect(r.ok, `${band}${activated ? '+full' : ''}`).toBe(true)
      if (r.ok) expect(r.data.findings.map(f => f.text)).toEqual(computeWhatsConverting(FIXTURE()).findings.map(f => f.text))
    }
  })

  it('only the current programme counts: a positive reply outside its people is left out', async () => {
    state.scope = { mode: 'ids', ids: ['l1', 'l2'], programmeId: 'p-1' }
    state.meetings = []
    const r = await whatsConvertingFor('c-1')
    expect(r).toMatchObject({ ok: true, data: { ready: false, basis: { positiveReplies: 2, meetings: 0 } } })
  })

  it('an unreadable scope is a 503, never an empty "too early"', async () => {
    state.scope = { mode: 'unreadable', reason: 'x' }
    expect(await whatsConvertingFor('c-1')).toMatchObject({ ok: false, status: 503 })
  })
})

describe("#2494 — one answer: the screen and Milla's \"What's working?\" read the same function", () => {
  const ROOT = join(__dirname, '..', '..', '..', '..')
  const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

  it('the chat block carries the very same finding sentences', () => {
    const v = computeWhatsConverting(FIXTURE())
    const block = describeWhatsConverting(v)
    for (const f of v.findings) expect(block).toContain(`- ${f.text}`)
    expect(describeWhatsConverting(computeWhatsConverting({ ...FIXTURE(), replies: [], meetings: [] }))).toContain(TOO_EARLY)
    expect(describeWhatsConverting(null)).toBe('')
  })

  it('🛑 the desk chat reads it inside the ONE parallel batch, and the route and the screen are wired', () => {
    const milla = read('apps/api/src/lib/milla.ts')
    const batch = milla.slice(milla.indexOf('await Promise.all(['), milla.indexOf('const hasContext'))
    expect(batch).toContain('whatsConvertingFor(clientId)')
    expect(milla).toContain('describeWhatsConverting(converting)')
    const route = read('apps/api/src/routes/my-programme.ts')
    expect(route).toContain("myProgrammeRouter.get('/whats-converting'")
    expect(route).toContain('whatsConvertingFor(clientId)')
    expect(read('apps/portal/src/components/milla/WhatsConverting.tsx')).toContain("'/my/programme/whats-converting'")
    expect(read('apps/portal/src/components/milla/ProgrammeOutcome.tsx')).toContain('<WhatsConverting />')
  })
})
