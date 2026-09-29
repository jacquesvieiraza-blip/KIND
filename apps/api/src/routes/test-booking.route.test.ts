// ⚑ 29 Sep (R174 ② · PR 1c) — THE TEST BOOKING BOOKS NOBODY REAL AND COUNTS FOR NOTHING.
// The operator routes are called for real against a fake database; the calendar path is pinned
// by order, because its Google call cannot run here.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>
const st = vi.hoisted(() => ({ tables: {} as Record<string, Row[]>, inserts: [] as { table: string; row: Row }[] }))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const filters: ((r: Row) => boolean)[] = []
      const rows = () => (st.tables[table] ?? []).filter(r => filters.every(f => f(r)))
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (c: string, v: unknown) => { filters.push(r => r[c] === v); return q },
        in: () => q, is: () => q, order: () => q, limit: () => q,
        async maybeSingle() { return { data: rows()[0] ?? null, error: null } },
        async single() { return { data: rows()[0] ?? null, error: null } },
        then(r: (v: unknown) => unknown) { return Promise.resolve({ data: rows(), error: null }).then(r) },
        insert: (row: Row) => {
          const made = { id: `${table}-new-${st.inserts.length}`, ...row }
          st.inserts.push({ table, row }); (st.tables[table] ??= []).push(made)
          const ins: Record<string, unknown> = { select: () => ins, async single() { return { data: made, error: null } } }
          return ins
        },
      }
      return q
    },
  },
}))
vi.mock('../lib/operator-audit', () => ({ writeOperatorAudit: async () => {}, campaignAuditAction: () => 'noop' }))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, next: () => void) => next() }))

async function call(method: 'get' | 'post', path: string, req: Row) {
  const m = await import('./operator')
  const layer = (m.operatorRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === path && l.route?.methods[method])
  if (!layer) throw new Error(`${method} ${path} not found`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: Row = {}; let status = 200
  const res: any = { json: (b: Row) => { payload = b }, status: (s: number) => { status = s; return res } }
  await handler({ body: {}, params: {}, query: {}, headers: {}, ...req }, res, () => {})
  return { status, payload }
}

beforeEach(() => {
  st.inserts = []
  st.tables = {
    clients: [{ id: 'c1', company_name: 'Acme', calendar_booking_enabled: true, google_calendar_refresh_token: 'rt' }],
    leads: [{ id: 'real-lead', client_id: 'c1', email: 'owen@kestrel.co.uk', first_name: 'Owen' }],
  }
})

describe('the tool\'s own test person', () => {
  it('is made once, on a .invalid address, status passed and in no programme', async () => {
    const { ensureTestBookingLead, isTestBookingEmail } = await import('../lib/test-booking')
    const a = await ensureTestBookingLead('c1')
    const b = await ensureTestBookingLead('c1')
    expect(a.ok && b.ok && a.leadId === b.leadId).toBe(true)
    const made = st.inserts.filter(i => i.table === 'leads')
    expect(made).toHaveLength(1)
    expect(isTestBookingEmail(String(made[0].row.email))).toBe(true)
    expect(String(made[0].row.email)).toMatch(/@kind-test\.invalid$/)
    expect(made[0].row.status).toBe('passed')
    expect(made[0].row).not.toHaveProperty('programme_id')
  })

  it('a real address is never a test', async () => {
    const { isTestBookingEmail } = await import('../lib/test-booking')
    expect(isTestBookingEmail('owen@kestrel.co.uk')).toBe(false)
    expect(isTestBookingEmail(null)).toBe(false)
  })
})

describe('Vida only issues test links for the test person', () => {
  it('a real lead is refused (409) — the prospect would be invited and the meeting counted', async () => {
    const r = await call('get', '/leads/:id/booking-link', { params: { id: 'real-lead' }, query: { client_id: 'c1' } })
    expect(r.status).toBe(409)
    expect(String(r.payload.error)).toContain('only issued for the test person')
  })

  it('"Make a test booking link" creates the test person and answers with its link (or why not)', async () => {
    const r = await call('post', '/clients/:id/test-booking-link', { params: { id: 'c1' } })
    expect(r.status).toBe(200)
    expect(r.payload.success).toBe(true)
    expect(st.inserts.filter(i => i.table === 'leads')).toHaveLength(1)
    expect((r.payload.lead as Row).name).toBe('Booking Test')
  })
})

describe('a test booking invites nobody and records nothing', () => {
  const cal = readFileSync(join(process.cwd(), 'apps/api/src/routes/calendar.ts'), 'utf8')
  const gcal = readFileSync(join(process.cwd(), 'apps/api/src/lib/gcal.ts'), 'utf8')

  it('the Google event carries no attendee and sends no update', () => {
    expect(gcal).toContain("sendUpdates:           params.testBooking ? 'none' : 'all'")
    expect(gcal).toContain('attendees: params.testBooking ? [] : [')
    expect(cal).toMatch(/idempotencyKey: `\$\{params\.clientId\}:\$\{params\.leadId\}:\$\{params\.start\}`,\s*testBooking,/)
  })

  it('it stops before the booking row, the meeting, the outcome event and the counters', () => {
    const stop = cal.indexOf('if (testBooking) return { ok: true, meetLink, eventId }')
    expect(stop).toBeGreaterThan(-1)
    for (const later of ["db.from('calendar_bookings').insert", 'logOutcomeEvent({', 'recordBooking({\n      clientId:      params.clientId,\n      leadId:        params.leadId,\n      scheduledAt:   params.start,\n      campaignId:    attribution.campaignId']) {
      const at = cal.indexOf(later, stop)
      expect(at, `${later.slice(0, 30)} must come after the test stop`).toBeGreaterThan(stop)
    }
  })

  it('and never records an unverified meeting either', () => {
    const helper = cal.slice(cal.indexOf('async function recordUnverifiedBooking('))
    const firstRecord = helper.indexOf('recordBooking(')
    expect(helper.indexOf('if (params.testBooking) return null')).toBeGreaterThan(-1)
    expect(helper.indexOf('if (params.testBooking) return null')).toBeLessThan(firstRecord)
  })
})
