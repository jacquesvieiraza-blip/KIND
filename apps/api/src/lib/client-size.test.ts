// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R166 ② · P7, board #2353) — THE CLIENT'S OWN SIZE BAND: FOUND ONCE, LOCKED, OR A PERSON.
//
// Founder: "Three: 1–50, 51–200, 200+" by the client's own company size, never chosen by the
// client; unknown size (free email, no website, not found) → "A person reviews it".
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({ client: null as Row | null, updates: [] as Row[], alerts: [] as string[], cas: true }))

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
          ? { data: state.cas ? [{ ...state.client, ...pending }] : [], error: null }
          : { data: null, error: null }).then(r),
      }
      return q
    },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: async (_k: string, subject: string) => { state.alerts.push(subject); return {} } }))

import { bandForEmployees, SIZE_BANDS } from '@kind/shared'
import { sizeLookupPlan, domainOf, ensureClientSize, setClientSizeByPerson } from './client-size'

const fetchMock = vi.fn()
beforeEach(() => {
  state.client = { id: 'c1', user_id: 'u1', website: 'https://www.acme.com/about', is_demo: false, size_band: null, size_employees: null, size_source: null, size_review_reason: null, size_locked_at: null }
  state.updates = []; state.alerts = []; state.cas = true
  process.env.APOLLO_API_KEY = 'k'
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { vi.unstubAllGlobals() })

const apollo = (employees: number | null, status = 200) =>
  fetchMock.mockResolvedValueOnce({ ok: status < 300, status, json: async () => ({ organization: employees === null ? null : { estimated_num_employees: employees } }) })

describe('the three bands, the founder\'s numbers', () => {
  it('1–50 Founders · 51–200 Growth · 200+ Enterprise', () => {
    expect(SIZE_BANDS.map(b => b.label)).toEqual(['Founders', 'Growth', 'Enterprise'])
    expect([1, 50, 51, 200, 201, 5000].map(bandForEmployees)).toEqual(['founders', 'founders', 'growth', 'growth', 'enterprise', 'enterprise'])
    expect(bandForEmployees(0)).toBeNull(); expect(bandForEmployees(null)).toBeNull()
  })
})

describe('🛑 who is the company — the website, confirmed by a business email on it', () => {
  it('same company → look it up; free mail, no website or a different company → a person', () => {
    expect(domainOf('https://www.Acme.com/x')).toBe('acme.com')
    expect(sizeLookupPlan({ website: 'acme.com', email: 'jo@acme.com' })).toEqual({ lookup: 'acme.com' })
    expect(sizeLookupPlan({ website: 'acme.com', email: 'jo@uk.acme.com' })).toEqual({ lookup: 'acme.com' })
    expect(sizeLookupPlan({ website: 'acme.com', email: 'jo@gmail.com' })).toEqual({ review: 'free_email' })
    expect(sizeLookupPlan({ website: null, email: 'jo@acme.com' })).toEqual({ review: 'no_website' })
    expect(sizeLookupPlan({ website: 'bigcorp.com', email: 'jo@acme.com' })).toEqual({ review: 'domain_mismatch' })
  })
})

describe('ensureClientSize', () => {
  it('found → band set from Apollo and LOCKED', async () => {
    apollo(34)
    const r = await ensureClientSize('c1')
    expect(r).toMatchObject({ status: 'set', band: 'founders', employees: 34, source: 'apollo' })
    expect(String(fetchMock.mock.calls[0][0])).toContain('/organizations/enrich?domain=acme.com')
    expect(state.updates[0]).toMatchObject({ size_band: 'founders', size_employees: 34, size_source: 'apollo', size_set_by: 'apollo' })
    expect(state.updates[0].size_locked_at).toBeTruthy()
  })

  it('🛑 already locked → returned as it is, Apollo NOT asked again', async () => {
    state.client = { ...state.client!, size_band: 'growth', size_source: 'apollo', size_locked_at: '2026-09-25T10:00:00Z' }
    expect(await ensureClientSize('c1')).toMatchObject({ status: 'set', band: 'growth' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('🛑 never a guess: no headcount, a failed lookup, free mail or a demo → a person, with ONE Needs-you task', async () => {
    apollo(null)
    expect(await ensureClientSize('c1')).toMatchObject({ status: 'review', reason: 'not_found' })
    expect(state.updates.some(u => u.size_band)).toBe(false)
    expect(state.alerts).toHaveLength(1)
    // The same reason again files no second task.
    state.client = { ...state.client!, size_review_reason: 'not_found' }; apollo(null)
    await ensureClientSize('c1'); expect(state.alerts).toHaveLength(1)

    fetchMock.mockRejectedValueOnce(new Error('network'))
    expect(await ensureClientSize('c1')).toMatchObject({ status: 'review', reason: 'lookup_failed' })

    state.client = { ...state.client!, is_demo: true, size_review_reason: null }
    expect(await ensureClientSize('c1')).toMatchObject({ status: 'review' })
    expect(fetchMock).toHaveBeenCalledTimes(3)   // three lookups above; the demo never reached Apollo
  })

  it('a free-mail signup is never looked up', async () => {
    const r = await ensureClientSize('c1', { email: 'jo@gmail.com' })
    expect(r).toMatchObject({ status: 'review', reason: 'free_email' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('a person sets it in Vida', () => {
  it('an unset band needs no reason; changing a LOCKED band needs one', async () => {
    expect(await setClientSizeByPerson('c1', { band: 'growth' }, 'op')).toMatchObject({ ok: true, band: 'growth', previous: null })
    state.client = { ...state.client!, size_band: 'growth', size_source: 'person', size_locked_at: 'x' }
    state.updates = []
    expect(await setClientSizeByPerson('c1', { band: 'enterprise' }, 'op')).toMatchObject({ ok: false, reason: 'reason_required' })
    expect(state.updates).toEqual([])
    expect(await setClientSizeByPerson('c1', { band: 'enterprise', note: 'They have 400 staff per LinkedIn' }, 'op')).toMatchObject({ ok: true, previous: 'growth' })
    expect(await setClientSizeByPerson('c1', { band: 'medium' }, 'op')).toMatchObject({ ok: false, reason: 'invalid' })
  })
})

describe('the doors', () => {
  it('after the Brief the check runs in the background; Vida can read, check and set (audited)', () => {
    const milla = readFileSync(join(__dirname, '../routes/milla.ts'), 'utf8')
    expect(milla).toContain('m.ensureClientSize(cid, { email: req.authEmail ?? null })')
    const op = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
    expect(op).toContain("operatorRouter.get('/client-size'")
    expect(op).toContain("operatorRouter.post('/client-size/check'")
    const at = op.indexOf("operatorRouter.post('/client-size',")
    expect(op.slice(at, at + 1400)).toContain("action: 'client_size_set'")
    const vida = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
    expect(vida).toContain('<ClientSizePanel clientId={selected} />')
  })
})
