// ⚑ 1 Oct (R180 · Coaching #2497) — GROWTH REPORTING: progression counted from F1 answers only, the
// "too early" floor, the patterns being the very same What's converting findings, the suggestion
// being words only, the plan gate, and the R136/R87 bans on every string a client can read.
// Mocks only — no network, no provider, no spend.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const state = vi.hoisted(() => ({
  band: 'growth' as string | null, activated: false,
  tables: {} as Record<string, Array<Record<string, unknown>>>,
  meetings: [] as Array<{ id: string; leadId: string | null; scheduledAt: string; state: string; rescheduled: boolean }>,
  outcomes: new Map<string, { answer: string; label: string; note: string | null; at: string }>() as Map<string, { answer: string; label: string; note: string | null; at: string }> | null,
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
vi.mock('./meeting-outcome', async (orig) => ({
  ...(await orig<typeof import('./meeting-outcome')>()),
  latestOutcomes: async () => state.outcomes,
}))

import { computeGrowthReport, growthReportFor, PROGRESSION_TOO_EARLY, SUGGESTION_NOTE, type GrowthReport } from './growth-report'
import { computeWhatsConverting, TOO_EARLY, type ConvertingInput } from './whats-converting'

const BANNED = [/%/, /per ?cent/i, /\brates?\b/i, /\bratio\b/i, /\bpool\b/i, /\blimit\b/i, /\$|£|€/, /\b(contacted|sourced|emails? sent|people found)\b/i, /\d+\.\d/]
const assertClean = (s: string) => { for (const re of BANNED) expect(s, `"${s}" breaks ${re}`).not.toMatch(re) }
const strings = (g: GrowthReport) => [
  g.progression?.text ?? '', ...(g.progression?.rows.map(r => r.label) ?? []),
  ...g.patterns.map(p => p.text), g.note ?? '', g.suggestion?.text ?? '', g.suggestion?.note ?? '', g.suggestion?.ask ?? '',
]

// ── The fixture: the What's converting fixture — 4 counted meetings, 3 answered as held ────────
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
  rep('l2', 'warm', 'Could you send me more information first?', '2026-09-04T10:00:00Z'),
  rep('l3', 'interested', 'Good timing, book a slot in my calendar.', '2026-09-10T10:00:00Z'),
  rep('l4', 'hot', 'Send me more information please.', '2026-09-05T10:00:00Z'),
  rep('l5', 'warm', 'Interesting. Let us talk.', '2026-09-06T10:00:00Z'),
  rep('l6', 'referral', 'Copying in my colleague who runs this.', '2026-09-07T10:00:00Z'),
]
const SENDS = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'].map(lead_id => ({ lead_id, step: 1, sent_at: '2026-09-01T09:00:00Z' }))
const MEETINGS = [
  { id: 'm1', leadId: 'l1', state: 'HELD' }, { id: 'm2', leadId: 'l2', state: 'HELD' },
  { id: 'm3', leadId: 'l3', state: 'BOOKED' }, { id: 'm4', leadId: 'l4', state: 'HELD' },
  { id: 'm5', leadId: 'l5', state: 'NO_SHOW' },
]
const ANSWERS = () => new Map([['m1', 'next_step'], ['m2', 'next_step'], ['m4', 'not_now']] as const)
const FIXTURE = (answers: ConvertingInput['answers'] = ANSWERS()): ConvertingInput => ({ leads: LEADS, replies: REPLIES, sends: SENDS, meetings: MEETINGS, answers })

beforeEach(() => {
  state.band = 'growth'; state.activated = false; state.read = []
  state.tables = { figsy_replies: REPLIES, leads: LEADS, figsy_sent_emails: SENDS }
  state.meetings = MEETINGS.map(m => ({ ...m, scheduledAt: '2026-09-20T10:00:00Z', rescheduled: false }))
  state.outcomes = new Map([...ANSWERS().entries()].map(([id, answer]) => [id, { answer, label: '', note: null, at: '2026-09-21' }]))
  state.scope = { mode: 'ids', ids: LEADS.map(l => l.id), programmeId: 'p-1' }
})

describe('#2497 ① progression — counted from F1 answers only', () => {
  it('🛑 the fixture: 2 of 3 answered meetings progressed, with the F1 breakdown', () => {
    const g = computeGrowthReport(FIXTURE())
    expect(g.progression).toEqual({
      ready: true, answered: 3,
      rows: [{ label: 'Next step agreed', count: 2 }, { label: 'Interested, not now', count: 1 }, { label: 'Not a fit', count: 0 }],
      text: '2 of your 3 answered meetings progressed to a next step.',
    })
    expect(computeGrowthReport(FIXTURE())).toEqual(g)
  })

  it('below the minimum it says "too early" — never a thin number', () => {
    const g = computeGrowthReport(FIXTURE(new Map([['m1', 'next_step'], ['m2', 'next_step']])))
    expect(g.progression).toEqual({ ready: false, answered: 2, rows: [], text: PROGRESSION_TOO_EARLY })
    expect(g.suggestion).toBeNull()
  })

  it('"they didn\'t show" is not an answered meeting, and a NO_SHOW meeting never counts', () => {
    const g = computeGrowthReport(FIXTURE(new Map([['m1', 'next_step'], ['m2', 'no_show'], ['m4', 'not_now'], ['m5', 'next_step']])))
    expect(g.progression).toMatchObject({ ready: false, answered: 2 })
  })

  it('none progressed is said plainly', () => {
    const g = computeGrowthReport(FIXTURE(new Map([['m1', 'not_fit'], ['m2', 'not_now'], ['m4', 'not_now']])))
    expect(g.progression?.text).toBe('None of your 3 answered meetings has progressed to a next step yet.')
    expect(g.suggestion).toBeNull()
  })

  it('unreadable F1 answers → no progression at all (never "none")', () => {
    const g = computeGrowthReport(FIXTURE(null))
    expect(g.progression).toBeNull()
    expect(g.suggestion).toBeNull()
  })
})

