// ⚑ 29 Sep (R174 · PR 5e) — VIDA'S LEAD RECORD, IN PROGRAMME FACTS.
//   · qualified or not, emails sent, replies, and the lead's own meetings from the meetings table;
//   · no "Charged $4", no "Masked", no work-credit ledger rows, no old bookings table;
//   · an unreadable count or meeting list says so — never 0 or "no meetings".
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>
const st = vi.hoisted(() => ({ tables: [] as string[], sentError: false, meetings: [] as unknown[] | null, meetingFilter: null as Row | null }))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      st.tables.push(table)
      const q: Record<string, unknown> = {}
      for (const k of ['select', 'eq', 'order', 'limit', 'or', 'in', 'is', 'not']) q[k] = () => q
      q.maybeSingle = async () => ({
        data: table === 'leads'
          ? { id: 'l1', client_id: 'c1', first_name: 'Sam', last_name: 'Lee', company: 'Acme', job_title: 'COO', status: 'enrolled', score: 80, qualified_at: 't', disqualified_at: null }
          : table === 'clients' ? { company_name: 'Northgate' } : null,
        error: null,
      })
      q.then = (r: (v: unknown) => unknown) => Promise.resolve(
        table === 'figsy_sent_emails' ? { count: st.sentError ? null : 3, error: st.sentError ? { message: 'x' } : null }
          : table === 'figsy_replies' ? { data: [{ classification: 'warm', qualified_at: null, received_at: 't2' }], error: null }
          : { data: [], error: null }).then(r)
      return q
    },
  },
}))
vi.mock('../lib/meeting-truth', () => ({
  meetingsForClient: async (f: Row) => { st.meetingFilter = f; return st.meetings },
}))
vi.mock('../lib/operator-audit', () => ({ writeOperatorAudit: async () => {}, campaignAuditAction: () => 'noop' }))
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, n: () => void) => n() }))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: async () => ({ delivered: true }) }))

async function getRecord() {
  const { operatorRouter } = await import('./operator')
  const layer = (operatorRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/record' && l.route?.methods.get)
  const handler = layer!.route.stack[layer!.route.stack.length - 1].handle
  let body: Row = {}; let status = 200
  const res: any = { json: (b: Row) => { body = b; return res }, status: (s: number) => { status = s; return res } }
  await handler({ query: { lead_id: 'l1' }, headers: {} }, res)
  return { status, body }
}

beforeEach(() => {
  st.tables = []; st.sentError = false; st.meetingFilter = null
  st.meetings = [{ id: 'm1', leadId: 'l1', scheduledAt: '2026-10-02T10:00:00Z', state: 'BOOKED', rescheduled: false }]
})

describe('the record route', () => {
  it('returns the programme facts, and this lead’s meetings from the meetings reader', async () => {
    const { status, body } = await getRecord()
    expect(status).toBe(200)
    expect(body.facts).toEqual({ qualified: 'qualified', emails_sent: 3, replies: 1,
      meetings: [{ id: 'm1', at: '2026-10-02T10:00:00Z', state: 'BOOKED', rescheduled: false }] })
    expect(st.meetingFilter).toEqual({ clientId: 'c1', leadId: 'l1', limit: 20 })
    expect(body).not.toHaveProperty('money')
    expect(st.tables).not.toContain('calendar_bookings')
    expect(st.tables).not.toContain('credit_transactions')
  })
  it('an unreadable count or meeting list says so', async () => {
    st.sentError = true; st.meetings = null
    const { body } = await getRecord()
    expect((body.facts as Row).emails_sent).toBeNull()
    expect((body.facts as Row).meetings).toBeNull()
  })
})

describe('the page and the reader', () => {
  it('the page shows the facts and nothing of the retired per-lead model', () => {
    const page = readFileSync(join(process.cwd(), 'apps/admin/src/app/vida/record/page.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    for (const gone of ['Charged $4', 'Masked', 'rec.money']) expect(page, gone).not.toContain(gone)
    expect(page).toContain('Emails sent: {rec.facts.emails_sent ?? \'could not be read\'}')
    expect(page).toContain('Meetings could not be read')
  })
  it('the meetings reader filters by lead only when asked', () => {
    const mt = readFileSync(join(process.cwd(), 'apps/api/src/lib/meeting-truth.ts'), 'utf8')
    expect(mt).toContain("if (filter.leadId) q = q.eq('lead_id', filter.leadId)")
  })
})
