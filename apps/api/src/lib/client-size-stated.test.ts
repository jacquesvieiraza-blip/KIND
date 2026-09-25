// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R168 ④ · P7b, board #2353) — THE CLIENT STATES THEIR SIZE; THE COMPANY CHECK CONFIRMS IT.
//
// Founder: "when they sign up. they got to tell us their company name. their size. we take their
// word for it. but we should build in a company check." — and when the two disagree: "a".
// Their word sets the band. Only a check that finds the company BIGGER holds the price for a
// person; smaller, not found, no website or Apollo unreachable — their word stands.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({ client: null as Row | null, updates: [] as Row[], alerts: [] as string[] }))

vi.mock('@kind/db', () => ({
  db: {
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'jo@acme.com' } } }) } },
    from: () => {
      let pending: Row | null = null
      const q: any = {
        select: () => q, eq: () => q, is: () => q,
        update: (row: Row) => { pending = row; state.updates.push(row); return q },
        maybeSingle: async () => ({ data: state.client, error: null }),
        then: (r: (v: unknown) => unknown) => Promise.resolve(pending
          ? { data: [{ ...state.client, ...pending }], error: null }
          : { data: null, error: null }).then(r),
      }
      return q
    },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: async (_k: string, subject: string) => { state.alerts.push(subject); return {} } }))

import { statedSizeVerdict, SIZE_REVIEW_REASON_COPY } from '@kind/shared'
import { ensureClientSize } from './client-size'

const fetchMock = vi.fn()
beforeEach(() => {
  state.client = {
    id: 'c1', user_id: 'u1', website: 'https://www.acme.com', is_demo: false,
    size_band: null, size_employees: null, size_source: null, size_review_reason: null, size_locked_at: null,
    size_stated_employees: 30,   // they told Milla "about 30 people" → Founders
  }
  state.updates = []; state.alerts = []
  process.env.APOLLO_API_KEY = 'k'
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { vi.unstubAllGlobals() })

const apollo = (employees: number | null) =>
  fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ organization: employees === null ? null : { estimated_num_employees: employees } }) })

describe('the rule, pure', () => {
  it('only a check that finds them BIGGER waits for a person', () => {
    expect(statedSizeVerdict('founders', 'enterprise')).toEqual({ kind: 'person_confirms' })
    expect(statedSizeVerdict('founders', 'growth')).toEqual({ kind: 'person_confirms' })
    expect(statedSizeVerdict('growth', 'founders')).toEqual({ kind: 'stated_stands' })
    expect(statedSizeVerdict('growth', 'growth')).toEqual({ kind: 'stated_stands' })
    expect(statedSizeVerdict('enterprise', null)).toEqual({ kind: 'stated_stands' })
  })
})

describe('🛑 their word sets the band — unless the check finds them bigger', () => {
  it('they say 30, records say 300 → the price waits for a person, with both numbers', async () => {
    apollo(300)
    const r = await ensureClientSize('c1')
    expect(r).toMatchObject({ status: 'review', reason: 'stated_smaller', message: SIZE_REVIEW_REASON_COPY.stated_smaller })
    expect(state.updates.some(u => u.size_locked_at)).toBe(false)
    expect(state.updates[0]).toMatchObject({ size_review_reason: 'stated_smaller', size_note: 'They told us 30 people; Apollo: 300 at acme.com.' })
    expect(state.alerts).toHaveLength(1)
  })

  it('they say 120, records say 30 → their word (Growth) stands and is locked', async () => {
    state.client!.size_stated_employees = 120
    apollo(30)
    const r = await ensureClientSize('c1')
    expect(r).toMatchObject({ status: 'set', band: 'growth', source: 'stated', employees: 120 })
    expect(state.updates[0]).toMatchObject({ size_band: 'growth', size_source: 'person', size_set_by: 'client' })
    expect(state.updates[0].size_locked_at).toBeTruthy()
  })

  it('records agree → locked on their word', async () => {
    apollo(42)
    expect(await ensureClientSize('c1')).toMatchObject({ status: 'set', band: 'founders', source: 'stated' })
  })

  it('Apollo has no size for them → their word stands', async () => {
    apollo(null)
    expect(await ensureClientSize('c1')).toMatchObject({ status: 'set', band: 'founders', source: 'stated' })
    expect(String(state.updates[0].size_note)).toContain('Apollo has no size for acme.com')
  })

  it('Apollo unreachable → their word stands; a vendor outage never blocks their price', async () => {
    fetchMock.mockRejectedValueOnce(new Error('timeout'))
    expect(await ensureClientSize('c1')).toMatchObject({ status: 'set', band: 'founders', source: 'stated' })
  })

  it('the check cannot run (free email) → their word stands, and Apollo is not asked', async () => {
    state.client!.website = null
    expect(await ensureClientSize('c1')).toMatchObject({ status: 'set', band: 'founders', source: 'stated' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a check that ran BEFORE they answered does not keep them waiting now', async () => {
    state.client!.size_review_reason = 'no_website'
    state.client!.website = null
    expect(await ensureClientSize('c1')).toMatchObject({ status: 'set', band: 'founders', source: 'stated' })
  })

  it('🛑 but a "stated smaller" hold stays with the person — asking again does not clear it', async () => {
    state.client!.size_review_reason = 'stated_smaller'
    expect(await ensureClientSize('c1')).toMatchObject({ status: 'review', reason: 'stated_smaller' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(state.updates).toEqual([])
  })

  it('⛓️ no stated size → exactly the P7 check, as before', async () => {
    state.client!.size_stated_employees = null
    apollo(120)
    expect(await ensureClientSize('c1')).toMatchObject({ status: 'set', band: 'growth', source: 'apollo' })
  })
})

describe('Milla asks, and sign-up keeps the answer', () => {
  const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')

  it('the first message asks how many people work there', () => {
    const w = read('../../../portal/src/app/(milla)/milla/welcome/page.tsx')
    expect(w).toContain('which company are you with, and roughly how many people work there?')
  })

  it('Milla records it as their OWN size, never the target companies\' size', () => {
    const icps = read('../routes/icps.ts')
    expect(icps).toContain("company_employees:   { type: 'integer', minimum: 1,")
    expect(icps).toContain('company_employees:   statedEmployees,')
    expect(icps).toContain('ASK HOW MANY PEOPLE WORK AT THEIR OWN COMPANY (R168)')
    expect(icps).toMatch(/It is THEIR company, NOT the size of the companies they want to\s+reach/)
  })

  it('sign-up stores the stated size from the confirmed Brief, best-effort', () => {
    const auth = read('../routes/auth.ts')
    expect(auth).toContain('const statedEmployees = Number(draftFacts?.company_employees)')
    expect(auth).toContain('.update({ size_stated_employees: statedEmployees, size_stated_at: new Date().toISOString() })')
  })
})