describe('#2497 ② patterns — the very same What\'s converting findings', () => {
  it('equal the What\'s converting findings, minus the progression line ① already says', () => {
    const v = computeWhatsConverting(FIXTURE())
    expect(v.findings.some(f => f.kind === 'moved_forward')).toBe(true)
    expect(computeGrowthReport(FIXTURE()).patterns).toEqual(v.findings.filter(f => f.kind !== 'moved_forward'))
  })

  it('too little evidence → no patterns and the "too early" line', () => {
    const g = computeGrowthReport({ ...FIXTURE(), replies: REPLIES.slice(0, 1), meetings: [] })
    expect(g.patterns).toEqual([])
    expect(g.note).toBe(TOO_EARLY)
  })
})

describe('#2497 ③ the suggestion — only where next steps cluster, and words only', () => {
  it('next steps clustered by role → a suggestion naming that role, with the approval note', () => {
    expect(computeGrowthReport(FIXTURE()).suggestion).toEqual({
      text: 'Aim the next wave more at Operations leads — that is where your next steps are coming from.',
      note: SUGGESTION_NOTE,
      ask: 'Should we aim the next wave more at Operations leads?',
    })
    expect(SUGGESTION_NOTE).toBe('Only a suggestion. Nothing changes unless you approve it.')
  })

  it('no role pattern, but an industry one → the industry', () => {
    const g = computeGrowthReport(FIXTURE(new Map([['m1', 'next_step'], ['m4', 'next_step'], ['m2', 'not_now']])))
    expect(g.suggestion?.text).toContain('Facilities Services companies')
  })

  it('no cluster → no suggestion', () => {
    const g = computeGrowthReport(FIXTURE(new Map([['m3', 'next_step'], ['m4', 'next_step'], ['m2', 'not_now']])))
    expect(g.progression?.ready).toBe(true)
    expect(g.suggestion).toBeNull()
  })

  const ROOT = join(__dirname, '..', '..', '..', '..')
  const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')
  it('🛑 nothing writes: the lib has no write, the route is a GET, the screen only asks Milla', () => {
    const lib = read('apps/api/src/lib/growth-report.ts')
    expect(lib).not.toMatch(/\.(insert|update|upsert|delete)\(/)
    const route = read('apps/api/src/routes/my-programme.ts')
    expect(route).toContain("myProgrammeRouter.get('/growth-report'")
    expect(route).not.toMatch(/myProgrammeRouter\.(post|put|patch|delete)\('\/growth-report/)
    expect(route.slice(route.indexOf("get('/growth-report'"))).toContain('data: { report: r.report }')
    const page = read('apps/portal/src/app/(milla)/milla/reports/page.tsx')
    expect(page).toContain("'/my/programme/growth-report'")
    expect(page).toContain('ask(g.suggestion!.ask)')
    expect(page).not.toContain('api.post')
  })
})

describe('🛑 R136 · R87 — no rate, no pool, no money, in anything a client can read', () => {
  it('every string across the fixtures and the constants', () => {
    const all = [
      FIXTURE(), FIXTURE(null), FIXTURE(new Map([['m1', 'not_fit'], ['m2', 'not_now'], ['m4', 'not_now']])),
      FIXTURE(new Map([['m1', 'next_step'], ['m4', 'next_step'], ['m2', 'not_now']])), { ...FIXTURE(), meetings: [] },
    ].flatMap(f => strings(computeGrowthReport(f)))
    expect(all.filter(Boolean).length).toBeGreaterThan(15)
    for (const s of [...all, PROGRESSION_TOO_EARLY, SUGGESTION_NOTE]) assertClean(s)
  })

  it('RED PROOF for the scan itself — it catches each banned shape', () => {
    for (const bad of ['67% progressed', 'a progression rate of 2', 'from a pool of 400', 'worth $4,000', 'of the 300 people contacted', '0.7 meetings']) {
      expect(BANNED.some(re => re.test(bad)), bad).toBe(true)
    }
  })
})

describe('#2497 — the plan gate (growthExtras: Growth, Enterprise, or Full Coaching)', () => {
  it('🛑 Founders get `report: null` — and their rows are never read', async () => {
    state.band = 'founders'
    expect(await growthReportFor('c-1')).toEqual({ ok: true, report: null })
    expect(state.read).not.toContain('figsy_replies')
  })

  it('no programme at all → no report, never unlocked on a guess', async () => {
    state.band = null
    expect(await growthReportFor('c-1')).toEqual({ ok: true, report: null })
  })

  it('Growth, Enterprise and Founders-with-Full-Coaching get the report from their own rows', async () => {
    for (const [band, activated] of [['growth', false], ['enterprise', false], ['founders', true]] as const) {
      state.band = band; state.activated = activated
      const r = await growthReportFor('c-1')
      expect(r.ok && r.report?.progression?.text, `${band}${activated ? '+full' : ''}`).toBe('2 of your 3 answered meetings progressed to a next step.')
    }
  })

  it('an unreadable scope is a 503, never an empty report', async () => {
    state.scope = { mode: 'unreadable', reason: 'x' }
    expect(await growthReportFor('c-1')).toMatchObject({ ok: false, status: 503 })
  })

  it('unreadable F1 answers keep the patterns but drop the progression', async () => {
    state.outcomes = null
    const r = await growthReportFor('c-1')
    expect(r.ok && r.report?.progression).toBeNull()
    expect(r.ok && r.report?.patterns.length).toBeGreaterThan(0)
  })
})
